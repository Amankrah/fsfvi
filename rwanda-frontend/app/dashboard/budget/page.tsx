'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { budgetAnalysisAPI } from '@/lib/api/budgetAnalysisApi';
import type { BudgetHistoryPayload, BudgetSnapshotPayload } from '@/lib/types/budgetAnalysis';
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
} from 'recharts';
import {
  Loader2,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  ClipboardList,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

const COMP_LINE_COLORS = ['#1d4ed8', '#059669', '#d97706', '#7c3aed', '#db2777'];

function componentLabel(key: string): string {
  const k = key as IndicatorComponent;
  return COMPONENT_DISPLAY_NAMES[k] ?? key.replace(/_/g, ' ');
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

  const applyRange = () => {
    void load();
  };

  const loadSnapshotForEndYear = async () => {
    if (!data) return;
    const y = data.scope.end_year;
    setSnapshotLoading(true);
    setSnapshot(null);
    try {
      const s = await budgetAnalysisAPI.getSnapshot(y);
      setSnapshot(s);
    } catch {
      setSnapshot(null);
    } finally {
      setSnapshotLoading(false);
    }
  };

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
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('budget_page.range_from')}</label>
            <select
              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm"
              value={startYear}
              onChange={(e) => setStartYear(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">{t('budget_page.range_all')}</option>
              {data?.scope.years.map((y) => (
                <option key={y} value={y}>
                  FY{y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('budget_page.range_to')}</label>
            <select
              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">{t('budget_page.range_all')}</option>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t('budget_page.metric_cagr')}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.metrics.cagr_weighted_pct != null
                    ? `${data.metrics.cagr_weighted_pct > 0 ? '+' : ''}${data.metrics.cagr_weighted_pct}%`
                    : '—'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase">{t('budget_page.metric_vol')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
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
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {data.metrics.hhi_first_year != null ? data.metrics.hhi_first_year.toFixed(0) : '—'} →{' '}
                  {data.metrics.hhi_last_year != null ? data.metrics.hhi_last_year.toFixed(0) : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">{t('budget_page.metric_hhi_hint')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase">{t('budget_page.metric_window')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  FY{data.scope.start_year}–{data.scope.end_year}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('budget_page.available')}: FY{data.scope.available_range.min}–
                  {data.scope.available_range.max}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[var(--rw-blue)]" />
                {t('budget_page.chart_national_title')}
              </CardTitle>
              <p className="text-sm text-gray-500 font-normal">{t('budget_page.chart_national_help')}</p>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={nationalChartData} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} label={{ value: 'bn LCU', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(4)} bn`, t('budget_page.tooltip_weighted')]}
                    labelClassName="font-medium"
                  />
                  <Line type="monotone" dataKey="weighted_bn" name={t('budget_page.tooltip_weighted')} stroke="var(--rw-blue)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {topComponentKeys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('budget_page.chart_share_title')}</CardTitle>
                <p className="text-sm text-gray-500 font-normal">{t('budget_page.chart_share_help')}</p>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-[var(--rw-blue)]" />
                {t('budget_page.insights_title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
                {data.insights.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('budget_page.drift_title')}</CardTitle>
              <p className="text-sm text-gray-500 font-normal">{t('budget_page.drift_help')}</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-3">{t('budget_page.col_component')}</th>
                    <th className="py-2 pr-3">{t('budget_page.drift_col_first')}</th>
                    <th className="py-2 pr-3">{t('budget_page.drift_col_last')}</th>
                    <th className="py-2 pr-3">{t('budget_page.drift_col_ppt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.component_share_drift.map((row) => (
                    <tr key={row.component} className="border-b border-gray-100">
                      <td className="py-2 pr-3 font-medium">{componentLabel(row.component)}</td>
                      <td className="py-2 pr-3">{row.share_first_year_pct.toFixed(1)}%</td>
                      <td className="py-2 pr-3">{row.share_last_year_pct.toFixed(1)}%</td>
                      <td className="py-2 pr-3 font-mono">{row.ppt_change >= 0 ? '+' : ''}{row.ppt_change.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('budget_page.movers_title')}</CardTitle>
              <p className="text-sm text-gray-500 font-normal">{t('budget_page.movers_help')}</p>
            </CardHeader>
            <CardContent className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left text-gray-500">
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
                      <td className="py-2 pr-3">{row.cagr_pct != null ? `${row.cagr_pct}%` : '—'}</td>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('budget_page.quality_title')}</CardTitle>
              <p className="text-sm text-gray-500 font-normal">{t('budget_page.quality_help')}</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
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
                      <td className="py-2 pr-3">{row.mapping_lines}</td>
                      <td className="py-2 pr-3">{row.fallback_lines}</td>
                      <td className="py-2 pr-3">{row.fallback_share_pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">{t('budget_page.snapshot_title')}</CardTitle>
                <p className="text-sm text-gray-500 font-normal mt-1">{t('budget_page.snapshot_help')}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadSnapshotForEndYear()}
                disabled={snapshotLoading}
                className="text-sm font-medium text-[var(--rw-blue)] hover:underline disabled:opacity-50"
              >
                {snapshotLoading
                  ? t('common.loading')
                  : t('budget_page.snapshot_load').replace('{year}', String(data.scope.end_year))}
              </button>
            </CardHeader>
            {snapshot && (
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  FY{snapshot.fiscal_year} — {snapshot.total_weighted_lcu_bn.toFixed(4)} bn LCU (
                  {t('budget_page.snapshot_indicator_count').replace('{n}', String(snapshot.indicator_rows))})
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
