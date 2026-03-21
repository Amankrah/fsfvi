'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { budgetAnalysisAPI } from '@/lib/api/budgetAnalysisApi';
import type { BudgetHistoryPayload } from '@/lib/types/budgetAnalysis';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3, Loader2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export function BudgetTrendCard() {
  const { t } = useLanguage();
  const [data, setData] = useState<BudgetHistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <span className="text-sm text-gray-500">Loading budget trend...</span>
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-base">
            <BarChart3 className="h-5 w-5 text-[var(--rw-blue)]" />
            <span>{t('budget_page.chart_national_title') || 'National Mapped Total (weighted)'}</span>
          </CardTitle>
          {trendDirection && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
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
        <p className="text-xs text-gray-500 mt-1">
          {t('budget_page.chart_national_help') || 'Sum of indicator weighted allocations in billions LCU.'}
        </p>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
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

        {/* Chart */}
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
      </CardContent>
    </Card>
  );
}
