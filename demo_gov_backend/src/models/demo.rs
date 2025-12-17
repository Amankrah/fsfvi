/// FSFVI Demo Data Models
/// ======================
/// Models for generating demo data to showcase FSFVI API capabilities
/// These match the actual FSFVI API structure from fsfi-backend

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Core Component Input (used by all endpoints)
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
// API Response Wrapper (all endpoints return this structure)
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
// Assessment Demo Data
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentDemoData {
    pub title: String,
    pub description: String,
    pub sample_components: Vec<ComponentInput>,
    pub expected_fsfvi_range: String,
    pub use_case: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentResult {
    pub fsfvi_score: f64,
    pub vulnerability_level: String,
    pub component_scores: Vec<ComponentScore>,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentScore {
    pub component_type: String,
    pub score: f64,
    pub weight: f64,
}

// ============================================================================
// Strategic Planning Demo Data
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrategicPlanningDemoData {
    pub title: String,
    pub description: String,
    pub sample_components: Vec<ComponentInput>,
    pub planning_years: usize,
    pub target_fsfvi: f64,
    pub use_case: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiYearPlanResponse {
    pub baseline_fsfvi: f64,
    pub target_fsfvi: f64,
    pub planning_years: usize,
    pub yearly_plans: Vec<YearlyPlan>,
    pub total_investment_required_usd: f64,
    pub feasibility_assessment: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YearlyPlan {
    pub year: usize,
    pub target_fsfvi: f64,
    pub projected_fsfvi: f64,
    pub recommended_allocations: HashMap<String, f64>,
    pub total_budget: f64,
    pub priority_components: Vec<String>,
}

// ============================================================================
// Budget Optimization Demo Data
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetOptimizationDemoData {
    pub title: String,
    pub description: String,
    pub sample_components: Vec<ComponentInput>,
    pub total_budget_usd: f64,
    pub use_case: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetOptimizationResponse {
    pub optimal_allocations: Vec<BudgetAllocation>,
    pub projected_fsfvi: f64,
    pub total_budget_used: f64,
    pub efficiency_score: f64,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetAllocation {
    pub component_type: String,
    pub recommended_allocation_usd: f64,
    pub expected_impact: f64,
    pub roi_score: f64,
}

// ============================================================================
// Performance Gap Analysis Demo Data
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceGapDemoData {
    pub title: String,
    pub description: String,
    pub sample_components: Vec<ComponentInput>,
    pub use_case: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceGapAnalysisResponse {
    pub overall_gap: f64,
    pub component_gaps: Vec<PerformanceGap>,
    pub priority_areas: Vec<String>,
    pub estimated_cost_to_close_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceGap {
    pub component_type: String,
    pub current_value: f64,
    pub benchmark_value: f64,
    pub gap_absolute: f64,
    pub gap_percentage: f64,
    pub priority_level: String,
}

// ============================================================================
// Scenario Simulation Demo Data
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioSimulationDemoData {
    pub title: String,
    pub description: String,
    pub sample_components: Vec<ComponentInput>,
    pub scenarios: Vec<String>,
    pub use_case: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioResult {
    pub scenario_name: String,
    pub projected_fsfvi: f64,
    pub component_impacts: HashMap<String, f64>,
    pub risk_level: String,
}

// ============================================================================
// Demo Categories
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DemoCategory {
    pub id: String,
    pub title: String,
    pub description: String,
    pub scope: String,
    pub icon: String,
    pub color: String,
    pub endpoints: Vec<DemoEndpoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DemoEndpoint {
    pub id: String,
    pub title: String,
    pub description: String,
    pub method: String,
    pub path: String,
    pub sample_request: serde_json::Value,
    pub use_case: String,
}

// ============================================================================
// Demo API Overview
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DemoOverview {
    pub categories: Vec<DemoCategory>,
    pub total_endpoints: usize,
    pub api_version: String,
    pub documentation_url: String,
}
