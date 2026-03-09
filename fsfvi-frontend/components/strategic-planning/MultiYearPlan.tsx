/**
 * Multi-Year Strategic Plan Component
 * =====================================
 * Interface for generating 3-20 year strategic budget plans
 *
 * CRITICAL: Government national development plans where SDG achievement,
 * donor coordination, and long-term food security depend on accurate planning
 *
 * Pattern: Similar to AllocationEfficiency.tsx with form + results visualization
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingDown, Target, Calendar, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react';
import govStrategicPlanningAPI from '@/lib/fsfviApi/strategicPlanningApi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import type {
  MultiYearPlanRequest,
  MultiYearStrategicPlan,
  YearlyPlanChartData,
} from '@/lib/types/strategicPlanning';
import { formatBillions, toBillions } from '@/lib/types/strategicPlanning';

interface MultiYearPlanProps {
  fiscalYear: number;
}

export function MultiYearPlan({ fiscalYear }: MultiYearPlanProps) {
  const [planningYears, setPlanningYears] = useState<number>(5);
  const [targetFsfvi, setTargetFsfvi] = useState<number>(0.25); // Target FSFVI (absolute value, lower is better)
  const [budgetGrowthRate, setBudgetGrowthRate] = useState<number>(0.05);
  const [minAllocation, setMinAllocation] = useState<number>(50);
  const [maxChange, setMaxChange] = useState<number>(30);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<MultiYearStrategicPlan | null>(null);

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[MultiYearPlan] Generating ${planningYears}-year strategic plan for FY ${fiscalYear}`);

      // CRITICAL: Backend fetches components from database - do NOT fetch components manually
      // Pattern: Same as budget optimization API - send fiscal_year, backend fetches components
      // Backend handler: demo_gov_backend/src/handlers/fsfvi_handler.rs:712-719
      // Uses: DataFetcher::fetch_components(&state.db_pool, &user.government_id, fiscal_year, reporting_period)

      // CRITICAL: User sets target FSFVI directly (absolute value)
      // Backend will calculate baseline_fsfvi from database components
      // FSFVI is a vulnerability index where LOWER is BETTER
      console.log(`[MultiYearPlan] Target FSFVI: ${targetFsfvi.toFixed(3)} (lower = less vulnerable)`);

      // Build request for multi-year strategic plan
      // Backend will fetch components from database based on fiscal_year
      const request: MultiYearPlanRequest = {
        fiscal_year: fiscalYear,
        reporting_period: `${fiscalYear}-Annual`,
        planning_years: planningYears,
        target_fsfvi_reduction: targetFsfvi, // Backend expects this field name
        total_budget_ceiling: null, // Optional - can be calculated from growth rate if needed
      };

      console.log('[MultiYearPlan] Sending request to backend:', request);

      // CRITICAL: Call real backend API (NO MOCK DATA)
      // Backend will:
      // 1. Fetch components from database for fiscal_year
      // 2. Calculate baseline_fsfvi from components
      // 3. Generate multi-year plan to achieve target_fsfvi_reduction
      const planResult = await govStrategicPlanningAPI.generateMultiYearPlan(request);

      console.log(`[MultiYearPlan] Plan generated:`, {
        baseline_fsfvi: planResult.baseline_fsfvi,
        target_fsfvi: planResult.target_fsfvi,
        total_investment: planResult.total_additional_investment_needed,
        target_achieved: planResult.target_already_achieved,
      });

      // VERIFICATION LOGS: Check if backend fix resolved the budget issue
      console.log('[MultiYearPlan] FULL PLAN OBJECT:', JSON.stringify(planResult, null, 2));
      console.log('[MultiYearPlan] total_additional_investment_needed type:', typeof planResult.total_additional_investment_needed);
      console.log('[MultiYearPlan] total_additional_investment_needed value:', planResult.total_additional_investment_needed);
      console.log('[MultiYearPlan] total_additional_investment_needed in millions:', planResult.total_additional_investment_needed);
      console.log('[MultiYearPlan] total_additional_investment_needed in billions:', planResult.total_additional_investment_needed / 1000);

      // Log yearly budget progression to verify compound growth
      if (planResult.yearly_plans && planResult.yearly_plans.length > 0) {
        console.log('[MultiYearPlan] Yearly Budget Progression:');
        planResult.yearly_plans.forEach((yp, idx) => {
          const budgetGrowth = idx === 0 ? 0 : ((yp.total_budget / planResult.yearly_plans[0].total_budget - 1) * 100);
          console.log(`  Year ${yp.year}: $${yp.total_budget}M (${budgetGrowth > 0 ? '+' : ''}${budgetGrowth.toFixed(1)}% from Year 1)`);
        });
      }

      setPlan(planResult);
    } catch (err) {
      console.error('[MultiYearPlan] Failed to generate plan:', err);

      // User-friendly error messages
      const error = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      if (error.response?.status === 400 && error.response?.data?.message?.includes('No validated')) {
        setError(
          `No validated component data found for FY ${fiscalYear}. Please ensure financial data is entered and validated in the system.`
        );
      } else if (error.response?.status === 401) {
        setError('Your session has expired. Please log in again to access strategic planning.');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to generate strategic plans.');
      } else if (error.message?.includes('Planning years must be between')) {
        setError(error.message);
      } else {
        setError(
          error.response?.data?.message || error.message || 'Failed to generate strategic plan. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data
  const chartData: YearlyPlanChartData[] = plan?.yearly_plans.map(yp => ({
    year: yp.year,
    targetFSFVI: yp.target_fsfvi,
    projectedFSFVI: yp.projected_fsfvi,
    budget: yp.total_budget, // Backend already returns in millions USD
    onTrack: yp.on_track,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Multi-Year Strategic Plan Configuration
          </CardTitle>
          <CardDescription>
            Generate 3-20 year strategic budget plan for achieving food security targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Planning Years */}
            <div className="space-y-2">
              <Label htmlFor="planning-years">Planning Horizon (years)</Label>
              <Input
                id="planning-years"
                type="number"
                min={3}
                max={20}
                value={planningYears}
                onChange={(e) => setPlanningYears(parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-gray-900">Typical: 5 years (National Plan)</p>
            </div>

            {/* Target FSFVI */}
            <div className="space-y-2">
              <Label htmlFor="target-fsfvi">Target FSFVI</Label>
              <Input
                id="target-fsfvi"
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={targetFsfvi}
                onChange={(e) => setTargetFsfvi(parseFloat(e.target.value) || 0.25)}
              />
              <p className="text-xs text-gray-900">Lower is better (SDG target: &lt;0.20, typical baseline: 0.30-0.40)</p>
            </div>

            {/* Budget Growth Rate */}
            <div className="space-y-2">
              <Label htmlFor="growth-rate">Annual Budget Growth (%)</Label>
              <Input
                id="growth-rate"
                type="number"
                step="1"
                value={(budgetGrowthRate * 100).toFixed(0)}
                onChange={(e) => setBudgetGrowthRate((parseInt(e.target.value) || 5) / 100)}
              />
              <p className="text-xs text-gray-900">Typical: 5% (fiscal space)</p>
            </div>

            {/* Min Allocation */}
            <div className="space-y-2">
              <Label htmlFor="min-allocation">Min Allocation per Component ($M)</Label>
              <Input
                id="min-allocation"
                type="number"
                value={minAllocation}
                onChange={(e) => setMinAllocation(parseInt(e.target.value) || 50)}
              />
              <p className="text-xs text-gray-900">Ensures all sectors maintained</p>
            </div>

            {/* Max Change */}
            <div className="space-y-2">
              <Label htmlFor="max-change">Max Year-to-Year Change (%)</Label>
              <Input
                id="max-change"
                type="number"
                value={maxChange}
                onChange={(e) => setMaxChange(parseInt(e.target.value) || 30)}
              />
              <p className="text-xs text-gray-900">Implementation feasibility</p>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button
                onClick={handleGeneratePlan}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Generate Plan
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {plan && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Baseline FSFVI</p>
                    <p className="text-2xl font-bold text-gray-900">{plan.baseline_fsfvi.toFixed(3)}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Target FSFVI</p>
                    <p className="text-2xl font-bold text-green-600">{plan.target_fsfvi.toFixed(3)}</p>
                  </div>
                  <Target className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Target Reduction</p>
                    <p className="text-2xl font-bold text-green-600">
                      {((plan.baseline_fsfvi - plan.target_fsfvi) / plan.baseline_fsfvi * 100).toFixed(1)}%
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Planning Years</p>
                    <p className="text-2xl font-bold text-blue-600">{plan.planning_years}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Investment</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatBillions(toBillions(plan.total_additional_investment_needed))}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Target Achievement Status */}
          {plan.target_already_achieved && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Target Already Achieved!</strong> Current FSFVI is already at or below target.
                Maintain current trajectory through good governance and continued investment.
              </AlertDescription>
            </Alert>
          )}

          {/* FSFVI Trajectory Chart */}
          {!plan.target_already_achieved && plan.yearly_plans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>FSFVI Reduction Trajectory</CardTitle>
                <CardDescription>
                  Projected vulnerability improvement over {plan.planning_years} years
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'FSFVI Score', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="targetFSFVI"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.1}
                        name="Target FSFVI"
                        strokeDasharray="5 5"
                      />
                      <Area
                        type="monotone"
                        dataKey="projectedFSFVI"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                        name="Projected FSFVI"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget Trajectory Chart */}
          {!plan.target_already_achieved && plan.yearly_plans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Budget Allocation Trajectory</CardTitle>
                <CardDescription>
                  Year-by-year budget requirements (in millions USD)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Budget ($M)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value) => `$${Number(value).toFixed(0)}M`} />
                      <Legend />
                      <Bar dataKey="budget" fill="#8b5cf6" name="Total Budget" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Component Allocations Table */}
          {!plan.target_already_achieved && plan.yearly_plans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Component Budget Allocations</CardTitle>
                <CardDescription>
                  Detailed yearly allocation breakdown by component (in millions USD)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-300 bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Component</th>
                        {plan.yearly_plans.map((yp) => (
                          <th key={yp.year} className="text-right py-3 px-4 font-semibold text-gray-900">
                            Year {yp.year}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(plan.yearly_plans[0].recommended_allocations).map((componentType, idx) => {
                        const label = componentType.split('_').map(word =>
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ');

                        return (
                          <tr key={componentType} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="py-3 px-4 font-medium text-gray-900">{label}</td>
                            {plan.yearly_plans.map((yp) => (
                              <td key={yp.year} className="text-right py-3 px-4 text-gray-700">
                                ${(yp.recommended_allocations[componentType] || 0).toFixed(1)}M
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-gray-300 bg-blue-50 font-bold">
                        <td className="py-3 px-4 text-gray-900">TOTAL</td>
                        {plan.yearly_plans.map((yp) => (
                          <td key={yp.year} className="text-right py-3 px-4 text-blue-700">
                            ${yp.total_budget.toFixed(1)}M
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Implementation Risks */}
          {plan.implementation_risks && plan.implementation_risks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Implementation Risks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {plan.implementation_risks.map((risk, idx) => (
                  <div key={idx} className="border-l-4 border-amber-500 bg-amber-50 p-4 rounded">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-amber-900">{risk.risk_type.replace(/_/g, ' ').toUpperCase()}</h4>
                      <Badge variant={risk.severity === 'high' ? 'destructive' : 'secondary'}>
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-amber-800 mb-2">{risk.description}</p>
                    <p className="text-sm text-amber-700">
                      <strong>Mitigation:</strong> {risk.mitigation}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Success Factors */}
          {plan.success_factors && plan.success_factors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Success Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.success_factors.map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{factor}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
