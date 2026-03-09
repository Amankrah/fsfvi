/**
 * Historical Trends Component
 * ============================
 * Interface for analyzing multi-year historical data for evidence-based planning
 *
 * CRITICAL: Government planning must be based on evidence from historical data
 * to inform realistic projections and credible strategic plans
 *
 * Pattern: Automatically fetches and visualizes historical trends on mount
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, TrendingUp, TrendingDown, LineChart as LineChartIcon, RefreshCw, AlertTriangle } from 'lucide-react';
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
import govStrategicPlanningAPI from '@/lib/fsfviApi/strategicPlanningApi';
import type { HistoricalComponent } from '@/lib/types/strategicPlanning';
import { toMillions, formatMillions, COMPONENT_TYPE_LABELS, calculateCAGR } from '@/lib/types/strategicPlanning';

interface HistoricalTrendsProps {
  fiscalYear: number;
}

interface ComponentTrend {
  component_type: string;
  component_label: string;
  years: number[];
  budgets: number[]; // in millions USD
  observed_values: number[];
  benchmark_values: number[];
  budget_cagr: number; // Compound Annual Growth Rate
  performance_trend: 'improving' | 'declining' | 'stable';
}

export function HistoricalTrends({ fiscalYear }: HistoricalTrendsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trends, setTrends] = useState<HistoricalComponent[]>([]);
  const [componentTrends, setComponentTrends] = useState<ComponentTrend[]>([]);

  // CRITICAL: Allow users to configure the time period for trend analysis
  // Government planning requires flexibility: 3-year (MTEF), 5-year (NDP), 10-year (long-term)
  const [yearsToAnalyze, setYearsToAnalyze] = useState<number>(3); // Default: 3 years for MTEF alignment

  const loadHistoricalTrends = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[HistoricalTrends] Fetching ${yearsToAnalyze}-year historical trends ending in FY ${fiscalYear}`);

      // CRITICAL: Fetch real historical data from government database
      // User can configure the time period (3, 5, 10 years) for different planning horizons
      const data = await govStrategicPlanningAPI.fetchHistoricalTrends(fiscalYear, undefined, yearsToAnalyze);

      // DIAGNOSTIC LOGS: Check response structure
      console.log('[HistoricalTrends] Raw data received:', data);
      console.log('[HistoricalTrends] Data type:', typeof data);
      console.log('[HistoricalTrends] Is array:', Array.isArray(data));
      console.log('[HistoricalTrends] Data keys:', data ? Object.keys(data) : 'null');

      if (!data || data.length === 0) {
        setError(
          `No historical data found for FY ${fiscalYear}. Please ensure data is entered for multiple fiscal years.`
        );
        return;
      }

      console.log(`[HistoricalTrends] Loaded ${data.length} historical data points`);

      // Group by component type
      const grouped = data.reduce((acc, comp) => {
        if (!acc[comp.component_type]) {
          acc[comp.component_type] = [];
        }
        acc[comp.component_type].push(comp);
        return acc;
      }, {} as Record<string, HistoricalComponent[]>);

      // Analyze trends for each component
      const analyzed: ComponentTrend[] = Object.entries(grouped).map(([componentType, data]) => {
        // Sort by fiscal year
        const sorted = data.sort((a, b) => a.fiscal_year - b.fiscal_year);

        const years = sorted.map((d) => d.fiscal_year);
        const budgets = sorted.map((d) => toMillions(d.financial_allocation_usd));
        const observedValues = sorted.map((d) => d.observed_value);
        const benchmarkValues = sorted.map((d) => d.benchmark_value);

        // Calculate budget CAGR
        let budgetCagr = 0;
        if (budgets.length >= 2) {
          budgetCagr = calculateCAGR(budgets[0], budgets[budgets.length - 1], budgets.length - 1);
        }

        // Determine performance trend
        let performanceTrend: 'improving' | 'declining' | 'stable' = 'stable';
        if (observedValues.length >= 2) {
          const firstGap = Math.abs(observedValues[0] - benchmarkValues[0]);
          const lastGap = Math.abs(observedValues[observedValues.length - 1] - benchmarkValues[benchmarkValues.length - 1]);
          const improvement = ((firstGap - lastGap) / firstGap) * 100;

          if (improvement > 5) {
            performanceTrend = 'improving';
          } else if (improvement < -5) {
            performanceTrend = 'declining';
          }
        }

        return {
          component_type: componentType,
          component_label: COMPONENT_TYPE_LABELS[componentType] || componentType,
          years,
          budgets,
          observed_values: observedValues,
          benchmark_values: benchmarkValues,
          budget_cagr: budgetCagr,
          performance_trend: performanceTrend,
        };
      });

      setTrends(data);
      setComponentTrends(analyzed);
    } catch (err) {
      console.error('[HistoricalTrends] Failed to fetch trends:', err);

      const error = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      if (error.response?.status === 401) {
        setError('Your session has expired. Please log in again to access historical trends.');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view historical trends.');
      } else {
        setError(error.response?.data?.message || error.message || 'Failed to load historical trends. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistoricalTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear, yearsToAnalyze]); // Reload when fiscal year OR analysis period changes

  // Prepare budget trend chart data
  const budgetTrendData =
    componentTrends.length > 0 && componentTrends[0].years.length > 0
      ? componentTrends[0].years.map((year, idx) => {
          const dataPoint: Record<string, number> = { year };
          componentTrends.forEach((trend) => {
            dataPoint[trend.component_label] = trend.budgets[idx];
          });
          return dataPoint;
        })
      : [];

  // Prepare performance trend chart data
  const performanceTrendData =
    componentTrends.length > 0 && componentTrends[0].years.length > 0
      ? componentTrends[0].years.map((year, idx) => {
          const dataPoint: Record<string, number> = { year };
          componentTrends.forEach((trend) => {
            dataPoint[trend.component_label] = trend.observed_values[idx];
          });
          return dataPoint;
        })
      : [];

  // Loading state
  if (isLoading && trends.length === 0) {
    return (
      <Card className="border-2 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-600" />
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">Loading Historical Trends</p>
              <p className="text-sm text-gray-600">Analyzing multi-year data from government database...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && trends.length === 0) {
    return (
      <Alert variant="destructive" className="border-2 shadow-lg">
        <AlertTriangle className="h-5 w-5" />
        <AlertDescription className="font-medium text-base">{error}</AlertDescription>
      </Alert>
    );
  }

  // No data state
  if (componentTrends.length === 0) {
    return (
      <Alert className="border-2 border-blue-300 shadow-lg">
        <LineChartIcon className="h-5 w-5" />
        <AlertDescription>
          No historical data available. Historical trends require data from multiple fiscal years.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Period Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <LineChartIcon className="h-5 w-5 text-green-600" />
                Historical Trends Analysis
              </CardTitle>
              <CardDescription>
                Multi-year budget and performance trends for evidence-based planning
              </CardDescription>
            </div>

            {/* Time Period Selector */}
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="years-to-analyze" className="text-sm font-medium text-gray-900">
                  Analysis Period (Years)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="years-to-analyze"
                    type="number"
                    min={2}
                    max={10}
                    value={yearsToAnalyze}
                    onChange={(e) => setYearsToAnalyze(parseInt(e.target.value) || 3)}
                    className="w-20 border-2 border-gray-300"
                  />
                  <span className="text-sm text-gray-600">
                    ({fiscalYear - yearsToAnalyze + 1}-{fiscalYear})
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  3-yr: MTEF • 5-yr: NDP • 10-yr: Long-term
                </p>
              </div>

              <Button
                onClick={loadHistoricalTrends}
                disabled={isLoading}
                variant="outline"
                className="border-2 border-green-300 hover:bg-green-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Years of Data</p>
                <p className="text-2xl font-bold text-gray-900">{componentTrends[0]?.years.length || 0}</p>
              </div>
              <LineChartIcon className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Components Tracked</p>
                <p className="text-2xl font-bold text-blue-600">{componentTrends.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Data Points</p>
                <p className="text-2xl font-bold text-green-600">{trends.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Allocation Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Allocation Trends (Millions USD)</CardTitle>
          <CardDescription>Historical budget allocations by component across fiscal years</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={budgetTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" label={{ value: 'Fiscal Year', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Budget ($M)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `$${Number(value).toFixed(0)}M`} />
                <Legend />
                {componentTrends.map((trend, idx) => (
                  <Line
                    key={trend.component_type}
                    type="monotone"
                    dataKey={trend.component_label}
                    stroke={`hsl(${(idx * 360) / componentTrends.length}, 70%, 50%)`}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Component Performance Trends</CardTitle>
          <CardDescription>Observed values over time (closer to benchmark is better)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" label={{ value: 'Fiscal Year', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Observed Value', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                {componentTrends.map((trend, idx) => (
                  <Line
                    key={trend.component_type}
                    type="monotone"
                    dataKey={trend.component_label}
                    stroke={`hsl(${(idx * 360) / componentTrends.length}, 70%, 50%)`}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Component Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle>Component Trend Analysis</CardTitle>
          <CardDescription>Budget growth rates and performance trends by component</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Component</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-900">Years of Data</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-900">Budget CAGR</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-900">Performance Trend</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-900">Latest Budget</th>
                </tr>
              </thead>
              <tbody>
                {componentTrends.map((trend, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{trend.component_label}</td>
                    <td className="text-center py-3 px-4 text-gray-700">{trend.years.length}</td>
                    <td className="text-right py-3 px-4">
                      <span
                        className={`font-semibold ${
                          trend.budget_cagr > 0 ? 'text-green-600' : trend.budget_cagr < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}
                      >
                        {trend.budget_cagr > 0 ? '+' : ''}
                        {trend.budget_cagr.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <Badge
                        variant={
                          trend.performance_trend === 'improving'
                            ? 'default'
                            : trend.performance_trend === 'declining'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {trend.performance_trend === 'improving' && <TrendingUp className="h-3 w-3 mr-1 inline" />}
                        {trend.performance_trend === 'declining' && <TrendingDown className="h-3 w-3 mr-1 inline" />}
                        {trend.performance_trend}
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-4 font-semibold text-blue-600">
                      {formatMillions(trend.budgets[trend.budgets.length - 1])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Evidence-Based Planning Notice */}
      <Alert className="bg-green-50 border-green-300">
        <LineChartIcon className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-900">
          <strong>Evidence-Based Planning:</strong> Use these historical trends to inform realistic budget projections
          and strategic planning assumptions. Budget growth rates and performance trends should guide multi-year plans.
        </AlertDescription>
      </Alert>
    </div>
  );
}
