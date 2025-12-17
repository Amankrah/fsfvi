/// Budget Optimization API Endpoints
/// Government-facing endpoints for data-driven budget allocation optimization
///
/// Use Cases:
/// - Analyze current budget allocation efficiency
/// - Generate optimal reallocation plans
/// - Calculate ROI for budget scenarios
/// - Optimize allocations under government constraints

use actix_web::{web, HttpMessage, HttpResponse};
use serde::Deserialize;
use std::time::Instant;
use uuid::Uuid;
use validator::Validate;

use crate::{
    fsfvi::service::budget_optimization::{
        BudgetScenario,
        OptimizationConstraints, OptimizationObjective,
    },
    fsfvi::validators::Component,
    fsfvi_api::handlers::FsfviApiState,
    fsfvi_api::models::ApiResponse,
    models::user::UserRole,
    services::jwt::Claims,
    utils::error::AppError,
};

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/optimization/budget")
            .route(
                "/analyze-efficiency",
                web::post().to(analyze_allocation_efficiency),
            )
            .route(
                "/generate-plan",
                web::post().to(generate_reallocation_plan),
            )
            .route("/calculate-roi", web::post().to(calculate_roi))
            .route("/optimize", web::post().to(optimize_allocation)),
    );
}

// Request DTOs

#[derive(Debug, Deserialize, Validate)]
pub struct AllocationEfficiencyRequest {
    /// Components with current allocations
    #[validate(length(min = 1, message = "At least one component is required"))]
    pub components: Vec<Component>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ReallocationPlanRequest {
    /// Components with current allocations
    #[validate(length(min = 1, message = "At least one component is required"))]
    pub components: Vec<Component>,
    /// Optimization constraints
    pub constraints: Option<OptimizationConstraints>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct RoiAnalysisRequest {
    /// Baseline components
    #[validate(length(min = 1, message = "At least one component is required"))]
    pub components: Vec<Component>,
    /// Budget scenarios to evaluate
    #[validate(length(min = 1, message = "At least one scenario is required"))]
    pub scenarios: Vec<BudgetScenario>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct OptimizationRequest {
    /// Components to optimize
    #[validate(length(min = 1, message = "At least one component is required"))]
    pub components: Vec<Component>,
    /// Optimization objective
    pub objective: OptimizationObjective,
    /// Constraints on the optimization
    pub constraints: Option<OptimizationConstraints>,
}

// Handler Functions

/// POST /api/v1/optimization/budget/analyze-efficiency
/// Analyze current budget allocation efficiency
///
/// **Use Case**: Government wants to understand if current budget allocations
/// align with food system vulnerabilities. Identifies over/under-allocated components.
///
/// **Returns**:
/// - Current FSFVI and budget
/// - Allocation concentration (HHI)
/// - Component-by-component efficiency analysis
/// - Recommended reallocations
/// - Improvement potential estimate
///
/// **Requires**: Developer or Admin role
async fn analyze_allocation_efficiency(
    req: actix_web::HttpRequest,
    state: web::Data<FsfviApiState>,
    body: web::Json<AllocationEfficiencyRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    // Verify authentication
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;

    // Parse user ID
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    // Verify role (Developer or Admin)
    if claims.role != UserRole::Developer && claims.role != UserRole::Admin {
        return Err(AppError::AuthenticationError(
            "Access denied. Developer or Admin role required.".to_string(),
        ));
    }

    // Validate request
    body.validate()
        .map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    // Run analysis using shared service instance
    let report = state
        .fsfvi_service
        .budget
        .analyze_allocation_efficiency(body.components.clone())
        .map_err(|e| {
            tracing::error!("Allocation efficiency analysis failed: {:?}", e);
            AppError::InternalError(format!("Analysis failed: {}", e))
        })?;

    // Log operation
    log_operation(&state.db_pool, user_id, "analyze_allocation_efficiency", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/optimization/budget/generate-plan
/// Generate step-by-step budget reallocation plan
///
/// **Use Case**: Government needs a practical, phased implementation plan
/// to transition from current allocations to optimized allocations.
///
/// **Returns**:
/// - Baseline and expected FSFVI after reallocation
/// - Optimal allocations by component
/// - Implementation phases with timelines
/// - Risk assessment and mitigation strategies
///
/// **Requires**: Developer or Admin role (high-impact decision)
async fn generate_reallocation_plan(
    req: actix_web::HttpRequest,
    state: web::Data<FsfviApiState>,
    body: web::Json<ReallocationPlanRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    // Only Developer or Admin (this creates actionable government plans)
    if claims.role != UserRole::Developer && claims.role != UserRole::Admin {
        return Err(AppError::AuthenticationError(
            "Access denied. Developer or Admin role required for reallocation planning.".to_string(),
        ));
    }

    body.validate()
        .map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    let constraints = body
        .constraints
        .clone()
        .unwrap_or_else(OptimizationConstraints::default);

    let plan = state
        .fsfvi_service
        .budget
        .generate_reallocation_plan(body.components.clone(), constraints)
        .map_err(|e| {
            tracing::error!("Reallocation plan generation failed: {:?}", e);
            AppError::InternalError(format!("Plan generation failed: {}", e))
        })?;

    log_operation(&state.db_pool, user_id, "generate_reallocation_plan", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(plan, user_id, processing_time)))
}

/// POST /api/v1/optimization/budget/calculate-roi
/// Calculate return on investment for budget scenarios
///
/// **Use Case**: Government wants to compare multiple budget scenarios
/// and understand cost-effectiveness (FSFVI improvement per dollar invested).
///
/// **Returns**:
/// - ROI metrics for each scenario
/// - Ranking by cost-effectiveness
/// - Best ROI scenario recommendation
///
/// **Requires**: Developer or Admin role
async fn calculate_roi(
    req: actix_web::HttpRequest,
    state: web::Data<FsfviApiState>,
    body: web::Json<RoiAnalysisRequest>,
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
        .budget
        .calculate_roi(body.components.clone(), body.scenarios.clone())
        .map_err(|e| {
            tracing::error!("ROI calculation failed: {:?}", e);
            AppError::InternalError(format!("ROI calculation failed: {}", e))
        })?;

    log_operation(&state.db_pool, user_id, "calculate_roi", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/optimization/budget/optimize
/// Optimize budget allocation using Linear Programming
///
/// **Use Case**: Government wants mathematically optimal budget allocation
/// to minimize FSFVI under real-world constraints (budget limits, max changes, etc.).
///
/// **Algorithm**: Linear Programming with iterative refinement
/// - Provably optimal solutions (not heuristics)
/// - Handles constraints naturally
/// - Fast and deterministic
/// - No fallback algorithms - fails clearly if optimization cannot complete
///
/// **Returns**:
/// - Optimal allocations by component
/// - FSFVI improvement achieved
/// - Convergence metrics (iterations, convergence status)
///
/// **Requires**: Developer or Admin role (optimization drives government policy)
async fn optimize_allocation(
    req: actix_web::HttpRequest,
    state: web::Data<FsfviApiState>,
    body: web::Json<OptimizationRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    // Only Developer or Admin (this generates policy-level decisions)
    if claims.role != UserRole::Developer && claims.role != UserRole::Admin {
        return Err(AppError::AuthenticationError(
            "Access denied. Developer or Admin role required for optimization.".to_string(),
        ));
    }

    body.validate()
        .map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    let constraints = body
        .constraints
        .clone()
        .unwrap_or_else(OptimizationConstraints::default);

    let result = state
        .fsfvi_service
        .budget
        .optimize_allocation(body.components.clone(), body.objective, constraints)
        .map_err(|e| {
            tracing::error!("Budget optimization failed: {:?}", e);
            // Return detailed error to government so they understand why optimization failed
            AppError::ValidationError(format!(
                "Optimization failed: {}. This indicates the problem constraints may be infeasible or the optimization algorithm encountered numerical issues. Please review constraints and try again.",
                e
            ))
        })?;

    log_operation(&state.db_pool, user_id, "optimize_allocation", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(result, user_id, processing_time)))
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
