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

    #[test]
    fn test_token_contains_user_information() {
        let config = SecurityConfig::default();
        let service = TokenService::new(config);
        let user = create_test_user();
        let session_id = "session_123";

        let token = service.generate_token(&user, session_id).unwrap();
        let validation = service.validate_token(&token).unwrap();

        // Verify all user information is preserved
        assert_eq!(validation.user_id, user.id);
        assert_eq!(validation.username, user.username);
        assert_eq!(validation.role, "demo_government");
        assert_eq!(validation.session_id, session_id);
        assert_eq!(validation.is_temp_password, user.is_temporary_password);
    }

    #[test]
    fn test_token_temporary_password_flag() {
        let config = SecurityConfig::default();
        let service = TokenService::new(config);

        let mut user = create_test_user();
        user.is_temporary_password = true;
        let session_id = "temp_session";

        let token = service.generate_token(&user, session_id).unwrap();
        let validation = service.validate_token(&token).unwrap();

        assert!(validation.is_temp_password);
    }

    #[test]
    fn test_token_expiration_in_future() {
        let config = SecurityConfig::default();
        let jwt_expiration_hours = config.jwt_expiration_hours;
        let service = TokenService::new(config);
        let user = create_test_user();
        let session_id = "test_session";

        let token = service.generate_token(&user, session_id).unwrap();
        let validation = service.validate_token(&token).unwrap();

        // Token should expire in the future (8 hours by default)
        assert!(validation.expires_at > Utc::now());

        // Should be approximately 8 hours from now (within 1 minute tolerance)
        let expected_expiry = Utc::now() + Duration::hours(jwt_expiration_hours);
        let time_diff = (validation.expires_at - expected_expiry).num_minutes().abs();
        assert!(time_diff < 1, "Token expiry time is not within expected range");
    }

    #[test]
    fn test_token_with_different_secret_fails() {
        let config1 = SecurityConfig {
            jwt_secret: "secret_one".to_string(),
            ..SecurityConfig::default()
        };
        let config2 = SecurityConfig {
            jwt_secret: "secret_two".to_string(),
            ..SecurityConfig::default()
        };

        let service1 = TokenService::new(config1);
        let service2 = TokenService::new(config2);
        let user = create_test_user();

        // Generate token with service1
        let token = service1.generate_token(&user, "session").unwrap();

        // Validation with service2 (different secret) should fail
        assert!(service2.validate_token(&token).is_err());
    }

    #[test]
    fn test_multiple_tokens_for_same_user() {
        let config = SecurityConfig::default();
        let service = TokenService::new(config);
        let user = create_test_user();

        // Generate multiple tokens for the same user
        let token1 = service.generate_token(&user, "session_1").unwrap();
        let token2 = service.generate_token(&user, "session_2").unwrap();

        // Tokens should be different
        assert_ne!(token1, token2);

        // Both should validate correctly
        let validation1 = service.validate_token(&token1).unwrap();
        let validation2 = service.validate_token(&token2).unwrap();

        assert_eq!(validation1.user_id, user.id);
        assert_eq!(validation2.user_id, user.id);
        assert_eq!(validation1.session_id, "session_1");
        assert_eq!(validation2.session_id, "session_2");
    }

    #[test]
    fn test_session_id_generation() {
        let session_id1 = TokenService::generate_session_id();
        let session_id2 = TokenService::generate_session_id();

        // Session IDs should be unique
        assert_ne!(session_id1, session_id2);

        // Should be valid UUIDs
        assert!(Uuid::parse_str(&session_id1).is_ok());
        assert!(Uuid::parse_str(&session_id2).is_ok());
    }

    #[test]
    fn test_extract_user_id_from_valid_token() {
        let config = SecurityConfig::default();
        let service = TokenService::new(config);
        let user = create_test_user();

        let token = service.generate_token(&user, "session").unwrap();
        let extracted_id = service.extract_user_id(&token);

        assert!(extracted_id.is_some());
        assert_eq!(extracted_id.unwrap(), user.id);
    }

    #[test]
    fn test_extract_user_id_from_invalid_token() {
        let config = SecurityConfig::default();
        let service = TokenService::new(config);

        let extracted_id = service.extract_user_id("invalid_token");
        assert!(extracted_id.is_none());
    }

    #[test]
    fn test_extract_user_id_from_expired_token() {
        // Create a token with very short expiration
        let mut config = SecurityConfig::default();
        config.jwt_expiration_hours = -1; // Expired 1 hour ago

        let service = TokenService::new(config);
        let user = create_test_user();

        let token = service.generate_token(&user, "session").unwrap();

        // extract_user_id should still work (doesn't validate expiration)
        let extracted_id = service.extract_user_id(&token);
        assert!(extracted_id.is_some());
        assert_eq!(extracted_id.unwrap(), user.id);

        // But validate_token should fail
        assert!(service.validate_token(&token).is_err());
    }

    #[test]
    fn test_token_role_validation() {
        let config = SecurityConfig::default();
        let service = TokenService::new(config);
        let user = create_test_user();

        let token = service.generate_token(&user, "session").unwrap();
        let validation = service.validate_token(&token).unwrap();

        // Should have correct role
        assert_eq!(validation.role, "demo_government");
    }

    // CRITICAL: Token Blacklist Tests
    #[test]
    fn test_blacklist_new_empty() {
        let blacklist = TokenBlacklist::new();

        // New blacklist should be empty
        assert!(!blacklist.is_blacklisted("any_token"));
    }

    #[test]
    fn test_blacklist_add_and_check() {
        let mut blacklist = TokenBlacklist::new();
        let token = "test_token_12345";

        // Token should not be blacklisted initially
        assert!(!blacklist.is_blacklisted(token));

        // Blacklist the token
        blacklist.blacklist_token(token.to_string());

        // Token should now be blacklisted
        assert!(blacklist.is_blacklisted(token));
    }

    #[test]
    fn test_blacklist_multiple_tokens() {
        let mut blacklist = TokenBlacklist::new();
        let token1 = "token_1";
        let token2 = "token_2";
        let token3 = "token_3";

        // Blacklist multiple tokens
        blacklist.blacklist_token(token1.to_string());
        blacklist.blacklist_token(token2.to_string());

        // Blacklisted tokens should return true
        assert!(blacklist.is_blacklisted(token1));
        assert!(blacklist.is_blacklisted(token2));

        // Non-blacklisted token should return false
        assert!(!blacklist.is_blacklisted(token3));
    }

    #[test]
    fn test_blacklist_duplicate_add() {
        let mut blacklist = TokenBlacklist::new();
        let token = "duplicate_token";

        // Add same token twice
        blacklist.blacklist_token(token.to_string());
        blacklist.blacklist_token(token.to_string());

        // Should still be blacklisted (no errors from duplicates)
        assert!(blacklist.is_blacklisted(token));
    }

    #[test]
    fn test_blacklist_with_real_jwt_tokens() {
        let config = SecurityConfig::default();
        let service = TokenService::new(config);
        let user = create_test_user();
        let mut blacklist = TokenBlacklist::new();

        // Generate real JWT token
        let token = service.generate_token(&user, "session").unwrap();

        // Token should validate before blacklisting
        assert!(service.validate_token(&token).is_ok());

        // Blacklist the token
        blacklist.blacklist_token(token.clone());

        // Token should be in blacklist
        assert!(blacklist.is_blacklisted(&token));

        // Different token should not be blacklisted
        let token2 = service.generate_token(&user, "session2").unwrap();
        assert!(!blacklist.is_blacklisted(&token2));
    }

    #[test]
    fn test_token_invalid_audience() {
        let config = SecurityConfig::default();
        let service = TokenService::new(config);
        let user = create_test_user();

        // Generate a valid token
        let token = service.generate_token(&user, "session").unwrap();

        // Create a service with different audience validation
        let mut different_validation = Validation::new(Algorithm::HS256);
        different_validation.set_audience(&["different-audience"]);
        different_validation.set_issuer(&["fsfvi-demo-gov-backend"]);

        let different_service = TokenService {
            encoding_key: service.encoding_key.clone(),
            decoding_key: service.decoding_key.clone(),
            config: service.config.clone(),
            validation: different_validation,
        };

        // Token should fail validation with different audience
        assert!(different_service.validate_token(&token).is_err());
    }

    #[test]
    fn test_token_invalid_issuer() {
        let config = SecurityConfig::default();
        let service = TokenService::new(config);
        let user = create_test_user();

        // Generate a valid token
        let token = service.generate_token(&user, "session").unwrap();

        // Create a service with different issuer validation
        let mut different_validation = Validation::new(Algorithm::HS256);
        different_validation.set_audience(&["demo-government"]);
        different_validation.set_issuer(&["different-issuer"]);

        let different_service = TokenService {
            encoding_key: service.encoding_key.clone(),
            decoding_key: service.decoding_key.clone(),
            config: service.config.clone(),
            validation: different_validation,
        };

        // Token should fail validation with different issuer
        assert!(different_service.validate_token(&token).is_err());
    }

    #[test]
    fn test_token_claims_have_unique_jti() {
        let config = SecurityConfig::default();
        let service = TokenService::new(config);
        let user = create_test_user();

        // Generate multiple tokens
        let token1 = service.generate_token(&user, "session").unwrap();
        let token2 = service.generate_token(&user, "session").unwrap();

        // Decode tokens to check JTI (JWT ID) - use lenient validation
        let mut lenient_validation = Validation::new(Algorithm::HS256);
        lenient_validation.validate_exp = false;
        lenient_validation.validate_aud = false;
        lenient_validation.set_issuer(&["fsfvi-demo-gov-backend"]);

        let claims1 = decode::<Claims>(&token1, &service.decoding_key, &lenient_validation)
            .unwrap()
            .claims;
        let claims2 = decode::<Claims>(&token2, &service.decoding_key, &lenient_validation)
            .unwrap()
            .claims;

        // JTI should be unique for each token
        assert_ne!(claims1.jti, claims2.jti);
    }
}