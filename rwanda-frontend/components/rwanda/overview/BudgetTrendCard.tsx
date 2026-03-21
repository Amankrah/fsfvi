'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { budgetAnalysisAPI } from '@/lib/api/budgetAnalysisApi';
import type { BudgetHistoryPayload } from '@/lib/types/budgetAnalysis';
import { COMPONENT_DISPLAY_NAMES, type IndicatorComponent } from '@/lib/types/assessment';
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
import {
  BarChart3,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  PieChart,
  Lightbulb,
} from 'lucide-react';

type BudgetView = 'total' | 'components' | 'insights';

const COMP_LINE_COLORS = ['#1d4ed8', '#059669', '#d97706', '#7c3aed', '#db2777'];

function componentLabel(key: string): string {
  const k = key as IndicatorComponent;
  return COMPONENT_DISPLAY_NAMES[k] ?? key.replace(/_/g, ' ');
}

export function BudgetTrendCard() {
  const { t } = useLanguage();
  const [data, setData] = useState<BudgetHistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<BudgetView>('total');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await budgetAnalysisAPI.getHistory();
        setData(payload);
      } catch (err) {
        const ax = err as { response?: { status?: number } };
        if (ax.response?.status === 404) {
          setData(null);
        } else {
          setError('Unable to load budget data');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.national_trend.map((p) => ({
      label: `FY${p.year}`,
      year: p.year,
      weighted_bn: p.weighted_lcu_bn,
      yoy: p.yoy_weighted_pct,
    }));
  }, [data]);

  // Top 5 components by latest year value
  const topComponentKeys = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.component_trends].sort((a, b) => {
      const la = a.series[a.series.length - 1]?.weighted_lcu_bn ?? 0;
      const lb = b.series[b.series.length - 1]?.weighted_lcu_bn ?? 0;
      return lb - la;
    });
    return sorted.slice(0, 5).map((c) => c.component);
  }, [data]);

  // Component share chart data
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

  // Calculate trend direction
  const trendDirection = useMemo(() => {
    if (!data || data.national_trend.length < 2) return null;
    const lastYoy = data.national_trend[data.national_trend.length - 1]?.yoy_weighted_pct;
    if (lastYoy == null) return null;
    return lastYoy > 0 ? 'up' : lastYoy < 0 ? 'down' : 'flat';
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--rw-blue)] mr-2" />
          <span className="text-sm text-gray-500">Loading budget data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center min-h-[200px] text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
          <p className="text-sm text-gray-600">
            {error || 'No mapped budget data available. Run budget mapping first.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const latestValue = data.national_trend[data.national_trend.length - 1]?.weighted_lcu_bn ?? 0;
  const latestYoy = data.national_trend[data.national_trend.length - 1]?.yoy_weighted_pct;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-base">
              <BarChart3 className="h-5 w-5 text-[var(--rw-blue)]" />
              <span>Budget Analysis</span>
            </CardTitle>
            {view === 'total' && trendDirection && (
              <div className={`sm:hidden flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                trendDirection === 'up' ? 'bg-emerald-50 text-emerald-700' :
                trendDirection === 'down' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
              }`}>
                {trendDirection === 'up' ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : trendDirection === 'down' ? (
                  <TrendingDown className="h-3.5 w-3.5" />
                ) : null}
                <span>
                  {latestYoy != null ? `${latestYoy > 0 ? '+' : ''}${latestYoy.toFixed(1)}%` : ''}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setView('total')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                  view === 'total'
                    ? 'bg-[var(--rw-blue)] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                Total
              </button>
              <button
                type="button"
                onClick={() => setView('components')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 flex items-center gap-1 ${
                  view === 'components'
                    ? 'bg-[var(--rw-blue)] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <PieChart className="h-3 w-3" />
                Components
              </button>
              <button
                type="button"
                onClick={() => setView('insights')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 flex items-center gap-1 ${
                  view === 'insights'
                    ? 'bg-[var(--rw-blue)] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Lightbulb className="h-3 w-3" />
                Insights
              </button>
            </div>
            {view === 'total' && trendDirection && (
              <div className={`hidden sm:flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                trendDirection === 'up' ? 'bg-emerald-50 text-emerald-700' :
                trendDirection === 'down' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
              }`}>
                {trendDirection === 'up' ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : trendDirection === 'down' ? (
                  <TrendingDown className="h-3.5 w-3.5" />
                ) : null}
                <span>
                  {latestYoy != null ? `${latestYoy > 0 ? '+' : ''}${latestYoy.toFixed(1)}% YoY` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {view === 'total' && 'National weighted budget allocations over time (billions LCU)'}
          {view === 'components' && 'Top 5 components share of national budget over time'}
          {view === 'insights' && 'Policy-relevant insights from budget composition analysis'}
        </p>
      </CardHeader>
      <CardContent>
        {/* Summary stats - show for total view */}
        {view === 'total' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4 pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Latest Total</p>
                <p className="text-lg font-semibold text-gray-900">
                  {latestValue.toFixed(2)} bn
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">CAGR</p>
                <p className="text-lg font-semibold text-gray-900">
                  {data.metrics.cagr_weighted_pct != null
                    ? `${data.metrics.cagr_weighted_pct > 0 ? '+' : ''}${data.metrics.cagr_weighted_pct}%`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Period</p>
                <p className="text-lg font-semibold text-gray-900">
                  FY{data.scope.start_year}–{data.scope.end_year}
                </p>
              </div>
            </div>

            {/* National Total Chart */}
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}`} />
                  <Tooltip
                    formatter={(value) => {
                      const n = typeof value === 'number' ? value : Number(value);
                      return [Number.isFinite(n) ? `${n.toFixed(4)} bn LCU` : '—', 'Weighted Total'];
                    }}
                    labelClassName="font-medium"
                  />
                  <Line
                    type="monotone"
                    dataKey="weighted_bn"
                    name="Weighted Total"
                    stroke="var(--rw-blue)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--rw-blue)' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Components Share Chart */}
        {view === 'components' && (
          <>
            {/* Component share drift summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4 pb-3 border-b border-gray-100">
              {data.component_share_drift.slice(0, 5).map((drift, idx) => (
                <div key={drift.component} className="text-center p-2 rounded-lg bg-gray-50">
                  <p className="text-[10px] text-gray-500 truncate" title={componentLabel(drift.component)}>
                    {componentLabel(drift.component)}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {drift.share_last_year_pct.toFixed(1)}%
                  </p>
                  <p className={`text-[10px] font-medium ${
                    drift.ppt_change > 0 ? 'text-emerald-600' : drift.ppt_change < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {drift.ppt_change > 0 ? '+' : ''}{drift.ppt_change.toFixed(1)} ppt
                  </p>
                </div>
              ))}
            </div>

            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={componentShareChartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, '']} />
                  <Legend
                    wrapperStyle={{ fontSize: '10px' }}
                    formatter={(value) => componentLabel(value)}
                  />
                  {topComponentKeys.map((comp, i) => (
                    <Line
                      key={comp}
                      type="monotone"
                      dataKey={comp}
                      name={comp}
                      stroke={COMP_LINE_COLORS[i % COMP_LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Key Insights */}
        {view === 'insights' && (
          <div className="space-y-4">
            {/* Key metrics summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 border-b border-gray-100">
              <div className="p-2 rounded-lg bg-blue-50">
                <p className="text-[10px] text-blue-600 font-medium">CAGR</p>
                <p className="text-sm font-bold text-blue-900">
                  {data.metrics.cagr_weighted_pct != null
                    ? `${data.metrics.cagr_weighted_pct > 0 ? '+' : ''}${data.metrics.cagr_weighted_pct}%`
                    : '—'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50">
                <p className="text-[10px] text-amber-600 font-medium">Volatility</p>
                <p className="text-sm font-bold text-amber-900">
                  {data.metrics.volatility_yoy_weighted_pp} pp
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-50">
                <p className="text-[10px] text-purple-600 font-medium">Concentration (HHI)</p>
                <p className="text-sm font-bold text-purple-900">
                  {data.metrics.hhi_last_year?.toFixed(0) ?? '—'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-gray-50">
                <p className="text-[10px] text-gray-600 font-medium">Data Span</p>
                <p className="text-sm font-bold text-gray-900">
                  {data.scope.years.length} years
                </p>
              </div>
            </div>

            {/* Insights list */}
            <ul className="space-y-2 max-h-[200px] overflow-y-auto">
              {data.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--rw-blue)]/10 text-[var(--rw-blue)] flex items-center justify-center text-xs font-medium">
                    {i + 1}
                  </span>
                  <span>{insight}</span>
                </li>
              ))}
              {data.insights.length === 0 && (
                <li className="text-sm text-gray-500 italic">No insights available for this period.</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
