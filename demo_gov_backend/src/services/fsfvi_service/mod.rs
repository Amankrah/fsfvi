/// FSFVI Service Module
/// =====================
/// Modular service for integrating with FSFI Backend API
/// Each sub-module handles a specific scope of FSFVI functionality
///
/// CRITICAL: This is a government-level system where livelihoods depend on
/// accurate calculations and correct decision-making.

pub mod client;
pub mod data_fetcher;
pub mod performance_gap;
pub mod assessment;
pub mod strategic_planning;
pub mod budget_optimization;
pub mod weighting_analysis;
pub mod sensitivity_analysis;
pub mod scenario_simulation;
pub mod decision_support;
pub mod matrix_generation;
pub mod models;
pub mod error;

// Re-export main types
pub use client::FsfviClient;
pub use data_fetcher::DataFetcher;
pub use error::FsfviServiceError;
pub use models::*;

// Re-export service modules
pub use performance_gap::PerformanceGapService;
pub use assessment::AssessmentService;
pub use strategic_planning::StrategicPlanningService;
pub use budget_optimization::BudgetOptimizationService;
pub use weighting_analysis::WeightingAnalysisService;
pub use sensitivity_analysis::SensitivityAnalysisService;
pub use scenario_simulation::ScenarioSimulationService;
pub use decision_support::DecisionSupportService;
pub use matrix_generation::MatrixGenerationService;
