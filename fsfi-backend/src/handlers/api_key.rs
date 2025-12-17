use actix_web::{web, HttpMessage, HttpRequest, HttpResponse, Responder};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::{
    models::{
        api_key::{ApiKeyListItem, CreateApiKeyRequest, CreateApiKeyResponse, RevokeApiKeyRequest},
        user::UserRole,
        ApiResponse,
    },
    services::{api_key::ApiKeyService, jwt::Claims},
};

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api-keys")
            .route("", web::post().to(create_api_key))
            .route("", web::get().to(list_api_keys))
            .route("/{id}/revoke", web::post().to(revoke_api_key))
    )
    .route("/scopes", web::get().to(get_available_scopes));
}

async fn create_api_key(
    req: HttpRequest,
    body: web::Json<CreateApiKeyRequest>,
    db_pool: web::Data<PgPool>,
) -> impl Responder {
    // Validate request
    if let Err(e) = body.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!(
            "Validation error: {}",
            e
        )));
    }

    // Get user from JWT claims
    let claims = req.extensions().get::<Claims>().cloned();
    if claims.is_none() {
        return HttpResponse::Unauthorized()
            .json(ApiResponse::<()>::error("Unauthorized".to_string()));
    }
    let claims = claims.unwrap();

    // ============================================================================
    // CRITICAL SECURITY CHECK: ONLY DEVELOPERS CAN CREATE API KEYS
    // Admins can view/revoke keys but NEVER create them
    // ============================================================================
    if claims.role != UserRole::Developer {
        tracing::warn!(
            "🚫 SECURITY VIOLATION: User {} (role: {:?}) attempted to create API key. Only developers can create keys.",
            claims.sub,
            claims.role
        );
        return HttpResponse::Forbidden().json(ApiResponse::<()>::error(
            "Forbidden: Only developers can create API keys. Admins can view and manage existing keys via the admin panel.".to_string()
        ));
    }

    let user_id = Uuid::parse_str(&claims.sub).unwrap();
    let government_id = Uuid::parse_str(&claims.government_id).unwrap();

    // ============================================================================
    // CRITICAL SECURITY CHECK 1: Fetch government security settings AND allowed scopes
    // ============================================================================
    let gov_settings = sqlx::query!(
        r#"
        SELECT max_active_api_keys, mandatory_rotation_days, api_key_expiry_days, allowed_endpoints
        FROM governments
        WHERE id = $1
        "#,
        government_id
    )
    .fetch_one(db_pool.get_ref())
    .await;

    let (max_active_keys, mandatory_rotation_days, government_api_key_expiry_days, allowed_endpoints) = match gov_settings {
        Ok(row) => (row.max_active_api_keys, row.mandatory_rotation_days, row.api_key_expiry_days, row.allowed_endpoints),
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Failed to fetch government settings".to_string()));
        }
    };

    // Parse the allowed_endpoints (scopes) assigned by admin to this government
    let scopes: Vec<String> = serde_json::from_value(allowed_endpoints)
        .unwrap_or_default();

    if scopes.is_empty() {
        return HttpResponse::Forbidden().json(ApiResponse::<()>::error(
            "No API scopes have been assigned to your government. Please contact your administrator.".to_string()
        ));
    }

    // ============================================================================
    // CRITICAL SECURITY CHECK 2: Enforce max active keys per government
    // ============================================================================
    let active_keys_count = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM api_keys
        WHERE government_id = $1
        AND status = 'active'::api_key_status
        AND (expires_at IS NULL OR expires_at > NOW())
        "#,
        government_id
    )
    .fetch_one(db_pool.get_ref())
    .await;

    if let Ok(record) = active_keys_count {
        let count = record.count.unwrap_or(0);
        if count >= max_active_keys as i64 {
            return HttpResponse::Forbidden().json(ApiResponse::<()>::error(format!(
                "Maximum active API keys limit reached ({}/{}). Please revoke an existing key before creating a new one.",
                count, max_active_keys
            )));
        }
    }

    // ============================================================================
    // CRITICAL SECURITY CONTROL 3: One-Key-Per-User Policy
    // Automatically revoke ALL existing active keys for this user
    // ============================================================================
    let revoke_result = sqlx::query!(
        r#"
        UPDATE api_keys
        SET status = 'revoked'::api_key_status,
            revoked_at = NOW(),
            revoked_by_user_id = $1,
            revocation_reason = 'Automatically revoked due to new API key generation (one-key-per-user policy)'
        WHERE created_by_user_id = $1
        AND government_id = $2
        AND status = 'active'::api_key_status
        RETURNING id
        "#,
        user_id,
        government_id
    )
    .fetch_all(db_pool.get_ref())
    .await;

    // Log how many keys were revoked (for audit trail)
    let revoked_count = revoke_result.map(|keys| keys.len()).unwrap_or(0);
    if revoked_count > 0 {
        tracing::info!(
            "Auto-revoked {} existing API key(s) for user {} due to one-key-per-user policy",
            revoked_count,
            user_id
        );
    }

    // ============================================================================
    // CRITICAL BUSINESS LOGIC: API Key Expiration Inheritance
    // ============================================================================
    // IMPORTANT: Developer users INHERIT the government's api_key_expiry_days.
    // The government entity is the source of truth for ALL API key expiration policies.
    // This ensures consistency: One government = One unified API key expiration policy.
    //
    // Priority order:
    // 1. Use government.api_key_expiry_days (authoritative source)
    // 2. Fall back to user.api_key_expiry_days ONLY if government value is NULL (backward compatibility)
    //
    // This design ensures:
    // - All API keys from the SAME government have THE SAME expiration policy
    // - Government dashboard and user dashboard show CONSISTENT expiration dates
    // - Government is the parent entity holding the contract (as it should be)
    let api_key_expiry_days = if government_api_key_expiry_days.is_some() {
        // Government has set an expiration policy - USE IT (authoritative)
        government_api_key_expiry_days
    } else {
        // Government hasn't set a policy yet - fall back to user setting for backward compatibility
        // Fetch user's api_key_expiry_days as fallback
        let user_expiry_result = sqlx::query!(
            r#"SELECT api_key_expiry_days FROM users WHERE id = $1"#,
            user_id
        )
        .fetch_one(db_pool.get_ref())
        .await;

        match user_expiry_result {
            Ok(row) => row.api_key_expiry_days,
            Err(_) => {
                return HttpResponse::InternalServerError()
                    .json(ApiResponse::<()>::error("Failed to fetch user settings".to_string()));
            }
        }
    };

    // Generate API key
    let api_key = ApiKeyService::generate_api_key();
    let key_hash = ApiKeyService::hash_api_key(&api_key);
    let key_prefix = ApiKeyService::get_key_prefix(&api_key);

    // Calculate expiration date based on government's setting (authoritative source)
    // Developer cannot override this - it's enforced from government-level admin settings
    let expires_at = api_key_expiry_days
        .map(|days| Utc::now() + chrono::Duration::days(days as i64));

    // ============================================================================
    // CRITICAL SECURITY CONTROL 4: Mandatory Rotation Deadline
    // ============================================================================
    let must_rotate_by = mandatory_rotation_days
        .map(|days| Utc::now() + chrono::Duration::days(days as i64));

    // Insert into database
    // Use government's allowed_endpoints as the API key scopes (not from request body)
    let api_key_id = Uuid::new_v4();
    let scopes_json = serde_json::to_value(&scopes).unwrap();

    let result = sqlx::query!(
        r#"
        INSERT INTO api_keys (
            id, government_id, created_by_user_id, name,
            key_hash, key_prefix, scopes, expires_at, must_rotate_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, created_at
        "#,
        api_key_id,
        government_id,
        user_id,
        body.name,
        key_hash,
        key_prefix,
        scopes_json,
        expires_at,
        must_rotate_by
    )
    .fetch_one(db_pool.get_ref())
    .await;

    match result {
        Ok(record) => {
            let response = CreateApiKeyResponse {
                id: record.id,
                name: body.name.clone(),
                api_key: api_key.clone(),
                key_prefix,
                scopes: scopes.clone(), // Return government's scopes, not from request
                expires_at,
                created_at: record.created_at,
            };

            HttpResponse::Created().json(ApiResponse::success(response))
        }
        Err(_) => HttpResponse::InternalServerError()
            .json(ApiResponse::<()>::error("Failed to create API key".to_string())),
    }
}

async fn list_api_keys(req: HttpRequest, db_pool: web::Data<PgPool>) -> impl Responder {
    let claims = req.extensions().get::<Claims>().cloned();
    if claims.is_none() {
        return HttpResponse::Unauthorized()
            .json(ApiResponse::<()>::error("Unauthorized".to_string()));
    }
    let claims = claims.unwrap();
    let government_id = Uuid::parse_str(&claims.government_id).unwrap();

    let api_keys = sqlx::query_as!(
        ApiKeyListItem,
        r#"
        SELECT
            id,
            name,
            key_prefix,
            status as "status: crate::models::api_key::ApiKeyStatus",
            scopes,
            last_used,
            usage_count,
            created_at,
            expires_at,
            revoked_at
        FROM api_keys
        WHERE government_id = $1
        ORDER BY created_at DESC
        "#,
        government_id
    )
    .fetch_all(db_pool.get_ref())
    .await;

    match api_keys {
        Ok(keys) => HttpResponse::Ok().json(ApiResponse::success(keys)),
        Err(_) => HttpResponse::InternalServerError()
            .json(ApiResponse::<()>::error("Database error".to_string())),
    }
}

async fn revoke_api_key(
    req: HttpRequest,
    id: web::Path<Uuid>,
    body: web::Json<RevokeApiKeyRequest>,
    db_pool: web::Data<PgPool>,
) -> impl Responder {
    let claims = req.extensions().get::<Claims>().cloned();
    if claims.is_none() {
        return HttpResponse::Unauthorized()
            .json(ApiResponse::<()>::error("Unauthorized".to_string()));
    }
    let claims = claims.unwrap();
    let user_id = Uuid::parse_str(&claims.sub).unwrap();
    let government_id = Uuid::parse_str(&claims.government_id).unwrap();

    let result = sqlx::query!(
        r#"
        UPDATE api_keys
        SET
            status = 'revoked'::api_key_status,
            revoked_at = NOW(),
            revoked_by_user_id = $1,
            revocation_reason = $2
        WHERE id = $3 AND government_id = $4
        RETURNING id
        "#,
        user_id,
        body.reason,
        *id,
        government_id
    )
    .fetch_optional(db_pool.get_ref())
    .await;

    match result {
        Ok(Some(_)) => HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
            "message": "API key revoked successfully"
        }))),
        Ok(None) => {
            HttpResponse::NotFound().json(ApiResponse::<()>::error("API key not found".to_string()))
        }
        Err(_) => HttpResponse::InternalServerError()
            .json(ApiResponse::<()>::error("Database error".to_string())),
    }
}

/// GET /api/v1/scopes
/// Get allowed scopes for the developer's government
/// These scopes are assigned by admin to the government, not chosen by developer
async fn get_available_scopes(req: HttpRequest, db_pool: web::Data<PgPool>) -> impl Responder {
    // Get government_id from JWT claims
    let claims = req.extensions().get::<Claims>().cloned();
    if claims.is_none() {
        return HttpResponse::Unauthorized()
            .json(ApiResponse::<()>::error("Unauthorized".to_string()));
    }
    let claims = claims.unwrap();
    let government_id = Uuid::parse_str(&claims.government_id).unwrap();

    // Fetch the allowed_endpoints (scopes) from the government record
    let result = sqlx::query!(
        r#"
        SELECT allowed_endpoints
        FROM governments
        WHERE id = $1
        "#,
        government_id
    )
    .fetch_one(db_pool.get_ref())
    .await;

    match result {
        Ok(row) => {
            // Parse the JSONB array of allowed endpoints
            let scopes: Vec<String> = serde_json::from_value(row.allowed_endpoints)
                .unwrap_or_default();

            // Create descriptions map for each scope
            let mut descriptions = serde_json::Map::new();
            for scope in &scopes {
                let description = match scope.as_str() {
                    "*" => "Full access to all endpoints (admin/testing only)",
                    "fsfvi:assessments" => "Run vulnerability assessments",
                    "fsfvi:strategic-planning" => "Multi-year plans, MTEF, investment sequencing",
                    "fsfvi:budget-optimization" => "Budget efficiency & ROI analysis",
                    "fsfvi:weighting-analysis" => "Methodology validation & transparency",
                    "fsfvi:performance-gaps" => "Performance gap analysis & peer comparison",
                    "fsfvi:sensitivity-analysis" => "Sensitivity & robustness testing",
                    "fsfvi:matrices" => "AHP & network matrix generation",
                    "fsfvi:scenarios" => "Scenario simulation & comparison",
                    "fsfvi:decision-support" => "Policy recommendations & crisis response",
                    _ => "Unknown scope",
                };
                descriptions.insert(scope.clone(), serde_json::json!(description));
            }

            HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
                "scopes": scopes,
                "descriptions": descriptions
            })))
        }
        Err(_) => HttpResponse::InternalServerError()
            .json(ApiResponse::<()>::error("Failed to fetch government scopes".to_string())),
    }
}
