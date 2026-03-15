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
  ReferenceLine,
  Legend,
} from 'recharts';
import type { YearlyPlanOutput } from '@/lib/types/planning';
import { formatScore } from '@/lib/utils/formatters';

interface PlanningTrajectoryChartProps {
  yearlyPlans: YearlyPlanOutput[];
  baselineFsfvi: number;
  targetFsfvi: number;
  height?: number;
}

interface ChartPoint {
  year: string;
  projected: number;
  target: number;
  onTrack: boolean;
}

export function PlanningTrajectoryChart({
  yearlyPlans,
  baselineFsfvi,
  targetFsfvi,
  height = 320,
}: PlanningTrajectoryChartProps) {
  const chartData = useMemo(() => {
    const points: ChartPoint[] = [
      { year: 'Baseline', projected: baselineFsfvi, target: baselineFsfvi, onTrack: true },
    ];
    yearlyPlans.forEach((p) => {
      points.push({
        year: `Year ${p.year}`,
        projected: p.projected_fsfvi,
        target: p.target_fsfvi,
        onTrack: p.on_track,
      });
    });
    return points;
  }, [yearlyPlans, baselineFsfvi, targetFsfvi]);

  const CustomTooltip = (props: { active?: boolean; payload?: { payload: ChartPoint }[]; label?: string }) => {
    const { active, payload, label } = props;
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[160px]">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-sm text-[var(--rw-blue)]">
          Projected: <span className="font-mono font-bold">{formatScore(p.projected)}</span>
        </p>
        <p className="text-sm text-gray-600">Target: <span className="font-mono">{formatScore(p.target)}</span></p>
        <p className={`text-xs mt-1 font-medium ${p.onTrack ? 'text-green-600' : 'text-amber-600'}`}>
          {p.onTrack ? 'On track' : 'Off track'}
        </p>
      </div>
    );
  };

  if (!chartData.length) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} tickLine={{ stroke: '#e5e7eb' }} />
        <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} tickFormatter={(v) => v.toFixed(2)} tickLine={{ stroke: '#e5e7eb' }} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={targetFsfvi}
          stroke="var(--rw-green)"
          strokeDasharray="5 5"
          label={{ value: 'Target', position: 'right', fontSize: 10, fill: 'var(--rw-green)' }}
        />
        <Line type="monotone" dataKey="projected" name="Projected FSFSI" stroke="var(--rw-blue)" strokeWidth={3} dot={{ r: 5, fill: 'var(--rw-blue)', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
        <Line type="monotone" dataKey="target" name="Year target" stroke="var(--rw-green)" strokeDasharray="4 4" strokeWidth={2} dot={{ r: 4 }} />
        <Legend />
      </LineChart>
    </ResponsiveContainer>
  );
}
