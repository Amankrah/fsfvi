/**
 * Rwanda FSFSI Planning Types
 * ============================
 * Multi-year strategic planning and MTEF (Medium-Term Expenditure Framework).
 * Backend: POST /api/planning/multi-year/ and POST /api/planning/mtef/
 */

// ---------------------------------------------------------------------------
// Multi-year plan
// ---------------------------------------------------------------------------

export interface YearlyBudgetConstraintInput {
  total_budget_ceiling: number;
  min_allocation_per_component?: number;
  max_change_percent_from_previous?: number;
  priority_components?: string[];
}

export interface MultiYearPlanRequest {
  current_components: PlanningComponentInput[];
  country_name?: string;
  currency?: string;
  planning_years: number;
  target_fsfvi: number;
  yearly_budget_constraints?: Record<string, YearlyBudgetConstraintInput>;
  /** When no constraint per year: budget = baseline * (1 + rate)^year. Same as MTEF growth rate for consistency. */
  yearly_budget_growth_rate?: number;
}

export interface PlanningComponentInput {
  component_type: string;
  observed_value: number;
  benchmark_value: number;
  financial_allocation_lcu: number;
  weight?: number;
}

export interface YearlyPlanOutput {
  year: number;
  target_fsfvi: number;
  projected_fsfvi: number;
  fsfvi_reduction_from_previous: number;
  on_track: boolean;
  recommended_allocations: Record<string, number>;
  total_budget: number;
  key_interventions: string[];
  milestones: string[];
}

export interface ImplementationRisk {
  risk_type: string;
  severity: string;
  description: string;
  mitigation: string;
}

export interface MultiYearStrategicPlan {
  baseline_fsfvi: number;
  target_fsfvi: number;
  planning_years: number;
  target_already_achieved: boolean;
  yearly_plans: YearlyPlanOutput[];
  total_additional_investment_needed: number;
  expected_outcomes: string[];
  implementation_risks: ImplementationRisk[];
  success_factors: string[];
}

// ---------------------------------------------------------------------------
// MTEF (3-year)
// ---------------------------------------------------------------------------

export interface MtefYearPlan {
  year: number;
  total_budget: number;
  target_fsfvi: number;
  projected_fsfvi: number;
  component_allocations: Record<string, number>;
  key_interventions: string[];
}

export interface MtefPlan {
  baseline_year: number;
  baseline_fsfvi: number;
  target_fsfvi_year_3: number;
  baseline_budget: number;
  year_1_plan: MtefYearPlan;
  year_2_plan: MtefYearPlan;
  year_3_plan: MtefYearPlan;
  fiscal_implications: string[];
}
