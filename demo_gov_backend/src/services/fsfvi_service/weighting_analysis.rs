/// Weighting Analysis Service
/// ===========================
/// Handles methodology validation and sensitivity analysis for weights
/// Endpoint Reference: fsfi-backend/src/fsfvi_api/weighting_analysis.rs
///
/// CRITICAL: Provides transparency into how component weights are calculated

use super::client::FsfviClient;
use super::error::FsfviServiceError;
use super::models::*;
use serde::{Deserialize, Serialize};

pub struct WeightingAnalysisService {
    client: FsfviClient,
}

impl WeightingAnalysisService {
    pub fn new(client: FsfviClient) -> Self {
        Self { client }
    }

    /// Analyze how hybrid weights change across different scenarios
    ///
    /// Endpoint: POST /api/v1/fsfvi/analysis/weights/scenario-sensitivity/hybrid
    pub async fn analyze_scenario_sensitivity_hybrid(
        &self,
        components: Vec<ComponentInput>,
        scenarios: Vec<String>,
    ) -> Result<ApiResponse<ScenarioSensitivityReport>, FsfviServiceError> {
        if components.is_empty() || scenarios.len() < 2 {
            return Err(FsfviServiceError::ValidationError(
                "At least one component and two scenarios are required".to_string(),
            ));
        }

        let request = HybridScenarioSensitivityRequest {
            components,
            scenarios,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(e.to_string()))?;

        self.client
            .post("/api/v1/fsfvi/analysis/weights/scenario-sensitivity/hybrid", body)
            .await
    }

    /// Analyze how expert weights (AHP-based) change across scenarios
    ///
    /// Endpoint: POST /api/v1/fsfvi/analysis/weights/scenario-sensitivity/expert
    pub async fn analyze_scenario_sensitivity_expert(
        &self,
        scenarios: Vec<String>,
    ) -> Result<ApiResponse<ScenarioSensitivityReport>, FsfviServiceError> {
        if scenarios.len() < 2 {
            return Err(FsfviServiceError::ValidationError(
                "At least two scenarios are required for comparison".to_string(),
            ));
        }

        let request = ExpertScenarioSensitivityRequest { scenarios };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(e.to_string()))?;

        self.client
            .post("/api/v1/fsfvi/analysis/weights/scenario-sensitivity/expert", body)
            .await
    }

    /// Analyze how financial weights change across budget allocations
    ///
    /// Endpoint: POST /api/v1/fsfvi/analysis/weights/financial
    pub async fn analyze_financial_weights(
        &self,
        component_scenarios: Vec<Vec<ComponentInput>>,
        scenario_names: Option<Vec<String>>,
        is_crisis: bool,
        include_efficiency_analysis: bool,
    ) -> Result<ApiResponse<FinancialWeightsReport>, FsfviServiceError> {
        if component_scenarios.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one allocation scenario is required".to_string(),
            ));
        }

        let request = FinancialWeightsRequest {
            component_scenarios,
            scenario_names,
            is_crisis: Some(is_crisis),
            include_efficiency_analysis: Some(include_efficiency_analysis),
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(e.to_string()))?;

        self.client
            .post("/api/v1/fsfvi/analysis/weights/financial", body)
            .await
    }

    /// Get list of available scenarios
    ///
    /// Endpoint: GET /api/v1/fsfvi/analysis/weights/available-scenarios
    pub async fn get_available_scenarios(
        &self,
    ) -> Result<ApiResponse<Vec<String>>, FsfviServiceError> {
        self.client
            .get("/api/v1/fsfvi/analysis/weights/available-scenarios")
            .await
    }
}

// Models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HybridScenarioSensitivityRequest {
    pub components: Vec<ComponentInput>,
    pub scenarios: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpertScenarioSensitivityRequest {
    pub scenarios: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialWeightsRequest {
    pub component_scenarios: Vec<Vec<ComponentInput>>,
    pub scenario_names: Option<Vec<String>>,
    pub is_crisis: Option<bool>,
    pub include_efficiency_analysis: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioSensitivityReport {
    pub scenarios: Vec<String>,
    pub weight_changes: Vec<WeightChange>,
    pub max_variation: f64,
    pub stable_components: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeightChange {
    pub component_type: String,
    pub weights_by_scenario: std::collections::HashMap<String, f64>,
    pub variation_coefficient: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialWeightsReport {
    pub scenarios: Vec<FinancialScenarioWeights>,
    pub key_findings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialScenarioWeights {
    pub scenario_name: String,
    pub weights: std::collections::HashMap<String, f64>,
    pub funding_gaps: Option<std::collections::HashMap<String, f64>>,
}
