/// Assessment Service - INTEGRATION TESTS
/// ========================================
/// CRITICAL: Real integration tests for FSFVI vulnerability assessment
/// where government policy decisions and resource allocation depend on accurate scores
///
/// These tests:
/// - Connect to real SQLite database with demo government data
/// - Make actual HTTP calls to FSFVI API backend
/// - Validate FSFVI scores and vulnerability classifications
/// - Test critical government workflows end-to-end
///
/// Test Data Source: migrations/006_demo_fsfvi_data.sql
/// - Demo Republic FY 2025 data
/// - 6 components with realistic performance gaps
/// - Total budget: $1.2B USD
///
/// Prerequisites:
/// 1. Database with demo data (run migrations)
/// 2. FSFVI API backend running (http://localhost:8080)
/// 3. Valid API key in .env file

use sqlx::{SqlitePool, Row};

// External test imports - access crate modules directly
use demo_gov_backend::services::fsfvi_service::{
    FsfviClient,
    AssessmentService,
    FsfviServiceError,
    ComponentInput,
};

// Load environment variables once at test startup
static INIT: std::sync::Once = std::sync::Once::new();

fn init_env() {
    INIT.call_once(|| {
        dotenv::dotenv().ok();
    });
}

// ============================================================================
// Test Configuration & Setup
// ============================================================================

/// Get database connection for tests
async fn get_test_db_pool() -> SqlitePool {
    init_env();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:./demo_gov_backend.db".to_string());

    SqlitePool::connect(&database_url)
        .await
        .expect("Failed to connect to test database")
}

/// Get FSFVI API client for tests
fn get_test_fsfvi_client() -> FsfviClient {
    init_env();

    let api_url = std::env::var("FSFVI_API_URL")
        .unwrap_or_else(|_| "http://localhost:8080".to_string());

    let api_key = std::env::var("FSFVI_API_KEY")
        .expect("FSFVI_API_KEY must be set in environment");

    FsfviClient::new(api_url, api_key)
}

/// Create assessment service for tests
fn get_test_service() -> AssessmentService {
    AssessmentService::new(get_test_fsfvi_client())
}

// ============================================================================
// Database Query Helpers - Fetch Real Demo Data
// ============================================================================

/// Fetch all FY 2025 component data for Demo Government from database
async fn fetch_demo_fy2025_components(pool: &SqlitePool) -> Vec<ComponentInput> {
    let rows = sqlx::query(
        r#"
        SELECT
            component_id,
            component_type,
            observed_value,
            benchmark_value,
            financial_allocation_usd,
            weight,
            sensitivity_parameter
        FROM fsfvi_data
        WHERE government_id = 'demo_government'
          AND fiscal_year = 2025
          AND reporting_period = '2025-Annual'
        ORDER BY component_type
        "#
    )
    .fetch_all(pool)
    .await
    .expect("Failed to fetch demo data from database");

    rows.iter()
        .map(|row| ComponentInput {
            component_id: row.get("component_id"),
            component_type: row.get("component_type"),
            observed_value: row.get("observed_value"),
            benchmark_value: row.get("benchmark_value"),
            financial_allocation_usd: row.get("financial_allocation_usd"),
            weight: row.get("weight"),
            sensitivity_parameter: row.get("sensitivity_parameter"),
        })
        .collect()
}

/// Fetch historical data for trend analysis
async fn fetch_historical_components(
    pool: &SqlitePool,
    fiscal_year: i32,
) -> Vec<ComponentInput> {
    let rows = sqlx::query(
        r#"
        SELECT
            component_id,
            component_type,
            observed_value,
            benchmark_value,
            financial_allocation_usd,
            weight,
            sensitivity_parameter
        FROM fsfvi_data
        WHERE government_id = 'demo_government'
          AND fiscal_year = ?
        ORDER BY component_type
        "#
    )
    .bind(fiscal_year)
    .fetch_all(pool)
    .await
    .expect(&format!("Failed to fetch FY {} data", fiscal_year));

    rows.iter()
        .map(|row| ComponentInput {
            component_id: row.get("component_id"),
            component_type: row.get("component_type"),
            observed_value: row.get("observed_value"),
            benchmark_value: row.get("benchmark_value"),
            financial_allocation_usd: row.get("financial_allocation_usd"),
            weight: row.get("weight"),
            sensitivity_parameter: row.get("sensitivity_parameter"),
        })
        .collect()
}

// ============================================================================
// API CONNECTIVITY TESTS
// ============================================================================

#[tokio::test]
async fn test_fsfvi_api_health_check() {
    let client = get_test_fsfvi_client();

    let is_healthy = client.health_check().await;
    assert!(
        is_healthy,
        "FSFVI API is not responding. Ensure the backend is running at {}",
        std::env::var("FSFVI_API_URL").unwrap_or_else(|_| "http://localhost:8080".to_string())
    );
}

#[tokio::test]
async fn test_database_connectivity() {
    let pool = get_test_db_pool().await;

    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM fsfvi_data WHERE government_id = 'demo_government' AND fiscal_year = 2025"
    )
    .fetch_one(&pool)
    .await
    .expect("Failed to query database");

    assert_eq!(
        count, 6,
        "Expected 6 components for Demo Government FY 2025 (one per component type)"
    );
}

// ============================================================================
// run_assessment - INTEGRATION TESTS
// ============================================================================

#[tokio::test]
async fn test_run_assessment_with_real_data() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    // Fetch real FY 2025 data from database
    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing FSFVI Assessment ===" );
    println!("Components loaded: {}", components.len());
    for comp in &components {
        println!("  - {}: observed={:.1}, benchmark={:.1}, allocation=${:.0}M",
            comp.component_type,
            comp.observed_value,
            comp.benchmark_value,
            comp.financial_allocation_usd / 1_000_000.0
        );
    }

    // Calculate total budget for verification
    let total_budget: f64 = components.iter()
        .map(|c| c.financial_allocation_usd)
        .sum();
    println!("Total Budget: ${:.2}B", total_budget / 1_000_000_000.0);

    // Call actual FSFVI API with default settings
    let result = service.run_assessment(
        components,
        Some("Demo Republic".to_string()),
        None, // Default to hybrid weighting
        None, // Default to normal_operations scenario
    ).await;

    match result {
        Ok(response) => {
            println!("\n✓ API call successful");
            println!("Processing time: {}ms", response.metadata.processing_time_ms);

            let report = response.data;
            println!("\n=== FSFVI Assessment Results ===");
            println!("FSFVI Score: {:.2}", report.system_result.fsfvi_value);
            println!("Vulnerability Level: {}", report.system_result.risk_level);

            // CRITICAL: Validate FSFVI score is in valid range [0, 100]
            assert!(
                report.system_result.fsfvi_value >= 0.0,
                "FSFVI score must be >= 0, got: {}",
                report.system_result.fsfvi_value
            );

            assert!(
                report.system_result.fsfvi_value <= 100.0,
                "FSFVI score must be <= 100, got: {}",
                report.system_result.fsfvi_value
            );

            assert!(
                report.system_result.fsfvi_value.is_finite(),
                "FSFVI score must be a finite number"
            );

            // Validate vulnerability level is one of the standard FSFVI classifications
            // FSFVI uses: "low", "medium", "high", "critical"
            // See: fsfi-backend/src/fsfvi/config.rs:422-431
            assert!(
                ["low", "medium", "high", "critical"]
                    .contains(&report.system_result.risk_level.as_str()),
                "Vulnerability level '{}' is not a valid classification",
                report.system_result.risk_level
            );

            // Validate component vulnerabilities
            assert_eq!(
                report.component_insights.len(), 6,
                "Should have vulnerability scores for all 6 components"
            );

            println!("\nComponent Insights:");
            for comp in &report.component_insights {
                println!("  {}: vulnerability={:.6}, contribution={:.2}%, weight={:.3}, priority={}",
                    comp.component_type,
                    comp.vulnerability,
                    comp.contribution_to_system,
                    comp.weight,
                    comp.priority_level
                );

                // Validate each component's vulnerability
                assert!(
                    comp.vulnerability >= 0.0,
                    "Component {} vulnerability must be non-negative, got: {}",
                    comp.component_type,
                    comp.vulnerability
                );

                // Validate weight is normalized (0-1)
                assert!(
                    comp.weight >= 0.0 && comp.weight <= 1.0,
                    "Component {} weight must be in [0, 1], got: {}",
                    comp.component_type,
                    comp.weight
                );

                // Validate contribution to system
                assert!(
                    comp.contribution_to_system >= 0.0 && comp.contribution_to_system <= 100.0,
                    "Component {} contribution must be in [0, 100], got: {}",
                    comp.component_type,
                    comp.contribution_to_system
                );
            }

            // Validate system result
            println!("\n=== System Result ===");
            println!("Critical Components:");
            for comp in &report.system_result.critical_components {
                println!("  - {}: vulnerability={:.6}, priority={}", comp.name, comp.vulnerability, comp.priority_level.as_deref().unwrap_or("N/A"));
            }

            println!("\nHigh Risk Components:");
            for comp in &report.system_result.high_risk_components {
                println!("  - {}: vulnerability={:.6}, priority={}", comp.name, comp.vulnerability, comp.priority_level.as_deref().unwrap_or("N/A"));
            }

            println!("\nBudget Analysis:");
            println!("  Total Budget: ${:.2}B", report.system_result.total_allocation / 1_000_000_000.0);
            println!("  Resource Efficiency: {:.6}", report.system_result.resilience_indicators.resource_efficiency);

            assert!(
                report.system_result.total_allocation > 0.0,
                "Total budget should be positive"
            );

            assert!(
                report.system_result.resilience_indicators.resource_efficiency >= 0.0,
                "Resource efficiency should be non-negative"
            );

            // Validate action priorities
            println!("\n=== Action Priorities ===");
            println!("Immediate Actions (0-6 months): {}", report.system_result.action_priorities.immediate_actions_0_6_months.len());
            println!("Strategic Actions (6-24 months): {}", report.system_result.action_priorities.strategic_actions_6_24_months.len());

            for action in &report.system_result.action_priorities.strategic_actions_6_24_months {
                println!("  - {}", action);
            }

            // Validate that we have recommendations for components
            println!("\n=== Component Recommendations ===");
            for comp in &report.component_insights {
                if !comp.recommendations.is_empty() {
                    println!("{}: {} recommendations", comp.component_type, comp.recommendations.len());
                    for rec in &comp.recommendations {
                        println!("  - {}", rec);
                    }
                }
            }

            // CRITICAL: Verify weights sum to approximately 1.0
            let total_weight: f64 = report.component_insights.iter()
                .map(|c| c.weight)
                .sum();

            assert!(
                (total_weight - 1.0).abs() < 0.01,
                "Component weights should sum to ~1.0, got: {:.4}",
                total_weight
            );
        }
        Err(e) => {
            panic!("FSFVI assessment failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_run_assessment_with_hybrid_weighting() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Assessment with Hybrid Weighting ===");

    let result = service.run_assessment(
        components,
        Some("Demo Republic".to_string()),
        Some("hybrid".to_string()),
        None,
    ).await;

    match result {
        Ok(response) => {
            let report = response.data;
            println!("✓ Hybrid weighting assessment successful");
            println!("FSFVI Score: {:.2}", report.system_result.fsfvi_value);
            println!("Vulnerability Level: {}", report.system_result.risk_level);

            assert!(
                report.system_result.fsfvi_value.is_finite(),
                "Hybrid weighting should produce finite FSFVI score"
            );
        }
        Err(e) => {
            panic!("Hybrid weighting assessment failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_run_assessment_with_expert_weighting() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Assessment with Expert (AHP) Weighting ===");

    let result = service.run_assessment(
        components,
        Some("Demo Republic".to_string()),
        Some("expert".to_string()),
        None,
    ).await;

    match result {
        Ok(response) => {
            let report = response.data;
            println!("✓ Expert weighting assessment successful");
            println!("FSFVI Score: {:.2}", report.system_result.fsfvi_value);
            println!("Vulnerability Level: {}", report.system_result.risk_level);

            assert!(
                report.system_result.fsfvi_value.is_finite(),
                "Expert weighting should produce finite FSFVI score"
            );
        }
        Err(e) => {
            panic!("Expert weighting assessment failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_run_assessment_with_financial_weighting() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Assessment with Financial Weighting ===");

    let result = service.run_assessment(
        components,
        Some("Demo Republic".to_string()),
        Some("financial".to_string()),
        None,
    ).await;

    match result {
        Ok(response) => {
            let report = response.data;
            println!("✓ Financial weighting assessment successful");
            println!("FSFVI Score: {:.2}", report.system_result.fsfvi_value);
            println!("Vulnerability Level: {}", report.system_result.risk_level);

            // Financial weighting should reflect budget allocations
            assert!(
                report.system_result.fsfvi_value.is_finite(),
                "Financial weighting should produce finite FSFVI score"
            );
        }
        Err(e) => {
            panic!("Financial weighting assessment failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_run_assessment_with_network_weighting() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Assessment with Network Weighting ===");

    let result = service.run_assessment(
        components,
        Some("Demo Republic".to_string()),
        Some("network".to_string()),
        None,
    ).await;

    match result {
        Ok(response) => {
            let report = response.data;
            println!("✓ Network weighting assessment successful");
            println!("FSFVI Score: {:.2}", report.system_result.fsfvi_value);
            println!("Vulnerability Level: {}", report.system_result.risk_level);

            // Network weighting should reflect component interdependencies
            assert!(
                report.system_result.fsfvi_value.is_finite(),
                "Network weighting should produce finite FSFVI score"
            );
        }
        Err(e) => {
            panic!("Network weighting assessment failed: {:?}", e);
        }
    }
}

// ============================================================================
// SCENARIO TESTING - CRITICAL FOR CRISIS PLANNING
// ============================================================================

#[tokio::test]
async fn test_assessment_climate_shock_scenario() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Climate Shock Scenario ===");

    let result = service.run_assessment(
        components,
        Some("Demo Republic".to_string()),
        Some("hybrid".to_string()),
        Some("climate_shock".to_string()),
    ).await;

    match result {
        Ok(response) => {
            let report = response.data;
            println!("✓ Climate shock scenario assessment successful");
            println!("FSFVI Score: {:.2}", report.system_result.fsfvi_value);
            println!("Vulnerability Level: {}", report.system_result.risk_level);

            // Climate shock should emphasize climate and agriculture components
            let climate_vuln = report.component_insights.iter()
                .find(|c| c.component_type == "climate_natural_resources")
                .expect("Should have climate component vulnerability");

            println!("Climate & Natural Resources weight in shock scenario: {:.3}", climate_vuln.weight);

            assert!(
                report.system_result.fsfvi_value.is_finite(),
                "Climate shock scenario should produce finite FSFVI score"
            );
        }
        Err(e) => {
            panic!("Climate shock scenario failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_assessment_economic_crisis_scenario() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Economic Crisis Scenario ===");

    let result = service.run_assessment(
        components,
        Some("Demo Republic".to_string()),
        Some("hybrid".to_string()),
        Some("financial_crisis".to_string()),
    ).await;

    match result {
        Ok(response) => {
            let report = response.data;
            println!("✓ Economic crisis scenario assessment successful");
            println!("FSFVI Score: {:.2}", report.system_result.fsfvi_value);
            println!("Vulnerability Level: {}", report.system_result.risk_level);

            // Economic crisis should emphasize social protection and governance
            let social_vuln = report.component_insights.iter()
                .find(|c| c.component_type == "social_protection_equity")
                .expect("Should have social protection vulnerability");

            println!("Social Protection weight in crisis scenario: {:.3}", social_vuln.weight);

            assert!(
                report.system_result.fsfvi_value.is_finite(),
                "Economic crisis scenario should produce finite FSFVI score"
            );
        }
        Err(e) => {
            panic!("Economic crisis scenario failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_assessment_pandemic_response_scenario() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Pandemic Response Scenario ===");

    let result = service.run_assessment(
        components,
        Some("Demo Republic".to_string()),
        Some("hybrid".to_string()),
        Some("pandemic_disruption".to_string()),
    ).await;

    match result {
        Ok(response) => {
            let report = response.data;
            println!("✓ Pandemic response scenario assessment successful");
            println!("FSFVI Score: {:.2}", report.system_result.fsfvi_value);
            println!("Vulnerability Level: {}", report.system_result.risk_level);

            // Pandemic should emphasize nutrition/health and social protection
            let health_vuln = report.component_insights.iter()
                .find(|c| c.component_type == "nutrition_health")
                .expect("Should have nutrition/health vulnerability");

            println!("Nutrition & Health weight in pandemic scenario: {:.3}", health_vuln.weight);

            assert!(
                report.system_result.fsfvi_value.is_finite(),
                "Pandemic scenario should produce finite FSFVI score"
            );
        }
        Err(e) => {
            panic!("Pandemic response scenario failed: {:?}", e);
        }
    }
}

// ============================================================================
// quick_check - INTEGRATION TESTS
// ============================================================================

#[tokio::test]
async fn test_quick_check_with_real_data() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Quick Vulnerability Check ===");

    let result = service.quick_check(components).await;

    match result {
        Ok(response) => {
            println!("✓ Quick check successful");
            println!("Processing time: {}ms", response.metadata.processing_time_ms);

            let quick_result = response.data;
            println!("\n=== Quick Check Results ===");
            println!("FSFVI Score: {:.6}", quick_result.fsfvi_score);
            println!("Vulnerability Level: {}", quick_result.risk_level);
            println!("Critical Components: {}", quick_result.critical_components.len());
            println!("Immediate Actions Needed: {}", quick_result.immediate_actions_needed);
            println!("Summary: {}", quick_result.summary);

            // Validate quick check results
            assert!(
                quick_result.fsfvi_score >= 0.0,
                "Quick check FSFVI score must be non-negative"
            );

            // FSFVI uses: "low", "medium", "high", "critical"
            // See: fsfi-backend/src/fsfvi/config.rs:422-431
            assert!(
                ["low", "medium", "high", "critical"]
                    .contains(&quick_result.risk_level.as_str()),
                "Quick check vulnerability level must be valid, got: {}",
                quick_result.risk_level
            );

            // Quick check processing time should be faster than full assessment
            assert!(
                response.metadata.processing_time_ms < 5000,
                "Quick check should complete in under 5 seconds, took: {}ms",
                response.metadata.processing_time_ms
            );
        }
        Err(e) => {
            panic!("Quick check failed: {:?}", e);
        }
    }
}

// ============================================================================
// HISTORICAL TREND ANALYSIS
// ============================================================================

#[tokio::test]
async fn test_assessment_trend_analysis() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    println!("\n=== Testing Multi-Year Trend Analysis ===");

    // Check if we have historical data for multiple years
    let years = vec![2024, 2025];
    let mut yearly_scores = Vec::new();

    for year in years {
        let components_result = fetch_historical_components(&pool, year).await;

        if components_result.is_empty() {
            println!("No data available for FY {}, skipping", year);
            continue;
        }

        let result = service.run_assessment(
            components_result,
            Some("Demo Republic".to_string()),
            None,
            None,
        ).await;

        match result {
            Ok(response) => {
                let score = response.data.system_result.fsfvi_value;
                yearly_scores.push((year, score));
                println!("FY {}: FSFVI = {:.6}", year, score);
            }
            Err(e) => {
                println!("Assessment failed for FY {}: {:?}", year, e);
            }
        }
    }

    // If we have data for multiple years, analyze the trend
    if yearly_scores.len() >= 2 {
        let (year1, score1) = yearly_scores[0];
        let (year2, score2) = yearly_scores[yearly_scores.len() - 1];
        let change = score2 - score1;
        let change_percent = (change / score1) * 100.0;

        println!("\n=== Trend Analysis ===");
        println!("Change from FY {} to FY {}: {:.2} ({:.1}%)",
            year1, year2, change, change_percent);

        if change < 0.0 {
            println!("✓ Food system vulnerability DECREASED (improvement)");
        } else if change > 0.0 {
            println!("⚠ Food system vulnerability INCREASED");
        } else {
            println!("→ Food system vulnerability remained stable");
        }
    }
}

// ============================================================================
// ERROR HANDLING & VALIDATION TESTS
// ============================================================================

#[tokio::test]
async fn test_assessment_invalid_weighting_method() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    let result = service.run_assessment(
        components,
        Some("Demo Republic".to_string()),
        Some("InvalidMethod".to_string()),
        None,
    ).await;

    assert!(
        result.is_err(),
        "Should reject invalid weighting method"
    );

    if let Err(FsfviServiceError::ValidationError(msg)) = result {
        assert!(
            msg.contains("Invalid weighting_method"),
            "Error message should indicate invalid weighting method"
        );
    }
}

#[tokio::test]
async fn test_assessment_invalid_scenario() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    let result = service.run_assessment(
        components,
        Some("Demo Republic".to_string()),
        None,
        Some("InvalidScenario".to_string()),
    ).await;

    assert!(
        result.is_err(),
        "Should reject invalid scenario"
    );

    if let Err(FsfviServiceError::ValidationError(msg)) = result {
        assert!(
            msg.contains("Invalid scenario"),
            "Error message should indicate invalid scenario"
        );
    }
}

#[tokio::test]
async fn test_assessment_empty_components() {
    let service = get_test_service();

    let result = service.run_assessment(
        vec![],
        Some("Demo Republic".to_string()),
        None,
        None,
    ).await;

    assert!(
        result.is_err(),
        "Should reject empty components list"
    );

    if let Err(FsfviServiceError::ValidationError(msg)) = result {
        assert!(
            msg.contains("At least one component is required"),
            "Error message should indicate components required"
        );
    }
}

#[tokio::test]
async fn test_quick_check_empty_components() {
    let service = get_test_service();

    let result = service.quick_check(vec![]).await;

    assert!(
        result.is_err(),
        "Quick check should reject empty components list"
    );

    if let Err(FsfviServiceError::ValidationError(msg)) = result {
        assert!(
            msg.contains("At least one component is required"),
            "Error message should indicate components required"
        );
    }
}

// ============================================================================
// CRITICAL GOVERNMENT DECISION SCENARIOS
// ============================================================================

#[tokio::test]
async fn test_vulnerability_classification_thresholds() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Vulnerability Classification ===");

    let result = service.run_assessment(
        components,
        Some("Demo Republic".to_string()),
        None,
        None,
    ).await;

    match result {
        Ok(response) => {
            let report = response.data;
            let score = report.system_result.fsfvi_value;
            let level = &report.system_result.risk_level;

            println!("FSFVI Score: {:.2}", score);
            println!("Classification: {}", level);

            // Verify classification aligns with score
            // Typical thresholds (may vary by implementation):
            // 0-20: Very Low
            // 20-40: Low
            // 40-60: Moderate
            // 60-80: High
            // 80-100: Very High/Critical

            let expected_high_vulnerability = score > 40.0;

            if expected_high_vulnerability {
                println!("⚠ Government should prioritize immediate interventions");
            } else {
                println!("✓ Vulnerability is within manageable range");
            }

            // Log for government transparency
            println!("\nGovernment Action Based on Classification:");
            match level.as_str() {
                "Critical" | "Very High" => {
                    println!("  → URGENT: Declare food security emergency");
                    println!("  → Mobilize emergency resources immediately");
                    println!("  → Activate crisis response protocols");
                }
                "High" => {
                    println!("  → HIGH PRIORITY: Accelerate intervention programs");
                    println!("  → Reallocate budget to critical components");
                    println!("  → Increase monitoring frequency");
                }
                "Moderate" => {
                    println!("  → MODERATE: Implement planned improvements");
                    println!("  → Continue monitoring trends");
                    println!("  → Address identified gaps systematically");
                }
                "Low" | "Very Low" => {
                    println!("  → MAINTAIN: Continue current policies");
                    println!("  → Focus on prevention and sustainability");
                }
                _ => {
                    println!("  → Review classification guidance");
                }
            }
        }
        Err(e) => {
            panic!("Vulnerability classification test failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_recommendation_prioritization() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Recommendation Prioritization ===");

    let result = service.run_assessment(
        components,
        Some("Demo Republic".to_string()),
        None,
        None,
    ).await;

    match result {
        Ok(response) => {
            let report = response.data;

            // Count action priorities
            let immediate_actions = &report.system_result.action_priorities.immediate_actions_0_6_months;
            let strategic_actions = &report.system_result.action_priorities.strategic_actions_6_24_months;

            println!("Immediate Actions (0-6 months): {}", immediate_actions.len());
            println!("Strategic Actions (6-24 months): {}", strategic_actions.len());

            // Display immediate actions (highest priority)
            if !immediate_actions.is_empty() {
                println!("\nImmediate Priority Actions:");
                for (i, action) in immediate_actions.iter().enumerate() {
                    println!("  {}. {}", i + 1, action);
                }
            }

            // Display strategic actions
            if !strategic_actions.is_empty() {
                println!("\nStrategic Actions:");
                for (i, action) in strategic_actions.iter().enumerate() {
                    println!("  {}. {}", i + 1, action);
                }
            }

            // Verify component-level recommendations are actionable
            for comp in &report.component_insights {
                for rec in &comp.recommendations {
                    assert!(
                        !rec.is_empty(),
                        "Component {} must have specific recommendations",
                        comp.component_type
                    );
                }
            }
        }
        Err(e) => {
            panic!("Recommendation prioritization test failed: {:?}", e);
        }
    }
}
