/// FSFVI API Handlers
/// ==================
///
/// HTTP request handlers for FSFVI endpoints.
/// Integrates with existing auth middleware.

use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use sqlx::PgPool;
use std::sync::Arc;
use std::time::Instant;
use uuid::Uuid;
use validator::Validate;

use crate::fsfvi::service::FsfviService;
use crate::fsfvi_api::models::*;
use crate::fsfvi_api::permissions::FsfviPermission;
use crate::services::jwt::Claims;
use crate::utils::error::AppError;
use crate::require_permission;

// ============================================================================
// Handler State
// ============================================================================

pub struct FsfviApiState {
    pub fsfvi_service: Arc<FsfviService>,
    pub db_pool: PgPool,
}

// ============================================================================
// Assessment Handlers
// ============================================================================

/// POST /api/v1/fsfvi/assessments
///
/// Conduct comprehensive food system vulnerability assessment.
/// Returns FSFVI score, component insights, and recommendations.
///
/// **Required Permission:** RunAssessment
/// **Currency:** All monetary values must be in USD
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/assessments",
    tag = "FSFVI Assessment",
    request_body = AssessmentApiRequest,
    responses(
        (status = 200, description = "Assessment completed successfully"),
        (status = 400, description = "Invalid request"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn run_assessment(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<AssessmentApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    // Extract claims from request
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;

    // Check permission

    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;
    require_permission!(claims, FsfviPermission::RunAssessment);

    // Validate request
    payload.validate().map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    // Convert input to FSFVI components
    let components: Vec<crate::fsfvi::validators::Component> = payload
        .components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    // Run assessment
    let assessment_request = crate::fsfvi::service::AssessmentRequest {
        components: components.clone(),
        country_name: payload.country_name.clone(),
        weighting_method: payload.weighting_method,
        scenario: payload.scenario,
        context: None,
        currency: Some("USD".to_string()), // Force USD
        use_performance_adjusted_weights: false, // Use standard weighting for API assessments
    };

    let report = state
        .fsfvi_service
        .vulnerability
        .assess_food_system(assessment_request)
        .map_err(|e| AppError::InternalError(format!("Assessment failed: {}", e)))?;

    // Create audit metadata for government accountability
    let audit_metadata = crate::fsfvi::config::create_audit_metadata(
        payload.weighting_method.unwrap_or(crate::fsfvi::config::WeightingMethod::Hybrid),
        payload.scenario.unwrap_or(crate::fsfvi::config::Scenario::NormalOperations),
        components.len(),
        payload.country_name.as_deref(),
    );

    // Log to database with full audit trail
    log_fsfvi_operation_with_metadata(
        &state.db_pool,
        user_id,
        "assessment",
        "success",
        Some(audit_metadata),
    )
    .await?;

    let processing_time = start.elapsed().as_millis() as u64;
    let response = ApiResponse::new(report, user_id, processing_time);

    Ok(HttpResponse::Ok().json(response))
}

/// GET /api/v1/fsfvi/assessments/quick
///
/// Quick vulnerability check without full reporting.
///
/// **Required Permission:** RunAssessment
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/assessments/quick",
    tag = "FSFVI Assessment",
    responses(
        (status = 200, description = "Quick check completed"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn quick_check(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<Vec<ComponentInput>>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::RunAssessment);

    let components: Vec<crate::fsfvi::validators::Component> = payload
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let result = state
        .fsfvi_service
        .vulnerability
        .quick_check(components)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "quick_check", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(result, user_id, processing_time)))
}

// ============================================================================
// Strategic Planning Handlers
// ============================================================================

/// POST /api/v1/fsfvi/strategic-planning/multi-year
///
/// Generate multi-year strategic plan for FSFVI reduction.
/// Critical for planning future budgets across 3-5+ years.
///
/// **Required Permission:** GenerateStrategicPlan
/// **Currency:** All monetary values in USD
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/strategic-planning/multi-year",
    tag = "Strategic Planning",
    request_body = MultiYearPlanApiRequest,
    responses(
        (status = 200, description = "Strategic plan generated"),
        (status = 400, description = "Invalid request"),
        (status = 403, description = "Insufficient permissions"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn generate_multi_year_plan(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<MultiYearPlanApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::GenerateStrategicPlan);

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    // Convert inputs
    let components: Vec<crate::fsfvi::validators::Component> = payload
        .current_components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let yearly_constraints = payload
        .yearly_budget_constraints
        .as_ref()
        .map(|constraints| {
            constraints
                .iter()
                .map(|(year, constraint)| {
                    (
                        *year,
                        crate::fsfvi::service::strategic_planning::YearlyBudgetConstraint {
                            total_budget_ceiling: constraint.total_budget_ceiling_usd,
                            min_allocation_per_component: constraint.min_allocation_per_component_usd,
                            max_change_percent_from_previous: constraint.max_change_percent_from_previous,
                            priority_components: constraint.priority_components.clone().unwrap_or_default(),
                        },
                    )
                })
                .collect()
        })
        .unwrap_or_default();

    let plan_request = crate::fsfvi::service::strategic_planning::MultiYearPlanRequest {
        current_components: components,
        country_name: payload.country_name.clone(),
        currency: Some("USD".to_string()),
        planning_years: payload.planning_years,
        target_fsfvi: payload.target_fsfvi,
        yearly_budget_constraints: yearly_constraints,
    };

    let plan = state
        .fsfvi_service
        .strategic_planning
        .generate_multi_year_plan(plan_request)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "multi_year_plan", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(plan, user_id, processing_time)))
}

/// POST /api/v1/fsfvi/strategic-planning/mtef
///
/// Generate 3-year Medium-Term Expenditure Framework.
///
/// **Required Permission:** GenerateMTEF
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/strategic-planning/mtef",
    tag = "Strategic Planning",
    request_body = MtefApiRequest,
    responses(
        (status = 200, description = "MTEF generated"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn generate_mtef(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<MtefApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::GenerateMTEF);

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let components: Vec<crate::fsfvi::validators::Component> = payload
        .current_components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let mtef = state
        .fsfvi_service
        .strategic_planning
        .generate_mtef(
            components,
            payload.target_improvement_percent,
            payload.yearly_budget_growth_rate,
        )
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "mtef", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(mtef, user_id, processing_time)))
}

/// POST /api/v1/fsfvi/strategic-planning/investment-sequencing
///
/// Analyze optimal sequencing of investments across planning horizon.
/// Identifies dependencies (e.g., infrastructure before programs) and phases.
///
/// **Required Permission:** GenerateStrategicPlan
/// **Currency:** All monetary values in USD
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/strategic-planning/investment-sequencing",
    tag = "Strategic Planning",
    request_body = InvestmentSequencingApiRequest,
    responses(
        (status = 200, description = "Investment sequencing analysis completed"),
        (status = 400, description = "Invalid request"),
        (status = 403, description = "Insufficient permissions"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn analyze_investment_sequencing(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<InvestmentSequencingApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::GenerateStrategicPlan);

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let components: Vec<crate::fsfvi::validators::Component> = payload
        .components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let sequencing_plan = state
        .fsfvi_service
        .strategic_planning
        .analyze_investment_sequencing(components, payload.planning_years)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "investment_sequencing", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(sequencing_plan, user_id, processing_time)))
}

/// POST /api/v1/fsfvi/strategic-planning/resource-mobilization
///
/// Generate resource mobilization plan showing domestic vs external financing needs.
/// Critical for planning donor engagement and fiscal sustainability.
///
/// **Required Permission:** GenerateStrategicPlan
/// **Currency:** All monetary values in USD
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/strategic-planning/resource-mobilization",
    tag = "Strategic Planning",
    request_body = ResourceMobilizationApiRequest,
    responses(
        (status = 200, description = "Resource mobilization plan generated"),
        (status = 400, description = "Invalid request"),
        (status = 403, description = "Insufficient permissions"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn generate_resource_mobilization(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<ResourceMobilizationApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::GenerateStrategicPlan);

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    // Convert API input to service types
    let strategic_plan = crate::fsfvi::service::strategic_planning::MultiYearStrategicPlan {
        baseline_fsfvi: payload.strategic_plan.baseline_fsfvi,
        target_fsfvi: payload.strategic_plan.target_fsfvi,
        planning_years: payload.strategic_plan.planning_years,
        target_already_achieved: false,
        yearly_plans: payload.strategic_plan.yearly_plans.iter().map(|yp| {
            crate::fsfvi::service::strategic_planning::YearlyPlan {
                year: yp.year,
                target_fsfvi: yp.target_fsfvi,
                projected_fsfvi: yp.projected_fsfvi,
                fsfvi_reduction_from_previous: 0.0, // Not needed for resource mobilization
                on_track: true,
                recommended_allocations: yp.recommended_allocations.clone(),
                recommended_allocations_components: vec![], // Not needed for resource mobilization
                total_budget: yp.total_budget,
                key_interventions: vec![],
                milestones: vec![],
            }
        }).collect(),
        total_additional_investment_needed: 0.0, // Will be recalculated
        expected_outcomes: vec![],
        implementation_risks: vec![],
        success_factors: vec![],
    };

    let domestic_capacity: Vec<crate::fsfvi::service::strategic_planning::YearlyResourceCapacity> =
        payload.domestic_resource_capacity
            .iter()
            .map(|dc| crate::fsfvi::service::strategic_planning::YearlyResourceCapacity {
                year: dc.year,
                available_domestic_resources: dc.available_domestic_resources,
            })
            .collect();

    let mobilization_plan = state
        .fsfvi_service
        .strategic_planning
        .generate_resource_mobilization_plan(&strategic_plan, domestic_capacity)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "resource_mobilization", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(mobilization_plan, user_id, processing_time)))
}

// ============================================================================
// Performance Gap Analysis Handlers
// NOTE: Budget Optimization handlers are in fsfvi_api/budget_optimization.rs
// ============================================================================

/// POST /api/v1/fsfvi/performance-gaps/analyze
///
/// Analyze performance gaps vs benchmarks.
///
/// **Required Permission:** RunPerformanceGapAnalysis
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/performance-gaps/analyze",
    tag = "Performance Gap Analysis",
    responses(
        (status = 200, description = "Analysis completed"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn analyze_performance_gaps(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<Vec<ComponentInput>>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    // Extract auth context (works with both JWT and API key)
    let auth_ctx = crate::fsfvi_api::auth_extract::extract_auth_context(&req)?;
    let user_id = auth_ctx.user_id;

    // TODO: Implement scope-based permission checking for API keys
    // For now, API keys with "*" scope have full access
    // JWT users still go through role-based permission checks
    if let Some(claims) = req.extensions().get::<Claims>() {
        require_permission!(claims, FsfviPermission::RunPerformanceGapAnalysis);
    }

    let components: Vec<crate::fsfvi::validators::Component> = payload
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let report = state
        .fsfvi_service
        .performance_gap
        .analyze_performance_gaps(components)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "performance_gap_analysis", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/fsfvi/performance-gaps/peer-comparison
///
/// Compare with peer countries.
///
/// **Required Permission:** RunPerformanceGapAnalysis
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/performance-gaps/peer-comparison",
    tag = "Performance Gap Analysis",
    request_body = PeerComparisonApiRequest,
    responses(
        (status = 200, description = "Comparison completed"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn peer_comparison(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<PeerComparisonApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let auth_ctx = crate::fsfvi_api::auth_extract::extract_auth_context(&req)?;
    let user_id = auth_ctx.user_id;

    if let Some(claims) = req.extensions().get::<Claims>() {
        require_permission!(claims, FsfviPermission::RunPerformanceGapAnalysis);
    }

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let components: Vec<crate::fsfvi::validators::Component> = payload
        .components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let peer_data: Vec<crate::fsfvi::service::PeerCountryData> = payload
        .peer_countries
        .iter()
        .map(|p| crate::fsfvi::service::PeerCountryData {
            country_name: p.country_name.clone(),
            component_values: p.component_values.clone(),
        })
        .collect();

    let report = state
        .fsfvi_service
        .performance_gap
        .peer_comparison(components, peer_data)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "peer_comparison", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/fsfvi/performance-gaps/track-closure
///
/// Track gap closure progress over time (baseline vs current).
/// CRITICAL for government accountability and progress monitoring.
///
/// **Required Permission:** RunPerformanceGapAnalysis
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/performance-gaps/track-closure",
    tag = "Performance Gap Analysis",
    request_body = GapClosureApiRequest,
    responses(
        (status = 200, description = "Gap closure tracking completed"),
        (status = 400, description = "Invalid request - component mismatch"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn track_gap_closure(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<GapClosureApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let auth_ctx = crate::fsfvi_api::auth_extract::extract_auth_context(&req)?;
    let user_id = auth_ctx.user_id;

    if let Some(claims) = req.extensions().get::<Claims>() {
        require_permission!(claims, FsfviPermission::RunPerformanceGapAnalysis);
    }

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let baseline_components: Vec<crate::fsfvi::validators::Component> = payload
        .baseline_components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let current_components: Vec<crate::fsfvi::validators::Component> = payload
        .current_components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let report = state
        .fsfvi_service
        .performance_gap
        .track_gap_closure(baseline_components, current_components, payload.time_period_months)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "track_gap_closure", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/fsfvi/performance-gaps/recommend-targets
///
/// Generate realistic improvement targets based on current gaps and peer benchmarks.
/// ESSENTIAL for national planning and international commitments.
///
/// **Required Permission:** RunPerformanceGapAnalysis
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/performance-gaps/recommend-targets",
    tag = "Performance Gap Analysis",
    request_body = TargetRecommendationApiRequest,
    responses(
        (status = 200, description = "Target recommendations generated"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn recommend_targets(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<TargetRecommendationApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let auth_ctx = crate::fsfvi_api::auth_extract::extract_auth_context(&req)?;
    let user_id = auth_ctx.user_id;

    if let Some(claims) = req.extensions().get::<Claims>() {
        require_permission!(claims, FsfviPermission::RunPerformanceGapAnalysis);
    }

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let components: Vec<crate::fsfvi::validators::Component> = payload
        .components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let peer_data = payload.peer_countries.as_ref().map(|peers| {
        peers.iter().map(|p| crate::fsfvi::service::PeerCountryData {
            country_name: p.country_name.clone(),
            component_values: p.component_values.clone(),
        }).collect()
    });

    let report = state
        .fsfvi_service
        .performance_gap
        .recommend_targets(components, payload.target_timeline_months, peer_data)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "recommend_targets", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

// ============================================================================
// Sensitivity Analysis Handlers
// ============================================================================

/// POST /api/v1/fsfvi/sensitivity/analyze
///
/// Run sensitivity analysis to test robustness.
///
/// **Required Permission:** RunSensitivityAnalysis
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/sensitivity/analyze",
    tag = "Sensitivity Analysis",
    request_body = SensitivityAnalysisApiRequest,
    responses(
        (status = 200, description = "Analysis completed"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn run_sensitivity_analysis(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<SensitivityAnalysisApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::RunSensitivityAnalysis);

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let components: Vec<crate::fsfvi::validators::Component> = payload
        .components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let result = match payload.analysis_type {
        SensitivityAnalysisType::Weight => {
            let perturbations = payload.perturbation_levels.clone().unwrap_or_else(|| vec![0.05, 0.10, 0.20]);
            let report = state
                .fsfvi_service
                .sensitivity
                .analyze_weight_sensitivity(components, perturbations)
                .map_err(|e| AppError::InternalError(e.to_string()))?;
            serde_json::to_value(report).unwrap()
        }
        SensitivityAnalysisType::Parameter => {
            let perturbations = payload.perturbation_levels.clone().unwrap_or_else(|| vec![0.10, 0.20, 0.50]);
            let report = state
                .fsfvi_service
                .sensitivity
                .analyze_parameter_sensitivity(components, perturbations)
                .map_err(|e| AppError::InternalError(e.to_string()))?;
            serde_json::to_value(report).unwrap()
        }
        SensitivityAnalysisType::Benchmark => {
            let perturbations = payload.perturbation_levels.clone().unwrap_or_else(|| vec![0.05, 0.10, 0.15]);
            let report = state
                .fsfvi_service
                .sensitivity
                .analyze_benchmark_sensitivity(components, perturbations)
                .map_err(|e| AppError::InternalError(e.to_string()))?;
            serde_json::to_value(report).unwrap()
        }
        SensitivityAnalysisType::Scenario => {
            let report = state
                .fsfvi_service
                .sensitivity
                .analyze_scenario_robustness(components)
                .map_err(|e| AppError::InternalError(e.to_string()))?;
            serde_json::to_value(report).unwrap()
        }
        SensitivityAnalysisType::MonteCarlo => {
            let num_sims = payload.num_simulations.unwrap_or(1000);
            let uncertainty = 0.10; // 10% uncertainty
            let report = state
                .fsfvi_service
                .sensitivity
                .monte_carlo_sensitivity(components, num_sims, uncertainty)
                .map_err(|e| AppError::InternalError(e.to_string()))?;
            serde_json::to_value(report).unwrap()
        }
    };

    log_fsfvi_operation(&state.db_pool, user_id, "sensitivity_analysis", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(result, user_id, processing_time)))
}

// ============================================================================
// Matrix Generation Handlers
// ============================================================================

/// GET /api/v1/fsfvi/matrices/ahp
///
/// Generate AHP (expert) pairwise comparison matrix for transparency.
/// Allows governments to view and understand expert weighting methodology.
///
/// **Required Permission:** ViewMatrices
#[utoipa::path(
    get,
    path = "/api/v1/fsfvi/matrices/ahp",
    tag = "Matrix Generation",
    responses(
        (status = 200, description = "AHP matrix generated"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn generate_ahp_matrix(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::ViewMatrices);

    let matrix = state
        .fsfvi_service
        .matrix
        .generate_ahp_matrix()
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "generate_ahp_matrix", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(matrix, user_id, processing_time)))
}

/// GET /api/v1/fsfvi/matrices/network
///
/// Generate network dependency matrix showing component interdependencies.
///
/// **Required Permission:** ViewMatrices
#[utoipa::path(
    get,
    path = "/api/v1/fsfvi/matrices/network",
    tag = "Matrix Generation",
    responses(
        (status = 200, description = "Network matrix generated"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn generate_network_matrix(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::ViewMatrices);

    let matrix = state
        .fsfvi_service
        .matrix
        .generate_network_matrix()
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "generate_network_matrix", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(matrix, user_id, processing_time)))
}

/// POST /api/v1/fsfvi/matrices/ahp/customize
///
/// Customize AHP matrix with government's own expert judgments.
/// Validates consistency and returns warnings if needed.
///
/// **Required Permission:** CustomizeMatrices
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/matrices/ahp/customize",
    tag = "Matrix Generation",
    request_body = CustomAhpMatrixRequest,
    responses(
        (status = 200, description = "Custom matrix created"),
        (status = 400, description = "Invalid matrix or poor consistency"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn customize_ahp_matrix(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<CustomAhpMatrixRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::CustomizeMatrices);

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    // Convert API comparisons to service comparisons
    let comparisons: Vec<crate::fsfvi::service::matrix_generation::PairwiseComparison> = payload
        .pairwise_comparisons
        .iter()
        .map(|c| crate::fsfvi::service::matrix_generation::PairwiseComparison {
            component_a: c.component_a.clone(),
            component_b: c.component_b.clone(),
            value: c.value,
        })
        .collect();

    let result = state
        .fsfvi_service
        .matrix
        .customize_ahp_matrix(comparisons)
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "customize_ahp_matrix", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(result, user_id, processing_time)))
}

/// GET /api/v1/fsfvi/matrices/export
///
/// Export AHP and network matrices to CSV format.
///
/// **Required Permission:** ViewMatrices
#[utoipa::path(
    get,
    path = "/api/v1/fsfvi/matrices/export",
    tag = "Matrix Generation",
    responses(
        (status = 200, description = "Matrices exported to CSV"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn export_matrices_csv(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::ViewMatrices);

    let export = state
        .fsfvi_service
        .matrix
        .export_matrices_csv()
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "export_matrices", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(export, user_id, processing_time)))
}

// ============================================================================
// Scenario Simulation Handlers
// ============================================================================

/// POST /api/v1/fsfvi/scenarios/compare
///
/// Compare multiple scenarios (normal, climate shock, pandemic, etc.).
///
/// **Required Permission:** RunScenarioSimulation
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/scenarios/compare",
    tag = "Scenario Simulation",
    request_body = ScenarioComparisonApiRequest,
    responses(
        (status = 200, description = "Scenario comparison completed"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn compare_scenarios(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<ScenarioComparisonApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::RunScenarioSimulation);

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let components: Vec<crate::fsfvi::validators::Component> = payload
        .components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let report = state
        .fsfvi_service
        .scenario
        .compare_scenarios(components, payload.scenarios.clone())
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "compare_scenarios", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/fsfvi/scenarios/crisis
///
/// Simulate specific crisis impact (drought, pandemic, conflict, etc.).
///
/// **Required Permission:** RunScenarioSimulation
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/scenarios/crisis",
    tag = "Scenario Simulation",
    request_body = CrisisSimulationApiRequest,
    responses(
        (status = 200, description = "Crisis simulation completed"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn simulate_crisis(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<CrisisSimulationApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::RunScenarioSimulation);

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let components: Vec<crate::fsfvi::validators::Component> = payload
        .components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let report = state
        .fsfvi_service
        .scenario
        .simulate_crisis(components, payload.crisis_type, payload.intensity)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "simulate_crisis", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/fsfvi/scenarios/budget-change
///
/// Simulate impact of budget changes on vulnerability.
///
/// **Required Permission:** RunScenarioSimulation
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/scenarios/budget-change",
    tag = "Scenario Simulation",
    request_body = BudgetChangeSimulationApiRequest,
    responses(
        (status = 200, description = "Budget change simulation completed"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn simulate_budget_changes(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<BudgetChangeSimulationApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::RunScenarioSimulation);

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let components: Vec<crate::fsfvi::validators::Component> = payload
        .components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    // Convert API budget changes to service budget changes
    let budget_changes: Vec<crate::fsfvi::service::scenario_simulation::BudgetChange> = payload
        .budget_changes
        .iter()
        .map(|bc| crate::fsfvi::service::scenario_simulation::BudgetChange {
            component_type: bc.component_type.clone(),
            amount: bc.amount_usd,
            change_type: bc.change_type,
        })
        .collect();

    let report = state
        .fsfvi_service
        .scenario
        .simulate_budget_changes(components, budget_changes)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "simulate_budget_changes", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/fsfvi/scenarios/intervention
///
/// Simulate impact of policy interventions on component performance.
///
/// **Required Permission:** RunScenarioSimulation
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/scenarios/intervention",
    tag = "Scenario Simulation",
    request_body = InterventionSimulationApiRequest,
    responses(
        (status = 200, description = "Intervention simulation completed"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn simulate_intervention(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<InterventionSimulationApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::RunScenarioSimulation);

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let components: Vec<crate::fsfvi::validators::Component> = payload
        .components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    // Convert API interventions to service interventions
    let interventions: Vec<crate::fsfvi::service::scenario_simulation::Intervention> = payload
        .interventions
        .iter()
        .map(|iv| crate::fsfvi::service::scenario_simulation::Intervention {
            component_type: iv.component_type.clone(),
            description: iv.description.clone(),
            expected_improvement_percent: iv.expected_improvement_percent,
            estimated_cost: iv.estimated_cost_usd,
        })
        .collect();

    let report = state
        .fsfvi_service
        .scenario
        .simulate_intervention(components, interventions)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "simulate_intervention", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

// ============================================================================
// Decision Support Handlers
// ============================================================================

/// POST /api/v1/fsfvi/decision-support/policy-recommendations
///
/// Generate comprehensive policy recommendations based on FSFVI analysis.
///
/// **Required Permission:** GeneratePolicyRecommendations
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/decision-support/policy-recommendations",
    tag = "Decision Support",
    request_body = PolicyRecommendationApiRequest,
    responses(
        (status = 200, description = "Policy recommendations generated"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn generate_policy_recommendations(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<PolicyRecommendationApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::GeneratePolicyRecommendations);

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let components: Vec<crate::fsfvi::validators::Component> = payload
        .components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let request = crate::fsfvi::service::decision_support::PolicyRecommendationRequest {
        components,
        country_name: payload.country_name.clone(),
        currency: Some("USD".to_string()),
        planning_horizon_months: payload.planning_horizon_months,
        include_budget_optimization: payload.include_budget_optimization,
        include_sensitivity_analysis: payload.include_sensitivity_analysis,
    };

    let report = state
        .fsfvi_service
        .decision_support
        .generate_policy_recommendations(request)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "policy_recommendations", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/fsfvi/decision-support/crisis-response
///
/// Generate emergency crisis response recommendations.
///
/// **Required Permission:** GenerateCrisisResponse
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/decision-support/crisis-response",
    tag = "Decision Support",
    request_body = CrisisResponseApiRequest,
    responses(
        (status = 200, description = "Crisis response plan generated"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn generate_crisis_response(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<CrisisResponseApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::GenerateCrisisResponse);

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let components: Vec<crate::fsfvi::validators::Component> = payload
        .components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let report = state
        .fsfvi_service
        .decision_support
        .generate_crisis_response(
            components,
            payload.crisis_scenario,
            payload.available_emergency_budget_usd,
        )
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "crisis_response", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/fsfvi/decision-support/track-progress
///
/// Track progress over time by comparing baseline to current state.
///
/// **Required Permission:** ViewProgressTracking
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/decision-support/track-progress",
    tag = "Decision Support",
    request_body = ProgressTrackingApiRequest,
    responses(
        (status = 200, description = "Progress tracking completed"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn track_progress(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<ProgressTrackingApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::ViewProgressTracking);

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let baseline_components: Vec<crate::fsfvi::validators::Component> = payload
        .baseline_components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let current_components: Vec<crate::fsfvi::validators::Component> = payload
        .current_components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let report = state
        .fsfvi_service
        .decision_support
        .track_progress(
            baseline_components,
            current_components,
            payload.time_period_months,
        )
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "track_progress", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

/// POST /api/v1/fsfvi/decision-support/stakeholder-brief
///
/// Generate communication brief for different stakeholder audiences.
///
/// **Required Permission:** GenerateStakeholderBrief
#[utoipa::path(
    post,
    path = "/api/v1/fsfvi/decision-support/stakeholder-brief",
    tag = "Decision Support",
    request_body = StakeholderBriefApiRequest,
    responses(
        (status = 200, description = "Stakeholder brief generated"),
    ),
    security(
        ("jwt_auth" = []),
        ("api_key" = [])
    )
)]
pub async fn generate_stakeholder_brief(
    req: HttpRequest,
    state: web::Data<FsfviApiState>,
    payload: web::Json<StakeholderBriefApiRequest>,
) -> Result<HttpResponse, AppError> {
    let start = Instant::now();

    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| AppError::AuthenticationError("Missing authentication".to_string()))?;


    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::AuthenticationError("Invalid user ID".to_string()))?;

    require_permission!(claims, FsfviPermission::GenerateStakeholderBrief);

    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let components: Vec<crate::fsfvi::validators::Component> = payload
        .components
        .iter()
        .cloned()
        .map(|c| c.into())
        .collect();

    let report = state
        .fsfvi_service
        .decision_support
        .generate_stakeholder_brief(components, payload.audience)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    log_fsfvi_operation(&state.db_pool, user_id, "stakeholder_brief", "success").await?;

    let processing_time = start.elapsed().as_millis() as u64;
    Ok(HttpResponse::Ok().json(ApiResponse::new(report, user_id, processing_time)))
}

// ============================================================================
// Helper Functions
// ============================================================================

async fn log_fsfvi_operation(
    pool: &PgPool,
    user_id: uuid::Uuid,
    operation: &str,
    status: &str,
) -> Result<(), AppError> {
    log_fsfvi_operation_with_metadata(pool, user_id, operation, status, None).await
}

/// Log FSFVI operation with optional audit metadata
async fn log_fsfvi_operation_with_metadata(
    pool: &PgPool,
    user_id: uuid::Uuid,
    operation: &str,
    status: &str,
    metadata: Option<serde_json::Value>,
) -> Result<(), AppError> {
    sqlx::query!(
        r#"
        INSERT INTO fsfvi_operation_logs (user_id, operation, status, created_at, request_metadata)
        VALUES ($1, $2, $3, NOW(), $4)
        "#,
        user_id,
        operation,
        status,
        metadata
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::InternalError(format!("Failed to log operation: {}", e)))?;

    Ok(())
}
