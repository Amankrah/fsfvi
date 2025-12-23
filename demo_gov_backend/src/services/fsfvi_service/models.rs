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
    /// Financial allocation in USD
    /// Assessment API expects this as "financial_allocation_usd"
    /// Budget Optimization API expects "financial_allocation" (in millions)
    pub financial_allocation_usd: f64,
    pub weight: Option<f64>,
    pub sensitivity_parameter: Option<f64>,
}

impl ComponentInput {
    /// Convert to budget optimization Component format
    /// Budget optimization API expects financial_allocation in MILLIONS USD
    pub fn to_budget_component(&self) -> BudgetComponent {
        BudgetComponent {
            component_id: self.component_id.clone(),
            component_type: self.component_type.clone(),
            observed_value: self.observed_value,
            benchmark_value: self.benchmark_value,
            financial_allocation: self.financial_allocation_usd / 1_000_000.0,
            weight: self.weight,
            sensitivity_parameter: self.sensitivity_parameter,
        }
    }
}

/// Budget Component format for Budget Optimization API
/// Matches: fsfi-backend/src/fsfvi/validators.rs:Component
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetComponent {
    pub component_id: Option<String>,
    pub component_type: String,
    pub observed_value: f64,
    pub benchmark_value: f64,
    /// Financial allocation in MILLIONS of USD (not raw USD)
    pub financial_allocation: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weight: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
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

/// Assessment Report from FSFVI API
/// Matches: fsfi-backend/src/fsfvi/service/vulnerability_assessment.rs:428-434
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentReport {
    pub executive_summary: ExecutiveSummary,
    pub system_result: SystemFsfviResult,
    pub component_insights: Vec<ComponentInsight>,
    pub methodology: MethodologyInfo,
    pub metadata: ReportMetadata,
}

/// Executive Summary
/// Matches: fsfi-backend/src/fsfvi/service/vulnerability_assessment.rs:437-446
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutiveSummary {
    pub overall_fsfvi: f64,
    pub vulnerability_percentage: f64,
    pub risk_level: String,
    pub key_finding: String,
    pub components_analyzed: usize,
    pub critical_components: usize,
    pub immediate_actions_required: usize,
    pub top_vulnerabilities: Vec<ComponentSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentSummary {
    pub name: String,
    pub vulnerability: f64,
    pub contribution_percent: f64,
}

/// System FSFVI Result
/// Matches: fsfi-backend/src/fsfvi/fsfvi_core/metrics.rs:30-60
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemFsfviResult {
    pub fsfvi_value: f64,
    pub vulnerability_percent: f64,
    pub risk_level: String,
    pub total_allocation: f64,
    pub total_allocation_millions: f64,
    pub component_statistics: ComponentStatistics,
    pub priority_distribution: HashMap<String, usize>,
    pub critical_components: Vec<ComponentInfo>,
    pub high_risk_components: Vec<ComponentInfo>,
    pub components_requiring_immediate_attention: usize,
    pub component_contributions: Vec<ComponentContribution>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_3_vulnerability_contributors: Option<Vec<ComponentContribution>>,
    pub resilience_indicators: ResilienceIndicators,
    pub efficiency_metrics: EfficiencyMetrics,
    pub government_insights: GovernmentInsights,
    pub action_priorities: ActionPriorities,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentStatistics {
    pub total_components: usize,
    pub average_vulnerability: f64,
    pub weighted_average_vulnerability: f64,
    pub max_vulnerability: f64,
    pub min_vulnerability: f64,
    pub vulnerability_standard_deviation: f64,
    pub vulnerability_range: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentInfo {
    pub name: String,
    pub vulnerability: f64,
    /// Allocation in MILLIONS USD (backend sends in millions, not raw USD)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub allocation: Option<f64>,
    pub weight: f64,
    /// Priority level is not always included in all contexts
    #[serde(skip_serializing_if = "Option::is_none")]
    pub priority_level: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentContribution {
    pub component_name: String,
    pub component_type: String,
    pub vulnerability: f64,
    pub weight: f64,
    pub weighted_vulnerability: f64,
    pub contribution_to_system_vulnerability_percent: f64,
    pub financial_allocation: f64,
    pub allocation_percent: f64,
    pub priority_level: String,
    pub efficiency_ratio: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResilienceIndicators {
    pub vulnerability_concentration: f64,
    pub component_balance: f64,
    pub resource_efficiency: f64,
    pub critical_dependency_risk: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EfficiencyMetrics {
    pub allocation_concentration: f64,
    pub vulnerability_concentration: f64,
    pub diversification_index: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernmentInsights {
    pub financing_efficiency_percent: f64,
    pub intervention_urgency: String,
    pub budget_optimization_potential: String,
    pub system_stability: String,
    pub resource_allocation_quality: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionPriorities {
    pub immediate_actions_0_6_months: Vec<String>,
    pub strategic_actions_6_24_months: Vec<String>,
    pub resource_recommendations: Vec<String>,
    pub overall_urgency: String,
    pub estimated_intervention_cost: String,
}

/// Component Insight
/// Matches: fsfi-backend/src/fsfvi/service/vulnerability_assessment.rs:456-468
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentInsight {
    pub component_name: String,
    pub component_type: String,
    pub vulnerability: f64,
    pub weight: f64,
    pub contribution_to_system: f64,
    pub sensitivity_parameter: f64,
    pub priority_level: String,
    pub efficiency_index: f64,
    pub is_critical: bool,
    pub recommendations: Vec<String>,
}

/// Methodology Info
/// Matches: fsfi-backend/src/fsfvi/service/vulnerability_assessment.rs:469-474
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MethodologyInfo {
    pub weighting_method: String,
    pub scenario: String,
    pub context_used: bool,
    pub sensitivity_estimation: String,
}

/// Report Metadata
/// Matches: fsfi-backend/src/fsfvi/service/vulnerability_assessment.rs:477-481
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportMetadata {
    pub country: Option<String>,
    pub assessment_date: String,
    pub total_budget_analyzed: f64,
    pub currency: String,
}

/// Quick Check Result (simplified assessment)
/// Matches: fsfi-backend/src/fsfvi/service/vulnerability_assessment.rs:485-491
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickCheckResult {
    pub fsfvi_score: f64,
    pub risk_level: String,
    pub critical_components: Vec<String>,
    pub immediate_actions_needed: usize,
    pub summary: String,
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

// ============================================================================
// Budget Optimization Models
// ============================================================================
// NOTE: Budget optimization types are defined in budget_optimization.rs
// and re-exported through mod.rs to avoid duplicate definitions
