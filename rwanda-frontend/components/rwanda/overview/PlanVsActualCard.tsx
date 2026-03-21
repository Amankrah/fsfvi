'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatRWFCompact, formatScore } from '@/lib/utils/formatters';
import type { SavedStrategicPlanFull, PlanYearActualSummary } from '@/lib/types/planning';
import {
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
} from 'lucide-react';

interface PlanVsActualCardProps {
  plan: SavedStrategicPlanFull;
  actuals: PlanYearActualSummary[];
}

type TrackingStatus = 'on_track' | 'behind' | 'ahead' | 'no_data';

interface YearComparison {
  planYear: number;
  fiscalYear: number;
  plannedBudget: number;
  actualBudget: number | null;
  plannedFsfsi: number;
  actualFsfsi: number | null;
  delta: number | null;
  status: TrackingStatus;
}

export function PlanVsActualCard({ plan, actuals }: PlanVsActualCardProps) {
  const { t } = useLanguage();

  const comparisons: YearComparison[] = useMemo(() => {
    const planJson = plan.plan_json;
    if (!planJson?.yearly_plans) return [];

    return planJson.yearly_plans.map((yearPlan, idx) => {
      const planYear = idx + 1;
      const fiscalYear = yearPlan.fiscal_year ?? (plan.fiscal_year + planYear);
      const actual = actuals.find((a) => a.plan_year === planYear);

      let status: TrackingStatus = 'no_data';
      if (actual?.simulated_cumulative_fsfsi != null) {
        const delta = actual.delta_vs_plan_fsfsi ?? 0;
        if (Math.abs(delta) < 0.005) {
          status = 'on_track';
        } else if (delta > 0) {
          status = 'behind'; // Higher FSFSI = worse = behind plan
        } else {
          status = 'ahead'; // Lower FSFSI = better = ahead of plan
        }
      }

      return {
        planYear,
        fiscalYear,
        plannedBudget: yearPlan.total_budget,
        actualBudget: actual?.total_budget_bn ?? null,
        plannedFsfsi: yearPlan.projected_fsfvi,
        actualFsfsi: actual?.simulated_cumulative_fsfsi ?? null,
        delta: actual?.delta_vs_plan_fsfsi ?? null,
        status,
      };
    });
  }, [plan, actuals]);

  // Summary stats
  const yearsWithActuals = comparisons.filter((c) => c.actualFsfsi != null).length;
  const latestActual = comparisons.filter((c) => c.actualFsfsi != null).pop();
  const overallStatus = latestActual?.status ?? 'no_data';

  // Budget variance - only compare years that have actuals recorded
  // Note: plannedBudget is in raw LCU, actualBudget is in billions
  const yearsWithActualsData = comparisons.filter((c) => c.actualBudget != null);
  const totalPlannedBudget = yearsWithActualsData.reduce((sum, c) => sum + c.plannedBudget, 0);
  const totalActualBudget = yearsWithActualsData.reduce((sum, c) => sum + (c.actualBudget ?? 0) * 1e9, 0); // Convert bn to raw LCU

  const statusConfig = {
    on_track: {
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      label: t('overview.plan_actual_on_track') || 'On Track',
    },
    behind: {
      icon: TrendingUp,
      color: 'text-red-600',
      bg: 'bg-red-50',
      label: t('overview.plan_actual_behind') || 'Behind Plan',
    },
    ahead: {
      icon: TrendingDown,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      label: t('overview.plan_actual_ahead') || 'Ahead of Plan',
    },
    no_data: {
      icon: Calendar,
      color: 'text-gray-500',
      bg: 'bg-gray-50',
      label: t('overview.plan_actual_no_data') || 'No Actuals Yet',
    },
  };

  const currentStatus = statusConfig[overallStatus];
  const StatusIcon = currentStatus.icon;

  return (
    <Card className="border-[var(--rw-blue)]/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-base">
            <Target className="h-5 w-5 text-[var(--rw-blue)]" />
            <span>{t('overview.plan_vs_actual') || 'Plan vs Actual Tracking'}</span>
          </CardTitle>
          <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full ${currentStatus.bg}`}>
            <StatusIcon className={`h-4 w-4 ${currentStatus.color}`} />
            <span className={`text-xs font-medium ${currentStatus.color}`}>
              {currentStatus.label}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Summary Row */}
        <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-500">{t('overview.years_tracked') || 'Years Tracked'}</p>
            <p className="text-lg font-semibold text-gray-900">
              {yearsWithActuals} / {comparisons.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('overview.budget_allocated') || 'Budget Allocated'}</p>
            <p className="text-lg font-semibold text-gray-900">
              {totalActualBudget > 0 ? formatRWFCompact(totalActualBudget) : '—'}
            </p>
            {totalActualBudget > 0 && totalPlannedBudget > 0 && (
              <p className="text-[10px] text-gray-400">
                vs {formatRWFCompact(totalPlannedBudget)} planned
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('overview.latest_delta') || 'Latest Delta'}</p>
            {latestActual?.delta != null ? (
              <p className={`text-lg font-semibold ${latestActual.delta > 0 ? 'text-red-600' : latestActual.delta < 0 ? 'text-emerald-600' : 'text-gray-600'}`}>
                {latestActual.delta > 0 ? '+' : ''}{(latestActual.delta * 100).toFixed(2)}%
              </p>
            ) : (
              <p className="text-lg font-semibold text-gray-400">—</p>
            )}
          </div>
        </div>

        {/* Year-by-year comparison */}
        <div className="space-y-2">
          {comparisons.map((c) => {
            const yearStatus = statusConfig[c.status];
            const YearIcon = yearStatus.icon;

            return (
              <div
                key={c.planYear}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-50/80 hover:bg-gray-100/80 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${yearStatus.bg}`}>
                    <YearIcon className={`h-3.5 w-3.5 ${yearStatus.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Year {c.planYear} <span className="text-gray-400 font-normal">· FY{c.fiscalYear}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-right">
                  {/* Budget comparison */}
                  <div className="min-w-[100px]">
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="text-sm font-medium text-gray-700">
                      {c.actualBudget != null ? (
                        <>
                          {formatRWFCompact(c.actualBudget * 1e9)}
                          <span className="text-gray-400 text-xs ml-1">
                            / {formatRWFCompact(c.plannedBudget)}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400">{formatRWFCompact(c.plannedBudget)} (planned)</span>
                      )}
                    </p>
                  </div>

                  {/* FSFSI comparison */}
                  <div className="min-w-[90px]">
                    <p className="text-xs text-gray-500">FSFSI</p>
                    <p className="text-sm font-medium">
                      {c.actualFsfsi != null ? (
                        <span className={c.delta != null && c.delta > 0 ? 'text-red-600' : c.delta != null && c.delta < 0 ? 'text-emerald-600' : 'text-gray-700'}>
                          {formatScore(c.actualFsfsi)}
                          <span className="text-gray-400 text-xs ml-1">
                            / {formatScore(c.plannedFsfsi)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400">{formatScore(c.plannedFsfsi)} (target)</span>
                      )}
                    </p>
                  </div>

                  {/* Delta badge */}
                  <div className="min-w-[60px]">
                    {c.delta != null ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        Math.abs(c.delta) < 0.005
                          ? 'bg-emerald-100 text-emerald-700'
                          : c.delta > 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {c.delta > 0 ? '+' : ''}{(c.delta * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                        —
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hint to record actuals */}
        {yearsWithActuals === 0 && (
          <div className="mt-4 flex items-start space-x-2 text-xs text-gray-500 bg-amber-50 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p>
              {t('overview.plan_actual_hint') ||
                'No actuals recorded yet. Use the Budget Alignment tool in Planning to record actual allocations and track progress against your strategic plan.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
