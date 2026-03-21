/**
 * Rwanda FSFSI Assessment Types
 * ==============================
 * Type definitions for Rwanda FSFSI (Food System Financing Stress Index) API
 *
 * CRITICAL: All assessment data (scores, stress_level, priority_level) must come
 * from the backend only. Do not derive or compute these in the frontend.
 *
 * Backend: Rwanda Django backend (http://localhost:8000/api/assessments/)
 * Engine: Rust fsfi_engine via PyO3
 */

// ============================================================================
// Indicator Component Constants (Rwanda 8-component structure)
// ============================================================================

export const INDICATOR_COMPONENTS = {
  MARKETS: 'markets',
  CROP_PRODUCTION: 'crop_production',
  NUTRITION: 'nutrition',
  RESEARCH: 'research',
  POST_HARVEST: 'post_harvest',
  ENVIRONMENT: 'environment',
  ANIMAL_SYSTEMS: 'animal_systems',
  FINANCE: 'finance',
} as const;

export type IndicatorComponent =
  typeof INDICATOR_COMPONENTS[keyof typeof INDICATOR_COMPONENTS];

export const COMPONENT_DISPLAY_NAMES: Record<IndicatorComponent, string> = {
  markets: 'Markets',
  crop_production: 'Crop Production',
  nutrition: 'Nutrition',
  research: 'Research',
  post_harvest: 'Post-Harvest',
  environment: 'Environment',
  animal_systems: 'Animal Systems',
  finance: 'Finance',
};

// ============================================================================
// Weighting Methods & Scenarios
// ============================================================================

export const WEIGHTING_METHODS = {
  HYBRID: 'hybrid',
  EQUAL: 'equal',
  EXPERT: 'expert',
  FINANCIAL: 'financial',
  NETWORK: 'network',
} as const;

export type WeightingMethod =
  typeof WEIGHTING_METHODS[keyof typeof WEIGHTING_METHODS];

export const SCENARIOS = {
  NORMAL_OPERATIONS: 'normal_operations',
  CLIMATE_SHOCK: 'climate_shock',
  FINANCIAL_CRISIS: 'financial_crisis',
  PANDEMIC_DISRUPTION: 'pandemic_disruption',
  SUPPLY_CHAIN_DISRUPTION: 'supply_chain_disruption',
  EXPORT_BAN: 'export_ban',
  REGIONAL_CONFLICT: 'regional_conflict',
} as const;

export type Scenario = typeof SCENARIOS[keyof typeof SCENARIOS];

export const SCENARIO_DISPLAY_NAMES: Record<Scenario, string> = {
  normal_operations: 'Normal Operations',
  climate_shock: 'Climate Shock',
  financial_crisis: 'Financial Crisis',
  pandemic_disruption: 'Pandemic Disruption',
  supply_chain_disruption: 'Supply Chain Disruption',
  export_ban: 'Export Ban',
  regional_conflict: 'Regional Conflict',
};

// ============================================================================
// Stress Level Constants
// ============================================================================

export const STRESS_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type StressLevel = typeof STRESS_LEVELS[keyof typeof STRESS_LEVELS];

export const STRESS_LEVEL_COLORS: Record<
  StressLevel,
  { bg: string; text: string; border: string }
> = {
  low: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
  },
  medium: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
  },
  high: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
  },
  critical: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
  },
};

// ============================================================================
// Indicator Input (for API requests)
// ============================================================================

export interface IndicatorInput {
  indicator_code: string;
  indicator_component: IndicatorComponent;
  name: string;
  records_count?: number;
  gross_lcu_bn: number;
  weighted_lcu_bn: number;
  share_weighted_percent: number;
  observed_value?: number | null;
  benchmark_value?: number | null;
}

// ============================================================================
// Assessment Request
// ============================================================================

export interface AssessmentRequest {
  fiscal_year: number;
  assessment_name?: string;
  weighting_method?: WeightingMethod;
  scenario?: Scenario;
  indicators: IndicatorInput[];
  save_result?: boolean;
}

export interface QuickCheckRequest {
  indicators: IndicatorInput[];
}

// ============================================================================
// Assessment Result Types
// ============================================================================

export interface IndicatorResult {
  indicator_code: string;
  indicator_component: IndicatorComponent;
  name: string;
  stress: number;
  weighted_stress: number;
  performance_gap: number;
  risk_level: string;
  gross_lcu_bn: number;
  weighted_lcu_bn: number;
  share_weighted_percent: number;
}

/** From backend (Rust) only; priority_level from engine. */
export interface ComponentAggregation {
  component: IndicatorComponent;
  component_display?: string;
  indicator_count: number;
  total_gross_lcu_bn: number;
  total_weighted_lcu_bn: number;
  total_share_weighted_percent: number;
  average_performance_gap: number;
  /** From Rust: low | medium | high | critical */
  priority_level?: string;
}

export interface ActionPriority {
  rank: number;
  component: IndicatorComponent;
  action: string;
  expected_impact: string;
  budget_implication: string;
  timeline: string;
}

export interface EfficiencyMetrics {
  efficiency_index: number;
  gap_ratio: number;
  fsfsi_actual: number;
  fsfsi_optimal: number;
  potential_improvement: number;
}

export interface AssessmentMetadata {
  fiscal_year: number;
  weighting_method: string;
  scenario: string;
  calculated_at: string;
  computing_time_ms: number;
  indicator_count: number;
  component_count: number;
  total_budget_lcu_bn: number;
}

export interface AssessmentResult {
  overall_fsfsi: number;
  risk_level: string;
  indicator_results: IndicatorResult[];
  component_aggregations: ComponentAggregation[];
  action_priorities: ActionPriority[];
  efficiency: EfficiencyMetrics;
  metadata: AssessmentMetadata;
}

// ============================================================================
// Quick Check Result
// ============================================================================

export interface QuickCheckResult {
  fsfsi_score: number;
  risk_level: string;
  critical_components: number;
  top_concern: string;
  computing_time_ms: number;
}

// ============================================================================
// Saved Assessment (from database)
// ============================================================================

export interface SavedAssessment {
  id: string;
  fiscal_year: number;
  assessment_name: string;
  weighting_method: string;
  scenario: string;
  fsfsi_score: number;
  stress_level: string;
  fsfsi_optimal?: number;
  efficiency_index?: number;
  gap_ratio?: number;
  total_budget_lcu_bn: number;
  total_budget_lcu?: number;
  indicators_count: number;
  components_count: number;
  result_json?: Record<string, unknown>;
  computed_at: string;
  computing_time_ms: number;
  computed_by_username?: string;
  cumulative_fsfsi?: number;
  cumulative_stress_level?: string;
  component_results?: ComponentResult[];
  indicator_results?: SavedIndicatorResult[];
}

export interface ComponentResult {
  id: string;
  component: IndicatorComponent;
  component_display: string;
  weight: number;
  avg_performance_gap: number;
  component_stress: number;
  weighted_stress: number;
  priority_level: string;
  budget_lcu_bn: number;
  budget_share_percent: number;
  cumulative_stress?: number;
  cumulative_weighted_stress?: number;
  optimal_allocation_lcu?: number;
  allocation_gap_lcu?: number;
  indicators_count: number;
}

export interface SavedIndicatorResult {
  id: string;
  indicator_code: string;
  indicator_name: string;
  component: IndicatorComponent;
  component_display: string;
  observed_value: number | null;
  benchmark_value: number | null;
  financial_allocation: number;
  sensitivity: number;
  performance_gap: number;
  stress_value: number;
  weighted_lcu_bn: number;
  share_weighted_percent: number;
}

// ============================================================================
// Dashboard Summary (all fields from backend API only)
// ============================================================================

export interface DashboardSummary {
  assessment_id?: string | null;
  overall_fsfsi: number;
  /** From backend (Rust): low | medium | high | critical */
  stress_level: string;
  fiscal_year: number;
  total_budget_lcu_bn: number;
  components: ComponentSummary[];
  top_priorities: ActionPriority[];
  efficiency_index: number;
  yoy_change_percent?: number | null;
  /** Cumulative FSFSI: accounts for damage persistence and slow recovery */
  cumulative_fsfsi?: number | null;
  cumulative_stress_level?: string | null;
  computed_at?: string | null;
  /** Weighting used for the saved assessment shown (latest run for this fiscal year). */
  weighting_method?: string | null;
  scenario?: string | null;
  /** True when no assessment has been run yet for this fiscal year. */
  empty?: boolean;
}

/** Per-component summary; stress and priority_level from backend only. */
export interface ComponentSummary {
  component: IndicatorComponent;
  component_display: string;
  stress: number;
  weight: number;
  budget_lcu_bn: number;
  budget_share_percent: number;
  indicator_count: number;
  /** From backend (Rust): low | medium | high | critical */
  priority_level: string;
  /** Cumulative stress: accounts for accumulated damage from prior years */
  cumulative_stress?: number | null;
}

// ============================================================================
// Assessment History
// ============================================================================

export interface AssessmentHistory {
  id: string;
  fiscal_year: number;
  fsfsi_score: number;
  stress_level: string;
  component_scores: Record<string, number>;
  total_budget_lcu_bn: number;
  yoy_change?: number;
  yoy_change_percent?: number;
  cumulative_fsfsi?: number;
  cumulative_component_scores?: Record<string, number>;
  created_at: string;
}

// ============================================================================
// Persistence Config Types
// ============================================================================

export interface PersistenceConfig {
  id: number;
  component: IndicatorComponent;
  component_display: string;
  rho_up: number;
  rho_down: number;
}

export interface PersistenceConfigUpdateResponse {
  updated: PersistenceConfig[];
  errors: Array<{ component?: string; error?: string; errors?: Record<string, string[]> }>;
  recalculated_assessments: number;
}

// ============================================================================
// Config Types
// ============================================================================

/** Sensitivity (α) for one indicator component (from backend engine). */
export interface IndicatorComponentSensitivity {
  component: string;
  component_display: string;
  sensitivity: number;
}

export interface FsfsiConfig {
  config: {
    alpha_default: number;
    stress_thresholds: {
      low: number;
      moderate: number;
      high: number;
      critical: number;
    };
    weighting_blend_ratios: {
      expert: number;
      pagerank: number;
      cascade: number;
      financial: number;
    };
  };
  indicator_components: string[];
  /** Sensitivity parameter α per indicator component (from backend). */
  indicator_component_sensitivities?: IndicatorComponentSensitivity[];
}
