/// Advanced Weighting Module
/// ==========================
///
/// Implements multiple weighting methodologies for FSFVI calculations:
/// - Financial: Weights based on actual budget allocations
/// - Expert-driven (AHP): Weights from expert judgment and pairwise comparisons
/// - Network centrality: Weights from PageRank and cascade analysis
/// - Hybrid: Combined methods with configurable coefficients
///
/// This module is separate from fsfvi_core to maintain clean separation
/// between pure mathematical calculations and weighting strategies.

pub mod expert;
pub mod financial;
pub mod hybrid;
pub mod models;
pub mod network;

// Re-export commonly used items
pub use expert::ExpertWeightingSystem;

// Financial analysis functions are used by weighting_analysis service
// which imports directly from financial module, bypassing these re-exports.
// Suppressing unused warning as these are architectural re-exports for API consistency.
#[allow(unused_imports)]
pub use financial::{
    analyze_financial_allocations, calculate_allocation_concentration,
    calculate_effective_financial_weights, calculate_financial_weights,
    calculate_marginal_impact, compare_allocation_to_vulnerability,
    compare_effective_allocation_to_vulnerability, generate_allocation_recommendations,
    generate_constrained_recommendations, CostEffectivenessConfig, FinancialAnalysisResult,
    MinimumThresholds,
};
pub use hybrid::{analyze_context_sensitivity, analyze_weight_sensitivity, HybridWeightingSystem};
pub use models::{ComponentRegistry, WeightingContext};
pub use network::NetworkCentralityAnalyzer;
