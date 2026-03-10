/**
 * Rwanda FSFSI Optimization & Performance Gap Types
 * ==================================================
 * Type definitions for budget optimization and performance gap analysis
 *
 * Backend: Rwanda Django backend (http://localhost:8000/api/assessments/)
 */

import type { IndicatorComponent } from './assessment';

// ============================================================================
// Efficiency Analysis Types
// ============================================================================

export interface EfficiencyAnalysis {
  current_fsfsi: number;
  optimal_fsfsi: number;
  efficiency_index: number;
  improvement_potential: number;
  reallocation_analysis: AllocationAnalysis[];
}

export interface AllocationAnalysis {
  component: IndicatorComponent;
  current_allocation: number;
  optimal_allocation: number;
  difference: number;
  percent_change: number;
  status: 'over_allocated' | 'under_allocated' | 'optimal';
}

// ============================================================================
// Reallocation Plan Types
// ============================================================================

export interface ReallocationPlan {
  baseline_fsfsi: number;
  estimated_fsfsi_after_reallocation: number;
  expected_improvement_percent: number;
  total_budget: number;
  reallocations: Reallocation[];
  implementation_phases: ImplementationPhase[];
}

export interface Reallocation {
  component: IndicatorComponent;
  current_allocation: number;
  target_allocation: number;
  change_amount: number;
  change_percent: number;
  priority: number;
}

export interface ImplementationPhase {
  phase: number;
  description: string;
  components: IndicatorComponent[];
  budget_impact: number;
  timeline_months: number;
}

// ============================================================================
// ROI Analysis Types
// ============================================================================

export interface RoiAnalysis {
  component: IndicatorComponent;
  current_allocation: number;
  roi_per_million: number;
  stress_reduction_potential: number;
  cost_effectiveness_rank: number;
}

export interface RoiAnalysisReport {
  components: RoiAnalysis[];
  best_roi_component: IndicatorComponent;
  total_budget: number;
  analysis_timestamp: string;
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
