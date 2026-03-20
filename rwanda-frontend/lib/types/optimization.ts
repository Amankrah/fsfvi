/**
 * Rwanda FSFSI Optimization & Performance Gap Types
 * ==================================================
 * Type definitions for budget optimization and performance gap analysis
 *
 * Backend: Rwanda Django backend (http://localhost:8000/api/assessments/)
 * Engine: Rust fsfi_engine via PyO3
 *
 * IMPORTANT: These types must match the Rust response structures exactly.
 */

import type { IndicatorComponent } from './assessment';

// ============================================================================
// Efficiency Analysis Types (matches Rust EfficiencyAnalysis)
// ============================================================================

export interface EfficiencyAnalysis {
  current_fsfsi: number;
  optimal_fsfsi: number;
  efficiency_index: number;
  waste_ratio: number;
  components: ComponentEfficiency[];
  total_budget_lcu: number;
  computing_time_ms: number;
}

export interface ComponentEfficiency {
  component_type: string;
  current_allocation_lcu: number;
  optimal_allocation_lcu: number;
  allocation_gap_lcu: number;
  allocation_gap_pct: number;
  current_stress: number;
  optimal_stress: number;
  stress_reduction: number;
  is_underfunded: boolean;
}

// ============================================================================
// Reallocation Plan Types (matches Rust ReallocationPlan)
// ============================================================================

export interface ReallocationPlan {
  components: ReallocationItem[];
  current_fsfsi: number;
  projected_fsfsi: number;
  projected_improvement: number;
  projected_improvement_pct: number;
  total_budget_lcu: number;
  computing_time_ms: number;
}

export interface ReallocationItem {
  component_type: string;
  current_allocation_lcu: number;
  recommended_allocation_lcu: number;
  change_lcu: number;
  change_pct: number;
  priority: number;
  projected_impact: string;
}

// ============================================================================
// ROI Analysis Types (matches Rust RoiAnalysis)
// ============================================================================

export interface RoiAnalysis {
  components: ComponentRoi[];
  best_roi_component: string;
  worst_roi_component: string;
  total_budget_lcu: number;
  computing_time_ms: number;
}

export interface ComponentRoi {
  component_type: string;
  current_stress: number;
  marginal_benefit: number;
  roi_per_million: number;
  rank: number;
}

// ============================================================================
// Performance Gap Analysis Types
// ============================================================================

export interface GapAnalysis {
  component: IndicatorComponent;
  current_performance: number;
  benchmark: number;
  gap: number;
  gap_percent: number;
  priority_score: number;
  closure_difficulty: 'easy' | 'moderate' | 'difficult';
}

export interface GapAnalysisReport {
  gaps: GapAnalysis[];
  total_gap: number;
  critical_gaps_count: number;
  analysis_timestamp: string;
}

// ============================================================================
// Peer Comparison Types
// ============================================================================

export interface PeerComparison {
  component: IndicatorComponent;
  rwanda_value: number;
  peer_average: number;
  peer_best: number;
  rwanda_percentile: number;
  gap_to_average: number;
  gap_to_best: number;
}

export interface PeerComparisonReport {
  rwanda_components: ComponentPerformance[];
  peer_countries: PeerCountry[];
  comparisons: PeerComparison[];
  rwanda_overall_rank: number;
  analysis_timestamp: string;
}

export interface ComponentPerformance {
  component: IndicatorComponent;
  value: number;
  benchmark: number;
}

export interface PeerCountry {
  name: string;
  components: ComponentPerformance[];
  overall_score: number;
}

// ============================================================================
// Target Recommendation Types
// ============================================================================

export interface TargetRecommendation {
  component: IndicatorComponent;
  current_value: number;
  recommended_target: number;
  yearly_milestone: number;
  required_investment: number;
  confidence_level: 'high' | 'medium' | 'low';
}

export interface TargetRecommendationReport {
  targets: TargetRecommendation[];
  target_year: number;
  current_year: number;
  years_to_target: number;
  total_investment_required: number;
  expected_fsfsi_improvement: number;
}

// ============================================================================
// Weighting Types
// ============================================================================

export interface AhpWeights {
  scenario: string;
  weights: Record<IndicatorComponent, number>;
  consistency_ratio: number;
  is_consistent: boolean;
}

export interface HybridWeights {
  scenario: string;
  final_weights: Record<IndicatorComponent, number>;
  expert_weights: Record<IndicatorComponent, number>;
  pagerank_weights: Record<IndicatorComponent, number>;
  cascade_weights: Record<IndicatorComponent, number>;
  financial_weights: Record<IndicatorComponent, number>;
  blend_ratios: {
    expert: number;
    pagerank: number;
    cascade: number;
    financial: number;
  };
}

export interface NetworkAnalysis {
  scenario: string;
  centrality_scores: Record<IndicatorComponent, number>;
  influence_matrix: number[][];
  key_dependencies: Dependency[];
}

export interface Dependency {
  from_component: IndicatorComponent;
  to_component: IndicatorComponent;
  strength: number;
  cascade_effect: number;
}
