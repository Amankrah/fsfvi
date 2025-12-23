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

        // Convert to budget component format (financial_allocation in millions)
        let budget_components: Vec<BudgetComponent> = components
            .iter()
            .map(|c| c.to_budget_component())
            .collect();

        let request = AllocationEfficiencyRequest {
            components: budget_components,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize request: {}",
                e
            )))?;

        let mut response: ApiResponse<AllocationEfficiencyReport> = self.client
            .post("/api/v1/fsfvi/optimization/budget/analyze-efficiency", body)
            .await?;

        // Convert response allocations from millions USD back to raw USD
        response.data.total_budget *= 1_000_000.0;
        for analysis in &mut response.data.reallocation_analysis {
            analysis.current_allocation *= 1_000_000.0;
            analysis.recommended_allocation *= 1_000_000.0;
            analysis.difference *= 1_000_000.0; // CRITICAL FIX: Convert difference as well
        }

        Ok(response)
    }

    /// Generate step-by-step budget reallocation plan
    ///
    /// Endpoint: POST /api/v1/fsfvi/optimization/budget/generate-plan
    /// Reference: fsfi-backend/src/fsfvi_api/budget_optimization.rs:156-197
    ///
    /// Creates a practical implementation plan to transition from current
    /// allocations to optimized allocations with phased approach
    ///
    /// CRITICAL: objective parameter allows government to choose optimization strategy
    pub async fn generate_reallocation_plan(
        &self,
        components: Vec<ComponentInput>,
        objective: OptimizationObjective,
        constraints: Option<OptimizationConstraints>,
    ) -> Result<ApiResponse<ReallocationPlan>, FsfviServiceError> {
        if components.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one component is required for reallocation planning".to_string(),
            ));
        }

        log::info!(
            "Generating reallocation plan for {} components with objective: {:?}",
            components.len(),
            objective
        );

        for component in &components {
            self.validate_component(component)?;
        }

        // Convert to budget component format (financial_allocation in millions)
        let budget_components: Vec<BudgetComponent> = components
            .iter()
            .map(|c| c.to_budget_component())
            .collect();

        // Convert constraints from raw USD to millions USD
        let constraints_millions = constraints.map(|c| OptimizationConstraints {
            min_allocation_per_component: c.min_allocation_per_component / 1_000_000.0,
            max_change_percent: c.max_change_percent,
            implementation_months: c.implementation_months,
        });

        let request = ReallocationPlanRequest {
            components: budget_components,
            objective, // CRITICAL: Pass government's chosen optimization strategy
            constraints: constraints_millions,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize request: {}",
                e
            )))?;

        let mut response: ApiResponse<ReallocationPlan> = self.client
            .post("/api/v1/fsfvi/optimization/budget/generate-plan", body)
            .await?;

        // Convert response allocations from millions USD back to raw USD
        response.data.total_budget *= 1_000_000.0;
        for (_, allocation) in response.data.optimal_allocations.iter_mut() {
            *allocation *= 1_000_000.0;
        }
        for phase in &mut response.data.implementation_phases {
            for (_, allocation) in phase.allocations.iter_mut() {
                *allocation *= 1_000_000.0;
            }
        }

        Ok(response)
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

        // Convert to budget component format (financial_allocation in millions)
        let budget_components: Vec<BudgetComponent> = components
            .iter()
            .map(|c| c.to_budget_component())
            .collect();

        // Convert scenario allocations from raw USD to millions USD
        let scenarios_millions: Vec<BudgetScenario> = scenarios
            .into_iter()
            .map(|s| BudgetScenario {
                name: s.name,
                baseline_fsfvi: s.baseline_fsfvi,
                changes: s.changes.into_iter().map(|c| AllocationChange {
                    component_type: c.component_type,
                    new_allocation: c.new_allocation / 1_000_000.0,
                }).collect(),
            })
            .collect();

        let request = RoiAnalysisRequest {
            components: budget_components,
            scenarios: scenarios_millions,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize request: {}",
                e
            )))?;

        let mut response: ApiResponse<RoiAnalysisReport> = self.client
            .post("/api/v1/fsfvi/optimization/budget/calculate-roi", body)
            .await?;

        // Convert response investments from millions USD back to raw USD
        for scenario in &mut response.data.scenarios {
            scenario.investment *= 1_000_000.0;
        }

        Ok(response)
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

        // Convert to budget component format (financial_allocation in millions)
        let budget_components: Vec<BudgetComponent> = components
            .iter()
            .map(|c| c.to_budget_component())
            .collect();

        // Convert constraints from raw USD to millions USD
        let constraints_millions = constraints.map(|c| OptimizationConstraints {
            min_allocation_per_component: c.min_allocation_per_component / 1_000_000.0,
            max_change_percent: c.max_change_percent,
            implementation_months: c.implementation_months,
        });

        let request = OptimizationRequest {
            components: budget_components,
            objective,
            constraints: constraints_millions,
        };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(format!(
                "Failed to serialize request: {}",
                e
            )))?;

        let mut response: ApiResponse<OptimizationResult> = self.client
            .post("/api/v1/fsfvi/optimization/budget/optimize", body)
            .await?;

        // Convert response allocations from millions USD back to raw USD
        for (_, allocation) in response.data.optimal_allocations.iter_mut() {
            *allocation *= 1_000_000.0;
        }

        Ok(response)
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
                "Invalid financial_allocation for '{}'",
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
    pub components: Vec<BudgetComponent>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AllocationEfficiencyReport {
    pub current_fsfvi: f64,
    pub total_budget: f64,
    pub allocation_concentration: f64,
    pub reallocation_analysis: Vec<ComponentAllocationAnalysis>,
    pub improvement_potential: f64,
    pub key_insights: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ComponentAllocationAnalysis {
    pub component_type: String,
    pub current_allocation: f64,
    pub recommended_allocation: f64,
    pub difference: f64,
    pub percent_change: f64,
    pub efficiency_score: f64,
    pub status: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ReallocationPlanRequest {
    pub components: Vec<BudgetComponent>,
    pub objective: OptimizationObjective, // CRITICAL: Government policy decision
    pub constraints: Option<OptimizationConstraints>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ReallocationPlan {
    pub baseline_fsfvi: f64,
    pub estimated_fsfvi_after_reallocation: f64,
    pub expected_improvement: f64,
    pub expected_improvement_percent: f64,
    pub total_budget: f64,
    pub optimal_allocations: std::collections::HashMap<String, f64>,
    pub implementation_phases: Vec<ImplementationPhase>,
    pub risks_and_mitigation: Vec<RiskMitigation>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImplementationPhase {
    pub phase_number: usize,
    pub duration_months: usize,
    pub allocations: std::collections::HashMap<String, f64>,
    pub milestones: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RiskMitigation {
    pub risk: String,
    pub mitigation: String,
    pub priority: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RoiAnalysisRequest {
    pub components: Vec<BudgetComponent>,
    pub scenarios: Vec<BudgetScenario>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BudgetScenario {
    pub name: String,
    pub baseline_fsfvi: f64,
    pub changes: Vec<AllocationChange>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AllocationChange {
    pub component_type: String,
    pub new_allocation: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RoiAnalysisReport {
    pub scenarios: Vec<ScenarioRoi>,
    pub best_roi_scenario: Option<String>,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ScenarioRoi {
    pub scenario_name: String,
    pub investment: f64,
    pub fsfvi_improvement: f64,
    pub roi_per_million: f64,
    pub cost_effectiveness_rank: usize,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OptimizationRequest {
    pub components: Vec<BudgetComponent>,
    pub objective: OptimizationObjective,
    pub constraints: Option<OptimizationConstraints>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum OptimizationObjective {
    MinimizeFsfvi,
    MaximizeEfficiency,
    BalanceRisk,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OptimizationConstraints {
    pub min_allocation_per_component: f64,
    pub max_change_percent: Option<f64>,
    pub implementation_months: usize,
}

impl Default for OptimizationConstraints {
    fn default() -> Self {
        Self {
            min_allocation_per_component: 0.0,
            max_change_percent: Some(30.0),
            implementation_months: 12,
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OptimizationResult {
    pub objective: OptimizationObjective,
    pub baseline_fsfvi: f64,
    pub optimized_fsfvi: f64,
    pub improvement: f64,
    pub optimal_allocations: std::collections::HashMap<String, f64>,
    pub iterations_performed: usize,
    pub convergence_achieved: bool,
}
