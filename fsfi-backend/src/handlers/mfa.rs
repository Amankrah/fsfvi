/// MFA (Multi-Factor Authentication) Endpoints
/// Production-ready implementation for government-level security

use actix_web::{web, HttpMessage, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::{
    config::AppConfig,
    models::ApiResponse,
    services::{jwt::Claims, mfa::MfaService},
};

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/mfa")
            .route("/setup", web::post().to(setup_mfa))
            .route("/verify-setup", web::post().to(verify_mfa_setup))
            .route("/disable", web::post().to(disable_mfa))
            .route("/verify-backup-code", web::post().to(verify_backup_code)),
    );
}

#[derive(Debug, Serialize)]
pub struct SetupMfaResponse {
    /// Base32-encoded secret for manual entry
    pub secret: String,
    /// OTPAuth URL for QR code generation
    pub otpauth_url: String,
    /// One-time backup codes (save these securely!)
    pub backup_codes: Vec<String>,
    /// Instructions for the user
    pub instructions: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct VerifyMfaSetupRequest {
    #[validate(length(equal = 6))]
    pub code: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct DisableMfaRequest {
    #[validate(length(equal = 6))]
    pub code: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct VerifyBackupCodeRequest {
    #[validate(length(equal = 8))]
    pub backup_code: String,
}

/// POST /api/v1/mfa/setup
/// Initialize MFA setup for the authenticated user
/// Requires: JWT authentication (Developer or Admin role)
async fn setup_mfa(
    req: actix_web::HttpRequest,
    db_pool: web::Data<PgPool>,
    config: web::Data<AppConfig>,
) -> HttpResponse {
    // Extract user claims from request extensions (added by AuthMiddleware)
    let claims = match req.extensions().get::<Claims>() {
        Some(claims) => claims.clone(),
        None => {
            return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(
                "Authentication required".to_string(),
            ))
        }
    };

    // Parse user ID from claims
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Invalid user ID".to_string()))
        }
    };

    // Check if MFA is already enabled
    let user = match sqlx::query!(
        "SELECT mfa_enabled, email FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(db_pool.get_ref())
    .await
    {
        Ok(Some(user)) => user,
        Ok(None) => {
            return HttpResponse::NotFound()
                .json(ApiResponse::<()>::error("User not found".to_string()))
        }
        Err(e) => {
            tracing::error!("Database error: {:?}", e);
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Database error".to_string()));
        }
    };

    if user.mfa_enabled {
        return HttpResponse::BadRequest()
            .json(ApiResponse::<()>::error("MFA is already enabled".to_string()));
    }

    // Generate MFA setup
    let (encrypted_secret, setup, backup_code_hashes) =
        match MfaService::setup_mfa(&user.email, "FSFI System", &config) {
            Ok(result) => result,
            Err(e) => {
                tracing::error!("MFA setup failed: {:?}", e);
                return HttpResponse::InternalServerError()
                    .json(ApiResponse::<()>::error("Failed to setup MFA".to_string()));
            }
        };

    // Delete any existing backup codes (in case user is re-setting up MFA)
    if let Err(e) = sqlx::query!("DELETE FROM mfa_backup_codes WHERE user_id = $1", user_id)
        .execute(db_pool.get_ref())
        .await
    {
        tracing::error!("Failed to delete existing backup codes: {:?}", e);
        return HttpResponse::InternalServerError()
            .json(ApiResponse::<()>::error("Failed to cleanup existing backup codes".to_string()));
    }

    // Store encrypted secret and backup codes in database (but don't enable MFA yet)
    // User must verify a TOTP code first to confirm setup
    if let Err(e) = sqlx::query!(
        r#"
        UPDATE users
        SET mfa_secret = $1, updated_at = NOW()
        WHERE id = $2
        "#,
        encrypted_secret,
        user_id
    )
    .execute(db_pool.get_ref())
    .await
    {
        tracing::error!("Failed to save MFA secret: {:?}", e);
        return HttpResponse::InternalServerError()
            .json(ApiResponse::<()>::error("Failed to save MFA secret".to_string()));
    }

    // Store backup codes
    for (i, hash) in backup_code_hashes.iter().enumerate() {
        if let Err(e) = sqlx::query!(
            r#"
            INSERT INTO mfa_backup_codes (user_id, code_hash, code_number)
            VALUES ($1, $2, $3)
            "#,
            user_id,
            hash,
            i as i32
        )
        .execute(db_pool.get_ref())
        .await
        {
            tracing::error!("Failed to save backup code: {:?}", e);
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Failed to save backup codes".to_string()));
        }
    }

    let response = SetupMfaResponse {
        secret: setup.secret.clone(),
        otpauth_url: setup.otpauth_url,
        backup_codes: setup.backup_codes,
        instructions: format!(
            "1. Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)\n\
             2. Or manually enter this secret: {}\n\
             3. Save your backup codes in a secure location\n\
             4. Verify setup by entering a code from your authenticator app",
            setup.secret
        ),
    };

    HttpResponse::Ok().json(ApiResponse::success(response))
}

/// POST /api/v1/mfa/verify-setup
/// Verify MFA setup by providing a TOTP code
/// This enables MFA for the user's account
async fn verify_mfa_setup(
    req: actix_web::HttpRequest,
    body: web::Json<VerifyMfaSetupRequest>,
    db_pool: web::Data<PgPool>,
    config: web::Data<AppConfig>,
) -> HttpResponse {
    if let Err(e) = body.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!(
            "Validation error: {}",
            e
        )));
    }

    let claims = match req.extensions().get::<Claims>() {
        Some(claims) => claims.clone(),
        None => {
            return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(
                "Authentication required".to_string(),
            ))
        }
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Invalid user ID".to_string()))
        }
    };

    // Get user's MFA secret
    let user = match sqlx::query!(
        "SELECT mfa_secret, mfa_enabled FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(db_pool.get_ref())
    .await
    {
        Ok(Some(user)) => user,
        Ok(None) => {
            return HttpResponse::NotFound()
                .json(ApiResponse::<()>::error("User not found".to_string()))
        }
        Err(e) => {
            tracing::error!("Database error: {:?}", e);
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Database error".to_string()));
        }
    };

    if user.mfa_enabled {
        return HttpResponse::BadRequest()
            .json(ApiResponse::<()>::error("MFA is already enabled".to_string()));
    }

    let encrypted_secret = match user.mfa_secret {
        Some(secret) => secret,
        None => {
            return HttpResponse::BadRequest().json(ApiResponse::<()>::error(
                "MFA setup not initiated. Call /mfa/setup first".to_string(),
            ))
        }
    };

    // Verify the TOTP code
    match MfaService::verify_totp(&encrypted_secret, &body.code, &config) {
        Ok(true) => {
            // Code is valid, enable MFA
            if let Err(e) = sqlx::query!(
                "UPDATE users SET mfa_enabled = true, updated_at = NOW() WHERE id = $1",
                user_id
            )
            .execute(db_pool.get_ref())
            .await
            {
                tracing::error!("Failed to enable MFA: {:?}", e);
                return HttpResponse::InternalServerError()
                    .json(ApiResponse::<()>::error("Failed to enable MFA".to_string()));
            }

            HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
                "message": "MFA successfully enabled",
                "mfa_enabled": true
            })))
        }
        Ok(false) => HttpResponse::BadRequest()
            .json(ApiResponse::<()>::error("Invalid verification code".to_string())),
        Err(e) => {
            tracing::error!("MFA verification error: {:?}", e);
            HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Verification failed".to_string()))
        }
    }
}

/// POST /api/v1/mfa/disable
/// Disable MFA for the authenticated user
/// Requires a valid TOTP code to confirm
async fn disable_mfa(
    req: actix_web::HttpRequest,
    body: web::Json<DisableMfaRequest>,
    db_pool: web::Data<PgPool>,
    config: web::Data<AppConfig>,
) -> HttpResponse {
    if let Err(e) = body.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!(
            "Validation error: {}",
            e
        )));
    }

    let claims = match req.extensions().get::<Claims>() {
        Some(claims) => claims.clone(),
        None => {
            return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(
                "Authentication required".to_string(),
            ))
        }
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Invalid user ID".to_string()))
        }
    };

    // Get user's MFA secret
    let user = match sqlx::query!(
        "SELECT mfa_secret, mfa_enabled FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(db_pool.get_ref())
    .await
    {
        Ok(Some(user)) => user,
        Ok(None) => {
            return HttpResponse::NotFound()
                .json(ApiResponse::<()>::error("User not found".to_string()))
        }
        Err(e) => {
            tracing::error!("Database error: {:?}", e);
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Database error".to_string()));
        }
    };

    if !user.mfa_enabled {
        return HttpResponse::BadRequest()
            .json(ApiResponse::<()>::error("MFA is not enabled".to_string()));
    }

    let encrypted_secret = match user.mfa_secret {
        Some(secret) => secret,
        None => {
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("MFA secret not found".to_string()))
        }
    };

    // Verify the TOTP code before disabling
    match MfaService::verify_totp(&encrypted_secret, &body.code, &config) {
        Ok(true) => {
            // Code is valid, disable MFA
            if let Err(e) = sqlx::query!(
                r#"
                UPDATE users
                SET mfa_enabled = false, mfa_secret = NULL, updated_at = NOW()
                WHERE id = $1
                "#,
                user_id
            )
            .execute(db_pool.get_ref())
            .await
            {
                tracing::error!("Failed to disable MFA: {:?}", e);
                return HttpResponse::InternalServerError()
                    .json(ApiResponse::<()>::error("Failed to disable MFA".to_string()));
            }

            // Delete backup codes
            let _ = sqlx::query!("DELETE FROM mfa_backup_codes WHERE user_id = $1", user_id)
                .execute(db_pool.get_ref())
                .await;

            HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
                "message": "MFA successfully disabled",
                "mfa_enabled": false
            })))
        }
        Ok(false) => HttpResponse::BadRequest()
            .json(ApiResponse::<()>::error("Invalid verification code".to_string())),
        Err(e) => {
            tracing::error!("MFA verification error: {:?}", e);
            HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Verification failed".to_string()))
        }
    }
}

/// POST /api/v1/mfa/verify-backup-code
/// Verify and consume a backup code
/// Used for account recovery when authenticator app is unavailable
async fn verify_backup_code(
    req: actix_web::HttpRequest,
    body: web::Json<VerifyBackupCodeRequest>,
    db_pool: web::Data<PgPool>,
) -> HttpResponse {
    if let Err(e) = body.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!(
            "Validation error: {}",
            e
        )));
    }

    let claims = match req.extensions().get::<Claims>() {
        Some(claims) => claims.clone(),
        None => {
            return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(
                "Authentication required".to_string(),
            ))
        }
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Invalid user ID".to_string()))
        }
    };

    // Get all unused backup codes for the user
    let backup_codes = match sqlx::query!(
        r#"
        SELECT id, code_hash
        FROM mfa_backup_codes
        WHERE user_id = $1 AND used_at IS NULL
        "#,
        user_id
    )
    .fetch_all(db_pool.get_ref())
    .await
    {
        Ok(codes) => codes,
        Err(e) => {
            tracing::error!("Database error: {:?}", e);
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Database error".to_string()));
        }
    };

    // Verify backup code against all unused codes
    for code_record in backup_codes {
        if MfaService::verify_backup_code(&body.backup_code, &code_record.code_hash) {
            // Mark code as used
            if let Err(e) = sqlx::query!(
                "UPDATE mfa_backup_codes SET used_at = NOW() WHERE id = $1",
                code_record.id
            )
            .execute(db_pool.get_ref())
            .await
            {
                tracing::error!("Failed to mark backup code as used: {:?}", e);
                return HttpResponse::InternalServerError()
                    .json(ApiResponse::<()>::error("Failed to process backup code".to_string()));
            }

            // Count remaining codes
            let remaining = sqlx::query_scalar!(
                "SELECT COUNT(*) FROM mfa_backup_codes WHERE user_id = $1 AND used_at IS NULL",
                user_id
            )
            .fetch_one(db_pool.get_ref())
            .await
            .unwrap_or(Some(0))
            .unwrap_or(0);

            return HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
                "message": "Backup code verified successfully",
                "remaining_codes": remaining,
                "warning": if remaining < 3 {
                    Some("You are running low on backup codes. Consider regenerating them.")
                } else {
                    None
                }
            })));
        }
    }

    HttpResponse::BadRequest().json(ApiResponse::<()>::error(
        "Invalid or already used backup code".to_string(),
    ))
}
