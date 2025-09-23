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
    change_password, health_check, login, logout, verify_token, 
    prepare_two_fa_setup, setup_two_fa, verify_two_fa, disable_two_fa, AppState,
};
use crate::middleware::security::{RequestLogging, SecurityHeaders};
use crate::models::auth::SecurityConfig;
use crate::services::{
    auth_service::AuthService, password_service::PasswordService, token_service::TokenService,
};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables
    dotenv().ok();

    // Initialize logging
    env_logger::init_from_env(Env::default().default_filter_or("info"));

    log::info!("🇰🇪 Starting Kenya FSFVI Authentication Server");

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

    let password_service = PasswordService::new();
    let token_service = TokenService::new(security_config);
    let auth_service = AuthService::new(db_pool.clone(), password_service, token_service);

    // Initialize default government user if none exists
    log::info!("Initializing default user if needed...");
    if let Err(e) = auth_service.initialize_default_user().await {
        log::error!("Failed to initialize default user: {}", e);
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("Failed to initialize default user: {}", e),
        ));
    }

    // Create application state
    let app_state = web::Data::new(AppState {
        auth_service: Mutex::new(auth_service),
    });

    // Get server configuration from config
    let host = config.host;
    let port = config.port;

    log::info!("🚀 Server starting on {}:{}", host, port);
    log::info!("🔒 Security features enabled:");
    log::info!("   ✓ JWT authentication with 8-hour expiration");
    log::info!("   ✓ Argon2 password hashing");
    log::info!("   ✓ Rate limiting and security headers");
    log::info!("   ✓ Comprehensive audit logging");
    log::info!("   ✓ Session management with 30-minute timeout");
    log::info!("   ✓ Account lockout after 5 failed attempts");

    // Start HTTP server
    let cors_origins = config.cors_origins.clone();
    HttpServer::new(move || {
        // CORS configuration - restrict to Kenya frontend only
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
            .wrap(cors)
            .wrap(SecurityHeaders)
            .wrap(RequestLogging)
            .service(
                web::scope("/api")
                    .service(
                        web::scope("/auth")
                            .route("/login", web::post().to(login))
                            .route("/change-password", web::post().to(change_password))
                            .route("/verify", web::get().to(verify_token))
                            .route("/logout", web::post().to(logout))
                            .route("/2fa/prepare", web::get().to(prepare_two_fa_setup))
                            .route("/2fa/setup", web::post().to(setup_two_fa))
                            .route("/2fa/verify", web::post().to(verify_two_fa))
                            .route("/2fa/disable", web::post().to(disable_two_fa)),
                    )
                    .route("/health", web::get().to(health_check)),
            )
    })
    .bind((host, port))?
    .run()
    .await
}

// Utility functions for database initialization
async fn run_initial_migration(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let migration_sql = include_str!("../migrations/001_initial.sql");

    // Split the SQL into individual statements and execute them
    for statement in migration_sql.split(';') {
        let statement = statement.trim();
        if !statement.is_empty() {
            sqlx::query(statement).execute(pool).await?;
        }
    }

    Ok(())
}
