/// FSFVI Service Data Models
/// ==========================
/// All request/response models matching the FSFI Backend API structure
/// Reference: fsfi-backend/src/fsfvi_api/models.rs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Core Component Input (matches fsfi-backend/src/fsfvi_api/models.rs:41-86)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentInput {
    pub component_id: Option<String>,
    pub component_type: String,
    pub observed_value: f64,
    pub benchmark_value: f64,
    pub financial_allocation_usd: f64,
    pub weight: Option<f64>,
    pub sensitivity_parameter: Option<f64>,
}

// ============================================================================
// API Response Wrapper (matches fsfi-backend/src/fsfvi_api/models.rs:469-488)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponseMetadata {
    pub timestamp: String,
    pub processing_time_ms: u64,
    pub user_id: String,
    pub api_version: String,
    pub currency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub data: T,
    pub metadata: ApiResponseMetadata,
}

// ============================================================================
// Performance Gap Analysis Models
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceGapAnalysisReport {
    pub overall_status: String,
    pub average_gap: f64,
    pub total_components: usize,
    pub critical_gaps: usize,
    pub component_gaps: Vec<ComponentGap>,
    pub top_priorities: Vec<String>,
    pub quick_wins: Vec<String>,
    pub key_insights: Vec<String>,
}

/// Component Performance Gap
/// Matches: fsfi-backend/src/fsfvi/service/performance_gap_analysis.rs:750-761
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentGap {
    pub component_type: String,
    pub observed_value: f64,
    pub benchmark_value: f64,
    pub performance_gap: f64,        // Normalized gap (0-1)
    pub absolute_gap: f64,            // Absolute difference
    pub achievement_rate: f64,        // % of benchmark achieved
    pub severity: String,             // "critical", "high", "medium", "low"
    pub prefer_higher: bool,
    pub improvement_needed: f64,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerCountryData {
    pub country_name: String,
    pub component_values: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerComparisonRequest {
    pub components: Vec<ComponentInput>,
    pub peer_countries: Vec<PeerCountryData>,
}

/// Component Peer Comparison
/// Matches: fsfi-backend/src/fsfvi/service/performance_gap_analysis.rs:774-783
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentPeerComparison {
    pub component_type: String,
    pub current_value: f64,
    pub peer_average: f64,
    pub peer_best: f64,
    pub peer_worst: f64,
    pub difference_from_peers_percent: f64,
    pub performance_level: String, // "above_peers", "at_peer_level", etc.
    pub quartile: String,          // "top_quartile", "second_quartile", etc.
}

/// Peer Comparison Report
/// Matches: fsfi-backend/src/fsfvi/service/performance_gap_analysis.rs:764-771
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerComparisonReport {
    pub peer_countries: Vec<String>,
    pub component_comparisons: Vec<ComponentPeerComparison>,
    pub areas_above_peers: usize,
    pub areas_below_peers: usize,
    pub competitive_advantages: Vec<String>,
    pub learning_opportunities: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GapClosureRequest {
    pub baseline_components: Vec<ComponentInput>,
    pub current_components: Vec<ComponentInput>,
    pub time_period_months: usize,
}

/// Gap Closure Report
/// Matches: fsfi-backend/src/fsfvi/service/performance_gap_analysis.rs:792-800
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GapClosureReport {
    pub time_period_months: usize,
    pub average_gap_closure_percent: f64,
    pub improving_components: usize,
    pub declining_components: usize,
    pub component_progress: Vec<ComponentGapProgress>,
    pub success_stories: Vec<String>,
    pub areas_needing_attention: Vec<String>,
}

/// Component Gap Progress
/// Matches: fsfi-backend/src/fsfvi/service/performance_gap_analysis.rs:803-809
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentGapProgress {
    pub component_type: String,
    pub baseline_gap: f64,
    pub current_gap: f64,
    pub gap_change: f64,
    #[serde(alias = "closure_percent")]
    pub gap_closure_percent: f64,
    #[serde(alias = "status")]
    pub progress_status: String, // "good", "moderate", "stagnant", etc.
    // Government-calculated field: gap closure rate per month
    #[serde(skip_serializing_if = "Option::is_none")]
    pub monthly_closure_rate: Option<f64>,
    // Optional additional fields from API
    #[serde(skip_serializing_if = "Option::is_none")]
    pub baseline_value: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_value: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value_change: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetRecommendationRequest {
    pub components: Vec<ComponentInput>,
    pub target_timeline_months: usize,
    pub peer_countries: Option<Vec<PeerCountryData>>,
}

/// Target Recommendation Report
/// Matches: fsfi-backend/src/fsfvi/service/performance_gap_analysis.rs:816-820
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetRecommendationReport {
    pub target_timeline_months: usize,
    pub component_targets: Vec<ComponentTargetRecommendation>,
    pub overall_guidance: Vec<String>,
}

/// Component Target Recommendation
/// Matches: fsfi-backend/src/fsfvi/service/performance_gap_analysis.rs:823-831
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentTargetRecommendation {
    pub component_type: String,
    pub current_value: f64,
    pub current_gap: f64,
    pub recommended_target: f64,
    pub peer_informed_target: Option<f64>,
    pub realistic_closure_percent: f64,
    pub rationale: String,
}

// ============================================================================
// Assessment Models
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentRequest {
    pub country_name: Option<String>,
    pub components: Vec<ComponentInput>,
    pub weighting_method: Option<String>,
    pub scenario: Option<String>,
    pub currency: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentReport {
    pub fsfvi_score: f64,
    pub vulnerability_level: String,
    pub component_vulnerabilities: Vec<ComponentVulnerability>,
    pub system_insights: SystemInsights,
    pub recommendations: Vec<Recommendation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentVulnerability {
    pub component_type: String,
    pub vulnerability_score: f64,
    pub performance_gap: f64,
    pub weight: f64,
    pub sensitivity: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInsights {
    pub most_vulnerable_components: Vec<String>,
    pub highest_impact_components: Vec<String>,
    pub total_budget_usd: f64,
    pub budget_efficiency_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    pub priority: String,
    pub component_type: String,
    pub action: String,
    pub rationale: String,
    pub estimated_impact: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickCheckResult {
    pub fsfvi_score: f64,
    pub vulnerability_level: String,
    pub critical_components: Vec<String>,
}

// ============================================================================
// Strategic Planning Models
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiYearPlanRequest {
    pub country_name: Option<String>,
    pub current_components: Vec<ComponentInput>,
    pub planning_years: usize,
    pub target_fsfvi: f64,
    pub yearly_budget_constraints: Option<HashMap<usize, YearlyBudgetConstraint>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YearlyBudgetConstraint {
    pub total_budget_ceiling_usd: f64,
    pub min_allocation_per_component_usd: f64,
    pub max_change_percent_from_previous: Option<f64>,
    pub priority_components: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiYearStrategicPlan {
    pub baseline_fsfvi: f64,
    pub target_fsfvi: f64,
    pub planning_years: usize,
    pub target_already_achieved: bool,
    pub yearly_plans: Vec<YearlyPlan>,
    pub total_additional_investment_needed: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YearlyPlan {
    pub year: usize,
    pub target_fsfvi: f64,
    pub projected_fsfvi: f64,
    pub recommended_allocations: HashMap<String, f64>,
    pub total_budget: f64,
    pub key_interventions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MtefRequest {
    pub current_components: Vec<ComponentInput>,
    pub target_improvement_percent: f64,
    pub yearly_budget_growth_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MtefPlan {
    pub baseline_fsfvi: f64,
    pub target_fsfvi: f64,
    pub yearly_plans: Vec<YearlyPlan>,
}
