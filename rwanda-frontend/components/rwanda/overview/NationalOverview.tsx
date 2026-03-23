'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { FiscalYearSelector } from '@/components/rwanda/shared/FiscalYearSelector';
import { formatRWFCompact, formatScore, getRiskBgColor } from '@/lib/utils/formatters';
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

type TrendView = 'fsfsi' | 'components' | 'heatmap';

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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--rw-blue)]" />
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  const isEmpty = dashboardData?.empty === true || (dashboardData?.components?.length === 0 && !dashboardData?.assessment_id);

  if (error || !dashboardData || isEmpty) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('overview.national_fsfi')}</h1>
            <p className="text-sm text-gray-600 mt-1">{fiscalYear.label}</p>
          </div>
          <FiscalYearSelector />
        </div>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Assessment Data</h2>
          <p className="text-gray-600 max-w-md">
            {error || 'No assessment data available for this fiscal year. Select a different fiscal year or run an assessment to see dashboard data.'}
          </p>
        </div>
      </div>
    );
  }

  const stressLevel = dashboardData.stress_level as StressLevel;
  const yoyChange = dashboardData.yoy_change_percent ?? 0;
  const improving = yoyChange < 0;
  // Count critical components based on cumulative stress (> 0.30 threshold)
  const criticalComponents = dashboardData.components.filter(
    (c) => (c.cumulative_stress ?? c.stress) > 0.30
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('overview.national_fsfi')}</h1>
          <p className="text-sm text-gray-600 mt-1">{fiscalYear.label}</p>
        </div>
        <FiscalYearSelector />
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* FSFSI Score — Cumulative is the headline */}
        <Card className="border-l-4 border-l-[var(--rw-blue)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">FSFSI Score</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatScore(dashboardData.cumulative_fsfsi ?? dashboardData.overall_fsfsi)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  This year: {formatScore(dashboardData.overall_fsfsi)}
                </p>
                {(dashboardData.weighting_method || dashboardData.scenario) && (
                  <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">
                    Latest run:{' '}
                    <span className="font-medium text-gray-700">
                      {dashboardData.weighting_method ?? '—'}
                    </span>
                    {dashboardData.scenario ? (
                      <>
                        {' '}
                        · <span className="font-medium text-gray-700">{dashboardData.scenario}</span>
                      </>
                    ) : null}
                  </p>
                )}
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${getRiskBgColor(
                (dashboardData.cumulative_stress_level || stressLevel) as StressLevel
              )}`}>
                {(dashboardData.cumulative_stress_level || stressLevel).charAt(0).toUpperCase() +
                 (dashboardData.cumulative_stress_level || stressLevel).slice(1)} Risk
              </div>
            </div>
          </CardContent>
        </Card>

        {/* YoY Change */}
        <Card className={`border-l-4 ${improving ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('overview.yoy_change')}</p>
                <p className={`text-3xl font-bold mt-1 ${improving ? 'text-emerald-600' : 'text-red-600'}`}>
                  {improving ? '' : '+'}{yoyChange.toFixed(1)}%
                </p>
              </div>
              {improving ? (
                <TrendingDown className="h-8 w-8 text-emerald-500" />
              ) : (
                <TrendingUp className="h-8 w-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Critical Components */}
        <Card className="border-l-4 border-l-[var(--risk-critical)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('overview.critical_components')}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{criticalComponents}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        {/* Total Budget */}
        <Card className="border-l-4 border-l-[var(--rw-green)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('overview.total_budget')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatRWFCompact(dashboardData.total_budget_lcu_bn * 1_000_000_000)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-[var(--rw-green)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical Trend Analysis */}
      {historyData.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center space-x-2">
                <LineChart className="h-5 w-5 text-[var(--rw-blue)]" />
                <span>Historical Trend Analysis</span>
              </CardTitle>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTrendView('fsfsi')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    trendView === 'fsfsi'
                      ? 'bg-[var(--rw-blue)] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  FSFSI Trend
                </button>
                <button
                  type="button"
                  onClick={() => setTrendView('components')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
                    trendView === 'components'
                      ? 'bg-[var(--rw-blue)] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Components
                </button>
                <button
                  type="button"
                  onClick={() => setTrendView('heatmap')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
                    trendView === 'heatmap'
                      ? 'bg-[var(--rw-blue)] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Heatmap
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {trendView === 'fsfsi' && 'Overall food system stress index across fiscal years'}
              {trendView === 'components' && 'Component-level stress trends over time'}
              {trendView === 'heatmap' && 'Visual overview of stress levels by component and year'}
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
        <Card className="border-[var(--rw-green)]/30 bg-gradient-to-r from-green-50 to-emerald-50/50">
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
