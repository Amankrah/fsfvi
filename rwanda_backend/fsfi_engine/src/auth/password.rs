//! Password Service
//!
//! Argon2id password hashing and verification.
//! Government-grade security for Rwanda FSFI system.

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use pyo3::prelude::*;
use rand::Rng;

/// Hash a password using Argon2id with random salt
pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| format!("Password hashing failed: {}", e))
}

/// Verify a password against an Argon2id hash
pub fn verify_password(password: &str, password_hash: &str) -> Result<bool, String> {
    let parsed_hash =
        PasswordHash::new(password_hash).map_err(|e| format!("Invalid hash format: {}", e))?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

/// Generate a secure random password
pub fn generate_secure_password() -> String {
    let mut rng = rand::thread_rng();
    let chars: Vec<char> = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*"
        .chars()
        .collect();
    (0..16).map(|_| chars[rng.gen_range(0..chars.len())]).collect()
}

/// Validate password strength
pub fn validate_password_strength(password: &str) -> Result<(), String> {
    if password.len() < 12 {
        return Err("Password must be at least 12 characters".to_string());
    }

    let has_upper = password.chars().any(|c| c.is_uppercase());
    let has_lower = password.chars().any(|c| c.is_lowercase());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());
    let has_special = password.chars().any(|c| !c.is_alphanumeric());

    if !has_upper {
        return Err("Password must contain at least one uppercase letter".to_string());
    }
    if !has_lower {
        return Err("Password must contain at least one lowercase letter".to_string());
    }
    if !has_digit {
        return Err("Password must contain at least one digit".to_string());
    }
    if !has_special {
        return Err("Password must contain at least one special character".to_string());
    }

    // Check for repeating characters
    let chars: Vec<char> = password.chars().collect();
    for i in 0..chars.len().saturating_sub(2) {
        if chars[i] == chars[i + 1] && chars[i + 1] == chars[i + 2] {
            return Err("Password must not contain 3 or more repeating characters".to_string());
        }
    }

    // Check forbidden patterns
    let lower = password.to_lowercase();
    let forbidden = ["123", "abc", "password", "qwerty", "rwanda", "government"];
    for pattern in &forbidden {
        if lower.contains(pattern) {
            return Err(format!("Password must not contain '{}'", pattern));
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// PyO3 Functions
// ---------------------------------------------------------------------------

#[pyfunction]
fn py_hash_password(password: &str) -> PyResult<String> {
    hash_password(password).map_err(|e| pyo3::exceptions::PyValueError::new_err(e))
}

#[pyfunction]
fn py_verify_password(password: &str, password_hash: &str) -> PyResult<bool> {
    verify_password(password, password_hash).map_err(|e| pyo3::exceptions::PyValueError::new_err(e))
}

#[pyfunction]
fn py_generate_secure_password() -> PyResult<String> {
    Ok(generate_secure_password())
}

#[pyfunction]
fn py_validate_password_strength(password: &str) -> PyResult<()> {
    validate_password_strength(password).map_err(|e| pyo3::exceptions::PyValueError::new_err(e))
}

pub fn register_functions(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(py_hash_password, m)?)?;
    m.add_function(wrap_pyfunction!(py_verify_password, m)?)?;
    m.add_function(wrap_pyfunction!(py_generate_secure_password, m)?)?;
    m.add_function(wrap_pyfunction!(py_validate_password_strength, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify() {
        let password = "SecureP@ssw0rd!2024";
        let hash = hash_password(password).unwrap();
        assert!(hash.starts_with("$argon2"));
        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password("wrong_password", &hash).unwrap());
    }

    #[test]
    fn test_generate_secure_password() {
        let pwd = generate_secure_password();
        assert_eq!(pwd.len(), 16);
    }

    #[test]
    fn test_password_validation_too_short() {
        assert!(validate_password_strength("Short1!").is_err());
    }

    #[test]
    fn test_password_validation_no_special() {
        assert!(validate_password_strength("SecurePassword123").is_err());
    }

    #[test]
    fn test_password_validation_valid() {
        assert!(validate_password_strength("SecureP@ssw0rd!2").is_ok());
    }

    #[test]
    fn test_password_validation_forbidden() {
        assert!(validate_password_strength("MyPassword123!x").is_err());
    }

    #[test]
    fn test_password_validation_repeating() {
        assert!(validate_password_strength("Seeecure@Pass1!").is_err());
    }
}
