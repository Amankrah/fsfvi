'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { YearlyPlanOutput } from '@/lib/types/planning';
import { formatRWFCompact } from '@/lib/utils/formatters';

interface PlanningBudgetChartProps {
  yearlyPlans: YearlyPlanOutput[];
  baselineBudget: number;
  height?: number;
}

export function PlanningBudgetChart({
  yearlyPlans,
  baselineBudget,
  height = 280,
}: PlanningBudgetChartProps) {
  const chartData = useMemo(() => {
    const points: { year: string; budget: number; label: string }[] = [
      { year: 'Baseline', budget: baselineBudget, label: formatRWFCompact(baselineBudget) },
    ];
    yearlyPlans.forEach((p) => {
      points.push({
        year: `Y${p.year}`,
        budget: p.total_budget,
        label: formatRWFCompact(p.total_budget),
      });
    });
    return points;
  }, [yearlyPlans, baselineBudget]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { year: string; budget: number; label: string } }>;
  }) => {
    if (!active || !payload?.length) return null;
    const { year, label } = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900">{year}</p>
        <p className="text-sm text-[var(--rw-blue)] font-mono">{label}</p>
        <p className="text-xs text-gray-500">Total budget (USD)</p>
      </div>
    );
  };

  if (!chartData.length) return null;

  const maxBudget = Math.max(...chartData.map((d) => d.budget));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} tickLine={{ stroke: '#e5e7eb' }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => formatRWFCompact(v)}
          domain={[0, maxBudget * 1.05]}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="budget"
          fill="var(--rw-blue)"
          radius={[4, 4, 0, 0]}
          name="Total budget"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
