'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { FiscalYearSelector } from '@/components/rwanda/shared/FiscalYearSelector';
import { getRiskBgColor, formatRWFCompact, formatScore, getPerformanceGapDisplay } from '@/lib/utils/formatters';
import { assessmentAPI } from '@/lib/api/assessmentApi';
import type {
  DashboardSummary,
  ComponentSummary,
  SavedAssessment,
  ActionPriority,
  ComponentResult,
  SavedIndicatorResult,
  IndicatorComponentSensitivity,
} from '@/lib/types/assessment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileCheck,
  Loader2,
  Play,
  AlertTriangle,
  BarChart3,
  Activity,
  ChevronRight,
  Calendar,
  List,
  TrendingDown,
  Target,
  Check,
} from 'lucide-react';
import type { StressLevel } from '@/lib/utils/formatters';

export default function AssessmentPage() {
  const { t } = useLanguage();
  const { fiscalYear } = useFiscalYear();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [assessments, setAssessments] = useState<SavedAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<SavedAssessment | null>(null);
  const [sensitivities, setSensitivities] = useState<IndicatorComponentSensitivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, listRes, configRes] = await Promise.all([
        assessmentAPI.getDashboardSummary(fiscalYear.start_year),
        assessmentAPI.listAssessments(fiscalYear.start_year, 20),
        assessmentAPI.getConfig(),
      ]);
      setSummary(summaryRes);
      setAssessments(listRes);
      setSelectedAssessment(null);
      setSensitivities(configRes.indicator_component_sensitivities ?? []);
    } catch (err) {
      console.error('Assessment fetch failed:', err);
      setError('Unable to load assessment data.');
      setSummary(null);
      setAssessments([]);
      setSensitivities([]);
    } finally {
      setLoading(false);
    }
  }, [fiscalYear.start_year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunAssessment = async () => {
    setRunning(true);
    setError(null);
    try {
      await assessmentAPI.runForYear(
        fiscalYear.start_year,
        `FY${fiscalYear.start_year} assessment`
      );
      await fetchData();
    } catch (err) {
      console.error('Run assessment failed:', err);
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to run assessment. Ensure indicator data is imported for this year.'
      );
    } finally {
      setRunning(false);
    }
  };

  const loadAssessmentDetail = async (id: string) => {
    try {
      const detail = await assessmentAPI.getAssessment(id);
      setSelectedAssessment(detail);
    } catch (err) {
      console.error('Failed to load assessment detail:', err);
      setError('Failed to load assessment details.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--rw-blue)]" />
        <span className="ml-3 text-gray-600">Loading assessment data...</span>
      </div>
    );
  }

  const isEmpty = summary?.empty === true;
  const stressLevel = (summary?.stress_level ?? 'medium') as StressLevel;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="h-7 w-7 text-[var(--rw-blue)]" />
            {t('assessment')}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Run and view FSFSI assessments by fiscal year. All computation is performed by the backend engine.
          </p>
        </div>
        <FiscalYearSelector />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary cards (when we have an assessment for this year) */}
      {!isEmpty && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[var(--rw-blue)]">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">FSFSI Score</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatScore(summary.overall_fsfsi)}
              </p>
              <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold ${getRiskBgColor(stressLevel)}`}>
                {stressLevel.charAt(0).toUpperCase() + stressLevel.slice(1)} Risk
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Efficiency Index</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatScore(summary.efficiency_index)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatRWFCompact(summary.total_budget_lcu_bn * 1_000_000_000)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex flex-col justify-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Computed</p>
              <p className="text-sm text-gray-700 mt-1">
                {summary.computed_at
                  ? new Date(summary.computed_at).toLocaleString()
                  : '—'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Components breakdown (with performance gaps when from assessment detail) */}
      {(!isEmpty && summary) || selectedAssessment ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-[var(--rw-blue)]" />
              Component breakdown & performance gaps
            </CardTitle>
            <p className="text-sm text-gray-500 font-normal">
              Stress and average performance gap by component. Priority from backend engine.
            </p>
          </CardHeader>
          <CardContent>
            {selectedAssessment?.component_results && selectedAssessment.component_results.length > 0 ? (
              <ComponentsBreakdownTable components={selectedAssessment.component_results} />
            ) : summary?.components && summary.components.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {summary.components.map((c) => (
                  <ComponentSummaryCard key={c.component} component={c} />
                ))}
              </div>
            ) : null}
            {selectedAssessment?.component_results && selectedAssessment.component_results.length > 0 && (() => {
              const priorities = (selectedAssessment.result_json?.action_priorities as ActionPriority[] | undefined) ?? summary?.top_priorities ?? [];
              return priorities.length > 0 ? (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Top priorities</p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    {priorities.slice(0, 5).map((p: ActionPriority, i: number) => (
                      <li key={i}>{p.action}</li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}
          </CardContent>
        </Card>
      ) : null}

      {/* Indicators breakdown (when an assessment is selected) */}
      {selectedAssessment?.indicator_results && selectedAssessment.indicator_results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-[var(--rw-blue)]" />
              Indicators breakdown & performance gaps
            </CardTitle>
            <p className="text-sm text-gray-500 font-normal">
              Observed vs benchmark and performance gap per indicator.
            </p>
          </CardHeader>
          <CardContent>
            <IndicatorsBreakdownTable indicators={selectedAssessment.indicator_results} />
          </CardContent>
        </Card>
      )}

      {/* Indicator component sensitivities (α) – from backend engine */}
      {sensitivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-[var(--rw-blue)]" />
              Indicator component sensitivities (α)
            </CardTitle>
            <p className="text-sm text-gray-500 font-normal">
              Sensitivity parameter α per component used in the stress model υ = δ · e^(-αf). Higher α means funding reduces stress faster for that component.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500 uppercase tracking-wide">
                    <th className="pb-2 pr-4 font-medium">Component</th>
                    <th className="pb-2 pr-4 font-medium text-right">α (sensitivity)</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivities.map((s) => (
                    <tr key={s.component} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-900">{s.component_display}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-gray-700">
                        {formatScore(s.sensitivity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run assessment + List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <List className="h-5 w-5 text-[var(--rw-blue)]" />
                Saved assessments — {fiscalYear.label}
              </CardTitle>
              <button
                type="button"
                onClick={handleRunAssessment}
                disabled={running}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--rw-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {running ? 'Running…' : 'Run assessment'}
              </button>
            </CardHeader>
            <CardContent>
              {assessments.length === 0 ? (
                <p className="text-gray-500 py-6 text-center">
                  No assessments for this fiscal year. Use &quot;Run assessment&quot; to compute one (requires indicator data in the database).
                </p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {assessments.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => loadAssessmentDetail(a.id)}
                        className="w-full flex items-center justify-between py-3 px-2 rounded-lg hover:bg-gray-50 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {a.assessment_name || `Assessment ${a.id.slice(0, 8)}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              FSFSI {formatScore(a.fsfsi_score)} · {a.stress_level} · {a.indicators_count} indicators
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {selectedAssessment ? (
            <AssessmentDetailPanel assessment={selectedAssessment} onClose={() => setSelectedAssessment(null)} />
          ) : !isEmpty && summary ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-[var(--rw-blue)]" />
                  Component breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.components.map((c) => (
                    <ComponentSummaryRow key={c.component} component={c} />
                  ))}
                </div>
                {summary.top_priorities && summary.top_priorities.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Top priorities</p>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {summary.top_priorities.slice(0, 5).map((p: ActionPriority, i: number) => (
                        <li key={i}>{p.action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <Activity className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>Run an assessment for {fiscalYear.label} to see component breakdown and priorities.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ComponentSummaryRow({ component }: { component: ComponentSummary }) {
  const level = (component.priority_level || 'medium') as StressLevel;
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm font-medium text-gray-900 truncate">{component.component_display}</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${getRiskBgColor(level)}`}>
        {formatScore(component.stress)}
      </span>
    </div>
  );
}

function ComponentSummaryCard({ component }: { component: ComponentSummary }) {
  const level = (component.priority_level || 'medium') as StressLevel;
  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-gray-50/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-900">{component.component_display}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getRiskBgColor(level)}`}>
          {formatScore(component.stress)}
        </span>
      </div>
      <p className="text-xs text-gray-500">
        {component.indicator_count} indicators · {formatScore(component.budget_share_percent)}% budget
      </p>
    </div>
  );
}

function ComponentsBreakdownTable({ components }: { components: ComponentResult[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500 uppercase tracking-wide">
            <th className="pb-2 pr-4 font-medium">Component</th>
            <th className="pb-2 pr-4 font-medium text-right">Avg performance gap</th>
            <th className="pb-2 pr-4 font-medium text-right">Stress</th>
            <th className="pb-2 pr-4 font-medium">Priority</th>
            <th className="pb-2 pr-4 font-medium text-right">Budget share</th>
            <th className="pb-2 font-medium text-right">Indicators</th>
          </tr>
        </thead>
        <tbody>
          {components.map((c) => (
            <tr key={c.id} className="border-b border-gray-100">
              <td className="py-3 pr-4 font-medium text-gray-900">{c.component_display}</td>
              <td className="py-3 pr-4 text-right">
                <span className={getPerformanceGapDisplay(c.avg_performance_gap).className}>
                  {formatScore(c.avg_performance_gap)}
                </span>
              </td>
              <td className="py-3 pr-4 text-right">{formatScore(c.component_stress)}</td>
              <td className="py-3 pr-4">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getRiskBgColor((c.priority_level as StressLevel) || 'medium')}`}>
                  {c.priority_level}
                </span>
              </td>
              <td className="py-3 pr-4 text-right">{formatScore(c.budget_share_percent)}%</td>
              <td className="py-3 text-right">{c.indicators_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IndicatorsBreakdownTable({ indicators }: { indicators: SavedIndicatorResult[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500 uppercase tracking-wide">
            <th className="pb-2 pr-4 font-medium">Indicator</th>
            <th className="pb-2 pr-4 font-medium">Component</th>
            <th className="pb-2 pr-4 font-medium text-right">Observed</th>
            <th className="pb-2 pr-4 font-medium text-right">Benchmark</th>
            <th className="pb-2 pr-4 font-medium text-right">Performance gap</th>
            <th className="pb-2 pr-4 font-medium text-right">Stress</th>
            <th className="pb-2 font-medium text-right">Budget %</th>
          </tr>
        </thead>
        <tbody>
          {indicators.map((ind) => (
            <tr key={ind.id} className="border-b border-gray-100">
              <td className="py-3 pr-4">
                <span className="font-medium text-gray-900">{ind.indicator_code}</span>
                <span className="block text-xs text-gray-500 truncate max-w-[180px]" title={ind.indicator_name}>{ind.indicator_name}</span>
              </td>
              <td className="py-3 pr-4 text-gray-700">{ind.component_display}</td>
              <td className="py-3 pr-4 text-right">{ind.observed_value != null ? formatScore(ind.observed_value) : '—'}</td>
              <td className="py-3 pr-4 text-right">{ind.benchmark_value != null ? formatScore(ind.benchmark_value) : '—'}</td>
              <td className="py-3 pr-4 text-right">
                {(() => {
                  const { className, isGood } = getPerformanceGapDisplay(ind.performance_gap);
                  return (
                    <span className={`inline-flex items-center gap-0.5 ${className}`} title={isGood ? 'On or better than benchmark' : 'Gap vs benchmark'}>
                      {isGood ? <Check className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {formatScore(ind.performance_gap)}
                    </span>
                  );
                })()}
              </td>
              <td className="py-3 pr-4 text-right">{formatScore(ind.stress_value)}</td>
              <td className="py-3 text-right">{formatScore(ind.share_weighted_percent)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssessmentDetailPanel({
  assessment,
  onClose,
}: {
  assessment: SavedAssessment;
  onClose: () => void;
}) {
  const stressLevel = (assessment.stress_level ?? 'medium') as StressLevel;
  const components = assessment.component_results ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Assessment detail</CardTitle>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-[var(--rw-blue)] hover:underline"
        >
          Close
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-gray-500">FSFSI Score</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatScore(assessment.fsfsi_score)}
            <span className={`ml-2 text-sm font-bold px-2 py-0.5 rounded-full ${getRiskBgColor(stressLevel)}`}>
              {assessment.stress_level}
            </span>
          </p>
        </div>
        <p className="text-sm text-gray-600">
          {assessment.assessment_name} · {assessment.indicators_count} indicators · {assessment.components_count} components
        </p>
        <p className="text-xs text-gray-500">
          Computed {assessment.computed_at ? new Date(assessment.computed_at).toLocaleString() : '—'}
        </p>
        {components.length > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Components</p>
            <div className="space-y-2">
              {components.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-900">{c.component_display}</span>
                  <div className="flex items-center gap-2">
                    <span className={getRiskBgColor((c.priority_level as StressLevel) || 'medium') + ' px-2 py-0.5 rounded text-xs font-bold'}>
                      {formatScore(c.component_stress)}
                    </span>
                    <div
                      className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden"
                      title={`${(Number(c.budget_share_percent) || 0).toFixed(1)}% budget`}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--rw-blue)]"
                        style={{ width: `${Math.min(Number(c.budget_share_percent) || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
