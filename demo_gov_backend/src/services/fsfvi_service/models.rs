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
    pub overall_gap: f64,
    pub component_gaps: Vec<ComponentGap>,
    pub priority_areas: Vec<String>,
    pub estimated_cost_to_close_usd: f64,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentGap {
    pub component_type: String,
    pub current_value: f64,
    pub benchmark_value: f64,
    pub gap_absolute: f64,
    pub gap_percentage: f64,
    pub priority_level: String,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerComparisonReport {
    pub subject_country_fsfvi: f64,
    pub peer_averages: HashMap<String, f64>,
    pub rankings: HashMap<String, usize>,
    pub relative_position: String,
    pub best_practices_identified: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GapClosureRequest {
    pub baseline_components: Vec<ComponentInput>,
    pub current_components: Vec<ComponentInput>,
    pub time_period_months: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GapClosureReport {
    pub baseline_fsfvi: f64,
    pub current_fsfvi: f64,
    pub fsfvi_change: f64,
    pub component_progress: Vec<ComponentProgress>,
    pub monthly_improvement_rate: f64,
    pub on_track_to_targets: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentProgress {
    pub component_type: String,
    pub baseline_gap: f64,
    pub current_gap: f64,
    pub gap_closed_percentage: f64,
    pub progress_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetRecommendationRequest {
    pub components: Vec<ComponentInput>,
    pub target_timeline_months: usize,
    pub peer_countries: Option<Vec<PeerCountryData>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetRecommendationReport {
    pub current_fsfvi: f64,
    pub recommended_targets: Vec<ComponentTarget>,
    pub achievability_assessment: String,
    pub estimated_budget_required_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentTarget {
    pub component_type: String,
    pub current_value: f64,
    pub recommended_target: f64,
    pub improvement_required: f64,
    pub achievability: String,
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
