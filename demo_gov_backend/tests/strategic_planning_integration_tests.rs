/// Strategic Planning Service - INTEGRATION TESTS
/// ==================================================
/// CRITICAL: Real integration tests for FSFVI strategic planning
/// where government multi-year budgets and national development plans
/// depend on accurate, achievable, and fiscally realistic trajectories
///
/// These tests:
/// - Connect to real SQLite database with demo government data
/// - Make actual HTTP calls to FSFVI API backend
/// - Validate multi-year budget planning algorithms
/// - Test MTEF (Medium-Term Expenditure Framework) generation
/// - Verify historical trend analysis for evidence-based planning
/// - Ensure resource mobilization plans are realistic
///
/// Test Data Source: migrations/006_demo_fsfvi_data.sql
/// - Demo Republic FY 2024-2025 data
/// - 6 components with realistic allocations
/// - Total budget: $1.2B USD per year
///
/// Prerequisites:
/// 1. Database with demo data (run migrations)
/// 2. FSFVI API backend running (http://localhost:8080)
/// 3. Valid API key in .env file
///
/// GOVERNMENT PLANNING CONTEXT:
/// Strategic planning affects multi-year budget commitments,
/// donor coordination, MTEF submissions to parliament/MOF,
/// and national development plan targets. Errors can:
/// - Misallocate billions in government resources
/// - Create unrealistic targets that damage credibility
/// - Undermine donor confidence and aid flows
/// - Violate fiscal constraints and trigger crises

use sqlx::{SqlitePool, Row};
use std::collections::HashMap;

// External test imports - access crate modules directly
use demo_gov_backend::services::fsfvi_service::{
    ComponentInput, FsfviClient, FsfviServiceError, StrategicPlanningService,
    YearlyBudgetConstraint,
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

/// Create strategic planning service for tests
fn get_test_service() -> StrategicPlanningService {
    StrategicPlanningService::new(get_test_fsfvi_client())
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
        "#,
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
        "#,
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
        std::env::var("FSFVI_API_URL")
            .unwrap_or_else(|_| "http://localhost:8080".to_string())
    );
}

#[tokio::test]
async fn test_database_connectivity() {
    let pool = get_test_db_pool().await;

    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM fsfvi_data WHERE government_id = 'demo_government' AND fiscal_year = 2025",
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
// MULTI-YEAR STRATEGIC PLAN - INTEGRATION TESTS
// ============================================================================

#[tokio::test]
async fn test_generate_multi_year_plan_with_real_data() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    // Fetch real FY 2025 data from database
    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Multi-Year Strategic Plan Generation ===");
    println!("Components loaded: {}", components.len());

    // Calculate total current budget
    let current_budget: f64 = components
        .iter()
        .map(|c| c.financial_allocation_usd)
        .sum();
    println!("Current Total Budget: ${:.2}B", current_budget / 1_000_000_000.0);

    for comp in &components {
        println!(
            "  - {}: ${:.0}M, performance={:.1}%",
            comp.component_type,
            comp.financial_allocation_usd / 1_000_000.0,
            (comp.observed_value / comp.benchmark_value) * 100.0
        );
    }

    // CRITICAL: Test realistic 5-year plan with 20% FSFVI reduction target
    // This is a typical national development plan timeline
    let planning_years = 5;
    let target_fsfvi = 0.30; // Ambitious but achievable 20% reduction from ~0.37

    // Set budget constraints for each year (realistic fiscal constraints)
    let mut yearly_constraints = HashMap::new();
    for year in 1..=planning_years {
        // Assume 5% annual budget growth (typical for developing countries)
        let year_budget = current_budget * (1.05_f64).powi(year as i32);

        yearly_constraints.insert(
            year,
            YearlyBudgetConstraint {
                total_budget_ceiling_usd: year_budget,
                min_allocation_per_component_usd: 50_000_000.0, // $50M minimum per component
                max_change_percent_from_previous: Some(30.0),    // Max 30% change per year
                priority_components: None,
            },
        );
    }

    // Call actual FSFVI API
    let result = service
        .generate_multi_year_plan(
            components.clone(),
            Some("Demo Republic".to_string()),
            planning_years,
            target_fsfvi,
            Some(yearly_constraints.clone()),
        )
        .await;

    match result {
        Ok(response) => {
            println!("\n✓ Multi-year plan generated successfully");
            println!("Processing time: {}ms", response.metadata.processing_time_ms);

            let plan = response.data;
            println!("\n=== Multi-Year Strategic Plan Results ===");
            println!("Baseline FSFVI: {:.6}", plan.baseline_fsfvi);
            println!("Target FSFVI: {:.6}", plan.target_fsfvi);
            println!("Planning Period: {} years", plan.planning_years);
            println!("Target Already Achieved: {}", plan.target_already_achieved);

            // CRITICAL: Validate baseline FSFVI
            assert!(
                plan.baseline_fsfvi >= 0.0 && plan.baseline_fsfvi <= 1.0,
                "Baseline FSFVI must be in [0, 1], got: {}",
                plan.baseline_fsfvi
            );

            assert!(
                plan.baseline_fsfvi.is_finite(),
                "Baseline FSFVI must be finite"
            );

            // Validate target
            assert_eq!(
                plan.target_fsfvi, target_fsfvi,
                "Target FSFVI should match request"
            );

            assert_eq!(
                plan.planning_years, planning_years,
                "Planning years should match request"
            );

            // If target not already achieved, should have yearly plans
            if !plan.target_already_achieved {
                assert_eq!(
                    plan.yearly_plans.len(),
                    planning_years,
                    "Should have plan for each year"
                );

                println!("\n=== Year-by-Year Plan ===");
                for (idx, year_plan) in plan.yearly_plans.iter().enumerate() {
                    let year = idx + 1;
                    println!(
                        "\nYear {}: Target FSFVI={:.6}, Projected FSFVI={:.6}, Budget=${:.2}B",
                        year,
                        year_plan.target_fsfvi,
                        year_plan.projected_fsfvi,
                        year_plan.total_budget / 1_000_000_000.0
                    );

                    // Validate year number
                    assert_eq!(year_plan.year, year, "Year number should match index");

                    // Validate FSFVI values
                    assert!(
                        year_plan.target_fsfvi >= 0.0 && year_plan.target_fsfvi <= 1.0,
                        "Year {} target FSFVI must be in [0, 1]",
                        year
                    );

                    assert!(
                        year_plan.projected_fsfvi >= 0.0 && year_plan.projected_fsfvi <= 1.0,
                        "Year {} projected FSFVI must be in [0, 1]",
                        year
                    );

                    // Projected FSFVI should decrease over time (improvement)
                    if idx > 0 {
                        let prev_projected = plan.yearly_plans[idx - 1].projected_fsfvi;
                        assert!(
                            year_plan.projected_fsfvi <= prev_projected * 1.05, // Allow 5% tolerance
                            "Year {} projected FSFVI should improve or stay similar (got {:.6}, prev {:.6})",
                            year,
                            year_plan.projected_fsfvi,
                            prev_projected
                        );
                    }

                    // Validate budget
                    assert!(
                        year_plan.total_budget > 0.0,
                        "Year {} budget must be positive",
                        year
                    );

                    // Budget should respect constraint
                    let expected_budget = yearly_constraints.get(&year).unwrap().total_budget_ceiling_usd;
                    let budget_diff_pct = ((year_plan.total_budget - expected_budget) / expected_budget).abs() * 100.0;
                    assert!(
                        budget_diff_pct < 1.0,
                        "Year {} budget should respect ceiling. Expected: ${:.2}B, Got: ${:.2}B",
                        year,
                        expected_budget / 1_000_000_000.0,
                        year_plan.total_budget / 1_000_000_000.0
                    );

                    // Validate allocations
                    assert_eq!(
                        year_plan.recommended_allocations.len(),
                        6,
                        "Year {} should have allocations for all 6 components",
                        year
                    );

                    let year_total_allocated: f64 =
                        year_plan.recommended_allocations.values().sum();

                    println!("  Total Allocated: ${:.2}B", year_total_allocated / 1_000_000_000.0);

                    // Allocations should sum to total budget
                    let alloc_diff_pct = ((year_total_allocated - year_plan.total_budget) / year_plan.total_budget).abs() * 100.0;
                    assert!(
                        alloc_diff_pct < 1.0,
                        "Year {} allocations should sum to total budget. Expected: ${:.2}B, Got: ${:.2}B",
                        year,
                        year_plan.total_budget / 1_000_000_000.0,
                        year_total_allocated / 1_000_000_000.0
                    );

                    // Display allocations
                    println!("  Component Allocations:");
                    for (comp_type, allocation) in &year_plan.recommended_allocations {
                        println!("    - {}: ${:.0}M", comp_type, allocation / 1_000_000.0);

                        // Validate minimum allocation
                        assert!(
                            *allocation >= 50_000_000.0 * 0.99, // 1% tolerance
                            "Year {} component {} allocation ${:.0}M below minimum $50M",
                            year,
                            comp_type,
                            allocation / 1_000_000.0
                        );
                    }

                    // Validate interventions
                    assert!(
                        !year_plan.key_interventions.is_empty(),
                        "Year {} should have key interventions",
                        year
                    );

                    println!("  Key Interventions: {}", year_plan.key_interventions.len());
                    for intervention in &year_plan.key_interventions {
                        println!("    - {}", intervention);
                    }
                }

                // Validate total additional investment
                println!("\n=== Financial Summary ===");
                println!(
                    "Total Additional Investment Needed: ${:.2}B",
                    plan.total_additional_investment_needed / 1_000_000_000.0
                );

                // Additional investment should be reasonable
                assert!(
                    plan.total_additional_investment_needed >= 0.0,
                    "Additional investment should be non-negative"
                );

                // Final year budget should be greater than baseline (with growth)
                let final_year_budget = plan.yearly_plans.last().unwrap().total_budget;
                assert!(
                    final_year_budget >= current_budget,
                    "Final year budget should be >= baseline with growth"
                );
            } else {
                println!("✓ Target already achieved - no multi-year plan needed");
                assert!(
                    plan.yearly_plans.is_empty(),
                    "Should have no yearly plans if target already achieved"
                );
            }
        }
        Err(e) => {
            panic!("Multi-year plan generation failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_multi_year_plan_with_tight_budget_constraints() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Multi-Year Plan with Tight Budget Constraints ===");

    let current_budget: f64 = components.iter().map(|c| c.financial_allocation_usd).sum();

    // CRITICAL: Test with zero budget growth (fiscal austerity scenario)
    // Governments in crisis may face flat or declining budgets
    let planning_years = 3;
    let target_fsfvi = 0.32; // Modest 10% improvement target

    let mut yearly_constraints = HashMap::new();
    for year in 1..=planning_years {
        // FLAT BUDGET - no growth (austerity scenario)
        yearly_constraints.insert(
            year,
            YearlyBudgetConstraint {
                total_budget_ceiling_usd: current_budget, // No growth
                min_allocation_per_component_usd: 100_000_000.0, // $100M minimum
                max_change_percent_from_previous: Some(15.0), // Only 15% change allowed
                priority_components: None,
            },
        );
    }

    let result = service
        .generate_multi_year_plan(
            components.clone(),
            Some("Demo Republic".to_string()),
            planning_years,
            target_fsfvi,
            Some(yearly_constraints),
        )
        .await;

    match result {
        Ok(response) => {
            let plan = response.data;

            println!("✓ Plan generated with tight constraints");
            println!("Baseline FSFVI: {:.6}", plan.baseline_fsfvi);
            println!("Target FSFVI: {:.6}", plan.target_fsfvi);

            if !plan.target_already_achieved {
                // With tight constraints, verify all years respect budget ceiling
                for year_plan in &plan.yearly_plans {
                    assert!(
                        (year_plan.total_budget - current_budget).abs() < 1000.0, // Within $1K tolerance
                        "Year {} should have flat budget. Expected: ${:.2}B, Got: ${:.2}B",
                        year_plan.year,
                        current_budget / 1_000_000_000.0,
                        year_plan.total_budget / 1_000_000_000.0
                    );

                    // Verify all allocations respect minimum
                    for (comp_type, allocation) in &year_plan.recommended_allocations {
                        assert!(
                            *allocation >= 100_000_000.0 * 0.99, // 1% tolerance
                            "Year {} component {} below minimum",
                            year_plan.year,
                            comp_type
                        );
                    }
                }

                println!("✓ All budget constraints respected");
            }
        }
        Err(e) => {
            panic!("Tight budget constraint test failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_multi_year_plan_with_priority_components() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Multi-Year Plan with Priority Components ===");

    let current_budget: f64 = components.iter().map(|c| c.financial_allocation_usd).sum();
    let planning_years = 4;
    let target_fsfvi = 0.28; // Ambitious 25% reduction

    // CRITICAL: Government prioritizes agriculture and nutrition (food security crisis response)
    let priority_components = vec![
        "agricultural_development".to_string(),
        "nutrition_health".to_string(),
    ];

    let mut yearly_constraints = HashMap::new();
    for year in 1..=planning_years {
        let year_budget = current_budget * (1.03_f64).powi(year as i32); // 3% growth

        yearly_constraints.insert(
            year,
            YearlyBudgetConstraint {
                total_budget_ceiling_usd: year_budget,
                min_allocation_per_component_usd: 75_000_000.0, // $75M minimum
                max_change_percent_from_previous: Some(40.0),   // Allow 40% change for reallocation
                priority_components: Some(priority_components.clone()),
            },
        );
    }

    let result = service
        .generate_multi_year_plan(
            components.clone(),
            Some("Demo Republic".to_string()),
            planning_years,
            target_fsfvi,
            Some(yearly_constraints),
        )
        .await;

    match result {
        Ok(response) => {
            let plan = response.data;

            println!("✓ Plan generated with priority components");

            if !plan.target_already_achieved {
                // Verify priority components receive adequate funding in all years
                for year_plan in &plan.yearly_plans {
                    for priority_comp in &priority_components {
                        let allocation = year_plan
                            .recommended_allocations
                            .get(priority_comp)
                            .expect(&format!("Priority component {} should have allocation", priority_comp));

                        println!(
                            "Year {}: {} = ${:.0}M",
                            year_plan.year,
                            priority_comp,
                            allocation / 1_000_000.0
                        );

                        // Priority components should receive at least minimum allocation
                        assert!(
                            *allocation >= 75_000_000.0,
                            "Priority component {} underfunded in Year {}",
                            priority_comp,
                            year_plan.year
                        );
                    }
                }

                println!("✓ Priority components adequately funded across all years");
            }
        }
        Err(e) => {
            panic!("Priority components test failed: {:?}", e);
        }
    }
}

// ============================================================================
// MTEF (MEDIUM-TERM EXPENDITURE FRAMEWORK) - INTEGRATION TESTS
// ============================================================================

#[tokio::test]
async fn test_generate_mtef_with_real_data() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing MTEF Generation ===");
    println!("Components loaded: {}", components.len());

    let current_budget: f64 = components.iter().map(|c| c.financial_allocation_usd).sum();
    println!("Baseline Budget: ${:.2}B", current_budget / 1_000_000_000.0);

    // CRITICAL: MTEF is standard 3-year framework used for budget submissions
    let target_improvement_percent = 20.0; // 20% FSFVI reduction over 3 years
    let yearly_budget_growth_rate = 0.05; // 5% annual budget growth (typical)

    let result = service
        .generate_mtef(components.clone(), target_improvement_percent, yearly_budget_growth_rate)
        .await;

    match result {
        Ok(response) => {
            println!("\n✓ MTEF generated successfully");
            println!("Processing time: {}ms", response.metadata.processing_time_ms);

            let mtef = response.data;
            println!("\n=== MTEF Results ===");
            println!("Baseline FSFVI: {:.6}", mtef.baseline_fsfvi);
            println!("Target FSFVI (Year 3): {:.6}", mtef.target_fsfvi_year_3);
            println!("Baseline Budget: ${:.2}B", mtef.baseline_budget / 1_000.0);

            // Validate baseline and target
            assert!(
                mtef.baseline_fsfvi >= 0.0 && mtef.baseline_fsfvi <= 1.0,
                "Baseline FSFVI must be in [0, 1]"
            );

            assert!(
                mtef.target_fsfvi_year_3 >= 0.0 && mtef.target_fsfvi_year_3 <= 1.0,
                "Target FSFVI must be in [0, 1]"
            );

            // Target should reflect improvement
            let actual_improvement_pct = ((mtef.baseline_fsfvi - mtef.target_fsfvi_year_3) / mtef.baseline_fsfvi) * 100.0;
            println!("Actual Improvement: {:.1}%", actual_improvement_pct);

            // Should be close to target (within 5% tolerance)
            assert!(
                (actual_improvement_pct - target_improvement_percent).abs() < 5.0,
                "MTEF improvement should be close to target. Expected: {:.1}%, Got: {:.1}%",
                target_improvement_percent,
                actual_improvement_pct
            );

            // MTEF should have exactly 3 yearly plans
            let yearly_plans = vec![&mtef.year_1_plan, &mtef.year_2_plan, &mtef.year_3_plan];

            println!("\n=== Year-by-Year MTEF Plan ===");
            for (idx, year_plan) in yearly_plans.iter().enumerate() {
                let year = idx + 1;
                println!(
                    "\nYear {}: FSFVI={:.6}, Budget=${:.2}B",
                    year,
                    year_plan.projected_fsfvi,
                    year_plan.total_budget / 1_000.0
                );

                // Validate year number
                assert_eq!(year_plan.year, year, "Year number should match");

                // Validate FSFVI
                assert!(
                    year_plan.projected_fsfvi >= 0.0 && year_plan.projected_fsfvi <= 1.0,
                    "Year {} FSFVI must be in [0, 1]",
                    year
                );

                // FSFVI should improve progressively
                assert!(
                    year_plan.projected_fsfvi <= mtef.baseline_fsfvi,
                    "Year {} FSFVI should be <= baseline",
                    year
                );

                if year == 3 {
                    // Final year should be close to target
                    let final_diff = (year_plan.projected_fsfvi - mtef.target_fsfvi_year_3).abs();
                    assert!(
                        final_diff < 0.05,
                        "Year 3 FSFVI should match target. Expected: {:.6}, Got: {:.6}",
                        mtef.target_fsfvi_year_3,
                        year_plan.projected_fsfvi
                    );
                }

                // Validate budget growth
                // Note: current_budget is in USD, but API returns in millions
                let current_budget_millions = current_budget / 1_000_000.0;
                let expected_budget = current_budget_millions * (1.0 + yearly_budget_growth_rate).powi(year as i32);
                let budget_diff_pct = ((year_plan.total_budget - expected_budget) / expected_budget).abs() * 100.0;

                println!("  Expected Budget: ${:.2}B", expected_budget / 1_000.0);
                println!("  Actual Budget: ${:.2}B", year_plan.total_budget / 1_000.0);
                println!("  Difference: {:.2}%", budget_diff_pct);

                assert!(
                    budget_diff_pct < 5.0,
                    "Year {} budget should grow at ~{:.0}% annually",
                    year,
                    yearly_budget_growth_rate * 100.0
                );

                // Validate allocations
                assert_eq!(
                    year_plan.component_allocations.len(),
                    6,
                    "Year {} should have 6 component allocations",
                    year
                );

                let year_total: f64 = year_plan.component_allocations.values().sum();
                let alloc_diff_pct = ((year_total - year_plan.total_budget) / year_plan.total_budget).abs() * 100.0;

                println!("  Total Allocations: ${:.2}M (vs budget: ${:.2}M, diff: {:.2}%)",
                    year_total, year_plan.total_budget, alloc_diff_pct);

                // CRITICAL: Budget conservation must be enforced
                // Government MTEF credibility depends on accurate budget alignment
                assert!(
                    alloc_diff_pct < 1.0,
                    "Year {} budget conservation violated: allocations sum to ${:.0}M but budget is ${:.0}M ({:.2}% error)",
                    year, year_total, year_plan.total_budget, alloc_diff_pct
                );

                println!("  Component Allocations:");
                let mut comp_sum = 0.0;
                for (comp_type, allocation) in &year_plan.component_allocations {
                    println!("    - {}: ${:.2}M", comp_type, allocation);
                    comp_sum += allocation;

                    assert!(
                        *allocation > 0.0,
                        "Year {} component {} should have positive allocation",
                        year,
                        comp_type
                    );
                }
                println!("  Sum of component allocations: ${:.2}M", comp_sum);

                // Validate interventions
                assert!(
                    !year_plan.key_interventions.is_empty(),
                    "Year {} should have key interventions",
                    year
                );

                println!("  Key Interventions: {}", year_plan.key_interventions.len());
            }
        }
        Err(e) => {
            panic!("MTEF generation failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_mtef_with_negative_growth() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing MTEF with Declining Budget (Fiscal Crisis) ===");

    // CRITICAL: Test fiscal crisis scenario (budget decline)
    let target_improvement_percent = 10.0; // Modest target during crisis
    let yearly_budget_growth_rate = -0.03; // 3% annual decline (austerity)

    let result = service
        .generate_mtef(components.clone(), target_improvement_percent, yearly_budget_growth_rate)
        .await;

    match result {
        Ok(response) => {
            let mtef = response.data;

            println!("✓ MTEF generated for declining budget scenario");
            println!("Baseline FSFVI: {:.6}", mtef.baseline_fsfvi);
            println!("Target FSFVI: {:.6}", mtef.target_fsfvi_year_3);

            // Verify budgets decline each year
            let yearly_plans = vec![&mtef.year_1_plan, &mtef.year_2_plan, &mtef.year_3_plan];
            let mut prev_budget = yearly_plans[0].total_budget;
            for year_plan in &yearly_plans[1..] {
                println!(
                    "Year {}: Budget=${:.2}B (vs previous: {:+.1}%)",
                    year_plan.year,
                    year_plan.total_budget / 1_000.0,
                    ((year_plan.total_budget - prev_budget) / prev_budget) * 100.0
                );

                assert!(
                    year_plan.total_budget <= prev_budget * 1.01, // Allow 1% tolerance
                    "Budget should decline or stay flat in austerity scenario"
                );

                prev_budget = year_plan.total_budget;
            }

            println!("✓ Budget decline correctly modeled in MTEF");
        }
        Err(e) => {
            panic!("MTEF with declining budget failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_mtef_with_high_improvement_target() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing MTEF with Ambitious Improvement Target ===");

    // CRITICAL: Test aggressive transformation target
    let target_improvement_percent = 40.0; // 40% FSFVI reduction (very ambitious)
    let yearly_budget_growth_rate = 0.10; // 10% annual growth (major investment)

    let result = service
        .generate_mtef(components.clone(), target_improvement_percent, yearly_budget_growth_rate)
        .await;

    match result {
        Ok(response) => {
            let mtef = response.data;

            println!("✓ MTEF generated with ambitious target");

            let actual_improvement_pct = ((mtef.baseline_fsfvi - mtef.target_fsfvi_year_3) / mtef.baseline_fsfvi) * 100.0;
            println!("Target Improvement: {:.1}%", target_improvement_percent);
            println!("Actual Improvement: {:.1}%", actual_improvement_pct);

            // Verify substantial budget increase
            let final_budget = mtef.year_3_plan.total_budget;
            let initial_budget = mtef.year_1_plan.total_budget;
            let budget_growth_pct = ((final_budget - initial_budget) / initial_budget) * 100.0;

            println!("Total Budget Growth: {:.1}%", budget_growth_pct);

            // With 10% annual growth, 3-year total could be ~33% if compounded
            // But the API may apply constraints or use simple growth
            // Accept any substantial growth (15-40%)
            assert!(
                budget_growth_pct > 15.0 && budget_growth_pct < 40.0,
                "Budget should grow substantially with high growth rate. Got: {:.1}%",
                budget_growth_pct
            );
        }
        Err(e) => {
            panic!("Ambitious MTEF target test failed: {:?}", e);
        }
    }
}

// ============================================================================
// HISTORICAL TRENDS - INTEGRATION TESTS
// ============================================================================

#[tokio::test]
async fn test_fetch_historical_trends_multi_year() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    println!("\n=== Testing Historical Trends Fetching ===");

    // Fetch data for multiple fiscal years
    let fiscal_years = vec![2024, 2025];

    let result = service
        .fetch_historical_trends(&pool, "demo_government", fiscal_years.clone(), None)
        .await;

    match result {
        Ok(trends) => {
            println!("✓ Historical trends fetched successfully");
            println!("Years fetched: {}", trends.len());

            // Should have data for each year
            for (year, year_components) in &trends {
                println!("\nFY {}: {} components", year, year_components.len());

                assert!(
                    fiscal_years.contains(year),
                    "Fetched year {} should be in requested years",
                    year
                );

                assert_eq!(
                    year_components.len(),
                    6,
                    "FY {} should have 6 components",
                    year
                );

                // Validate component data
                for comp in year_components {
                    assert!(
                        !comp.component_type.is_empty(),
                        "FY {} component should have valid type",
                        year
                    );

                    assert!(
                        comp.observed_value >= 0.0,
                        "FY {} component {} has invalid observed value",
                        year,
                        comp.component_type
                    );

                    assert!(
                        comp.benchmark_value > 0.0,
                        "FY {} component {} has invalid benchmark",
                        year,
                        comp.component_type
                    );

                    assert!(
                        comp.financial_allocation_usd >= 0.0,
                        "FY {} component {} has invalid allocation",
                        year,
                        comp.component_type
                    );
                }
            }

            // Calculate trend metrics
            if trends.len() >= 2 {
                println!("\n=== Trend Analysis ===");

                // Compare first and last year
                let (first_year, first_components) = &trends[0];
                let (last_year, last_components) = &trends[trends.len() - 1];

                // Calculate total budget change
                let first_budget: f64 = first_components.iter().map(|c| c.financial_allocation_usd).sum();
                let last_budget: f64 = last_components.iter().map(|c| c.financial_allocation_usd).sum();
                let budget_change_pct = ((last_budget - first_budget) / first_budget) * 100.0;

                println!("FY {} Budget: ${:.2}B", first_year, first_budget / 1_000_000_000.0);
                println!("FY {} Budget: ${:.2}B", last_year, last_budget / 1_000_000_000.0);
                println!("Budget Change: {:+.1}%", budget_change_pct);

                // Calculate average performance improvement
                for comp_type in &["agricultural_development", "nutrition_health", "infrastructure"] {
                    let first_comp = first_components.iter().find(|c| c.component_type == *comp_type);
                    let last_comp = last_components.iter().find(|c| c.component_type == *comp_type);

                    if let (Some(first), Some(last)) = (first_comp, last_comp) {
                        let first_perf = first.observed_value / first.benchmark_value;
                        let last_perf = last.observed_value / last.benchmark_value;
                        let perf_change = (last_perf - first_perf) * 100.0;

                        println!(
                            "{}: {:+.1}% performance change",
                            comp_type,
                            perf_change
                        );
                    }
                }
            }
        }
        Err(e) => {
            panic!("Historical trends fetching failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_historical_trends_with_reporting_period() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    println!("\n=== Testing Historical Trends with Reporting Period ===");

    let fiscal_years = vec![2025];
    let reporting_period = Some("2025-Annual");

    let result = service
        .fetch_historical_trends(&pool, "demo_government", fiscal_years.clone(), reporting_period)
        .await;

    match result {
        Ok(trends) => {
            println!("✓ Historical trends with reporting period fetched");

            assert_eq!(
                trends.len(),
                1,
                "Should fetch exactly one year"
            );

            let (year, components) = &trends[0];
            assert_eq!(*year, 2025, "Should fetch FY 2025");
            assert_eq!(components.len(), 6, "Should have 6 components");

            println!("FY 2025 (Annual): {} components loaded", components.len());
        }
        Err(e) => {
            panic!("Historical trends with reporting period failed: {:?}", e);
        }
    }
}

// ============================================================================
// ERROR HANDLING & VALIDATION TESTS
// ============================================================================

#[tokio::test]
async fn test_multi_year_plan_empty_components() {
    let service = get_test_service();

    let result = service
        .generate_multi_year_plan(
            vec![],
            Some("Demo Republic".to_string()),
            5,
            0.30,
            None,
        )
        .await;

    assert!(
        result.is_err(),
        "Should reject empty components list"
    );

    if let Err(FsfviServiceError::ValidationError(msg)) = result {
        assert!(
            msg.contains("At least one component is required"),
            "Error should indicate components required"
        );
    }
}

#[tokio::test]
async fn test_multi_year_plan_invalid_planning_years() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    // Test zero years
    let result = service
        .generate_multi_year_plan(
            components.clone(),
            Some("Demo Republic".to_string()),
            0,
            0.30,
            None,
        )
        .await;

    assert!(
        result.is_err(),
        "Should reject zero planning years"
    );

    // Test excessive years (> 20)
    let result = service
        .generate_multi_year_plan(
            components.clone(),
            Some("Demo Republic".to_string()),
            25,
            0.30,
            None,
        )
        .await;

    assert!(
        result.is_err(),
        "Should reject planning period > 20 years"
    );
}

#[tokio::test]
async fn test_multi_year_plan_invalid_target_fsfvi() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    // Test negative target
    let result = service
        .generate_multi_year_plan(
            components.clone(),
            Some("Demo Republic".to_string()),
            5,
            -0.1,
            None,
        )
        .await;

    assert!(
        result.is_err(),
        "Should reject negative target FSFVI"
    );

    // Test target > 1.0
    let result = service
        .generate_multi_year_plan(
            components.clone(),
            Some("Demo Republic".to_string()),
            5,
            1.5,
            None,
        )
        .await;

    assert!(
        result.is_err(),
        "Should reject target FSFVI > 1.0"
    );
}

#[tokio::test]
async fn test_mtef_empty_components() {
    let service = get_test_service();

    let result = service
        .generate_mtef(vec![], 20.0, 0.05)
        .await;

    assert!(
        result.is_err(),
        "Should reject empty components list"
    );
}

#[tokio::test]
async fn test_mtef_invalid_improvement_target() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    // Test negative improvement
    let result = service
        .generate_mtef(components.clone(), -10.0, 0.05)
        .await;

    assert!(
        result.is_err(),
        "Should reject negative improvement target"
    );

    // Test excessive improvement (> 100%)
    let result = service
        .generate_mtef(components.clone(), 150.0, 0.05)
        .await;

    assert!(
        result.is_err(),
        "Should reject improvement > 100%"
    );
}

#[tokio::test]
async fn test_mtef_invalid_growth_rate() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    // Test extreme negative growth (< -50%)
    let result = service
        .generate_mtef(components.clone(), 20.0, -0.60)
        .await;

    assert!(
        result.is_err(),
        "Should reject extreme negative growth rate"
    );

    // Test excessive growth (> 100%)
    let result = service
        .generate_mtef(components.clone(), 20.0, 1.5)
        .await;

    assert!(
        result.is_err(),
        "Should reject excessive growth rate"
    );
}

// ============================================================================
// CRITICAL GOVERNMENT DECISION SCENARIOS
// ============================================================================

#[tokio::test]
async fn test_strategic_planning_for_sdg_achievement() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing SDG 2 (Zero Hunger) Achievement Planning ===");

    // CRITICAL: Plan to achieve SDG 2 by 2030 (typical government commitment)
    let current_year = 2025;
    let target_year = 2030;
    let planning_years = (target_year - current_year) as usize;

    // SDG target: FSFVI < 0.20 (low vulnerability)
    let sdg_target_fsfvi = 0.20;

    let result = service
        .generate_multi_year_plan(
            components.clone(),
            Some("Demo Republic".to_string()),
            planning_years,
            sdg_target_fsfvi,
            None, // No explicit constraints - let optimizer determine path
        )
        .await;

    match result {
        Ok(response) => {
            let plan = response.data;

            println!("✓ SDG achievement plan generated");
            println!("Baseline FSFVI: {:.6}", plan.baseline_fsfvi);
            println!("SDG Target (2030): {:.6}", sdg_target_fsfvi);
            println!("Required Reduction: {:.1}%",
                ((plan.baseline_fsfvi - sdg_target_fsfvi) / plan.baseline_fsfvi) * 100.0
            );

            if !plan.target_already_achieved {
                // Verify final year achieves SDG target (or gets close)
                let final_year_fsfvi = plan.yearly_plans.last().unwrap().projected_fsfvi;

                println!("\nProjected 2030 FSFVI: {:.6}", final_year_fsfvi);

                if final_year_fsfvi <= sdg_target_fsfvi {
                    println!("✓ SDG 2 target ACHIEVABLE by 2030 with this plan");
                } else {
                    let gap = final_year_fsfvi - sdg_target_fsfvi;
                    let gap_pct = (gap / sdg_target_fsfvi) * 100.0;
                    println!("⚠ SDG 2 target SHORTFALL: {:.6} ({:.1}% above target)", gap, gap_pct);

                    // Still acceptable if close (within 10%)
                    assert!(
                        gap_pct < 10.0,
                        "SDG plan should get within 10% of target"
                    );
                }

                // Calculate total investment required for SDG achievement
                println!("\nTotal Investment Required: ${:.2}B",
                    plan.total_additional_investment_needed / 1_000_000_000.0
                );
            } else {
                println!("✓ SDG 2 target already achieved!");
            }
        }
        Err(e) => {
            panic!("SDG achievement planning failed: {:?}", e);
        }
    }
}

#[tokio::test]
async fn test_budget_realism_check() {
    let pool = get_test_db_pool().await;
    let service = get_test_service();

    let components = fetch_demo_fy2025_components(&pool).await;

    println!("\n=== Testing Budget Realism and Fiscal Feasibility ===");

    // CRITICAL: Verify planning produces realistic budget trajectories
    // Unrealistic plans damage government credibility with MOF, donors, parliament

    let planning_years = 5;
    let target_fsfvi = 0.25;

    let result = service
        .generate_multi_year_plan(
            components.clone(),
            Some("Demo Republic".to_string()),
            planning_years,
            target_fsfvi,
            None,
        )
        .await;

    match result {
        Ok(response) => {
            let plan = response.data;

            println!("=== Budget Realism Checks ===");

            if !plan.target_already_achieved {
                // Check 1: No single-year budget spikes (> 50% increase)
                for i in 1..plan.yearly_plans.len() {
                    let prev_budget = plan.yearly_plans[i - 1].total_budget;
                    let curr_budget = plan.yearly_plans[i].total_budget;
                    let increase_pct = ((curr_budget - prev_budget) / prev_budget) * 100.0;

                    println!("Year {} → Year {}: {:+.1}% budget change",
                        i, i + 1, increase_pct);

                    assert!(
                        increase_pct.abs() < 50.0,
                        "Year-to-year budget change should be gradual (< 50%), got {:.1}%",
                        increase_pct
                    );
                }
                println!("✓ No unrealistic budget spikes");

                // Check 2: Total budget growth is reasonable
                let initial_budget = plan.yearly_plans.first().unwrap().total_budget;
                let final_budget = plan.yearly_plans.last().unwrap().total_budget;
                let total_growth_pct = ((final_budget - initial_budget) / initial_budget) * 100.0;

                println!("\nTotal {}-year budget growth: {:.1}%", planning_years, total_growth_pct);

                // Total growth should be < 100% (doubling) over 5 years
                assert!(
                    total_growth_pct < 100.0,
                    "Total budget growth should be < 100% over planning period"
                );
                println!("✓ Total growth is fiscally realistic");

                // Check 3: No component gets zero allocation
                for year_plan in &plan.yearly_plans {
                    for (comp_type, allocation) in &year_plan.recommended_allocations {
                        assert!(
                            *allocation > 0.0,
                            "Year {} component {} should have positive allocation",
                            year_plan.year,
                            comp_type
                        );
                    }
                }
                println!("✓ All components maintained across planning horizon");

                // Check 4: Budget aligns with FSFVI reduction ambition
                let fsfvi_reduction_pct = ((plan.baseline_fsfvi - plan.yearly_plans.last().unwrap().projected_fsfvi) / plan.baseline_fsfvi) * 100.0;

                println!("\nFSFVI Reduction: {:.1}%", fsfvi_reduction_pct);
                println!("Budget Increase: {:.1}%", total_growth_pct);

                // Rough check: significant FSFVI reduction should require budget increase
                if fsfvi_reduction_pct > 20.0 {
                    assert!(
                        total_growth_pct > 0.0,
                        "Ambitious FSFVI reduction should require budget growth"
                    );
                }
                println!("✓ Budget aligned with improvement ambition");
            }
        }
        Err(e) => {
            panic!("Budget realism check failed: {:?}", e);
        }
    }
}
