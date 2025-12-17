use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use sqlx::{PgPool, Row};
use uuid::Uuid;
use validator::Validate;

use crate::{
    middleware::{api_key_auth::ApiKeyAuthContext, rate_limit::{check_daily_quota, increment_api_usage}},
    models::{
        government::{CreateGovernmentRequest, UpdateGovernmentRequest, GovernmentListItem},
        user::{CreateUserRequest, UpdateUserRequest, ResetPasswordRequest, ResetPasswordResponse, User},
        api_key::{ApiKey, AdminRevokeApiKeyRequest, AdminApiKeyDetail},
        audit_log::{AuditLog, AuditAction},
        ApiResponse,
    },
    services::{password::PasswordService, auth::AuthService, api_key::ApiKeyService},
    utils::{error::AppError, validation::{validate_country_code, validate_scope, get_valid_scopes}},
    handlers::health::admin_health_check,
};

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.route("/governments", web::get().to(list_governments))
        .route("/governments", web::post().to(create_government))
        .route("/governments/{id}", web::get().to(get_government_by_id))
        .route("/governments/{id}", web::put().to(update_government))
        .route("/governments/{id}", web::delete().to(delete_government))
        .route("/governments/{id}/activate", web::post().to(activate_government))
        .route("/governments/{id}/suspend", web::post().to(suspend_government))
        .route("/governments/{id}/usage-stats", web::get().to(get_government_usage_stats))
        .route("/users", web::get().to(list_users))
        .route("/users", web::post().to(create_user))
        .route("/users/generate-password", web::get().to(generate_password))
        .route("/users/{user_id}", web::get().to(get_user_by_id))
        .route("/users/{user_id}", web::put().to(update_user))
        .route("/users/{user_id}/reset-password", web::post().to(reset_user_password))
        .route("/users/{user_id}/permissions", web::get().to(check_user_permissions))
        .route("/users/{user_id}/roles", web::put().to(update_user_role))
        .route("/quota-check/{government_id}", web::get().to(check_quota))
        .route("/api-keys/all", web::get().to(list_all_api_keys))
        .route("/api-keys/{id}/details", web::get().to(get_api_key_details))
        .route("/api-keys/{id}/revoke", web::post().to(admin_revoke_api_key))
        .route("/api-keys/verify", web::post().to(verify_api_key))
        .route("/audit-logs", web::get().to(get_audit_logs))
        .route("/audit-logs", web::post().to(create_audit_log))
        .route("/analytics/overview", web::get().to(get_analytics_overview))
        .route("/analytics/api-usage", web::get().to(get_api_usage_analytics))
        .route("/system/health", web::get().to(get_system_health))
        .route("/system/health/detailed", web::get().to(admin_health_check))
        .route("/security/alerts", web::get().to(get_security_alerts))
        .route("/config/scopes", web::get().to(get_available_scopes));
}

async fn list_governments(db_pool: web::Data<PgPool>) -> Result<HttpResponse, AppError> {
    let governments = sqlx::query_as!(
        GovernmentListItem,
        r#"
        SELECT
            id,
            country_code,
            country_name,
            government_name,
            government_type as "government_type: crate::models::government::GovernmentType",
            tier as "tier: crate::models::government::AccessTier",
            status as "status: crate::models::government::GovernmentStatus",
            contact_email,
            primary_contact_name,
            primary_contact_title,
            created_at,
            activated_at
        FROM governments
        ORDER BY country_name
        "#
    )
    .fetch_all(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(governments)))
}

async fn create_government(
    body: web::Json<CreateGovernmentRequest>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    // Validate request
    body.validate()
        .map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    // Validate country code
    validate_country_code(&body.country_code)
        .map_err(|_| AppError::ValidationError("Invalid country code".to_string()))?;

    // Validate scopes
    for scope in &body.allowed_endpoints {
        validate_scope(scope)
            .map_err(|_| AppError::ValidationError(format!("Invalid scope: {}", scope)))?;
    }

    let government_id = Uuid::new_v4();
    let allowed_endpoints_json = serde_json::to_value(&body.allowed_endpoints)
        .map_err(|e| AppError::InternalError(format!("JSON error: {}", e)))?;

    // Use regular query instead of query_as! to avoid type inference issues
    let result = sqlx::query!(
        r#"
        INSERT INTO governments (
            id, country_code, country_name, government_name, government_type,
            tier, status, contact_email, contact_phone, primary_contact_name,
            primary_contact_title, api_quota_daily, api_quota_monthly,
            allowed_endpoints, ip_whitelist, max_active_api_keys, mandatory_rotation_days, api_key_expiry_days
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id
        "#,
        government_id,
        body.country_code.to_uppercase(),
        body.country_name,
        body.government_name,
        body.government_type as _,
        body.tier as _,
        body.contact_email,
        body.contact_phone,
        body.primary_contact_name,
        body.primary_contact_title,
        body.api_quota_daily,
        body.api_quota_monthly,
        allowed_endpoints_json,
        body.ip_whitelist.as_ref().map(|w| serde_json::json!(w)),
        body.max_active_api_keys.unwrap_or(5),  // Default: 5 active keys
        body.mandatory_rotation_days,
        body.api_key_expiry_days
    )
    .fetch_one(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    Ok(HttpResponse::Created().json(ApiResponse::success(serde_json::json!({
        "id": result.id,
        "message": "Government created successfully"
    }))))
}

async fn update_government(
    id: web::Path<Uuid>,
    body: web::Json<UpdateGovernmentRequest>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    body.validate()
        .map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    // Build dynamic SQL update query
    let mut query = String::from("UPDATE governments SET updated_at = NOW()");
    let mut param_count = 1;
    let mut has_updates = false;

    if body.status.is_some() {
        param_count += 1;
        query.push_str(&format!(", status = ${}", param_count));
        has_updates = true;
    }
    if body.tier.is_some() {
        param_count += 1;
        query.push_str(&format!(", tier = ${}", param_count));
        has_updates = true;
    }
    if body.contact_email.is_some() {
        param_count += 1;
        query.push_str(&format!(", contact_email = ${}", param_count));
        has_updates = true;
    }
    if body.api_quota_daily.is_some() {
        param_count += 1;
        query.push_str(&format!(", api_quota_daily = ${}", param_count));
        has_updates = true;
    }
    if body.api_quota_monthly.is_some() {
        param_count += 1;
        query.push_str(&format!(", api_quota_monthly = ${}", param_count));
        has_updates = true;
    }
    if body.allowed_endpoints.is_some() {
        param_count += 1;
        query.push_str(&format!(", allowed_endpoints = ${}", param_count));
        has_updates = true;
    }
    if body.ip_whitelist.is_some() {
        param_count += 1;
        query.push_str(&format!(", ip_whitelist = ${}", param_count));
        has_updates = true;
    }
    // API Key Security Controls
    if body.max_active_api_keys.is_some() {
        param_count += 1;
        query.push_str(&format!(", max_active_api_keys = ${}", param_count));
        has_updates = true;
    }
    if body.mandatory_rotation_days.is_some() {
        param_count += 1;
        query.push_str(&format!(", mandatory_rotation_days = ${}", param_count));
        has_updates = true;
    }
    if body.api_key_expiry_days.is_some() {
        param_count += 1;
        query.push_str(&format!(", api_key_expiry_days = ${}", param_count));
        has_updates = true;
    }

    if !has_updates {
        return Err(AppError::ValidationError("No fields to update".to_string()));
    }

    query.push_str(" WHERE id = $1 RETURNING id");

    // Execute the update query
    let mut query_builder = sqlx::query(&query).bind(id.as_ref());

    if let Some(ref status) = body.status {
        query_builder = query_builder.bind(status);
    }
    if let Some(ref tier) = body.tier {
        query_builder = query_builder.bind(tier);
    }
    if let Some(ref email) = body.contact_email {
        query_builder = query_builder.bind(email);
    }
    if let Some(daily_quota) = body.api_quota_daily {
        query_builder = query_builder.bind(daily_quota);
    }
    if let Some(monthly_quota) = body.api_quota_monthly {
        query_builder = query_builder.bind(monthly_quota);
    }
    if let Some(ref endpoints) = body.allowed_endpoints {
        query_builder = query_builder.bind(serde_json::to_value(endpoints).unwrap());
    }
    if let Some(ref whitelist) = body.ip_whitelist {
        query_builder = query_builder.bind(serde_json::to_value(whitelist).unwrap());
    }
    // API Key Security Controls
    if let Some(max_keys) = body.max_active_api_keys {
        query_builder = query_builder.bind(max_keys);
    }
    if let Some(rotation_days) = body.mandatory_rotation_days {
        query_builder = query_builder.bind(rotation_days);
    }
    if let Some(expiry_days) = body.api_key_expiry_days {
        query_builder = query_builder.bind(expiry_days);
    }

    let result = query_builder
        .fetch_optional(db_pool.get_ref())
        .await
        .map_err(|e| AppError::DatabaseError(e))?;

    match result {
        Some(_) => Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
            "id": id.to_string(),
            "message": "Government updated successfully"
        })))),
        None => Err(AppError::NotFound("Government not found".to_string())),
    }
}

async fn activate_government(
    id: web::Path<Uuid>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let result = sqlx::query!(
        r#"
        UPDATE governments
        SET status = 'active', activated_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING id
        "#,
        id.as_ref()
    )
    .fetch_optional(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    match result {
        Some(_) => Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
            "id": id.to_string(),
            "message": "Government activated successfully"
        })))),
        None => Err(AppError::NotFound("Government not found".to_string())),
    }
}

async fn suspend_government(
    id: web::Path<Uuid>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let result = sqlx::query!(
        r#"
        UPDATE governments
        SET status = 'suspended', updated_at = NOW()
        WHERE id = $1
        RETURNING id
        "#,
        id.as_ref()
    )
    .fetch_optional(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    match result {
        Some(_) => Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
            "id": id.to_string(),
            "message": "Government suspended successfully"
        })))),
        None => Err(AppError::NotFound("Government not found".to_string())),
    }
}

/// Delete a government account (PERMANENT - requires careful consideration)
/// This will cascade delete all associated users, API keys, and usage data
async fn delete_government(
    id: web::Path<Uuid>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    // First, check if government exists and get details for logging
    let government = sqlx::query!(
        r#"
        SELECT government_name, country_name, status as "status: crate::models::government::GovernmentStatus"
        FROM governments
        WHERE id = $1
        "#,
        id.as_ref()
    )
    .fetch_optional(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    if government.is_none() {
        return Err(AppError::NotFound("Government not found".to_string()));
    }

    let gov = government.unwrap();

    // Security check: Prevent deletion of active governments (must be suspended first)
    if matches!(gov.status, crate::models::government::GovernmentStatus::Active) {
        return Err(AppError::ValidationError(
            "Cannot delete an active government. Please suspend it first for safety.".to_string()
        ));
    }

    // Count associated records for reporting
    let user_count = sqlx::query!(
        "SELECT COUNT(*) as count FROM users WHERE government_id = $1",
        id.as_ref()
    )
    .fetch_one(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?
    .count
    .unwrap_or(0);

    let api_key_count = sqlx::query!(
        "SELECT COUNT(*) as count FROM api_keys WHERE government_id = $1",
        id.as_ref()
    )
    .fetch_one(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?
    .count
    .unwrap_or(0);

    // Start transaction for atomic deletion
    let mut tx = db_pool.begin().await.map_err(|e| AppError::DatabaseError(e))?;

    // Delete associated records (respecting foreign key constraints)
    // Order matters: delete children first, then parent

    // 1. Delete API usage data
    sqlx::query!("DELETE FROM api_usage WHERE government_id = $1", id.as_ref())
        .execute(&mut *tx)
        .await
        .map_err(|e| AppError::DatabaseError(e))?;

    // 2. Delete audit logs
    sqlx::query!("DELETE FROM audit_logs WHERE government_id = $1", id.as_ref())
        .execute(&mut *tx)
        .await
        .map_err(|e| AppError::DatabaseError(e))?;

    // 3. Delete API keys
    sqlx::query!("DELETE FROM api_keys WHERE government_id = $1", id.as_ref())
        .execute(&mut *tx)
        .await
        .map_err(|e| AppError::DatabaseError(e))?;

    // 4. Delete users
    sqlx::query!("DELETE FROM users WHERE government_id = $1", id.as_ref())
        .execute(&mut *tx)
        .await
        .map_err(|e| AppError::DatabaseError(e))?;

    // 5. Finally, delete the government
    sqlx::query!("DELETE FROM governments WHERE id = $1", id.as_ref())
        .execute(&mut *tx)
        .await
        .map_err(|e| AppError::DatabaseError(e))?;

    // Commit transaction
    tx.commit().await.map_err(|e| AppError::DatabaseError(e))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "id": id.to_string(),
        "message": format!(
            "Government '{}' ({}) permanently deleted",
            gov.government_name, gov.country_name
        ),
        "deleted_records": {
            "users": user_count,
            "api_keys": api_key_count
        }
    }))))
}

async fn list_users(
    query: web::Query<std::collections::HashMap<String, String>>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let government_id = query.get("government_id").map(|s| s.as_str());

    let users = if let Some(gov_id) = government_id {
        let gov_uuid = Uuid::parse_str(gov_id)
            .map_err(|_| AppError::ValidationError("Invalid government_id".to_string()))?;
        sqlx::query_as!(
            User,
            r#"
            SELECT
                id, government_id, email, password_hash, full_name, title,
                role as "role: crate::models::user::UserRole",
                status as "status: crate::models::user::UserStatus",
                mfa_enabled, mfa_secret, last_login, failed_login_attempts,
                locked_until, api_key_expiry_days, created_at, updated_at
            FROM users
            WHERE government_id = $1
            ORDER BY created_at DESC
            "#,
            gov_uuid
        )
        .fetch_all(db_pool.get_ref())
        .await
    } else {
        sqlx::query_as!(
            User,
            r#"
            SELECT
                id, government_id, email, password_hash, full_name, title,
                role as "role: crate::models::user::UserRole",
                status as "status: crate::models::user::UserStatus",
                mfa_enabled, mfa_secret, last_login, failed_login_attempts,
                locked_until, api_key_expiry_days, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(db_pool.get_ref())
        .await
    }
    .map_err(|e| AppError::DatabaseError(e))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(users)))
}

async fn get_user_by_id(
    user_id: web::Path<Uuid>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let user = sqlx::query_as!(
        User,
        r#"
        SELECT
            id, government_id, email, password_hash, full_name, title,
            role as "role: crate::models::user::UserRole",
            status as "status: crate::models::user::UserStatus",
            mfa_enabled, mfa_secret, last_login, failed_login_attempts,
            locked_until, api_key_expiry_days, created_at, updated_at
        FROM users
        WHERE id = $1
        "#,
        *user_id
    )
    .fetch_optional(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    match user {
        Some(u) => Ok(HttpResponse::Ok().json(ApiResponse::success(u))),
        None => Err(AppError::NotFound("User not found".to_string())),
    }
}

async fn update_user(
    user_id: web::Path<Uuid>,
    body: web::Json<UpdateUserRequest>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    body.validate()
        .map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    // Build dynamic SQL query based on provided fields
    let mut query = String::from("UPDATE users SET updated_at = NOW()");
    let mut param_count = 1;

    if body.full_name.is_some() {
        param_count += 1;
        query.push_str(&format!(", full_name = ${}", param_count));
    }
    if body.title.is_some() {
        param_count += 1;
        query.push_str(&format!(", title = ${}", param_count));
    }
    if body.status.is_some() {
        param_count += 1;
        query.push_str(&format!(", status = ${}", param_count));
    }
    if body.api_key_expiry_days.is_some() {
        param_count += 1;
        query.push_str(&format!(", api_key_expiry_days = ${}", param_count));
    }

    query.push_str(" WHERE id = $1 RETURNING *");

    // Execute query with dynamic parameters
    let mut query_builder = sqlx::query_as::<_, User>(&query);
    query_builder = query_builder.bind(*user_id);

    if let Some(full_name) = &body.full_name {
        query_builder = query_builder.bind(full_name);
    }
    if let Some(title) = &body.title {
        query_builder = query_builder.bind(title);
    }
    if let Some(status) = &body.status {
        query_builder = query_builder.bind(status);
    }
    if let Some(api_key_expiry_days) = body.api_key_expiry_days {
        query_builder = query_builder.bind(api_key_expiry_days);
    }

    let updated_user = query_builder
        .fetch_one(db_pool.get_ref())
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => AppError::NotFound(format!("User with ID {} not found", user_id)),
            _ => AppError::DatabaseError(e),
        })?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(updated_user)))
}

/// Reset user password - admin provides new password
async fn reset_user_password(
    user_id: web::Path<Uuid>,
    body: web::Json<ResetPasswordRequest>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    body.validate()
        .map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    let plain_password = body.new_password.clone();

    // Hash the new password
    let password_hash = PasswordService::hash_password(&plain_password)
        .map_err(|e| AppError::InternalError(format!("Password hashing error: {}", e)))?;

    // Update password and reset failed login attempts
    let result = sqlx::query!(
        r#"
        UPDATE users
        SET password_hash = $1,
            failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = NOW()
        WHERE id = $2
        RETURNING id
        "#,
        password_hash,
        *user_id
    )
    .fetch_one(db_pool.get_ref())
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => AppError::NotFound(format!("User with ID {} not found", user_id)),
        _ => AppError::DatabaseError(e),
    })?;

    // Critical safety check: Verify the returned ID matches the user ID we intended to update
    // This ensures we've updated the correct user record in the database
    if result.id != *user_id {
        return Err(AppError::InternalError(format!(
            "Database integrity error: Expected to update user {}, but updated user {}",
            user_id, result.id
        )));
    }

    Ok(HttpResponse::Ok().json(ApiResponse::success(ResetPasswordResponse {
        plain_password,
        message: "Password reset successfully. Please share this password securely with the user.".to_string(),
    })))
}

/// Generate a secure random password for admin to use when creating users
/// This endpoint allows frontend to fetch a password before user creation
async fn generate_password() -> Result<HttpResponse, AppError> {
    let password = PasswordService::generate_secure_password();

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "password": password
    }))))
}

async fn create_user(
    body: web::Json<CreateUserRequest>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    body.validate()
        .map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    // Password is already validated by the model validator (min 8 chars)
    // Admin either manually entered it or fetched it from /users/generate-password endpoint
    let plain_password = body.password.clone();

    // Hash the password
    let password_hash = PasswordService::hash_password(&plain_password)
        .map_err(|e| AppError::InternalError(format!("Password hashing error: {}", e)))?;

    let user_id = Uuid::new_v4();

    let user = sqlx::query_as!(
        User,
        r#"
        INSERT INTO users (
            id, government_id, email, password_hash, full_name,
            title, role, status, mfa_enabled, api_key_expiry_days
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', false, $8)
        RETURNING
            id, government_id, email, password_hash, full_name, title,
            role as "role: crate::models::user::UserRole",
            status as "status: crate::models::user::UserStatus",
            mfa_enabled, mfa_secret, last_login, failed_login_attempts,
            locked_until, api_key_expiry_days, created_at, updated_at
        "#,
        user_id,
        body.government_id,
        body.email.to_lowercase(),
        password_hash,
        body.full_name,
        body.title,
        body.role as _,
        body.api_key_expiry_days
    )
    .fetch_one(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Return user with plain password for admin to securely share with government developer
    // This is the ONLY time the plain password is returned
    let response = crate::models::user::CreateUserResponse {
        user,
        plain_password,
    };

    Ok(HttpResponse::Created().json(ApiResponse::success(response)))
}

async fn check_user_permissions(
    user_id: web::Path<Uuid>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    // This demonstrates using AuthService::has_permission
    let has_perm = AuthService::has_permission(
        *user_id,
        "manage:api_keys",
        db_pool.get_ref(),
    )
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "user_id": user_id.to_string(),
        "has_permission": has_perm
    }))))
}

async fn check_quota(
    req: HttpRequest,
    government_id: web::Path<Uuid>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let start_time = std::time::Instant::now();

    // Check if request exceeds daily quota
    let within_quota = check_daily_quota(*government_id, db_pool.get_ref())
        .await
        .is_ok();

    // Get API key context if available
    let api_key_context = req.extensions().get::<ApiKeyAuthContext>().cloned();
    let api_key_id = api_key_context.map(|ctx| ctx.api_key_id);

    // Increment API usage
    let response_time_ms = start_time.elapsed().as_millis() as i64;
    increment_api_usage(
        *government_id,
        api_key_id,
        "/admin/quota-check",
        response_time_ms,
        false,
        db_pool.get_ref(),
    )
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "government_id": government_id.to_string(),
        "within_quota": within_quota,
        "response_time_ms": response_time_ms
    }))))
}

async fn list_all_api_keys(
    req: HttpRequest,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    // Use ApiKeyAuthContext to get government_id and scopes
    let api_key_context = req.extensions().get::<ApiKeyAuthContext>().cloned();

    let context_info = if let Some(ctx) = api_key_context {
        serde_json::json!({
            "api_key_id": ctx.api_key_id,
            "government_id": ctx.government_id,
            "scopes": ctx.scopes
        })
    } else {
        serde_json::json!({"note": "No API key context available"})
    };

    // Fetch API keys with proper JSONB handling for scopes
    let records = sqlx::query!(
        r#"
        SELECT
            id, government_id, created_by_user_id, name, key_hash, key_prefix,
            status as "status: crate::models::api_key::ApiKeyStatus",
            scopes,
            rate_limit_override,
            last_used, usage_count, created_at, expires_at,
            revoked_at, revoked_by_user_id, revocation_reason
        FROM api_keys
        ORDER BY created_at DESC
        LIMIT 100
        "#
    )
    .fetch_all(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Convert to ApiKey structs with proper scope deserialization
    let api_keys: Vec<ApiKey> = records
        .into_iter()
        .map(|record| ApiKey {
            id: record.id,
            government_id: record.government_id,
            created_by_user_id: record.created_by_user_id,
            name: record.name,
            key_hash: record.key_hash,
            key_prefix: record.key_prefix,
            status: record.status,
            scopes: serde_json::from_value(record.scopes).unwrap_or_default(),
            rate_limit_override: record.rate_limit_override,
            last_used: record.last_used,
            usage_count: record.usage_count,
            created_at: record.created_at,
            expires_at: record.expires_at,
            revoked_at: record.revoked_at,
            revoked_by_user_id: record.revoked_by_user_id,
            revocation_reason: record.revocation_reason,
        })
        .collect();

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "api_keys": api_keys,
        "context": context_info,
        "total": api_keys.len()
    }))))
}

#[derive(serde::Deserialize)]
struct VerifyApiKeyRequest {
    api_key: String,
    key_hash: String,
}

async fn verify_api_key(
    body: web::Json<VerifyApiKeyRequest>,
) -> Result<HttpResponse, AppError> {
    let is_valid = ApiKeyService::verify_api_key(&body.api_key, &body.key_hash);

    if !is_valid {
        return Err(AppError::AuthenticationError("Invalid API key".to_string()));
    }

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "valid": is_valid,
        "message": "API key verified successfully"
    }))))
}

// ============================================================================
// ADMIN API KEY MANAGEMENT ENDPOINTS
// Admins can VIEW and MANAGE developer-created API keys, but NEVER CREATE them
// ============================================================================

/// GET /api/v1/admin/api-keys/{id}/details
/// Get detailed information about a specific API key including creator details
async fn get_api_key_details(
    id: web::Path<Uuid>,
    req: HttpRequest,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    // Get admin from JWT (already authenticated by middleware)
    let admin_claims = req.extensions().get::<crate::services::jwt::Claims>().cloned();
    if admin_claims.is_none() {
        return Err(AppError::AuthenticationError("Unauthorized".to_string()));
    }

    // Fetch API key with creator and government details
    let result = sqlx::query!(
        r#"
        SELECT
            ak.id, ak.government_id, ak.created_by_user_id, ak.name,
            ak.key_hash, ak.key_prefix,
            ak.status as "status: crate::models::api_key::ApiKeyStatus",
            ak.scopes, ak.rate_limit_override,
            ak.last_used, ak.usage_count, ak.created_at, ak.expires_at,
            ak.revoked_at, ak.revoked_by_user_id, ak.revocation_reason,
            ak.must_rotate_by,
            g.government_name,
            u.email as created_by_email,
            u.full_name as created_by_name
        FROM api_keys ak
        JOIN governments g ON ak.government_id = g.id
        JOIN users u ON ak.created_by_user_id = u.id
        WHERE ak.id = $1
        "#,
        *id
    )
    .fetch_optional(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    match result {
        Some(row) => {
            let scopes: Vec<String> = serde_json::from_value(row.scopes).unwrap_or_default();

            let detail = AdminApiKeyDetail {
                id: row.id,
                government_id: row.government_id,
                government_name: row.government_name,
                created_by_user_id: row.created_by_user_id,
                created_by_email: row.created_by_email,
                created_by_name: row.created_by_name,
                name: row.name,
                key_prefix: row.key_prefix,
                status: row.status,
                scopes,
                last_used: row.last_used,
                usage_count: row.usage_count,
                created_at: row.created_at,
                expires_at: row.expires_at,
                revoked_at: row.revoked_at,
                revoked_by_user_id: row.revoked_by_user_id,
                revocation_reason: row.revocation_reason,
                must_rotate_by: row.must_rotate_by,
            };

            Ok(HttpResponse::Ok().json(ApiResponse::success(detail)))
        }
        None => Err(AppError::NotFound("API key not found".to_string())),
    }
}

/// POST /api/v1/admin/api-keys/{id}/revoke
/// Admin revokes a developer's API key (emergency action with audit trail)
async fn admin_revoke_api_key(
    id: web::Path<Uuid>,
    body: web::Json<AdminRevokeApiKeyRequest>,
    req: HttpRequest,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    // Validate request
    body.validate()
        .map_err(|e| AppError::ValidationError(format!("Validation error: {}", e)))?;

    // Get admin from JWT
    let admin_claims = req.extensions().get::<crate::services::jwt::Claims>().cloned();
    if admin_claims.is_none() {
        return Err(AppError::AuthenticationError("Unauthorized".to_string()));
    }
    let admin_claims = admin_claims.unwrap();
    let admin_user_id = Uuid::parse_str(&admin_claims.sub)
        .map_err(|_| AppError::InternalError("Invalid admin user ID".to_string()))?;

    // ============================================================================
    // CRITICAL ADMIN ACTION: Revoke API key with full audit trail
    // ============================================================================

    // Format the revocation reason with admin context
    let full_reason = format!(
        "[ADMIN REVOCATION] {}{}",
        body.reason,
        body.admin_note.as_ref()
            .map(|note| format!(" | Internal Note: {}", note))
            .unwrap_or_default()
    );

    let result = sqlx::query!(
        r#"
        UPDATE api_keys
        SET
            status = 'revoked'::api_key_status,
            revoked_at = NOW(),
            revoked_by_user_id = $1,
            revocation_reason = $2
        WHERE id = $3
        RETURNING id, government_id, created_by_user_id, name
        "#,
        admin_user_id,
        full_reason,
        *id
    )
    .fetch_optional(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    match result {
        Some(record) => {
            // Log admin action for audit trail
            tracing::warn!(
                "🔒 ADMIN REVOCATION: Admin {} revoked API key {} (name: '{}') belonging to user {} in government {}. Reason: {}",
                admin_user_id,
                record.id,
                record.name,
                record.created_by_user_id,
                record.government_id,
                body.reason
            );

            // TODO: Create audit log entry
            // TODO: Send notification to developer whose key was revoked

            Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
                "message": "API key revoked successfully by admin",
                "api_key_id": record.id,
                "government_id": record.government_id,
                "revoked_by": admin_user_id,
                "revoked_at": chrono::Utc::now()
            }))))
        }
        None => Err(AppError::NotFound("API key not found".to_string())),
    }
}

async fn get_audit_logs(
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let logs = sqlx::query_as!(
        AuditLog,
        r#"
        SELECT
            id, timestamp, government_id, user_id, api_key_id,
            action as "action: AuditAction",
            resource_type, resource_id, ip_address, user_agent,
            request_method, request_path, request_body, response_status,
            response_time_ms, error_message, metadata
        FROM audit_logs
        ORDER BY timestamp DESC
        LIMIT 100
        "#
    )
    .fetch_all(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "logs": logs,
        "total": logs.len()
    }))))
}

#[derive(serde::Deserialize)]
struct CreateAuditLogRequest {
    government_id: Option<Uuid>,
    user_id: Option<Uuid>,
    api_key_id: Option<Uuid>,
    action: String,
    resource_type: String,
    ip_address: String,
    request_method: String,
    request_path: String,
    response_status: i32,
    response_time_ms: i64,
}

async fn create_audit_log(
    _req: HttpRequest,
    body: web::Json<CreateAuditLogRequest>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    // Parse action string to AuditAction enum
    let action = match body.action.to_lowercase().as_str() {
        "login" => AuditAction::Login,
        "logout" => AuditAction::Logout,
        "loginfailed" => AuditAction::LoginFailed,
        "apikeycreated" => AuditAction::ApiKeyCreated,
        "apikeyrevoked" => AuditAction::ApiKeyRevoked,
        "apirequest" => AuditAction::ApiRequest,
        "dataaccess" => AuditAction::DataAccess,
        "dataexport" => AuditAction::DataExport,
        "configchange" => AuditAction::ConfigChange,
        "usercreated" => AuditAction::UserCreated,
        "userupdated" => AuditAction::UserUpdated,
        "userdeleted" => AuditAction::UserDeleted,
        "permissionchanged" => AuditAction::PermissionChanged,
        "ratelimitexceeded" => AuditAction::RateLimitExceeded,
        "unauthorizedaccess" => AuditAction::UnauthorizedAccess,
        _ => return Err(AppError::ValidationError(format!("Invalid action: {}", body.action))),
    };

    // Use AuditLog::new constructor
    let audit_log = AuditLog::new(
        body.government_id,
        body.user_id,
        body.api_key_id,
        action.clone(),
        body.resource_type.clone(),
        body.ip_address.clone(),
        body.request_method.clone(),
        body.request_path.clone(),
        body.response_status,
        body.response_time_ms,
    );

    // Insert into database
    sqlx::query!(
        r#"
        INSERT INTO audit_logs (
            id, timestamp, government_id, user_id, api_key_id, action,
            resource_type, resource_id, ip_address, user_agent, request_method,
            request_path, request_body, response_status, response_time_ms,
            error_message, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        "#,
        audit_log.id,
        audit_log.timestamp,
        audit_log.government_id,
        audit_log.user_id,
        audit_log.api_key_id,
        action as _,
        audit_log.resource_type,
        audit_log.resource_id,
        audit_log.ip_address,
        audit_log.user_agent,
        audit_log.request_method,
        audit_log.request_path,
        audit_log.request_body,
        audit_log.response_status,
        audit_log.response_time_ms,
        audit_log.error_message,
        audit_log.metadata
    )
    .execute(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    Ok(HttpResponse::Created().json(ApiResponse::success(serde_json::json!({
        "id": audit_log.id,
        "message": "Audit log created successfully"
    }))))
}

/// Get a government by ID with full details
async fn get_government_by_id(
    id: web::Path<Uuid>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let government = sqlx::query!(
        r#"
        SELECT
            id,
            country_code,
            country_name,
            government_name,
            government_type as "government_type: crate::models::government::GovernmentType",
            tier as "tier: crate::models::government::AccessTier",
            status as "status: crate::models::government::GovernmentStatus",
            contact_email,
            contact_phone,
            primary_contact_name,
            primary_contact_title,
            api_quota_daily,
            api_quota_monthly,
            allowed_endpoints,
            ip_whitelist,
            created_at,
            activated_at,
            expires_at,
            max_active_api_keys,
            mandatory_rotation_days,
            api_key_expiry_days
        FROM governments
        WHERE id = $1
        "#,
        *id
    )
    .fetch_optional(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    match government {
        Some(gov) => Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
            "id": gov.id,
            "country_code": gov.country_code,
            "country_name": gov.country_name,
            "government_name": gov.government_name,
            "government_type": gov.government_type,
            "tier": gov.tier,
            "status": gov.status,
            "contact_email": gov.contact_email,
            "contact_phone": gov.contact_phone,
            "primary_contact_name": gov.primary_contact_name,
            "primary_contact_title": gov.primary_contact_title,
            "api_quota_daily": gov.api_quota_daily,
            "api_quota_monthly": gov.api_quota_monthly,
            "allowed_endpoints": gov.allowed_endpoints,
            "ip_whitelist": gov.ip_whitelist,
            "created_at": gov.created_at,
            "activated_at": gov.activated_at,
            "expires_at": gov.expires_at,
            "max_active_api_keys": gov.max_active_api_keys,
            "mandatory_rotation_days": gov.mandatory_rotation_days,
            "api_key_expiry_days": gov.api_key_expiry_days
        })))),
        None => Err(AppError::NotFound(format!("Government with ID {} not found", id))),
    }
}

#[derive(serde::Deserialize)]
struct UpdateUserRoleRequest {
    role: crate::models::user::UserRole,
}

/// Update user role - demonstrates AuthorizationError variant
async fn update_user_role(
    user_id: web::Path<Uuid>,
    body: web::Json<UpdateUserRoleRequest>,
    _req: HttpRequest,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    // Get current user from JWT claims (in production, extracted from AuthMiddleware)
    // For now, we'll simulate checking permissions

    // Check if the requesting user has permission to change roles
    let has_permission = AuthService::has_permission(
        *user_id,
        "manage:users",
        db_pool.get_ref(),
    )
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    if !has_permission {
        return Err(AppError::AuthorizationError(
            "You do not have permission to update user roles".to_string()
        ));
    }

    // Update the user's role
    let result = sqlx::query!(
        r#"
        UPDATE users
        SET role = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id
        "#,
        body.role as _,
        *user_id
    )
    .fetch_optional(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    match result {
        Some(_) => Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
            "message": "User role updated successfully"
        })))),
        None => Err(AppError::NotFound(format!("User with ID {} not found", user_id))),
    }
}

/// Get comprehensive usage statistics for a specific government
async fn get_government_usage_stats(
    id: web::Path<Uuid>,
    query: web::Query<std::collections::HashMap<String, String>>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let days: i32 = query
        .get("days")
        .and_then(|d| d.parse().ok())
        .unwrap_or(30);

    // Get government basic info
    let government = sqlx::query!(
        r#"
        SELECT id, government_name, country_name, api_quota_daily, api_quota_monthly
        FROM governments
        WHERE id = $1
        "#,
        *id
    )
    .fetch_optional(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?
    .ok_or_else(|| AppError::NotFound("Government not found".to_string()))?;

    // Get API usage for the period
    let usage_data = sqlx::query!(
        r#"
        SELECT
            date,
            SUM(request_count) as total_requests,
            SUM(error_count) as total_errors,
            AVG(total_response_time_ms::float / NULLIF(request_count, 0)) as avg_response_time
        FROM api_usage
        WHERE government_id = $1
          AND date >= CURRENT_DATE - $2::integer
        GROUP BY date
        ORDER BY date DESC
        "#,
        *id,
        days
    )
    .fetch_all(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get current month usage for quota tracking
    let current_month_usage = sqlx::query!(
        r#"
        SELECT
            COALESCE(SUM(request_count), 0) as total_requests
        FROM api_usage
        WHERE government_id = $1
          AND date >= DATE_TRUNC('month', CURRENT_DATE)
        "#,
        *id
    )
    .fetch_one(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get today's usage
    let today_usage = sqlx::query!(
        r#"
        SELECT
            COALESCE(SUM(request_count), 0) as total_requests
        FROM api_usage
        WHERE government_id = $1
          AND date = CURRENT_DATE
        "#,
        *id
    )
    .fetch_one(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get most used endpoints
    let top_endpoints = sqlx::query!(
        r#"
        SELECT
            endpoint,
            SUM(request_count) as total_requests,
            SUM(error_count) as total_errors
        FROM api_usage
        WHERE government_id = $1
          AND date >= CURRENT_DATE - $2::integer
        GROUP BY endpoint
        ORDER BY total_requests DESC
        LIMIT 10
        "#,
        *id,
        days
    )
    .fetch_all(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get active API keys count
    let api_keys_count = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM api_keys
        WHERE government_id = $1 AND status = 'active'
        "#,
        *id
    )
    .fetch_one(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    let response = serde_json::json!({
        "government": {
            "id": government.id,
            "name": government.government_name,
            "country": government.country_name,
            "quotas": {
                "daily": government.api_quota_daily,
                "monthly": government.api_quota_monthly
            }
        },
        "usage": {
            "today": today_usage.total_requests.unwrap_or(0),
            "current_month": current_month_usage.total_requests.unwrap_or(0),
            "quota_utilization": {
                "daily_percent": (today_usage.total_requests.unwrap_or(0) as f64 / government.api_quota_daily as f64 * 100.0),
                "monthly_percent": (current_month_usage.total_requests.unwrap_or(0) as f64 / government.api_quota_monthly as f64 * 100.0)
            }
        },
        "daily_usage": usage_data.iter().map(|row| {
            serde_json::json!({
                "date": row.date,
                "requests": row.total_requests,
                "errors": row.total_errors,
                "avg_response_time_ms": row.avg_response_time
            })
        }).collect::<Vec<_>>(),
        "top_endpoints": top_endpoints.iter().map(|row| {
            serde_json::json!({
                "endpoint": row.endpoint,
                "requests": row.total_requests,
                "errors": row.total_errors,
                "error_rate": if row.total_requests.unwrap_or(0) > 0 {
                    row.total_errors.unwrap_or(0) as f64 / row.total_requests.unwrap_or(1) as f64 * 100.0
                } else {
                    0.0
                }
            })
        }).collect::<Vec<_>>(),
        "active_api_keys": api_keys_count.count.unwrap_or(0)
    });

    Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
}

/// Get system-wide analytics overview
async fn get_analytics_overview(
    query: web::Query<std::collections::HashMap<String, String>>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let days: i32 = query
        .get("days")
        .and_then(|d| d.parse().ok())
        .unwrap_or(30);

    // Get total governments by status
    let governments_stats = sqlx::query!(
        r#"
        SELECT
            status as "status: crate::models::government::GovernmentStatus",
            COUNT(*) as count
        FROM governments
        GROUP BY status
        "#
    )
    .fetch_all(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get total API requests for the period
    let api_stats = sqlx::query!(
        r#"
        SELECT
            SUM(request_count) as total_requests,
            SUM(error_count) as total_errors
        FROM api_usage
        WHERE date >= CURRENT_DATE - $1::integer
        "#,
        days
    )
    .fetch_one(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get active users count
    let users_count = sqlx::query!(
        r#"
        SELECT
            role as "role: crate::models::user::UserRole",
            COUNT(*) as count
        FROM users
        WHERE status = 'active'
        GROUP BY role
        "#
    )
    .fetch_all(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get daily request trends
    let daily_trends = sqlx::query!(
        r#"
        SELECT
            date,
            SUM(request_count) as total_requests,
            SUM(error_count) as total_errors,
            COUNT(DISTINCT government_id) as active_governments
        FROM api_usage
        WHERE date >= CURRENT_DATE - $1::integer
        GROUP BY date
        ORDER BY date DESC
        "#,
        days
    )
    .fetch_all(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get governments approaching quota limits
    let quota_warnings = sqlx::query!(
        r#"
        SELECT
            g.id,
            g.government_name,
            g.country_name,
            g.api_quota_daily,
            g.api_quota_monthly,
            COALESCE(SUM(CASE WHEN au.date = CURRENT_DATE THEN au.request_count ELSE 0 END), 0) as today_usage,
            COALESCE(SUM(CASE WHEN au.date >= DATE_TRUNC('month', CURRENT_DATE) THEN au.request_count ELSE 0 END), 0) as month_usage
        FROM governments g
        LEFT JOIN api_usage au ON g.id = au.government_id
        WHERE g.status = 'active'
        GROUP BY g.id, g.government_name, g.country_name, g.api_quota_daily, g.api_quota_monthly
        HAVING
            COALESCE(SUM(CASE WHEN au.date = CURRENT_DATE THEN au.request_count ELSE 0 END), 0) > g.api_quota_daily * 0.8
            OR COALESCE(SUM(CASE WHEN au.date >= DATE_TRUNC('month', CURRENT_DATE) THEN au.request_count ELSE 0 END), 0) > g.api_quota_monthly * 0.8
        ORDER BY month_usage DESC
        LIMIT 10
        "#
    )
    .fetch_all(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    let response = serde_json::json!({
        "governments": {
            "total": governments_stats.iter().map(|s| s.count.unwrap_or(0)).sum::<i64>(),
            "by_status": governments_stats.iter().map(|s| {
                serde_json::json!({
                    "status": s.status,
                    "count": s.count.unwrap_or(0)
                })
            }).collect::<Vec<_>>()
        },
        "users": {
            "total": users_count.iter().map(|u| u.count.unwrap_or(0)).sum::<i64>(),
            "by_role": users_count.iter().map(|u| {
                serde_json::json!({
                    "role": u.role,
                    "count": u.count.unwrap_or(0)
                })
            }).collect::<Vec<_>>()
        },
        "api_usage": {
            "total_requests": api_stats.total_requests.unwrap_or(0),
            "total_errors": api_stats.total_errors.unwrap_or(0),
            "error_rate": if api_stats.total_requests.unwrap_or(0) > 0 {
                api_stats.total_errors.unwrap_or(0) as f64 / api_stats.total_requests.unwrap_or(1) as f64 * 100.0
            } else {
                0.0
            }
        },
        "daily_trends": daily_trends.iter().map(|row| {
            serde_json::json!({
                "date": row.date,
                "requests": row.total_requests,
                "errors": row.total_errors,
                "active_governments": row.active_governments
            })
        }).collect::<Vec<_>>(),
        "quota_warnings": quota_warnings.iter().map(|row| {
            serde_json::json!({
                "id": row.id,
                "name": row.government_name,
                "country": row.country_name,
                "daily_usage": row.today_usage,
                "daily_quota": row.api_quota_daily,
                "daily_percent": (row.today_usage.unwrap_or(0) as f64 / row.api_quota_daily as f64 * 100.0),
                "monthly_usage": row.month_usage,
                "monthly_quota": row.api_quota_monthly,
                "monthly_percent": (row.month_usage.unwrap_or(0) as f64 / row.api_quota_monthly as f64 * 100.0)
            })
        }).collect::<Vec<_>>()
    });

    Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
}

/// Get detailed API usage analytics
async fn get_api_usage_analytics(
    query: web::Query<std::collections::HashMap<String, String>>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let government_id = query.get("government_id")
        .and_then(|id| Uuid::parse_str(id).ok());
    let days: i32 = query
        .get("days")
        .and_then(|d| d.parse().ok())
        .unwrap_or(30);

    let mut query_builder = sqlx::QueryBuilder::new(
        r#"
        SELECT
            au.date,
            au.endpoint,
            au.government_id,
            g.government_name,
            g.country_name,
            au.request_count,
            au.error_count,
            au.total_response_time_ms,
            CASE
                WHEN au.request_count > 0
                THEN au.total_response_time_ms::float / au.request_count
                ELSE 0
            END as avg_response_time
        FROM api_usage au
        JOIN governments g ON au.government_id = g.id
        WHERE au.date >= CURRENT_DATE - "#
    );

    query_builder.push_bind(days);

    if let Some(gov_id) = government_id {
        query_builder.push(" AND au.government_id = ");
        query_builder.push_bind(gov_id);
    }

    query_builder.push(" ORDER BY au.date DESC, au.request_count DESC LIMIT 1000");

    let usage_records = query_builder
        .build()
        .fetch_all(db_pool.get_ref())
        .await
        .map_err(|e| AppError::DatabaseError(e))?;

    // Process the raw records into a structured response
    let response = serde_json::json!({
        "usage_data": usage_records.iter().map(|row| {
            serde_json::json!({
                "date": row.try_get::<chrono::NaiveDate, _>("date").ok(),
                "government": {
                    "id": row.try_get::<Uuid, _>("government_id").ok(),
                    "name": row.try_get::<String, _>("government_name").ok(),
                    "country": row.try_get::<String, _>("country_name").ok()
                },
                "endpoint": row.try_get::<String, _>("endpoint").ok(),
                "requests": row.try_get::<i32, _>("request_count").ok(),
                "errors": row.try_get::<i32, _>("error_count").ok(),
                "avg_response_time_ms": row.try_get::<f64, _>("avg_response_time").ok()
            })
        }).collect::<Vec<_>>()
    });

    Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
}

/// Get system health metrics
async fn get_system_health(
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    // Database connection test
    let db_health = sqlx::query!("SELECT 1 as health")
        .fetch_one(db_pool.get_ref())
        .await
        .is_ok();

    // Get database size and stats
    let db_stats = sqlx::query!(
        r#"
        SELECT
            pg_database_size(current_database()) as db_size,
            (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
            (SELECT count(*) FROM pg_stat_activity) as total_connections
        "#
    )
    .fetch_one(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get recent failed login attempts (security indicator)
    let failed_logins = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE action = 'login_failed'
          AND timestamp >= NOW() - INTERVAL '1 hour'
        "#
    )
    .fetch_one(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get rate limit exceeded count (potential attack indicator)
    let rate_limit_exceeded = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE action = 'rate_limit_exceeded'
          AND timestamp >= NOW() - INTERVAL '1 hour'
        "#
    )
    .fetch_one(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get unauthorized access attempts
    let unauthorized_attempts = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE action = 'unauthorized_access'
          AND timestamp >= NOW() - INTERVAL '1 hour'
        "#
    )
    .fetch_one(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Check for locked users
    let locked_users = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM users
        WHERE status = 'locked' OR locked_until > NOW()
        "#
    )
    .fetch_one(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    let response = serde_json::json!({
        "status": if db_health { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now(),
        "database": {
            "connected": db_health,
            "size_bytes": db_stats.db_size,
            "active_connections": db_stats.active_connections,
            "total_connections": db_stats.total_connections
        },
        "security": {
            "failed_logins_last_hour": failed_logins.count.unwrap_or(0),
            "rate_limit_exceeded_last_hour": rate_limit_exceeded.count.unwrap_or(0),
            "unauthorized_attempts_last_hour": unauthorized_attempts.count.unwrap_or(0),
            "locked_users": locked_users.count.unwrap_or(0)
        }
    });

    Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
}

/// Get security alerts and suspicious activities
async fn get_security_alerts(
    query: web::Query<std::collections::HashMap<String, String>>,
    db_pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let hours: i32 = query
        .get("hours")
        .and_then(|h| h.parse().ok())
        .unwrap_or(24);

    // Get failed login attempts
    let failed_logins = sqlx::query!(
        r#"
        SELECT
            al.timestamp,
            al.ip_address,
            al.user_agent,
            al.error_message,
            u.email,
            u.full_name,
            g.government_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN governments g ON al.government_id = g.id
        WHERE al.action = 'login_failed'
          AND al.timestamp >= NOW() - ($1::integer || ' hours')::interval
        ORDER BY al.timestamp DESC
        LIMIT 100
        "#,
        hours
    )
    .fetch_all(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get rate limit violations
    let rate_limit_violations = sqlx::query!(
        r#"
        SELECT
            al.timestamp,
            al.ip_address,
            al.request_path,
            g.government_name,
            g.country_name
        FROM audit_logs al
        LEFT JOIN governments g ON al.government_id = g.id
        WHERE al.action = 'rate_limit_exceeded'
          AND al.timestamp >= NOW() - ($1::integer || ' hours')::interval
        ORDER BY al.timestamp DESC
        LIMIT 100
        "#,
        hours
    )
    .fetch_all(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get unauthorized access attempts
    let unauthorized_access = sqlx::query!(
        r#"
        SELECT
            al.timestamp,
            al.ip_address,
            al.request_path,
            al.request_method,
            al.error_message,
            g.government_name
        FROM audit_logs al
        LEFT JOIN governments g ON al.government_id = g.id
        WHERE al.action = 'unauthorized_access'
          AND al.timestamp >= NOW() - ($1::integer || ' hours')::interval
        ORDER BY al.timestamp DESC
        LIMIT 100
        "#,
        hours
    )
    .fetch_all(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get suspicious IP addresses (multiple failed attempts)
    let suspicious_ips = sqlx::query!(
        r#"
        SELECT
            ip_address,
            COUNT(*) as attempt_count,
            MAX(timestamp) as last_attempt,
            array_agg(DISTINCT action::text) as actions
        FROM audit_logs
        WHERE action IN ('login_failed', 'unauthorized_access', 'rate_limit_exceeded')
          AND timestamp >= NOW() - ($1::integer || ' hours')::interval
        GROUP BY ip_address
        HAVING COUNT(*) >= 5
        ORDER BY attempt_count DESC
        LIMIT 50
        "#,
        hours
    )
    .fetch_all(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    // Get recently revoked API keys
    let revoked_keys = sqlx::query!(
        r#"
        SELECT
            ak.id,
            ak.name,
            ak.revoked_at,
            ak.revocation_reason,
            g.government_name,
            u.full_name as revoked_by
        FROM api_keys ak
        JOIN governments g ON ak.government_id = g.id
        LEFT JOIN users u ON ak.revoked_by_user_id = u.id
        WHERE ak.status = 'revoked'
          AND ak.revoked_at >= NOW() - ($1::integer || ' hours')::interval
        ORDER BY ak.revoked_at DESC
        LIMIT 50
        "#,
        hours
    )
    .fetch_all(db_pool.get_ref())
    .await
    .map_err(|e| AppError::DatabaseError(e))?;

    let response = serde_json::json!({
        "period_hours": hours,
        "alerts": {
            "failed_logins": failed_logins.iter().map(|row| {
                serde_json::json!({
                    "timestamp": row.timestamp,
                    "ip_address": row.ip_address,
                    "user_agent": row.user_agent,
                    "email": row.email,
                    "user_name": row.full_name,
                    "government": row.government_name,
                    "error": row.error_message
                })
            }).collect::<Vec<_>>(),
            "rate_limit_violations": rate_limit_violations.iter().map(|row| {
                serde_json::json!({
                    "timestamp": row.timestamp,
                    "ip_address": row.ip_address,
                    "path": row.request_path,
                    "government": row.government_name,
                    "country": row.country_name
                })
            }).collect::<Vec<_>>(),
            "unauthorized_access": unauthorized_access.iter().map(|row| {
                serde_json::json!({
                    "timestamp": row.timestamp,
                    "ip_address": row.ip_address,
                    "method": row.request_method,
                    "path": row.request_path,
                    "government": row.government_name,
                    "error": row.error_message
                })
            }).collect::<Vec<_>>()
        },
        "suspicious_ips": suspicious_ips.iter().map(|row| {
            serde_json::json!({
                "ip_address": row.ip_address,
                "attempt_count": row.attempt_count,
                "last_attempt": row.last_attempt,
                "actions": row.actions
            })
        }).collect::<Vec<_>>(),
        "revoked_api_keys": revoked_keys.iter().map(|row| {
            serde_json::json!({
                "id": row.id,
                "name": row.name,
                "revoked_at": row.revoked_at,
                "reason": row.revocation_reason,
                "government": row.government_name,
                "revoked_by": row.revoked_by
            })
        }).collect::<Vec<_>>()
    });

    Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
}

/// Get available scopes/endpoints
async fn get_available_scopes() -> Result<HttpResponse, AppError> {
    let scopes = get_valid_scopes();

    let response = serde_json::json!({
        "scopes": scopes,
        "descriptions": {
            "*": "⚠️ WILDCARD - Full unrestricted access to ALL API endpoints (use only for admin/testing accounts)",
            "fsfvi:assessments": "Run vulnerability assessments and quick checks on food systems",
            "fsfvi:strategic-planning": "Generate multi-year strategic plans, MTEF frameworks, and investment sequencing",
            "fsfvi:budget-optimization": "Analyze budget efficiency, generate optimization plans, and calculate ROI",
            "fsfvi:weighting-analysis": "Validate weighting methodologies and perform financial impact analysis",
            "fsfvi:performance-gaps": "Analyze performance gaps, peer comparisons, and track gap closure progress",
            "fsfvi:sensitivity-analysis": "Run sensitivity and robustness analysis on assessment parameters",
            "fsfvi:matrices": "Generate and customize AHP and network centrality matrices",
            "fsfvi:scenarios": "Compare scenarios, simulate crisis events, and analyze budget change impacts",
            "fsfvi:decision-support": "Generate policy recommendations, crisis responses, and stakeholder briefs"
        }
    });

    Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
}
