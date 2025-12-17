/// Budget Optimization Service
/// ============================
/// Handles budget allocation optimization and ROI analysis
/// Endpoint Reference: fsfi-backend/src/fsfvi_api/budget_optimization.rs
///
/// CRITICAL: This service helps governments optimize resource allocation to
/// maximize FSFVI reduction under real-world budget constraints

use super::client::FsfviClient;
use super::error::FsfviServiceError;
use super::models::*;

pub struct BudgetOptimizationService {
    client: FsfviClient,
}

impl BudgetOptimizationService {
    pub fn new(client: FsfviClient) -> Self {
        Self { client }
    }

    /// Analyze current budget allocation efficiency
    ///
    /// Endpoint: POST /api/v1/fsfvi/optimization/budget/analyze-efficiency
    /// Reference: fsfi-backend/src/fsfvi_api/budget_optimization.rs:100-141
    ///
    /// Identifies which components are over/under-allocated relative to their
    /// vulnerability and impact on food system resilience
    pub async fn analyze_allocation_efficiency(
        &self,
        components: Vec<ComponentInput>,
    ) -> Result<ApiResponse<AllocationEfficiencyReport>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for efficiency analysis".to_string(),
            ));
        }

        log::info!("Analyzing budget allocation efficiency for {} components", components.len());

        for component in &components {
            self.validate_component(component)?;
        }

        let request = AllocationEfficiencyRequest { components };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize request: {}",
                e
            )))?;

        self.client
            .post("/api/v1/fsfvi/optimization/budget/analyze-efficiency", body)
            .await
    }

    /// Generate step-by-step budget reallocation plan
    ///
    /// Endpoint: POST /api/v1/fsfvi/optimization/budget/generate-plan
    /// Reference: fsfi-backend/src/fsfvi_api/budget_optimization.rs:156-197
    ///
    /// Creates a practical implementation plan to transition from current
    /// allocations to optimized allocations with phased approach
    pub async fn generate_reallocation_plan(
        &self,
        components: Vec<ComponentInput>,
        constraints: Option<OptimizationConstraints>,
    ) -> Result<ApiResponse<ReallocationPlan>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for reallocation planning".to_string(),
            ));
        }

        log::info!("Generating reallocation plan for {} components", components.len());

        for component in &components {
            self.validate_component(component)?;
        }

        let request = ReallocationPlanRequest {
            components,
            constraints,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize request: {}",
                e
            )))?;

        self.client
            .post("/api/v1/fsfvi/optimization/budget/generate-plan", body)
            .await
    }

    /// Calculate return on investment for budget scenarios
    ///
    /// Endpoint: POST /api/v1/fsfvi/optimization/budget/calculate-roi
    /// Reference: fsfi-backend/src/fsfvi_api/budget_optimization.rs:211-246
    ///
    /// Compares cost-effectiveness across multiple budget scenarios
    pub async fn calculate_roi(
        &self,
        components: Vec<ComponentInput>,
        scenarios: Vec<BudgetScenario>,
    ) -> Result<ApiResponse<RoiAnalysisReport>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for ROI analysis".to_string(),
            ));
        }

        if scenarios.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one scenario is required for ROI analysis".to_string(),
            ));
        }

        log::info!("Calculating ROI for {} scenarios", scenarios.len());

        for component in &components {
            self.validate_component(component)?;
        }

        let request = RoiAnalysisRequest {
            components,
            scenarios,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize request: {}",
                e
            )))?;

        self.client
            .post("/api/v1/fsfvi/optimization/budget/calculate-roi", body)
            .await
    }

    /// Optimize budget allocation using Linear Programming
    ///
    /// Endpoint: POST /api/v1/fsfvi/optimization/budget/optimize
    /// Reference: fsfi-backend/src/fsfvi_api/budget_optimization.rs:266-311
    ///
    /// CRITICAL: Uses mathematical optimization to find provably optimal
    /// budget allocations under government constraints
    pub async fn optimize_allocation(
        &self,
        components: Vec<ComponentInput>,
        objective: OptimizationObjective,
        constraints: Option<OptimizationConstraints>,
    ) -> Result<ApiResponse<OptimizationResult>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for optimization".to_string(),
            ));
        }

        log::info!(
            "Optimizing budget allocation for {} components with objective: {:?}",
            components.len(),
            objective
        );

        for component in &components {
            self.validate_component(component)?;
        }

        let request = OptimizationRequest {
            components,
            objective,
            constraints,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize request: {}",
                e
            )))?;

        self.client
            .post("/api/v1/fsfvi/optimization/budget/optimize", body)
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

// ============================================================================
// Budget Optimization Models
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AllocationEfficiencyRequest {
    pub components: Vec<ComponentInput>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AllocationEfficiencyReport {
    pub current_fsfvi: f64,
    pub total_budget: f64,
    pub allocation_concentration_hhi: f64,
    pub component_efficiency: Vec<ComponentEfficiency>,
    pub recommended_reallocations: Vec<ReallocationRecommendation>,
    pub improvement_potential: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ComponentEfficiency {
    pub component_type: String,
    pub current_allocation: f64,
    pub allocation_share: f64,
    pub vulnerability_contribution: f64,
    pub efficiency_score: f64,
    pub status: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ReallocationRecommendation {
    pub component_type: String,
    pub current_allocation: f64,
    pub recommended_allocation: f64,
    pub change_amount: f64,
    pub change_percent: f64,
    pub rationale: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ReallocationPlanRequest {
    pub components: Vec<ComponentInput>,
    pub constraints: Option<OptimizationConstraints>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ReallocationPlan {
    pub baseline_fsfvi: f64,
    pub expected_fsfvi: f64,
    pub optimal_allocations: Vec<ComponentAllocation>,
    pub implementation_phases: Vec<ImplementationPhase>,
    pub risks: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ComponentAllocation {
    pub component_type: String,
    pub current_allocation: f64,
    pub optimal_allocation: f64,
    pub expected_impact: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImplementationPhase {
    pub phase_number: usize,
    pub timeline_months: usize,
    pub actions: Vec<String>,
    pub budget_changes: Vec<BudgetChange>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BudgetChange {
    pub component_type: String,
    pub amount: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RoiAnalysisRequest {
    pub components: Vec<ComponentInput>,
    pub scenarios: Vec<BudgetScenario>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BudgetScenario {
    pub scenario_name: String,
    pub component_allocations: std::collections::HashMap<String, f64>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RoiAnalysisReport {
    pub baseline_fsfvi: f64,
    pub scenario_results: Vec<ScenarioRoiResult>,
    pub ranking_by_roi: Vec<String>,
    pub best_roi_scenario: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ScenarioRoiResult {
    pub scenario_name: String,
    pub projected_fsfvi: f64,
    pub total_investment: f64,
    pub fsfvi_improvement: f64,
    pub roi_score: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OptimizationRequest {
    pub components: Vec<ComponentInput>,
    pub objective: OptimizationObjective,
    pub constraints: Option<OptimizationConstraints>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OptimizationObjective {
    MinimizeFsfvi,
    MaximizeEfficiency,
    Balanced,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OptimizationConstraints {
    pub total_budget_ceiling: Option<f64>,
    pub min_allocation_per_component: Option<f64>,
    pub max_change_percent: Option<f64>,
    pub priority_components: Option<Vec<String>>,
}

impl Default for OptimizationConstraints {
    fn default() -> Self {
        Self {
            total_budget_ceiling: None,
            min_allocation_per_component: None,
            max_change_percent: Some(50.0),
            priority_components: None,
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OptimizationResult {
    pub baseline_fsfvi: f64,
    pub optimized_fsfvi: f64,
    pub improvement: f64,
    pub optimal_allocations: Vec<ComponentAllocation>,
    pub convergence_iterations: usize,
    pub convergence_status: String,
}
