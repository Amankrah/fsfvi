'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationParams } from '@/contexts/LanguageContext';
import { budgetAnalysisAPI } from '@/lib/api/budgetAnalysisApi';
import type { BudgetHistoryPayload, BudgetSnapshotPayload, IndicatorMover } from '@/lib/types/budgetAnalysis';
import { COMPONENT_DISPLAY_NAMES, type IndicatorComponent } from '@/lib/types/assessment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Loader2,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

const COMP_LINE_COLORS = ['#1d4ed8', '#059669', '#d97706', '#7c3aed', '#db2777'];

const YOY_SPIKE_THRESHOLD_PCT = 15;
const CAGR_EXTREME_ABS = 200;
/** Billions LCU — allocations below this often produce misleading CAGR. */
const NEAR_ZERO_FIRST_BN = 0.02;

function componentLabel(key: string): string {
  const k = key as IndicatorComponent;
  return COMPONENT_DISPLAY_NAMES[k] ?? key.replace(/_/g, ' ');
}

function DriftPptBar({ ppt, maxAbs }: { ppt: number; maxAbs: number }) {
  const t = Math.min(1, Math.abs(ppt) / Math.max(maxAbs, 1e-6));
  const widthPct = t * 50;
  const isPos = ppt >= 0;
  return (
    <div className="relative h-2.5 w-[4.5rem] shrink-0 overflow-hidden rounded bg-slate-200">
      <div className="absolute left-1/2 top-0 z-10 h-full w-px -translate-x-px bg-slate-500/80" />
      {isPos ? (
        <div
          className="absolute top-0 bottom-0 rounded-r-sm bg-emerald-600"
          style={{ left: '50%', width: `${widthPct}%` }}
        />
      ) : (
        <div
          className="absolute top-0 bottom-0 rounded-l-sm bg-rose-600"
          style={{ left: `${50 - widthPct}%`, width: `${widthPct}%` }}
        />
      )}
    </div>
  );
}

function MoverCagrCell({
  row,
  t,
}: {
  row: IndicatorMover;
  t: (key: string, params?: TranslationParams) => string;
}): ReactNode {
  const c = row.cagr_pct;
  if (c == null) {
    return <td className="py-2 pr-3">—</td>;
  }
  const nearZero = row.weighted_first_bn >= 0 && row.weighted_first_bn < NEAR_ZERO_FIRST_BN;
  const extreme = Math.abs(c) >= CAGR_EXTREME_ABS;
  const flagged = nearZero || extreme;
  const display = `${c.toLocaleString(undefined, { maximumFractionDigits: 1 })}%${flagged ? '*' : ''}`;
  return (
    <td
      className={`py-2 pr-3 tabular-nums ${flagged ? 'bg-amber-50/90 font-semibold text-amber-950' : ''}`}
      title={flagged ? t('budget_page.mover_cagr_caveat') : t('budget_page.mover_cagr_hint')}
    >
      {display}
    </td>
  );
}

export default function BudgetPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<BudgetHistoryPayload | null>(null);
  const [snapshot, setSnapshot] = useState<BudgetSnapshotPayload | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startYear, setStartYear] = useState<number | ''>('');
  const [endYear, setEndYear] = useState<number | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setSnapshot(null);
    try {
      const payload = await budgetAnalysisAPI.getHistory({
        startYear: startYear === '' ? undefined : startYear,
        endYear: endYear === '' ? undefined : endYear,
      });
      setData(payload);
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { error?: string } } };
      if (ax.response?.status === 404) {
        setError(null);
        setData(null);
      } else {
        setError(
          ax.response?.data?.error ||
            (err instanceof Error ? err.message : 'Failed to load budget history.'),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [startYear, endYear]);

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial load only; user applies range

  const nationalChartData = useMemo(() => {
    if (!data) return [];
    return data.national_trend.map((p) => ({
      label: `FY${p.year}`,
      year: p.year,
      weighted_bn: p.weighted_lcu_bn,
      yoy: p.yoy_weighted_pct,
    }));
  }, [data]);

  const topComponentKeys = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.component_trends].sort((a, b) => {
      const la = a.series[a.series.length - 1]?.weighted_lcu_bn ?? 0;
      const lb = b.series[b.series.length - 1]?.weighted_lcu_bn ?? 0;
      return lb - la;
    });
    return sorted.slice(0, 5).map((c) => c.component);
  }, [data]);

  const componentShareChartData = useMemo(() => {
    if (!data || !topComponentKeys.length) return [];
    return data.scope.years.map((y) => {
      const row: Record<string, number | string> = {
        label: `FY${y}`,
        year: y,
      };
      for (const comp of topComponentKeys) {
        const ct = data.component_trends.find((t) => t.component === comp);
        const pt = ct?.series.find((s) => s.year === y);
        row[comp] = pt?.share_of_national_weighted_pct ?? 0;
      }
      return row;
    });
  }, [data, topComponentKeys]);

  const nationalSpikeInfo = useMemo(() => {
    if (nationalChartData.length < 2) return null;
    let best: { label: string; yoy: number; year: number; prevYear: number } | null = null;
    for (let i = 1; i < nationalChartData.length; i++) {
      const cur = nationalChartData[i];
      const prev = nationalChartData[i - 1];
      const yoy = cur.yoy;
      if (yoy == null || !Number.isFinite(yoy)) continue;
      if (!best || yoy > best.yoy) {
        best = { label: cur.label, yoy, year: cur.year, prevYear: prev.year };
      }
    }
    if (best && best.yoy >= YOY_SPIKE_THRESHOLD_PCT) return best;
    return null;
  }, [nationalChartData]);

  const driftMaxAbs = useMemo(() => {
    if (!data?.component_share_drift.length) return 1;
    return Math.max(1, ...data.component_share_drift.map((r) => Math.abs(r.ppt_change)));
  }, [data]);

  const mappingConfidence = useMemo(() => {
    if (!data?.data_quality_by_year.length) return null;
    const end = data.data_quality_by_year.find((r) => r.year === data.scope.end_year);
    const row = end ?? data.data_quality_by_year[data.data_quality_by_year.length - 1];
    const directPct = Math.max(0, Math.min(100, 100 - row.fallback_share_pct));
    return { year: row.year, directPct, fallbackPct: row.fallback_share_pct };
  }, [data]);

  const applyRange = () => {
    void load();
  };

  const fetchSnapshot = useCallback(async (year: number) => {
    setSnapshotLoading(true);
    setSnapshot(null);
    try {
      const s = await budgetAnalysisAPI.getSnapshot(year);
      setSnapshot(s);
    } catch {
      setSnapshot(null);
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!data?.scope.end_year) return;
    let cancelled = false;
    void (async () => {
      setSnapshotLoading(true);
      setSnapshot(null);
      try {
        const s = await budgetAnalysisAPI.getSnapshot(data.scope.end_year);
        if (!cancelled) setSnapshot(s);
      } catch {
        if (!cancelled) setSnapshot(null);
      } finally {
        if (!cancelled) setSnapshotLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data?.scope.end_year, data?.computed_at]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-[var(--rw-blue)]" />
            {t('budget_page.title')}
          </h1>
          <p className="text-sm text-gray-600 mt-1 max-w-3xl">{t('budget_page.subtitle')}</p>
          <p className="text-xs text-gray-500 mt-2">{t('budget_page.scope_note')}</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2">
          <div>
            <label
              className="block text-xs font-medium text-gray-500 mb-1"
              htmlFor="budget-range-from"
            >
              {t('budget_page.range_from')}
            </label>
            <select
              id="budget-range-from"
              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm"
              value={startYear}
              onChange={(e) => setStartYear(e.target.value ? Number(e.target.value) : '')}
              title={t('budget_page.range_from')}
              aria-label={t('budget_page.range_from')}
            >
              <option value="">
                {data
                  ? t('budget_page.range_full', {
                      min: data.scope.available_range.min,
                      max: data.scope.available_range.max,
                    })
                  : t('budget_page.range_all')}
              </option>
              {data?.scope.years.map((y) => (
                <option key={y} value={y}>
                  FY{y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="block text-xs font-medium text-gray-500 mb-1"
              htmlFor="budget-range-to"
            >
              {t('budget_page.range_to')}
            </label>
            <select
              id="budget-range-to"
              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value ? Number(e.target.value) : '')}
              title={t('budget_page.range_to')}
              aria-label={t('budget_page.range_to')}
            >
              <option value="">
                {data
                  ? t('budget_page.range_full', {
                      min: data.scope.available_range.min,
                      max: data.scope.available_range.max,
                    })
                  : t('budget_page.range_all')}
              </option>
              {data?.scope.years.map((y) => (
                <option key={y} value={y}>
                  FY{y}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={applyRange}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--rw-blue)] text-white px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {t('budget_page.apply_range')}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t('budget_page.refresh')}
          </button>
          </div>
          {data && (
            <p className="text-xs font-medium text-slate-600">
              {t('budget_page.viewing_window', { from: data.scope.start_year, to: data.scope.end_year })}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center min-h-[200px] text-gray-600">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--rw-blue)] mr-3" />
          {t('budget_page.loading')}
        </div>
      )}

      {!loading && !data && !error && (
        <Card>
          <CardContent className="py-12 text-center text-gray-600">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <p>{t('budget_page.no_data')}</p>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-l-4 border-l-emerald-600 shadow-sm sm:col-span-2 xl:col-span-1">
              <CardContent className="pt-5">
                <p className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  {t('budget_page.metric_mapping_confidence')}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
                  {mappingConfidence
                    ? t('budget_page.metric_direct_mapped', {
                        pct: mappingConfidence.directPct.toFixed(1),
                      })
                    : '—'}
                </p>
                {mappingConfidence ? (
                  <p className="text-xs text-gray-500 mt-1 leading-snug">
                    {t('budget_page.metric_mapping_confidence_hint', { year: mappingConfidence.year })}
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t('budget_page.metric_cagr')}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
                  {data.metrics.cagr_weighted_pct != null
                    ? `${data.metrics.cagr_weighted_pct > 0 ? '+' : ''}${data.metrics.cagr_weighted_pct}%`
                    : '—'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase">{t('budget_page.metric_vol')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
                  {data.metrics.volatility_yoy_weighted_pp != null
                    ? `${data.metrics.volatility_yoy_weighted_pp} pp`
                    : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">{t('budget_page.metric_vol_hint')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase">{t('budget_page.metric_hhi')}</p>
                <p className="text-lg font-bold text-gray-900 mt-1 tabular-nums">
                  {data.metrics.hhi_first_year != null ? data.metrics.hhi_first_year.toFixed(0) : '—'} →{' '}
                  {data.metrics.hhi_last_year != null ? data.metrics.hhi_last_year.toFixed(0) : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">{t('budget_page.metric_hhi_hint')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase">{t('budget_page.metric_window')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
                  FY{data.scope.start_year}–{data.scope.end_year}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('budget_page.available')}: FY{data.scope.available_range.min}–
                  {data.scope.available_range.max}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-slate-200/90 shadow-md ring-1 ring-slate-900/[0.04]">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-slate-900">
                <BarChart3 className="h-5 w-5 text-[var(--rw-blue)]" />
                {t('budget_page.chart_national_title')}
              </CardTitle>
              <p className="text-sm text-slate-600 font-normal leading-relaxed">{t('budget_page.chart_national_help')}</p>
            </CardHeader>
            <CardContent className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={nationalChartData} margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} label={{ value: 'bn LCU', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    formatter={(value) => {
                      const n = typeof value === 'number' ? value : Number(value);
                      const label = Number.isFinite(n) ? `${n.toFixed(4)} bn` : '—';
                      return [label, t('budget_page.tooltip_weighted')];
                    }}
                    labelClassName="font-medium"
                  />
                  <Line
                    type="monotone"
                    dataKey="weighted_bn"
                    name={t('budget_page.tooltip_weighted')}
                    stroke="var(--rw-blue)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  {nationalSpikeInfo ? (
                    <ReferenceLine
                      x={nationalSpikeInfo.label}
                      stroke="#d97706"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
            <div className="space-y-3 border-t border-slate-100 px-6 pb-6 pt-4">
              <p className="text-sm leading-relaxed text-slate-600">{t('budget_page.chart_general_caveat')}</p>
              {nationalSpikeInfo ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/95 p-4 text-sm text-amber-950 shadow-sm">
                  <p className="font-semibold text-amber-900">{t('budget_page.chart_spike_title')}</p>
                  <p className="mt-1.5 leading-relaxed">
                    {t('budget_page.chart_spike_note', {
                      yoy: nationalSpikeInfo.yoy.toFixed(1),
                      year: nationalSpikeInfo.year,
                      prevYear: nationalSpikeInfo.prevYear,
                    })}
                  </p>
                </div>
              ) : null}
            </div>
          </Card>

          {topComponentKeys.length > 0 && (
            <Card className="shadow-sm ring-1 ring-slate-900/[0.04]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-slate-900">{t('budget_page.chart_share_title')}</CardTitle>
                <p className="text-sm text-slate-600 font-normal leading-relaxed">{t('budget_page.chart_share_help')}</p>
              </CardHeader>
              <CardContent className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={componentShareChartData} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 'auto']} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    {topComponentKeys.map((comp, i) => (
                      <Line
                        key={comp}
                        type="monotone"
                        dataKey={comp}
                        name={componentLabel(comp)}
                        stroke={COMP_LINE_COLORS[i % COMP_LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="border-l-4 border-l-amber-400 bg-gradient-to-br from-amber-50/50 via-white to-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                <Sparkles className="h-5 w-5 text-amber-600" />
                {t('budget_page.insights_title')}
              </CardTitle>
              <p className="text-sm text-slate-600 leading-relaxed">{t('budget_page.insights_subtitle')}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-800">
                {data.insights.map((b, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-lg border border-amber-100/80 bg-white/80 px-3 py-2.5 shadow-sm"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <section className="space-y-6 border-t-2 border-dashed border-slate-300 pt-10">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('budget_page.section_reference_title')}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{t('budget_page.section_reference_intro')}</p>
            </div>

          <Card className="bg-slate-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-800">{t('budget_page.drift_title')}</CardTitle>
              <p className="text-sm text-slate-600 font-normal leading-relaxed">{t('budget_page.drift_help')}</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 pr-3">{t('budget_page.col_component')}</th>
                    <th className="py-2 pr-3">{t('budget_page.drift_col_first')}</th>
                    <th className="py-2 pr-3">{t('budget_page.drift_col_last')}</th>
                    <th className="py-2 pr-3">{t('budget_page.drift_col_shift')}</th>
                    <th className="py-2 pr-3">{t('budget_page.drift_col_ppt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.component_share_drift.map((row) => (
                    <tr key={row.component} className="border-b border-gray-100">
                      <td className="py-2 pr-3 font-medium text-slate-900">{componentLabel(row.component)}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.share_first_year_pct.toFixed(1)}%</td>
                      <td className="py-2 pr-3 tabular-nums">{row.share_last_year_pct.toFixed(1)}%</td>
                      <td className="py-2 pr-3">
                        <DriftPptBar ppt={row.ppt_change} maxAbs={driftMaxAbs} />
                      </td>
                      <td
                        className={`py-2 pr-3 font-mono font-semibold tabular-nums ${
                          row.ppt_change > 0.5 ? 'text-emerald-700' : row.ppt_change < -0.5 ? 'text-rose-700' : 'text-slate-700'
                        }`}
                      >
                        {row.ppt_change >= 0 ? '+' : ''}
                        {row.ppt_change.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="bg-slate-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-800">{t('budget_page.movers_title')}</CardTitle>
              <p className="text-sm text-slate-600 font-normal leading-relaxed">{t('budget_page.movers_help')}</p>
            </CardHeader>
            <CardContent className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 pr-2">{t('budget_page.col_code')}</th>
                    <th className="py-2 pr-3">{t('budget_page.col_name')}</th>
                    <th className="py-2 pr-3">{t('budget_page.col_component')}</th>
                    <th className="py-2 pr-3" title={t('budget_page.mover_cagr_hint')}>
                      {t('budget_page.mover_cagr')}
                    </th>
                    <th className="py-2 pr-3" title={t('budget_page.mover_level_hint')}>
                      {t('budget_page.mover_change')}
                    </th>
                    <th className="py-2 pr-3" title={t('budget_page.mover_share_hint')}>
                      {t('budget_page.mover_share_ppt')}
                    </th>
                    <th className="py-2 pr-3">{t('budget_page.mover_rank')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.indicator_movers.map((row) => {
                    const ppt = row.share_change_ppt ?? 0;
                    return (
                    <tr key={row.indicator_id} className="border-b border-gray-100">
                      <td className="py-2 pr-2 font-mono text-xs">{row.code}</td>
                      <td className="py-2 pr-3 text-gray-800 max-w-[200px] truncate" title={row.name}>
                        {row.name}
                      </td>
                      <td className="py-2 pr-3 text-xs">{componentLabel(row.component)}</td>
                      <MoverCagrCell row={row} t={t} />
                      <td className="py-2 pr-3">{row.total_change_pct != null ? `${row.total_change_pct}%` : '—'}</td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {ppt === 0 ? '0' : `${ppt > 0 ? '+' : ''}${ppt}`}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {row.rank_first_year ?? '—'} → {row.rank_last_year ?? '—'}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-500">
                {t('budget_page.mover_footnote_cagr')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-800">{t('budget_page.quality_title')}</CardTitle>
              <p className="text-sm text-slate-600 font-normal leading-relaxed">{t('budget_page.quality_help')}</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 pr-3">{t('budget_page.col_year')}</th>
                    <th className="py-2 pr-3">{t('budget_page.quality_lines')}</th>
                    <th className="py-2 pr-3">{t('budget_page.quality_fallback')}</th>
                    <th className="py-2 pr-3">{t('budget_page.quality_fb_pct')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data_quality_by_year.map((row) => (
                    <tr key={row.year} className="border-b border-gray-100">
                      <td className="py-2 pr-3 font-medium">FY{row.year}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.mapping_lines}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.fallback_lines}</td>
                      <td className="py-2 pr-3 tabular-nums font-medium text-slate-800">{row.fallback_share_pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          </section>

          <Card className="shadow-sm ring-1 ring-slate-900/[0.04]">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="text-lg text-slate-900">{t('budget_page.snapshot_title')}</CardTitle>
                <p className="text-sm text-slate-600 font-normal mt-1 leading-relaxed">{t('budget_page.snapshot_help')}</p>
                <p className="text-xs text-slate-500 mt-2">{t('budget_page.snapshot_auto_hint')}</p>
              </div>
              <button
                type="button"
                onClick={() => void fetchSnapshot(data.scope.end_year)}
                disabled={snapshotLoading}
                className="shrink-0 rounded-lg border border-[var(--rw-blue)]/30 bg-[var(--rw-blue)]/5 px-3 py-2 text-sm font-semibold text-[var(--rw-blue)] hover:bg-[var(--rw-blue)]/10 disabled:opacity-50"
              >
                {snapshotLoading
                  ? t('common.loading')
                  : t('budget_page.snapshot_reload', { year: data.scope.end_year })}
              </button>
            </CardHeader>
            {snapshotLoading && !snapshot ? (
              <CardContent className="flex items-center gap-2 py-8 text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--rw-blue)]" />
                <span className="text-sm">{t('common.loading')}</span>
              </CardContent>
            ) : null}
            {snapshot && (
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-700">
                  FY{snapshot.fiscal_year} — {snapshot.total_weighted_lcu_bn.toFixed(4)} bn LCU (
                  {t('budget_page.snapshot_indicator_count', { n: snapshot.indicator_rows })})
                </p>
                <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2 pr-2">{t('budget_page.col_code')}</th>
                        <th className="py-2 pr-3">{t('budget_page.col_name')}</th>
                        <th className="py-2 pr-3">{t('budget_page.col_weighted_bn')}</th>
                        <th className="py-2 pr-3">{t('budget_page.col_share')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.indicator_breakdown.map((row) => (
                        <tr key={row.code} className="border-b border-gray-100">
                          <td className="py-2 pr-2 font-mono text-xs">{row.code}</td>
                          <td className="py-2 pr-3">{row.name}</td>
                          <td className="py-2 pr-3 font-mono">{row.weighted_lcu_bn.toFixed(4)}</td>
                          <td className="py-2 pr-3">{row.share_weighted_percent.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>

          <p className="text-xs text-gray-500 border-t border-gray-200 pt-4">{data.currency_note}</p>
        </>
      )}
    </div>
  );
}
