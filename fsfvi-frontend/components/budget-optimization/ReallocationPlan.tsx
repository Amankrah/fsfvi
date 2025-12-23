/**
 * FSFVI Reallocation Plan Component
 * ===================================
 * Displays step-by-step budget reallocation implementation plan
 *
 * CRITICAL: Government-level system where livelihoods depend on optimal
 * resource allocation decisions for food security.
 *
 * Pattern Reference: components/assessment/ComponentInsights.tsx
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
  Target,
  TrendingUp,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
} from 'lucide-react';
import govBudgetOptimizationAPI from '@/lib/fsfviApi/budgetOptimizationApi';
import type { ReallocationPlan, OptimizationConstraints } from '@/lib/types/budgetOptimization';
import {
  COMPONENT_DISPLAY_NAMES,
  RISK_PRIORITY_COLORS,
  formatCurrency,
  formatCurrencyMillions,
  formatCurrencyBillions,
  formatPercentage,
} from '@/lib/types/budgetOptimization';

interface ReallocationPlanProps {
  fiscalYear: number;
  onFiscalYearChange: (year: number) => void;
}

export function ReallocationPlan({ fiscalYear, onFiscalYearChange }: ReallocationPlanProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ReallocationPlan | null>(null);

  // CRITICAL: Optimization objective - government decision point
  const [objective, setObjective] = useState<'minimize_fsfvi' | 'maximize_efficiency' | 'balanced'>('minimize_fsfvi');

  // Constraint configuration
  const [minAllocation, setMinAllocation] = useState<number>(1_000_000); // $1M default
  const [maxChangePercent, setMaxChangePercent] = useState<number>(30); // 30% default

  /**
   * Load reallocation plan from government database
   * CRITICAL: Real data only - fetches from fsfvi_data table
   */
  const loadReallocationPlan = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[ReallocationPlan] Generating plan for FY ${fiscalYear}`, {
        objective,
        minAllocation,
        maxChangePercent,
      });

      const constraints: OptimizationConstraints = {
        min_allocation_per_component: minAllocation,
        max_change_percent: maxChangePercent,
        implementation_months: 12, // Default 12-month plan
      };

      // CRITICAL: Fetch real data from government database via backend API
      // Pass optimization objective chosen by government officials
      const result = await govBudgetOptimizationAPI.generateReallocationPlan(
        fiscalYear,
        undefined,
        objective, // ← CRITICAL: Government chooses optimization strategy
        constraints
      );

      console.log(`[ReallocationPlan] Plan generated:`, {
        baseline_fsfvi: result.baseline_fsfvi,
        estimated_fsfvi: result.estimated_fsfvi_after_reallocation,
        improvement: result.expected_improvement_percent,
        phases: result.implementation_phases.length,
      });

      setPlan(result);
    } catch (err: any) {
      console.error('[ReallocationPlan] Failed to generate plan:', err);

      // User-friendly error messages
      if (err.response?.data?.message?.includes('No validated data')) {
        setError(
          `No validated component data found for FY ${fiscalYear}. Please ensure financial data is entered and validated in the system.`
        );
      } else if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again to access budget optimization.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to generate reallocation plans.');
      } else {
        setError(
          err.response?.data?.message || err.message || 'Failed to load reallocation plan. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReallocationPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear, objective, minAllocation, maxChangePercent]);

  // Loading state
  if (isLoading && !plan) {
    return (
      <Card className="border-2 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-pulse"></div>
              </div>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600 relative z-10" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">Generating Reallocation Plan</p>
              <p className="text-sm text-gray-600">
                Creating step-by-step implementation roadmap...
              </p>
              <p className="text-xs text-gray-500 font-mono">FY {fiscalYear}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !plan) {
    return (
      <Alert variant="destructive" className="border-2 shadow-lg animate-in fade-in duration-300">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription className="font-medium text-base">{error}</AlertDescription>
      </Alert>
    );
  }

  // No data state
  if (!plan) return null;

  // Success state - render reallocation plan
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Configuration Controls */}
      <Card className="border-2 border-purple-300 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Plan Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* CRITICAL: Optimization Objective Selection - Government Policy Decision */}
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
              <Label className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3 block">
                ⚠️ Optimization Objective (Policy Decision)
              </Label>
              <Select value={objective} onValueChange={(v: any) => setObjective(v)}>
                <SelectTrigger className="border-2 border-amber-400 font-semibold text-gray-900 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimize_fsfvi">
                    <div className="py-1">
                      <div className="font-bold text-red-900">Minimize FSFVI (Reduce Vulnerability)</div>
                      <div className="text-xs text-gray-600">Focus on reducing food system risk</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="maximize_efficiency">
                    <div className="py-1">
                      <div className="font-bold text-blue-900">Maximize Efficiency (Best ROI)</div>
                      <div className="text-xs text-gray-600">Optimize return on investment</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="balanced">
                    <div className="py-1">
                      <div className="font-bold text-green-900">Balanced Risk (Moderate Approach)</div>
                      <div className="text-xs text-gray-600">Balance vulnerability and efficiency</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-amber-800 mt-2 leading-relaxed">
                <strong>Critical:</strong> Different objectives produce different allocations. This is a policy decision that affects millions of lives.
              </p>
            </div>

            {/* Constraint Configuration */}
            <div className="grid gap-4 md:grid-cols-4">
              {/* Fiscal Year Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Fiscal Year
                </Label>
                <Select value={fiscalYear.toString()} onValueChange={(v) => onFiscalYearChange(parseInt(v))}>
                  <SelectTrigger className="border-2 border-purple-300 font-semibold">
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

            {/* Min Allocation Constraint */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Min Allocation
              </Label>
              <Input
                type="number"
                value={minAllocation}
                onChange={(e) => setMinAllocation(Number(e.target.value))}
                className="border-2 border-purple-300 font-mono"
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
                className="border-2 border-purple-300 font-mono"
                step={5}
                min={0}
                max={100}
              />
              <p className="text-xs text-gray-600">Maximum {maxChangePercent}% change</p>
            </div>

            {/* Generate Button */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-900 uppercase tracking-wide">Actions</Label>
              <Button
                onClick={loadReallocationPlan}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-lg"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
          </div> {/* Close grid */}
          </div> {/* Close space-y-6 */}
        </CardContent>
      </Card>

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
            <p className="text-3xl font-black text-red-900">{plan.baseline_fsfvi.toFixed(6)}</p>
            <p className="text-xs text-gray-600">Current vulnerability</p>
          </CardContent>
        </Card>

        {/* Estimated FSFVI After Reallocation */}
        <Card className="border-2 border-green-200 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">
              After Reallocation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-green-900">
              {plan.estimated_fsfvi_after_reallocation.toFixed(6)}
            </p>
            <p className="text-xs text-gray-600">Projected vulnerability</p>
          </CardContent>
        </Card>

        {/* Expected Improvement */}
        <Card className="border-2 border-blue-200 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Improvement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-blue-900">
              {plan.expected_improvement_percent.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600">
              {formatPercentage(plan.expected_improvement_percent, 2)} reduction
            </p>
          </CardContent>
        </Card>

        {/* Total Budget */}
        <Card className="border-2 border-purple-200 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">
              Total Budget
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-purple-900">
              {formatCurrencyBillions(plan.total_budget)}
            </p>
            <p className="text-xs text-gray-600">{formatCurrency(plan.total_budget)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Optimal Allocations */}
      <Card className="border-2 border-gray-300 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Optimal Budget Allocations
          </CardTitle>
          <CardDescription>
            Recommended allocation for {Object.keys(plan.optimal_allocations).length} components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(plan.optimal_allocations).map(([componentType, allocation]) => (
              <div
                key={componentType}
                className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">
                      {COMPONENT_DISPLAY_NAMES[componentType] || componentType}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">{componentType}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-bold text-purple-900">
                      {formatCurrencyMillions(allocation)}
                    </p>
                    <p className="text-xs text-gray-600">{formatCurrency(allocation)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Implementation Phases */}
      <Card className="border-2 border-blue-300 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Implementation Phases
          </CardTitle>
          <CardDescription>
            {plan.implementation_phases.length}-phase rollout plan for budget reallocation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plan.implementation_phases.map((phase) => (
              <div
                key={phase.phase_number}
                className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl"
              >
                <div className="flex items-start gap-4">
                  {/* Phase Number Badge */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                      <span className="text-xl font-black text-white">{phase.phase_number}</span>
                    </div>
                  </div>

                  {/* Phase Details */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-gray-900">
                        Phase {phase.phase_number} • {phase.duration_months} months
                      </span>
                    </div>

                    {/* Phase Allocations */}
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(phase.allocations).map(([componentType, allocation]) => (
                        <div
                          key={componentType}
                          className="px-3 py-2 bg-white border border-blue-200 rounded-lg"
                        >
                          <p className="text-xs font-semibold text-gray-700 truncate">
                            {COMPONENT_DISPLAY_NAMES[componentType] || componentType}
                          </p>
                          <p className="text-sm font-mono font-bold text-blue-900">
                            {formatCurrencyMillions(allocation)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Phase Milestones */}
                    {phase.milestones.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-bold text-gray-900">Key Milestones</span>
                        </div>
                        <ul className="space-y-1 ml-6">
                          {phase.milestones.map((milestone, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-blue-600">•</span>
                              <span>{milestone}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risks and Mitigation */}
      <Card className="border-2 border-orange-300 shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" />
            Risks & Mitigation Strategies
          </CardTitle>
          <CardDescription>
            {plan.risks_and_mitigation.length} identified risks with mitigation plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {plan.risks_and_mitigation.map((item, index) => {
              const priorityColors = RISK_PRIORITY_COLORS[item.priority] || RISK_PRIORITY_COLORS.medium;

              return (
                <div
                  key={index}
                  className="p-4 bg-white border-2 border-orange-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-gray-900">{item.risk}</p>
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold uppercase ${priorityColors.bg} ${priorityColors.text}`}
                        >
                          {item.priority}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 pl-4 border-l-2 border-green-400">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700">{item.mitigation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
