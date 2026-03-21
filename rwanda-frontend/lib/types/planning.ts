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

export interface ComponentProjection {
  cumulative_stress: number;
  point_in_time_stress: number;
  display: string;
}

export interface YearlyPlanOutput {
  year: number;
  /** Fiscal year label for this horizon row (plan year 1 = first FY after baseline unless overridden). */
  fiscal_year?: number;
  target_fsfvi: number;
  projected_fsfvi: number;
  fsfvi_reduction_from_previous: number;
  on_track: boolean;
  recommended_allocations: Record<string, number>;
  /** Share of recommended mix by component (%), same order of magnitude as allocation weights. */
  recommended_share_pct?: Record<string, number>;
  total_budget: number;
  key_interventions: string[];
  milestones: string[];
  component_projections?: Record<string, ComponentProjection>;
  year_target?: number;
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
  /** Stamped when plan is generated (saved JSON) — use for simulate parity vs UI dropdown. */
  planning_weighting_method?: string;
  planning_scenario?: string;
  /** FY label for plan index 1 (engine Year 1). */
  planning_start_fiscal_year?: number;
  /** Assessment fiscal year the plan was anchored to. */
  baseline_assessment_fiscal_year?: number;
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

// ---------------------------------------------------------------------------
// Saved Strategic Plans
// ---------------------------------------------------------------------------

/** POST /api/planning/<assessment_id>/simulate-allocation/ */
export interface AllocationSimulateRequest {
  plan_year: number;
  total_budget_bn: number;
  component_shares_pct: Record<string, number>;
  weighting_method?: string;
  scenario?: string;
  prior_system_cumulative?: number;
  prior_component_cumulative?: Record<string, number>;
  plan_reference?: {
    projected_cumulative_fsfsi: number;
    year_target_fsfvi: number;
    /** Rust optimal LCU row — lets the API rebuild the same financial_allocation_lcu as the chart. */
    recommended_allocations?: Record<string, number>;
    plan_total_budget_bn?: number;
    planning_weighting_method?: string;
    planning_scenario?: string;
  };
}

export interface AllocationSimulateResponse {
  user_projected_cumulative_fsfsi: number;
  user_component_cumulative_stress: Record<string, number>;
  user_point_in_time_stress_system: number;
  normalized_component_shares_pct: Record<string, number>;
  baseline_cumulative_fsfsi_used: number;
  plan_year: number;
  methodology_note?: string;
  plan_projected_cumulative_fsfsi?: number;
  plan_year_target_fsfvi?: number;
  delta_user_minus_plan_fsfsi?: number;
  user_worse_than_plan_optimal?: boolean;
  user_on_track_vs_plan_target?: boolean;
  error?: string;
}

export interface SavePlanRequest {
  assessment_id: string;
  plan_name?: string;
  planning_years: number;
  target_fsfvi: number;
  target_reduction_pct: number;
  yearly_budget_growth_rate: number;
  target_curve: string;
  weighting_method?: string;
  scenario?: string;
  /** First fiscal year label for horizon year 1; backend defaults to assessment FY + 1 if omitted. */
  planning_start_fiscal_year?: number;
}

/** Saved plan row from GET /saved-plans/ (no embedded plan_json). */
export interface SavedStrategicPlanSummary {
  id: string;
  assessment_id: string;
  fiscal_year: number;
  plan_name: string;
  is_active: boolean;
  planning_years: number;
  target_fsfvi: number;
  target_reduction_pct: number;
  yearly_budget_growth_rate: number;
  target_curve: string;
  weighting_method: string;
  scenario: string;
  baseline_fsfsi: number;
  final_projected_fsfsi: number | null;
  total_additional_investment: number | null;
  created_at: string;
  updated_at: string;
  created_by_username: string | null;
}

export interface SavedStrategicPlanFull extends SavedStrategicPlanSummary {
  plan_json: MultiYearStrategicPlan;
}

export interface SavedPlanExcerpt {
  id: string;
  fiscal_year: number;
  plan_name: string;
  is_active: boolean;
  planning_years: number;
  target_fsfvi: number;
  baseline_fsfsi: number;
  final_projected_fsfsi: number | null;
  total_additional_investment: number | null;
  target_reduction_pct: number;
  yearly_budget_growth_rate: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Plan Year Actuals — Record actual budget allocations per year
// ---------------------------------------------------------------------------

/** Request to save actual allocation for a plan year */
export interface SaveYearActualRequest {
  plan_year: number;
  fiscal_year: number;
  total_budget_bn: number;
  /** Component allocations in billions LCU: { markets: 379.42, ... } */
  component_allocations_bn: Record<string, number>;
  /** Optional: pre-computed simulation (if not provided, backend computes) */
  simulated_cumulative_fsfsi?: number;
  simulated_component_stress?: Record<string, number>;
  delta_vs_plan_fsfsi?: number;
}

/** Full plan year actual record */
export interface PlanYearActual {
  id: string;
  plan_id: string;
  plan_year: number;
  fiscal_year: number;
  total_budget_bn: number;
  component_allocations_bn: Record<string, number>;
  simulated_cumulative_fsfsi: number | null;
  simulated_component_stress: Record<string, number>;
  delta_vs_plan_fsfsi: number | null;
  created_at: string;
  updated_at: string;
  created_by_username: string | null;
}

/** Summary for listing actuals */
export interface PlanYearActualSummary {
  id: string;
  plan_year: number;
  fiscal_year: number;
  total_budget_bn: number;
  simulated_cumulative_fsfsi: number | null;
  delta_vs_plan_fsfsi: number | null;
  updated_at: string;
}
