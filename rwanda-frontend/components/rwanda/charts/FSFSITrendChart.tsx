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
  Area,
  ComposedChart,
} from 'recharts';
import type { AssessmentHistory } from '@/lib/types/assessment';

interface FSFSITrendChartProps {
  data: AssessmentHistory[];
  height?: number;
}

const STRESS_THRESHOLDS = {
  low: 0.25,
  medium: 0.50,
  high: 0.75,
};

const STRESS_COLORS = {
  low: '#22c55e',      // green-500
  medium: '#eab308',   // yellow-500
  high: '#f97316',     // orange-500
  critical: '#ef4444', // red-500
};

export function FSFSITrendChart({ data, height = 300 }: FSFSITrendChartProps) {
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => a.fiscal_year - b.fiscal_year)
      .map((item) => ({
        year: `FY${item.fiscal_year}`,
        fiscalYear: item.fiscal_year,
        fsfsi: item.fsfsi_score,
        stressLevel: item.stress_level,
        yoyChange: item.yoy_change_percent ?? 0,
      }));
  }, [data]);

  const getStressColor = (score: number) => {
    if (score >= STRESS_THRESHOLDS.high) return STRESS_COLORS.critical;
    if (score >= STRESS_THRESHOLDS.medium) return STRESS_COLORS.high;
    if (score >= STRESS_THRESHOLDS.low) return STRESS_COLORS.medium;
    return STRESS_COLORS.low;
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: { stressLevel: string; yoyChange: number } }>; label?: string }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0];
    const stressLevel = data.payload.stressLevel;
    const yoyChange = data.payload.yoyChange;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-sm">
          FSFSI: <span className="font-bold" style={{ color: getStressColor(data.value) }}>
            {data.value.toFixed(4)}
          </span>
        </p>
        <p className="text-sm text-gray-600">
          Stress: <span className="capitalize">{stressLevel}</span>
        </p>
        {yoyChange !== 0 && (
          <p className={`text-sm ${yoyChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
            YoY: {yoyChange > 0 ? '+' : ''}{yoyChange.toFixed(1)}%
          </p>
        )}
      </div>
    );
  };

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        No historical data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="fsfsiGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--rw-blue)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--rw-blue)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
          tickFormatter={(value) => value.toFixed(2)}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Stress threshold reference lines */}
        <ReferenceLine
          y={STRESS_THRESHOLDS.low}
          stroke={STRESS_COLORS.low}
          strokeDasharray="5 5"
          label={{ value: 'Low', position: 'right', fontSize: 10, fill: STRESS_COLORS.low }}
        />
        <ReferenceLine
          y={STRESS_THRESHOLDS.medium}
          stroke={STRESS_COLORS.medium}
          strokeDasharray="5 5"
          label={{ value: 'Medium', position: 'right', fontSize: 10, fill: STRESS_COLORS.medium }}
        />
        <ReferenceLine
          y={STRESS_THRESHOLDS.high}
          stroke={STRESS_COLORS.high}
          strokeDasharray="5 5"
          label={{ value: 'High', position: 'right', fontSize: 10, fill: STRESS_COLORS.high }}
        />

        <Area
          type="monotone"
          dataKey="fsfsi"
          stroke="none"
          fill="url(#fsfsiGradient)"
        />
        <Line
          type="monotone"
          dataKey="fsfsi"
          stroke="var(--rw-blue)"
          strokeWidth={3}
          dot={{ r: 6, fill: 'var(--rw-blue)', strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 8, fill: 'var(--rw-blue)', strokeWidth: 2, stroke: '#fff' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
