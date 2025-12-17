use actix_web::{web, HttpResponse, Responder};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::{
    config::AppConfig,
    models::{
        government::GovernmentStatus,
        user::{LoginRequest, LoginResponse, RefreshTokenRequest, UserInfo, UserStatus},
        ApiResponse,
    },
    services::{jwt::JwtService, password::PasswordService},
};

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/auth")
            .route("/login", web::post().to(login))
            .route("/refresh", web::post().to(refresh_token))
            .route("/logout", web::post().to(logout)),
    );
}

async fn login(
    body: web::Json<LoginRequest>,
    db_pool: web::Data<PgPool>,
    config: web::Data<AppConfig>,
) -> impl Responder {
    tracing::info!("🔐 Login attempt for email: {}", body.email);

    // Validate request
    if let Err(e) = body.validate() {
        tracing::warn!("❌ Validation error for {}: {}", body.email, e);
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!(
            "Validation error: {}",
            e
        )));
    }

    // Fetch user from database
    tracing::debug!("📊 Fetching user from database: {}", body.email);
    let user_result = sqlx::query!(
        r#"
        SELECT
            u.id,
            u.government_id,
            u.email,
            u.password_hash,
            u.full_name,
            u.role as "role: crate::models::user::UserRole",
            u.status as "status: UserStatus",
            u.mfa_enabled,
            u.mfa_secret,
            u.failed_login_attempts,
            u.locked_until,
            g.status as "gov_status: GovernmentStatus"
        FROM users u
        JOIN governments g ON u.government_id = g.id
        WHERE u.email = $1
        "#,
        body.email.to_lowercase()
    )
    .fetch_optional(db_pool.get_ref())
    .await;

    let user = match user_result {
        Ok(Some(u)) => {
            tracing::info!("✅ User found: {} (role: {:?}, status: {:?})", u.email, u.role, u.status);
            u
        }
        Ok(None) => {
            tracing::warn!("❌ User not found: {}", body.email);
            return HttpResponse::Unauthorized()
                .json(ApiResponse::<()>::error("Invalid credentials".to_string()));
        }
        Err(e) => {
            tracing::error!("❌ Database error fetching user {}: {:?}", body.email, e);
            return HttpResponse::Unauthorized()
                .json(ApiResponse::<()>::error("Invalid credentials".to_string()));
        }
    };

    // Check if user is locked
    if let Some(locked_until) = user.locked_until {
        if locked_until > Utc::now() {
            tracing::warn!("❌ Account locked for {}: until {}", user.email, locked_until);
            return HttpResponse::Forbidden().json(ApiResponse::<()>::error(format!(
                "Account is locked until {}",
                locked_until
            )));
        }
    }
    tracing::debug!("✅ Account not locked");

    // Check if user is active
    if !matches!(user.status, UserStatus::Active) {
        tracing::warn!("❌ User status check failed for {}: status = {:?}", user.email, user.status);
        return HttpResponse::Forbidden()
            .json(ApiResponse::<()>::error("Account is not active".to_string()));
    }
    tracing::debug!("✅ User status is active");

    // Check if government is active
    if !matches!(user.gov_status, GovernmentStatus::Active) {
        tracing::warn!("❌ Government status check failed for {}: gov_status = {:?}", user.email, user.gov_status);
        return HttpResponse::Forbidden().json(ApiResponse::<()>::error(
            "Government account is not active".to_string(),
        ));
    }
    tracing::debug!("✅ Government status is active");

    // Verify password
    tracing::debug!("🔑 Verifying password for {}", user.email);
    match PasswordService::verify_password(&body.password, &user.password_hash) {
        Ok(true) => {
            tracing::info!("✅ Password verification successful for {}", user.email);
            // Check MFA if enabled
            if user.mfa_enabled && user.mfa_secret.is_some() {
                tracing::debug!("🔐 MFA is enabled for {}", user.email);
                if let Some(ref mfa_code) = body.mfa_code {
                    // Verify TOTP code using production MFA service
                    let encrypted_secret = user.mfa_secret.as_ref().unwrap();
                    match crate::services::mfa::MfaService::verify_totp(
                        encrypted_secret,
                        mfa_code,
                        &config,
                    ) {
                        Ok(true) => {
                            // MFA code is valid, proceed with login
                        }
                        Ok(false) => {
                            // Invalid MFA code - could be a backup code
                            // Check if it's a backup code (8 chars vs 6 for TOTP)
                            if mfa_code.len() == 8 {
                                // Try backup code verification
                                let backup_codes = sqlx::query!(
                                    r#"
                                    SELECT id, code_hash
                                    FROM mfa_backup_codes
                                    WHERE user_id = $1 AND used_at IS NULL
                                    "#,
                                    user.id
                                )
                                .fetch_all(db_pool.get_ref())
                                .await
                                .unwrap_or_default();

                                let mut backup_code_valid = false;
                                for code_record in backup_codes {
                                    if crate::services::mfa::MfaService::verify_backup_code(
                                        mfa_code,
                                        &code_record.code_hash,
                                    ) {
                                        // Mark code as used
                                        let _ = sqlx::query!(
                                            "UPDATE mfa_backup_codes SET used_at = NOW() WHERE id = $1",
                                            code_record.id
                                        )
                                        .execute(db_pool.get_ref())
                                        .await;
                                        backup_code_valid = true;
                                        break;
                                    }
                                }

                                if !backup_code_valid {
                                    return HttpResponse::Unauthorized()
                                        .json(ApiResponse::<()>::error(
                                            "Invalid MFA code or backup code".to_string(),
                                        ));
                                }
                            } else {
                                return HttpResponse::Unauthorized()
                                    .json(ApiResponse::<()>::error("Invalid MFA code".to_string()));
                            }
                        }
                        Err(e) => {
                            tracing::error!("MFA verification error: {:?}", e);
                            return HttpResponse::InternalServerError()
                                .json(ApiResponse::<()>::error(
                                    "MFA verification failed".to_string(),
                                ));
                        }
                    }
                } else {
                    return HttpResponse::Unauthorized()
                        .json(ApiResponse::<()>::error("MFA code required".to_string()));
                }
            }

            // Reset failed login attempts
            let _ = sqlx::query!(
                "UPDATE users SET failed_login_attempts = 0, last_login = NOW() WHERE id = $1",
                user.id
            )
            .execute(db_pool.get_ref())
            .await;

            // Generate tokens
            let jwt_service = JwtService::new(
                &config.jwt.secret,
                config.jwt.access_token_expiry,
                config.jwt.refresh_token_expiry,
            );

            let access_token = jwt_service
                .generate_access_token(user.id, user.government_id, &user.email, user.role.clone())
                .unwrap();

            let refresh_token = jwt_service
                .generate_refresh_token(user.id, user.government_id, &user.email, user.role.clone())
                .unwrap();

            // Store refresh token (hashed)
            let refresh_token_hash = crate::services::api_key::ApiKeyService::hash_api_key(&refresh_token);
            let expires_at = Utc::now() + chrono::Duration::seconds(config.jwt.refresh_token_expiry);

            let _ = sqlx::query!(
                "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
                Uuid::new_v4(),
                user.id,
                refresh_token_hash,
                expires_at
            )
            .execute(db_pool.get_ref())
            .await;

            let response = LoginResponse {
                access_token,
                refresh_token,
                expires_in: jwt_service.get_access_token_expiry(),
                user: UserInfo {
                    id: user.id,
                    government_id: user.government_id,
                    email: user.email.clone(),
                    full_name: user.full_name,
                    role: user.role,
                    mfa_enabled: user.mfa_enabled,  // Allow frontend to determine MFA status immediately
                },
            };

            tracing::info!("🎉 Login successful for {}", user.email);
            HttpResponse::Ok().json(ApiResponse::success(response))
        }
        Ok(false) => {
            tracing::warn!("❌ Password verification failed for {}", user.email);
            // Increment failed login attempts
            let new_attempts = user.failed_login_attempts + 1;
            let locked_until = if new_attempts >= 5 {
                Some(Utc::now() + chrono::Duration::minutes(30))
            } else {
                None
            };

            let _ = sqlx::query!(
                "UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3",
                new_attempts,
                locked_until,
                user.id
            )
            .execute(db_pool.get_ref())
            .await;

            HttpResponse::Unauthorized()
                .json(ApiResponse::<()>::error("Invalid credentials".to_string()))
        }
        Err(e) => {
            tracing::error!("❌ Password verification error for {}: {:?}", user.email, e);
            HttpResponse::Unauthorized()
                .json(ApiResponse::<()>::error("Invalid credentials".to_string()))
        }
    }
}

async fn refresh_token(
    body: web::Json<RefreshTokenRequest>,
    db_pool: web::Data<PgPool>,
    config: web::Data<AppConfig>,
) -> impl Responder {
    let jwt_service = JwtService::new(
        &config.jwt.secret,
        config.jwt.access_token_expiry,
        config.jwt.refresh_token_expiry,
    );

    // Verify refresh token
    let claims = match jwt_service.verify_token(&body.refresh_token) {
        Ok(c) => c,
        Err(_) => {
            return HttpResponse::Unauthorized()
                .json(ApiResponse::<()>::error("Invalid refresh token".to_string()));
        }
    };

    // Check if refresh token exists in database
    let token_hash = crate::services::api_key::ApiKeyService::hash_api_key(&body.refresh_token);
    let token_record = sqlx::query!(
        "SELECT user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = $1",
        token_hash
    )
    .fetch_optional(db_pool.get_ref())
    .await;

    match token_record {
        Ok(Some(record)) => {
            if record.revoked_at.is_some() {
                return HttpResponse::Unauthorized()
                    .json(ApiResponse::<()>::error("Token has been revoked".to_string()));
            }

            if record.expires_at < Utc::now() {
                return HttpResponse::Unauthorized()
                    .json(ApiResponse::<()>::error("Token has expired".to_string()));
            }

            // Generate new access token
            let user_id = Uuid::parse_str(&claims.sub).unwrap();
            let government_id = Uuid::parse_str(&claims.government_id).unwrap();

            let new_access_token = jwt_service
                .generate_access_token(user_id, government_id, &claims.email, claims.role)
                .unwrap();

            HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
                "access_token": new_access_token,
                "expires_in": jwt_service.get_access_token_expiry(),
            })))
        }
        _ => HttpResponse::Unauthorized()
            .json(ApiResponse::<()>::error("Invalid refresh token".to_string())),
    }
}

async fn logout(body: web::Json<RefreshTokenRequest>, db_pool: web::Data<PgPool>) -> impl Responder {
    let token_hash = crate::services::api_key::ApiKeyService::hash_api_key(&body.refresh_token);

    let _ = sqlx::query!(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1",
        token_hash
    )
    .execute(db_pool.get_ref())
    .await;

    HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "message": "Logged out successfully"
    })))
}
