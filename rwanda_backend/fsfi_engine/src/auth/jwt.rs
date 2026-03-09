//! JWT Service
//!
//! HS256 JSON Web Token generation and verification.
//! Access tokens (15 min) + Refresh tokens (30 days).

use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use pyo3::prelude::*;
use serde::{Deserialize, Serialize};

/// JWT Claims payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,        // User ID
    pub username: String,
    pub role: String,
    pub exp: i64,           // Expiration timestamp
    pub iat: i64,           // Issued at timestamp
    pub iss: String,        // Issuer
    pub aud: String,        // Audience
    pub jti: String,        // JWT ID (unique)
    pub session_id: String,
    pub token_type: String, // "access" or "refresh"
}

/// Token pair returned after successful authentication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    pub access_expires_at: i64,
    pub refresh_expires_at: i64,
    pub token_type: String,
}

const DEFAULT_ACCESS_EXPIRY_SECS: i64 = 15 * 60;        // 15 minutes
const DEFAULT_REFRESH_EXPIRY_SECS: i64 = 30 * 24 * 3600; // 30 days
const ISSUER: &str = "fsfi-rwanda-backend";
const AUDIENCE: &str = "rwanda-government";

/// Generate an access token
pub fn generate_access_token(
    user_id: &str,
    username: &str,
    role: &str,
    session_id: &str,
    secret: &str,
) -> Result<(String, i64), String> {
    let now = Utc::now().timestamp();
    let exp = now + DEFAULT_ACCESS_EXPIRY_SECS;

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        role: role.to_string(),
        exp,
        iat: now,
        iss: ISSUER.to_string(),
        aud: AUDIENCE.to_string(),
        jti: uuid::Uuid::new_v4().to_string(),
        session_id: session_id.to_string(),
        token_type: "access".to_string(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map(|token| (token, exp))
    .map_err(|e| format!("Token generation failed: {}", e))
}

/// Generate a refresh token
pub fn generate_refresh_token(
    user_id: &str,
    username: &str,
    role: &str,
    session_id: &str,
    secret: &str,
) -> Result<(String, i64), String> {
    let now = Utc::now().timestamp();
    let exp = now + DEFAULT_REFRESH_EXPIRY_SECS;

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        role: role.to_string(),
        exp,
        iat: now,
        iss: ISSUER.to_string(),
        aud: AUDIENCE.to_string(),
        jti: uuid::Uuid::new_v4().to_string(),
        session_id: session_id.to_string(),
        token_type: "refresh".to_string(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map(|token| (token, exp))
    .map_err(|e| format!("Refresh token generation failed: {}", e))
}

/// Generate both access and refresh tokens
pub fn generate_token_pair(
    user_id: &str,
    username: &str,
    role: &str,
    session_id: &str,
    secret: &str,
) -> Result<TokenPair, String> {
    let (access_token, access_exp) =
        generate_access_token(user_id, username, role, session_id, secret)?;
    let (refresh_token, refresh_exp) =
        generate_refresh_token(user_id, username, role, session_id, secret)?;

    Ok(TokenPair {
        access_token,
        refresh_token,
        access_expires_at: access_exp,
        refresh_expires_at: refresh_exp,
        token_type: "Bearer".to_string(),
    })
}

/// Verify and decode a JWT token
pub fn verify_token(token: &str, secret: &str) -> Result<Claims, String> {
    let mut validation = Validation::default();
    validation.set_issuer(&[ISSUER]);
    validation.set_audience(&[AUDIENCE]);
    validation.leeway = 60; // 60 second clock skew tolerance

    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map(|data| data.claims)
    .map_err(|e| format!("Token verification failed: {}", e))
}

/// Generate a unique session ID
pub fn generate_session_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

// ---------------------------------------------------------------------------
// PyO3 Functions
// ---------------------------------------------------------------------------

#[pyfunction]
fn py_generate_token_pair(
    user_id: &str,
    username: &str,
    role: &str,
    session_id: &str,
    secret: &str,
) -> PyResult<String> {
    let pair = generate_token_pair(user_id, username, role, session_id, secret)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))?;

    serde_json::to_string(&pair)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Serialization error: {}", e)))
}

#[pyfunction]
fn py_verify_token(token: &str, secret: &str) -> PyResult<String> {
    let claims = verify_token(token, secret)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))?;

    serde_json::to_string(&claims)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Serialization error: {}", e)))
}

#[pyfunction]
fn py_generate_session_id() -> PyResult<String> {
    Ok(generate_session_id())
}

pub fn register_functions(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(py_generate_token_pair, m)?)?;
    m.add_function(wrap_pyfunction!(py_verify_token, m)?)?;
    m.add_function(wrap_pyfunction!(py_generate_session_id, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_SECRET: &str = "test-secret-key-for-jwt-testing-minimum-32-chars!";

    #[test]
    fn test_generate_and_verify_access_token() {
        let session_id = generate_session_id();
        let (token, _exp) =
            generate_access_token("user-1", "admin", "admin", &session_id, TEST_SECRET).unwrap();

        let claims = verify_token(&token, TEST_SECRET).unwrap();
        assert_eq!(claims.sub, "user-1");
        assert_eq!(claims.username, "admin");
        assert_eq!(claims.role, "admin");
        assert_eq!(claims.token_type, "access");
    }

    #[test]
    fn test_generate_token_pair() {
        let session_id = generate_session_id();
        let pair =
            generate_token_pair("user-1", "admin", "admin", &session_id, TEST_SECRET).unwrap();

        assert!(!pair.access_token.is_empty());
        assert!(!pair.refresh_token.is_empty());
        assert_eq!(pair.token_type, "Bearer");
        assert!(pair.refresh_expires_at > pair.access_expires_at);
    }

    #[test]
    fn test_verify_with_wrong_secret() {
        let session_id = generate_session_id();
        let (token, _) =
            generate_access_token("user-1", "admin", "admin", &session_id, TEST_SECRET).unwrap();

        let result = verify_token(&token, "wrong-secret");
        assert!(result.is_err());
    }

    #[test]
    fn test_session_id_uniqueness() {
        let id1 = generate_session_id();
        let id2 = generate_session_id();
        assert_ne!(id1, id2);
    }
}
