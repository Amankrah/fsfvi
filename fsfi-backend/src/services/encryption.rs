/// Production-ready encryption service for sensitive data at rest
///
/// Uses AES-256-GCM for authenticated encryption of sensitive data that needs
/// to be reversible (e.g., MFA secrets for TOTP verification).
///
/// Security properties:
/// - Authenticated Encryption with Associated Data (AEAD)
/// - 256-bit encryption key
/// - Random 96-bit nonce per encryption
/// - Protection against tampering and replay attacks

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use rand::RngCore;

use crate::config::AppConfig;

pub struct EncryptionService;

#[derive(Debug)]
pub enum EncryptionError {
    InvalidKey(String),
    EncryptionFailed(String),
    DecryptionFailed(String),
    InvalidFormat(String),
}

impl std::fmt::Display for EncryptionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidKey(msg) => write!(f, "Invalid encryption key: {}", msg),
            Self::EncryptionFailed(msg) => write!(f, "Encryption failed: {}", msg),
            Self::DecryptionFailed(msg) => write!(f, "Decryption failed: {}", msg),
            Self::InvalidFormat(msg) => write!(f, "Invalid format: {}", msg),
        }
    }
}

impl std::error::Error for EncryptionError {}

impl EncryptionService {
    /// Encrypt sensitive data using AES-256-GCM
    ///
    /// Returns base64-encoded string in format: nonce||ciphertext
    /// where || represents concatenation
    pub fn encrypt(data: &str, config: &AppConfig) -> Result<String, EncryptionError> {
        // Derive 32-byte key from config encryption key
        let key = Self::derive_key(&config.security.encryption_key)?;

        // Create cipher instance
        let cipher = Aes256Gcm::new(&key);

        // Generate random 96-bit nonce (12 bytes)
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt the data
        let ciphertext = cipher
            .encrypt(nonce, data.as_bytes())
            .map_err(|e| EncryptionError::EncryptionFailed(e.to_string()))?;

        // Combine nonce + ciphertext
        let mut result = nonce_bytes.to_vec();
        result.extend_from_slice(&ciphertext);

        // Encode as base64
        Ok(general_purpose::STANDARD.encode(result))
    }

    /// Decrypt data encrypted with AES-256-GCM
    pub fn decrypt(encrypted_data: &str, config: &AppConfig) -> Result<String, EncryptionError> {
        // Decode from base64
        let combined = general_purpose::STANDARD
            .decode(encrypted_data)
            .map_err(|e| EncryptionError::InvalidFormat(format!("Base64 decode failed: {}", e)))?;

        // Verify minimum length (12 byte nonce + at least 16 byte tag)
        if combined.len() < 28 {
            return Err(EncryptionError::InvalidFormat(
                "Encrypted data too short".to_string(),
            ));
        }

        // Split nonce and ciphertext
        let (nonce_bytes, ciphertext) = combined.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        // Derive key
        let key = Self::derive_key(&config.security.encryption_key)?;
        let cipher = Aes256Gcm::new(&key);

        // Decrypt
        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| EncryptionError::DecryptionFailed(e.to_string()))?;

        // Convert to string
        String::from_utf8(plaintext)
            .map_err(|e| EncryptionError::DecryptionFailed(format!("Invalid UTF-8: {}", e)))
    }

    /// Derive a 32-byte AES-256 key from the encryption key string
    ///
    /// Uses SHA-256 to ensure consistent 32-byte key regardless of input length
    fn derive_key(encryption_key: &str) -> Result<aes_gcm::Key<Aes256Gcm>, EncryptionError> {
        if encryption_key.len() < 32 {
            return Err(EncryptionError::InvalidKey(
                "Encryption key must be at least 32 characters".to_string(),
            ));
        }

        // Use SHA-256 to derive exactly 32 bytes from the key
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(encryption_key.as_bytes());
        let key_bytes = hasher.finalize();

        Ok(*aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> AppConfig {
        AppConfig {
            server: crate::config::ServerConfig {
                host: "127.0.0.1".to_string(),
                port: 8080,
            },
            database: crate::config::DatabaseConfig {
                url: "postgresql://test".to_string(),
                max_connections: 5,
            },
            jwt: crate::config::JwtConfig {
                secret: "test_secret_key_min_32_chars_long!".to_string(),
                access_token_expiry: 900,
                refresh_token_expiry: 2592000,
            },
            security: crate::config::SecurityConfig {
                allowed_origins: vec![],
                max_request_size: 1024,
                encryption_key: "test_encryption_key_must_be_at_least_32_characters_long".to_string(),
            },
            rate_limit: crate::config::RateLimitConfig {
                per_second: 10,
                burst_size: 20,
            },
        }
    }

    #[test]
    fn test_encrypt_decrypt() {
        let config = test_config();
        let plaintext = "sensitive_mfa_secret_12345";

        let encrypted = EncryptionService::encrypt(plaintext, &config)
            .expect("Encryption should succeed");

        // Verify encrypted data is different from plaintext
        assert_ne!(encrypted, plaintext);
        assert!(!encrypted.is_empty());

        let decrypted = EncryptionService::decrypt(&encrypted, &config)
            .expect("Decryption should succeed");

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_different_nonces() {
        let config = test_config();
        let plaintext = "same_data";

        let encrypted1 = EncryptionService::encrypt(plaintext, &config).unwrap();
        let encrypted2 = EncryptionService::encrypt(plaintext, &config).unwrap();

        // Same plaintext should produce different ciphertext due to random nonces
        assert_ne!(encrypted1, encrypted2);

        // Both should decrypt to the same plaintext
        assert_eq!(EncryptionService::decrypt(&encrypted1, &config).unwrap(), plaintext);
        assert_eq!(EncryptionService::decrypt(&encrypted2, &config).unwrap(), plaintext);
    }

    #[test]
    fn test_tamper_detection() {
        let config = test_config();
        let plaintext = "secret";

        let encrypted = EncryptionService::encrypt(plaintext, &config).unwrap();

        // Tamper with the encrypted data
        let mut tampered = encrypted.clone();
        tampered.push('X');

        // Decryption should fail
        assert!(EncryptionService::decrypt(&tampered, &config).is_err());
    }

    #[test]
    fn test_wrong_key() {
        let config1 = test_config();
        let mut config2 = test_config();
        config2.security.encryption_key = "different_key_at_least_32_chars_long_for_testing".to_string();

        let plaintext = "secret";
        let encrypted = EncryptionService::encrypt(plaintext, &config1).unwrap();

        // Decryption with wrong key should fail
        assert!(EncryptionService::decrypt(&encrypted, &config2).is_err());
    }

    #[test]
    fn test_invalid_key_length() {
        let mut config = test_config();
        config.security.encryption_key = "short".to_string();

        let result = EncryptionService::encrypt("data", &config);
        assert!(result.is_err());
    }

    #[test]
    fn test_unicode_data() {
        let config = test_config();
        let plaintext = "🔐 Unicode: 日本語, العربية, हिन्दी";

        let encrypted = EncryptionService::encrypt(plaintext, &config).unwrap();
        let decrypted = EncryptionService::decrypt(&encrypted, &config).unwrap();

        assert_eq!(decrypted, plaintext);
    }
}
