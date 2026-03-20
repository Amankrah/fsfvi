'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COMPONENT_DISPLAY_NAMES, type IndicatorComponent } from '@/lib/types/assessment';
import type { YearlyPlanOutput } from '@/lib/types/planning';
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
    }).sort((a, b) => a.change - b.change);  // best improvement first
  }, [yearlyPlans, baselineComponents]);

  if (!components.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[var(--rw-blue)]" />
          Component Recovery Trajectory
        </CardTitle>
        <p className="text-sm text-gray-500 font-normal">
          Projected cumulative stress per component across the planning horizon.
          Improvement depends on each sector&apos;s recovery speed and budget allocation.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Baseline</th>
                {yearlyPlans.map((yp) => (
                  <th key={yp.year} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Year {yp.year}
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Change</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Trend</th>
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
                        <TrendingDown className="h-3 w-3" /> Recovering
                      </span>
                    ) : change > 0.01 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <TrendingUp className="h-3 w-3" /> Worsening
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <Minus className="h-3 w-3" /> Stable
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
              <p className="font-semibold mb-1">Policy attention needed:</p>
              <p>
                {worsening.map(c => c.display).join(', ')} {worsening.length === 1 ? 'is' : 'are'} projected to <strong>worsen</strong> despite
                budget growth. {' '}
                {recovering.length > 0
                  ? `Meanwhile, ${recovering.map(c => c.display).join(', ')} ${recovering.length === 1 ? 'is' : 'are'} recovering. `
                  : ''
                }
                Consider reallocating budget from stable components to those still worsening.
              </p>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
