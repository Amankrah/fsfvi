'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { MultiYearStrategicPlan } from '@/lib/types/planning';
import { formatScore } from '@/lib/utils/formatters';
import { formatPlanPeriodLabel } from '@/lib/utils/planningLabels';

export interface PlanCompareSeries {
  id: string;
  label: string;
  plan: MultiYearStrategicPlan;
}

const STROKES = ['#1d4ed8', '#059669', '#d97706'];

function dataKeyFor(id: string) {
  return `proj_${id}`;
}

export function PlanTrajectoryCompareChart({
  series,
  height = 340,
}: {
  series: PlanCompareSeries[];
  height?: number;
}) {
  const chartData = useMemo(() => {
    if (series.length === 0) return [];
    const maxYears = Math.max(
      0,
      ...series.map((s) => s.plan.yearly_plans?.length ?? 0)
    );
    const rows: Record<string, string | number>[] = [];
    const base: Record<string, string | number> = { period: 'Baseline' };
    series.forEach((s) => {
      base[dataKeyFor(s.id)] = Number(s.plan.baseline_fsfvi);
    });
    rows.push(base);
    for (let yi = 0; yi < maxYears; yi++) {
      const refYp = series[0]?.plan.yearly_plans?.[yi];
      const period =
        refYp != null ? formatPlanPeriodLabel(refYp) : `Year ${yi + 1}`;
      const row: Record<string, string | number> = { period };
      series.forEach((s) => {
        const yp = s.plan.yearly_plans?.[yi];
        row[dataKeyFor(s.id)] = yp != null ? Number(yp.projected_fsfvi) : NaN;
      });
      rows.push(row);
    }
    return rows;
  }, [series]);

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} tickLine={{ stroke: '#e5e7eb' }} />
        <YAxis
          domain={[0, 1]}
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => v.toFixed(2)}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
                <p className="font-semibold text-gray-900 mb-2">{label}</p>
                <ul className="space-y-1">
                  {payload.map((entry) => (
                    <li key={String(entry.dataKey)} className="text-sm flex justify-between gap-4">
                      <span style={{ color: entry.color }}>{entry.name}</span>
                      <span className="font-mono font-medium">
                        {formatScore(Number(entry.value))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }}
        />
        <Legend />
        {series.map((s, i) => (
          <Line
            key={s.id}
            type="monotone"
            dataKey={dataKeyFor(s.id)}
            name={s.label}
            stroke={STROKES[i % STROKES.length]}
            strokeWidth={2.5}
            dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
