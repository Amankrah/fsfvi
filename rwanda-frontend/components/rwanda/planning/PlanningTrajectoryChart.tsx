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
import { formatPlanPeriodLabel } from '@/lib/utils/planningLabels';
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
        year: formatPlanPeriodLabel(p),
        projected: p.projected_fsfvi,
        target: p.target_fsfvi,
        onTrack: p.on_track,
      });
    });
    return points;
  }, [yearlyPlans, baselineFsfvi, targetFsfvi]);

  const yDomain = useMemo((): [number, number] => {
    const vals = chartData.flatMap((p) => [p.projected, p.target]);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const span = Math.max(hi - lo, 0.02);
    const pad = Math.max(span * 0.12, 0.015);
    return [Math.max(0, lo - pad), Math.min(1, hi + pad)];
  }, [chartData]);

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
        <p className="text-sm text-gray-600">
                    Year target: <span className="font-mono">{formatScore(p.target)}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">
                    Gap (projected − target): <span className="font-mono font-medium">{(p.projected - p.target).toFixed(4)}</span>
        </p>
        <p className={`text-xs mt-1 font-medium ${p.onTrack ? 'text-green-600' : 'text-amber-600'}`}>
          {p.onTrack ? 'On track' : 'Off track'}
        </p>
      </div>
    );
  };

  if (!chartData.length) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 10, right: 40, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} tickLine={{ stroke: '#e5e7eb' }} />
        <YAxis
          domain={yDomain}
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => v.toFixed(2)}
          tickLine={{ stroke: '#e5e7eb' }}
          allowDataOverflow={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={targetFsfvi}
          stroke="#94a3b8"
          strokeDasharray="4 4"
          strokeWidth={1}
          label={{
            value: `Horizon goal: ${targetFsfvi.toFixed(2)}`,
            position: 'insideBottomRight',
            fontSize: 10,
            fill: '#64748b',
            fontWeight: 600,
          }}
        />
        <Line
          type="monotone"
          dataKey="projected"
          name="Projected FSFSI (engine)"
          stroke="#0369a1"
          strokeWidth={3.5}
          dot={{ r: 5, fill: '#0369a1', strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 7 }}
        />
        <Line
          type="monotone"
          dataKey="target"
          name="Year milestone target"
          stroke="#15803d"
          strokeDasharray="10 5"
          strokeWidth={2.2}
          dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: '#15803d' }}
        />
        <Legend wrapperStyle={{ paddingTop: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
