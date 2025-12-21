mod config;
mod handlers;
mod middleware;
mod models;
mod services;
mod utils;

// FSFVI modules
mod fsfvi;
mod fsfvi_api;

use actix_cors::Cors;
use actix_governor::{Governor, GovernorConfigBuilder};
use actix_web::{middleware::Logger, web, App, HttpServer};
use dotenv::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use config::AppConfig;
use fsfvi::service::FsfviService;
use fsfvi_api::handlers::FsfviApiState;
use fsfvi_api::openapi::ApiDoc;
use middleware::{auth::AuthMiddleware, api_key_auth::ApiKeyAuth};
use models::user::UserRole;
use services::jwt::JwtService;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables
    dotenv().ok();

    // Initialize tracing/logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "fsfi_backend=debug,actix_web=info".into()),
        )
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    tracing::info!("🚀 Starting FSFI Backend Server...");

    // Load configuration
    let config = AppConfig::from_env().expect("Failed to load configuration");

    // Database connection pool
    let db_pool = PgPoolOptions::new()
        .max_connections(config.database.max_connections)
        .connect(&config.database.url)
        .await
        .expect("Failed to create database pool");

    tracing::info!("✅ Database connection established");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&db_pool)
        .await
        .expect("Failed to run migrations");

    tracing::info!("✅ Database migrations completed");

    // Initialize JWT service for authentication
    let jwt_service = Arc::new(JwtService::new(
        &config.jwt.secret,
        config.jwt.access_token_expiry,
        config.jwt.refresh_token_expiry,
    ));
    tracing::info!("✅ JWT service initialized");

    // Initialize FSFVI service
    let fsfvi_service = Arc::new(FsfviService::new());
    tracing::info!("✅ FSFVI service initialized");

    // Create FSFVI API state
    let fsfvi_api_state = web::Data::new(FsfviApiState {
        fsfvi_service: fsfvi_service.clone(),
        db_pool: db_pool.clone(),
    });
    tracing::info!("✅ FSFVI API state configured");

    // Rate limiting configuration
    let governor_conf = GovernorConfigBuilder::default()
        .per_second(config.rate_limit.per_second)
        .burst_size(config.rate_limit.burst_size)
        .finish()
        .unwrap();

    let server_host = config.server.host.clone();
    let server_port = config.server.port;
    let allowed_origins = config.security.allowed_origins.clone();
    let max_request_size = config.security.max_request_size;

    tracing::info!("🌐 Starting HTTP server on {}:{}", server_host, server_port);
    tracing::info!("📚 API Documentation available at http://{}:{}/swagger-ui/", server_host, server_port);
    tracing::info!("✅ Server is ready to accept connections!");

    // Start HTTP server
    HttpServer::new(move || {
        let allowed_origins_clone = allowed_origins.clone();

        // CORS configuration
        let cors = Cors::default()
            .allowed_origin_fn(move |origin, _req_head| {
                allowed_origins_clone
                    .iter()
                    .any(|allowed| origin.as_bytes() == allowed.as_bytes())
            })
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "PATCH"])
            .allowed_headers(vec![
                actix_web::http::header::AUTHORIZATION,
                actix_web::http::header::ACCEPT,
                actix_web::http::header::CONTENT_TYPE,
                actix_web::http::header::HeaderName::from_static("x-api-key"),
            ])
            .max_age(3600);

        // Create auth middleware for different roles
        let developer_auth = AuthMiddleware::new((*jwt_service).clone())
            .with_roles(vec![UserRole::Developer, UserRole::Admin]);
        let admin_auth = AuthMiddleware::new((*jwt_service).clone())
            .with_roles(vec![UserRole::Admin]);

        // Create API key middleware for government API access
        let api_key_auth = ApiKeyAuth::new(db_pool.clone());

        App::new()
            // Middleware
            .wrap(Logger::default())
            .wrap(cors)
            .wrap(Governor::new(&governor_conf))
            .wrap(middleware::security_headers::SecurityHeaders)
            // Shared state
            .app_data(web::Data::new(db_pool.clone()))
            .app_data(web::Data::new(config.clone()))
            .app_data(fsfvi_api_state.clone())
            .app_data(web::Data::new((*jwt_service).clone()))
            // Set max request payload size
            .app_data(web::PayloadConfig::new(max_request_size))
            .app_data(web::JsonConfig::default().limit(max_request_size))
            // Public routes
            .configure(handlers::auth::configure)
            // Health check (public)
            .route("/health", web::get().to(handlers::health::health_check))
            // OpenAPI/Swagger UI (public - for government developers)
            .service(
                SwaggerUi::new("/swagger-ui/{_:.*}")
                    .url("/api-docs/openapi.json", ApiDoc::openapi())
            )
            // Admin-only routes (FSFI company admin)
            .service(
                web::scope("/api/v1/admin")
                    .wrap(admin_auth.clone())
                    .configure(handlers::admin::configure)
            )
            // FSFVI API endpoints (JWT OR API Key auth for governments)
            // IMPORTANT: Must come BEFORE /api/v1 to match more specific routes first
            .service(
                web::scope("/api/v1/fsfvi")
                    .wrap(api_key_auth)
                    .configure(fsfvi_api::routes::configure_fsfvi_routes)
            )
            // Government routes (JWT auth, Developer or Admin role)
            .service(
                web::scope("/api/v1")
                    .wrap(developer_auth.clone())
                    .configure(handlers::government::configure)
                    .configure(handlers::api_key::configure)
                    .configure(handlers::mfa::configure)
                    .configure(handlers::user::configure)
            )
    })
    .bind((server_host.as_str(), server_port))?
    .run()
    .await
}
