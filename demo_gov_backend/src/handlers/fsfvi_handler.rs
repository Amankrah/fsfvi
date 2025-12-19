/// FSFVI Handler
/// ==============
/// Government API endpoints for frontend application
/// These endpoints fetch validated data from the database and call FSFVI services
///
/// CRITICAL: This is a government-level system where livelihoods depend on accurate data
/// All endpoints must validate input, handle errors gracefully, and audit operations

use actix_web::{web, HttpRequest, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::middleware::security::extract_user_from_token;
use crate::services::fsfvi_service::{
    AssessmentService, BudgetOptimizationService, DecisionSupportService, FsfviClient,
    FsfviServiceError, MatrixGenerationService, PerformanceGapService,
    ScenarioSimulationService, SensitivityAnalysisService, StrategicPlanningService,
    WeightingAnalysisService, DataFetcher,
};

// ============================================================================
// Application State
// ============================================================================

pub struct FsfviAppState {
    pub db_pool: SqlitePool,
    // CRITICAL: Store client for health checks and monitoring of backend FSFVI API connectivity
    // Government systems must monitor external dependencies to ensure service availability
    pub fsfvi_client: Arc<FsfviClient>,
    // All FSFVI operations go through the specialized service instances below
    pub performance_gap_service: Arc<PerformanceGapService>,
    pub assessment_service: Arc<AssessmentService>,
    pub strategic_planning_service: Arc<StrategicPlanningService>,
    pub budget_optimization_service: Arc<BudgetOptimizationService>,
    pub weighting_analysis_service: Arc<WeightingAnalysisService>,
    pub sensitivity_analysis_service: Arc<SensitivityAnalysisService>,
    pub scenario_simulation_service: Arc<ScenarioSimulationService>,
    pub decision_support_service: Arc<DecisionSupportService>,
    pub matrix_generation_service: Arc<MatrixGenerationService>,
}

impl FsfviAppState {
    pub fn new(db_pool: SqlitePool, api_url: String, api_key: Option<String>) -> Self {
        // CRITICAL: In production, API key should be required
        // For development/testing, we use a placeholder if not provided
        let api_key_value = api_key.unwrap_or_else(|| {
            log::warn!("No FSFVI API key provided - using development placeholder. This should NOT happen in production!");
            "development_key_replace_in_production".to_string()
        });

        let fsfvi_client = FsfviClient::new(api_url, api_key_value);

        Self {
            db_pool,
            fsfvi_client: Arc::new(fsfvi_client.clone()),
            performance_gap_service: Arc::new(PerformanceGapService::new(fsfvi_client.clone())),
            assessment_service: Arc::new(AssessmentService::new(fsfvi_client.clone())),
            strategic_planning_service: Arc::new(StrategicPlanningService::new(fsfvi_client.clone())),
            budget_optimization_service: Arc::new(BudgetOptimizationService::new(fsfvi_client.clone())),
            weighting_analysis_service: Arc::new(WeightingAnalysisService::new(fsfvi_client.clone())),
            sensitivity_analysis_service: Arc::new(SensitivityAnalysisService::new(fsfvi_client.clone())),
            scenario_simulation_service: Arc::new(ScenarioSimulationService::new(fsfvi_client.clone())),
            decision_support_service: Arc::new(DecisionSupportService::new(fsfvi_client.clone())),
            matrix_generation_service: Arc::new(MatrixGenerationService::new(fsfvi_client.clone())),
        }
    }
}

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct FiscalYearQuery {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct HistoricalTrendsQuery {
    #[serde(deserialize_with = "deserialize_fiscal_years")]
    pub fiscal_years: Vec<i32>,
    pub reporting_period: Option<String>,
}

fn deserialize_fiscal_years<'de, D>(deserializer: D) -> Result<Vec<i32>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: String = serde::Deserialize::deserialize(deserializer)?;
    s.split(',')
        .map(|year_str| year_str.trim().parse::<i32>().map_err(serde::de::Error::custom))
        .collect()
}

/// CRITICAL: Convert FSFVI service errors to HTTP responses with proper logging
/// Government systems must log all errors for accountability and debugging
fn handle_fsfvi_error(error: FsfviServiceError, context: &str) -> actix_web::Error {
    match &error {
        FsfviServiceError::ValidationError(msg) => {
            log::warn!("FSFVI Validation Error in {}: {}", context, msg);
            actix_web::error::ErrorBadRequest(format!("Validation error: {}", msg))
        }
        FsfviServiceError::ApiError { status, message } => {
            log::error!("FSFVI API Error in {} (HTTP {}): {}", context, status, message);
            actix_web::error::ErrorInternalServerError(format!(
                "Backend API error (status {}): {}",
                status, message
            ))
        }
        FsfviServiceError::NetworkError(msg) => {
            log::error!("FSFVI Network Error in {}: {}", context, msg);
            actix_web::error::ErrorServiceUnavailable(format!("Network error: {}", msg))
        }
        FsfviServiceError::ResponseParseError(msg) => {
            log::error!("FSFVI Response Parse Error in {}: {}", context, msg);
            actix_web::error::ErrorInternalServerError(format!("Response parse error: {}", msg))
        }
        FsfviServiceError::DatabaseError(msg) => {
            log::error!("FSFVI Database Error in {}: {}", context, msg);
            actix_web::error::ErrorInternalServerError(format!("Database error: {}", msg))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct PeerComparisonRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub peer_countries: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct GapClosureRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub target_period_months: usize,
}

#[derive(Debug, Deserialize)]
pub struct QuickCheckRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MultiYearPlanRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub planning_years: usize,
    pub target_fsfvi_reduction: f64,
    pub total_budget_ceiling: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct MtefRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub annual_budget_growth_percent: f64,
}

#[derive(Debug, Deserialize)]
pub struct OptimizationRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub objective: String, // "minimize_fsfvi", "maximize_efficiency", "balanced"
    pub total_budget_ceiling: Option<f64>,
    pub min_allocation_per_component: Option<f64>,
    pub max_change_percent: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct RoiAnalysisRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub scenarios: Vec<BudgetScenarioRequest>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct BudgetScenarioRequest {
    pub scenario_name: String,
    pub total_budget_usd: f64,
    pub allocations: std::collections::HashMap<String, f64>,
}

#[derive(Debug, Deserialize)]
pub struct ScenarioSensitivityRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub scenarios: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct FinancialWeightsRequest {
    pub fiscal_years: Vec<i32>,
    pub is_crisis: bool,
    pub include_efficiency_analysis: bool,
}

#[derive(Debug, Deserialize)]
pub struct SensitivityAnalysisRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub analysis_type: String, // "weight", "parameter", "benchmark", "scenario", "monte_carlo"
    pub perturbation_levels: Option<Vec<f64>>,
    pub num_simulations: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct ScenarioComparisonRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub scenarios: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct CrisisSimulationRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub crisis_type: String, // "drought", "flood", "pandemic", "economic_shock", "conflict", "supply_chain_disruption"
    pub intensity: String,   // "mild", "moderate", "severe", "catastrophic"
}

#[derive(Debug, Deserialize)]
pub struct BudgetChangeSimulationRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub budget_changes: Vec<BudgetChange>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct BudgetChange {
    pub component_type: String,
    pub amount_usd: f64,
    pub change_type: String, // "increase", "decrease", "reallocation"
}

#[derive(Debug, Deserialize)]
pub struct InterventionSimulationRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub interventions: Vec<Intervention>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Intervention {
    pub component_type: String,
    pub description: String,
    pub expected_improvement_percent: f64,
    pub estimated_cost_usd: f64,
}

#[derive(Debug, Deserialize)]
pub struct PolicyRecommendationRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub planning_horizon_months: usize,
    pub include_budget_optimization: bool,
    pub include_sensitivity_analysis: bool,
}

#[derive(Debug, Deserialize)]
pub struct CrisisResponseRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub crisis_scenario: String,
    pub available_emergency_budget_usd: f64,
}

#[derive(Debug, Deserialize)]
pub struct ProgressTrackingRequest {
    pub baseline_fiscal_year: i32,
    pub current_fiscal_year: i32,
    pub baseline_reporting_period: Option<String>,
    pub current_reporting_period: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StakeholderBriefRequest {
    pub fiscal_year: Option<i32>,
    pub reporting_period: Option<String>,
    pub audience: String, // "ministers", "parliament", "public", "donors_partners"
}

#[derive(Debug, Deserialize)]
pub struct CustomMatrixRequest {
    pub pairwise_comparisons: Vec<PairwiseComparison>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PairwiseComparison {
    pub component_a: String,
    pub component_b: String,
    pub value: f64,
}

// ============================================================================
// PERFORMANCE GAP ANALYSIS ENDPOINTS
// ============================================================================

/// GET /api/government/fsfvi/performance-gaps/analyze
/// Analyze performance gaps for current government data
pub async fn analyze_performance_gaps(
    req: HttpRequest,
    query: web::Query<FiscalYearQuery>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} analyzing performance gaps", user.username);

    // Fetch components from database
    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        query.fiscal_year,
        query.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| {
        log::error!("Failed to fetch components: {}", e);
        actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e))
    })?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found. Please ensure data is entered and validated in the system."
        })));
    }

    // Call FSFVI service with proper error handling for government accountability
    let result = state
        .performance_gap_service
        .analyze_performance_gaps(components)
        .await
        .map_err(|e| handle_fsfvi_error(e, "analyze_performance_gaps"))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/performance-gaps/peer-comparison
/// Compare performance with peer countries
pub async fn peer_comparison(
    req: HttpRequest,
    request: web::Json<PeerComparisonRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} requesting peer comparison with {:?}", user.username, request.peer_countries);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found for comparison"
        })));
    }

    // CRITICAL PRODUCTION FIX: Convert peer country names to PeerCountryData
    // In production, this must fetch actual component values from a peer database
    // For now, we create placeholder structures - THIS MUST BE REPLACED with real data
    let peer_countries_data: Vec<crate::services::fsfvi_service::models::PeerCountryData> = request
        .peer_countries
        .iter()
        .map(|country_name| {
            log::warn!("Creating empty peer data for {} - THIS IS A PLACEHOLDER. Production systems must load actual peer component values from database!", country_name);
            crate::services::fsfvi_service::models::PeerCountryData {
                country_name: country_name.clone(),
                // TODO PRODUCTION: Fetch actual component values from peer_country_data table
                component_values: std::collections::HashMap::new(),
            }
        })
        .collect();

    let result = state
        .performance_gap_service
        .peer_comparison(components, peer_countries_data)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Comparison failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/performance-gaps/track-gap-closure
/// Track progress in closing performance gaps
pub async fn track_gap_closure(
    req: HttpRequest,
    request: web::Json<GapClosureRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} tracking gap closure", user.username);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    // CRITICAL PRODUCTION FIX: track_gap_closure needs baseline AND current components
    // For single-period analysis, we use the same components as both baseline and current
    // Production systems should fetch historical baseline data from the database
    log::warn!("Using same components for baseline and current in gap closure tracking. Production systems should fetch historical baseline data!");

    let baseline_components = components.clone();
    let current_components = components;

    let result = state
        .performance_gap_service
        .track_gap_closure(baseline_components, current_components, request.target_period_months)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Tracking failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/performance-gaps/recommend-targets
/// Generate realistic improvement targets
pub async fn recommend_targets(
    req: HttpRequest,
    query: web::Query<FiscalYearQuery>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} requesting target recommendations", user.username);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        query.fiscal_year,
        query.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    // recommend_targets requires target_timeline_months and optional peer_countries
    // Using default 24 months (2 years) as a realistic planning horizon
    let target_timeline_months = 24;
    let peer_countries = None; // Production: could fetch from peer database if requested

    let result = state
        .performance_gap_service
        .recommend_targets(components, target_timeline_months, peer_countries)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Recommendation failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

// ============================================================================
// ASSESSMENT ENDPOINTS
// ============================================================================

/// POST /api/government/fsfvi/assessments/run
/// Run comprehensive FSFVI vulnerability assessment
pub async fn run_assessment(
    req: HttpRequest,
    query: web::Query<FiscalYearQuery>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} running FSFVI assessment", user.username);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        query.fiscal_year,
        query.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    // run_assessment requires country_name, weighting_method, and scenario (all optional)
    // Using defaults: no specific country, Hybrid weighting, NormalOperations scenario
    let country_name = Some(user.government_id.clone());
    let weighting_method = None; // Will use Hybrid (default)
    let scenario = None; // Will use NormalOperations (default)

    let result = state
        .assessment_service
        .run_assessment(components, country_name, weighting_method, scenario)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Assessment failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/assessments/quick-check
/// Quick vulnerability check
pub async fn quick_check(
    req: HttpRequest,
    query: web::Query<QuickCheckRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} running quick vulnerability check", user.username);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        query.fiscal_year,
        query.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    let result = state
        .assessment_service
        .quick_check(components)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Quick check failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

// ============================================================================
// STRATEGIC PLANNING ENDPOINTS
// ============================================================================

/// POST /api/government/fsfvi/strategic-planning/multi-year-plan
/// Generate multi-year strategic plan
pub async fn generate_multi_year_plan(
    req: HttpRequest,
    request: web::Json<MultiYearPlanRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} generating {}-year strategic plan", user.username, request.planning_years);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    // generate_multi_year_plan signature:
    // (components, country_name, planning_years, target_fsfvi, yearly_budget_constraints)
    let country_name = Some(user.government_id.clone());

    // Convert total_budget_ceiling to yearly_budget_constraints if provided
    let yearly_budget_constraints = request.total_budget_ceiling.map(|ceiling| {
        let mut constraints = std::collections::HashMap::new();
        // Apply the same ceiling to all years
        for year in 1..=request.planning_years {
            constraints.insert(
                year,
                crate::services::fsfvi_service::models::YearlyBudgetConstraint {
                    total_budget_ceiling_usd: ceiling,
                    min_allocation_per_component_usd: 0.0,
                    max_change_percent_from_previous: None,
                    priority_components: None,
                },
            );
        }
        constraints
    });

    let result = state
        .strategic_planning_service
        .generate_multi_year_plan(
            components,
            country_name,
            request.planning_years,
            request.target_fsfvi_reduction,
            yearly_budget_constraints,
        )
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Planning failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/strategic-planning/mtef
/// Generate Medium-Term Expenditure Framework
pub async fn generate_mtef(
    req: HttpRequest,
    request: web::Json<MtefRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} generating MTEF", user.username);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    // generate_mtef signature: (components, target_improvement_percent, yearly_budget_growth_rate)
    // Convert annual_budget_growth_percent to decimal (e.g., 5% -> 0.05)
    let yearly_budget_growth_rate = request.annual_budget_growth_percent / 100.0;

    // Default target: 20% improvement over 3 years (MTEF standard)
    let target_improvement_percent = 20.0;

    let result = state
        .strategic_planning_service
        .generate_mtef(components, target_improvement_percent, yearly_budget_growth_rate)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("MTEF generation failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// GET /api/government/fsfvi/strategic-planning/historical-trends?fiscal_years=2020,2021,2022
/// Fetch historical multi-year component data for trend analysis
/// CRITICAL: Helps government understand past performance trends when planning future strategies
pub async fn get_historical_trends(
    req: HttpRequest,
    query: web::Query<HistoricalTrendsQuery>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!(
        "User {} fetching historical trends for {} fiscal years",
        user.username,
        query.fiscal_years.len()
    );

    if query.fiscal_years.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "At least one fiscal year is required"
        })));
    }

    let trends = state
        .strategic_planning_service
        .fetch_historical_trends(
            &state.db_pool,
            &user.government_id,
            query.fiscal_years.clone(),
            query.reporting_period.as_deref(),
        )
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch historical trends: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": {
            "fiscal_years": query.fiscal_years,
            "trends": trends,
            "count": trends.len()
        }
    })))
}

// ============================================================================
// BUDGET OPTIMIZATION ENDPOINTS
// ============================================================================

/// POST /api/government/fsfvi/budget-optimization/analyze-efficiency
/// Analyze current budget allocation efficiency
pub async fn analyze_allocation_efficiency(
    req: HttpRequest,
    query: web::Query<FiscalYearQuery>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} analyzing allocation efficiency", user.username);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        query.fiscal_year,
        query.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    let result = state
        .budget_optimization_service
        .analyze_allocation_efficiency(components)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Analysis failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/budget-optimization/generate-plan
/// Generate budget reallocation plan
pub async fn generate_reallocation_plan(
    req: HttpRequest,
    request: web::Json<OptimizationRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} generating reallocation plan", user.username);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    // Build constraints
    let constraints = if request.total_budget_ceiling.is_some()
        || request.min_allocation_per_component.is_some()
        || request.max_change_percent.is_some()
    {
        Some(crate::services::fsfvi_service::budget_optimization::OptimizationConstraints {
            total_budget_ceiling: request.total_budget_ceiling,
            min_allocation_per_component: request.min_allocation_per_component,
            max_change_percent: request.max_change_percent,
            priority_components: None,
        })
    } else {
        None
    };

    let result = state
        .budget_optimization_service
        .generate_reallocation_plan(components, constraints)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Planning failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/budget-optimization/calculate-roi
/// Calculate return on investment for budget scenarios
pub async fn calculate_roi(
    req: HttpRequest,
    request: web::Json<RoiAnalysisRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} calculating ROI for {} scenarios", user.username, request.scenarios.len());

    // Fetch baseline components from database
    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found for baseline"
        })));
    }

    if request.scenarios.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "At least one scenario is required for ROI analysis"
        })));
    }

    // Convert request scenarios to service BudgetScenario format
    use crate::services::fsfvi_service::budget_optimization::BudgetScenario;
    let scenarios: Vec<BudgetScenario> = request
        .scenarios
        .iter()
        .map(|s| BudgetScenario {
            scenario_name: s.scenario_name.clone(),
            component_allocations: s.allocations.clone(),
        })
        .collect();

    let result = state
        .budget_optimization_service
        .calculate_roi(components, scenarios)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("ROI calculation failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/budget-optimization/optimize
/// Optimize budget allocation using Linear Programming
pub async fn optimize_allocation(
    req: HttpRequest,
    request: web::Json<OptimizationRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} optimizing budget allocation with objective: {}", user.username, request.objective);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    // Parse objective
    let objective = match request.objective.as_str() {
        "minimize_fsfvi" => crate::services::fsfvi_service::budget_optimization::OptimizationObjective::MinimizeFsfvi,
        "maximize_efficiency" => crate::services::fsfvi_service::budget_optimization::OptimizationObjective::MaximizeEfficiency,
        "balanced" => crate::services::fsfvi_service::budget_optimization::OptimizationObjective::Balanced,
        _ => return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "Invalid objective. Use: minimize_fsfvi, maximize_efficiency, or balanced"
        }))),
    };

    // Build constraints
    let constraints = if request.total_budget_ceiling.is_some()
        || request.min_allocation_per_component.is_some()
        || request.max_change_percent.is_some()
    {
        Some(crate::services::fsfvi_service::budget_optimization::OptimizationConstraints {
            total_budget_ceiling: request.total_budget_ceiling,
            min_allocation_per_component: request.min_allocation_per_component,
            max_change_percent: request.max_change_percent,
            priority_components: None,
        })
    } else {
        None
    };

    let result = state
        .budget_optimization_service
        .optimize_allocation(components, objective, constraints)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Optimization failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

// ============================================================================
// WEIGHTING ANALYSIS ENDPOINTS
// ============================================================================

/// POST /api/government/fsfvi/weighting-analysis/scenario-sensitivity-hybrid
/// Analyze how hybrid weights change across scenarios
pub async fn analyze_scenario_sensitivity_hybrid(
    req: HttpRequest,
    request: web::Json<ScenarioSensitivityRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} analyzing scenario sensitivity (hybrid)", user.username);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    let result = state
        .weighting_analysis_service
        .analyze_scenario_sensitivity_hybrid(components, request.scenarios.clone())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Analysis failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/weighting-analysis/scenario-sensitivity-expert
/// Analyze how expert weights (AHP) change across scenarios
pub async fn analyze_scenario_sensitivity_expert(
    req: HttpRequest,
    request: web::Json<ScenarioSensitivityRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} analyzing scenario sensitivity (expert/AHP)", user.username);

    let result = state
        .weighting_analysis_service
        .analyze_scenario_sensitivity_expert(request.scenarios.clone())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Analysis failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/weighting-analysis/financial
/// Analyze financial weights across different budget scenarios
pub async fn analyze_financial_weights(
    req: HttpRequest,
    request: web::Json<FinancialWeightsRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} analyzing financial weights for {} fiscal years", user.username, request.fiscal_years.len());

    // Fetch components for multiple fiscal years
    let mut component_scenarios = Vec::new();
    for fy in &request.fiscal_years {
        let components = DataFetcher::fetch_components(
            &state.db_pool,
            &user.government_id,
            Some(*fy),
            None,
        )
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data for FY {}: {}", fy, e)))?;

        if !components.is_empty() {
            component_scenarios.push(components);
        }
    }

    if component_scenarios.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found for the specified fiscal years"
        })));
    }

    let scenario_names = Some(request.fiscal_years.iter().map(|fy| format!("FY{}", fy)).collect());

    let result = state
        .weighting_analysis_service
        .analyze_financial_weights(
            component_scenarios,
            scenario_names,
            request.is_crisis,
            request.include_efficiency_analysis,
        )
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Analysis failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// GET /api/government/fsfvi/weighting-analysis/available-scenarios
/// Get list of available scenarios for analysis
pub async fn get_available_scenarios(
    req: HttpRequest,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let _user = extract_user_from_token(&req)?;

    let result = state
        .weighting_analysis_service
        .get_available_scenarios()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch scenarios: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

// ============================================================================
// SENSITIVITY ANALYSIS ENDPOINTS
// ============================================================================

/// POST /api/government/fsfvi/sensitivity-analysis/run
/// Run comprehensive sensitivity analysis
pub async fn run_sensitivity_analysis(
    req: HttpRequest,
    request: web::Json<SensitivityAnalysisRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} running {} sensitivity analysis", user.username, request.analysis_type);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    // Parse analysis type
    let analysis_type = match request.analysis_type.as_str() {
        "weight" => crate::services::fsfvi_service::sensitivity_analysis::SensitivityAnalysisType::Weight,
        "parameter" => crate::services::fsfvi_service::sensitivity_analysis::SensitivityAnalysisType::Parameter,
        "benchmark" => crate::services::fsfvi_service::sensitivity_analysis::SensitivityAnalysisType::Benchmark,
        "scenario" => crate::services::fsfvi_service::sensitivity_analysis::SensitivityAnalysisType::Scenario,
        "monte_carlo" => crate::services::fsfvi_service::sensitivity_analysis::SensitivityAnalysisType::MonteCarlo,
        _ => return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "Invalid analysis_type. Use: weight, parameter, benchmark, scenario, or monte_carlo"
        }))),
    };

    let result = state
        .sensitivity_analysis_service
        .run_sensitivity_analysis(
            components,
            analysis_type,
            request.perturbation_levels.clone(),
            request.num_simulations,
        )
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Analysis failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

// ============================================================================
// SCENARIO SIMULATION ENDPOINTS
// ============================================================================

/// POST /api/government/fsfvi/scenarios/compare
/// Compare multiple scenarios
pub async fn compare_scenarios(
    req: HttpRequest,
    request: web::Json<ScenarioComparisonRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} comparing {} scenarios", user.username, request.scenarios.len());

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    let result = state
        .scenario_simulation_service
        .compare_scenarios(components, request.scenarios.clone())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Comparison failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/scenarios/crisis
/// Simulate specific crisis impact
pub async fn simulate_crisis(
    req: HttpRequest,
    request: web::Json<CrisisSimulationRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} simulating {} crisis ({} intensity)", user.username, request.crisis_type, request.intensity);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    // Parse crisis type
    let crisis_type = match request.crisis_type.as_str() {
        "drought" => crate::services::fsfvi_service::scenario_simulation::CrisisType::Drought,
        "flood" => crate::services::fsfvi_service::scenario_simulation::CrisisType::Flood,
        "pandemic" => crate::services::fsfvi_service::scenario_simulation::CrisisType::Pandemic,
        "economic_shock" => crate::services::fsfvi_service::scenario_simulation::CrisisType::EconomicShock,
        "conflict" => crate::services::fsfvi_service::scenario_simulation::CrisisType::Conflict,
        "supply_chain_disruption" => crate::services::fsfvi_service::scenario_simulation::CrisisType::SupplyChainDisruption,
        _ => return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "Invalid crisis_type"
        }))),
    };

    // Parse intensity
    let intensity = match request.intensity.as_str() {
        "mild" => crate::services::fsfvi_service::scenario_simulation::CrisisIntensity::Mild,
        "moderate" => crate::services::fsfvi_service::scenario_simulation::CrisisIntensity::Moderate,
        "severe" => crate::services::fsfvi_service::scenario_simulation::CrisisIntensity::Severe,
        "catastrophic" => crate::services::fsfvi_service::scenario_simulation::CrisisIntensity::Catastrophic,
        _ => return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "Invalid intensity"
        }))),
    };

    let result = state
        .scenario_simulation_service
        .simulate_crisis(components, crisis_type, intensity)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Simulation failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/scenarios/budget-change
/// Simulate impact of budget changes
pub async fn simulate_budget_changes(
    req: HttpRequest,
    request: web::Json<BudgetChangeSimulationRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} simulating {} budget changes", user.username, request.budget_changes.len());

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    // Convert budget changes
    let budget_changes: Vec<crate::services::fsfvi_service::scenario_simulation::BudgetChange> = request
        .budget_changes
        .iter()
        .map(|bc| {
            let change_type = match bc.change_type.as_str() {
                "increase" => crate::services::fsfvi_service::scenario_simulation::ChangeType::Increase,
                "decrease" => crate::services::fsfvi_service::scenario_simulation::ChangeType::Decrease,
                "reallocation" => crate::services::fsfvi_service::scenario_simulation::ChangeType::Reallocation,
                _ => crate::services::fsfvi_service::scenario_simulation::ChangeType::Increase,
            };
            crate::services::fsfvi_service::scenario_simulation::BudgetChange {
                component_type: bc.component_type.clone(),
                amount_usd: bc.amount_usd,
                change_type,
            }
        })
        .collect();

    let result = state
        .scenario_simulation_service
        .simulate_budget_changes(components, budget_changes)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Simulation failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/scenarios/intervention
/// Simulate impact of policy interventions
pub async fn simulate_intervention(
    req: HttpRequest,
    request: web::Json<InterventionSimulationRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} simulating {} interventions", user.username, request.interventions.len());

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    // Convert interventions
    let interventions: Vec<crate::services::fsfvi_service::scenario_simulation::Intervention> = request
        .interventions
        .iter()
        .map(|i| crate::services::fsfvi_service::scenario_simulation::Intervention {
            component_type: i.component_type.clone(),
            description: i.description.clone(),
            expected_improvement_percent: i.expected_improvement_percent,
            estimated_cost_usd: i.estimated_cost_usd,
        })
        .collect();

    let result = state
        .scenario_simulation_service
        .simulate_intervention(components, interventions)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Simulation failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

// ============================================================================
// DECISION SUPPORT ENDPOINTS
// ============================================================================

/// POST /api/government/fsfvi/decision-support/policy-recommendations
/// Generate comprehensive policy recommendations
pub async fn generate_policy_recommendations(
    req: HttpRequest,
    request: web::Json<PolicyRecommendationRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} generating policy recommendations", user.username);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    let result = state
        .decision_support_service
        .generate_policy_recommendations(
            components,
            Some(user.government_id.clone()),
            request.planning_horizon_months,
            request.include_budget_optimization,
            request.include_sensitivity_analysis,
        )
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Generation failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/decision-support/crisis-response
/// Generate emergency crisis response recommendations
pub async fn generate_crisis_response(
    req: HttpRequest,
    request: web::Json<CrisisResponseRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} generating crisis response for {}", user.username, request.crisis_scenario);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    // Parse crisis scenario
    let crisis_scenario = match request.crisis_scenario.as_str() {
        "normal_operations" => crate::services::fsfvi_service::decision_support::CrisisScenario::NormalOperations,
        "climate_shock" => crate::services::fsfvi_service::decision_support::CrisisScenario::ClimateShock,
        "pandemic_disruption" => crate::services::fsfvi_service::decision_support::CrisisScenario::PandemicDisruption,
        "political_instability" => crate::services::fsfvi_service::decision_support::CrisisScenario::PoliticalInstability,
        "financial_crisis" => crate::services::fsfvi_service::decision_support::CrisisScenario::FinancialCrisis,
        _ => return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "Invalid crisis_scenario"
        }))),
    };

    let result = state
        .decision_support_service
        .generate_crisis_response(
            components,
            crisis_scenario,
            request.available_emergency_budget_usd,
        )
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Generation failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/decision-support/track-progress
/// Track progress over time
pub async fn track_progress(
    req: HttpRequest,
    request: web::Json<ProgressTrackingRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} tracking progress from FY{} to FY{}", user.username, request.baseline_fiscal_year, request.current_fiscal_year);

    let baseline_components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        Some(request.baseline_fiscal_year),
        request.baseline_reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch baseline data: {}", e)))?;

    let current_components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        Some(request.current_fiscal_year),
        request.current_reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch current data: {}", e)))?;

    if baseline_components.is_empty() || current_components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "Missing baseline or current data"
        })));
    }

    let time_period_months = ((request.current_fiscal_year - request.baseline_fiscal_year) * 12) as usize;

    let result = state
        .decision_support_service
        .track_progress(baseline_components, current_components, time_period_months)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Tracking failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/decision-support/stakeholder-brief
/// Generate stakeholder communication brief
pub async fn generate_stakeholder_brief(
    req: HttpRequest,
    request: web::Json<StakeholderBriefRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} generating stakeholder brief for {}", user.username, request.audience);

    let components = DataFetcher::fetch_components(
        &state.db_pool,
        &user.government_id,
        request.fiscal_year,
        request.reporting_period.as_deref(),
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch data: {}", e)))?;

    if components.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "No validated data found"
        })));
    }

    // Parse audience
    let audience = match request.audience.as_str() {
        "ministers" => crate::services::fsfvi_service::decision_support::StakeholderAudience::Ministers,
        "parliament" => crate::services::fsfvi_service::decision_support::StakeholderAudience::Parliament,
        "public" => crate::services::fsfvi_service::decision_support::StakeholderAudience::Public,
        "donors_partners" => crate::services::fsfvi_service::decision_support::StakeholderAudience::DonorsPartners,
        _ => return Ok(HttpResponse::BadRequest().json(json!({
            "success": false,
            "message": "Invalid audience. Use: ministers, parliament, public, or donors_partners"
        }))),
    };

    let result = state
        .decision_support_service
        .generate_stakeholder_brief(components, audience)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Generation failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

// ============================================================================
// MATRIX GENERATION ENDPOINTS
// ============================================================================

/// GET /api/government/fsfvi/matrices/ahp
/// Generate AHP (expert) pairwise comparison matrix
pub async fn generate_ahp_matrix(
    req: HttpRequest,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} generating AHP matrix", user.username);

    let result = state
        .matrix_generation_service
        .generate_ahp_matrix()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Generation failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// GET /api/government/fsfvi/matrices/network
/// Generate network dependency matrix
pub async fn generate_network_matrix(
    req: HttpRequest,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} generating network matrix", user.username);

    let result = state
        .matrix_generation_service
        .generate_network_matrix()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Generation failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// POST /api/government/fsfvi/matrices/ahp/customize
/// Customize AHP matrix with government's own expert judgments
pub async fn customize_ahp_matrix(
    req: HttpRequest,
    request: web::Json<CustomMatrixRequest>,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} customizing AHP matrix with {} comparisons", user.username, request.pairwise_comparisons.len());

    // Convert pairwise comparisons
    let pairwise_comparisons: Vec<crate::services::fsfvi_service::matrix_generation::PairwiseComparison> = request
        .pairwise_comparisons
        .iter()
        .map(|pc| crate::services::fsfvi_service::matrix_generation::PairwiseComparison {
            component_a: pc.component_a.clone(),
            component_b: pc.component_b.clone(),
            value: pc.value,
        })
        .collect();

    let result = state
        .matrix_generation_service
        .customize_ahp_matrix(pairwise_comparisons)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Customization failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

/// GET /api/government/fsfvi/matrices/export
/// Export matrices to CSV format
pub async fn export_matrices_csv(
    req: HttpRequest,
    state: web::Data<FsfviAppState>,
) -> Result<HttpResponse> {
    let user = extract_user_from_token(&req)?;
    log::info!("User {} exporting matrices to CSV", user.username);

    let result = state
        .matrix_generation_service
        .export_matrices_csv()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Export failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": result.data
    })))
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/// GET /api/government/fsfvi/health
/// Health check endpoint
/// CRITICAL: Monitors connectivity to backend FSFVI API to ensure government
/// officials can access food security vulnerability data when making decisions
pub async fn health_check(state: web::Data<FsfviAppState>) -> Result<HttpResponse> {
    // Check backend FSFVI API connectivity
    let backend_api_healthy = state.fsfvi_client.health_check().await;

    if backend_api_healthy {
        Ok(HttpResponse::Ok().json(json!({
            "success": true,
            "message": "FSFVI Government API is healthy",
            "version": "1.0.0",
            "backend_api_status": "connected"
        })))
    } else {
        log::error!("CRITICAL: Backend FSFVI API is not responding - government officials may not be able to access vulnerability data");
        Ok(HttpResponse::ServiceUnavailable().json(json!({
            "success": false,
            "message": "FSFVI Government API frontend is running, but backend API is unreachable",
            "version": "1.0.0",
            "backend_api_status": "disconnected",
            "error": "Cannot connect to backend FSFVI calculation engine"
        })))
    }
}
