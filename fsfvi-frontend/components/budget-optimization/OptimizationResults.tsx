/**
 * FSFVI Optimization Results Component
 * ======================================
 * Displays Linear Programming optimization results with mathematical guarantees
 *
 * CRITICAL: Government-level system where livelihoods depend on optimal
 * resource allocation decisions for food security.
 *
 * Pattern Reference: components/assessment/ActionPriorities.tsx
 * API: lib/fsfviApi/budgetOptimizationApi.ts
 * Types: lib/types/budgetOptimization.ts
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Zap,
  TrendingUp,
  CheckCircle2,
  XCircle,
  BarChart3,
  Target,
  DollarSign,
  Activity,
} from 'lucide-react';
import govBudgetOptimizationAPI from '@/lib/fsfviApi/budgetOptimizationApi';
import type {
  OptimizationResult,
  OptimizationConstraints,
  OptimizationObjectiveString,
} from '@/lib/types/budgetOptimization';
import {
  COMPONENT_DISPLAY_NAMES,
  OPTIMIZATION_OBJECTIVE_DISPLAY_NAMES,
  OPTIMIZATION_OBJECTIVE_DESCRIPTIONS,
  formatCurrency,
  formatCurrencyMillions,
  formatPercentage,
} from '@/lib/types/budgetOptimization';

interface OptimizationResultsProps {
  fiscalYear: number;
  objective: OptimizationObjectiveString;
  onFiscalYearChange: (year: number) => void;
  onObjectiveChange: (objective: OptimizationObjectiveString) => void;
}

export function OptimizationResults({
  fiscalYear,
  objective,
  onFiscalYearChange,
  onObjectiveChange,
}: OptimizationResultsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  // Constraint configuration
  const [minAllocation, setMinAllocation] = useState<number>(1_000_000); // $1M default
  const [maxChangePercent, setMaxChangePercent] = useState<number>(25); // 25% default

  /**
   * Run Linear Programming optimization
   * CRITICAL: Uses mathematical optimization to find provably optimal allocations
   */
  const runOptimization = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[OptimizationResults] Running optimization for FY ${fiscalYear}`, {
        objective,
        minAllocation,
        maxChangePercent,
      });

      const constraints: OptimizationConstraints = {
        min_allocation_per_component: minAllocation,
        max_change_percent: maxChangePercent,
        implementation_months: 12,
      };

      // CRITICAL: Fetch real data from government database via backend API
      const optimizationResult = await govBudgetOptimizationAPI.optimizeAllocation(
        fiscalYear,
        undefined,
        objective,
        constraints
      );

      console.log(`[OptimizationResults] Optimization complete:`, {
        baseline_fsfvi: optimizationResult.baseline_fsfvi,
        optimized_fsfvi: optimizationResult.optimized_fsfvi,
        improvement: optimizationResult.improvement,
        convergence: optimizationResult.convergence_achieved,
        iterations: optimizationResult.iterations_performed,
      });

      setResult(optimizationResult);
    } catch (err: any) {
      console.error('[OptimizationResults] Optimization failed:', err);

      // User-friendly error messages
      if (err.response?.data?.message?.includes('No validated data')) {
        setError(
          `No validated component data found for FY ${fiscalYear}. Please ensure financial data is entered and validated in the system.`
        );
      } else if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again to access budget optimization.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to run budget optimization.');
      } else {
        setError(
          err.response?.data?.message || err.message || 'Failed to run optimization. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runOptimization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear, objective]);

  // Loading state
  if (isLoading && !result) {
    return (
      <Card className="border-2 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-orange-200 rounded-full animate-pulse"></div>
              </div>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-orange-600 relative z-10" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">Running Linear Programming Optimization</p>
              <p className="text-sm text-gray-600">
                Computing mathematically optimal budget allocations...
              </p>
              <p className="text-xs text-gray-500 font-mono">
                FY {fiscalYear} • {OPTIMIZATION_OBJECTIVE_DISPLAY_NAMES[objective]}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !result) {
    return (
      <Alert variant="destructive" className="border-2 shadow-lg animate-in fade-in duration-300">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription className="font-medium text-base">{error}</AlertDescription>
      </Alert>
    );
  }

  // No data state
  if (!result) return null;

  const improvementPercent = ((result.improvement / result.baseline_fsfvi) * 100);

  // Success state - render optimization results
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Configuration Controls */}
      <Card className="border-2 border-orange-300 shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            Optimization Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {/* Fiscal Year Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Fiscal Year
              </Label>
              <Select value={fiscalYear.toString()} onValueChange={(v) => onFiscalYearChange(parseInt(v))}>
                <SelectTrigger className="border-2 border-orange-300 font-semibold">
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

            {/* Optimization Objective */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Objective
              </Label>
              <Select value={objective} onValueChange={(v) => onObjectiveChange(v as OptimizationObjectiveString)}>
                <SelectTrigger className="border-2 border-orange-300 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimize_fsfvi">Minimize FSFVI</SelectItem>
                  <SelectItem value="maximize_efficiency">Maximize Efficiency</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600">{OPTIMIZATION_OBJECTIVE_DESCRIPTIONS[objective]}</p>
            </div>

            {/* Min Allocation Constraint */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Min Allocation
              </Label>
              <Input
                type="number"
                value={minAllocation}
                onChange={(e) => setMinAllocation(Number(e.target.value))}
                className="border-2 border-orange-300 font-mono"
                step={100000}
                min={0}
              />
              <p className="text-xs text-gray-600">{formatCurrencyMillions(minAllocation)}</p>
            </div>

            {/* Max Change Constraint */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Max Change %
              </Label>
              <Input
                type="number"
                value={maxChangePercent}
                onChange={(e) => setMaxChangePercent(Number(e.target.value))}
                className="border-2 border-orange-300 font-mono"
                step={5}
                min={0}
                max={100}
              />
              <p className="text-xs text-gray-600">Maximum {maxChangePercent}% change</p>
            </div>

            {/* Optimize Button */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-900 uppercase tracking-wide">Actions</Label>
              <Button
                onClick={runOptimization}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold shadow-lg"
              >
                <Zap className={`h-4 w-4 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
                Re-Optimize
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Convergence Status Alert */}
      <Alert
        variant={result.convergence_achieved ? 'default' : 'destructive'}
        className="border-2 shadow-lg"
      >
        {result.convergence_achieved ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5" />
        )}
        <AlertDescription className="font-medium text-base">
          {result.convergence_achieved ? (
            <span className="text-green-900">
              ✓ Optimization converged successfully after {result.iterations_performed} iterations.
              Results are mathematically optimal.
            </span>
          ) : (
            <span>
              ⚠ Optimization did not fully converge. Results may be suboptimal. Consider adjusting constraints
              or try a different objective.
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Baseline FSFVI */}
        <Card className="border-2 border-red-200 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">
              Baseline FSFVI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-red-900">{result.baseline_fsfvi.toFixed(6)}</p>
            <p className="text-xs text-gray-600">Current vulnerability</p>
          </CardContent>
        </Card>

        {/* Optimized FSFVI */}
        <Card className="border-2 border-green-200 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">
              Optimized FSFVI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-green-900">{result.optimized_fsfvi.toFixed(6)}</p>
            <p className="text-xs text-gray-600">After optimization</p>
          </CardContent>
        </Card>

        {/* Improvement */}
        <Card className="border-2 border-blue-200 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Improvement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-blue-900">{improvementPercent.toFixed(1)}%</p>
            <p className="text-xs text-gray-600">Absolute: {result.improvement.toFixed(6)}</p>
          </CardContent>
        </Card>

        {/* Iterations */}
        <Card className="border-2 border-purple-200 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Iterations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-purple-900">{result.iterations_performed}</p>
            <p className="text-xs text-gray-600">Optimization cycles</p>
          </CardContent>
        </Card>
      </div>

      {/* Objective Information */}
      <Card className="border-2 border-blue-300 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Optimization Objective
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-600 text-white font-bold text-sm rounded-full">
                {OPTIMIZATION_OBJECTIVE_DISPLAY_NAMES[objective]}
              </span>
              {result.convergence_achieved && (
                <span className="flex items-center gap-1 text-green-700 font-semibold text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Mathematically Optimal Solution
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {OPTIMIZATION_OBJECTIVE_DESCRIPTIONS[objective]}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Optimal Allocations */}
      <Card className="border-2 border-gray-300 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-600" />
            Optimal Budget Allocations
          </CardTitle>
          <CardDescription>
            Linear Programming solution for {Object.keys(result.optimal_allocations).length} components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(result.optimal_allocations)
              .sort(([, a], [, b]) => b - a) // Sort by allocation descending
              .map(([componentType, allocation]) => {
                const totalBudget = Object.values(result.optimal_allocations).reduce((sum, val) => sum + val, 0);
                const percentOfTotal = (allocation / totalBudget) * 100;

                return (
                  <div
                    key={componentType}
                    className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-900">
                          {COMPONENT_DISPLAY_NAMES[componentType] || componentType}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">{componentType}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg font-bold text-orange-900">
                          {formatCurrencyMillions(allocation)}
                        </p>
                        <p className="text-xs text-gray-600">{formatCurrency(allocation)}</p>
                      </div>
                    </div>
                    {/* Progress bar showing percentage of total budget */}
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-600 to-red-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentOfTotal}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 text-right">
                        {percentOfTotal.toFixed(1)}% of total budget
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Statistics */}
      <Card className="border-2 border-gray-300 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Optimization Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-bold text-gray-700 mb-2">Algorithm Performance</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">Iterations:</span>
                  <span className="text-xs font-mono font-semibold">{result.iterations_performed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">Convergence:</span>
                  <span className={`text-xs font-semibold ${result.convergence_achieved ? 'text-green-700' : 'text-red-700'}`}>
                    {result.convergence_achieved ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">Objective:</span>
                  <span className="text-xs font-semibold">{OPTIMIZATION_OBJECTIVE_DISPLAY_NAMES[objective]}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-bold text-gray-700 mb-2">Improvement Metrics</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">Baseline FSFVI:</span>
                  <span className="text-xs font-mono font-semibold">{result.baseline_fsfvi.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">Optimized FSFVI:</span>
                  <span className="text-xs font-mono font-semibold text-green-700">{result.optimized_fsfvi.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">Absolute Improvement:</span>
                  <span className="text-xs font-mono font-semibold text-blue-700">{result.improvement.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">Percent Improvement:</span>
                  <span className="text-xs font-mono font-semibold text-blue-700">{improvementPercent.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
