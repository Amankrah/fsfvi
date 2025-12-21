/// Unified Authentication Context Extraction
/// ==========================================
/// Extracts authentication context from BOTH JWT tokens and API keys
/// This allows FSFVI handlers to work with either authentication method

use actix_web::{HttpMessage, HttpRequest};
use uuid::Uuid;

use crate::{
    middleware::api_key_auth::ApiKeyAuthContext,
    services::jwt::Claims,
    utils::error::AppError,
};

/// Unified authentication context that works for both JWT and API key auth
#[derive(Debug, Clone)]
pub struct AuthContext {
    pub user_id: Uuid,
    pub government_id: Uuid,
    pub scopes: Vec<String>,
    pub auth_method: AuthMethod,
}

#[derive(Debug, Clone)]
pub enum AuthMethod {
    Jwt,
    ApiKey,
}

/// Extract authentication context from request (supports both JWT and API key)
///
/// This function checks for BOTH authentication methods:
/// 1. First checks for ApiKeyAuthContext (from X-API-Key header)
/// 2. Falls back to Claims (from JWT Authorization header)
///
/// This allows FSFVI endpoints to accept authentication from either source.
pub fn extract_auth_context(req: &HttpRequest) -> Result<AuthContext, AppError> {
    // Try API key auth first (most common for government integrations)
    if let Some(api_key_ctx) = req.extensions().get::<ApiKeyAuthContext>() {
        // For API key authentication, use the actual user ID who created the API key
        // This ensures proper audit trail for government-level operations
        // The created_by_user_id tracks which government developer made the request
        return Ok(AuthContext {
            user_id: api_key_ctx.created_by_user_id,
            government_id: api_key_ctx.government_id,
            scopes: api_key_ctx.scopes.clone(),
            auth_method: AuthMethod::ApiKey,
        });
    }

    // Fall back to JWT auth (used by web portal)
    if let Some(claims) = req.extensions().get::<Claims>() {
        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| AppError::AuthenticationError("Invalid user ID in JWT".to_string()))?;

        let government_id = Uuid::parse_str(&claims.government_id)
            .map_err(|_| AppError::AuthenticationError("Invalid government ID in JWT".to_string()))?;

        return Ok(AuthContext {
            user_id,
            government_id,
            scopes: vec!["*".to_string()], // JWT users get full access (they already passed role checks)
            auth_method: AuthMethod::Jwt,
        });
    }

    // No authentication found
    Err(AppError::AuthenticationError(
        "Missing authentication: No JWT token or API key provided".to_string()
    ))
}
