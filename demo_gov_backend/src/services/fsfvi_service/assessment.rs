/// Assessment Service
/// ===================
/// Handles FSFVI vulnerability assessments
/// Endpoint Reference: fsfi-backend/src/fsfvi_api/handlers.rs:34-177
///
/// CRITICAL: Provides the overall vulnerability score that guides government
/// policy decisions and resource allocation

use super::client::FsfviClient;
use super::error::FsfviServiceError;
use super::models::*;

pub struct AssessmentService {
    client: FsfviClient,
}

impl AssessmentService {
    pub fn new(client: FsfviClient) -> Self {
        Self { client }
    }

    /// Run comprehensive FSFVI assessment
    ///
    /// Endpoint: POST /api/v1/fsfvi/assessments
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:57-125
    ///
    /// This is the core assessment that calculates the Food System Financial
    /// Vulnerability Index and provides comprehensive recommendations
    pub async fn run_assessment(
        &self,
        components: Vec<ComponentInput>,
        country_name: Option<String>,
        weighting_method: Option<String>,
        scenario: Option<String>,
    ) -> Result<ApiResponse<AssessmentReport>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for assessment".to_string(),
            ));
        }

        // Validate weighting method if provided
        if let Some(ref method) = weighting_method {
            const VALID_METHODS: &[&str] = &["hybrid", "expert", "financial", "network"];
            if !VALID_METHODS.contains(&method.as_str()) {
                return Err(FsfviServiceError::ValidationError(format!(
                    "Invalid weighting_method '{}'. Must be one of: {}",
                    method,
                    VALID_METHODS.join(", ")
                )));
            }
        }

        // Validate scenario if provided
        if let Some(ref scen) = scenario {
            const VALID_SCENARIOS: &[&str] = &[
                "normal_operations",
                "climate_shock",
                "financial_crisis",
                "pandemic_disruption",
                "supply_chain_disruption",
                "cyber_threats",
                "political_instability",
            ];
            if !VALID_SCENARIOS.contains(&scen.as_str()) {
                return Err(FsfviServiceError::ValidationError(format!(
                    "Invalid scenario '{}'. Must be one of: {}",
                    scen,
                    VALID_SCENARIOS.join(", ")
                )));
            }
        }

        log::info!(
            "Running FSFVI assessment for {} components (weighting: {:?}, scenario: {:?})",
            components.len(),
            weighting_method,
            scenario
        );

        // Validate all components
        for component in &components {
            self.validate_component(component)?;
        }

        let request = AssessmentRequest {
            country_name,
            components,
            weighting_method,
            scenario,
            currency: Some("USD".to_string()),
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize assessment request: {}",
                e
            )))?;

        self.client
            .post("/api/v1/fsfvi/assessments", body)
            .await
    }

    /// Quick vulnerability check
    ///
    /// Endpoint: POST /api/v1/fsfvi/assessments/quick
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:144-177
    ///
    /// Provides a rapid vulnerability score without full reporting,
    /// useful for frequent monitoring or dashboard displays
    pub async fn quick_check(
        &self,
        components: Vec<ComponentInput>,
    ) -> Result<ApiResponse<QuickCheckResult>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for quick check".to_string(),
            ));
        }

        log::info!("Running quick vulnerability check for {} components", components.len());

        // Validate all components
        for component in &components {
            self.validate_component(component)?;
        }

        let body = serde_json::to_value(&components)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize components: {}",
                e
            )))?;

        self.client
            .post("/api/v1/fsfvi/assessments/quick", body)
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
