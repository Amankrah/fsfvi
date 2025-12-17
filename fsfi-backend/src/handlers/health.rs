/// Health Check Handlers
/// ADMIN-ONLY endpoints for system monitoring
///
/// Food Systems Financial Intelligence (FSFI)
/// Government-level system for tracking financial flows in food systems

use actix_web::{web, HttpMessage, HttpRequest, HttpResponse, Responder};
use serde::Serialize;
use serde_json::json;
use sqlx::PgPool;
use std::time::Instant;

use crate::services::jwt::Claims;

/// Basic health check - public endpoint for load balancers
pub async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(json!({
        "status": "healthy",
        "service": "FSFI Backend",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}

#[derive(Debug, Serialize)]
pub struct DetailedHealthResponse {
    pub status: String,
    pub database: DatabaseHealth,
    pub response_time_ms: u64,
    pub service: String,
    pub version: String,
    pub timestamp: String,
}

#[derive(Debug, Serialize)]
pub struct DatabaseHealth {
    pub status: String,
    pub response_time_ms: Option<u64>,
    pub active_connections: u32,
    pub max_connections: u32,
}

/// Detailed health check - ADMIN ONLY
/// GET /api/v1/admin/health
pub async fn admin_health_check(
    req: HttpRequest,
    db_pool: web::Data<PgPool>,
) -> HttpResponse {
    // Verify admin authentication
    let claims = match req.extensions().get::<Claims>() {
        Some(claims) => claims.clone(),
        None => {
            return HttpResponse::Unauthorized().json(json!({
                "success": false,
                "error": "Authentication required"
            }));
        }
    };

    // Only admins can access health metrics
    if claims.role != crate::models::user::UserRole::Admin {
        return HttpResponse::Forbidden().json(json!({
            "success": false,
            "error": "Admin access required for health metrics"
        }));
    }

    let request_start = Instant::now();

    // Measure REAL database response time
    let db_start = Instant::now();
    let db_result = sqlx::query!("SELECT 1 as health_check")
        .fetch_one(db_pool.get_ref())
        .await;
    let db_response_time = db_start.elapsed().as_millis() as u64;

    let (db_status, db_time) = match db_result {
        Ok(_) => {
            let status = if db_response_time > 500 {
                "slow"
            } else {
                "connected"
            };
            (status, Some(db_response_time))
        }
        Err(e) => {
            tracing::error!("🚨 DATABASE HEALTH CHECK FAILED: {:?}", e);
            ("disconnected", None)
        }
    };

    // Get REAL connection pool metrics
    let active_connections = db_pool.size();
    let max_connections = db_pool.options().get_max_connections();

    let total_response_time = request_start.elapsed().as_millis() as u64;

    let overall_status = match db_status {
        "connected" => "operational",
        "slow" => "degraded",
        _ => "down",
    };

    let response = DetailedHealthResponse {
        status: overall_status.to_string(),
        database: DatabaseHealth {
            status: db_status.to_string(),
            response_time_ms: db_time,
            active_connections,
            max_connections,
        },
        response_time_ms: total_response_time,
        service: "Food Systems Financial Intelligence".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };

    HttpResponse::Ok().json(json!({
        "success": true,
        "data": response
    }))
}
