/**
 * FSFVI Allocation Efficiency Component
 * =======================================
 * Analyzes current budget allocation efficiency and identifies under/over-allocated components
 *
 * CRITICAL: Government-level system where livelihoods depend on optimal
 * resource allocation decisions for food security.
 *
 * Pattern Reference: components/assessment/AssessmentOverview.tsx
 * API: lib/fsfviApi/budgetOptimizationApi.ts
 * Types: lib/types/budgetOptimization.ts
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Target,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import govBudgetOptimizationAPI from '@/lib/fsfviApi/budgetOptimizationApi';
import type { AllocationEfficiencyReport } from '@/lib/types/budgetOptimization';
import {
  COMPONENT_DISPLAY_NAMES,
  ALLOCATION_STATUS_COLORS,
  formatCurrency,
  formatCurrencyMillions,
  formatCurrencyBillions,
  formatPercentage,
} from '@/lib/types/budgetOptimization';

interface AllocationEfficiencyProps {
  fiscalYear: number;
  onFiscalYearChange: (year: number) => void;
}

export function AllocationEfficiency({ fiscalYear, onFiscalYearChange }: AllocationEfficiencyProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AllocationEfficiencyReport | null>(null);

  /**
   * Load allocation efficiency analysis from government database
   * CRITICAL: Real data only - fetches from fsfvi_data table
   */
  const loadEfficiencyData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[AllocationEfficiency] Analyzing efficiency for FY ${fiscalYear}`);

      // CRITICAL: Fetch real data from government database via backend API
      const result = await govBudgetOptimizationAPI.analyzeAllocationEfficiency(fiscalYear);

      console.log(`[AllocationEfficiency] Analysis complete:`, {
        current_fsfvi: result.current_fsfvi,
        improvement_potential: result.improvement_potential,
        components: result.reallocation_analysis.length,
      });

      setReport(result);
    } catch (err: any) {
      console.error('[AllocationEfficiency] Failed to analyze efficiency:', err);

      // User-friendly error messages
      if (err.response?.data?.message?.includes('No validated data')) {
        setError(
          `No validated component data found for FY ${fiscalYear}. Please ensure financial data is entered and validated in the system.`
        );
      } else if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again to access budget optimization.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to run budget optimization analysis.');
      } else {
        setError(
          err.response?.data?.message || err.message || 'Failed to load efficiency data. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEfficiencyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear]);

  // Loading state
  if (isLoading && !report) {
    return (
      <Card className="border-2 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
              </div>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 relative z-10" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">Analyzing Budget Allocation Efficiency</p>
              <p className="text-sm text-gray-600">
                Evaluating resource allocation from government database...
              </p>
              <p className="text-xs text-gray-500 font-mono">FY {fiscalYear}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !report) {
    return (
      <Alert variant="destructive" className="border-2 shadow-lg animate-in fade-in duration-300">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription className="font-medium text-base">{error}</AlertDescription>
      </Alert>
    );
  }

  // No data state
  if (!report) return null;

  // Count allocation statuses
  const underAllocated = report.reallocation_analysis.filter((c) =>
    c.status.toLowerCase().includes('under')
  ).length;
  const overAllocated = report.reallocation_analysis.filter((c) =>
    c.status.toLowerCase().includes('over')
  ).length;
  const optimal = report.reallocation_analysis.filter((c) =>
    c.status.toLowerCase().includes('optimal')
  ).length;

  // Success state - render efficiency analysis
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Configuration Controls */}
      <Card className="border-2 border-blue-300 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Analysis Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Fiscal Year Selection */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Fiscal Year
              </label>
              <Select value={fiscalYear.toString()} onValueChange={(v) => onFiscalYearChange(parseInt(v))}>
                <SelectTrigger className="border-2 border-blue-300 font-semibold text-gray-900 hover:border-blue-500 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2021">FY 2021</SelectItem>
                  <SelectItem value="2022">FY 2022</SelectItem>
                  <SelectItem value="2023">FY 2023</SelectItem>
                  <SelectItem value="2024">FY 2024</SelectItem>
                  <SelectItem value="2025">FY 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Button */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 uppercase tracking-wide">Actions</label>
              <Button
                onClick={loadEfficiencyData}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Analysis
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Current FSFVI */}
        <Card className="border-2 border-indigo-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">
              Current FSFVI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-black text-indigo-900">
                {report.current_fsfvi.toFixed(6)}
              </p>
              <p className="text-xs text-gray-600">Vulnerability Index</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Budget */}
        <Card className="border-2 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Total Budget
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-black text-blue-900">
                {report.total_budget >= 1_000_000_000
                  ? formatCurrencyBillions(report.total_budget)
                  : formatCurrencyMillions(report.total_budget)}
              </p>
              <p className="text-xs text-gray-600">{formatCurrency(report.total_budget)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Improvement Potential */}
        <Card className="border-2 border-green-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Improvement Potential
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-black text-green-900">
                {report.improvement_potential.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-600">Through reallocation</p>
            </div>
          </CardContent>
        </Card>

        {/* Allocation Concentration */}
        <Card className="border-2 border-purple-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">
              Allocation Concentration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-black text-purple-900">
                {report.allocation_concentration.toFixed(3)}
              </p>
              <p className="text-xs text-gray-600">Herfindahl Index</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Allocation Status Summary */}
      <Card className="border-2 border-gray-300 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Allocation Status Summary
          </CardTitle>
          <CardDescription>Component allocation efficiency breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpCircle className="h-5 w-5 text-red-600" />
                <span className="font-bold text-red-900">Under-Allocated</span>
              </div>
              <p className="text-3xl font-black text-red-900">{underAllocated}</p>
              <p className="text-sm text-red-700 mt-1">Components need more funding</p>
            </div>

            <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownCircle className="h-5 w-5 text-orange-600" />
                <span className="font-bold text-orange-900">Over-Allocated</span>
              </div>
              <p className="text-3xl font-black text-orange-900">{overAllocated}</p>
              <p className="text-sm text-orange-700 mt-1">Components have excess funding</p>
            </div>

            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-bold text-green-900">Optimal</span>
              </div>
              <p className="text-3xl font-black text-green-900">{optimal}</p>
              <p className="text-sm text-green-700 mt-1">Components properly funded</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      {report.key_insights.length > 0 && (
        <Card className="border-2 border-yellow-300 shadow-lg bg-gradient-to-br from-yellow-50 to-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Key Insights
            </CardTitle>
            <CardDescription>Critical findings from allocation efficiency analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.key_insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-yellow-200">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-6 h-6 rounded-full bg-yellow-100 border-2 border-yellow-400 flex items-center justify-center">
                      <span className="text-xs font-bold text-yellow-700">{index + 1}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed flex-1">{insight}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Component Allocation Analysis Table */}
      <Card className="border-2 border-gray-300 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Component Allocation Analysis
          </CardTitle>
          <CardDescription>
            Detailed breakdown of {report.reallocation_analysis.length} food system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left p-3 font-bold text-gray-900 uppercase text-xs">Component</th>
                  <th className="text-right p-3 font-bold text-gray-900 uppercase text-xs">Current</th>
                  <th className="text-right p-3 font-bold text-gray-900 uppercase text-xs">Recommended</th>
                  <th className="text-right p-3 font-bold text-gray-900 uppercase text-xs">Change</th>
                  <th className="text-right p-3 font-bold text-gray-900 uppercase text-xs">Efficiency</th>
                  <th className="text-center p-3 font-bold text-gray-900 uppercase text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.reallocation_analysis.map((component, index) => {
                  const statusColors = ALLOCATION_STATUS_COLORS[component.status] || ALLOCATION_STATUS_COLORS.optimal;
                  const isIncrease = component.percent_change > 0;

                  return (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <span className="font-semibold text-gray-900">
                          {COMPONENT_DISPLAY_NAMES[component.component_type] || component.component_type}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="space-y-0.5">
                          <p className="font-mono text-sm text-gray-900">
                            {formatCurrencyMillions(component.current_allocation)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(component.current_allocation)}
                          </p>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="space-y-0.5">
                          <p className="font-mono text-sm text-gray-900 font-semibold">
                            {formatCurrencyMillions(component.recommended_allocation)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(component.recommended_allocation)}
                          </p>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="space-y-0.5">
                          <p className={`font-mono text-sm font-bold ${isIncrease ? 'text-green-700' : 'text-red-700'}`}>
                            {formatPercentage(component.percent_change)}
                          </p>
                          <p className={`text-xs ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrencyMillions(Math.abs(component.difference))}
                          </p>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-mono text-sm text-gray-900">
                          {component.efficiency_score.toFixed(3)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}
                        >
                          {component.status.replace('-', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
