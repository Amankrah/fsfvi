mod config;
mod handlers;
mod middleware;
mod models;
mod services;
mod utils;

use actix_cors::Cors;
use actix_web::{web, App, HttpServer};
use dotenv::dotenv;
use env_logger::Env;
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::sync::Mutex;

use crate::config::AppConfig;
use crate::handlers::auth_handler::{
    change_password, check_password_strength, health_check, login, logout, verify_token,
    prepare_two_fa_setup, setup_two_fa, verify_two_fa, disable_two_fa, get_session, get_audit_logs,
    get_security_dashboard, AppState,
};
use crate::handlers::fsfvi_handler::{
    // Performance Gap Analysis
    analyze_performance_gaps, peer_comparison, track_gap_closure, recommend_targets,
    // Assessments
    run_assessment, quick_check,
    // Strategic Planning
    generate_multi_year_plan, generate_mtef, get_historical_trends,
    // Budget Optimization
    analyze_allocation_efficiency, calculate_roi, generate_reallocation_plan, optimize_allocation,
    // Weighting Analysis
    analyze_scenario_sensitivity_hybrid, analyze_scenario_sensitivity_expert,
    analyze_financial_weights, get_available_scenarios,
    // Sensitivity Analysis
    run_sensitivity_analysis,
    // Scenario Simulation
    compare_scenarios, simulate_crisis, simulate_budget_changes, simulate_intervention,
    // Decision Support
    generate_policy_recommendations, generate_crisis_response, track_progress,
    generate_stakeholder_brief,
    // Matrix Generation
    generate_ahp_matrix, generate_network_matrix, customize_ahp_matrix, export_matrices_csv,
    // Health
    health_check as fsfvi_health_check,
    // State
    FsfviAppState,
};
use crate::middleware::security::{RateLimiting, RequestLogging, SecurityHeaders};
use crate::models::auth::SecurityConfig;
use crate::services::{
    auth_service::AuthService,
    password_service::PasswordService,
    token_service::TokenService,
};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables
    dotenv().ok();

    // Initialize logging
    env_logger::init_from_env(Env::default().default_filter_or("info"));

    log::info!("Starting Demo Government Authentication Server");

    // Load configuration
    let config = AppConfig::from_env();

    // Initialize database
    let database_url = config.database_url;
    log::info!("Connecting to database: {}", database_url);

    let db_pool = SqlitePoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Run migrations
    log::info!("Running database migrations...");
    run_initial_migration(&db_pool)
        .await
        .expect("Failed to run migrations");

    // Initialize services
    let security_config = SecurityConfig {
        jwt_secret: config.jwt_secret,
        jwt_expiration_hours: 8, // 8 hours
        password_salt_rounds: 12,
        session_timeout_minutes: 30,
        require_password_change: true,
        ..Default::default()
    };

    // CRITICAL: Initialize password service with government-specific password policy AND bcrypt cost
    // This allows different governments to meet their specific security compliance requirements
    // (e.g., NIST 800-63B, NATO security standards, or local government regulations)
    let password_service = PasswordService::with_policy_and_bcrypt_cost(
        config.password_policy.clone(),
        security_config.password_salt_rounds
    );
    let token_service = TokenService::new(security_config.clone());
    let auth_service = AuthService::new(db_pool.clone(), password_service, token_service.clone(), security_config.clone());

    // Initialize default government user if none exists
    log::info!("Initializing default user if needed...");
    if let Err(e) = auth_service.initialize_default_user().await {
        log::error!("Failed to initialize default user: {}", e);
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("Failed to initialize default user: {}", e),
        ));
    }

    // Initialize FSFVI services state
    log::info!("Initializing FSFVI services...");
    let fsfvi_state = web::Data::new(FsfviAppState::new(
        db_pool.clone(),
        config.fsfvi_api_url.clone(),
        config.fsfvi_api_key.clone(),
    ));

    // Create auth application state
    let app_state = web::Data::new(AppState {
        auth_service: Mutex::new(auth_service),
    });

    // Get server configuration from config
    let host = config.host;
    let port = config.port;

    log::info!("🚀 Server starting on {}:{}", host, port);
    log::info!("🌍 Environment: {:?}", config.environment);
    log::info!("🔗 FSFVI API URL: {}", config.fsfvi_api_url);
    log::info!("🔒 Security features enabled:");
    log::info!("   ✓ JWT authentication with 8-hour expiration");
    log::info!("   ✓ Argon2 password hashing");
    log::info!("   ✓ Rate limiting and security headers");
    log::info!("   ✓ Comprehensive audit logging");
    log::info!("   ✓ Session management with 30-minute timeout");
    log::info!("   ✓ Account lockout after 5 failed attempts");
    log::info!("📊 FSFVI Services initialized:");
    log::info!("   ✓ Performance Gap Analysis (4 endpoints)");
    log::info!("   ✓ Vulnerability Assessments (2 endpoints)");
    log::info!("   ✓ Strategic Planning (2 endpoints)");
    log::info!("   ✓ Budget Optimization (3 endpoints)");
    log::info!("   ✓ Weighting Analysis (4 endpoints)");
    log::info!("   ✓ Sensitivity Analysis (1 endpoint)");
    log::info!("   ✓ Scenario Simulation (4 endpoints)");
    log::info!("   ✓ Decision Support (4 endpoints)");
    log::info!("   ✓ Matrix Generation (4 endpoints)");
    log::info!("   ✓ Total: 34 FSFVI endpoints ready");

    // Start HTTP server
    let cors_origins = config.cors_origins.clone();
    let rate_limit = config.rate_limit_per_minute;
    HttpServer::new(move || {
        // CORS configuration - restrict to Demo Government frontend only
        let mut cors = Cors::default();
        for origin in &cors_origins {
            cors = cors.allowed_origin(origin);
        }
        let cors = cors
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec!["Authorization", "Content-Type", "X-Requested-With"])
            .max_age(3600)
            .supports_credentials();

        App::new()
            .app_data(app_state.clone())
            .app_data(fsfvi_state.clone())
            .wrap(cors)
            .wrap(SecurityHeaders)
            .wrap(RequestLogging)
            // CRITICAL: Rate limiting prevents abuse and ensures fair resource allocation
            // Configured from environment variable RATE_LIMIT_PER_MINUTE (default: 60)
            .wrap(RateLimiting::new(rate_limit))
            .service(
                web::scope("/api")
                    // Authentication endpoints
                    .service(
                        web::scope("/auth")
                            .route("/login", web::post().to(login))
                            .route("/change-password", web::post().to(change_password))
                            .route("/verify", web::get().to(verify_token))
                            .route("/logout", web::post().to(logout))
                            .route("/session", web::get().to(get_session))
                            .route("/audit-logs", web::get().to(get_audit_logs))
                            .route("/security-dashboard", web::get().to(get_security_dashboard))
                            .route("/password-strength", web::post().to(check_password_strength))
                            .route("/2fa/prepare", web::get().to(prepare_two_fa_setup))
                            .route("/2fa/setup", web::post().to(setup_two_fa))
                            .route("/2fa/verify", web::post().to(verify_two_fa))
                            .route("/2fa/disable", web::post().to(disable_two_fa)),
                    )
                    // FSFVI Government API endpoints
                    .service(
                        web::scope("/government/fsfvi")
                            // Health check
                            .route("/health", web::get().to(fsfvi_health_check))

                            // Performance Gap Analysis
                            .service(
                                web::scope("/performance-gaps")
                                    .route("/analyze", web::get().to(analyze_performance_gaps))
                                    .route("/peer-comparison", web::post().to(peer_comparison))
                                    .route("/track-gap-closure", web::post().to(track_gap_closure))
                                    .route("/recommend-targets", web::post().to(recommend_targets)),
                            )

                            // Assessments
                            .service(
                                web::scope("/assessments")
                                    .route("/run", web::post().to(run_assessment))
                                    .route("/quick-check", web::post().to(quick_check)),
                            )

                            // Strategic Planning
                            .service(
                                web::scope("/strategic-planning")
                                    .route("/multi-year-plan", web::post().to(generate_multi_year_plan))
                                    .route("/mtef", web::post().to(generate_mtef))
                                    .route("/historical-trends", web::get().to(get_historical_trends)),
                            )

                            // Budget Optimization
                            .service(
                                web::scope("/budget-optimization")
                                    .route("/analyze-efficiency", web::post().to(analyze_allocation_efficiency))
                                    .route("/calculate-roi", web::post().to(calculate_roi))
                                    .route("/generate-plan", web::post().to(generate_reallocation_plan))
                                    .route("/optimize", web::post().to(optimize_allocation)),
                            )

                            // Weighting Analysis
                            .service(
                                web::scope("/weighting-analysis")
                                    .route("/scenario-sensitivity-hybrid", web::post().to(analyze_scenario_sensitivity_hybrid))
                                    .route("/scenario-sensitivity-expert", web::post().to(analyze_scenario_sensitivity_expert))
                                    .route("/financial", web::post().to(analyze_financial_weights))
                                    .route("/available-scenarios", web::get().to(get_available_scenarios)),
                            )

                            // Sensitivity Analysis
                            .service(
                                web::scope("/sensitivity-analysis")
                                    .route("/run", web::post().to(run_sensitivity_analysis)),
                            )

                            // Scenario Simulation
                            .service(
                                web::scope("/scenarios")
                                    .route("/compare", web::post().to(compare_scenarios))
                                    .route("/crisis", web::post().to(simulate_crisis))
                                    .route("/budget-change", web::post().to(simulate_budget_changes))
                                    .route("/intervention", web::post().to(simulate_intervention)),
                            )

                            // Decision Support
                            .service(
                                web::scope("/decision-support")
                                    .route("/policy-recommendations", web::post().to(generate_policy_recommendations))
                                    .route("/crisis-response", web::post().to(generate_crisis_response))
                                    .route("/track-progress", web::post().to(track_progress))
                                    .route("/stakeholder-brief", web::post().to(generate_stakeholder_brief)),
                            )

                            // Matrix Generation
                            .service(
                                web::scope("/matrices")
                                    .route("/ahp", web::get().to(generate_ahp_matrix))
                                    .route("/network", web::get().to(generate_network_matrix))
                                    .route("/ahp/customize", web::post().to(customize_ahp_matrix))
                                    .route("/export", web::get().to(export_matrices_csv)),
                            ),
                    )
                    // General health check
                    .route("/health", web::get().to(health_check)),
            )
    })
    .bind((host, port))?
    .run()
    .await
}

// Utility functions for database initialization
async fn run_initial_migration(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Run all migrations in order
    let migrations = vec![
        ("001_auth.sql", include_str!("../migrations/001_auth.sql")),
        ("002_raw_data.sql", include_str!("../migrations/002_raw_data.sql")),
        ("003_fsfvi_data.sql", include_str!("../migrations/003_fsfvi_data.sql")),
        ("004_fsfvi_results.sql", include_str!("../migrations/004_fsfvi_results.sql")),
    ];

    for (name, migration_sql) in migrations {
        log::info!("Running migration: {}", name);

        // Split the SQL into individual statements and execute them
        for statement in migration_sql.split(';') {
            let statement = statement.trim();
            if !statement.is_empty() && !statement.starts_with("--") {
                sqlx::query(statement).execute(pool).await?;
            }
        }
    }

    log::info!("All migrations completed successfully");
    Ok(())
}
