/// Weighting Analysis API Endpoints
/// Government-facing endpoints for methodology validation and sensitivity analysis
///
/// Use Cases:
/// - Academic peer review of weighting methodology
/// - Policy transparency and reproducibility
/// - Sensitivity analysis for different scenarios
/// - Validating robustness across country contexts

use actix_web::{web, HttpMessage, HttpResponse};
use serde::Deserialize;
use std::time::Instant;
use uuid::Uuid;
use validator::Validate;

use crate::{
    fsfvi::validators::Component,
    fsfvi::weighting::models::WeightingContext,
    fsfvi_api::handlers::FsfviApiState,
    fsfvi_api::models::ApiResponse,
    models::user::UserRole,
    services::jwt::Claims,
    utils::error::AppError,
};

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/analysis/weights")
            .route(
                "/scenario-sensitivity/hybrid",
                web::post().to(analyze_scenario_sensitivity_hybrid),
            )
            .route(
                "/scenario-sensitivity/expert",
                web::post().to(analyze_scenario_sensitivity_expert),
            )
            .route("/financial", web::post().to(analyze_financial_weights))
            .route(
                "/network-comparison",
                web::post().to(compare_network_algorithms),
            )
            .route(
                "/context-sensitivity",
                web::post().to(analyze_context_sensitivity),
            )
            .route(
                "/expert-validation",
                web::post().to(get_expert_weight_validation),
            )
            .route(
                "/available-scenarios",
                web::get().to(get_available_scenarios),
            )
            .route(
                "/expert-validation/compare-scenarios",
                web::post().to(compare_expert_scenarios),
            )
    );
}

// Request DTOs

#[derive(Debug, Deserialize, Validate)]
pub struct HybridScenarioSensitivityRequest {
    /// Components to analyze
    #[validate(length(min = 1, message = "At least one component is required"))]
    pub components: Vec<Component>,
    /// Scenarios to compare (e.g., "baseline", "climate_shock", "financial_crisis")
    #[validate(length(min = 2, message = "At least two scenarios required for comparison"))]
    pub scenarios: Vec<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ExpertScenarioSensitivityRequest {
    /// Scenarios to compare
    #[validate(length(min = 2, message = "At least two scenarios required for comparison"))]
    pub scenarios: Vec<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct FinancialWeightsRequest {
    /// Different component allocation scenarios to compare
    #[validate(length(min = 1, message = "At least one allocation scenario required"))]
    pub component_scenarios: Vec<Vec<Component>>,
    /// Optional scenario names for each allocation scenario (e.g., "baseline", "climate_shock")
    /// If provided, enables cost-effectiveness adjustments
    pub scenario_names: Option<Vec<String>>,
    /// Whether to apply IPC Phase 3+ crisis-level minimum thresholds
    /// Default: false (uses normal operational thresholds)
    pub is_crisis: Option<bool>,
    /// Include vulnerability-based allocation efficiency analysis
    /// Requires components to have vulnerability data calculated
    pub include_efficiency_analysis: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct NetworkComparisonRequest {
    /// Optional scenario context
    pub scenario: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ContextSensitivityRequest {
    /// Components to analyze
    #[validate(length(min = 1, message = "At least one component is required"))]
    pub components: Vec<Component>,
    /// Country contexts to compare
    #[validate(length(min = 2, message = "At least two contexts required for comparison"))]
    pub contexts: Vec<WeightingContext>,
}

// Handler Functions

/// POST /api/v1/analysis/weights/scenario-sensitivity/hybrid
/// Analyze how HYBRID weights change across different scenarios
///
/// **Use Case**: Government analysts can use this to understand how
/// component priorities shift during different crisis scenarios
/// (climate shocks, financial crises, pandemics, etc.)
///
/// **Requires**: Developer or Admin role
async fn analyze_scenario_sensitivity_hybrid(
    req: actix_web::HttpRequest,
    state: web::Data<FsfviApiState>,
    body: web::Json<HybridScenarioSensitivityRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    if claims.role != UserRole::Developer && claims.role != UserRole::Admin {
        return Err(AppError::AuthenticationError(
            "Access denied. Developer or Admin role required.".to_string(),
        ));
    }

    body.validate()
        .map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    let scenarios: Vec<&str> = body.scenarios.iter().map(|s| s.as_str()).collect();
    let report = state
        .fsfvi_service
        .weighting_analysis
        .analyze_scenario_sensitivity_hybrid(&body.components, &scenarios)
        .map_err(|e| {
            tracing::error!("Hybrid scenario sensitivity analysis failed: {:?}", e);
            AppError::InternalError(format!("Analysis failed: {}", e))
        })?;

    log_operation(&state.db_pool, user_id, "analyze_scenario_sensitivity_hybrid", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/analysis/weights/scenario-sensitivity/expert
/// Analyze how EXPERT weights (AHP-based) change across different scenarios
///
/// **Use Case**: Compare expert-driven priorities across different crisis scenarios
///
/// **Requires**: Developer or Admin role
async fn analyze_scenario_sensitivity_expert(
    req: actix_web::HttpRequest,
    state: web::Data<FsfviApiState>,
    body: web::Json<ExpertScenarioSensitivityRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    if claims.role != UserRole::Developer && claims.role != UserRole::Admin {
        return Err(AppError::AuthenticationError(
            "Access denied. Developer or Admin role required.".to_string(),
        ));
    }

    body.validate()
        .map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    let scenarios: Vec<&str> = body.scenarios.iter().map(|s| s.as_str()).collect();
    let report = state
        .fsfvi_service
        .weighting_analysis
        .analyze_scenario_sensitivity_expert(&scenarios)
        .map_err(|e| {
            tracing::error!("Expert scenario sensitivity analysis failed: {:?}", e);
            AppError::InternalError(format!("Analysis failed: {}", e))
        })?;

    log_operation(&state.db_pool, user_id, "analyze_scenario_sensitivity_expert", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/analysis/weights/financial
/// Analyze how FINANCIAL weights change across different budget allocations
///
/// **Use Case**: Compare how budget allocation patterns affect relative priorities
///
/// **Enhanced**: Now includes:
/// - Cost-effectiveness adjustments by scenario (e.g., nutrition more effective in pandemics)
/// - IPC Phase 3+ crisis threshold validation
/// - Funding gap analysis (how much more is needed to meet minimums)
/// - Allocation efficiency vs vulnerability (over/under-allocated components)
/// - Marginal impact scores (where next dollar has highest impact)
///
/// **Requires**: Developer or Admin role
async fn analyze_financial_weights(
    req: actix_web::HttpRequest,
    state: web::Data<FsfviApiState>,
    body: web::Json<FinancialWeightsRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    if claims.role != UserRole::Developer && claims.role != UserRole::Admin {
        return Err(AppError::AuthenticationError(
            "Access denied. Developer or Admin role required.".to_string(),
        ));
    }

    body.validate()
        .map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    // Extract parameters with defaults
    let scenario_names = body.scenario_names.as_deref();
    let is_crisis = body.is_crisis.unwrap_or(false);
    let include_efficiency = body.include_efficiency_analysis.unwrap_or(false);

    let report = state
        .fsfvi_service
        .weighting_analysis
        .analyze_financial_weights(
            &body.component_scenarios,
            scenario_names,
            is_crisis,
            include_efficiency,
        )
        .map_err(|e| {
            tracing::error!("Financial weights analysis failed: {:?}", e);
            AppError::InternalError(format!("Analysis failed: {}", e))
        })?;

    log_operation(&state.db_pool, user_id, "analyze_financial_weights", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/analysis/weights/network-comparison
/// Compare PageRank vs Eigenvector centrality for robustness validation
///
/// **Use Case**: Academic peer review, methodology transparency,
/// validating that conclusions are robust to algorithm choice
///
/// **Requires**: Developer or Admin role
async fn compare_network_algorithms(
    req: actix_web::HttpRequest,
    state: web::Data<FsfviApiState>,
    body: web::Json<NetworkComparisonRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    if claims.role != UserRole::Developer && claims.role != UserRole::Admin {
        return Err(AppError::AuthenticationError(
            "Access denied. Developer or Admin role required.".to_string(),
        ));
    }

    let scenario = body.scenario.as_deref();
    let comparison = state
        .fsfvi_service
        .weighting_analysis
        .compare_network_algorithms(scenario)
        .map_err(|e| {
            tracing::error!("Network algorithm comparison failed: {:?}", e);
            AppError::InternalError(format!("Analysis failed: {}", e))
        })?;

    log_operation(&state.db_pool, user_id, "compare_network_algorithms", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(comparison, user_id, processing_time)))
}

/// POST /api/v1/analysis/weights/context-sensitivity
/// Analyze how HYBRID weights change across different country contexts
///
/// **Use Case**: Compare weighting strategies for low-income vs high-income countries,
/// or different geographical regions
///
/// **Requires**: Developer or Admin role
async fn analyze_context_sensitivity(
    req: actix_web::HttpRequest,
    state: web::Data<FsfviApiState>,
    body: web::Json<ContextSensitivityRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    if claims.role != UserRole::Developer && claims.role != UserRole::Admin {
        return Err(AppError::AuthenticationError(
            "Access denied. Developer or Admin role required.".to_string(),
        ));
    }

    body.validate()
        .map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    let report = state
        .fsfvi_service
        .weighting_analysis
        .analyze_country_context_sensitivity(&body.components, &body.contexts)
        .map_err(|e| {
            tracing::error!("Context sensitivity analysis failed: {:?}", e);
            AppError::InternalError(format!("Analysis failed: {}", e))
        })?;

    log_operation(&state.db_pool, user_id, "analyze_context_sensitivity", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/analysis/weights/expert-validation
/// Get expert weight validation with full AHP consistency metrics
///
/// **Use Case**: Government transparency, academic peer review,
/// validate that expert judgments are scientifically sound (CR < 0.10)
///
/// **Requires**: Developer or Admin role
async fn get_expert_weight_validation(
    req: actix_web::HttpRequest,
    state: web::Data<FsfviApiState>,
    body: web::Json<ExpertValidationRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    if claims.role != UserRole::Developer && claims.role != UserRole::Admin {
        return Err(AppError::AuthenticationError(
            "Access denied. Developer or Admin role required.".to_string(),
        ));
    }

    let scenario = body.scenario.as_deref();
    let validation = state
        .fsfvi_service
        .weighting_analysis
        .get_expert_weight_validation(scenario)
        .map_err(|e| {
            tracing::error!("Expert weight validation failed: {:?}", e);
            AppError::InternalError(format!("Validation failed: {}", e))
        })?;

    log_operation(&state.db_pool, user_id, "get_expert_weight_validation", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(validation, user_id, processing_time)))
}

/// POST /api/v1/analysis/weights/expert-validation/compare-scenarios
/// Compare expert weights across multiple scenarios with consistency validation
///
/// **Use Case**: Cross-scenario analysis, identify scenarios with inconsistent judgments
///
/// **Requires**: Developer or Admin role
async fn compare_expert_scenarios(
    req: actix_web::HttpRequest,
    state: web::Data<FsfviApiState>,
    body: web::Json<ScenarioComparisonRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    if claims.role != UserRole::Developer && claims.role != UserRole::Admin {
        return Err(AppError::AuthenticationError(
            "Access denied. Developer or Admin role required.".to_string(),
        ));
    }

    body.validate()
        .map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    let scenarios: Vec<&str> = body.scenarios.iter().map(|s| s.as_str()).collect();
    let comparison = state
        .fsfvi_service
        .weighting_analysis
        .compare_expert_weights_across_scenarios(&scenarios)
        .map_err(|e| {
            tracing::error!("Scenario comparison failed: {:?}", e);
            AppError::InternalError(format!("Comparison failed: {}", e))
        })?;

    log_operation(&state.db_pool, user_id, "compare_expert_scenarios", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(comparison, user_id, processing_time)))
}

/// GET /api/v1/analysis/weights/available-scenarios
/// Get list of available scenarios for expert weight analysis
///
/// **Use Case**: Scenario discovery, helps users know what scenarios exist
///
/// **Requires**: Developer or Admin role
async fn get_available_scenarios(
    req: actix_web::HttpRequest,
    state: web::Data<FsfviApiState>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    if claims.role != UserRole::Developer && claims.role != UserRole::Admin {
        return Err(AppError::AuthenticationError(
            "Access denied. Developer or Admin role required.".to_string(),
        ));
    }

    let scenarios = state.fsfvi_service.weighting_analysis.get_available_scenarios();

    log_operation(&state.db_pool, user_id, "get_available_scenarios", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(scenarios, user_id, processing_time)))
}

#[derive(Debug, Deserialize)]
pub struct ExpertValidationRequest {
    /// Optional scenario to validate (defaults to "baseline")
    pub scenario: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ScenarioComparisonRequest {
    /// Scenarios to compare
    #[validate(length(min = 2, message = "At least two scenarios required for comparison"))]
    pub scenarios: Vec<String>,
}

// ============================================================================
// Helper Functions
// ============================================================================

async fn log_operation(
    pool: &sqlx::PgPool,
    user_id: Uuid,
    operation: &str,
    status: &str,
) -> Result<(), AppError> {
    sqlx::query!(
        r#"
        INSERT INTO fsfvi_operation_logs (user_id, operation, status, created_at)
        VALUES ($1, $2, $3, NOW())
        "#,
        user_id,
        operation,
        status
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::InternalError(format!("Failed to log operation: {}", e)))?;

    Ok(())
}
