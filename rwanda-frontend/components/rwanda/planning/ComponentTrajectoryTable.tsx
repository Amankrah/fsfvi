'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COMPONENT_DISPLAY_NAMES, type IndicatorComponent } from '@/lib/types/assessment';
import type { YearlyPlanOutput } from '@/lib/types/planning';
import { formatPlanPeriodLabel } from '@/lib/utils/planningLabels';
import { TrendingDown, TrendingUp, Minus, BarChart3 } from 'lucide-react';

interface Props {
  yearlyPlans: YearlyPlanOutput[];
  baselineComponents: Record<string, number>;  // component -> baseline cumulative stress
}

function getStressColor(stress: number): string {
  if (stress > 0.30) return 'text-red-600';
  if (stress > 0.15) return 'text-orange-500';
  if (stress > 0.05) return 'text-yellow-600';
  return 'text-green-600';
}

function getStressBg(stress: number): string {
  if (stress > 0.30) return 'bg-red-50';
  if (stress > 0.15) return 'bg-orange-50';
  if (stress > 0.05) return 'bg-yellow-50';
  return 'bg-green-50';
}

export function ComponentTrajectoryTable({ yearlyPlans, baselineComponents }: Props) {
  const { t } = useLanguage();
  const components = useMemo(() => {
    if (!yearlyPlans.length) return [];

    const firstYear = yearlyPlans[0];
    const lastYear = yearlyPlans[yearlyPlans.length - 1];

    const projections = firstYear.component_projections;
    if (!projections) return [];

    return Object.keys(projections).sort().map((comp) => {
      const baseline = Number(baselineComponents[comp]) || 0;
      const final = Number(lastYear.component_projections?.[comp]?.cumulative_stress) || baseline;
      const change = final - baseline;
      const changePct = baseline > 0 ? (change / baseline) * 100 : 0;
      const display = projections[comp]?.display ||
        COMPONENT_DISPLAY_NAMES[comp as IndicatorComponent] || comp;

      const trajectory = yearlyPlans.map((yp) => {
        return Number(yp.component_projections?.[comp]?.cumulative_stress) || baseline;
      });

      return { comp, display, baseline, final, change, changePct, trajectory };
    }).sort((a, b) => a.change - b.change);
  }, [yearlyPlans, baselineComponents]);

  if (!components.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[var(--rw-blue)]" />
          {t('planning.component_table_title')}
        </CardTitle>
        <p className="text-sm text-gray-500 font-normal">{t('planning.component_table_subtitle')}</p>
        <p className="text-xs text-gray-500 mt-1">{t('planning.component_table_sort_hint')}</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('planning.component_col_component')}
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  {t('planning.component_col_baseline')}
                </th>
                {yearlyPlans.map((yp) => (
                  <th key={yp.year} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    {formatPlanPeriodLabel(yp)}
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  {t('planning.component_col_change')}
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  {t('planning.component_col_trend')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {components.map(({ comp, display, baseline, final: finalVal, change, changePct, trajectory }) => (
                <tr key={comp} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-medium text-gray-900">{display}</td>
                  <td className={`px-3 py-2.5 text-center font-mono text-xs ${getStressColor(baseline)}`}>
                    {baseline.toFixed(3)}
                  </td>
                  {trajectory.map((val, i) => (
                    <td key={i} className={`px-3 py-2.5 text-center font-mono text-xs ${getStressBg(val)}`}>
                      <span className={getStressColor(val)}>{val.toFixed(3)}</span>
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs font-semibold ${change < -0.01 ? 'text-green-600' : change > 0.01 ? 'text-red-600' : 'text-gray-500'}`}>
                      {change > 0 ? '+' : ''}{changePct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {change < -0.01 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <TrendingDown className="h-3 w-3" /> {t('planning.component_trend_recovering')}
                      </span>
                    ) : change > 0.01 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <TrendingUp className="h-3 w-3" /> {t('planning.component_trend_worsening')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <Minus className="h-3 w-3" /> {t('planning.component_trend_stable')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Policy insight */}
        {(() => {
          const worsening = components.filter(c => c.change > 0.01);
          const recovering = components.filter(c => c.change < -0.01);
          if (!worsening.length) return null;
          return (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <p className="font-semibold mb-1">{t('planning.component_policy_alert_title')}</p>
              <p>
                {t('planning.component_policy_alert_lead', {
                  names: worsening.map((c) => c.display).join(', '),
                })}{' '}
                {recovering.length > 0
                  ? t('planning.component_policy_alert_recovering_suffix', {
                      names: recovering.map((c) => c.display).join(', '),
                    })
                  : ''}{' '}
                {t('planning.component_policy_alert_close')}
              </p>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
