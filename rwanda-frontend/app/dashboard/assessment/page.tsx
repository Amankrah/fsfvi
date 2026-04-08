'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { FiscalYearSelector } from '@/components/rwanda/shared/FiscalYearSelector';
import {
  getRiskBgColor,
  formatRWFCompact,
  formatScore,
  getPerformanceGapDisplay,
  formatPolicyDate,
  riskBadgeTranslationKey,
} from '@/lib/utils/formatters';
import { assessmentAPI } from '@/lib/api/assessmentApi';
import type {
  DashboardSummary,
  ComponentSummary,
  SavedAssessment,
  ActionPriority,
  ComponentResult,
  SavedIndicatorResult,
} from '@/lib/types/assessment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileCheck,
  Loader2,
  Play,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Calendar,
  List,
  TrendingDown,
  Target,
  Check,
  Filter,
  ArrowDownWideNarrow,
} from 'lucide-react';
import type { StressLevel } from '@/lib/utils/formatters';
import type { Locale, TranslationParams } from '@/contexts/LanguageContext';

function assessmentWeightingLabel(
  method: string,
  t: (key: string, params?: TranslationParams) => string,
): string {
  const key = `assessment_page.weighting_${method}`;
  const out = t(key);
  return out === key ? method.replace(/_/g, ' ') : out;
}

function assessmentScenarioLabel(
  scenario: string,
  t: (key: string, params?: TranslationParams) => string,
): string {
  const key = `assessment_page.scenario_${scenario}`;
  const out = t(key);
  return out === key ? scenario.replace(/_/g, ' ') : out;
}

function SavedRunsCompareTable({
  rows,
  locale,
  t,
}: {
  rows: SavedAssessment[];
  locale: Locale;
  t: (key: string, params?: TranslationParams) => string;
}) {
  if (rows.length < 2) return null;
  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('assessment_page.compare_heading')}</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2.5 font-medium">{t('assessment_page.compare_col_run')}</th>
              <th className="px-3 py-2.5 font-medium text-right tabular-nums">{t('assessment_page.compare_col_point')}</th>
              <th className="px-3 py-2.5 font-medium text-right tabular-nums">{t('assessment_page.compare_col_cumulative')}</th>
              <th className="px-3 py-2.5 font-medium">{t('assessment_page.compare_col_stress')}</th>
              <th className="px-3 py-2.5 font-medium text-right tabular-nums">{t('assessment_page.compare_col_efficiency')}</th>
              <th className="px-3 py-2.5 font-medium min-w-[7rem]">{t('assessment_page.compare_col_weighting')}</th>
              <th className="px-3 py-2.5 font-medium min-w-[7rem]">{t('assessment_page.compare_col_scenario')}</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">{t('assessment_page.compare_col_updated')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((a) => {
              const level = (a.stress_level ?? 'medium') as StressLevel;
              return (
                <tr key={a.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 font-medium text-gray-900 max-w-[14rem]">
                    <span className="line-clamp-2" title={a.assessment_name || a.id}>
                      {a.assessment_name || `…${a.id.slice(0, 8)}`}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatScore(a.fsfsi_score)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                    {a.cumulative_fsfsi != null ? formatScore(a.cumulative_fsfsi) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex text-xs font-bold px-2 py-0.5 rounded-full ${getRiskBgColor(level)}`}>
                      {t(riskBadgeTranslationKey(a.stress_level))}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {a.efficiency_index != null ? formatScore(a.efficiency_index) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-800">{assessmentWeightingLabel(a.weighting_method, t)}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-800">{assessmentScenarioLabel(a.scenario, t)}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-gray-600 whitespace-nowrap">
                    {a.computed_at ? formatPolicyDate(a.computed_at, locale) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Drop duplicate indicators (legacy runs or API quirks); keep first rank order. */
function dedupeActionPriorities(items: ActionPriority[]): ActionPriority[] {
  const seen = new Set<string>();
  const out: ActionPriority[] = [];
  for (const p of items) {
    const key = (p.indicator_code && p.indicator_code.trim()) || `${p.rank}:${p.action.slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.sort((a, b) => a.rank - b.rank);
}

const MAX_COMPARE_RUNS = 4;

function TopPrioritiesBlock({ priorities, compact }: { priorities: ActionPriority[]; compact?: boolean }) {
  const list = dedupeActionPriorities(priorities).slice(0, 5);
  if (!list.length) return null;
  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Top priorities</p>
      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        Ranked by financing stress (unique indicators). Budget lines reference the modelled optimal mix.
      </p>
      <ul className="space-y-3">
        {list.map((p) => (
          <li
            key={p.indicator_code || `${p.rank}-${p.component}`}
            className={`rounded-lg border border-slate-200/90 bg-slate-50/60 shadow-sm ${compact ? 'px-3 py-2.5 text-sm' : 'px-3 py-3 text-sm'}`}
          >
            <div className="flex flex-wrap items-center gap-2 gap-y-1">
              <span
                className={`inline-flex items-center justify-center rounded-md bg-[var(--rw-blue)] font-bold text-white ${compact ? 'h-6 min-w-[1.5rem] px-1.5 text-[10px]' : 'h-7 min-w-[1.75rem] px-2 text-xs'}`}
              >
                {p.rank}
              </span>
              {p.indicator_code ? (
                <span className={`font-mono font-semibold text-slate-800 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                  {p.indicator_code}
                </span>
              ) : null}
              <span className={`font-medium text-slate-600 ${compact ? 'text-[11px]' : 'text-xs'}`}>{p.component}</span>
            </div>
            <p className={`mt-2 leading-relaxed text-slate-800 ${compact ? 'text-xs' : ''}`}>{p.action}</p>
            <p className={`mt-2 font-medium text-emerald-800 ${compact ? 'text-[11px]' : 'text-xs'}`}>{p.budget_implication}</p>
            {!compact ? (
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                <span>{p.expected_impact}</span>
                <span className="text-slate-400">·</span>
                <span>{p.timeline}</span>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AssessmentPage() {
  const { t, locale } = useLanguage();
  const { fiscalYear } = useFiscalYear();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [assessments, setAssessments] = useState<SavedAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<SavedAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [weightingMethod, setWeightingMethod] = useState('hybrid');
  const [scenario, setScenario] = useState('normal_operations');
  const [error, setError] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, listRes] = await Promise.all([
        assessmentAPI.getDashboardSummary(fiscalYear.start_year),
        assessmentAPI.listAssessments(fiscalYear.start_year, 20),
      ]);
      setSummary(summaryRes);
      setAssessments(listRes);
      setSelectedAssessment(null);
      setCompareIds([]);
    } catch (err) {
      console.error('Assessment fetch failed:', err);
      setError('Unable to load assessment data.');
      setSummary(null);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, [fiscalYear.start_year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleCompareId = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE_RUNS) return prev;
      return [...prev, id];
    });
  }, []);

  const comparedAssessments = useMemo(() => {
    if (compareIds.length === 0) return [];
    const byId = new Map(assessments.map((a) => [a.id, a]));
    return compareIds.map((id) => byId.get(id)).filter(Boolean) as SavedAssessment[];
  }, [assessments, compareIds]);

  const handleRunAssessment = async () => {
    setRunning(true);
    setError(null);
    try {
      await assessmentAPI.runForYear(
        fiscalYear.start_year,
        `FY${fiscalYear.start_year} assessment`,
        weightingMethod,
        scenario,
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 tracking-tight">
            <FileCheck className="h-7 w-7 text-[var(--rw-blue)]" />
            {t('assessment_page.page_title')}
          </h1>
          <p className="text-sm text-gray-600 mt-1 max-w-3xl leading-relaxed">{t('assessment_page.page_subtitle')}</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-[var(--rw-blue)]">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {summary.cumulative_fsfsi != null
                  ? t('assessment_page.fsfsi_kpi_title_cumulative')
                  : t('assessment_page.fsfsi_kpi_title_simple')}
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatScore(summary.cumulative_fsfsi ?? summary.overall_fsfsi)}
              </p>
              {summary.cumulative_fsfsi != null ? (
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('assessment_page.fsfsi_kpi_sub_point_in_time', {
                    score: formatScore(summary.overall_fsfsi),
                  })}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('overview.fsfsi_point_in_time')}: {formatScore(summary.overall_fsfsi)}
                </p>
              )}
              <div className={`mt-1.5 inline-block px-3 py-1 rounded-full text-xs font-bold ${getRiskBgColor(
                (summary.cumulative_stress_level || stressLevel) as StressLevel
              )}`}>
                {t(riskBadgeTranslationKey(summary.cumulative_stress_level || stressLevel))}
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {t('assessment_page.fsfsi_kpi_explainer', { fy: fiscalYear.label })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {t('assessment_page.efficiency_title')}
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatScore(summary.efficiency_index)}
              </p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{t('assessment_page.efficiency_hint')}</p>
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
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {t('assessment_page.last_updated')}
              </p>
              <p className="text-sm text-gray-800 mt-1 font-medium">
                {summary.computed_at ? formatPolicyDate(summary.computed_at, locale) : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                {t('assessment_page.data_vintage', { fy: fiscalYear.label })}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {summary.components.map((c) => (
                  <ComponentSummaryCard key={c.component} component={c} />
                ))}
              </div>
            ) : null}
            {selectedAssessment?.component_results && selectedAssessment.component_results.length > 0 ? (
              <TopPrioritiesBlock
                priorities={
                  (selectedAssessment.result_json?.action_priorities as ActionPriority[] | undefined) ??
                  summary?.top_priorities ??
                  []
                }
                compact={false}
              />
            ) : !selectedAssessment && summary?.top_priorities && summary.top_priorities.length > 0 ? (
              <TopPrioritiesBlock priorities={summary.top_priorities} compact={false} />
            ) : null}
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


      {/* Run Assessment Controls */}
      <Card className="border-[var(--rw-blue)]/20 bg-blue-50/30">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">Run new assessment</h3>
              <p className="text-xs text-gray-500 mt-0.5">Select weighting method and scenario, then run the FSFSI computation engine.</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Weighting</label>
                <select
                  value={weightingMethod}
                  onChange={(e) => setWeightingMethod(e.target.value)}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs text-gray-700 min-w-[180px]"
                  title="Weighting method"
                >
                  <option value="hybrid">Hybrid (expert + network + financial)</option>
                  <option value="equal">Equal weights (1/n)</option>
                  <option value="expert">Expert judgment (AHP)</option>
                  <option value="financial">Budget proportional</option>
                  <option value="network">Network centrality (PageRank)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Scenario</label>
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs text-gray-700 min-w-[160px]"
                  title="Scenario"
                >
                  <option value="normal_operations">Normal Operations</option>
                  <option value="climate_shock">Climate Shock</option>
                  <option value="financial_crisis">Financial Crisis</option>
                  <option value="pandemic_disruption">Pandemic Disruption</option>
                  <option value="political_instability">Political Instability</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">&nbsp;</label>
                <button
                  type="button"
                  onClick={handleRunAssessment}
                  disabled={running}
                  className="h-9 inline-flex items-center gap-2 rounded-lg bg-[var(--rw-blue)] px-5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {running ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {running ? 'Running…' : 'Run assessment'}
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved assessments (full width) + optional compare + detail */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <List className="h-5 w-5 text-[var(--rw-blue)]" />
              Saved assessments — {fiscalYear.label}
            </CardTitle>
            <p className="text-sm text-gray-500 font-normal leading-relaxed mt-1">{t('assessment_page.saved_list_intro')}</p>
            {compareIds.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs text-slate-600">
                  {t('assessment_page.compare_selection_status', { n: compareIds.length, max: MAX_COMPARE_RUNS })}
                </span>
                <button
                  type="button"
                  onClick={() => setCompareIds([])}
                  className="text-xs font-medium text-[var(--rw-blue)] hover:underline"
                >
                  {t('assessment_page.compare_clear')}
                </button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {assessments.length === 0 ? (
              <p className="text-gray-500 py-6 text-center">
                No assessments for this fiscal year. Use &quot;Run assessment&quot; to compute one (requires indicator data in the database).
              </p>
            ) : (
              <>
                <ul className="divide-y divide-gray-200 rounded-lg border border-gray-100 overflow-hidden">
                  {assessments.map((a) => (
                    <li key={a.id} className="flex items-stretch bg-white hover:bg-slate-50/80">
                      <label className="flex items-center px-3 sm:px-4 cursor-pointer shrink-0 border-r border-gray-100 bg-slate-50/50">
                        <input
                          type="checkbox"
                          checked={compareIds.includes(a.id)}
                          onChange={() => toggleCompareId(a.id)}
                          disabled={!compareIds.includes(a.id) && compareIds.length >= MAX_COMPARE_RUNS}
                          className="rounded border-gray-300 text-[var(--rw-blue)] focus:ring-[var(--rw-blue)]"
                          title={t('assessment_page.compare_heading')}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => loadAssessmentDetail(a.id)}
                        className="flex flex-1 items-center justify-between gap-2 py-3 pr-3 sm:pr-4 pl-3 text-left min-w-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {a.assessment_name || `Assessment ${a.id.slice(0, 8)}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {t('assessment_page.saved_list_score_prefix')} {formatScore(a.fsfsi_score)}
                              {a.cumulative_fsfsi != null
                                ? ` · ${t('assessment_page.saved_list_cumulative_abbr', {
                                    score: formatScore(a.cumulative_fsfsi),
                                  })}`
                                : ''}{' '}
                              · {a.stress_level} · {a.indicators_count} indicators
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>

                {compareIds.length >= 2 ? (
                  <SavedRunsCompareTable rows={comparedAssessments} locale={locale} t={t} />
                ) : compareIds.length === 1 ? (
                  <p className="mt-4 text-sm text-slate-500">{t('assessment_page.compare_need_two')}</p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        {selectedAssessment ? (
          <AssessmentDetailPanel assessment={selectedAssessment} onClose={() => setSelectedAssessment(null)} />
        ) : null}
      </div>
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

type IndicatorSort = 'stress_desc' | 'stress_asc' | 'gap_desc' | 'gap_asc' | 'code_asc';

function IndicatorsBreakdownTable({ indicators }: { indicators: SavedIndicatorResult[] }) {
  const { t } = useLanguage();
  const [componentFilter, setComponentFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<IndicatorSort>('stress_desc');

  const componentOptions = useMemo(() => {
    const labels = new Map<string, string>();
    for (const ind of indicators) {
      labels.set(ind.component, ind.component_display);
    }
    return [...labels.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [indicators]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = indicators.filter((ind) => {
      if (componentFilter !== 'all' && ind.component !== componentFilter) return false;
      if (!q) return true;
      return (
        ind.indicator_code.toLowerCase().includes(q) ||
        (ind.indicator_name || '').toLowerCase().includes(q) ||
        ind.component_display.toLowerCase().includes(q)
      );
    });
    const cmp = (a: SavedIndicatorResult, b: SavedIndicatorResult) => {
      switch (sort) {
        case 'stress_desc':
          return b.stress_value - a.stress_value;
        case 'stress_asc':
          return a.stress_value - b.stress_value;
        case 'gap_desc':
          return b.performance_gap - a.performance_gap;
        case 'gap_asc':
          return a.performance_gap - b.performance_gap;
        case 'code_asc':
          return a.indicator_code.localeCompare(b.indicator_code);
        default:
          return 0;
      }
    };
    rows = [...rows].sort(cmp);
    return rows;
  }, [indicators, componentFilter, search, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex items-center gap-2 text-slate-600">
          <Filter className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wide">Filters</span>
        </div>
        <div className="min-w-[10rem] flex-1 sm:max-w-[14rem]">
          <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="ind-filter-component">
            Component
          </label>
          <select
            id="ind-filter-component"
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value)}
          >
            <option value="all">All components</option>
            {componentOptions.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[8rem] flex-1 sm:max-w-[16rem]">
          <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="ind-search">
            Search
          </label>
          <input
            id="ind-search"
            type="search"
            placeholder="Code, name, or component…"
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="min-w-[12rem] sm:max-w-[14rem]">
          <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="ind-sort">
            Sort
          </label>
          <select
            id="ind-sort"
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as IndicatorSort)}
          >
            <option value="stress_desc">Stress (high → low)</option>
            <option value="stress_asc">Stress (low → high)</option>
            <option value="gap_desc">Performance gap (high → low)</option>
            <option value="gap_asc">Performance gap (low → high)</option>
            <option value="code_asc">Indicator code (A–Z)</option>
          </select>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-slate-500 sm:ml-auto">
          <ArrowDownWideNarrow className="h-3.5 w-3.5" />
          Showing {filteredSorted.length} of {indicators.length}
        </p>
      </div>

      <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
        {t('assessment_page.gap_legend')}
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/90">
            <tr className="border-b border-gray-200 text-left text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2.5 pr-4 font-medium">Indicator</th>
              <th className="py-2.5 pr-4 font-medium">Component</th>
              <th className="py-2.5 pr-4 font-medium text-right">Observed</th>
              <th className="py-2.5 pr-4 font-medium text-right">Benchmark</th>
              <th className="py-2.5 pr-4 font-medium text-right">Performance gap</th>
              <th className="py-2.5 pr-4 font-medium text-right">Stress</th>
              <th className="py-2.5 pr-2 font-medium text-right">Budget %</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.map((ind) => (
              <tr key={ind.id} className="border-b border-gray-100 hover:bg-slate-50/50">
                <td className="px-3 py-3 pr-4">
                  <span className="font-medium text-gray-900">{ind.indicator_code}</span>
                  <span className="block text-xs text-gray-500 truncate max-w-[200px]" title={ind.indicator_name}>
                    {ind.indicator_name}
                  </span>
                </td>
                <td className="py-3 pr-4 text-gray-700">{ind.component_display}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{ind.observed_value != null ? formatScore(ind.observed_value) : '—'}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{ind.benchmark_value != null ? formatScore(ind.benchmark_value) : '—'}</td>
                <td className="py-3 pr-4 text-right">
                  {(() => {
                    const { className, isGood } = getPerformanceGapDisplay(ind.performance_gap);
                    return (
                      <span
                        className={`inline-flex items-center justify-end gap-0.5 tabular-nums ${className}`}
                        title={
                          isGood
                            ? t('assessment_page.gap_tooltip_on_benchmark')
                            : t('assessment_page.gap_tooltip_off_benchmark')
                        }
                      >
                        {isGood ? <Check className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {formatScore(ind.performance_gap)}
                      </span>
                    );
                  })()}
                </td>
                <td className="py-3 pr-4 text-right font-medium tabular-nums text-slate-900">{formatScore(ind.stress_value)}</td>
                <td className="py-3 pr-3 text-right tabular-nums">{formatScore(ind.share_weighted_percent)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredSorted.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-slate-500">No indicators match the current filters.</p>
        ) : null}
      </div>
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
  const { t, locale } = useLanguage();
  const stressLevel = (assessment.stress_level ?? 'medium') as StressLevel;
  const components = assessment.component_results ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">{t('assessment_page.detail_title')}</CardTitle>
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
          <p className="text-xs text-gray-500">{t('assessment_page.detail_point_in_time_label')}</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatScore(assessment.fsfsi_score)}
            <span className={`ml-2 text-sm font-bold px-2 py-0.5 rounded-full ${getRiskBgColor(stressLevel)}`}>
              {t(riskBadgeTranslationKey(assessment.stress_level))}
            </span>
          </p>
        </div>
        {assessment.cumulative_fsfsi != null ? (
          <div>
            <p className="text-xs text-gray-500">{t('assessment_page.detail_cumulative_label')}</p>
            <p className="text-lg font-semibold text-gray-900">{formatScore(assessment.cumulative_fsfsi)}</p>
            {assessment.cumulative_stress_level ? (
              <span
                className={`mt-1 inline-block text-xs font-bold px-2 py-0.5 rounded-full ${getRiskBgColor(
                  (assessment.cumulative_stress_level as StressLevel) || 'medium',
                )}`}
              >
                {t(riskBadgeTranslationKey(assessment.cumulative_stress_level))}
              </span>
            ) : null}
          </div>
        ) : null}
        <p className="text-xs text-slate-600 leading-relaxed">{t('assessment_page.detail_vs_dashboard_note')}</p>
        <p className="text-sm text-gray-600">
          {assessment.assessment_name} · {assessment.indicators_count} indicators · {assessment.components_count}{' '}
          components
        </p>
        <div className="text-xs text-gray-600 space-y-1">
          <p>
            <span className="font-medium text-gray-700">{t('assessment_page.detail_weighting')}:</span>{' '}
            {assessmentWeightingLabel(assessment.weighting_method, t)}
          </p>
          <p>
            <span className="font-medium text-gray-700">{t('assessment_page.detail_scenario')}:</span>{' '}
            {assessmentScenarioLabel(assessment.scenario, t)}
          </p>
        </div>
        <p className="text-xs text-gray-600">
          <span className="font-medium text-gray-700">{t('assessment_page.last_updated')}:</span>{' '}
          {assessment.computed_at ? formatPolicyDate(assessment.computed_at, locale) : '—'}
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
