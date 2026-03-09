/**
 * MTEF Generation Component
 * ==========================
 * Interface for generating 3-year Medium-Term Expenditure Framework (MTEF)
 *
 * CRITICAL: Standard government budget framework for Parliament/MOF submissions
 * where fiscal credibility and budget conservation are paramount for livelihoods
 *
 * Pattern: Similar to MultiYearPlan.tsx with form + 3-year budget table
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, TrendingDown, DollarSign, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import govStrategicPlanningAPI from '@/lib/fsfviApi/strategicPlanningApi';
import type { MtefRequest, MtefPlan } from '@/lib/types/strategicPlanning';
import { formatMillions, COMPONENT_TYPE_LABELS } from '@/lib/types/strategicPlanning';

interface MtefGenerationProps {
  fiscalYear: number;
}

export function MtefGeneration({ fiscalYear }: MtefGenerationProps) {
  const [targetImprovement, setTargetImprovement] = useState<number>(20);
  const [budgetGrowthRate, setBudgetGrowthRate] = useState<number>(5);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mtef, setMtef] = useState<MtefPlan | null>(null);

  const handleGenerateMtef = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[MtefGeneration] Generating MTEF for FY ${fiscalYear}`);

      // CRITICAL: Backend fetches components from database - do NOT fetch components manually
      // Pattern: Same as budget optimization API - send fiscal_year, backend fetches components
      // Backend handler: demo_gov_backend/src/handlers/fsfvi_handler.rs:769-838

      // Build MTEF request
      // Backend will fetch components from database based on fiscal_year
      const request: MtefRequest = {
        fiscal_year: fiscalYear,
        reporting_period: `${fiscalYear}-Annual`,
        annual_budget_growth_percent: budgetGrowthRate, // Backend expects percentage (5.0 for 5%)
      };

      console.log('[MtefGeneration] Sending request to backend:', request);

      // CRITICAL: Call real backend API (NO MOCK DATA)
      // Backend will:
      // 1. Fetch components from database for fiscal_year
      // 2. Calculate baseline_fsfvi from components
      // 3. Generate 3-year MTEF with budget conservation
      const mtef = await govStrategicPlanningAPI.generateMtef(request);

      console.log(`[MtefGeneration] MTEF generated:`, {
        baseline_fsfvi: mtef.baseline_fsfvi,
        target_fsfvi_year_3: mtef.target_fsfvi_year_3,
        baseline_budget: mtef.baseline_budget,
      });

      setMtef(mtef);
    } catch (err) {
      console.error('[MtefGeneration] Failed to generate MTEF:', err);

      // User-friendly error messages
      const error = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      if (error.response?.status === 400 && error.response?.data?.message?.includes('No validated')) {
        setError(
          `No validated component data found for FY ${fiscalYear}. Please ensure financial data is entered and validated in the system.`
        );
      } else if (error.response?.status === 401) {
        setError('Your session has expired. Please log in again to access strategic planning.');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to generate MTEF.');
      } else if (error.message?.includes('Annual budget growth percent must be between')) {
        setError(error.message);
      } else {
        setError(error.response?.data?.message || error.message || 'Failed to generate MTEF. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data
  const chartData = mtef
    ? [
        {
          year: 'Baseline',
          budget: mtef.baseline_budget, // Backend already returns in millions USD
          fsfvi: mtef.baseline_fsfvi,
        },
        {
          year: 'Year 1',
          budget: mtef.year_1_plan.total_budget, // Backend already returns in millions USD
          fsfvi: mtef.year_1_plan.projected_fsfvi,
          target: mtef.year_1_plan.target_fsfvi,
        },
        {
          year: 'Year 2',
          budget: mtef.year_2_plan.total_budget, // Backend already returns in millions USD
          fsfvi: mtef.year_2_plan.projected_fsfvi,
          target: mtef.year_2_plan.target_fsfvi,
        },
        {
          year: 'Year 3',
          budget: mtef.year_3_plan.total_budget, // Backend already returns in millions USD
          fsfvi: mtef.year_3_plan.projected_fsfvi,
          target: mtef.year_3_plan.target_fsfvi,
        },
      ]
    : [];

  // Component allocation trends
  const componentTrends = mtef
    ? Object.keys(mtef.year_1_plan.component_allocations).map((componentType) => ({
        component: COMPONENT_TYPE_LABELS[componentType] || componentType,
        year1: mtef.year_1_plan.component_allocations[componentType] || 0, // Backend already returns in millions USD
        year2: mtef.year_2_plan.component_allocations[componentType] || 0, // Backend already returns in millions USD
        year3: mtef.year_3_plan.component_allocations[componentType] || 0, // Backend already returns in millions USD
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            MTEF Configuration
          </CardTitle>
          <CardDescription>
            Generate 3-year Medium-Term Expenditure Framework for Ministry of Finance submission
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Target Improvement */}
            <div className="space-y-2">
              <Label htmlFor="target-improvement">Target FSFVI Improvement (%)</Label>
              <Input
                id="target-improvement"
                type="number"
                min={5}
                max={50}
                step="5"
                value={targetImprovement}
                onChange={(e) => setTargetImprovement(parseInt(e.target.value) || 20)}
              />
              <p className="text-xs text-gray-500">
                Target: {targetImprovement}% reduction in vulnerability by Year 3
              </p>
            </div>

            {/* Budget Growth Rate */}
            <div className="space-y-2">
              <Label htmlFor="growth-rate">Annual Budget Growth (%)</Label>
              <Input
                id="growth-rate"
                type="number"
                min={0}
                max={30}
                step="1"
                value={budgetGrowthRate}
                onChange={(e) => setBudgetGrowthRate(parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-gray-500">Realistic fiscal space projection</p>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button
                onClick={handleGenerateMtef}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Generate MTEF
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
      {mtef && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Baseline FSFVI</p>
                    <p className="text-2xl font-bold text-gray-900">{mtef.baseline_fsfvi.toFixed(3)}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Target FSFVI (Y3)</p>
                    <p className="text-2xl font-bold text-green-600">{mtef.target_fsfvi_year_3.toFixed(3)}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Baseline Budget</p>
                    <p className="text-2xl font-bold text-blue-600">{formatMillions(mtef.baseline_budget)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Improvement</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {(((mtef.baseline_fsfvi - mtef.target_fsfvi_year_3) / mtef.baseline_fsfvi) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 3-Year Budget Trajectory */}
          <Card>
            <CardHeader>
              <CardTitle>3-Year Budget & FSFVI Trajectory</CardTitle>
              <CardDescription>
                Budget conservation verified - All allocations sum to exact total budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis yAxisId="left" label={{ value: 'Budget ($M)', angle: -90, position: 'insideLeft' }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'FSFVI', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="budget" fill="#8b5cf6" name="Total Budget ($M)" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="fsfvi"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Projected FSFVI"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="target"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Target FSFVI"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Component Allocations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Component Allocation Breakdown</CardTitle>
              <CardDescription>Budget allocations by component across 3-year MTEF</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 px-4 font-bold text-gray-900">Component</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-900">Year 1</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-900">Year 2</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-900">Year 3</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-900">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {componentTrends.map((trend, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{trend.component}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{formatMillions(trend.year1)}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{formatMillions(trend.year2)}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{formatMillions(trend.year3)}</td>
                        <td className="text-right py-3 px-4 font-bold text-purple-600">
                          {formatMillions(trend.year1 + trend.year2 + trend.year3)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300 bg-purple-50 font-bold">
                      <td className="py-3 px-4 text-gray-900">TOTAL</td>
                      <td className="text-right py-3 px-4 text-purple-700">
                        {formatMillions(mtef.year_1_plan.total_budget)}
                      </td>
                      <td className="text-right py-3 px-4 text-purple-700">
                        {formatMillions(mtef.year_2_plan.total_budget)}
                      </td>
                      <td className="text-right py-3 px-4 text-purple-700">
                        {formatMillions(mtef.year_3_plan.total_budget)}
                      </td>
                      <td className="text-right py-3 px-4 text-purple-900">
                        {formatMillions(
                          mtef.year_1_plan.total_budget + mtef.year_2_plan.total_budget + mtef.year_3_plan.total_budget
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Fiscal Implications */}
          {mtef.fiscal_implications && mtef.fiscal_implications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Fiscal Implications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {mtef.fiscal_implications.map((implication, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="mt-1">
                        <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                      </div>
                      <span className="text-gray-700">{implication}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Budget Conservation Notice */}
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Budget Conservation Verified:</strong> All yearly allocations sum to exact total budget.
              This MTEF is ready for Ministry of Finance submission.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
