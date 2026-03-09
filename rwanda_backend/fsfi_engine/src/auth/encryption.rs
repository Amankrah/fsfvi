//! Encryption Service
//!
//! AES-256-GCM authenticated encryption for sensitive data
//! (MFA secrets, API keys, etc.)

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use pyo3::prelude::*;
use rand::RngCore;
use sha2::{Digest, Sha256};

/// Derive a 32-byte key from a passphrase using SHA-256
fn derive_key(encryption_key: &str) -> Result<[u8; 32], String> {
    if encryption_key.len() < 32 {
        return Err("Encryption key must be at least 32 characters".to_string());
    }

    let mut hasher = Sha256::new();
    hasher.update(encryption_key.as_bytes());
    let result = hasher.finalize();

    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    Ok(key)
}

/// Encrypt data using AES-256-GCM
///
/// Returns base64(nonce || ciphertext) for storage.
/// Each encryption uses a random 96-bit nonce.
pub fn encrypt(data: &str, encryption_key: &str) -> Result<String, String> {
    let key_bytes = derive_key(encryption_key)?;
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| format!("Cipher initialization failed: {}", e))?;

    // Generate random 96-bit (12 byte) nonce
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, data.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Combine nonce + ciphertext and base64 encode
    let mut combined = Vec::with_capacity(12 + ciphertext.len());
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);

    use base64::Engine;
    Ok(base64::engine::general_purpose::STANDARD.encode(&combined))
}

/// Decrypt data encrypted with AES-256-GCM
///
/// Expects base64(nonce || ciphertext) format.
pub fn decrypt(encrypted_data: &str, encryption_key: &str) -> Result<String, String> {
    let key_bytes = derive_key(encryption_key)?;
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| format!("Cipher initialization failed: {}", e))?;

    use base64::Engine;
    let combined = base64::engine::general_purpose::STANDARD
        .decode(encrypted_data)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;

    if combined.len() < 12 {
        return Err("Encrypted data too short".to_string());
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Decryption failed: invalid key or tampered data".to_string())?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8 conversion failed: {}", e))
}

// ---------------------------------------------------------------------------
// PyO3 Functions
// ---------------------------------------------------------------------------

#[pyfunction]
fn py_encrypt(data: &str, encryption_key: &str) -> PyResult<String> {
    encrypt(data, encryption_key).map_err(|e| pyo3::exceptions::PyValueError::new_err(e))
}

#[pyfunction]
fn py_decrypt(encrypted_data: &str, encryption_key: &str) -> PyResult<String> {
    decrypt(encrypted_data, encryption_key).map_err(|e| pyo3::exceptions::PyValueError::new_err(e))
}

pub fn register_functions(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(py_encrypt, m)?)?;
    m.add_function(wrap_pyfunction!(py_decrypt, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_KEY: &str = "this-is-a-test-encryption-key-32-chars-minimum!!";

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let plaintext = "secret-totp-key-ABCDEF123456";
        let encrypted = encrypt(plaintext, TEST_KEY).unwrap();

        assert_ne!(encrypted, plaintext);
        assert!(!encrypted.is_empty());

        let decrypted = decrypt(&encrypted, TEST_KEY).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_different_nonces_per_encryption() {
        let plaintext = "same-data";
        let enc1 = encrypt(plaintext, TEST_KEY).unwrap();
        let enc2 = encrypt(plaintext, TEST_KEY).unwrap();
        // Same plaintext should produce different ciphertext (random nonce)
        assert_ne!(enc1, enc2);
    }

    #[test]
    fn test_decrypt_with_wrong_key() {
        let encrypted = encrypt("secret", TEST_KEY).unwrap();
        let result = decrypt(&encrypted, "wrong-key-that-is-also-32-chars-minimum!!");
        assert!(result.is_err());
    }

    #[test]
    fn test_key_too_short() {
        let result = encrypt("data", "short");
        assert!(result.is_err());
    }

    #[test]
    fn test_tampered_data_fails() {
        let encrypted = encrypt("secret", TEST_KEY).unwrap();
        // Tamper with the encrypted data
        let mut tampered = encrypted.clone();
        tampered.push('X');
        // This should fail authentication
        let result = decrypt(&tampered, TEST_KEY);
        assert!(result.is_err());
    }
}
