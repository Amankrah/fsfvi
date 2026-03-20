'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { FiscalYearSelector } from '@/components/rwanda/shared/FiscalYearSelector';
import { assessmentAPI } from '@/lib/api/assessmentApi';
import { planningAPI } from '@/lib/api/planningApi';
import type { SavedAssessment } from '@/lib/types/assessment';
import type { PlanningComponentInput, MultiYearStrategicPlan, MtefPlan } from '@/lib/types/planning';
import {
  PlanningTrajectoryChart,
  PlanningBudgetChart,
  ComponentAllocationChart,
  PlanningInsightsCards,
  MtefSummaryCards,
} from '@/components/rwanda/planning';
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

  // Compute target FSFSI from reduction percentage and cumulative baseline
  const cumulativeBaseline = Number(assessment?.cumulative_fsfsi) || Number(assessment?.fsfsi_score) || 0.50;
  const targetFsfvi = cumulativeBaseline * (1 - targetReductionPct / 100);

  const fetchAssessment = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMultiYearPlan(null);
    setMtefPlan(null);
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
        ),
        planningAPI.mtefForAssessment(
          assessment.id,
          mtefImprovementPercent,
          mtefGrowthRate,
        ),
      ]);

      setMultiYearPlan(multiYear);
      setMtefPlan(mtef);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string }; status?: number } };
      const msg =
        ax.response?.data?.error ||
        (ax instanceof Error ? ax.message : 'Failed to generate plans.');
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }, [assessment, planningYears, targetFsfvi, mtefImprovementPercent, mtefGrowthRate]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

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
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('planning.parameters')}</CardTitle>
              <p className="text-sm text-gray-500 font-normal">{t('planning.parameters_help')}</p>
            </CardHeader>
            <CardContent>
              {/* Context banner */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p>
                  Current cumulative stress: <strong>{cumulativeBaseline.toFixed(4)}</strong> (critical).
                  {' '}Recovery is slow due to accumulated damage from prior years.
                  {' '}A {targetReductionPct}% reduction over {planningYears} years targets <strong>{targetFsfvi.toFixed(4)}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Planning horizon (years)
                  </label>
                  <select
                    value={planningYears}
                    onChange={(e) => setPlanningYears(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    aria-label="Planning horizon"
                    title="Planning horizon"
                  >
                    <option value={3}>3 years (MTEF cycle)</option>
                    <option value={5}>5 years (PSTA-5: 2024-2029)</option>
                    <option value={7}>7 years (NST-2 aligned)</option>
                    <option value={10}>10 years (Vision 2035)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Aligned with Rwanda planning cycles</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stress reduction target (%)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={80}
                    step={5}
                    value={targetReductionPct}
                    onChange={(e) => setTargetReductionPct(Number(e.target.value) || 40)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    aria-label="Stress reduction target"
                    title="Stress reduction target"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    = FSFSI from {cumulativeBaseline.toFixed(2)} to {targetFsfvi.toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MTEF 3-year improvement (%)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={50}
                    step={5}
                    value={mtefImprovementPercent}
                    onChange={(e) => setMtefImprovementPercent(Number(e.target.value) || 15)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    aria-label="MTEF improvement target"
                    title="MTEF improvement target"
                  />
                  <p className="text-xs text-gray-400 mt-1">Rolling 3-year expenditure target</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Annual budget growth rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={25}
                    step={1}
                    value={Math.round(mtefGrowthRate * 100)}
                    onChange={(e) => setMtefGrowthRate((Number(e.target.value) || 8) / 100)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    aria-label="Annual budget growth"
                    title="Annual budget growth"
                  />
                  <p className="text-xs text-gray-400 mt-1">Rwanda avg: 8-10% for agriculture</p>
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
        </>
      )}
    </div>
  );
}
