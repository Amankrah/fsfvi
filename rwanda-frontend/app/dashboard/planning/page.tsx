'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { FiscalYearSelector } from '@/components/rwanda/shared/FiscalYearSelector';
import { assessmentAPI } from '@/lib/api/assessmentApi';
import { planningAPI } from '@/lib/api/planningApi';
import type { SavedAssessment } from '@/lib/types/assessment';
import type {
  PlanningComponentInput,
  MultiYearStrategicPlan,
  MtefPlan,
  SavedStrategicPlanSummary,
  SavedStrategicPlanFull,
} from '@/lib/types/planning';
import {
  PlanningTrajectoryChart,
  PlanningBudgetChart,
  ComponentAllocationChart,
  PlanningInsightsCards,
  MtefSummaryCards,
  PlanTrajectoryCompareChart,
  PlanningBudgetAlignmentCard,
} from '@/components/rwanda/planning';
import { PersistenceConfigPanel } from '@/components/rwanda/planning/PersistenceConfigPanel';
import { ComponentTrajectoryTable } from '@/components/rwanda/planning/ComponentTrajectoryTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  AlertTriangle,
  CalendarRange,
  Target,
  TrendingDown,
  DollarSign,
  BarChart3,
  RefreshCw,
  Sparkles,
  FolderOpen,
  PlusCircle,
  Scale,
  Star,
  GitCompare,
  Trash2,
} from 'lucide-react';
import { formatScore, formatRWFCompact } from '@/lib/utils/formatters';

function toPlanningInput(assessment: SavedAssessment): PlanningComponentInput[] {
  if (!assessment.component_results) return [];
  return assessment.component_results.map((comp) => {
    const budgetLcuBn = Number(comp.budget_lcu_bn) || 0;
    const allocationLcu = budgetLcuBn * 1_000_000;
    // Use CUMULATIVE stress for planning — this reflects the real accumulated
    // damage that future budgets need to address, not just the current snapshot.
    const cumulativeGap = Number(comp.cumulative_stress) || Number(comp.avg_performance_gap) || 0;
    const weight = comp.weight != null ? Number(comp.weight) : undefined;
    return {
      component_type: comp.component,
      observed_value: Math.max(0, 1 - cumulativeGap),
      benchmark_value: 1,
      financial_allocation_lcu: Number.isFinite(allocationLcu) ? allocationLcu : 0,
      ...(Number.isFinite(weight) ? { weight } : {}),
    };
  });
}

function normalizeSavedPlanJson(raw: MultiYearStrategicPlan): MultiYearStrategicPlan {
  return {
    ...raw,
    planning_weighting_method:
      raw.planning_weighting_method != null ? String(raw.planning_weighting_method) : undefined,
    planning_scenario: raw.planning_scenario != null ? String(raw.planning_scenario) : undefined,
    baseline_fsfvi: Number(raw.baseline_fsfvi),
    target_fsfvi: Number(raw.target_fsfvi),
    planning_years: Number(raw.planning_years),
    total_additional_investment_needed: Number(raw.total_additional_investment_needed),
    planning_start_fiscal_year:
      raw.planning_start_fiscal_year != null ? Number(raw.planning_start_fiscal_year) : undefined,
    baseline_assessment_fiscal_year:
      raw.baseline_assessment_fiscal_year != null
        ? Number(raw.baseline_assessment_fiscal_year)
        : undefined,
    yearly_plans: (raw.yearly_plans ?? []).map((p) => ({
      ...p,
      year: Number(p.year),
      fiscal_year: p.fiscal_year != null ? Number(p.fiscal_year) : undefined,
      target_fsfvi: Number(p.target_fsfvi),
      projected_fsfvi: Number(p.projected_fsfvi),
      fsfvi_reduction_from_previous: Number(p.fsfvi_reduction_from_previous),
      total_budget: Number(p.total_budget),
    })),
  };
}

export default function PlanningPage() {
  const { t } = useLanguage();
  const { fiscalYear } = useFiscalYear();
  const [assessment, setAssessment] = useState<SavedAssessment | null>(null);
  const [multiYearPlan, setMultiYearPlan] = useState<MultiYearStrategicPlan | null>(null);
  const [mtefPlan, setMtefPlan] = useState<MtefPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Rwanda-specific defaults:
  // - 5 years = aligned with PSTA-5 (2024-2029)
  // - 40% reduction target = ambitious but realistic given slow recovery
  // - 8% budget growth = aligned with Rwanda's recent agriculture budget trends
  const [planningYears, setPlanningYears] = useState(5);
  const [targetReductionPct, setTargetReductionPct] = useState(40);
  const [mtefImprovementPercent, setMtefImprovementPercent] = useState(15);
  const [mtefGrowthRate, setMtefGrowthRate] = useState(0.08);
  const [targetCurve, setTargetCurve] = useState<'smoothstep' | 'linear' | 'frontloaded'>('smoothstep');
  const [weightingMethod, setWeightingMethod] = useState('hybrid');
  const [scenario, setScenario] = useState('normal_operations');
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [planName, setPlanName] = useState('');
  const [savedPlans, setSavedPlans] = useState<SavedStrategicPlanSummary[]>([]);
  const [savedPlansLoading, setSavedPlansLoading] = useState(false);
  const [loadedPlanId, setLoadedPlanId] = useState<string | null>(null);
  const [openingPlanId, setOpeningPlanId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareRows, setCompareRows] = useState<SavedStrategicPlanFull[] | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  /** When set, saved plan was generated from this assessment id (may differ from current). */
  const [loadedFromAssessmentId, setLoadedFromAssessmentId] = useState<string | null>(null);
  /** FY label for multi-year plan row 1 (Year 1); defaults to assessment FY + 1 when unset. */
  const [planningStartFiscalYear, setPlanningStartFiscalYear] = useState(2025);

  const formatWeightingMethodLabel = useCallback(
    (code?: string | null) => {
      const m = (code || 'hybrid').toLowerCase();
      const keys: Record<string, string> = {
        hybrid: 'planning.weight_method_hybrid',
        equal: 'planning.weight_method_equal',
        expert: 'planning.weight_method_expert',
        financial: 'planning.weight_method_financial',
        network: 'planning.weight_method_network',
      };
      const key = keys[m];
      return key ? t(key as 'planning.weight_method_hybrid') : m;
    },
    [t],
  );

  // Compute target FSFSI from reduction percentage and cumulative baseline
  const cumulativeBaseline = Number(assessment?.cumulative_fsfsi) || Number(assessment?.fsfsi_score) || 0.50;
  const targetFsfvi = cumulativeBaseline * (1 - targetReductionPct / 100);

  const fetchAssessment = useCallback(async () => {
    setLoading(true);
    setError(null);
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
    } finally {
      setLoading(false);
    }
  }, [fiscalYear.start_year]);

  const fetchSavedPlans = useCallback(async () => {
    setSavedPlansLoading(true);
    try {
      const rows = await planningAPI.listSavedPlans(fiscalYear.start_year);
      setSavedPlans(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error('Failed to list saved plans:', e);
      setSavedPlans([]);
    } finally {
      setSavedPlansLoading(false);
    }
  }, [fiscalYear.start_year]);

  const startNewPlan = useCallback(() => {
    setMultiYearPlan(null);
    setMtefPlan(null);
    setLoadedPlanId(null);
    setLoadedFromAssessmentId(null);
    setPlanSaved(false);
    setCompareRows(null);
    setCompareIds([]);
    setError(null);
  }, []);

  const openSavedPlan = useCallback(
    async (planId: string) => {
      setOpeningPlanId(planId);
      setError(null);
      try {
        const full = await planningAPI.getSavedPlan(planId);
        const pj = full.plan_json;
        if (!pj || !pj.yearly_plans) {
          setError(t('planning.saved_invalid_json'));
          return;
        }
        const normalized = normalizeSavedPlanJson(pj as MultiYearStrategicPlan);
        setMultiYearPlan(normalized);
        setPlanningStartFiscalYear(
          normalized.planning_start_fiscal_year ?? full.fiscal_year + 1,
        );
        setPlanningYears(full.planning_years);
        setTargetReductionPct(Number(full.target_reduction_pct));
        setMtefGrowthRate(Number(full.yearly_budget_growth_rate));
        setTargetCurve(full.target_curve as 'smoothstep' | 'linear' | 'frontloaded');
        setWeightingMethod(full.weighting_method || 'hybrid');
        setScenario(full.scenario || 'normal_operations');
        setPlanName(full.plan_name || '');
        setLoadedPlanId(planId);
        setLoadedFromAssessmentId(full.assessment_id);
        setPlanSaved(false);
        setCompareRows(null);
        if (assessment && full.assessment_id === assessment.id) {
          try {
            const mtef = await planningAPI.mtefForAssessment(
              assessment.id,
              mtefImprovementPercent,
              Number(full.yearly_budget_growth_rate),
              (full.target_curve as 'linear' | 'smoothstep' | 'frontloaded') || 'linear',
              full.weighting_method || 'hybrid',
              full.scenario || 'normal_operations',
            );
            setMtefPlan(mtef);
          } catch {
            setMtefPlan(null);
          }
        } else {
          setMtefPlan(null);
        }
      } catch {
        setError(t('planning.saved_open_failed'));
      } finally {
        setOpeningPlanId(null);
      }
    },
    [assessment, mtefImprovementPercent, t],
  );

  const deleteSavedPlanRow = useCallback(
    async (planId: string) => {
      if (!window.confirm(t('planning.delete_confirm'))) return;
      setDeletingPlanId(planId);
      setError(null);
      try {
        await planningAPI.deleteSavedPlan(planId);
        setCompareIds((prev) => prev.filter((x) => x !== planId));
        if (loadedPlanId === planId) {
          setLoadedPlanId(null);
          setLoadedFromAssessmentId(null);
          setMultiYearPlan(null);
          setMtefPlan(null);
          setPlanName('');
          setPlanSaved(false);
        }
        await fetchSavedPlans();
      } catch {
        setError(t('planning.delete_failed'));
      } finally {
        setDeletingPlanId(null);
      }
    },
    [fetchSavedPlans, loadedPlanId, t],
  );

  const toggleCompareId = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
    setCompareRows(null);
  }, []);

  const runCompare = useCallback(async () => {
    if (compareIds.length < 2) return;
    setCompareLoading(true);
    setError(null);
    try {
      const fullList = await Promise.all(compareIds.map((id) => planningAPI.getSavedPlan(id)));
      setCompareRows(fullList);
    } catch {
      setError(t('planning.compare_failed'));
      setCompareRows(null);
    } finally {
      setCompareLoading(false);
    }
  }, [compareIds, t]);

  const activatePlan = useCallback(
    async (planId: string) => {
      setActivatingId(planId);
      setError(null);
      try {
        await planningAPI.activateSavedPlan(planId);
        await fetchSavedPlans();
      } catch {
        setError(t('planning.activate_failed'));
      } finally {
        setActivatingId(null);
      }
    },
    [fetchSavedPlans, t],
  );

  const runPlanning = useCallback(async () => {
    if (!assessment) return;
    const components = toPlanningInput(assessment);
    if (components.length === 0) {
      setError('No component data for planning.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      // Use assessment-based endpoints — backend handles cumulative baseline,
      // data-driven insights, and accurate numbers. No frontend patching needed.
      const [multiYear, mtef] = await Promise.all([
        planningAPI.planForAssessment(
          assessment.id,
          Math.min(Math.max(1, planningYears), 15),
          Math.max(0.01, Math.min(1, targetFsfvi)),
          mtefGrowthRate,
          targetCurve,
          weightingMethod,
          scenario,
          planningStartFiscalYear,
        ),
        planningAPI.mtefForAssessment(
          assessment.id,
          mtefImprovementPercent,
          mtefGrowthRate,
          targetCurve,
          weightingMethod,
          scenario,
        ),
      ]);

      setMultiYearPlan(multiYear);
      setMtefPlan(mtef);
      setLoadedPlanId(null);
      setLoadedFromAssessmentId(null);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string }; status?: number } };
      const msg =
        ax.response?.data?.error ||
        (ax instanceof Error ? ax.message : 'Failed to generate plans.');
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }, [
    assessment,
    planningYears,
    targetFsfvi,
    mtefImprovementPercent,
    mtefGrowthRate,
    targetCurve,
    weightingMethod,
    scenario,
    planningStartFiscalYear,
  ]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  useEffect(() => {
    startNewPlan();
  }, [fiscalYear.start_year, startNewPlan]);

  useEffect(() => {
    if (assessment) {
      void fetchSavedPlans();
    } else {
      setSavedPlans([]);
    }
  }, [assessment, fetchSavedPlans]);

  const baselineBudget = assessment
    ? toPlanningInput(assessment).reduce((s, c) => s + c.financial_allocation_lcu, 0)
    : 0;
  const hasPlans = multiYearPlan || mtefPlan;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--rw-blue)]" />
        <span className="ml-3 text-gray-600">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarRange className="h-7 w-7 text-[var(--rw-blue)]" />
            {t('planning.title')}
          </h1>
          <p className="text-sm text-gray-600 mt-1">{t('planning.subtitle')}</p>
        </div>
        <FiscalYearSelector />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {!assessment && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('planning.no_assessment_title')}</h2>
            <p className="text-gray-600 max-w-md mx-auto">{t('planning.no_assessment_message')}</p>
          </CardContent>
        </Card>
      )}

      {assessment && (
        <>
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-[var(--rw-blue)]" />
                  {t('planning.saved_plans_title')}
                </CardTitle>
                <p className="text-sm text-gray-500 font-normal mt-1">{t('planning.saved_plans_help')}</p>
              </div>
              <button
                type="button"
                onClick={startNewPlan}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                <PlusCircle className="h-4 w-4" />
                {t('planning.new_plan_draft')}
              </button>
            </CardHeader>
            <CardContent>
              {savedPlansLoading ? (
                <div className="flex items-center gap-2 text-gray-600 text-sm py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('planning.saved_plans_loading')}
                </div>
              ) : savedPlans.length === 0 ? (
                <p className="text-sm text-gray-600 py-2">{t('planning.saved_plans_empty')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2 pr-2 w-10">{t('planning.compare_pick')}</th>
                        <th className="py-2 pr-3">{t('planning.saved_name')}</th>
                        <th className="py-2 pr-3">{t('planning.saved_status')}</th>
                        <th className="py-2 pr-3">{t('planning.saved_horizon')}</th>
                        <th className="py-2 pr-3">{t('planning.saved_weights')}</th>
                        <th className="py-2 pr-3">{t('planning.saved_reduction')}</th>
                        <th className="py-2 pr-3">{t('planning.saved_baseline_final')}</th>
                        <th className="py-2 pr-3">{t('planning.saved_created')}</th>
                        <th className="py-2 text-right">{t('planning.saved_actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedPlans.map((row) => (
                        <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                          <td className="py-2 pr-2">
                            <input
                              type="checkbox"
                              checked={compareIds.includes(row.id)}
                              onChange={() => toggleCompareId(row.id)}
                              aria-label={t('planning.compare_pick')}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="py-2 pr-3 font-medium text-gray-900">
                            {row.plan_name?.trim() || `Plan ${row.id.slice(0, 8)}…`}
                          </td>
                          <td className="py-2 pr-3">
                            {row.is_active ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium">
                                <Star className="h-3 w-3" />
                                {t('planning.status_active')}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">{t('planning.status_inactive')}</span>
                            )}
                          </td>
                          <td className="py-2 pr-3">{row.planning_years} yr</td>
                          <td className="py-2 pr-3 text-xs text-gray-700">
                            {formatWeightingMethodLabel(row.weighting_method)}
                          </td>
                          <td className="py-2 pr-3">{Number(row.target_reduction_pct).toFixed(0)}%</td>
                          <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs">
                            {formatScore(Number(row.baseline_fsfsi))} →{' '}
                            {row.final_projected_fsfsi != null
                              ? formatScore(Number(row.final_projected_fsfsi))
                              : '—'}
                          </td>
                          <td className="py-2 pr-3 text-gray-500 text-xs whitespace-nowrap">
                            {new Date(row.created_at).toLocaleString()}
                          </td>
                          <td className="py-2 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => void openSavedPlan(row.id)}
                              disabled={openingPlanId === row.id}
                              className="text-[var(--rw-blue)] hover:underline mr-3 text-xs font-medium disabled:opacity-50"
                            >
                              {openingPlanId === row.id ? t('common.loading') : t('planning.open_plan')}
                            </button>
                            {!row.is_active && (
                              <button
                                type="button"
                                onClick={() => void activatePlan(row.id)}
                                disabled={activatingId === row.id}
                                className="text-gray-700 hover:underline text-xs font-medium disabled:opacity-50 mr-2"
                              >
                                {activatingId === row.id ? '…' : t('planning.set_active')}
                              </button>
                            )}
                            <button
                              type="button"
                              title={t('planning.delete_plan')}
                              aria-label={t('planning.delete_plan')}
                              onClick={() => void deleteSavedPlanRow(row.id)}
                              disabled={deletingPlanId === row.id}
                              className="inline-flex items-center justify-center rounded p-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingPlanId === row.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {compareIds.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void runCompare()}
                    disabled={compareIds.length < 2 || compareLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {compareLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GitCompare className="h-4 w-4" />
                    )}
                    {t('planning.compare_run')} ({compareIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCompareIds([]);
                      setCompareRows(null);
                    }}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    {t('planning.compare_clear')}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {loadedPlanId && (
            <div className="space-y-2">
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-2 text-sm text-blue-900 flex items-center gap-2">
                <FolderOpen className="h-4 w-4 flex-shrink-0" />
                {t('planning.viewing_saved')}
              </div>
              {loadedFromAssessmentId && loadedFromAssessmentId !== assessment.id && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-2 text-sm text-amber-950 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
                  {t('planning.saved_different_assessment')}
                </div>
              )}
            </div>
          )}

          {compareRows && compareRows.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Scale className="h-5 w-5 text-[var(--rw-blue)]" />
                  {t('planning.compare_title')}
                </CardTitle>
                <p className="text-sm text-gray-500 font-normal">{t('planning.compare_help')}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2 pr-3">{t('planning.saved_name')}</th>
                        <th className="py-2 pr-3">{t('planning.saved_horizon')}</th>
                        <th className="py-2 pr-3">{t('planning.saved_weights')}</th>
                        <th className="py-2 pr-3">{t('planning.saved_reduction')}</th>
                        <th className="py-2 pr-3">{t('planning.baseline_fsfvi')}</th>
                        <th className="py-2 pr-3">{t('planning.target_fsfvi')}</th>
                        <th className="py-2 pr-3">{t('planning.budget_increase_over_plan')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareRows.map((r) => (
                        <tr key={r.id} className="border-b border-gray-100">
                          <td className="py-2 pr-3 font-medium">
                            {r.plan_name?.trim() || `${r.id.slice(0, 8)}…`}
                          </td>
                          <td className="py-2 pr-3">{r.planning_years}</td>
                          <td className="py-2 pr-3 text-xs text-gray-700">
                            {formatWeightingMethodLabel(r.weighting_method)}
                          </td>
                          <td className="py-2 pr-3">{Number(r.target_reduction_pct).toFixed(0)}%</td>
                          <td className="py-2 pr-3 font-mono">{formatScore(Number(r.baseline_fsfsi))}</td>
                          <td className="py-2 pr-3 font-mono">{formatScore(Number(r.target_fsfvi))}</td>
                          <td className="py-2 pr-3 font-mono">
                            {formatRWFCompact(
                              Number(r.total_additional_investment ?? r.plan_json?.total_additional_investment_needed ?? 0),
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">
                    {t('planning.compare_chart_title')}
                  </h4>
                  <PlanTrajectoryCompareChart
                    series={compareRows.map((r) => ({
                      id: r.id,
                      label: r.plan_name?.trim() || `Plan ${r.id.slice(0, 8)}`,
                      plan: normalizeSavedPlanJson(r.plan_json as MultiYearStrategicPlan),
                    }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('planning.parameters')}</CardTitle>
              <p className="text-sm text-gray-500 font-normal">{t('planning.parameters_help')}</p>
            </CardHeader>
            <CardContent>
              {/* Current situation summary */}
              <div className="mb-5 flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <span className="text-lg font-bold">{cumulativeBaseline.toFixed(2)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Current Cumulative Stress (Critical)</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    A <strong>{targetReductionPct}%</strong> reduction over <strong>{planningYears} years</strong> targets <strong>{targetFsfvi.toFixed(2)}</strong>.
                    Recovery is slow due to accumulated damage from prior years.
                  </p>
                </div>
              </div>

              {/* Two-row parameter layout */}
              <div className="space-y-4">
                {/* Row 1: Strategic targets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Planning Horizon
                    </label>
                    <select
                      value={planningYears}
                      onChange={(e) => setPlanningYears(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium"
                      aria-label="Planning horizon"
                      title="Planning horizon"
                    >
                      <option value={3}>3 years — MTEF cycle</option>
                      <option value={5}>5 years — PSTA-5 (2024-2029)</option>
                      <option value={7}>7 years — NST-2 aligned</option>
                      <option value={10}>10 years — Vision 2035</option>
                    </select>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {t('planning.horizon_start_fy')}
                    </label>
                    <input
                      type="number"
                      min={1990}
                      max={2100}
                      step={1}
                      value={planningStartFiscalYear}
                      onChange={(e) =>
                        setPlanningStartFiscalYear(Number(e.target.value) || assessment.fiscal_year + 1)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-mono"
                      aria-label={t('planning.horizon_start_fy')}
                      title={t('planning.horizon_start_fy_hint')}
                    />
                    <p className="text-xs text-gray-500 mt-1.5">{t('planning.horizon_start_fy_hint')}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Stress Reduction Target
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={5}
                        max={80}
                        step={5}
                        value={targetReductionPct}
                        onChange={(e) => setTargetReductionPct(Number(e.target.value) || 40)}
                        className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-center"
                        aria-label="Stress reduction target"
                        title="Stress reduction target"
                      />
                      <span className="text-sm text-gray-500">%</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {cumulativeBaseline.toFixed(2)} → {targetFsfvi.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Milestone Pacing
                    </label>
                    <select
                      value={targetCurve}
                      onChange={(e) => setTargetCurve(e.target.value as 'smoothstep' | 'linear' | 'frontloaded')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium"
                      aria-label="Milestone pacing"
                      title="Milestone pacing"
                    >
                      <option value="smoothstep">Build-up phase first (recommended)</option>
                      <option value="linear">Uniform annual targets</option>
                      <option value="frontloaded">Early wins priority</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Budget parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Annual Budget Growth
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={25}
                        step={1}
                        value={Math.round(mtefGrowthRate * 100)}
                        onChange={(e) => setMtefGrowthRate((Number(e.target.value) || 8) / 100)}
                        className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-center"
                        aria-label="Annual budget growth"
                        title="Annual budget growth"
                      />
                      <span className="text-sm text-gray-500">% per year</span>
                      <span className="text-xs text-gray-400 ml-auto">Rwanda avg: 8-10% for agriculture</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      MTEF 3-Year Improvement Target
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={5}
                        max={50}
                        step={5}
                        value={mtefImprovementPercent}
                        onChange={(e) => setMtefImprovementPercent(Number(e.target.value) || 15)}
                        className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-center"
                        aria-label="MTEF improvement target"
                        title="MTEF improvement target"
                      />
                      <span className="text-sm text-gray-500">% over 3 years</span>
                      <span className="text-xs text-gray-400 ml-auto">Rolling expenditure framework</span>
                    </div>
                  </div>
                </div>

                {/* Row 3: Weighting & Scenario */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Component Weighting Method
                    </label>
                    <select
                      value={weightingMethod}
                      onChange={(e) => setWeightingMethod(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium"
                      aria-label="Weighting method"
                      title="Weighting method"
                    >
                      <option value="hybrid">Hybrid (expert + network + financial)</option>
                      <option value="equal">Equal weights (1/n)</option>
                      <option value="expert">Expert judgment (AHP)</option>
                      <option value="financial">Budget proportional</option>
                      <option value="network">Network centrality (PageRank)</option>
                    </select>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Planning Scenario
                    </label>
                    <select
                      value={scenario}
                      onChange={(e) => setScenario(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium"
                      aria-label="Planning scenario"
                      title="Planning scenario"
                    >
                      <option value="normal_operations">Normal Operations</option>
                      <option value="climate_shock">Climate Shock</option>
                      <option value="financial_crisis">Financial Crisis</option>
                      <option value="pandemic_disruption">Pandemic Disruption</option>
                      <option value="political_instability">Political Instability</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardContent className="pt-0">
              <button
                type="button"
                onClick={runPlanning}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--rw-blue)] px-6 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('planning.generating')}
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    {t('planning.generate_plans')}
                  </>
                )}
              </button>
            </CardContent>
          </Card>

          {hasPlans && (
            <>
              {/* ---------- Multi-year strategic plan (clearly separate section) ---------- */}
              {multiYearPlan && (
                <section className="space-y-6" aria-labelledby="planning-multiyear-heading">
                  <div>
                    <h2 id="planning-multiyear-heading" className="text-lg font-semibold text-gray-900">
                      {t('planning.section_multiyear_title')} — {multiYearPlan.planning_years} {t('planning.years_unit')}
                    </h2>
                    <p className="text-sm text-gray-600 mt-0.5">{t('planning.section_multiyear_desc')}</p>
                  </div>

                  {/* KPI cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{t('planning.baseline_fsfvi')}</p>
                        <p className="text-xl font-bold text-gray-900">{formatScore(multiYearPlan.baseline_fsfvi)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{t('planning.target_fsfvi')}</p>
                        <p className="text-xl font-bold text-[var(--rw-green)]">{formatScore(multiYearPlan.target_fsfvi)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{t('planning.years_to_target')}</p>
                        <p className="text-xl font-bold text-[var(--rw-blue)]">{multiYearPlan.planning_years}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{t('planning.budget_increase_over_plan')}</p>
                        <p className="text-xl font-bold text-gray-900">{formatRWFCompact(multiYearPlan.total_additional_investment_needed)}</p>
                        <p className="text-xs text-gray-500 mt-1">{t('planning.budget_increase_hint')}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {!multiYearPlan.target_already_achieved && multiYearPlan.yearly_plans.length > 0 && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-[var(--rw-blue)]" />
                        {t('planning.trajectory_title')}
                      </CardTitle>
                      <p className="text-sm text-gray-500 font-normal">{t('planning.trajectory_help')}</p>
                    </CardHeader>
                    <CardContent>
                      <PlanningTrajectoryChart
                        yearlyPlans={multiYearPlan.yearly_plans}
                        baselineFsfvi={multiYearPlan.baseline_fsfvi}
                        targetFsfvi={multiYearPlan.target_fsfvi}
                      />
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-[var(--rw-blue)]" />
                          {t('planning.budget_evolution')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PlanningBudgetChart
                          yearlyPlans={multiYearPlan.yearly_plans}
                          baselineBudget={baselineBudget}
                        />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-[var(--rw-blue)]" />
                          {t('planning.allocation_share')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ComponentAllocationChart yearlyPlans={multiYearPlan.yearly_plans} />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Component Recovery Trajectory */}
                  <ComponentTrajectoryTable
                    yearlyPlans={multiYearPlan.yearly_plans}
                    baselineComponents={
                      Object.fromEntries(
                        (assessment?.component_results ?? []).map((c) => [
                          c.component,
                          c.cumulative_stress ?? c.component_stress,
                        ])
                      )
                    }
                  />

                  <PlanningBudgetAlignmentCard
                    assessmentId={assessment.id}
                    weightingMethod={weightingMethod}
                    scenario={scenario}
                    yearlyPlans={multiYearPlan.yearly_plans}
                    planWeightingMethod={multiYearPlan.planning_weighting_method}
                    planScenario={multiYearPlan.planning_scenario}
                    planId={loadedPlanId ?? undefined}
                  />

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('planning.insights_title')}</CardTitle>
                      <p className="text-sm text-gray-500 font-normal">{t('planning.insights_help')}</p>
                    </CardHeader>
                    <CardContent>
                      <PlanningInsightsCards
                        expectedOutcomes={multiYearPlan.expected_outcomes}
                        implementationRisks={multiYearPlan.implementation_risks}
                        successFactors={multiYearPlan.success_factors}
                      />
                    </CardContent>
                  </Card>
                </>
                  )}

                  {multiYearPlan.target_already_achieved && (
                <Card className="border-[var(--rw-green)]/30 bg-green-50/30">
                  <CardContent className="py-8 text-center">
                    <Target className="h-12 w-12 text-[var(--rw-green)] mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900">{t('planning.target_achieved_title')}</h3>
                    <p className="text-gray-600 mt-1">{multiYearPlan.expected_outcomes[0] ?? t('planning.target_achieved_message')}</p>
                  </CardContent>
                </Card>
                  )}
                </section>
              )}

              {/* ---------- MTEF (clearly separate from multi-year plan) ---------- */}
              {mtefPlan && (
                <section className="pt-8 border-t-2 border-gray-200" aria-labelledby="planning-mtef-heading">
                  <div className="mb-4">
                    <h2 id="planning-mtef-heading" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <CalendarRange className="h-5 w-5 text-[var(--rw-blue)]" />
                      {t('planning.section_mtef_title')}
                    </h2>
                    <p className="text-sm text-gray-600 mt-0.5">{t('planning.section_mtef_desc')}</p>
                  </div>
                  <Card className="border-[var(--rw-blue)]/20">
                    <CardContent className="pt-6">
                      <MtefSummaryCards plan={mtefPlan} />
                    </CardContent>
                  </Card>
                </section>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={runPlanning}
                  disabled={generating}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t('common.retry')}
                </button>
              </div>
            </>
          )}

          {/* Save Plan */}
          {hasPlans && assessment && multiYearPlan && (
            <Card className="border-2 border-[var(--rw-green)]/30 bg-green-50/30">
              <CardContent className="py-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {loadedPlanId ? t('planning.save_update_title') : t('planning.save_new_title')}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {loadedPlanId
                        ? t('planning.save_update_help')
                        : t('planning.save_new_help')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder={`PSTA-5 Plan FY${assessment.fiscal_year}`}
                      value={planName}
                      onChange={(e) => { setPlanName(e.target.value); setPlanSaved(false); }}
                      className="flex-1 sm:w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={savingPlan || planSaved}
                      onClick={async () => {
                        setSavingPlan(true);
                        setPlanSaved(false);
                        setError(null);
                        const trimmedName =
                          planName.trim() || `Strategic Plan FY${assessment.fiscal_year}`;
                        try {
                          const payload = {
                            assessment_id: assessment.id,
                            plan_name: trimmedName,
                            planning_years: planningYears,
                            target_fsfvi: targetFsfvi,
                            target_reduction_pct: targetReductionPct,
                            yearly_budget_growth_rate: mtefGrowthRate,
                            target_curve: targetCurve,
                            weighting_method: weightingMethod,
                            scenario,
                            planning_start_fiscal_year: planningStartFiscalYear,
                          };
                          if (loadedPlanId) {
                            const updated = await planningAPI.updateSavedPlan(loadedPlanId, payload);
                            const pj = updated.plan_json;
                            if (pj?.yearly_plans) {
                              setMultiYearPlan(normalizeSavedPlanJson(pj as MultiYearStrategicPlan));
                            }
                          } else {
                            await planningAPI.savePlan(payload);
                            setLoadedPlanId(null);
                            setLoadedFromAssessmentId(null);
                          }
                          setPlanSaved(true);
                          await fetchSavedPlans();
                        } catch (err: unknown) {
                          const ax = err as {
                            response?: {
                              data?: { error?: string; plan_name?: string[]; detail?: string };
                            };
                          };
                          const d = ax.response?.data;
                          const msg =
                            (typeof d?.error === 'string' ? d.error : null) ||
                            (Array.isArray(d?.plan_name) ? d.plan_name[0] : null) ||
                            (typeof d?.detail === 'string' ? d.detail : null) ||
                            t('planning.save_failed');
                          setError(msg);
                        } finally {
                          setSavingPlan(false);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
                        planSaved
                          ? 'bg-green-600 text-white'
                          : 'bg-[var(--rw-green)] text-white hover:opacity-90'
                      } disabled:opacity-50`}
                    >
                      {savingPlan ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> {t('planning.saving')}</>
                      ) : planSaved ? (
                        <><AlertTriangle className="h-4 w-4" /> {t('planning.saved_ok')}</>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />{' '}
                          {loadedPlanId ? t('planning.save_update_button') : t('planning.save_new_button')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advanced: Cumulative Stress Parameters */}
          <PersistenceConfigPanel onConfigSaved={fetchAssessment} />
        </>
      )}
    </div>
  );
}
