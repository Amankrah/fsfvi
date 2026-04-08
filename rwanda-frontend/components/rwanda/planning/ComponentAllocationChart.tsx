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
  Legend,
  LabelList,
} from 'recharts';
import type { YearlyPlanOutput } from '@/lib/types/planning';
import { formatPlanPeriodLabel } from '@/lib/utils/planningLabels';
import { COMPONENT_DISPLAY_NAMES } from '@/lib/types/assessment';
import type { IndicatorComponent } from '@/lib/types/assessment';

/** Tol-inspired palette: maximally distinct at a glance (incl. color vision). */
const COMPONENT_COLORS: Record<string, string> = {
  markets: '#0077BB',
  crop_production: '#009E73',
  nutrition: '#E69F00',
  research: '#CC79A7',
  post_harvest: '#D55E00',
  environment: '#56B4E9',
  animal_systems: '#F0E442',
  finance: '#882255',
};

function getComponentColor(key: string): string {
  return COMPONENT_COLORS[key] ?? '#94a3b8';
}

interface ComponentAllocationChartProps {
  yearlyPlans: YearlyPlanOutput[];
  height?: number;
}

export function ComponentAllocationChart({
  yearlyPlans,
  height = 340,
}: ComponentAllocationChartProps) {
  const { chartData, componentKeys } = useMemo(() => {
    const keys = new Set<string>();
    yearlyPlans.forEach((p) => Object.keys(p.recommended_allocations || {}).forEach((k) => keys.add(k)));
    const sortedKeys = Array.from(keys).sort();
    const data = yearlyPlans.map((p) => {
      const allocs = p.recommended_allocations || {};
      const total = sortedKeys.reduce((s, k) => s + (allocs[k] ?? 0), 0) || 1;
      const row: Record<string, number | string> = { year: formatPlanPeriodLabel(p) };
      sortedKeys.forEach((k) => {
        row[k] = total > 0 ? (allocs[k] ?? 0) / total : 0;
      });
      return row;
    });
    return { chartData: data, componentKeys: sortedKeys };
  }, [yearlyPlans]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; dataKey: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload
          .filter((p) => p.value > 0)
          .sort((a, b) => (b.value as number) - (a.value as number))
          .map((p) => (
            <div key={p.dataKey} className="flex justify-between gap-4 text-sm">
              <span style={{ color: getComponentColor(p.dataKey) }}>
                {COMPONENT_DISPLAY_NAMES[p.dataKey as IndicatorComponent] ?? p.dataKey}
              </span>
              <span className="font-mono">{(Number(p.value) * 100).toFixed(1)}%</span>
            </div>
          ))}
      </div>
    );
  };

  if (!chartData.length || !componentKeys.length) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }} stackOffset="expand">
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} tickLine={{ stroke: '#e5e7eb' }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          domain={[0, 1]}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => COMPONENT_DISPLAY_NAMES[value as IndicatorComponent] ?? value}
          wrapperStyle={{ fontSize: 11 }}
        />
        {componentKeys.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="alloc"
            fill={getComponentColor(key)}
            stroke="#0f172a"
            strokeWidth={0.35}
            radius={key === componentKeys[componentKeys.length - 1] ? [0, 4, 4, 0] : 0}
          >
            <LabelList
              dataKey={key}
              position="center"
              fill="#0f172a"
              fontSize={10}
              fontWeight={600}
              formatter={(v) => {
                const n = Number(v);
                if (!Number.isFinite(n) || n < 0.1) return '';
                return `${Math.round(n * 100)}%`;
              }}
            />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
