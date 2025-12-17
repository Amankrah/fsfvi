/// OpenAPI Documentation for FSFVI API
/// =====================================
///
/// Government-facing API documentation for country-level developers.
/// Provides comprehensive Swagger UI for exploring and testing endpoints.

use utoipa::OpenApi;
use crate::fsfvi_api::models::*;

/// FSFVI API OpenAPI Documentation
///
/// This documentation serves government developers integrating with the
/// Food System Fragility and Vulnerability Index (FSFVI) API.
///
/// # Authentication
/// All endpoints require either:
/// - JWT Bearer token (obtained via `/api/auth/login`)
/// - API Key in `X-API-Key` header
///
/// # Rate Limiting
/// - Default: 100 requests per minute per API key/user
/// - Burst: 20 requests
///
/// # Currency Standard
/// ALL monetary values are in USD for uniformity across countries.
///
/// # Base URL
/// - Production: `https://api.fsfvi.org/api/v1/fsfvi`
/// - Development: `http://localhost:8080/api/v1/fsfvi`
#[derive(OpenApi)]
#[openapi(
    info(
        title = "FSFVI API - Food System Fragility and Vulnerability Index",
        version = "1.0.0",
        description = "Government-facing API for comprehensive food system vulnerability assessment, \
                      strategic planning, budget optimization, and policy decision support.\n\n\
                      ## Overview\n\
                      The FSFVI API enables governments to:\n\
                      - Assess national food system vulnerability using hybrid AHP-Network weighting\n\
                      - Generate multi-year strategic plans for food security improvement\n\
                      - Optimize budget allocations using linear programming\n\
                      - Track performance gaps against international benchmarks\n\
                      - Simulate crisis scenarios and intervention impacts\n\
                      - Generate evidence-based policy recommendations\n\n\
                      ## Key Features\n\
                      - **Comprehensive Assessment**: 25+ indicators across 6 components\n\
                      - **Scientific Rigor**: Peer-reviewed AHP methodology with consistency validation\n\
                      - **Budget Optimization**: Data-driven allocation recommendations\n\
                      - **Multi-Year Planning**: 3-10 year strategic budget trajectories\n\
                      - **Crisis Simulation**: Test resilience under climate, economic, and health shocks\n\
                      - **Transparency**: Full methodology validation and weight sensitivity analysis\n\n\
                      ## Support\n\
                      - Technical Documentation: https://docs.fsfvi.org\n\
                      - Issues: https://github.com/fsfvi/api/issues\n\
                      - Email: support@fsfvi.org",
        contact(
            name = "FSFVI Support Team",
            email = "support@fsfvi.org"
        ),
        license(
            name = "MIT",
            url = "https://opensource.org/licenses/MIT"
        )
    ),
    servers(
        (url = "http://localhost:8080", description = "Local development"),
        (url = "https://api-staging.fsfvi.org", description = "Staging environment"),
        (url = "https://api.fsfvi.org", description = "Production")
    ),
    paths(
        // Assessment endpoints
        crate::fsfvi_api::handlers::run_assessment,
        crate::fsfvi_api::handlers::quick_check,

        // Strategic Planning endpoints
        crate::fsfvi_api::handlers::generate_multi_year_plan,
        crate::fsfvi_api::handlers::generate_mtef,
        crate::fsfvi_api::handlers::analyze_investment_sequencing,
        crate::fsfvi_api::handlers::generate_resource_mobilization,

        // Performance Gap Analysis endpoints
        crate::fsfvi_api::handlers::analyze_performance_gaps,
        crate::fsfvi_api::handlers::peer_comparison,
        crate::fsfvi_api::handlers::track_gap_closure,
        crate::fsfvi_api::handlers::recommend_targets,

        // Sensitivity Analysis endpoints
        crate::fsfvi_api::handlers::run_sensitivity_analysis,

        // Matrix Generation endpoints
        crate::fsfvi_api::handlers::generate_ahp_matrix,
        crate::fsfvi_api::handlers::generate_network_matrix,
        crate::fsfvi_api::handlers::customize_ahp_matrix,
        crate::fsfvi_api::handlers::export_matrices_csv,

        // Scenario Simulation endpoints
        crate::fsfvi_api::handlers::compare_scenarios,
        crate::fsfvi_api::handlers::simulate_crisis,
        crate::fsfvi_api::handlers::simulate_budget_changes,
        crate::fsfvi_api::handlers::simulate_intervention,

        // Decision Support endpoints
        crate::fsfvi_api::handlers::generate_policy_recommendations,
        crate::fsfvi_api::handlers::generate_crisis_response,
        crate::fsfvi_api::handlers::track_progress,
        crate::fsfvi_api::handlers::generate_stakeholder_brief,
    ),
    components(
        schemas(
            // Request/Response models
            ApiResponse<String>,
            AssessmentApiRequest,
            MultiYearPlanApiRequest,
            MtefApiRequest,
            InvestmentSequencingApiRequest,
            ResourceMobilizationApiRequest,
            PeerComparisonApiRequest,
            GapClosureApiRequest,
            TargetRecommendationApiRequest,
            SensitivityAnalysisApiRequest,
            CustomAhpMatrixRequest,
            ScenarioComparisonApiRequest,
            CrisisSimulationApiRequest,
            BudgetChangeSimulationApiRequest,
            InterventionSimulationApiRequest,
            PolicyRecommendationApiRequest,
            CrisisResponseApiRequest,
            ProgressTrackingApiRequest,
            StakeholderBriefApiRequest,
            ComponentInput,
            YearlyBudgetConstraintInput,
        )
    ),
    tags(
        (name = "Assessment", description = "Food system vulnerability assessment endpoints"),
        (name = "Strategic Planning", description = "Multi-year budget planning and MTEF generation"),
        (name = "Budget Optimization", description = "Data-driven budget allocation optimization"),
        (name = "Weighting Analysis", description = "Methodology validation and sensitivity analysis"),
        (name = "Performance Gaps", description = "Benchmark comparison and gap tracking"),
        (name = "Sensitivity Analysis", description = "Robustness testing under uncertainty"),
        (name = "Matrix Generation", description = "AHP and network weighting matrices"),
        (name = "Scenario Simulation", description = "What-if analysis and crisis planning"),
        (name = "Decision Support", description = "Policy recommendations and stakeholder communication"),
    ),
    modifiers(&SecurityAddon)
)]
pub struct ApiDoc;

/// Security scheme configuration
struct SecurityAddon;

impl utoipa::Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "jwt_auth",
                utoipa::openapi::security::SecurityScheme::Http(
                    utoipa::openapi::security::HttpBuilder::new()
                        .scheme(utoipa::openapi::security::HttpAuthScheme::Bearer)
                        .bearer_format("JWT")
                        .description(Some(
                            "JWT Bearer token obtained from /api/auth/login endpoint.\n\n\
                            Include as: `Authorization: Bearer <token>`"
                        ))
                        .build(),
                ),
            );
            components.add_security_scheme(
                "api_key",
                utoipa::openapi::security::SecurityScheme::ApiKey(
                    utoipa::openapi::security::ApiKey::Header(
                        utoipa::openapi::security::ApiKeyValue::new("X-API-Key")
                    )
                ),
            );
        }
    }
}
