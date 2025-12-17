/// Scenario Simulation Service
/// ============================
/// Simulates impact of different scenarios on food system vulnerability
/// Endpoint Reference: fsfi-backend/src/fsfvi_api/handlers.rs:1033-1278
///
/// CRITICAL: Helps governments prepare for crises and test policy interventions

use super::client::FsfviClient;
use super::error::FsfviServiceError;
use super::models::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub struct ScenarioSimulationService {
    client: FsfviClient,
}

impl ScenarioSimulationService {
    pub fn new(client: FsfviClient) -> Self {
        Self { client }
    }

    /// Compare multiple scenarios (normal, climate shock, pandemic, etc.)
    ///
    /// Endpoint: POST /api/v1/fsfvi/scenarios/compare
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:1051-1087
    pub async fn compare_scenarios(
        &self,
        components: Vec<ComponentInput>,
        scenarios: Vec<String>,
    ) -> Result<ApiResponse<ScenarioComparisonReport>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for scenario comparison".to_string(),
            ));
        }

        if scenarios.len() < 2 {
            return Err(FsfviServiceError::ValidationError(
                "At least two scenarios are required for comparison".to_string(),
            ));
        }

        log::info!("Comparing {} scenarios for {} components", scenarios.len(), components.len());

        for component in &components {
            self.validate_component(component)?;
        }

        let request = ScenarioComparisonRequest {
            components,
            scenarios,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(e.to_string()))?;

        self.client
            .post("/api/v1/fsfvi/scenarios/compare", body)
            .await
    }

    /// Simulate specific crisis impact (drought, pandemic, conflict, etc.)
    ///
    /// Endpoint: POST /api/v1/fsfvi/scenarios/crisis
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:1107-1143
    pub async fn simulate_crisis(
        &self,
        components: Vec<ComponentInput>,
        crisis_type: CrisisType,
        intensity: CrisisIntensity,
    ) -> Result<ApiResponse<CrisisSimulationReport>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for crisis simulation".to_string(),
            ));
        }

        log::info!("Simulating {:?} crisis with {:?} intensity", crisis_type, intensity);

        for component in &components {
            self.validate_component(component)?;
        }

        let request = CrisisSimulationRequest {
            components,
            crisis_type,
            intensity,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(e.to_string()))?;

        self.client
            .post("/api/v1/fsfvi/scenarios/crisis", body)
            .await
    }

    /// Simulate impact of budget changes on vulnerability
    ///
    /// Endpoint: POST /api/v1/fsfvi/scenarios/budget-change
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:1163-1210
    pub async fn simulate_budget_changes(
        &self,
        components: Vec<ComponentInput>,
        budget_changes: Vec<BudgetChange>,
    ) -> Result<ApiResponse<BudgetChangeSimulationReport>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for budget simulation".to_string(),
            ));
        }

        if budget_changes.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one budget change is required".to_string(),
            ));
        }

        log::info!("Simulating {} budget changes", budget_changes.len());

        for component in &components {
            self.validate_component(component)?;
        }

        let request = BudgetChangeSimulationRequest {
            components,
            budget_changes,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(e.to_string()))?;

        self.client
            .post("/api/v1/fsfvi/scenarios/budget-change", body)
            .await
    }

    /// Simulate impact of policy interventions
    ///
    /// Endpoint: POST /api/v1/fsfvi/scenarios/intervention
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:1230-1278
    pub async fn simulate_intervention(
        &self,
        components: Vec<ComponentInput>,
        interventions: Vec<Intervention>,
    ) -> Result<ApiResponse<InterventionSimulationReport>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for intervention simulation".to_string(),
            ));
        }

        if interventions.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one intervention is required".to_string(),
            ));
        }

        log::info!("Simulating {} interventions", interventions.len());

        for component in &components {
            self.validate_component(component)?;
        }

        // Validate interventions
        for intervention in &interventions {
            if intervention.expected_improvement_percent < 0.0 || intervention.expected_improvement_percent > 100.0 {
                return Err(FsfviServiceError::ValidationError(format!(
                    "Expected improvement must be between 0 and 100 percent, got: {}",
                    intervention.expected_improvement_percent
                )));
            }

            if intervention.estimated_cost_usd < 0.0 {
                return Err(FsfviServiceError::ValidationError(format!(
                    "Estimated cost must be >= 0, got: {}",
                    intervention.estimated_cost_usd
                )));
            }
        }

        let request = InterventionSimulationRequest {
            components,
            interventions,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(e.to_string()))?;

        self.client
            .post("/api/v1/fsfvi/scenarios/intervention", body)
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
pub struct ScenarioComparisonRequest {
    pub components: Vec<ComponentInput>,
    pub scenarios: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioComparisonReport {
    pub baseline_fsfvi: f64,
    pub scenario_results: Vec<ScenarioResult>,
    pub most_vulnerable_scenario: String,
    pub least_vulnerable_scenario: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioResult {
    pub scenario_name: String,
    pub projected_fsfvi: f64,
    pub fsfvi_change_from_baseline: f64,
    pub component_impacts: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrisisSimulationRequest {
    pub components: Vec<ComponentInput>,
    pub crisis_type: CrisisType,
    pub intensity: CrisisIntensity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CrisisType {
    Drought,
    Flood,
    Pandemic,
    EconomicShock,
    Conflict,
    SupplyChainDisruption,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CrisisIntensity {
    Mild,
    Moderate,
    Severe,
    Catastrophic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrisisSimulationReport {
    pub baseline_fsfvi: f64,
    pub crisis_fsfvi: f64,
    pub impact_magnitude: f64,
    pub affected_components: Vec<String>,
    pub response_recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetChangeSimulationRequest {
    pub components: Vec<ComponentInput>,
    pub budget_changes: Vec<BudgetChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetChange {
    pub component_type: String,
    pub amount_usd: f64,
    pub change_type: ChangeType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChangeType {
    Increase,
    Decrease,
    Reallocation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetChangeSimulationReport {
    pub baseline_fsfvi: f64,
    pub adjusted_fsfvi: f64,
    pub fsfvi_improvement: f64,
    pub cost_effectiveness: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterventionSimulationRequest {
    pub components: Vec<ComponentInput>,
    pub interventions: Vec<Intervention>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Intervention {
    pub component_type: String,
    pub description: String,
    pub expected_improvement_percent: f64,
    pub estimated_cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterventionSimulationReport {
    pub baseline_fsfvi: f64,
    pub post_intervention_fsfvi: f64,
    pub fsfvi_reduction: f64,
    pub total_cost_usd: f64,
    pub interventions_ranked_by_roi: Vec<InterventionRanking>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterventionRanking {
    pub intervention_description: String,
    pub component_type: String,
    pub cost_usd: f64,
    pub fsfvi_impact: f64,
    pub roi_score: f64,
}
