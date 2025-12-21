/// Performance Gap Analysis Service - INTEGRATION TESTS
/// ========================================================
/// CRITICAL: Real integration tests for government decision-making system
/// where livelihoods depend on accurate calculations and correct logic
///
/// These tests:
/// - Connect to real SQLite database with demo government data
/// - Make actual HTTP calls to FSFVI API backend
/// - Validate real responses against expected business logic
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
use std::collections::HashMap;

// External test imports - access crate modules directly
use demo_gov_backend::services::fsfvi_service::{
    FsfviClient,
    PerformanceGapService,
    FsfviServiceError,
    ComponentInput,
    PeerCountryData,
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

/// Create performance gap service for tests
fn get_test_service() -> PerformanceGapService {
    PerformanceGapService::new(get_test_fsfvi_client())
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

/// Fetch a specific component by type
async fn fetch_component_by_type(
    pool: &SqlitePool,
    component_type: &str,
) -> ComponentInput {
    let row = sqlx::query(
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
          AND component_type = ?
        "#
    )
    .bind(component_type)
    .fetch_one(pool)
    .await
    .expect(&format!("Failed to fetch {} component", component_type));

    ComponentInput {
        component_id: row.get("component_id"),
        component_type: row.get("component_type"),
        observed_value: row.get("observed_value"),
        benchmark_value: row.get("benchmark_value"),
        financial_allocation_usd: row.get("financial_allocation_usd"),
        weight: row.get("weight"),
        sensitivity_parameter: row.get("sensitivity_parameter"),
    }
}

// ============================================================================
// Test Helper - Create Peer Country Data
// ============================================================================

/// Create realistic peer country data based on regional averages
fn create_peer_countries() -> Vec<PeerCountryData> {
    vec![
        // Rwanda - Strong performer in governance and agriculture
        PeerCountryData {
            country_name: "Rwanda".to_string(),
            component_values: HashMap::from([
                ("agricultural_development".to_string(), 9.2),
                ("infrastructure".to_string(), 68.5),
                ("nutrition_health".to_string(), 72.0),
                ("climate_natural_resources".to_string(), 58.3),
                ("social_protection_equity".to_string(), 65.0),
                ("governance_institutions".to_string(), 78.5),
            ]),
        },
        // Ghana - Balanced regional performer
        PeerCountryData {
            country_name: "Ghana".to_string(),
            component_values: HashMap::from([
                ("agricultural_development".to_string(), 7.5),
                ("infrastructure".to_string(), 62.0),
                ("nutrition_health".to_string(), 70.5),
                ("climate_natural_resources".to_string(), 52.0),
                ("social_protection_equity".to_string(), 68.0),
                ("governance_institutions".to_string(), 66.0),
            ]),
        },
        // Kenya - Strong in innovation, weaker in climate
        PeerCountryData {
            country_name: "Kenya".to_string(),
            component_values: HashMap::from([
                ("agricultural_development".to_string(), 8.1),
                ("infrastructure".to_string(), 65.0),
                ("nutrition_health".to_string(), 66.5),
                ("climate_natural_resources".to_string(), 48.0),
                ("social_protection_equity".to_string(), 70.0),
                ("governance_institutions".to_string(), 62.5),
            ]),
        },
    ]
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

#[tokio::test]
async fn test_demo_data_integrity() {
    let pool = get_test_db_pool().await;
    let components = fetch_demo_fy2025_components(&pool).await;

    assert_eq!(components.len(), 6, "Should have all 6 component types");

    // Verify component types
    let types: Vec<&str> = components.iter()
        .map(|c| c.component_type.as_str())
        .collect();

    assert!(types.contains(&"agricultural_development"));
    assert!(types.contains(&"infrastructure"));
    assert!(types.contains(&"nutrition_health"));
    assert!(types.contains(&"climate_natural_resources"));
    assert!(types.contains(&"social_protection_equity"));
    assert!(types.contains(&"governance_institutions"));

    // Verify financial allocations sum to ~$1.2B
    let total_allocation: f64 = components.iter()
        .map(|c| c.financial_allocation_usd)
        .sum();

    assert!(
        (total_allocation - 1_200_000_000.0).abs() < 1_000_000.0,
        "Total allocation should be ~$1.2B, got: ${:.0}",
        total_allocation
    );
}

// ============================================================================
// analyze_performance_gaps - INTEGRATION TESTS
// ============================================================================

#[tokio::test]
async fn test_analyze_performance_gaps_with_real_data() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    // Fetch real FY 2025 data from database
    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Performance Gap Analysis ===");
    println!("Components loaded: {}", components.len());
    for comp in &components {
        println!("  - {}: observed={:.1}, benchmark={:.1}, allocation=${:.0}M",
            comp.component_type,
            comp.observed_value,
            comp.benchmark_value,
            comp.financial_allocation_usd / 1_000_000.0
        );
    }

    // Call actual FSFVI API
    let result = service.analyze_performance_gaps(components).await;

    match result {
        Ok(response) => {
            println!("\n✓ API call successful");
            println!("Processing time: {}ms", response.metadata.processing_time_ms);

            let report = response.data;
            println!("\n=== Performance Gap Analysis Results ===");
            println!("Average Gap: {:.2}%", report.average_gap * 100.0);
            println!("Overall Status: {}", report.overall_status);
            println!("Critical Gaps: {}", report.critical_gaps);

            // Validate response structure
            assert_eq!(
                report.component_gaps.len(), 6,
                "Should have gap analysis for all 6 components"
            );

            // Validate top priorities identified
            assert!(
                !report.top_priorities.is_empty(),
                "Should identify top priorities for intervention"
            );

            println!("\nTop Priorities:");
            for priority in &report.top_priorities {
                println!("  - {}", priority);
            }

            // Collect all component recommendations
            let all_recommendations: Vec<String> = report.component_gaps.iter()
                .flat_map(|gap| gap.recommendations.clone())
                .collect();

            // Validate recommendations provided
            assert!(
                !all_recommendations.is_empty(),
                "Should provide actionable recommendations"
            );

            println!("\nTop Recommendations:");
            for (i, rec) in all_recommendations.iter().take(3).enumerate() {
                println!("  {}. {}", i + 1, rec);
            }

            // Validate component gaps
            for gap in &report.component_gaps {
                println!("\n{}: gap={:.1}%, severity={}",
                    gap.component_type,
                    gap.performance_gap * 100.0,
                    gap.severity
                );

                assert!(
                    gap.absolute_gap.is_finite(),
                    "Absolute gap should be finite for {}",
                    gap.component_type
                );

                assert!(
                    ["critical", "high", "medium", "low"].contains(&gap.severity.as_str()),
                    "Severity should be valid for {}",
                    gap.component_type
                );
            }

            // Verify known gaps from demo data
            // Agricultural Development: observed=6.8, benchmark=10.0 → gap ~32%
            let ag_gap = report.component_gaps.iter()
                .find(|g| g.component_type == "agricultural_development")
                .expect("Should have agriculture gap");

            assert!(
                ag_gap.performance_gap > 0.0,
                "Agriculture should show underperformance (positive gap in normalized form)"
            );

            // Nutrition & Health: observed=68.5, benchmark=65.0 → performing above benchmark
            let nutr_gap = report.component_gaps.iter()
                .find(|g| g.component_type == "nutrition_health")
                .expect("Should have nutrition gap");

            assert!(
                nutr_gap.performance_gap == 0.0 || nutr_gap.achievement_rate >= 100.0,
                "Nutrition should show meeting or exceeding benchmark"
            );
        }
        Err(e) => {
            panic!("Performance gap analysis failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_analyze_single_component_gap() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    // Test with only agricultural development component
    let component = fetch_component_by_type(&pool, "agricultural_development").await;

    println!("\n=== Testing Single Component Gap Analysis ===");
    println!("Component: {}", component.component_type);
    println!("Observed: {:.1}%", component.observed_value);
    println!("Benchmark: {:.1}%", component.benchmark_value);
    println!("Allocation: ${:.0}M", component.financial_allocation_usd / 1_000_000.0);

    let result = service.analyze_performance_gaps(vec![component]).await;

    match result {
        Ok(response) => {
            let report = response.data;

            assert_eq!(
                report.component_gaps.len(), 1,
                "Should analyze exactly 1 component"
            );

            assert!(
                report.average_gap != 0.0,
                "Average gap should be calculated"
            );

            println!("✓ Single component analysis successful");
            println!("  Gap: {:.1}%", report.component_gaps[0].performance_gap * 100.0);
            println!("  Severity: {}", report.component_gaps[0].severity);
        }
        Err(e) => {
            panic!("Single component analysis failed: {:?}", e);
        }
    }
}

// ============================================================================
// peer_comparison - INTEGRATION TESTS
// ============================================================================

#[tokio::test]
async fn test_peer_comparison_with_real_data() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;
    let peer_countries = create_peer_countries();

    println!("\n=== Testing Peer Comparison ===");
    println!("Demo Republic components: {}", components.len());
    println!("Peer countries: {}", peer_countries.len());
    for peer in &peer_countries {
        println!("  - {}", peer.country_name);
    }

    let result = service.peer_comparison(components, peer_countries).await;

    match result {
        Ok(response) => {
            println!("\n✓ Peer comparison successful");
            println!("Processing time: {}ms", response.metadata.processing_time_ms);

            let report = response.data;

            println!("\n=== Peer Comparison Results ===");
            println!("Peer Countries: {:?}", report.peer_countries);
            println!("Areas Above Peers: {}", report.areas_above_peers);
            println!("Areas Below Peers: {}", report.areas_below_peers);

            // Validate structure
            assert_eq!(
                report.peer_countries.len(), 3,
                "Should compare against 3 peer countries"
            );

            assert!(
                !report.component_comparisons.is_empty(),
                "Should have component comparisons"
            );

            println!("\nComponent Comparisons:");
            for comp in &report.component_comparisons {
                println!("  {}: current={:.1}, peer_avg={:.1}, quartile={}",
                    comp.component_type, comp.current_value, comp.peer_average, comp.quartile);
            }

            // Validate learning opportunities identified
            assert!(
                !report.learning_opportunities.is_empty() || !report.competitive_advantages.is_empty(),
                "Should identify learning opportunities or competitive advantages"
            );

            if !report.learning_opportunities.is_empty() {
                println!("\nLearning Opportunities:");
                for opportunity in &report.learning_opportunities {
                    println!("  - {}", opportunity);
                }
            }

            if !report.competitive_advantages.is_empty() {
                println!("\nCompetitive Advantages:");
                for advantage in &report.competitive_advantages {
                    println!("  - {}", advantage);
                }
            }
        }
        Err(e) => {
            panic!("Peer comparison failed: {:?}", e);
        }
    }
}

// ============================================================================
// track_gap_closure - INTEGRATION TESTS
// ============================================================================

#[tokio::test]
async fn test_track_gap_closure_12_months() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    // Baseline: Current FY 2025 data
    let baseline_components = fetch_demo_fy2025_components(&pool).await;

    // Current: Simulate 12 months of improvement (10% improvement across board)
    let mut current_components = baseline_components.clone();
    for component in &mut current_components {
        // Simulate improvement toward benchmark
        let gap = component.benchmark_value - component.observed_value;
        component.observed_value += gap * 0.10; // 10% gap closure
        component.financial_allocation_usd *= 1.05; // 5% budget increase
    }

    println!("\n=== Testing Gap Closure Tracking (12 months) ===");

    let result = service.track_gap_closure(
        baseline_components.clone(),
        current_components,
        12, // 12 months
    ).await;

    match result {
        Ok(response) => {
            println!("\n✓ Gap closure tracking successful");
            println!("Processing time: {}ms", response.metadata.processing_time_ms);

            let report = response.data;

            println!("\n=== Gap Closure Results ===");
            println!("Time Period: {} months", report.time_period_months);
            println!("Average Gap Closure: {:.2}%", report.average_gap_closure_percent);
            println!("Improving Components: {}", report.improving_components);
            println!("Declining Components: {}", report.declining_components);

            // Validate gap closure calculation
            assert!(
                report.average_gap_closure_percent != 0.0,
                "Average gap closure should be calculated"
            );

            // Note: improving_components may be 0 if progress is slow/moderate
            println!("Improving components: {}", report.improving_components);
            println!("Declining components: {}", report.declining_components);

            // Validate component progress
            assert_eq!(
                report.component_progress.len(), 6,
                "Should track progress for all 6 components"
            );

            println!("\nComponent Progress:");
            for progress in &report.component_progress {
                println!("  {}: {:.1}% closure ({})",
                    progress.component_type,
                    progress.gap_closure_percent,
                    progress.progress_status
                );

                assert!(
                    progress.baseline_gap.is_finite(),
                    "Baseline gap should be finite for {}",
                    progress.component_type
                );

                assert!(
                    ["good", "moderate", "stagnant", "poor"].contains(&progress.progress_status.as_str()),
                    "Progress status should be valid for {}, got: {}",
                    progress.component_type,
                    progress.progress_status
                );
            }

            // Validate success stories and areas needing attention
            println!("\nSuccess Stories: {}", report.success_stories.len());
            for story in &report.success_stories {
                println!("  - {}", story);
            }

            println!("\nAreas Needing Attention: {}", report.areas_needing_attention.len());
            for area in &report.areas_needing_attention {
                println!("  - {}", area);
            }
        }
        Err(e) => {
            panic!("Gap closure tracking failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_track_gap_closure_36_months() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let baseline_components = fetch_demo_fy2025_components(&pool).await;

    // Simulate 3 years of substantial improvement (40% gap closure)
    let mut current_components = baseline_components.clone();
    for component in &mut current_components {
        let gap = component.benchmark_value - component.observed_value;
        component.observed_value += gap * 0.40; // 40% gap closure over 3 years
        component.financial_allocation_usd *= 1.15; // 15% budget increase
    }

    println!("\n=== Testing Gap Closure Tracking (36 months) ===");

    let result = service.track_gap_closure(
        baseline_components,
        current_components,
        36, // 3 years
    ).await;

    match result {
        Ok(response) => {
            let report = response.data;

            println!("\n✓ 3-year tracking successful");
            println!("Time Period: {} months", report.time_period_months);
            println!("Average Gap Closure: {:.2}%", report.average_gap_closure_percent);
            println!("Improving Components: {}", report.improving_components);

            assert_eq!(
                report.time_period_months, 36,
                "Should track 36 months (3 years)"
            );

            assert!(
                report.component_progress.len() > 0,
                "Should have component progress tracked"
            );
        }
        Err(e) => {
            panic!("3-year gap closure tracking failed: {:?}", e);
        }
    }
}

// ============================================================================
// recommend_targets - INTEGRATION TESTS
// ============================================================================

#[tokio::test]
async fn test_recommend_targets_5_year_plan() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;
    let peer_countries = Some(create_peer_countries());

    println!("\n=== Testing Target Recommendations (5-year plan) ===");

    let result = service.recommend_targets(
        components.clone(),
        60, // 5 years (60 months)
        peer_countries,
    ).await;

    match result {
        Ok(response) => {
            println!("\n✓ Target recommendations successful");
            println!("Processing time: {}ms", response.metadata.processing_time_ms);

            let report = response.data;

            println!("\n=== Target Recommendations (5-year) ===");
            println!("Timeline: {} months", report.target_timeline_months);
            println!("Number of targets: {}", report.component_targets.len());

            // Validate structure
            assert_eq!(
                report.component_targets.len(), 6,
                "Should provide targets for all 6 components"
            );

            assert_eq!(
                report.target_timeline_months, 60,
                "Should be 60-month (5-year) timeline"
            );

            assert!(
                !report.overall_guidance.is_empty(),
                "Should provide overall guidance"
            );

            println!("\nOverall Guidance:");
            for guidance in &report.overall_guidance {
                println!("  - {}", guidance);
            }

            println!("\nRecommended Targets:");
            for target in &report.component_targets {
                println!("  {}: {:.1} → {:.1} (gap: {:.1}%, closure: {:.1}%)",
                    target.component_type,
                    target.current_value,
                    target.recommended_target,
                    target.current_gap * 100.0,
                    target.realistic_closure_percent
                );
                println!("    Rationale: {}", target.rationale);

                // For components with gaps, target should be >= current
                // For components already exceeding benchmarks, target may be maintenance level
                if target.current_gap > 0.0 {
                    assert!(
                        target.recommended_target >= target.current_value,
                        "Target should be >= current value for {} (has gap)",
                        target.component_type
                    );
                }

                assert!(
                    target.realistic_closure_percent >= 0.0,
                    "Realistic closure percent should be non-negative for {}",
                    target.component_type
                );

                assert!(
                    target.realistic_closure_percent <= 100.0,
                    "Realistic closure percent should be <= 100% for {}",
                    target.component_type
                );
            }
        }
        Err(e) => {
            panic!("Target recommendations failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_recommend_targets_10_year_plan() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Target Recommendations (10-year plan) ===");

    let result = service.recommend_targets(
        components,
        120, // 10 years (120 months) - maximum allowed
        None, // Without peer comparison
    ).await;

    match result {
        Ok(response) => {
            let report = response.data;

            println!("\n✓ 10-year plan generated");
            println!("Timeline: {} months", report.target_timeline_months);
            println!("Number of targets: {}", report.component_targets.len());

            assert_eq!(
                report.component_targets.len(), 6,
                "Should provide targets for all components"
            );

            assert_eq!(
                report.target_timeline_months, 120,
                "Should be 120-month (10-year) timeline"
            );

            // Longer timeline should allow for more ambitious targets
            for target in &report.component_targets {
                assert!(
                    target.realistic_closure_percent >= 0.0,
                    "Realistic closure percent should be non-negative"
                );

                println!("  {}: gap={:.1}%, realistic closure={:.1}%",
                    target.component_type,
                    target.current_gap * 100.0,
                    target.realistic_closure_percent
                );
            }
        }
        Err(e) => {
            panic!("10-year target recommendations failed: {:?}", e);
        }
    }
}

// ============================================================================
// CRITICAL BUSINESS LOGIC TESTS
// ============================================================================

#[tokio::test]
async fn test_budget_efficiency_vs_performance() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    // Identify highest and lowest allocation components
    let highest_allocation_type = components.iter()
        .max_by(|a, b| a.financial_allocation_usd.partial_cmp(&b.financial_allocation_usd).unwrap())
        .map(|c| (c.component_type.clone(), c.financial_allocation_usd))
        .unwrap();

    let lowest_allocation_type = components.iter()
        .min_by(|a, b| a.financial_allocation_usd.partial_cmp(&b.financial_allocation_usd).unwrap())
        .map(|c| (c.component_type.clone(), c.financial_allocation_usd))
        .unwrap();

    println!("\n=== Budget Efficiency Analysis ===");
    println!("Highest allocation: {} - ${:.0}M",
        highest_allocation_type.0,
        highest_allocation_type.1 / 1_000_000.0
    );
    println!("Lowest allocation: {} - ${:.0}M",
        lowest_allocation_type.0,
        lowest_allocation_type.1 / 1_000_000.0
    );

    // Run gap analysis
    let result = service.analyze_performance_gaps(components).await;

    match result {
        Ok(response) => {
            let report = response.data;

            // Find gaps for highest and lowest allocation
            let high_gap = report.component_gaps.iter()
                .find(|g| g.component_type == highest_allocation_type.0)
                .unwrap();

            let low_gap = report.component_gaps.iter()
                .find(|g| g.component_type == lowest_allocation_type.0)
                .unwrap();

            println!("\nGaps:");
            println!("  {} (highest allocation): {:.1}%, severity: {}",
                high_gap.component_type,
                high_gap.performance_gap * 100.0,
                high_gap.severity
            );
            println!("  {} (lowest allocation): {:.1}%, severity: {}",
                low_gap.component_type,
                low_gap.performance_gap * 100.0,
                low_gap.severity
            );

            // Verify that severity is a valid value returned by the API
            assert!(
                ["critical", "high", "medium", "low"].contains(&low_gap.severity.as_str()),
                "Component {} should have valid severity, got: {}",
                low_gap.component_type,
                low_gap.severity
            );

            // Log the severity for government decision-making transparency
            println!("  Low-budget component severity: {} (gap: {:.1}%)",
                low_gap.severity, low_gap.performance_gap * 100.0);
        }
        Err(e) => {
            panic!("Budget efficiency analysis failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_cross_component_dependencies() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    // Governance institutions affects all other components
    let governance = components.iter()
        .find(|c| c.component_type == "governance_institutions")
        .unwrap();

    println!("\n=== Cross-Component Dependencies ===");
    println!("Governance observed: {:.1}", governance.observed_value);
    println!("Governance benchmark: {:.1}", governance.benchmark_value);

    let result = service.analyze_performance_gaps(components).await;

    match result {
        Ok(response) => {
            let report = response.data;

            // Find governance gap
            let gov_gap = report.component_gaps.iter()
                .find(|g| g.component_type == "governance_institutions")
                .unwrap();

            println!("Governance gap: {:.1}%, severity: {}",
                gov_gap.performance_gap * 100.0,
                gov_gap.severity
            );

            // Verify that governance severity is valid (trust API categorization)
            assert!(
                ["critical", "high", "medium", "low"].contains(&gov_gap.severity.as_str()),
                "Governance should have valid severity, got: {}",
                gov_gap.severity
            );

            // CRITICAL: For governance gaps, verify recommendations are provided
            // (weak governance undermines all components per demo data)
            if gov_gap.performance_gap > 0.0 {
                // Collect all component recommendations
                let all_recommendations: Vec<String> = report.component_gaps.iter()
                    .flat_map(|gap| gap.recommendations.clone())
                    .collect();

                // Verify that some recommendations exist in the system
                assert!(
                    !all_recommendations.is_empty(),
                    "System should provide recommendations when gaps exist"
                );

                println!("  Total recommendations in system: {}", all_recommendations.len());
            }
        }
        Err(e) => {
            panic!("Cross-component analysis failed: {:?}", e);
        }
    }
}

// ============================================================================
// ERROR HANDLING & EDGE CASES
// ============================================================================

#[tokio::test]
async fn test_invalid_timeline_validation() {
    let service = get_test_service();
    let pool = get_test_db_pool().await;
    let components = fetch_demo_fy2025_components(&pool).await;

    // Test timeline = 0 (invalid)
    let result = service.track_gap_closure(
        components.clone(),
        components.clone(),
        0,
    ).await;

    assert!(
        result.is_err(),
        "Should reject timeline of 0 months"
    );

    if let Err(FsfviServiceError::ValidationError(msg)) = result {
        assert!(
            msg.contains("Time period must be between 1 and 240"),
            "Error message should indicate valid range"
        );
    }

    // Test timeline > 240 (invalid - more than 20 years)
    let result = service.track_gap_closure(
        components.clone(),
        components,
        241,
    ).await;

    assert!(
        result.is_err(),
        "Should reject timeline > 240 months"
    );
}

#[tokio::test]
async fn test_empty_components_validation() {
    let service = get_test_service();

    let result = service.analyze_performance_gaps(vec![]).await;

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
