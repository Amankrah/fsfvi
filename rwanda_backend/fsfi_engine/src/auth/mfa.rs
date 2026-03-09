//! MFA Service
//!
//! TOTP-based Two-Factor Authentication with backup codes.
//! Uses encrypted secret storage via AES-256-GCM.

use crate::auth::encryption;
use pyo3::prelude::*;
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// MFA setup result returned to the client
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MfaSetup {
    pub secret: String,              // Base32-encoded TOTP secret (plaintext, for QR)
    pub encrypted_secret: String,    // AES-256-GCM encrypted secret (for DB storage)
    pub otpauth_url: String,         // For QR code generation
    pub backup_codes: Vec<String>,   // 10 plaintext backup codes (show once)
    pub backup_code_hashes: Vec<String>, // SHA-256 hashes (for DB storage)
}

/// Generate a TOTP secret (20 random bytes, base32 encoded)
pub fn generate_secret() -> String {
    let mut rng = rand::thread_rng();
    let secret: Vec<u8> = (0..20).map(|_| rng.gen()).collect();
    base32_encode(&secret)
}

/// Set up MFA for a user
pub fn setup_mfa(
    username: &str,
    issuer: &str,
    encryption_key: &str,
) -> Result<MfaSetup, String> {
    let secret = generate_secret();

    // Encrypt secret for database storage
    let encrypted_secret = encryption::encrypt(&secret, encryption_key)?;

    // Generate OTPAuth URL for QR code
    let otpauth_url = format!(
        "otpauth://totp/{}:{}?secret={}&issuer={}&algorithm=SHA1&digits=6&period=30",
        issuer, username, secret, issuer
    );

    // Generate backup codes
    let backup_codes = generate_backup_codes(10);
    let backup_code_hashes: Vec<String> = backup_codes.iter().map(|c| hash_backup_code(c)).collect();

    Ok(MfaSetup {
        secret,
        encrypted_secret,
        otpauth_url,
        backup_codes,
        backup_code_hashes,
    })
}

/// Generate a TOTP code for the current time period
pub fn generate_totp(secret: &str, time_offset: Option<i64>) -> Result<String, String> {
    let secret_bytes = base32_decode(secret).ok_or("Invalid base32 secret")?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("System time error: {}", e))?
        .as_secs() as i64;

    let time = (now + time_offset.unwrap_or(0)) as u64;
    let seconds = totp_lite::totp_custom::<totp_lite::Sha1>(30, 6, &secret_bytes, time);
    Ok(seconds)
}

/// Verify a TOTP code (checks ±1 time window for clock drift)
pub fn verify_totp(secret: &str, code: &str) -> Result<bool, String> {
    // Check current period and ±1 period (90 second window)
    for offset in &[-30i64, 0, 30] {
        let generated = generate_totp(secret, Some(*offset))?;
        if generated == code {
            return Ok(true);
        }
    }
    Ok(false)
}

/// Verify TOTP using an encrypted secret (decrypt first)
pub fn verify_totp_encrypted(
    encrypted_secret: &str,
    code: &str,
    encryption_key: &str,
) -> Result<bool, String> {
    let secret = encryption::decrypt(encrypted_secret, encryption_key)?;
    verify_totp(&secret, code)
}

/// Generate backup codes (uppercase alphanumeric, no ambiguous chars)
pub fn generate_backup_codes(count: usize) -> Vec<String> {
    let mut rng = rand::thread_rng();
    // Exclude 0, O, I, 1 for readability
    let chars: Vec<char> = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".chars().collect();

    (0..count)
        .map(|_| {
            (0..8)
                .map(|_| chars[rng.gen_range(0..chars.len())])
                .collect()
        })
        .collect()
}

/// Hash a backup code using SHA-256
pub fn hash_backup_code(code: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(code.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Verify a backup code against stored hashes
pub fn verify_backup_code(code: &str, stored_hashes: &[String]) -> Option<usize> {
    let code_hash = hash_backup_code(&code.to_uppercase());
    stored_hashes.iter().position(|h| h == &code_hash)
}

// ---------------------------------------------------------------------------
// Base32 encoding/decoding (RFC 4648)
// ---------------------------------------------------------------------------

fn base32_encode(input: &[u8]) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let mut result = String::new();
    let mut buffer: u64 = 0;
    let mut bits_left = 0;

    for &byte in input {
        buffer = (buffer << 8) | byte as u64;
        bits_left += 8;
        while bits_left >= 5 {
            bits_left -= 5;
            result.push(ALPHABET[((buffer >> bits_left) & 0x1F) as usize] as char);
        }
    }

    if bits_left > 0 {
        buffer <<= 5 - bits_left;
        result.push(ALPHABET[(buffer & 0x1F) as usize] as char);
    }

    result
}

fn base32_decode(input: &str) -> Option<Vec<u8>> {
    let mut buffer: u64 = 0;
    let mut bits_left = 0;
    let mut result = Vec::new();

    for c in input.chars() {
        let val = match c {
            'A'..='Z' => c as u64 - 'A' as u64,
            '2'..='7' => c as u64 - '2' as u64 + 26,
            '=' => continue, // padding
            _ => return None,
        };
        buffer = (buffer << 5) | val;
        bits_left += 5;
        if bits_left >= 8 {
            bits_left -= 8;
            result.push((buffer >> bits_left) as u8);
        }
    }

    Some(result)
}

// ---------------------------------------------------------------------------
// PyO3 Functions
// ---------------------------------------------------------------------------

#[pyfunction]
fn py_setup_mfa(username: &str, issuer: &str, encryption_key: &str) -> PyResult<String> {
    let setup = setup_mfa(username, issuer, encryption_key)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))?;

    serde_json::to_string(&setup)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Serialization error: {}", e)))
}

#[pyfunction]
fn py_verify_totp_encrypted(
    encrypted_secret: &str,
    code: &str,
    encryption_key: &str,
) -> PyResult<bool> {
    verify_totp_encrypted(encrypted_secret, code, encryption_key)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))
}

#[pyfunction]
fn py_verify_backup_code(code: &str, stored_hashes: Vec<String>) -> PyResult<Option<usize>> {
    Ok(verify_backup_code(code, &stored_hashes))
}

#[pyfunction]
fn py_hash_backup_code(code: &str) -> PyResult<String> {
    Ok(hash_backup_code(code))
}

pub fn register_functions(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(py_setup_mfa, m)?)?;
    m.add_function(wrap_pyfunction!(py_verify_totp_encrypted, m)?)?;
    m.add_function(wrap_pyfunction!(py_verify_backup_code, m)?)?;
    m.add_function(wrap_pyfunction!(py_hash_backup_code, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_ENC_KEY: &str = "test-encryption-key-for-mfa-minimum-32-chars!!";

    #[test]
    fn test_generate_secret() {
        let secret = generate_secret();
        assert!(!secret.is_empty());
        // Should be valid base32
        assert!(base32_decode(&secret).is_some());
    }

    #[test]
    fn test_base32_roundtrip() {
        let data = b"Hello, World!";
        let encoded = base32_encode(data);
        let decoded = base32_decode(&encoded).unwrap();
        assert_eq!(&decoded[..data.len()], data);
    }

    #[test]
    fn test_totp_generation() {
        let secret = generate_secret();
        let code = generate_totp(&secret, None).unwrap();
        assert_eq!(code.len(), 6);
        assert!(code.chars().all(|c| c.is_ascii_digit()));
    }

    #[test]
    fn test_totp_verify_current() {
        let secret = generate_secret();
        let code = generate_totp(&secret, None).unwrap();
        assert!(verify_totp(&secret, &code).unwrap());
    }

    #[test]
    fn test_totp_verify_wrong_code() {
        let secret = generate_secret();
        assert!(!verify_totp(&secret, "000000").unwrap());
    }

    #[test]
    fn test_setup_mfa() {
        let setup = setup_mfa("testuser", "Rwanda FSFI", TEST_ENC_KEY).unwrap();
        assert!(!setup.secret.is_empty());
        assert!(!setup.encrypted_secret.is_empty());
        assert!(setup.otpauth_url.contains("otpauth://totp/"));
        assert_eq!(setup.backup_codes.len(), 10);
        assert_eq!(setup.backup_code_hashes.len(), 10);
        // Each backup code should be 8 chars
        for code in &setup.backup_codes {
            assert_eq!(code.len(), 8);
        }
    }

    #[test]
    fn test_encrypted_totp_verify() {
        let setup = setup_mfa("testuser", "Rwanda FSFI", TEST_ENC_KEY).unwrap();
        let code = generate_totp(&setup.secret, None).unwrap();
        assert!(verify_totp_encrypted(&setup.encrypted_secret, &code, TEST_ENC_KEY).unwrap());
    }

    #[test]
    fn test_backup_code_verification() {
        let codes = generate_backup_codes(10);
        let hashes: Vec<String> = codes.iter().map(|c| hash_backup_code(c)).collect();

        // Verify first code
        let idx = verify_backup_code(&codes[0], &hashes);
        assert_eq!(idx, Some(0));

        // Wrong code
        let idx = verify_backup_code("WRONGCDE", &hashes);
        assert_eq!(idx, None);
    }
}
