/// Decision Support Service
/// ========================
/// Synthesizes FSFVI analyses into actionable policy recommendations
/// Endpoint Reference: fsfi-backend/src/fsfvi_api/handlers.rs:1284-1530
///
/// CRITICAL: Recommendations directly influence policies affecting millions of lives
/// Every recommendation must be evidence-based, actionable, and prioritized

use super::client::FsfviClient;
use super::error::FsfviServiceError;
use super::models::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub struct DecisionSupportService {
    client: FsfviClient,
}

impl DecisionSupportService {
    pub fn new(client: FsfviClient) -> Self {
        Self { client }
    }

    /// Generate comprehensive policy recommendations
    ///
    /// Endpoint: POST /api/v1/fsfvi/decision-support/policy-recommendations
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:1302-1347
    ///
    /// Combines vulnerability assessment, optimization, and sensitivity analysis
    /// to provide evidence-based policy guidance
    pub async fn generate_policy_recommendations(
        &self,
        components: Vec<ComponentInput>,
        country_name: Option<String>,
        planning_horizon_months: usize,
        include_budget_optimization: bool,
        include_sensitivity_analysis: bool,
    ) -> Result<ApiResponse<PolicyRecommendationReport>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for policy recommendations".to_string(),
            ));
        }

        if planning_horizon_months == 0 || planning_horizon_months > 240 {
            return Err(FsfviServiceError::ValidationError(
                "Planning horizon must be between 1 and 240 months".to_string(),
            ));
        }

        log::info!(
            "Generating policy recommendations for {} components, horizon: {} months",
            components.len(),
            planning_horizon_months
        );

        for component in &components {
            self.validate_component(component)?;
        }

        let request = PolicyRecommendationRequest {
            components,
            country_name,
            currency: Some("USD".to_string()),
            planning_horizon_months,
            include_budget_optimization,
            include_sensitivity_analysis,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(e.to_string()))?;

        self.client
            .post("/api/v1/fsfvi/decision-support/policy-recommendations", body)
            .await
    }

    /// Generate emergency crisis response recommendations
    ///
    /// Endpoint: POST /api/v1/fsfvi/decision-support/crisis-response
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:1367-1407
    ///
    /// Urgent interventions for drought, pandemic, conflict, etc.
    pub async fn generate_crisis_response(
        &self,
        components: Vec<ComponentInput>,
        crisis_scenario: CrisisScenario,
        available_emergency_budget_usd: f64,
    ) -> Result<ApiResponse<CrisisResponseReport>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for crisis response".to_string(),
            ));
        }

        if available_emergency_budget_usd < 0.0 || !available_emergency_budget_usd.is_finite() {
            return Err(FsfviServiceError::ValidationError(format!(
                "Emergency budget must be >= 0 and finite, got: {}",
                available_emergency_budget_usd
            )));
        }

        log::info!(
            "Generating crisis response for {:?} with budget: ${:.2}",
            crisis_scenario,
            available_emergency_budget_usd
        );

        for component in &components {
            self.validate_component(component)?;
        }

        let request = CrisisResponseRequest {
            components,
            crisis_scenario,
            available_emergency_budget_usd,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(e.to_string()))?;

        self.client
            .post("/api/v1/fsfvi/decision-support/crisis-response", body)
            .await
    }

    /// Track progress over time comparing baseline to current state
    ///
    /// Endpoint: POST /api/v1/fsfvi/decision-support/track-progress
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:1427-1474
    ///
    /// Monitoring dashboard for tracking improvement
    pub async fn track_progress(
        &self,
        baseline_components: Vec<ComponentInput>,
        current_components: Vec<ComponentInput>,
        time_period_months: usize,
    ) -> Result<ApiResponse<ProgressTrackingReport>, FsfviServiceError> {
        if baseline_components.is_empty() || current_components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "Both baseline and current components are required".to_string(),
            ));
        }

        if baseline_components.len() != current_components.len() {
            return Err(FsfviServiceError::ValidationError(
                "Baseline and current components must have the same number of entries".to_string(),
            ));
        }

        if time_period_months == 0 {
            return Err(FsfviServiceError::ValidationError(
                "Time period must be at least 1 month".to_string(),
            ));
        }

        log::info!(
            "Tracking progress over {} months for {} components",
            time_period_months,
            baseline_components.len()
        );

        for component in baseline_components.iter().chain(current_components.iter()) {
            self.validate_component(component)?;
        }

        let request = ProgressTrackingRequest {
            baseline_components,
            current_components,
            time_period_months,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(e.to_string()))?;

        self.client
            .post("/api/v1/fsfvi/decision-support/track-progress", body)
            .await
    }

    /// Generate stakeholder communication brief
    ///
    /// Endpoint: POST /api/v1/fsfvi/decision-support/stakeholder-brief
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:1494-1530
    ///
    /// Translates technical FSFVI analysis into clear language
    /// for ministers, parliament, public, donors/partners
    pub async fn generate_stakeholder_brief(
        &self,
        components: Vec<ComponentInput>,
        audience: StakeholderAudience,
    ) -> Result<ApiResponse<StakeholderBrief>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for stakeholder brief".to_string(),
            ));
        }

        log::info!("Generating stakeholder brief for {:?} audience", audience);

        for component in &components {
            self.validate_component(component)?;
        }

        let request = StakeholderBriefRequest {
            components,
            audience,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(e.to_string()))?;

        self.client
            .post("/api/v1/fsfvi/decision-support/stakeholder-brief", body)
            .await
    }

    fn validate_component(&self, component: &ComponentInput) -> Result<(), FsfviServiceError> {
        const VALID_TYPES: &[&str] = &[
            "agricultural_development",
            "infrastructure",
            "nutrition_health",
            "climate_natural_resources",
            "social_protection_equity",
            "governance_institutions",
        ];

        if !VALID_TYPES.contains(&component.component_type.as_str()) {
            return Err(FsfviServiceError::ValidationError(format!(
                "Invalid component_type '{}'",
                component.component_type
            )));
        }

        if component.observed_value < 0.0 || !component.observed_value.is_finite() {
            return Err(FsfviServiceError::ValidationError(format!(
                "Invalid observed_value for '{}'",
                component.component_type
            )));
        }

        if component.benchmark_value < 0.0 || !component.benchmark_value.is_finite() {
            return Err(FsfviServiceError::ValidationError(format!(
                "Invalid benchmark_value for '{}'",
                component.component_type
            )));
        }

        if component.financial_allocation_usd < 0.0 || !component.financial_allocation_usd.is_finite() {
            return Err(FsfviServiceError::ValidationError(format!(
                "Invalid financial_allocation_usd for '{}'",
                component.component_type
            )));
        }

        Ok(())
    }
}

// Models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRecommendationRequest {
    pub components: Vec<ComponentInput>,
    pub country_name: Option<String>,
    pub currency: Option<String>,
    pub planning_horizon_months: usize,
    pub include_budget_optimization: bool,
    pub include_sensitivity_analysis: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRecommendationReport {
    pub executive_summary: ExecutiveSummary,
    pub current_vulnerability: VulnerabilitySnapshot,
    pub priority_interventions: Vec<PriorityIntervention>,
    pub budget_recommendations: Option<BudgetRecommendations>,
    pub implementation_plan: ImplementationPlan,
    pub quick_wins: Vec<QuickWin>,
    pub risk_assessment: RiskAssessment,
    pub robustness_assessment: Option<RobustnessAssessment>,
    pub monitoring_indicators: Vec<MonitoringIndicator>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutiveSummary {
    pub situation: String,
    pub key_recommendations: Vec<String>,
    pub expected_impact: String,
    pub urgency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VulnerabilitySnapshot {
    pub fsfvi: f64,
    pub risk_level: String,
    pub critical_components: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriorityIntervention {
    pub component_type: String,
    pub current_vulnerability: f64,
    pub urgency: String,
    pub recommended_actions: Vec<String>,
    pub estimated_impact: f64,
    pub estimated_cost_range: (f64, f64),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetRecommendations {
    pub current_allocation_efficiency: f64,
    pub optimal_allocations: HashMap<String, f64>,
    pub expected_fsfvi_improvement: f64,
    pub reallocation_priorities: Vec<(String, f64)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RobustnessAssessment {
    pub is_robust: bool,
    pub confidence_level: String,
    pub key_uncertainties: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImplementationPlan {
    pub planning_horizon_months: usize,
    pub immediate_actions: Vec<String>,
    pub short_term_actions: Vec<String>,
    pub medium_term_actions: Vec<String>,
    pub milestones: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickWin {
    pub component_type: String,
    pub action: String,
    pub estimated_impact: f64,
    pub estimated_duration_months: usize,
    pub justification: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub risks: Vec<Risk>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Risk {
    pub risk_type: String,
    pub severity: String,
    pub description: String,
    pub mitigation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringIndicator {
    pub indicator_name: String,
    pub current_value: f64,
    pub target_value: f64,
    pub measurement_frequency: String,
    pub data_source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrisisResponseRequest {
    pub components: Vec<ComponentInput>,
    pub crisis_scenario: CrisisScenario,
    pub available_emergency_budget_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CrisisScenario {
    NormalOperations,
    ClimateShock,
    PandemicDisruption,
    PoliticalInstability,
    FinancialCrisis,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrisisResponseReport {
    pub crisis_type: String,
    pub baseline_fsfvi: f64,
    pub crisis_fsfvi: f64,
    pub fsfvi_increase: f64,
    pub severity_level: String,
    pub most_affected_components: Vec<ComponentCrisisImpact>,
    pub emergency_interventions: Vec<EmergencyIntervention>,
    pub response_timeline: Vec<TimelinePhase>,
    pub estimated_people_affected: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentCrisisImpact {
    pub component_type: String,
    pub baseline_vulnerability: f64,
    pub crisis_vulnerability: f64,
    pub vulnerability_increase: f64,
    pub impact_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyIntervention {
    pub component_type: String,
    pub intervention_type: String,
    pub budget_allocation: f64,
    pub timeline_days: usize,
    pub expected_vulnerability_reduction: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelinePhase {
    pub phase: String,
    pub actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressTrackingRequest {
    pub baseline_components: Vec<ComponentInput>,
    pub current_components: Vec<ComponentInput>,
    pub time_period_months: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressTrackingReport {
    pub time_period_months: usize,
    pub baseline_fsfvi: f64,
    pub current_fsfvi: f64,
    pub fsfvi_change: f64,
    pub performance_status: String,
    pub component_changes: Vec<ComponentProgress>,
    pub achievements: Vec<String>,
    pub areas_needing_attention: Vec<String>,
    pub recommended_next_steps: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentProgress {
    pub component_type: String,
    pub baseline_vulnerability: f64,
    pub current_vulnerability: f64,
    pub change: f64,
    pub trend: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakeholderBriefRequest {
    pub components: Vec<ComponentInput>,
    pub audience: StakeholderAudience,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StakeholderAudience {
    Ministers,
    Parliament,
    Public,
    DonorsPartners,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakeholderBrief {
    pub audience: String,
    pub key_messages: Vec<String>,
    pub talking_points: Vec<String>,
    pub infographic_data: InfographicData,
    pub call_to_action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfographicData {
    pub overall_score: f64,
    pub risk_level_color: String,
    pub component_scores: Vec<(String, f64)>,
}
