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
  ReferenceArea,
} from 'recharts';
import type { AssessmentHistory } from '@/lib/types/assessment';
import { useLanguage } from '@/contexts/LanguageContext';

interface FSFSITrendChartProps {
  data: AssessmentHistory[];
  height?: number;
}

const STRESS_THRESHOLDS = {
  low: 0.05,
  medium: 0.15,
  high: 0.3,
};

const STRESS_COLORS = {
  low: '#22c55e',
  medium: '#ca8a04',
  high: '#ea580c',
  critical: '#dc2626',
};

/** Line colors: strong contrast for policy audiences */
const LINE_CURRENT = '#0284c7';
const LINE_CUMULATIVE = '#b91c1c';

export function FSFSITrendChart({ data, height = 500 }: FSFSITrendChartProps) {
  const { t } = useLanguage();

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

  const yDomain = useMemo((): [number, number] => {
    let min = Infinity;
    let max = -Infinity;
    for (const d of chartData) {
      min = Math.min(min, d.fsfsi);
      max = Math.max(max, d.fsfsi);
      if (d.cumulative != null) {
        min = Math.min(min, d.cumulative);
        max = Math.max(max, d.cumulative);
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return [0, 1];
    }
    const span = Math.max(0.06, max - min);
    const pad = Math.min(0.12, Math.max(0.04, span * 0.2));
    const low = Math.max(0, min - pad);
    const high = Math.min(1, max + pad);
    return [low, high];
  }, [chartData]);

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

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;

    const item = payload[0].payload;
    const gap = item.cumulative !== null ? item.cumulative - item.fsfsi : null;

    return (
      <div className="min-w-[200px] rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="mb-2 font-semibold text-slate-900">{label}</p>
        <div className="space-y-1.5 text-sm">
          <p className="flex justify-between gap-4">
            <span className="text-slate-500">{t('overview.chart_legend_current')}:</span>
            <span className="font-bold text-sky-700">{item.fsfsi.toFixed(4)}</span>
          </p>
          {item.cumulative !== null && (
            <p className="flex justify-between gap-4">
              <span className="text-slate-500">{t('overview.chart_legend_cumulative')}:</span>
              <span className="font-bold text-red-700">{item.cumulative.toFixed(4)}</span>
            </p>
          )}
          {gap !== null && gap > 0.001 && (
            <p className="mt-1 border-t border-slate-100 pt-1.5 text-xs text-amber-800">
              {t('overview.chart_tooltip_gap')}: +{gap.toFixed(4)}
            </p>
          )}
          <p className="text-xs capitalize text-slate-500">
            {t('overview.risk_level')}: {item.stressLevel}
          </p>
          {item.yoyChange !== 0 && (
            <p className={`text-xs ${item.yoyChange < 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {t('overview.yoy_change')}: {item.yoyChange > 0 ? '+' : ''}
              {item.yoyChange.toFixed(1)}%
            </p>
          )}
        </div>
      </div>
    );
  };

  if (!chartData.length) {
    return (
      <div className="flex h-[450px] items-center justify-center text-slate-500">
        No historical data available
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-2 sm:p-3">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 24, right: 28, left: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="fsfsiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={LINE_CURRENT} stopOpacity={0.22} />
              <stop offset="95%" stopColor={LINE_CURRENT} stopOpacity={0} />
            </linearGradient>
            {hasCumulative && (
              <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={LINE_CUMULATIVE} stopOpacity={0.14} />
                <stop offset="95%" stopColor={LINE_CUMULATIVE} stopOpacity={0} />
              </linearGradient>
            )}
          </defs>

          {/* Risk zones (y-bands; Y domain zooms to data so trends read clearly) */}
          <ReferenceArea y1={0} y2={STRESS_THRESHOLDS.low} fill={STRESS_COLORS.low} fillOpacity={0.16} />
          <ReferenceArea
            y1={STRESS_THRESHOLDS.low}
            y2={STRESS_THRESHOLDS.medium}
            fill={STRESS_COLORS.medium}
            fillOpacity={0.12}
          />
          <ReferenceArea
            y1={STRESS_THRESHOLDS.medium}
            y2={STRESS_THRESHOLDS.high}
            fill={STRESS_COLORS.high}
            fillOpacity={0.1}
          />
          <ReferenceArea y1={STRESS_THRESHOLDS.high} y2={1} fill={STRESS_COLORS.critical} fillOpacity={0.09} />

          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 13, fill: '#475569', fontWeight: 500 }}
            tickLine={{ stroke: '#94a3b8' }}
            axisLine={{ stroke: '#94a3b8' }}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 13, fill: '#475569', fontWeight: 500 }}
            tickLine={{ stroke: '#94a3b8' }}
            axisLine={{ stroke: '#94a3b8' }}
            tickFormatter={(v: number) => v.toFixed(2)}
            label={{
              value: t('overview.chart_axis_stress_index'),
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#64748b', fontSize: 12 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={40}
            formatter={(value: string) => {
              if (value === 'fsfsi') return t('overview.chart_legend_current');
              if (value === 'cumulative') return t('overview.chart_legend_cumulative');
              return value;
            }}
            wrapperStyle={{ fontWeight: 600, fontSize: 13 }}
          />

          <ReferenceLine
            y={STRESS_THRESHOLDS.low}
            stroke={STRESS_COLORS.low}
            strokeDasharray="4 4"
            strokeOpacity={0.7}
          />
          <ReferenceLine
            y={STRESS_THRESHOLDS.medium}
            stroke={STRESS_COLORS.medium}
            strokeDasharray="4 4"
            strokeOpacity={0.7}
          />
          <ReferenceLine
            y={STRESS_THRESHOLDS.high}
            stroke={STRESS_COLORS.high}
            strokeDasharray="4 4"
            strokeOpacity={0.8}
          />

          <Area type="monotone" dataKey="fsfsi" stroke="none" fill="url(#fsfsiGradient)" />
          <Line
            type="monotone"
            dataKey="fsfsi"
            name="fsfsi"
            stroke={LINE_CURRENT}
            strokeWidth={4}
            dot={{ r: 5, fill: LINE_CURRENT, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 8, strokeWidth: 2, stroke: '#fff' }}
          />

          {hasCumulative && (
            <>
              <Area type="monotone" dataKey="cumulative" stroke="none" fill="url(#cumulativeGradient)" />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="cumulative"
                stroke={LINE_CUMULATIVE}
                strokeWidth={3.5}
                strokeDasharray="10 6"
                dot={{ r: 5, fill: LINE_CUMULATIVE, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 2, stroke: '#fff' }}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {hasCumulative && (
        <div className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/90 p-4 text-sm leading-relaxed shadow-sm">
          <p className="font-semibold text-amber-900">{t('overview.chart_explain_title')}</p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-amber-900/90">
            <li>{t('overview.chart_explain_blue')}</li>
            <li>{t('overview.chart_explain_red')}</li>
            <li>{t('overview.chart_explain_gap')}</li>
          </ul>
        </div>
      )}
    </div>
  );
}