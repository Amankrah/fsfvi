'use client';

import { useMemo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Legend,
} from 'recharts';
import type { AssessmentHistory } from '@/lib/types/assessment';

interface FSFSITrendChartProps {
  data: AssessmentHistory[];
  height?: number;
}

const STRESS_THRESHOLDS = {
  low: 0.0500,
  medium: 0.1500,
  high: 0.3000,
};

const STRESS_COLORS = {
  low: '#22c55e',      // green-500
  medium: '#eab308',   // yellow-500
  high: '#f97316',     // orange-500
  critical: '#ef4444', // red-500
};

export function FSFSITrendChart({ data, height = 450 }: FSFSITrendChartProps) {
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => a.fiscal_year - b.fiscal_year)
      .map((item) => ({
        year: `FY${item.fiscal_year}`,
        fiscalYear: item.fiscal_year,
        fsfsi: item.fsfsi_score,
        cumulative: item.cumulative_fsfsi ?? null,
        stressLevel: item.stress_level,
        yoyChange: item.yoy_change_percent ?? 0,
      }));
  }, [data]);

  const hasCumulative = chartData.some((d) => d.cumulative !== null);

  const getStressColor = (score: number) => {
    if (score >= STRESS_THRESHOLDS.high) return STRESS_COLORS.critical;
    if (score >= STRESS_THRESHOLDS.medium) return STRESS_COLORS.high;
    if (score >= STRESS_THRESHOLDS.low) return STRESS_COLORS.medium;
    return STRESS_COLORS.low;
  };

  interface TooltipEntry {
    value: number;
    dataKey: string;
    color: string;
    payload: {
      fsfsi: number;
      cumulative: number | null;
      stressLevel: string;
      yoyChange: number;
    };
  }

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
  }) => {
    if (!active || !payload || !payload.length) return null;

    const item = payload[0].payload;
    const gap = item.cumulative !== null ? item.cumulative - item.fsfsi : null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[180px]">
        <p className="font-semibold text-gray-900 mb-1">{label}</p>
        <div className="space-y-1">
          <p className="text-sm flex justify-between gap-4">
            <span className="text-gray-500">Current:</span>
            <span className="font-bold" style={{ color: 'var(--rw-blue)' }}>
              {item.fsfsi.toFixed(4)}
            </span>
          </p>
          {item.cumulative !== null && (
            <p className="text-sm flex justify-between gap-4">
              <span className="text-gray-500">Cumulative:</span>
              <span className="font-bold text-red-600">
                {item.cumulative.toFixed(4)}
              </span>
            </p>
          )}
          {gap !== null && gap > 0.001 && (
            <p className="text-xs text-orange-600 border-t border-gray-100 pt-1 mt-1">
              +{gap.toFixed(4)} accumulated damage lag
            </p>
          )}
          <p className="text-xs text-gray-500 capitalize">
            Stress: {item.stressLevel}
          </p>
          {item.yoyChange !== 0 && (
            <p className={`text-xs ${item.yoyChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
              YoY: {item.yoyChange > 0 ? '+' : ''}{item.yoyChange.toFixed(1)}%
            </p>
          )}
        </div>
      </div>
    );
  };

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[450px] text-gray-500">
        No historical data available
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="fsfsiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--rw-blue)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--rw-blue)" stopOpacity={0} />
            </linearGradient>
            {hasCumulative && (
              <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            )}
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
            tickFormatter={(value: number) => value.toFixed(2)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value: string) => {
              if (value === 'fsfsi') return 'Current Year Stress (point-in-time)';
              if (value === 'cumulative') return 'Cumulative Stress (with damage persistence)';
              return value;
            }}
          />

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

          {/* Current year stress (blue line) */}
          <Area
            type="monotone"
            dataKey="fsfsi"
            stroke="none"
            fill="url(#fsfsiGradient)"
          />
          <Line
            type="monotone"
            dataKey="fsfsi"
            name="fsfsi"
            stroke="var(--rw-blue)"
            strokeWidth={3}
            dot={{ r: 5, fill: 'var(--rw-blue)', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 7, fill: 'var(--rw-blue)', strokeWidth: 2, stroke: '#fff' }}
          />

          {/* Cumulative stress (red dashed line) */}
          {hasCumulative && (
            <>
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="none"
                fill="url(#cumulativeGradient)"
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="cumulative"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Explanation for policymakers */}
      {hasCumulative && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-medium text-amber-800">
            Understanding the two lines:
          </p>
          <ul className="text-xs text-amber-700 mt-1 space-y-0.5 list-disc list-inside">
            <li>
              <span className="font-semibold" style={{ color: 'var(--rw-blue)' }}>Blue (Current)</span> — stress based on this year&apos;s data alone. A budget increase shows immediate improvement.
            </li>
            <li>
              <span className="font-semibold text-red-600">Red (Cumulative)</span> — accounts for accumulated damage from prior years. Recovery is slow because infrastructure, institutions, and human capital take time to rebuild.
            </li>
            <li>
              The <span className="font-semibold">gap between the lines</span> represents unresolved structural damage that persists despite improved funding.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
