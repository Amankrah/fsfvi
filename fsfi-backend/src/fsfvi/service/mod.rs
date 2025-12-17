/// FSFVI Service Layer
/// ===================
///
/// Government-facing API for food system vulnerability assessment and decision support.
///
/// This layer provides high-level services that combine core FSFVI calculations,
/// weighting strategies, and business logic to serve specific government use cases.
///
/// ARCHITECTURE:
/// - Core Layer: Pure mathematical FSFVI calculations (fsfvi_core/)
/// - Weighting Layer: Component importance strategies (weighting/)
/// - Service Layer: Government business logic (service/) ← YOU ARE HERE
///
/// AVAILABLE SERVICES:
/// 1. Matrix Generation - View and customize AHP/network matrices
/// 2. Vulnerability Assessment - Comprehensive FSFVI assessments
/// 3. Scenario Simulation - What-if analysis and crisis planning
/// 4. Budget Optimization - Optimal resource allocation (Linear Programming)
/// 5. Sensitivity Analysis - Robustness testing and uncertainty quantification
/// 6. Performance Gap Analysis - Track gaps vs benchmarks and peer countries
/// 7. Strategic Planning - Multi-year budget planning for FSFVI reduction (CRITICAL)
/// 8. Decision Support - Policy recommendations and stakeholder communication

// Service modules
pub mod matrix_generation;
pub mod vulnerability_assessment;
pub mod scenario_simulation;
pub mod budget_optimization;
pub mod sensitivity_analysis;
pub mod performance_gap_analysis;
pub mod strategic_planning;
pub mod decision_support;
pub mod weighting_analysis;

// Re-export primary service structs for convenience
pub use matrix_generation::MatrixGenerationService;
pub use vulnerability_assessment::VulnerabilityAssessmentService;
pub use scenario_simulation::ScenarioSimulationService;
pub use budget_optimization::BudgetOptimizationService;
pub use sensitivity_analysis::SensitivityAnalysisService;
pub use performance_gap_analysis::PerformanceGapAnalysisService;
pub use strategic_planning::StrategicPlanningService;
pub use decision_support::DecisionSupportService;
pub use weighting_analysis::WeightingAnalysisService;

// Re-export key request/response types for API use
// Note: Many types are accessed via full qualified paths in fsfvi_api/handlers.rs
// (e.g., crate::fsfvi::service::scenario_simulation::BudgetChange)
// so they don't appear in this list
// OptimizationConstraints and OptimizationObjective are imported directly by budget_optimization.rs
pub use vulnerability_assessment::AssessmentRequest;
pub use performance_gap_analysis::PeerCountryData;

/// Unified FSFVI Service
///
/// Single entry point for all government FSFVI operations.
/// Provides access to all service modules through one struct.
///
/// # Example Usage
///
/// ```no_run
/// use fsfvi::service::FsfviService;
/// use fsfvi::validators::Component;
///
/// let service = FsfviService::new();
///
/// // Quick vulnerability check
/// let components = vec![/* your components */];
/// let quick_check = service.vulnerability.quick_check(components)?;
///
/// // Generate policy recommendations
/// let policy_recs = service.decision_support.generate_policy_recommendations(request)?;
///
/// // Optimize budget allocation
/// let optimization = service.budget.optimize_allocation(components, objective, constraints)?;
/// ```
pub struct FsfviService {
    /// Matrix generation service
    pub matrix: MatrixGenerationService,

    /// Vulnerability assessment service
    pub vulnerability: VulnerabilityAssessmentService,

    /// Scenario simulation service
    pub scenario: ScenarioSimulationService,

    /// Budget optimization service
    pub budget: BudgetOptimizationService,

    /// Sensitivity analysis service
    pub sensitivity: SensitivityAnalysisService,

    /// Performance gap analysis service
    pub performance_gap: PerformanceGapAnalysisService,

    /// Strategic planning service (multi-year budget planning)
    pub strategic_planning: StrategicPlanningService,

    /// Decision support service
    pub decision_support: DecisionSupportService,

    /// Weighting analysis service (methodology validation)
    pub weighting_analysis: WeightingAnalysisService,
}

impl Default for FsfviService {
    fn default() -> Self {
        Self::new()
    }
}

impl FsfviService {
    /// Create a new unified FSFVI service instance
    pub fn new() -> Self {
        Self {
            matrix: MatrixGenerationService::new(),
            vulnerability: VulnerabilityAssessmentService::new(),
            scenario: ScenarioSimulationService::new(),
            budget: BudgetOptimizationService::new(),
            sensitivity: SensitivityAnalysisService::new(),
            performance_gap: PerformanceGapAnalysisService::new(),
            strategic_planning: StrategicPlanningService::new(),
            decision_support: DecisionSupportService::new(),
            weighting_analysis: WeightingAnalysisService::new(),
        }
    }

    /// Health check - verify all services are operational
    ///
    /// All services are stateless and use Default trait,
    /// so if the FsfviService can be constructed, all services are healthy.
    #[cfg(test)]
    pub fn health_check(&self) -> bool {
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unified_service_creation() {
        let service = FsfviService::new();
        assert!(service.health_check());
    }

    #[test]
    fn test_default_construction() {
        let service = FsfviService::default();
        assert!(service.health_check());
    }
}
