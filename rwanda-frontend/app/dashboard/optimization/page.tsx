'use client';

/**
 * Budget Optimization — uses latest saved assessment for the selected FY.
 * Results load automatically (same three API calls as "run") so the page is never an empty shell.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { FiscalYearSelector } from '@/components/rwanda/shared/FiscalYearSelector';
import { assessmentAPI } from '@/lib/api/assessmentApi';
import { optimizationAPI } from '@/lib/api/optimizationApi';
import type { SavedAssessment } from '@/lib/types/assessment';
import type {
  EfficiencyAnalysis as EfficiencyAnalysisType,
  ReallocationPlan as ReallocationPlanType,
  RoiAnalysis as RoiAnalysisType,
} from '@/lib/types/optimization';
import { EfficiencyAnalysis, ReallocationPlan, RoiAnalysis } from '@/components/rwanda/optimization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Target,
  Sparkles,
  RefreshCw,
  LayoutTemplate,
} from 'lucide-react';
import type { TranslationParams } from '@/contexts/LanguageContext';
import { formatScore, formatRWFCompact, formatEngineDurationMs } from '@/lib/utils/formatters';

type OptimizationTab = 'efficiency' | 'reallocation' | 'roi';

function weightingLabel(method: string, t: (key: string, params?: TranslationParams) => string): string {
  const key = `assessment_page.weighting_${method}`;
  const out = t(key);
  return out === key ? method.replace(/_/g, ' ') : out;
}

function scenarioLabel(scenario: string, t: (key: string, params?: TranslationParams) => string): string {
  const key = `assessment_page.scenario_${scenario}`;
  const out = t(key);
  return out === key ? scenario.replace(/_/g, ' ') : out;
}

export default function OptimizationPage() {
  const { t } = useLanguage();
  const { fiscalYear } = useFiscalYear();

  const [assessment, setAssessment] = useState<SavedAssessment | null>(null);
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyAnalysisType | null>(null);
  const [reallocationData, setReallocationData] = useState<ReallocationPlanType | null>(null);
  const [roiData, setRoiData] = useState<RoiAnalysisType | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OptimizationTab>('efficiency');

  const assessmentRef = useRef<SavedAssessment | null>(null);
  assessmentRef.current = assessment;

  const fetchAssessment = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEfficiencyData(null);
    setReallocationData(null);
    setRoiData(null);

    try {
      const list = await assessmentAPI.listAssessments(fiscalYear.start_year, 1);
      if (list.length > 0) {
        const detail = await assessmentAPI.getAssessment(list[0].id);
        setAssessment(detail);
      } else {
        setAssessment(null);
      }
    } catch (err) {
      console.error('Failed to fetch assessment:', err);
      setError('Unable to load assessment data.');
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  }, [fiscalYear.start_year]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  const runOptimization = useCallback(async () => {
    const a = assessmentRef.current;
    if (!a) return;

    setAnalyzing(true);
    setError(null);

    try {
      const [efficiency, reallocation, roi] = await Promise.all([
        optimizationAPI.efficiencyForAssessment(a.id),
        optimizationAPI.reallocationForAssessment(a.id),
        optimizationAPI.roiForAssessment(a.id),
      ]);

      setEfficiencyData(efficiency);
      setReallocationData(reallocation);
      setRoiData(roi);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string }; status?: number } };
      const msg =
        ax.response?.data?.error ||
        (ax instanceof Error ? ax.message : 'Failed to run optimization analysis. Please try again.');
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (loading || !assessment) return;
    void runOptimization();
  }, [loading, assessment?.id, fiscalYear.start_year, runOptimization]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--rw-blue)]" />
        <span className="ml-3 text-gray-600">{t('optimization_page.loading')}</span>
      </div>
    );
  }

  const hasOptimizationData = Boolean(efficiencyData && reallocationData && roiData);
  const optContext =
    assessment && efficiencyData
      ? {
          fiscalYearLabel: fiscalYear.label,
          assessmentName: assessment.assessment_name || undefined,
          weightingLabel: weightingLabel(assessment.weighting_method, t),
          scenarioLabel: scenarioLabel(assessment.scenario, t),
          indicatorCount: assessment.indicators_count,
          cumulativeFsfsi: assessment.cumulative_fsfsi,
        }
      : undefined;

  const resultsLead =
    efficiencyData && reallocationData
      ? t('optimization_page.results_lead', {
          current: formatScore(efficiencyData.current_fsfsi),
          optimal: formatScore(efficiencyData.optimal_fsfsi),
          waste: (efficiencyData.waste_ratio * 100).toFixed(1),
        })
      : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 tracking-tight">
            <Sparkles className="h-7 w-7 text-[var(--rw-blue)]" />
            {t('optimization_page.title')}
          </h1>
          <p className="text-sm text-gray-600 mt-1 max-w-3xl leading-relaxed">{t('optimization_page.subtitle')}</p>
          <p className="text-xs text-slate-500 mt-2 max-w-3xl leading-relaxed">{t('optimization_page.method_note')}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <FiscalYearSelector />
          <span className="text-[10px] text-gray-500 text-right max-w-[12rem] leading-snug">
            {t('optimization_page.fy_selector_hint')}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
          <div className="flex items-center gap-2 flex-1">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
          {assessment ? (
            <button
              type="button"
              onClick={() => void runOptimization()}
              disabled={analyzing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-800/90 px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t('optimization_page.retry')}
            </button>
          ) : null}
        </div>
      )}

      {!assessment && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('optimization_page.no_assessment_title')}</h2>
            <p className="text-gray-600 max-w-md mx-auto">{t('optimization_page.no_assessment_body')}</p>
          </CardContent>
        </Card>
      )}

      {assessment && !hasOptimizationData && (
        <Card className="border border-dashed border-slate-200 bg-gradient-to-br from-slate-50/80 to-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-[var(--rw-blue)]" />
              {analyzing ? t('optimization_page.preview_running_title') : t('optimization_page.preview_title')}
            </CardTitle>
            <p className="text-sm text-gray-600 font-normal leading-relaxed">
              {analyzing ? t('optimization_page.preview_running_body') : t('optimization_page.preview_idle_body')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  {t('optimization_page.preview_kpi_assessment')}
                </p>
                <p className="text-lg font-bold text-gray-900 mt-1">{formatScore(assessment.fsfsi_score)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {assessment.indicators_count} {t('optimization_page.preview_indicators')}
                </p>
              </div>
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  {t('optimization_page.preview_kpi_budget')}
                </p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatRWFCompact(Number(assessment.total_budget_lcu_bn || 0) * 1_000_000_000)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{fiscalYear.label}</p>
              </div>
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  {t('optimization_page.preview_kpi_engine')}
                </p>
                <p className="text-sm font-medium text-gray-800 mt-2">{weightingLabel(assessment.weighting_method, t)}</p>
                <p className="text-xs text-gray-500 mt-1">{scenarioLabel(assessment.scenario, t)}</p>
              </div>
            </div>
            <div className="rounded-lg bg-slate-100/80 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                {t('optimization_page.preview_outputs_title')}
              </p>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                <li>{t('optimization_page.preview_output_efficiency')}</li>
                <li>{t('optimization_page.preview_output_reallocation')}</li>
                <li>{t('optimization_page.preview_output_roi')}</li>
              </ul>
              <p className="text-xs text-slate-500 pt-1">{t('optimization_page.time_hint')}</p>
            </div>
            {analyzing && (
              <div className="flex items-center gap-3 text-sm text-[var(--rw-blue)]">
                <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                <span>{t('optimization_page.analyzing_detail')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {hasOptimizationData && efficiencyData && reallocationData && roiData && (
        <>
          {resultsLead ? (
            <p className="text-sm text-slate-800 leading-relaxed border-l-4 border-[var(--rw-blue)] bg-slate-50/90 pl-4 py-3 rounded-r-lg">
              {resultsLead}
            </p>
          ) : null}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setActiveTab('efficiency')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'efficiency'
                    ? 'bg-[var(--rw-blue)] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                {t('optimization_page.tab_efficiency')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reallocation')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-l border-gray-200 ${
                  activeTab === 'reallocation'
                    ? 'bg-[var(--rw-blue)] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <DollarSign className="h-4 w-4" />
                {t('optimization_page.tab_reallocation')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('roi')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-l border-gray-200 ${
                  activeTab === 'roi'
                    ? 'bg-[var(--rw-blue)] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Target className="h-4 w-4" />
                {t('optimization_page.tab_roi')}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void runOptimization()}
              disabled={analyzing}
              title={t('optimization_page.rerun_title')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t('optimization_page.rerun')}
            </button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {activeTab === 'efficiency' && (
                  <>
                    <TrendingUp className="h-5 w-5 text-[var(--rw-blue)]" />
                    {t('optimization_page.card_efficiency_title')}
                  </>
                )}
                {activeTab === 'reallocation' && (
                  <>
                    <DollarSign className="h-5 w-5 text-[var(--rw-blue)]" />
                    {t('optimization_page.card_reallocation_title')}
                  </>
                )}
                {activeTab === 'roi' && (
                  <>
                    <Target className="h-5 w-5 text-[var(--rw-blue)]" />
                    {t('optimization_page.card_roi_title')}
                  </>
                )}
              </CardTitle>
              <p className="text-sm text-gray-500 font-normal leading-relaxed">
                {activeTab === 'efficiency' && t('optimization_page.card_efficiency_sub')}
                {activeTab === 'reallocation' && t('optimization_page.card_reallocation_sub')}
                {activeTab === 'roi' && t('optimization_page.card_roi_sub')}
              </p>
              <p className="text-xs text-slate-500 font-normal">
                {t('optimization_page.engine_timing_aggregate', {
                  ms: formatEngineDurationMs(
                    (efficiencyData.computing_time_ms || 0) +
                      (reallocationData.computing_time_ms || 0) +
                      (roiData.computing_time_ms || 0),
                  ),
                })}
              </p>
            </CardHeader>
            <CardContent>
              {activeTab === 'efficiency' && (
                <EfficiencyAnalysis data={efficiencyData} context={optContext} />
              )}
              {activeTab === 'reallocation' && <ReallocationPlan data={reallocationData} />}
              {activeTab === 'roi' && <RoiAnalysis data={roiData} />}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
