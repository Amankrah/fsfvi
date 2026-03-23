'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { planningAPI } from '@/lib/api/planningApi';
import type {
  SavedStrategicPlanSummary,
  SavedStrategicPlanFull,
  SaveYearActualRequest,
  PlanYearActual,
  AllocationSimulateResponse,
} from '@/lib/types/planning';
import {
  DollarSign,
  Save,
  Calculator,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

/** FSFSI Component labels */
const COMPONENT_LABELS: Record<string, string> = {
  markets: 'Markets & Trade',
  crop_production: 'Crop Production',
  nutrition: 'Nutrition & Food Safety',
  research: 'Research & Extension',
  post_harvest: 'Post-Harvest & Storage',
  environment: 'Environment & Climate',
  animal_systems: 'Animal Systems',
  finance: 'Finance & Investment',
};

const COMPONENT_ORDER = [
  'markets',
  'crop_production',
  'nutrition',
  'research',
  'post_harvest',
  'environment',
  'animal_systems',
  'finance',
];

interface SimulationResult extends AllocationSimulateResponse {
  loading?: boolean;
}

export function BudgetAllocationEntry() {
  // State for saved plans
  const [savedPlans, setSavedPlans] = useState<SavedStrategicPlanSummary[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<SavedStrategicPlanFull | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // State for plan year selection
  const [selectedPlanYear, setSelectedPlanYear] = useState<number>(1);

  // State for component allocations (in billions LCU)
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [totalBudget, setTotalBudget] = useState<number>(0);

  // State for simulation and saving
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing actuals for this plan
  const [existingActuals, setExistingActuals] = useState<Record<number, PlanYearActual>>({});

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load saved plans on mount
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const plans = await planningAPI.listSavedPlans();
        setSavedPlans(plans);
        if (plans.length > 0) {
          // Default to active plan or first plan
          const activePlan = plans.find((p) => p.is_active) || plans[0];
          setSelectedPlanId(activePlan.id);
        }
      } catch (err) {
        console.error('[BudgetAllocationEntry] Failed to load plans:', err);
        setError('Failed to load saved plans');
      } finally {
        setLoadingPlans(false);
      }
    };
    loadPlans();
  }, []);

  // Load full plan details when selected plan changes
  useEffect(() => {
    if (!selectedPlanId) {
      setSelectedPlan(null);
      return;
    }

    const loadPlanDetails = async () => {
      try {
        const plan = await planningAPI.getSavedPlan(selectedPlanId);
        setSelectedPlan(plan);

        // Initialize allocations from plan's first year recommendations
        const firstYear = plan.plan_json?.yearly_plans?.[0];
        if (firstYear?.recommended_allocations) {
          const initAllocations: Record<string, number> = {};
          let total = 0;
          for (const [comp, lcu] of Object.entries(firstYear.recommended_allocations)) {
            const bn = lcu / 1e9;
            initAllocations[comp] = Math.round(bn * 100) / 100;
            total += bn;
          }
          setAllocations(initAllocations);
          setTotalBudget(Math.round(total * 100) / 100);
        }

        // Load existing actuals
        const actuals = await planningAPI.listPlanActuals(selectedPlanId);
        const actualsMap: Record<number, PlanYearActual> = {};
        for (const actual of actuals) {
          // Load full actual for each plan year
          try {
            const fullActual = await planningAPI.getYearActual(selectedPlanId, actual.plan_year);
            actualsMap[actual.plan_year] = fullActual;
          } catch {
            // Ignore errors for individual actuals
          }
        }
        setExistingActuals(actualsMap);
      } catch (err) {
        console.error('[BudgetAllocationEntry] Failed to load plan details:', err);
        setError('Failed to load plan details');
      }
    };
    loadPlanDetails();
  }, [selectedPlanId]);

  // Update allocations when plan year changes (use existing actual or plan recommendation)
  useEffect(() => {
    if (!selectedPlan) return;

    // Check for existing actual
    const existingActual = existingActuals[selectedPlanYear];
    if (existingActual) {
      setAllocations(existingActual.component_allocations_bn);
      setTotalBudget(existingActual.total_budget_bn);
      return;
    }

    // Use plan recommendation for this year
    const yearPlan = selectedPlan.plan_json?.yearly_plans?.[selectedPlanYear - 1];
    if (yearPlan?.recommended_allocations) {
      const initAllocations: Record<string, number> = {};
      let total = 0;
      for (const [comp, lcu] of Object.entries(yearPlan.recommended_allocations)) {
        const bn = lcu / 1e9;
        initAllocations[comp] = Math.round(bn * 100) / 100;
        total += bn;
      }
      setAllocations(initAllocations);
      setTotalBudget(Math.round(total * 100) / 100);
    }
  }, [selectedPlanYear, selectedPlan, existingActuals]);

  // Calculate total from allocations
  const calculateTotal = useCallback(() => {
    return Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
  }, [allocations]);

  // Handle allocation change
  const handleAllocationChange = (component: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setAllocations((prev) => ({ ...prev, [component]: numValue }));
    setSaveSuccess(false);
    setSimulation(null);
  };

  // Simulate allocation
  const handleSimulate = async () => {
    if (!selectedPlan) return;

    setSimulation({ loading: true } as SimulationResult);
    setError(null);

    try {
      // Convert allocations to shares (percentage)
      const total = calculateTotal();
      const shares: Record<string, number> = {};
      for (const [comp, bn] of Object.entries(allocations)) {
        shares[comp] = total > 0 ? (bn / total) * 100 : 0;
      }

      // Get plan reference data for comparison
      const yearPlan = selectedPlan.plan_json?.yearly_plans?.[selectedPlanYear - 1];
      const planReference = yearPlan
        ? {
            projected_cumulative_fsfsi: yearPlan.projected_fsfvi,
            year_target_fsfvi: yearPlan.year_target || yearPlan.target_fsfvi,
            recommended_allocations: yearPlan.recommended_allocations,
            plan_total_budget_bn: yearPlan.total_budget / 1e9,
            planning_weighting_method: selectedPlan.weighting_method,
            planning_scenario: selectedPlan.scenario,
          }
        : undefined;

      const result = await planningAPI.simulateAllocation(selectedPlan.assessment_id, {
        plan_year: selectedPlanYear,
        total_budget_bn: total,
        component_shares_pct: shares,
        weighting_method: selectedPlan.weighting_method,
        scenario: selectedPlan.scenario,
        plan_reference: planReference,
      });

      setSimulation(result);
    } catch (err) {
      console.error('[BudgetAllocationEntry] Simulation failed:', err);
      setError('Simulation failed. Please try again.');
      setSimulation(null);
    }
  };

  // Save actual allocation
  const handleSave = async () => {
    if (!selectedPlan) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const total = calculateTotal();
      const fiscalYear =
        (selectedPlan.plan_json?.planning_start_fiscal_year || selectedPlan.fiscal_year + 1) +
        selectedPlanYear -
        1;

      const request: SaveYearActualRequest = {
        plan_year: selectedPlanYear,
        fiscal_year: fiscalYear,
        total_budget_bn: total,
        component_allocations_bn: allocations,
        simulated_cumulative_fsfsi: simulation?.user_projected_cumulative_fsfsi,
        simulated_component_stress: simulation?.user_component_cumulative_stress,
        delta_vs_plan_fsfsi: simulation?.delta_user_minus_plan_fsfsi,
      };

      const savedActual = await planningAPI.saveYearActual(selectedPlanId, request);
      setExistingActuals((prev) => ({ ...prev, [selectedPlanYear]: savedActual }));
      setSaveSuccess(true);
    } catch (err) {
      console.error('[BudgetAllocationEntry] Save failed:', err);
      setError('Failed to save allocation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Get fiscal year label for plan year
  const getFiscalYearLabel = (planYear: number): string => {
    if (!selectedPlan) return '';
    const startFY =
      selectedPlan.plan_json?.planning_start_fiscal_year || selectedPlan.fiscal_year + 1;
    const fy = startFY + planYear - 1;
    return `FY${fy}/${fy + 1}`;
  };

  // Get plan year's target and recommendation
  const getYearPlanData = () => {
    if (!selectedPlan) return null;
    return selectedPlan.plan_json?.yearly_plans?.[selectedPlanYear - 1];
  };

  const yearPlanData = getYearPlanData();
  const calculatedTotal = calculateTotal();
  const hasExistingActual = !!existingActuals[selectedPlanYear];

  if (loadingPlans) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--rw-blue)]" />
          <span className="ml-3 text-gray-600">Loading plans...</span>
        </CardContent>
      </Card>
    );
  }

  if (savedPlans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-[var(--rw-blue)]" />
            <span>Budget Allocation Entry</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              No saved strategic plans found. Create a plan first in the Planning module.
            </p>
            <Button variant="outline" onClick={() => (window.location.href = '/dashboard/planning')}>
              Go to Planning
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-[var(--rw-blue)]" />
            <span>Budget Allocation Entry</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plan Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Strategic Plan
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                  setSelectedPlanYear(1);
                  setSaveSuccess(false);
                  setSimulation(null);
                }}
                className="w-full h-10 rounded-lg border-2 border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)] focus:border-transparent"
              >
                {savedPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.plan_name} {plan.is_active && '(Active)'} - FY{plan.fiscal_year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Year</label>
              <select
                value={selectedPlanYear}
                onChange={(e) => {
                  setSelectedPlanYear(parseInt(e.target.value));
                  setSaveSuccess(false);
                  setSimulation(null);
                }}
                className="w-full h-10 rounded-lg border-2 border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)] focus:border-transparent"
              >
                {Array.from({ length: selectedPlan?.planning_years || 5 }, (_, i) => i + 1).map(
                  (year) => (
                    <option key={year} value={year}>
                      Year {year} ({getFiscalYearLabel(year)})
                      {existingActuals[year] && ' - Has Actual'}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Plan Year Info */}
          {yearPlanData && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Plan Targets for {getFiscalYearLabel(selectedPlanYear)}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Target FSFSI:</span>
                  <span className="ml-2 font-semibold text-blue-900">
                    {(yearPlanData.target_fsfvi * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Projected FSFSI:</span>
                  <span className="ml-2 font-semibold text-blue-900">
                    {(yearPlanData.projected_fsfvi * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Plan Budget:</span>
                  <span className="ml-2 font-semibold text-blue-900">
                    {(yearPlanData.total_budget / 1e9).toFixed(1)} Bn
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Status:</span>
                  <span
                    className={`ml-2 font-semibold ${yearPlanData.on_track ? 'text-green-700' : 'text-amber-700'}`}
                  >
                    {yearPlanData.on_track ? 'On Track' : 'Needs Attention'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {hasExistingActual && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm text-green-800">
                Actual allocation already recorded for this year. You can update it below.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Component Allocations Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Component Budget Allocations (Billion RWF)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMPONENT_ORDER.map((component) => {
              const recommended = yearPlanData?.recommended_allocations?.[component];
              const recommendedBn = recommended ? recommended / 1e9 : 0;
              const current = allocations[component] || 0;
              const diff = current - recommendedBn;

              return (
                <div key={component} className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {COMPONENT_LABELS[component]}
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={allocations[component] || ''}
                      onChange={(e) => handleAllocationChange(component, e.target.value)}
                      placeholder="0.00"
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      Bn
                    </span>
                  </div>
                  {recommended && (
                    <div className="text-xs text-gray-500 flex items-center justify-between">
                      <span>Plan: {recommendedBn.toFixed(2)} Bn</span>
                      {diff !== 0 && (
                        <span
                          className={`flex items-center ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {diff > 0 ? (
                            <TrendingUp className="h-3 w-3 mr-0.5" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-0.5" />
                          )}
                          {diff > 0 ? '+' : ''}
                          {diff.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-semibold text-gray-900">Total Budget:</span>
                <span className="ml-3 text-2xl font-bold text-[var(--rw-blue)]">
                  {calculatedTotal.toFixed(2)} Bn RWF
                </span>
              </div>
              {yearPlanData && (
                <div className="text-sm text-gray-600">
                  Plan: {(yearPlanData.total_budget / 1e9).toFixed(2)} Bn
                  <span
                    className={`ml-2 font-medium ${calculatedTotal >= yearPlanData.total_budget / 1e9 ? 'text-green-600' : 'text-amber-600'}`}
                  >
                    (
                    {calculatedTotal >= yearPlanData.total_budget / 1e9
                      ? `+${(calculatedTotal - yearPlanData.total_budget / 1e9).toFixed(2)}`
                      : (calculatedTotal - yearPlanData.total_budget / 1e9).toFixed(2)}
                    )
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4 mr-1" />
              ) : (
                <ChevronDown className="h-4 w-4 mr-1" />
              )}
              Advanced Options
            </button>
            {showAdvanced && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Override Total Budget (optional)
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={totalBudget || ''}
                        onChange={(e) => setTotalBudget(parseFloat(e.target.value) || 0)}
                        placeholder="Auto-calculated"
                        className="pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        Bn
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to use sum of components
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Simulation Results Card */}
      {simulation && !simulation.loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-[var(--rw-blue)]" />
              Simulation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Your Projected FSFSI</div>
                <div className="text-3xl font-bold text-[var(--rw-blue)]">
                  {(simulation.user_projected_cumulative_fsfsi * 100).toFixed(1)}%
                </div>
              </div>

              {simulation.plan_projected_cumulative_fsfsi !== undefined && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Plan Projected FSFSI</div>
                  <div className="text-3xl font-bold text-gray-700">
                    {(simulation.plan_projected_cumulative_fsfsi * 100).toFixed(1)}%
                  </div>
                </div>
              )}

              {simulation.delta_user_minus_plan_fsfsi !== undefined && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Difference from Plan</div>
                  <div
                    className={`text-3xl font-bold ${simulation.delta_user_minus_plan_fsfsi > 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {simulation.delta_user_minus_plan_fsfsi > 0 ? '+' : ''}
                    {(simulation.delta_user_minus_plan_fsfsi * 100).toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {simulation.user_on_track_vs_plan_target
                      ? 'On track vs target'
                      : 'Below plan target'}
                  </div>
                </div>
              )}
            </div>

            {simulation.methodology_note && (
              <p className="mt-4 text-sm text-gray-500 italic">{simulation.methodology_note}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-sm text-green-800">
            Budget allocation saved successfully for {getFiscalYearLabel(selectedPlanYear)}.
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button
          variant="outline"
          onClick={handleSimulate}
          disabled={!selectedPlan || calculatedTotal === 0 || simulation?.loading}
        >
          {simulation?.loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4 mr-2" />
              Simulate Impact
            </>
          )}
        </Button>

        <Button
          onClick={handleSave}
          disabled={!selectedPlan || calculatedTotal === 0 || saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {hasExistingActual ? 'Update Allocation' : 'Save Allocation'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default BudgetAllocationEntry;
