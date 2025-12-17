/// Sensitivity Analysis Service
/// ==============================
/// Tests robustness of FSFVI calculations to parameter variations
/// Endpoint Reference: fsfi-backend/src/fsfvi_api/handlers.rs:729-825
///
/// CRITICAL: Helps governments understand how sensitive their vulnerability
/// scores are to changes in weights, parameters, and benchmarks

use super::client::FsfviClient;
use super::error::FsfviServiceError;
use super::models::*;
use serde::{Deserialize, Serialize};

pub struct SensitivityAnalysisService {
    client: FsfviClient,
}

impl SensitivityAnalysisService {
    pub fn new(client: FsfviClient) -> Self {
        Self { client }
    }

    /// Run comprehensive sensitivity analysis
    ///
    /// Endpoint: POST /api/v1/fsfvi/sensitivity/analyze
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:747-825
    ///
    /// Supports multiple analysis types:
    /// - Weight: How sensitive is FSFVI to component weight changes?
    /// - Parameter: How sensitive to sensitivity parameter changes?
    /// - Benchmark: How sensitive to benchmark value changes?
    /// - Scenario: How robust across different crisis scenarios?
    /// - MonteCarlo: Statistical robustness with random variations
    pub async fn run_sensitivity_analysis(
        &self,
        components: Vec<ComponentInput>,
        analysis_type: SensitivityAnalysisType,
        perturbation_levels: Option<Vec<f64>>,
        num_simulations: Option<usize>,
    ) -> Result<ApiResponse<serde_json::Value>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for sensitivity analysis".to_string(),
            ));
        }

        // Validate perturbation levels if provided
        if let Some(ref levels) = perturbation_levels {
            for &level in levels {
                if level < 0.0 || level > 1.0 {
                    return Err(FsfviServiceError::ValidationError(format!(
                        "Perturbation level must be between 0 and 1, got: {}",
                        level
                    )));
                }
            }
        }

        // Validate num_simulations for Monte Carlo
        if matches!(analysis_type, SensitivityAnalysisType::MonteCarlo) {
            if let Some(sims) = num_simulations {
                if sims < 100 || sims > 10000 {
                    return Err(FsfviServiceError::ValidationError(format!(
                        "Number of simulations must be between 100 and 10000, got: {}",
                        sims
                    )));
                }
            }
        }

        log::info!(
            "Running {:?} sensitivity analysis for {} components",
            analysis_type,
            components.len()
        );

        for component in &components {
            self.validate_component(component)?;
        }

        let request = SensitivityAnalysisRequest {
            components,
            analysis_type,
            perturbation_levels,
            num_simulations,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize request: {}",
                e
            )))?;

        self.client
            .post("/api/v1/fsfvi/sensitivity/analyze", body)
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
pub struct SensitivityAnalysisRequest {
    pub components: Vec<ComponentInput>,
    pub analysis_type: SensitivityAnalysisType,
    pub perturbation_levels: Option<Vec<f64>>,
    pub num_simulations: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SensitivityAnalysisType {
    Weight,
    Parameter,
    Benchmark,
    Scenario,
    MonteCarlo,
}
