/// Multi-Factor Authentication Service
/// Production implementation using TOTP (Time-based One-Time Password)
///
/// Security features:
/// - MFA secrets encrypted at rest using EncryptionService
/// - 6-digit TOTP codes with 30-second window
/// - Backup codes (one-time use, hashed like passwords)
/// - QR code generation for easy authenticator app setup

use rand::Rng;
use sha2::{Digest, Sha256};
use totp_lite::{totp_custom, Sha1};

use crate::config::AppConfig;
use crate::services::encryption::{EncryptionService, EncryptionError};

pub struct MfaService;

#[derive(Debug)]
pub enum MfaError {
    EncryptionError(EncryptionError),
    SecretGenerationFailed,
}

impl std::fmt::Display for MfaError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::EncryptionError(e) => write!(f, "Encryption error: {}", e),
            Self::SecretGenerationFailed => write!(f, "Failed to generate MFA secret"),
        }
    }
}

impl std::error::Error for MfaError {}

impl From<EncryptionError> for MfaError {
    fn from(e: EncryptionError) -> Self {
        Self::EncryptionError(e)
    }
}

/// MFA setup response containing secret and QR code
#[derive(Debug, Clone, serde::Serialize)]
pub struct MfaSetup {
    /// Base32-encoded secret (for manual entry in authenticator apps)
    pub secret: String,
    /// OTPAuth URL for QR code generation
    pub otpauth_url: String,
    /// Backup recovery codes (10 codes, 8 characters each)
    pub backup_codes: Vec<String>,
}

impl MfaService {
    /// Generate a new MFA secret and encrypt it for storage
    ///
    /// Returns encrypted secret that should be stored in the database
    pub fn generate_secret(config: &AppConfig) -> Result<String, MfaError> {
        // Generate 20 random bytes (160 bits) for TOTP secret
        let secret_bytes: Vec<u8> = (0..20)
            .map(|_| rand::thread_rng().gen::<u8>())
            .collect();

        // Encode as base32 (standard for TOTP)
        let secret = Self::base32_encode(&secret_bytes);

        // Encrypt the secret before storage
        let encrypted = EncryptionService::encrypt(&secret, config)?;

        Ok(encrypted)
    }

    /// Setup MFA for a user
    ///
    /// Returns MFA configuration including QR code URL and backup codes
    pub fn setup_mfa(
        email: &str,
        issuer: &str,
        config: &AppConfig,
    ) -> Result<(String, MfaSetup, Vec<String>), MfaError> {
        // Generate secret
        let encrypted_secret = Self::generate_secret(config)?;

        // Decrypt to get plain secret for QR code generation
        let secret = EncryptionService::decrypt(&encrypted_secret, config)?;

        // Generate OTPAuth URL for QR code
        let otpauth_url = format!(
            "otpauth://totp/{}:{}?secret={}&issuer={}&algorithm=SHA1&digits=6&period=30",
            urlencoding::encode(issuer),
            urlencoding::encode(email),
            secret,
            urlencoding::encode(issuer)
        );

        // Generate backup codes
        let backup_codes = Self::generate_backup_codes(10);
        let backup_code_hashes: Vec<String> = backup_codes
            .iter()
            .map(|code| Self::hash_backup_code(code))
            .collect();

        let setup = MfaSetup {
            secret: secret.clone(),
            otpauth_url,
            backup_codes: backup_codes.clone(),
        };

        Ok((encrypted_secret, setup, backup_code_hashes))
    }

    /// Verify a TOTP code against an encrypted secret
    ///
    /// Checks current time window ±1 period (90 seconds total) to account for clock drift
    pub fn verify_totp(
        encrypted_secret: &str,
        code: &str,
        config: &AppConfig,
    ) -> Result<bool, MfaError> {
        // Decrypt the secret
        let secret = EncryptionService::decrypt(encrypted_secret, config)?;

        // Decode base32 secret
        let secret_bytes = Self::base32_decode(&secret)
            .ok_or(MfaError::SecretGenerationFailed)?;

        // Get current Unix timestamp
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Verify code with ±1 time step tolerance (90 seconds total window)
        for time_offset in [-1, 0, 1] {
            let step_timestamp = (timestamp as i64 + (time_offset * 30)) as u64;
            let expected_code = totp_custom::<Sha1>(30, 6, &secret_bytes, step_timestamp);

            if code == expected_code {
                return Ok(true);
            }
        }

        Ok(false)
    }

    /// Verify a backup code
    pub fn verify_backup_code(code: &str, hash: &str) -> bool {
        Self::hash_backup_code(code) == hash
    }

    /// Generate backup recovery codes
    fn generate_backup_codes(count: usize) -> Vec<String> {
        (0..count)
            .map(|_| {
                // Generate 8-character alphanumeric codes (without ambiguous characters)
                const CHARSET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                let mut rng = rand::thread_rng();
                (0..8)
                    .map(|_| {
                        let idx = rng.gen_range(0..CHARSET.len());
                        CHARSET[idx] as char
                    })
                    .collect()
            })
            .collect()
    }

    /// Hash a backup code for secure storage
    fn hash_backup_code(code: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(code.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Encode bytes to base32 (RFC 4648)
    fn base32_encode(input: &[u8]) -> String {
        const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let mut result = String::new();
        let mut bits = 0u32;
        let mut bit_count = 0;

        for &byte in input {
            bits = (bits << 8) | byte as u32;
            bit_count += 8;

            while bit_count >= 5 {
                bit_count -= 5;
                let index = ((bits >> bit_count) & 0x1F) as usize;
                result.push(ALPHABET[index] as char);
            }
        }

        if bit_count > 0 {
            let index = ((bits << (5 - bit_count)) & 0x1F) as usize;
            result.push(ALPHABET[index] as char);
        }

        result
    }

    /// Decode base32 string to bytes
    fn base32_decode(input: &str) -> Option<Vec<u8>> {
        let input = input.to_uppercase();
        let mut result = Vec::new();
        let mut bits = 0u32;
        let mut bit_count = 0;

        for c in input.chars() {
            let value = match c {
                'A'..='Z' => c as u32 - 'A' as u32,
                '2'..='7' => c as u32 - '2' as u32 + 26,
                _ => return None,
            };

            bits = (bits << 5) | value;
            bit_count += 5;

            if bit_count >= 8 {
                bit_count -= 8;
                result.push((bits >> bit_count) as u8);
                bits &= (1 << bit_count) - 1;
            }
        }

        Some(result)
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
    fn test_base32_encode_decode() {
        let input = b"Hello World";
        let encoded = MfaService::base32_encode(input);
        let decoded = MfaService::base32_decode(&encoded).unwrap();
        assert_eq!(input.to_vec(), decoded);
    }

    #[test]
    fn test_backup_code_generation() {
        let codes = MfaService::generate_backup_codes(10);
        assert_eq!(codes.len(), 10);

        for code in &codes {
            assert_eq!(code.len(), 8);
            // Verify no ambiguous characters (0, O, I, 1)
            assert!(!code.contains('0'));
            assert!(!code.contains('O'));
            assert!(!code.contains('I'));
            assert!(!code.contains('1'));
        }

        // Verify codes are unique
        let unique_codes: std::collections::HashSet<_> = codes.iter().collect();
        assert_eq!(unique_codes.len(), 10);
    }

    #[test]
    fn test_backup_code_verification() {
        let code = "ABCD1234";
        let hash = MfaService::hash_backup_code(code);

        assert!(MfaService::verify_backup_code(code, &hash));
        assert!(!MfaService::verify_backup_code("WRONG123", &hash));
    }

    #[test]
    fn test_secret_generation() {
        let config = test_config();
        let secret1 = MfaService::generate_secret(&config).unwrap();
        let secret2 = MfaService::generate_secret(&config).unwrap();

        // Secrets should be different
        assert_ne!(secret1, secret2);

        // Should be able to decrypt
        assert!(EncryptionService::decrypt(&secret1, &config).is_ok());
    }

    #[test]
    fn test_mfa_setup() {
        let config = test_config();
        let (encrypted_secret, setup, backup_hashes) =
            MfaService::setup_mfa("user@example.com", "FSFI System", &config).unwrap();

        // Verify encrypted secret can be decrypted
        assert!(EncryptionService::decrypt(&encrypted_secret, &config).is_ok());

        // Verify OTPAuth URL format
        assert!(setup.otpauth_url.starts_with("otpauth://totp/"));
        assert!(setup.otpauth_url.contains("user@example.com"));
        assert!(setup.otpauth_url.contains("FSFI%20System"));

        // Verify backup codes
        assert_eq!(setup.backup_codes.len(), 10);
        assert_eq!(backup_hashes.len(), 10);
    }

    #[test]
    fn test_totp_verification() {
        let config = test_config();

        // Use a known secret for deterministic testing
        let known_secret = "JBSWY3DPEHPK3PXP"; // Base32 encoded "Hello!"
        let encrypted_secret = EncryptionService::encrypt(known_secret, &config).unwrap();

        // Generate TOTP code for current time
        let secret_bytes = MfaService::base32_decode(known_secret).unwrap();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let valid_code = totp_custom::<Sha1>(30, 6, &secret_bytes, timestamp);

        // Verification should succeed
        assert!(MfaService::verify_totp(&encrypted_secret, &valid_code, &config).unwrap());

        // Wrong code should fail
        assert!(!MfaService::verify_totp(&encrypted_secret, "000000", &config).unwrap());
    }
}
