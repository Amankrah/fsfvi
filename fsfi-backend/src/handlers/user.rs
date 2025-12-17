/// User Profile Endpoints for Developer Portal
/// Allows authenticated developers to access their own profile information

use actix_web::{web, HttpMessage, HttpRequest, HttpResponse, Responder};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    models::{user::User, ApiResponse},
    services::jwt::Claims,
};

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/users")
            .route("/me", web::get().to(get_current_user)),
    );
}

/// GET /api/v1/users/me
/// Get current authenticated user's full profile
///
/// This endpoint allows developers to fetch their complete profile information
/// after login. The login endpoint only returns minimal UserInfo, but this
/// endpoint returns the full User object needed for the developer portal UI.
///
/// Security:
/// - Requires JWT authentication (AuthMiddleware)
/// - Users can only access their own profile
/// - Sensitive fields (password_hash, mfa_secret) are stripped
///
/// Returns:
/// - Full User object with all profile fields
/// - MFA status
/// - Account status
/// - API key expiration policy
/// - Failed login attempts
/// - Account lock status
async fn get_current_user(
    req: HttpRequest,
    db_pool: web::Data<PgPool>,
) -> impl Responder {
    // Extract user claims from request extensions (added by AuthMiddleware)
    let claims = match req.extensions().get::<Claims>() {
        Some(claims) => claims.clone(),
        None => {
            return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(
                "Authentication required".to_string(),
            ))
        }
    };

    // Parse user ID from JWT claims
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Invalid user ID".to_string()))
        }
    };

    // Fetch full user profile from database
    let user_result = sqlx::query_as!(
        User,
        r#"
        SELECT
            id,
            government_id,
            email,
            password_hash,
            full_name,
            title,
            role as "role: crate::models::user::UserRole",
            status as "status: crate::models::user::UserStatus",
            mfa_enabled,
            mfa_secret,
            last_login,
            failed_login_attempts,
            locked_until,
            api_key_expiry_days,
            created_at,
            updated_at
        FROM users
        WHERE id = $1
        "#,
        user_id
    )
    .fetch_optional(db_pool.get_ref())
    .await;

    match user_result {
        Ok(Some(mut user)) => {
            // CRITICAL SECURITY: Strip sensitive fields before sending to client
            // Never expose password_hash or mfa_secret in API responses
            user.password_hash = String::from("***REDACTED***");
            user.mfa_secret = None;

            HttpResponse::Ok().json(ApiResponse::success(user))
        }
        Ok(None) => {
            // User not found (should never happen with valid JWT)
            tracing::error!("User {} from valid JWT not found in database", user_id);
            HttpResponse::NotFound()
                .json(ApiResponse::<()>::error("User not found".to_string()))
        }
        Err(e) => {
            tracing::error!("Database error fetching user {}: {:?}", user_id, e);
            HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Database error".to_string()))
        }
    }
}
