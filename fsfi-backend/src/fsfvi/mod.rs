/// FSFVI (Food System Financial Vulnerability Index)
/// ==================================================
///
/// Complete Rust implementation of the FSFVI algorithm for government food security assessment.
///
/// ## Overview
///
/// The FSFVI quantifies food system vulnerability by analyzing the relationship between:
/// - Financial allocations to food system components
/// - Component performance gaps vs. benchmarks
/// - System-level interdependencies
///
/// ## Mathematical Foundation
///
/// FSFVI = Σᵢ ωᵢ · υᵢ(fᵢ)
///
/// Where:
/// - ωᵢ = component weight (importance)
/// - υᵢ = component vulnerability = δᵢ · [1/(1 + αᵢfᵢ)]
/// - δᵢ = performance gap
/// - αᵢ = sensitivity parameter
/// - fᵢ = financial allocation
///
/// ## Architecture
///
/// ```text
/// ┌─────────────────────────────────────────────────────────┐
/// │                    Service Layer                          │
/// │  Government-facing APIs for specific use cases           │
/// │  - Matrix Generation                                      │
/// │  - Vulnerability Assessment                               │
/// │  - Scenario Simulation                                    │
/// │  - Budget Optimization (Linear Programming)               │
/// │  - Sensitivity Analysis                                   │
/// │  - Decision Support                                       │
/// └───────────────────────┬─────────────────────────────────┘
///                         │
/// ┌───────────────────────┴─────────────────────────────────┐
/// │                 Weighting Layer                          │
/// │  Component importance calculation strategies             │
/// │  - Financial: Budget allocations                         │
/// │  - Expert: AHP pairwise comparisons                      │
/// │  - Network: PageRank + cascade analysis                  │
/// │  - Hybrid: Weighted combination                          │
/// └───────────────────────┬─────────────────────────────────┘
///                         │
/// ┌───────────────────────┴─────────────────────────────────┐
/// │                   Core Layer                             │
/// │  Pure mathematical FSFVI calculations                    │
/// │  - Component vulnerability: υ(δ, f, α)                   │
/// │  - System aggregation: FSFVI = Σ ω·υ                     │
/// │  - Sensitivity estimation                                │
/// └─────────────────────────────────────────────────────────┘
///                         │
/// ┌───────────────────────┴─────────────────────────────────┐
/// │              Foundation Layer                            │
/// │  - config: Centralized configuration                     │
/// │  - errors: Type-safe error handling                      │
/// │  - validators: Input validation                          │
/// └─────────────────────────────────────────────────────────┘
/// ```
///
/// ## Key Design Principles
///
/// 1. **No Hardcoded Values** - All parameters from config, no magic numbers
/// 2. **Type-Safe Errors** - Detailed error messages for debugging
/// 3. **Clean Separation** - Core math ↔ Weighting ↔ Services
/// 4. **Government-Centric** - APIs designed for policy needs
/// 5. **Production-Ready** - Proper error handling, no silent fallbacks
/// 6. **Auditable** - Transparent algorithms, reproducible results
///
/// ## Usage Example
///
/// ```no_run
/// use fsfvi::{FsfviService, Component};
/// use fsfvi::service::{AssessmentRequest, PolicyRecommendationRequest};
///
/// // Create unified service
/// let service = FsfviService::new();
///
/// // Define food system components
/// let components = vec![
///     Component {
///         component_id: Some("agri_001".to_string()),
///         component_type: "agricultural_development".to_string(),
///         observed_value: 100.0,      // Current metric value
///         benchmark_value: 120.0,     // Target/reference value
///         financial_allocation: 50_000_000.0,  // Budget in currency units
///         weight: None,               // Auto-calculated
///         sensitivity_parameter: None, // Auto-estimated
///     },
///     // ... more components
/// ];
///
/// // 1. Quick vulnerability check
/// let quick_check = service.vulnerability.quick_check(components.clone())?;
/// println!("FSFVI: {:.1}% ({})", quick_check.fsfvi_score * 100.0, quick_check.risk_level);
///
/// // 2. Comprehensive assessment
/// let assessment = service.vulnerability.assess_food_system(AssessmentRequest {
///     components: components.clone(),
///     country_name: Some("Kenya".to_string()),
///     weighting_method: None,  // Use default hybrid
///     scenario: None,          // Normal operations
///     context: None,
///     currency: Some("KES".to_string()),
/// })?;
///
/// // 3. Optimize budget allocation
/// let optimization = service.budget.optimize_allocation(
///     components.clone(),
///     OptimizationObjective::MinimizeFsfvi,
///     OptimizationConstraints::default(),
/// )?;
///
/// // 4. Generate policy recommendations
/// let policy = service.decision_support.generate_policy_recommendations(
///     PolicyRecommendationRequest {
///         components,
///         country_name: Some("Kenya".to_string()),
///         currency: Some("KES".to_string()),
///         planning_horizon_months: 24,
///         include_budget_optimization: true,
///         include_sensitivity_analysis: true,
///     }
/// )?;
/// ```
///
/// ## Integration with Existing Backend
///
/// This FSFVI module is designed to integrate with your existing auth and API infrastructure:
///
/// 1. Import module in your main backend:
///    ```rust
///    mod fsfvi;
///    use fsfvi::FsfviService;
///    ```
///
/// 2. Create service instance (e.g., in application state):
///    ```rust
///    let fsfvi_service = FsfviService::new();
///    ```
///
/// 3. Use in API handlers:
///    ```rust
///    async fn assess_vulnerability(
///        State(fsfvi): State<FsfviService>,
///        Json(request): Json<AssessmentRequest>,
///    ) -> Result<Json<AssessmentReport>, AppError> {
///        let report = fsfvi.vulnerability.assess_food_system(request)?;
///        Ok(Json(report))
///    }
///    ```
///
/// 4. Apply existing auth middleware to FSFVI endpoints

// Foundation layer
pub mod config;
pub mod errors;
pub mod validators;

// Core layer
pub mod fsfvi_core;

// Weighting layer
pub mod weighting;

// Service layer
pub mod service;

// Re-export primary types for convenience

// Re-export commonly used service types
// pub use service::{
//     AssessmentRequest, AssessmentReport,
//     PolicyRecommendationRequest, PolicyRecommendationReport,
//     OptimizationConstraints, OptimizationObjective, OptimizationResult,
//     StakeholderAudience, StakeholderBrief,
// };

#[cfg(test)]
mod tests {
    use crate::fsfvi::service::FsfviService;
    use crate::fsfvi::config::FSFVI_CONFIG;
    use crate::fsfvi::validators::Component;

    #[test]
    fn test_module_integration() {
        // Test that all modules are accessible
        let service = FsfviService::new();
        assert!(service.health_check());
    }

    #[test]
    fn test_config_accessible() {
        // Test config access
        assert!(FSFVI_CONFIG.precision > 0);
        assert!(FSFVI_CONFIG.tolerance > 0.0);
    }

    #[test]
    fn test_component_creation() {
        // Test component creation
        let component = Component {
            component_id: Some("test".to_string()),
            component_type: "agricultural_development".to_string(),
            observed_value: 100.0,
            benchmark_value: 120.0,
            financial_allocation: 1000.0,
            weight: None,
            sensitivity_parameter: None,
        };

        assert_eq!(component.component_type, "agricultural_development");
    }
}
