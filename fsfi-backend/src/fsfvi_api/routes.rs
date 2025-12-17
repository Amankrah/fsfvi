/// FSFVI API Routes Configuration
/// ===============================
///
/// Configures all FSFVI endpoints with proper auth middleware.

use actix_web::web;
use crate::fsfvi_api::handlers::*;

/// Configure FSFVI routes
///
/// All routes require authentication (JWT or API Key)
/// Note: The /api/v1/fsfvi prefix is added in main.rs with auth middleware
pub fn configure_fsfvi_routes(cfg: &mut web::ServiceConfig) {
    cfg
            // Assessment endpoints
            .service(
                web::scope("/assessments")
                    .route("", web::post().to(run_assessment))
                    .route("/quick", web::post().to(quick_check))
            )
            // Strategic Planning endpoints (CRITICAL for multi-year budgeting)
            .service(
                web::scope("/strategic-planning")
                    .route("/multi-year", web::post().to(generate_multi_year_plan))
                    .route("/mtef", web::post().to(generate_mtef))
                    .route("/investment-sequencing", web::post().to(analyze_investment_sequencing))
                    .route("/resource-mobilization", web::post().to(generate_resource_mobilization))
            )
            // Budget Optimization endpoints (comprehensive suite)
            .configure(crate::fsfvi_api::budget_optimization::configure)
            // Weighting Analysis endpoints (methodology validation & transparency)
            .configure(crate::fsfvi_api::weighting_analysis::configure)
            // Performance Gap Analysis endpoints
            .service(
                web::scope("/performance-gaps")
                    .route("/analyze", web::post().to(analyze_performance_gaps))
                    .route("/peer-comparison", web::post().to(peer_comparison))
                    .route("/track-closure", web::post().to(track_gap_closure))
                    .route("/recommend-targets", web::post().to(recommend_targets))
            )
            // Sensitivity Analysis endpoints
            .service(
                web::scope("/sensitivity")
                    .route("/analyze", web::post().to(run_sensitivity_analysis))
            )
            // Matrix Generation endpoints
            .service(
                web::scope("/matrices")
                    .route("/ahp", web::get().to(generate_ahp_matrix))
                    .route("/network", web::get().to(generate_network_matrix))
                    .route("/ahp/customize", web::post().to(customize_ahp_matrix))
                    .route("/export", web::get().to(export_matrices_csv))
            )
            // Scenario Simulation endpoints
            .service(
                web::scope("/scenarios")
                    .route("/compare", web::post().to(compare_scenarios))
                    .route("/crisis", web::post().to(simulate_crisis))
                    .route("/budget-change", web::post().to(simulate_budget_changes))
                    .route("/intervention", web::post().to(simulate_intervention))
            )
            // Decision Support endpoints
            .service(
                web::scope("/decision-support")
                    .route("/policy-recommendations", web::post().to(generate_policy_recommendations))
                    .route("/crisis-response", web::post().to(generate_crisis_response))
                    .route("/track-progress", web::post().to(track_progress))
                    .route("/stakeholder-brief", web::post().to(generate_stakeholder_brief))
            );
}

/// Get all FSFVI API endpoint paths for validation and documentation
///
/// **Use Cases:**
/// - Route registration validation in integration tests
/// - Security audit logging (verify all endpoints are properly secured)
/// - API gateway configuration (nginx/traefik route registration)
/// - Documentation generation (auto-generate endpoint lists)
/// - CI/CD pipeline validation (ensure all documented endpoints exist)
///
/// **Returns:** Complete list of all 27 FSFVI API endpoint paths
///
/// **Example Usage:**
/// ```rust
/// // In integration tests:
/// let documented_paths = get_openapi_paths();
/// for path in documented_paths {
///     assert!(route_exists(path), "Route {} not registered", path);
/// }
/// ```
///
/// **Note:** This function is primarily used by integration tests in `tests/route_validation.rs`.
/// The dead_code warning is suppressed as this is a critical validation utility.
#[allow(dead_code)]
pub fn get_openapi_paths() -> Vec<&'static str> {
    vec![
        // Assessment endpoints
        "/api/v1/fsfvi/assessments",
        "/api/v1/fsfvi/assessments/quick",

        // Strategic Planning endpoints
        "/api/v1/fsfvi/strategic-planning/multi-year",
        "/api/v1/fsfvi/strategic-planning/mtef",
        "/api/v1/fsfvi/strategic-planning/investment-sequencing",
        "/api/v1/fsfvi/strategic-planning/resource-mobilization",

        // Budget Optimization endpoints (comprehensive suite)
        "/api/v1/fsfvi/optimization/budget/analyze-efficiency",
        "/api/v1/fsfvi/optimization/budget/generate-plan",
        "/api/v1/fsfvi/optimization/budget/calculate-roi",
        "/api/v1/fsfvi/optimization/budget/optimize",

        // Weighting Analysis endpoints (methodology validation & transparency)
        "/api/v1/fsfvi/analysis/weights/scenario-sensitivity/hybrid",
        "/api/v1/fsfvi/analysis/weights/scenario-sensitivity/expert",
        "/api/v1/fsfvi/analysis/weights/financial",
        "/api/v1/fsfvi/analysis/weights/network-comparison",
        "/api/v1/fsfvi/analysis/weights/context-sensitivity",
        "/api/v1/fsfvi/analysis/weights/expert-validation",
        "/api/v1/fsfvi/analysis/weights/expert-validation/compare-scenarios",
        "/api/v1/fsfvi/analysis/weights/available-scenarios",

        // Performance Gap Analysis endpoints
        "/api/v1/fsfvi/performance-gaps/analyze",
        "/api/v1/fsfvi/performance-gaps/peer-comparison",
        "/api/v1/fsfvi/performance-gaps/track-closure",
        "/api/v1/fsfvi/performance-gaps/recommend-targets",

        // Sensitivity Analysis endpoints
        "/api/v1/fsfvi/sensitivity/analyze",

        // Matrix Generation endpoints
        "/api/v1/fsfvi/matrices/ahp",
        "/api/v1/fsfvi/matrices/network",
        "/api/v1/fsfvi/matrices/ahp/customize",
        "/api/v1/fsfvi/matrices/export",

        // Scenario Simulation endpoints
        "/api/v1/fsfvi/scenarios/compare",
        "/api/v1/fsfvi/scenarios/crisis",
        "/api/v1/fsfvi/scenarios/budget-change",
        "/api/v1/fsfvi/scenarios/intervention",

        // Decision Support endpoints
        "/api/v1/fsfvi/decision-support/policy-recommendations",
        "/api/v1/fsfvi/decision-support/crisis-response",
        "/api/v1/fsfvi/decision-support/track-progress",
        "/api/v1/fsfvi/decision-support/stakeholder-brief",
    ]
}
