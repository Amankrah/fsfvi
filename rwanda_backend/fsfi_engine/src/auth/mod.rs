//! FSFI Authentication Module
//!
//! Handles all authentication at the Rust level:
//! - Password hashing (Argon2id)
//! - JWT token generation/verification (HS256)
//! - AES-256-GCM encryption for sensitive data
//! - TOTP-based 2FA with backup codes

pub mod encryption;
pub mod jwt;
pub mod mfa;
pub mod password;

use pyo3::prelude::*;

pub fn register_module(m: &Bound<'_, PyModule>) -> PyResult<()> {
    password::register_functions(m)?;
    jwt::register_functions(m)?;
    encryption::register_functions(m)?;
    mfa::register_functions(m)?;
    Ok(())
}
