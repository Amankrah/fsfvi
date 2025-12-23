/// FSFVI API Models
/// ================
///
/// Request/Response models for API endpoints.
/// All monetary values in USD.

use crate::fsfvi::validators::Component;
use crate::fsfvi::config::{Scenario, WeightingMethod};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use utoipa::ToSchema;
use validator::Validate;

// ============================================================================
// Assessment Endpoints
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct AssessmentApiRequest {
    /// Country name (optional)
    #[schema(example = "Kenya")]
    pub country_name: Option<String>,

    /// Food system components with current metrics
    #[validate(length(min = 1, message = "At least one component required"))]
    pub components: Vec<ComponentInput>,

    /// Weighting method (defaults to Hybrid)
    #[schema(example = "Hybrid")]
    pub weighting_method: Option<WeightingMethod>,

    /// Scenario (defaults to NormalOperations)
    pub scenario: Option<Scenario>,

    /// All monetary values must be in USD
    #[schema(example = "USD")]
    #[validate(custom(function = "validate_currency_usd"))]
    pub currency: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct ComponentInput {
    /// Component identifier
    #[schema(example = "agri_001")]
    pub component_id: Option<String>,

    /// Component type
    #[schema(example = "agricultural_development")]
    #[validate(length(min = 1))]
    pub component_type: String,

    /// Current observed value
    #[schema(example = 100.0)]
    #[validate(range(min = 0.0))]
    pub observed_value: f64,

    /// Benchmark/target value
    #[schema(example = 120.0)]
    #[validate(range(min = 0.0))]
    pub benchmark_value: f64,

    /// Financial allocation in USD
    #[schema(example = 50000000.0)]
    #[validate(range(min = 0.0))]
    pub financial_allocation_usd: f64,

    /// Weight (optional, will be auto-calculated if not provided)
    pub weight: Option<f64>,

    /// Sensitivity parameter (optional, will be auto-estimated if not provided)
    pub sensitivity_parameter: Option<f64>,
}

impl From<ComponentInput> for Component {
    fn from(input: ComponentInput) -> Self {
        Component {
            component_id: input.component_id,
            component_type: input.component_type,
            observed_value: input.observed_value,
            benchmark_value: input.benchmark_value,
            // CRITICAL: FSFVI core expects allocation in millions of USD
            // The efficiency calculation and sensitivity parameters are calibrated for millions
            // See: fsfvi_core/calculations.rs:152 - "per million USD invested"
            financial_allocation: input.financial_allocation_usd / 1_000_000.0,
            weight: input.weight,
            sensitivity_parameter: input.sensitivity_parameter,
        }
    }
}

// ============================================================================
// Strategic Planning Endpoints
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct MultiYearPlanApiRequest {
    /// Country name
    #[schema(example = "Kenya")]
    pub country_name: Option<String>,

    /// Current food system components
    #[validate(length(min = 1))]
    pub current_components: Vec<ComponentInput>,

    /// Planning horizon in years (1-20)
    #[schema(example = 5)]
    #[validate(range(min = 1, max = 20))]
    pub planning_years: usize,

    /// Target FSFVI to achieve (0.0-1.0)
    #[schema(example = 0.15)]
    #[validate(range(min = 0.0, max = 1.0))]
    pub target_fsfvi: f64,

    /// Budget constraints per year (all in USD)
    pub yearly_budget_constraints: Option<HashMap<usize, YearlyBudgetConstraintInput>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct YearlyBudgetConstraintInput {
    /// Total budget ceiling for this year in USD
    #[schema(example = 100000000.0)]
    #[validate(range(min = 0.0))]
    pub total_budget_ceiling_usd: f64,

    /// Minimum allocation per component in USD
    #[schema(example = 0.0)]
    #[validate(range(min = 0.0))]
    pub min_allocation_per_component_usd: f64,

    /// Maximum percentage change from previous year
    #[schema(example = 30.0)]
    pub max_change_percent_from_previous: Option<f64>,

    /// Priority components for this year
    pub priority_components: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct MtefApiRequest {
    /// Current components
    #[validate(length(min = 1))]
    pub current_components: Vec<ComponentInput>,

    /// Target FSFVI improvement percentage over 3 years
    #[schema(example = 20.0)]
    #[validate(range(min = 0.0, max = 100.0))]
    pub target_improvement_percent: f64,

    /// Annual budget growth rate
    #[schema(example = 0.05)]
    #[validate(range(min = -0.5, max = 1.0))]
    pub yearly_budget_growth_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct InvestmentSequencingApiRequest {
    /// Current food system components
    #[validate(length(min = 1, message = "At least one component required"))]
    pub components: Vec<ComponentInput>,

    /// Planning horizon in years (1-20)
    #[schema(example = 5)]
    #[validate(range(min = 1, max = 20, message = "Planning years must be between 1 and 20"))]
    pub planning_years: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct ResourceMobilizationApiRequest {
    /// Multi-year strategic plan (from multi-year planning endpoint)
    pub strategic_plan: MultiYearStrategicPlanInput,

    /// Domestic resource capacity per year (all in USD)
    #[validate(length(min = 1, message = "At least one year of domestic capacity required"))]
    pub domestic_resource_capacity: Vec<YearlyResourceCapacityInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MultiYearStrategicPlanInput {
    /// Baseline FSFVI
    pub baseline_fsfvi: f64,

    /// Target FSFVI
    pub target_fsfvi: f64,

    /// Planning horizon in years
    pub planning_years: usize,

    /// Yearly budget plans
    pub yearly_plans: Vec<YearlyPlanInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct YearlyPlanInput {
    /// Year number
    pub year: usize,

    /// Target FSFVI for this year
    pub target_fsfvi: f64,

    /// Projected FSFVI for this year
    pub projected_fsfvi: f64,

    /// Recommended budget allocations by component (in USD)
    pub recommended_allocations: HashMap<String, f64>,

    /// Total budget for this year (in USD)
    pub total_budget: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct YearlyResourceCapacityInput {
    /// Year number
    #[schema(example = 1)]
    #[validate(range(min = 1))]
    pub year: usize,

    /// Available domestic resources for this year (in USD)
    #[schema(example = 50000000.0)]
    #[validate(range(min = 0.0))]
    pub available_domestic_resources: f64,
}

// ============================================================================
// Performance Gap Analysis Endpoints
// NOTE: Budget Optimization models are in fsfvi_api/budget_optimization.rs
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct PeerComparisonApiRequest {
    /// Current components
    #[validate(length(min = 1))]
    pub components: Vec<ComponentInput>,

    /// Peer country data (all in USD)
    #[validate(length(min = 1))]
    pub peer_countries: Vec<PeerCountryDataInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PeerCountryDataInput {
    /// Peer country name
    #[schema(example = "Tanzania")]
    pub country_name: String,

    /// Component values for peer country (all metrics in USD where applicable)
    pub component_values: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct GapClosureApiRequest {
    /// Baseline components (from earlier period)
    #[validate(length(min = 1, message = "At least one baseline component required"))]
    pub baseline_components: Vec<ComponentInput>,

    /// Current components (recent period)
    #[validate(length(min = 1, message = "At least one current component required"))]
    pub current_components: Vec<ComponentInput>,

    /// Time period between baseline and current (in months, 1-240)
    #[schema(example = 12)]
    #[validate(range(min = 1, max = 240, message = "Time period must be between 1 and 240 months"))]
    pub time_period_months: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct TargetRecommendationApiRequest {
    /// Current components
    #[validate(length(min = 1, message = "At least one component required"))]
    pub components: Vec<ComponentInput>,

    /// Target timeline in months (1-120)
    #[schema(example = 24)]
    #[validate(range(min = 1, max = 120, message = "Timeline must be between 1 and 120 months"))]
    pub target_timeline_months: usize,

    /// Optional peer country data for peer-informed targets
    pub peer_countries: Option<Vec<PeerCountryDataInput>>,
}

// ============================================================================
// Sensitivity Analysis Endpoints
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct SensitivityAnalysisApiRequest {
    /// Components to analyze
    #[validate(length(min = 1))]
    pub components: Vec<ComponentInput>,

    /// Analysis type
    pub analysis_type: SensitivityAnalysisType,

    /// Perturbation levels (e.g., [0.05, 0.10, 0.20])
    pub perturbation_levels: Option<Vec<f64>>,

    /// Number of simulations for Monte Carlo
    #[validate(range(min = 100, max = 10000))]
    pub num_simulations: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum SensitivityAnalysisType {
    Weight,
    Parameter,
    Scenario,
    Benchmark,
    MonteCarlo,
}

// ============================================================================
// Matrix Generation Request Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct PairwiseComparisonInput {
    pub component_a: String,
    pub component_b: String,
    #[validate(range(min = 0.111, max = 9.0))] // 1/9 to 9
    pub value: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct CustomAhpMatrixRequest {
    #[validate(length(min = 1))]
    pub pairwise_comparisons: Vec<PairwiseComparisonInput>,
}

// ============================================================================
// Scenario Simulation Request Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct ScenarioComparisonApiRequest {
    #[validate(length(min = 1))]
    pub components: Vec<ComponentInput>,
    #[validate(length(min = 2))]
    pub scenarios: Vec<crate::fsfvi::config::Scenario>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct CrisisSimulationApiRequest {
    #[validate(length(min = 1))]
    pub components: Vec<ComponentInput>,
    pub crisis_type: crate::fsfvi::service::scenario_simulation::CrisisType,
    pub intensity: crate::fsfvi::service::scenario_simulation::CrisisIntensity,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct BudgetChangeInput {
    pub component_type: String,
    #[validate(range(min = 0.0))]
    pub amount_usd: f64,
    pub change_type: crate::fsfvi::service::scenario_simulation::ChangeType,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct BudgetChangeSimulationApiRequest {
    #[validate(length(min = 1))]
    pub components: Vec<ComponentInput>,
    #[validate(length(min = 1))]
    pub budget_changes: Vec<BudgetChangeInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct InterventionInput {
    pub component_type: String,
    pub description: String,
    #[validate(range(min = 0.0, max = 100.0))]
    pub expected_improvement_percent: f64,
    #[validate(range(min = 0.0))]
    pub estimated_cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct InterventionSimulationApiRequest {
    #[validate(length(min = 1))]
    pub components: Vec<ComponentInput>,
    #[validate(length(min = 1))]
    pub interventions: Vec<InterventionInput>,
}

// ============================================================================
// Decision Support Request Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct PolicyRecommendationApiRequest {
    #[validate(length(min = 1))]
    pub components: Vec<ComponentInput>,
    pub country_name: Option<String>,
    #[validate(range(min = 1, max = 240))] // 1 month to 20 years
    pub planning_horizon_months: usize,
    pub include_budget_optimization: bool,
    pub include_sensitivity_analysis: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct CrisisResponseApiRequest {
    #[validate(length(min = 1))]
    pub components: Vec<ComponentInput>,
    pub crisis_scenario: crate::fsfvi::config::Scenario,
    #[validate(range(min = 0.0))]
    pub available_emergency_budget_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct ProgressTrackingApiRequest {
    #[validate(length(min = 1))]
    pub baseline_components: Vec<ComponentInput>,
    #[validate(length(min = 1))]
    pub current_components: Vec<ComponentInput>,
    #[validate(range(min = 1, max = 240))]
    pub time_period_months: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate, ToSchema)]
pub struct StakeholderBriefApiRequest {
    #[validate(length(min = 1))]
    pub components: Vec<ComponentInput>,
    pub audience: crate::fsfvi::service::decision_support::StakeholderAudience,
}

// ============================================================================
// Validation Helpers
// ============================================================================

fn validate_currency_usd(currency: &String) -> Result<(), validator::ValidationError> {
    if currency.to_uppercase() != "USD" {
        let mut error = validator::ValidationError::new("currency_not_usd");
        error.message = Some("All monetary values must be in USD".into());
        return Err(error);
    }
    Ok(())
}

// ============================================================================
// API Response Metadata
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApiResponseMetadata {
    /// Request timestamp
    pub timestamp: String,

    /// Processing time in milliseconds
    pub processing_time_ms: u64,

    /// User ID who made the request
    pub user_id: uuid::Uuid,

    /// API version
    pub api_version: String,

    /// Currency (always USD)
    pub currency: String,
}

impl Default for ApiResponseMetadata {
    fn default() -> Self {
        Self {
            timestamp: chrono::Utc::now().to_rfc3339(),
            processing_time_ms: 0,
            user_id: uuid::Uuid::nil(),
            api_version: "1.0.0".to_string(),
            currency: "USD".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApiResponse<T> {
    pub data: T,
    pub metadata: ApiResponseMetadata,
}

impl<T> ApiResponse<T> {
    pub fn new(data: T, user_id: uuid::Uuid, processing_time_ms: u64) -> Self {
        Self {
            data,
            metadata: ApiResponseMetadata {
                timestamp: chrono::Utc::now().to_rfc3339(),
                processing_time_ms,
                user_id,
                api_version: "1.0.0".to_string(),
                currency: "USD".to_string(),
            },
        }
    }
}
