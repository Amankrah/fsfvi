/// Strategic Planning Service
/// ===========================
/// Handles multi-year strategic planning and MTEF generation
/// Endpoint Reference: fsfi-backend/src/fsfvi_api/handlers.rs:183-476
///
/// CRITICAL: These tools help governments plan 3-5+ year strategies to reduce
/// food system vulnerability with realistic budget constraints

use std::collections::HashMap;

use super::client::FsfviClient;
use super::error::FsfviServiceError;
use super::models::*;

pub struct StrategicPlanningService {
    client: FsfviClient,
}

impl StrategicPlanningService {
    pub fn new(client: FsfviClient) -> Self {
        Self { client }
    }

    /// Generate multi-year strategic plan
    ///
    /// Endpoint: POST /api/v1/fsfvi/strategic-planning/multi-year
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:205-272
    ///
    /// Creates a comprehensive multi-year plan (1-20 years) with yearly budgets
    /// and allocations to achieve target FSFVI reduction
    pub async fn generate_multi_year_plan(
        &self,
        current_components: Vec<ComponentInput>,
        country_name: Option<String>,
        planning_years: usize,
        target_fsfvi: f64,
        yearly_budget_constraints: Option<HashMap<usize, YearlyBudgetConstraint>>,
    ) -> Result<ApiResponse<MultiYearStrategicPlan>, FsfviServiceError> {
        // Validation
        if current_components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for strategic planning".to_string(),
            ));
        }

        if planning_years < 1 || planning_years > 20 {
            return Err(FsfviServiceError::ValidationError(
                "Planning years must be between 1 and 20".to_string(),
            ));
        }

        if target_fsfvi < 0.0 || target_fsfvi > 1.0 {
            return Err(FsfviServiceError::ValidationError(
                "Target FSFVI must be between 0.0 and 1.0".to_string(),
            ));
        }

        log::info!(
            "Generating {}-year strategic plan with target FSFVI of {:.3}",
            planning_years, target_fsfvi
        );

        // Validate components
        for component in &current_components {
            self.validate_component(component)?;
        }

        // Validate budget constraints if provided
        if let Some(ref constraints) = yearly_budget_constraints {
            for (year, constraint) in constraints.iter() {
                if *year < 1 || *year > planning_years {
                    return Err(FsfviServiceError::ValidationError(format!(
                        "Budget constraint year {} is out of planning range (1-{})",
                        year, planning_years
                    )));
                }

                if constraint.total_budget_ceiling_usd < 0.0 {
                    return Err(FsfviServiceError::ValidationError(format!(
                        "Budget ceiling for year {} must be >= 0",
                        year
                    )));
                }

                if constraint.min_allocation_per_component_usd < 0.0 {
                    return Err(FsfviServiceError::ValidationError(format!(
                        "Minimum allocation for year {} must be >= 0",
                        year
                    )));
                }
            }
        }

        let request = MultiYearPlanRequest {
            country_name,
            current_components,
            planning_years,
            target_fsfvi,
            yearly_budget_constraints,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize multi-year plan request: {}",
                e
            )))?;

        self.client
            .post("/api/v1/fsfvi/strategic-planning/multi-year", body)
            .await
    }

    /// Generate 3-year Medium-Term Expenditure Framework (MTEF)
    ///
    /// Endpoint: POST /api/v1/fsfvi/strategic-planning/mtef
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:292-332
    ///
    /// Creates a standard 3-year MTEF document that many governments use for
    /// fiscal planning and budget submissions
    pub async fn generate_mtef(
        &self,
        current_components: Vec<ComponentInput>,
        target_improvement_percent: f64,
        yearly_budget_growth_rate: f64,
    ) -> Result<ApiResponse<MtefPlan>, FsfviServiceError> {
        if current_components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for MTEF generation".to_string(),
            ));
        }

        if target_improvement_percent < 0.0 || target_improvement_percent > 100.0 {
            return Err(FsfviServiceError::ValidationError(
                "Target improvement must be between 0 and 100 percent".to_string(),
            ));
        }

        if yearly_budget_growth_rate < -0.5 || yearly_budget_growth_rate > 1.0 {
            return Err(FsfviServiceError::ValidationError(
                "Budget growth rate must be between -50% and 100%".to_string(),
            ));
        }

        log::info!(
            "Generating MTEF with {:.1}% improvement target and {:.1}% yearly budget growth",
            target_improvement_percent, yearly_budget_growth_rate * 100.0
        );

        // Validate components
        for component in &current_components {
            self.validate_component(component)?;
        }

        let request = MtefRequest {
            current_components,
            target_improvement_percent,
            yearly_budget_growth_rate,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize MTEF request: {}",
                e
            )))?;

        self.client
            .post("/api/v1/fsfvi/strategic-planning/mtef", body)
            .await
    }

    /// Validate component data
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
