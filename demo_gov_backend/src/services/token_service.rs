use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use std::collections::HashSet;
use uuid::Uuid;

use crate::models::auth::{AuthError, AuthResult, Claims, SecurityConfig, TokenValidation};
use crate::models::user::{User, UserRole};

/// JWT Token service for secure token management
#[derive(Clone)]
pub struct TokenService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    config: SecurityConfig,
    validation: Validation,
}

impl TokenService {
    pub fn new(config: SecurityConfig) -> Self {
        let encoding_key = EncodingKey::from_secret(config.jwt_secret.as_ref());
        let decoding_key = DecodingKey::from_secret(config.jwt_secret.as_ref());

        let mut validation = Validation::new(Algorithm::HS256);
        validation.set_audience(&["demo-government"]);
        validation.set_issuer(&["fsfvi-demo-gov-backend"]);
        validation.leeway = 60; // 1 minute leeway for clock skew

        Self {
            encoding_key,
            decoding_key,
            config,
            validation,
        }
    }

    /// Generate JWT token for authenticated user
    pub fn generate_token(&self, user: &User, session_id: &str) -> AuthResult<String> {
        let now = Utc::now();
        let expires_at = now + Duration::hours(self.config.jwt_expiration_hours);

        let claims = Claims {
            sub: user.id.to_string(),
            username: user.username.clone(),
            role: match user.role {
                UserRole::DemoGovernment => "demo_government".to_string(),
            },
            exp: expires_at.timestamp() as usize,
            iat: now.timestamp() as usize,
            iss: "fsfvi-demo-gov-backend".to_string(),
            aud: "demo-government".to_string(),
            jti: Uuid::new_v4().to_string(),
            session_id: session_id.to_string(),
            is_temp_password: user.is_temporary_password,
        };

        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|_| AuthError::InternalError("Failed to generate token".to_string()))
    }

    /// Validate and decode JWT token
    pub fn validate_token(&self, token: &str) -> AuthResult<TokenValidation> {
        let token_data = decode::<Claims>(token, &self.decoding_key, &self.validation)
            .map_err(|e| match e.kind() {
                jsonwebtoken::errors::ErrorKind::ExpiredSignature => AuthError::TokenExpired,
                jsonwebtoken::errors::ErrorKind::InvalidToken => AuthError::InvalidToken,
                jsonwebtoken::errors::ErrorKind::InvalidIssuer => AuthError::InvalidToken,
                jsonwebtoken::errors::ErrorKind::InvalidAudience => AuthError::InvalidToken,
                _ => AuthError::InvalidToken,
            })?;

        let claims = token_data.claims;

        // Additional validation
        self.validate_claims(&claims)?;

        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| AuthError::InvalidToken)?;

        let expires_at = chrono::DateTime::from_timestamp(claims.exp as i64, 0)
            .ok_or(AuthError::InvalidToken)?
            .with_timezone(&Utc);

        Ok(TokenValidation {
            user_id,
            username: claims.username,
            role: claims.role,
            session_id: claims.session_id,
            is_temp_password: claims.is_temp_password,
            expires_at,
        })
    }

    /// Validate token claims
    fn validate_claims(&self, claims: &Claims) -> AuthResult<()> {
        // Check if token is expired (with some leeway)
        let now = Utc::now().timestamp() as usize;
        if claims.exp < now {
            return Err(AuthError::TokenExpired);
        }

        // Validate role
        match claims.role.as_str() {
            "demo_government" => Ok(()),
            _ => Err(AuthError::Unauthorized),
        }
    }

    /// Extract user ID from token without full validation (for logging purposes)
    pub fn extract_user_id(&self, token: &str) -> Option<Uuid> {
        // Create a more lenient validation for extraction
        let mut lenient_validation = Validation::new(Algorithm::HS256);
        lenient_validation.validate_exp = false;
        lenient_validation.validate_aud = false;

        if let Ok(token_data) = decode::<Claims>(token, &self.decoding_key, &lenient_validation) {
            Uuid::parse_str(&token_data.claims.sub).ok()
        } else {
            None
        }
    }

    /// Generate session ID
    pub fn generate_session_id() -> String {
        Uuid::new_v4().to_string()
    }
}

/// Token blacklist service (in-memory implementation)
/// In production, this should be backed by Redis or a database
pub struct TokenBlacklist {
    blacklisted_tokens: HashSet<String>,
}

impl TokenBlacklist {
    pub fn new() -> Self {
        Self {
            blacklisted_tokens: HashSet::new(),
        }
    }

    pub fn blacklist_token(&mut self, token: String) {
        self.blacklisted_tokens.insert(token);
    }

    pub fn is_blacklisted(&self, token: &str) -> bool {
        self.blacklisted_tokens.contains(token)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::user::{User, UserRole};
    use chrono::Utc;
    use uuid::Uuid;

    fn create_test_user() -> User {
        User {
            id: Uuid::new_v4(),
            username: "test_user".to_string(),
            password_hash: "dummy_hash".to_string(),
            role: UserRole::DemoGovernment,
            is_temporary_password: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_login: None,
            login_attempts: 0,
            is_locked: false,
            lockout_expiry: None,
            password_changed_at: None,
            session_token: None,
            session_expires_at: None,
            two_fa_enabled: false,
            two_fa_secret: None,
            two_fa_backup_codes: None,
            two_fa_enabled_at: None,
        }
    }

    #[test]
    fn test_token_generation_and_validation() {
        let config = SecurityConfig::default();
        let service = TokenService::new(config);
        let user = create_test_user();
        let session_id = "test_session";

        // Generate token
        let token = service.generate_token(&user, session_id).unwrap();
        assert!(!token.is_empty());

        // Validate token
        let validation = service.validate_token(&token).unwrap();
        assert_eq!(validation.user_id, user.id);
        assert_eq!(validation.username, user.username);
        assert_eq!(validation.session_id, session_id);
    }

    #[test]
    fn test_invalid_token_rejection() {
        let config = SecurityConfig::default();
        let service = TokenService::new(config);

        // Test invalid token
        assert!(service.validate_token("invalid_token").is_err());

        // Test malformed token
        assert!(service.validate_token("header.payload.signature").is_err());
    }
}