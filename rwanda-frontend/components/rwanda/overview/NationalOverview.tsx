'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { FiscalYearSelector } from '@/components/rwanda/shared/FiscalYearSelector';
import { formatRWFCompact, formatScore, getRiskBgColor, riskBadgeTranslationKey } from '@/lib/utils/formatters';
import { assessmentAPI } from '@/lib/api/assessmentApi';
import type { DashboardSummary, AssessmentHistory } from '@/lib/types/assessment';
import type { SavedStrategicPlanFull, PlanYearActualSummary } from '@/lib/types/planning';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlanVsActualCard } from './PlanVsActualCard';
import { BudgetTrendCard } from './BudgetTrendCard';
import { FSFSITrendChart, ComponentStressTrend, StressHeatmap } from '@/components/rwanda/charts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  BarChart3,
  LineChart,
  Loader2,
} from 'lucide-react';
import type { StressLevel } from '@/lib/utils/formatters';
import { overviewPanelClass } from '@/components/rwanda/overview/panelStyles';

type TrendView = 'fsfsi' | 'components' | 'heatmap';

/** Matches FSFSITrendChart stress band widths on 0–1 scale */
const FSFSI_STRESS_BANDS = [
  { pct: 5, className: 'bg-emerald-500' },
  { pct: 10, className: 'bg-yellow-500' },
  { pct: 15, className: 'bg-orange-500' },
  { pct: 70, className: 'bg-red-600' },
] as const;

const CRITICAL_STRESS_THRESHOLD = 0.3;
const MAX_CRITICAL_NAMES = 3;

function FsfsiStressScaleBar({
  score,
  labelLow,
  labelHigh,
}: {
  score: number;
  labelLow: string;
  labelHigh: string;
}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(score) ? score : 0));
  const leftPct = clamped * 100;
  return (
    <div className="mt-5 max-w-xl space-y-1.5">
      <div className="relative h-3 w-full overflow-hidden rounded-full ring-1 ring-slate-200/80">
        <div className="flex h-full w-full">
          {FSFSI_STRESS_BANDS.map((b) => (
            <div key={b.pct} className={`h-full opacity-90 ${b.className}`} style={{ width: `${b.pct}%` }} />
          ))}
        </div>
        <div
          className="pointer-events-none absolute top-1/2 z-10 h-6 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-slate-950 shadow-md ring-2 ring-white"
          style={{ left: `${leftPct}%` }}
          title={`${clamped.toFixed(4)}`}
        />
      </div>
      <div className="flex justify-between text-xs font-semibold text-slate-500">
        <span>{labelLow}</span>
        <span>{labelHigh}</span>
      </div>
    </div>
  );
}

export function NationalOverview() {
  const { t } = useLanguage();
  const { fiscalYear } = useFiscalYear();

  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [historyData, setHistoryData] = useState<AssessmentHistory[]>([]);
  const [activePlan, setActivePlan] = useState<{ id: string; plan_name: string; baseline_fsfsi: number; final_projected_fsfsi: number | null; target_reduction_pct: number; planning_years: number; total_additional_investment: number | null } | null>(null);
  const [fullPlan, setFullPlan] = useState<SavedStrategicPlanFull | null>(null);
  const [planActuals, setPlanActuals] = useState<PlanYearActualSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendView, setTrendView] = useState<TrendView>('fsfsi');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch dashboard summary, history, and active plan in parallel
        const [dashboard, history] = await Promise.all([
          assessmentAPI.getDashboardSummary(fiscalYear.start_year),
          assessmentAPI.getHistory(),
        ]);
        setDashboardData(dashboard);
        setHistoryData(history);

        // Fetch active strategic plan and actuals (non-blocking)
        try {
          const { planningAPI } = await import('@/lib/api/planningApi');
          const plan = await planningAPI.getActivePlan(fiscalYear.start_year);
          setActivePlan(plan);

          // If we have an active plan, fetch full plan data and actuals
          if (plan?.id) {
            const [fullPlanData, actualsData] = await Promise.all([
              planningAPI.getSavedPlan(plan.id),
              planningAPI.listPlanActuals(plan.id),
            ]);
            setFullPlan(fullPlanData);
            setPlanActuals(actualsData);
          }
        } catch {
          // No plan saved — that's fine
          setActivePlan(null);
          setFullPlan(null);
          setPlanActuals([]);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard:', err);
        setError('Unable to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fiscalYear.start_year]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white/60 px-6 py-16 ring-1 ring-slate-900/[0.03]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--rw-blue)]" />
        <span className="mt-3 text-sm text-slate-600">Loading dashboard...</span>
      </div>
    );
  }

  const isEmpty = dashboardData?.empty === true || (dashboardData?.components?.length === 0 && !dashboardData?.assessment_id);

  if (error || !dashboardData || isEmpty) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="relative min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--rw-blue)]">{fiscalYear.label}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {t('overview.national_fsfi')}
            </h1>
            <div className="mt-3 h-1.5 w-24 rounded-full bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)] shadow-sm shadow-[var(--rw-blue)]/20" />
          </div>
          <FiscalYearSelector />
        </div>
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 px-6 py-14 text-center ring-1 ring-slate-900/[0.04]">
          <AlertTriangle className="mb-4 h-12 w-12 text-amber-500" />
          <h2 className="mb-2 text-lg font-semibold text-slate-900">No Assessment Data</h2>
          <p className="max-w-md text-slate-600">
            {error ||
              'No assessment data available for this fiscal year. Select a different fiscal year or run an assessment to see dashboard data.'}
          </p>
        </div>
      </div>
    );
  }

  const stressLevel = dashboardData.stress_level as StressLevel;
  const yoyChange = dashboardData.yoy_change_percent ?? 0;
  const improving = yoyChange < 0;
  const headlineStressLevel = (dashboardData.cumulative_stress_level || stressLevel) as StressLevel;
  const criticalList = dashboardData.components.filter(
    (c) => (c.cumulative_stress ?? c.stress) > CRITICAL_STRESS_THRESHOLD,
  );
  const criticalComponents = criticalList.length;
  const totalComponents = dashboardData.components.length;
  const namesShown = criticalList.slice(0, MAX_CRITICAL_NAMES).map((c) => c.component_display);
  const namesStr = namesShown.join(', ');
  const moreNames = Math.max(0, criticalComponents - MAX_CRITICAL_NAMES);

  const headlineScoreRaw = dashboardData.cumulative_fsfsi ?? dashboardData.overall_fsfsi;
  const headlineScoreNum = Number(headlineScoreRaw);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--rw-blue)]">{fiscalYear.label}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t('overview.national_fsfi')}
          </h1>
          <div className="mt-3 h-1.5 w-24 rounded-full bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)] shadow-sm shadow-[var(--rw-blue)]/20" />
        </div>
        <FiscalYearSelector />
      </div>

      {/* Headline: national FSFSI (dominant scan layer) */}
      <Card
        className={`${overviewPanelClass} border-2 border-slate-200/90 bg-gradient-to-br from-white via-slate-50/40 to-[var(--rw-blue)]/[0.06] shadow-md ring-1 ring-slate-900/[0.04]`}
      >
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                {t('overview.headline_fsfsi_title')}
              </p>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                {t('overview.fsfsi_scale_hint')}
              </p>
              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                <p className="text-5xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-6xl">
                  {formatScore(headlineScoreRaw)}
                </p>
                <div
                  className={`inline-flex w-fit shrink-0 items-center rounded-full border px-4 py-2 text-sm font-bold ${getRiskBgColor(headlineStressLevel)}`}
                >
                  {t(riskBadgeTranslationKey(dashboardData.cumulative_stress_level || stressLevel))}
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{t('overview.fsfsi_point_in_time')}:</span>{' '}
                <span className="tabular-nums font-semibold text-slate-900">
                  {formatScore(dashboardData.overall_fsfsi)}
                </span>
              </p>
              {(dashboardData.weighting_method || dashboardData.scenario) && (
                <p className="mt-2 text-sm leading-snug text-slate-500">
                  Latest run:{' '}
                  <span className="font-medium text-slate-700">{dashboardData.weighting_method ?? '—'}</span>
                  {dashboardData.scenario ? (
                    <>
                      {' '}
                      · <span className="font-medium text-slate-700">{dashboardData.scenario}</span>
                    </>
                  ) : null}
                </p>
              )}
              <FsfsiStressScaleBar
                score={headlineScoreNum}
                labelLow={t('overview.scale_0')}
                labelHigh={t('overview.scale_1')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supporting KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className={`${overviewPanelClass} border-l-4 ${improving ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  {t('overview.yoy_change')}
                </p>
                <p className={`mt-2 text-4xl font-bold tabular-nums sm:text-5xl ${improving ? 'text-emerald-600' : 'text-red-600'}`}>
                  {improving ? '' : '+'}
                  {yoyChange.toFixed(1)}%
                </p>
              </div>
              {improving ? (
                <TrendingDown className="h-10 w-10 shrink-0 text-emerald-500" />
              ) : (
                <TrendingUp className="h-10 w-10 shrink-0 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={`${overviewPanelClass} border-l-4 border-l-[var(--risk-critical)]`}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  {t('overview.critical_components')}
                </p>
                <p className="mt-2 text-4xl font-bold tabular-nums text-slate-900 sm:text-5xl">{criticalComponents}</p>
                <p className="mt-2 text-sm leading-snug text-slate-600">
                  {t('overview.critical_components_of', { critical: criticalComponents, total: totalComponents })}
                </p>
                {criticalComponents > 0 && namesStr ? (
                  <p className="mt-2 text-sm text-slate-500">
                    {t('overview.critical_components_includes', { names: namesStr })}
                    {moreNames > 0 ? (
                      <span className="text-slate-400"> · {t('overview.critical_components_more', { count: moreNames })}</span>
                    ) : null}
                  </p>
                ) : null}
                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80">
                  <div
                    className="h-full rounded-full bg-[var(--risk-critical)] transition-[width] duration-500"
                    style={{
                      width: totalComponents > 0 ? `${(criticalComponents / totalComponents) * 100}%` : '0%',
                    }}
                  />
                </div>
              </div>
              <AlertTriangle className="h-10 w-10 shrink-0 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={`${overviewPanelClass} border-l-4 border-l-[var(--rw-green)] sm:col-span-2 lg:col-span-1`}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  {t('overview.total_budget')}
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 sm:text-4xl">
                  {formatRWFCompact(dashboardData.total_budget_lcu_bn * 1_000_000_000)}
                </p>
              </div>
              <DollarSign className="h-10 w-10 shrink-0 text-[var(--rw-green)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical Trend Analysis */}
      {historyData.length > 1 && (
        <Card className={`${overviewPanelClass} overflow-hidden`}>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center space-x-2 text-slate-900">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--rw-blue)]/10 text-[var(--rw-blue)] ring-1 ring-[var(--rw-blue)]/15">
                  <LineChart className="h-5 w-5" />
                </span>
                <span>{t('overview.historical_trend_title')}</span>
              </CardTitle>
              <div className="inline-flex rounded-xl border border-slate-200/90 bg-slate-50/80 p-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setTrendView('fsfsi')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    trendView === 'fsfsi'
                      ? 'bg-[var(--rw-blue)] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white/80'
                  }`}
                >
                  {t('overview.trend_tab_fsfsi')}
                </button>
                <button
                  type="button"
                  onClick={() => setTrendView('components')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    trendView === 'components'
                      ? 'bg-[var(--rw-blue)] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white/80'
                  }`}
                >
                  {t('overview.trend_tab_components')}
                </button>
                <button
                  type="button"
                  onClick={() => setTrendView('heatmap')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    trendView === 'heatmap'
                      ? 'bg-[var(--rw-blue)] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white/80'
                  }`}
                >
                  {t('overview.trend_tab_heatmap')}
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {trendView === 'fsfsi' && t('overview.trend_subtitle_fsfsi')}
              {trendView === 'components' && t('overview.trend_subtitle_components')}
              {trendView === 'heatmap' && t('overview.trend_subtitle_heatmap')}
            </p>
          </CardHeader>
          <CardContent>
            {trendView === 'fsfsi' && <FSFSITrendChart data={historyData} />}
            {trendView === 'components' && <ComponentStressTrend data={historyData} />}
            {trendView === 'heatmap' && <StressHeatmap data={historyData} />}
          </CardContent>
        </Card>
      )}

      {/* Budget Trend - National mapped total */}
      <BudgetTrendCard />

      {/* Strategic Plan Excerpt */}
      {activePlan && (
        <Card className="rounded-2xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50/90 via-white/80 to-teal-50/40 shadow-sm ring-1 ring-emerald-900/[0.06] transition-shadow duration-200 hover:shadow-md supports-[backdrop-filter]:backdrop-blur-[2px]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <BarChart3 className="h-6 w-6 text-[var(--rw-green)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {activePlan.plan_name || `Strategic Plan FY${fiscalYear.start_year}`}
                  </p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <div className="text-xs text-gray-600">
                      <span className="font-medium text-red-600">{Number(activePlan.baseline_fsfsi).toFixed(2)}</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium text-green-600">{activePlan.final_projected_fsfsi != null ? Number(activePlan.final_projected_fsfsi).toFixed(2) : '?'}</span>
                    </div>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-600">{activePlan.planning_years} years</span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs font-medium text-green-700">-{Number(activePlan.target_reduction_pct).toFixed(0)}% target</span>
                    {activePlan.total_additional_investment != null && (
                      <>
                        <span className="text-xs text-gray-400">|</span>
                        <span className="text-xs text-gray-600">{formatRWFCompact(Number(activePlan.total_additional_investment))}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <a
                href="/dashboard/planning"
                className="text-xs text-[var(--rw-blue)] hover:underline whitespace-nowrap"
              >
                View full plan →
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan vs Actual Tracking */}
      {fullPlan && (
        <PlanVsActualCard plan={fullPlan} actuals={planActuals} />
      )}
    </div>
  );
}
