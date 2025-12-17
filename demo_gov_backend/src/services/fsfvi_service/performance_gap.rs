/// Performance Gap Analysis Service
/// ==================================
/// Handles all performance gap analysis operations
/// Endpoint Reference: fsfi-backend/src/fsfvi_api/handlers.rs:483-723
///
/// CRITICAL: This service helps governments identify where their food systems
/// are underperforming and prioritize interventions to close gaps

use super::client::FsfviClient;
use super::error::FsfviServiceError;
use super::models::*;

pub struct PerformanceGapService {
    client: FsfviClient,
}

impl PerformanceGapService {
    pub fn new(client: FsfviClient) -> Self {
        Self { client }
    }

    /// Analyze performance gaps vs benchmarks
    ///
    /// Endpoint: POST /api/v1/fsfvi/performance-gaps/analyze
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:500-533
    ///
    /// This identifies which components are underperforming and by how much,
    /// helping governments prioritize where to allocate resources
    pub async fn analyze_performance_gaps(
        &self,
        components: Vec<ComponentInput>,
    ) -> Result<ApiResponse<PerformanceGapAnalysisReport>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for gap analysis".to_string(),
            ));
        }

        log::info!("Analyzing performance gaps for {} components", components.len());

        // Validate all components before sending
        for component in &components {
            self.validate_component(component)?;
        }

        let body = serde_json::to_value(&components)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize components: {}",
                e
            )))?;

        self.client
            .post("/api/v1/fsfvi/performance-gaps/analyze", body)
            .await
    }

    /// Compare with peer countries
    ///
    /// Endpoint: POST /api/v1/fsfvi/performance-gaps/peer-comparison
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:553-598
    ///
    /// Benchmarks the country's performance against regional or income-level peers,
    /// identifying best practices and areas for improvement
    pub async fn peer_comparison(
        &self,
        components: Vec<ComponentInput>,
        peer_countries: Vec<PeerCountryData>,
    ) -> Result<ApiResponse<PeerComparisonReport>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for peer comparison".to_string(),
            ));
        }

        if peer_countries.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one peer country is required for comparison".to_string(),
            ));
        }

        log::info!(
            "Comparing performance against {} peer countries",
            peer_countries.len()
        );

        // Validate components
        for component in &components {
            self.validate_component(component)?;
        }

        let request = PeerComparisonRequest {
            components,
            peer_countries,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize peer comparison request: {}",
                e
            )))?;

        self.client
            .post("/api/v1/fsfvi/performance-gaps/peer-comparison", body)
            .await
    }

    /// Track gap closure progress over time
    ///
    /// Endpoint: POST /api/v1/fsfvi/performance-gaps/track-closure
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:620-661
    ///
    /// CRITICAL for government accountability: Tracks whether interventions are
    /// successfully closing performance gaps over time
    pub async fn track_gap_closure(
        &self,
        baseline_components: Vec<ComponentInput>,
        current_components: Vec<ComponentInput>,
        time_period_months: usize,
    ) -> Result<ApiResponse<GapClosureReport>, FsfviServiceError> {
        if baseline_components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "Baseline components are required for gap closure tracking".to_string(),
            ));
        }

        if current_components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "Current components are required for gap closure tracking".to_string(),
            ));
        }

        if time_period_months < 1 || time_period_months > 240 {
            return Err(FsfviServiceError::ValidationError(
                "Time period must be between 1 and 240 months (20 years)".to_string(),
            ));
        }

        log::info!(
            "Tracking gap closure over {} months",
            time_period_months
        );

        // Validate components
        for component in baseline_components.iter().chain(current_components.iter()) {
            self.validate_component(component)?;
        }

        let request = GapClosureRequest {
            baseline_components,
            current_components,
            time_period_months,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize gap closure request: {}",
                e
            )))?;

        self.client
            .post("/api/v1/fsfvi/performance-gaps/track-closure", body)
            .await
    }

    /// Generate realistic improvement targets
    ///
    /// Endpoint: POST /api/v1/fsfvi/performance-gaps/recommend-targets
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:682-723
    ///
    /// ESSENTIAL for national planning: Provides evidence-based, achievable targets
    /// for each component based on current gaps and peer benchmarks
    pub async fn recommend_targets(
        &self,
        components: Vec<ComponentInput>,
        target_timeline_months: usize,
        peer_countries: Option<Vec<PeerCountryData>>,
    ) -> Result<ApiResponse<TargetRecommendationReport>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for target recommendations".to_string(),
            ));
        }

        if target_timeline_months < 1 || target_timeline_months > 120 {
            return Err(FsfviServiceError::ValidationError(
                "Timeline must be between 1 and 120 months (10 years)".to_string(),
            ));
        }

        log::info!(
            "Generating target recommendations for {} month timeline",
            target_timeline_months
        );

        // Validate components
        for component in &components {
            self.validate_component(component)?;
        }

        let request = TargetRecommendationRequest {
            components,
            target_timeline_months,
            peer_countries,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize target recommendation request: {}",
                e
            )))?;

        self.client
            .post("/api/v1/fsfvi/performance-gaps/recommend-targets", body)
            .await
    }

    /// Validate component data
    fn validate_component(&self, component: &ComponentInput) -> Result<(), FsfviServiceError> {
        // Component type validation
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
                "Invalid component_type '{}'. Must be one of: {}",
                component.component_type,
                VALID_TYPES.join(", ")
            )));
        }

        // Numeric field validations
        if component.observed_value < 0.0 || !component.observed_value.is_finite() {
            return Err(FsfviServiceError::ValidationError(format!(
                "Invalid observed_value for '{}': must be >= 0 and finite",
                component.component_type
            )));
        }

        if component.benchmark_value < 0.0 || !component.benchmark_value.is_finite() {
            return Err(FsfviServiceError::ValidationError(format!(
                "Invalid benchmark_value for '{}': must be >= 0 and finite",
                component.component_type
            )));
        }

        if component.financial_allocation_usd < 0.0 || !component.financial_allocation_usd.is_finite() {
            return Err(FsfviServiceError::ValidationError(format!(
                "Invalid financial_allocation_usd for '{}': must be >= 0 and finite",
                component.component_type
            )));
        }

        // Optional field validations
        if let Some(weight) = component.weight {
            if weight < 0.0 || weight > 1.0 || !weight.is_finite() {
                return Err(FsfviServiceError::ValidationError(format!(
                    "Invalid weight for '{}': must be between 0 and 1",
                    component.component_type
                )));
            }
        }

        if let Some(sensitivity) = component.sensitivity_parameter {
            if sensitivity < 0.0005 || sensitivity > 0.005 || !sensitivity.is_finite() {
                return Err(FsfviServiceError::ValidationError(format!(
                    "Invalid sensitivity_parameter for '{}': must be between 0.0005 and 0.005",
                    component.component_type
                )));
            }
        }

        Ok(())
    }
}
