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
  const [targetCurve, setTargetCurve] = useState<'smoothstep' | 'linear' | 'frontloaded'>('smoothstep');
  const [weightingMethod, setWeightingMethod] = useState('hybrid');
  const [scenario, setScenario] = useState('normal_operations');
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [planName, setPlanName] = useState('');

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
          targetCurve,
          weightingMethod,
          scenario,
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
  }, [assessment, planningYears, targetFsfvi, mtefImprovementPercent, mtefGrowthRate, targetCurve, weightingMethod, scenario]);

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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <h3 className="text-sm font-semibold text-gray-900">Save this plan as the official strategic plan</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Saving persists this plan to the database and displays a summary on the National Overview.
                      Only one active plan per fiscal year — saving replaces any previous plan.
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
                        try {
                          await planningAPI.savePlan({
                            assessment_id: assessment.id,
                            plan_name: planName || `Strategic Plan FY${assessment.fiscal_year}`,
                            planning_years: planningYears,
                            target_fsfvi: targetFsfvi,
                            target_reduction_pct: targetReductionPct,
                            yearly_budget_growth_rate: mtefGrowthRate,
                            target_curve: targetCurve,
                          });
                          setPlanSaved(true);
                        } catch {
                          setError('Failed to save plan');
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
                        <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                      ) : planSaved ? (
                        <><AlertTriangle className="h-4 w-4" /> Plan Saved</>
                      ) : (
                        <><Sparkles className="h-4 w-4" /> Save Plan</>
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
