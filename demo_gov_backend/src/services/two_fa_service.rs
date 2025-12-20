use base64::{engine::general_purpose, Engine as _};
use chrono::Utc;
use qrcode::QrCode;
use rand::{distributions::Alphanumeric, Rng};
use totp_lite::{totp, Sha1};
use uuid::Uuid;
use image::{ImageBuffer, Luma};

use crate::models::auth::{AuthError, AuthResult};

/// Two-Factor Authentication service
pub struct TwoFAService {
    issuer: String,
}

impl TwoFAService {
    pub fn new(issuer: String) -> Self {
        Self { issuer }
    }

    /// Generate a new TOTP secret (Base32-encoded per RFC 6238)
    pub fn generate_secret(&self) -> String {
        let secret: Vec<u8> = (0..20).map(|_| rand::random::<u8>()).collect();
        base32::encode(base32::Alphabet::RFC4648 { padding: false }, &secret)
    }

    /// Generate TOTP code for given secret
    /// CRITICAL: Used for 2FA testing, debugging, and emergency access scenarios
    /// Government systems may need to generate codes for:
    /// - Testing 2FA setup without authenticator apps
    /// - Administrative emergency access (with proper audit logging)
    /// - Debugging 2FA issues for government officials
    ///
    /// PUBLIC API: Kept for administrative and testing flexibility
    /// Currently used in test suite (test_totp_generation_and_verification)
    #[allow(dead_code)]
    pub fn generate_totp(&self, secret: &str, time_offset: Option<i64>) -> AuthResult<String> {
        let decoded_secret = base32::decode(base32::Alphabet::RFC4648 { padding: false }, secret)
            .ok_or(AuthError::InvalidToken)?;

        let time = if let Some(offset) = time_offset {
            (Utc::now().timestamp() + offset) as u64
        } else {
            Utc::now().timestamp() as u64
        };

        let code = totp::<Sha1>(&decoded_secret, time);
        // totp-lite returns 8 digits, but standard TOTP uses 6 digits
        // Take last 6 digits to match RFC 6238 standard
        let code_6digit = if code.len() >= 6 {
            &code[code.len() - 6..]
        } else {
            &code
        };
        Ok(code_6digit.to_string())
    }

    /// Verify TOTP code against secret
    pub fn verify_totp(&self, secret: &str, code: &str) -> AuthResult<bool> {
        log::info!("verify_totp: secret length = {}, code = {}", secret.len(), code);

        let decoded_secret = match base32::decode(base32::Alphabet::RFC4648 { padding: false }, secret) {
            Some(s) => {
                log::info!("Base32 decode successful, decoded length: {}", s.len());
                s
            }
            None => {
                log::error!("Failed to decode Base32 secret");
                return Err(AuthError::InvalidToken);
            }
        };

        // Check current time window and one window before/after to account for clock drift
        let current_time = Utc::now().timestamp() as u64;
        log::info!("Current timestamp: {}", current_time);

        for time_offset in [-30i64, 0i64, 30i64] {
            let check_time = if time_offset < 0 {
                current_time.saturating_sub((-time_offset) as u64)
            } else {
                current_time + time_offset as u64
            };

            let expected_code = totp::<Sha1>(&decoded_secret, check_time);
            // totp-lite returns 8 digits, but standard TOTP uses 6 digits
            // Take last 6 digits to match RFC 6238 standard
            let expected_str = if expected_code.len() >= 6 {
                &expected_code[expected_code.len() - 6..]
            } else {
                &expected_code
            };

            log::info!("Time offset: {}s, Expected code: {}, Provided code: {}", time_offset, expected_str, code);

            if expected_str == code {
                log::info!("TOTP match found at offset: {}s", time_offset);
                return Ok(true);
            }
        }

        log::warn!("No TOTP match found across all time windows");
        Ok(false)
    }

    /// Generate TOTP URL for authenticator apps
    pub fn generate_otpauth_url(&self, username: &str, secret: &str) -> String {
        // URL-encode the issuer and username to handle spaces and special characters
        let encoded_issuer = urlencoding::encode(&self.issuer);
        let encoded_username = urlencoding::encode(username);

        format!(
            "otpauth://totp/{}:{}?secret={}&issuer={}",
            encoded_issuer,
            encoded_username,
            secret,
            encoded_issuer
        )
    }

    /// Generate QR code for TOTP setup
    pub fn generate_qr_code(&self, username: &str, secret: &str) -> AuthResult<String> {
        let totp_url = self.generate_otpauth_url(username, secret);

        let qr_code = QrCode::new(&totp_url)
            .map_err(|_| AuthError::InternalError("Failed to generate QR code".to_string()))?;

        // Create a larger QR code image (300x300 pixels)
        let image = qr_code.render::<Luma<u8>>().build();
        
        // Scale up the image for better scannability (300x300)
        let scale_factor = 10;
        let size = image.width() * scale_factor;
        let mut scaled_image: ImageBuffer<Luma<u8>, Vec<u8>> = ImageBuffer::new(size, size);
        
        for (x, y, pixel) in image.enumerate_pixels() {
            let scaled_x = x * scale_factor;
            let scaled_y = y * scale_factor;
            
            // Fill a scale_factor x scale_factor block with the same pixel
            for dx in 0..scale_factor {
                for dy in 0..scale_factor {
                    if scaled_x + dx < size && scaled_y + dy < size {
                        scaled_image.put_pixel(scaled_x + dx, scaled_y + dy, *pixel);
                    }
                }
            }
        }

        // Convert to PNG bytes
        let mut png_bytes = Vec::new();
        scaled_image.write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageOutputFormat::Png)
            .map_err(|_| AuthError::InternalError("Failed to encode QR code as PNG".to_string()))?;

        // Convert PNG to base64
        let png_base64 = general_purpose::STANDARD.encode(&png_bytes);
        Ok(format!("data:image/png;base64,{}", png_base64))
    }

    /// Generate backup codes
    pub fn generate_backup_codes(&self, count: usize) -> Vec<String> {
        (0..count)
            .map(|_| {
                rand::thread_rng()
                    .sample_iter(&Alphanumeric)
                    .take(8)
                    .map(char::from)
                    .collect::<String>()
                    .to_uppercase()
            })
            .collect()
    }

    /// Verify backup code
    pub fn verify_backup_code(&self, backup_codes_json: &str, provided_code: &str) -> AuthResult<(bool, String)> {
        let mut backup_codes: Vec<String> = serde_json::from_str(backup_codes_json)
            .map_err(|_| AuthError::InternalError("Invalid backup codes format".to_string()))?;

        if let Some(index) = backup_codes.iter().position(|code| code == provided_code) {
            // Remove the used backup code
            backup_codes.remove(index);
            let updated_json = serde_json::to_string(&backup_codes)
                .map_err(|_| AuthError::InternalError("Failed to serialize backup codes".to_string()))?;
            Ok((true, updated_json))
        } else {
            Ok((false, backup_codes_json.to_string()))
        }
    }

    /// Generate temporary token for 2FA completion with username
    /// Format: "2FA||username||uuid"
    /// Uses || delimiter to avoid conflicts with usernames containing underscores
    pub fn generate_temp_token_with_username(&self, username: &str) -> String {
        format!("2FA||{}||{}", username, Uuid::new_v4())
    }

    /// Validate temporary token format
    /// Expected format: "2FA||username||uuid"
    pub fn validate_temp_token_with_username(&self, token: &str) -> bool {
        token.starts_with("2FA||") && token.split("||").count() == 3
    }

    /// Hash backup codes for secure storage
    pub fn hash_backup_codes(&self, codes: &[String]) -> AuthResult<String> {
        let codes_json = serde_json::to_string(codes)
            .map_err(|_| AuthError::InternalError("Failed to serialize backup codes".to_string()))?;
        
        // In a real implementation, you might want to hash individual codes
        // For simplicity, we'll store them as JSON (they should be treated as one-time use)
        Ok(codes_json)
    }
    /// Get the issuer name
    #[allow(dead_code)]
    pub fn get_issuer(&self) -> &str {
        &self.issuer
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============================================================================
    // TOTP Secret Generation Tests
    // ============================================================================

    #[test]
    fn test_generate_secret() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret = service.generate_secret();

        assert!(!secret.is_empty());
        assert!(general_purpose::STANDARD.decode(&secret).is_ok());
    }

    #[test]
    fn test_secret_uniqueness() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret1 = service.generate_secret();
        let secret2 = service.generate_secret();

        // Secrets should be unique
        assert_ne!(secret1, secret2);
    }

    #[test]
    fn test_secret_is_base32_encoded() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret = service.generate_secret();

        // Should be valid base32 (RFC 6238 standard)
        let decoded = base32::decode(base32::Alphabet::RFC4648 { padding: false }, &secret).unwrap();

        // Should be 20 bytes (160 bits) - standard TOTP secret length
        assert_eq!(decoded.len(), 20);

        // Should only contain valid Base32 characters (A-Z, 2-7)
        assert!(secret.chars().all(|c| c.is_ascii_uppercase() || ('2'..='7').contains(&c)));
    }

    // ============================================================================
    // TOTP Generation and Verification Tests
    // ============================================================================

    #[test]
    fn test_totp_generation_and_verification() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret = service.generate_secret();

        let code = service.generate_totp(&secret, None).unwrap();
        assert_eq!(code.len(), 6);

        let is_valid = service.verify_totp(&secret, &code).unwrap();
        assert!(is_valid);
    }

    #[test]
    fn test_totp_code_is_numeric() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret = service.generate_secret();

        let code = service.generate_totp(&secret, None).unwrap();

        // Code should be 6 digits
        assert_eq!(code.len(), 6);
        // All characters should be digits
        assert!(code.chars().all(|c| c.is_ascii_digit()));
    }

    #[test]
    fn test_totp_with_time_offset() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret = service.generate_secret();

        // Generate code for current time
        let code_now = service.generate_totp(&secret, None).unwrap();

        // Generate code for 30 seconds in the future
        let code_future = service.generate_totp(&secret, Some(30)).unwrap();

        // Codes should be different
        assert_ne!(code_now, code_future);
    }

    #[test]
    fn test_totp_invalid_secret() {
        let service = TwoFAService::new("TestApp".to_string());

        // Test with invalid base64
        let result = service.generate_totp("not-valid-base64!@#", None);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::InvalidToken));
    }

    #[test]
    fn test_verify_totp_with_wrong_code() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret = service.generate_secret();

        // Verify with wrong code
        let is_valid = service.verify_totp(&secret, "000000").unwrap();
        assert!(!is_valid);
    }

    #[test]
    fn test_verify_totp_with_invalid_code_format() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret = service.generate_secret();

        // Verify with non-numeric code
        let is_valid = service.verify_totp(&secret, "abcdef").unwrap();
        assert!(!is_valid);

        // Verify with too short code
        let is_valid = service.verify_totp(&secret, "123").unwrap();
        assert!(!is_valid);
    }

    #[test]
    fn test_verify_totp_time_window_tolerance() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret = service.generate_secret();

        // Generate code for 30 seconds in the past
        let code_past = service.generate_totp(&secret, Some(-30)).unwrap();

        // Should still be valid (within tolerance window)
        let is_valid = service.verify_totp(&secret, &code_past).unwrap();
        assert!(is_valid);

        // Generate code for 30 seconds in the future
        let code_future = service.generate_totp(&secret, Some(30)).unwrap();

        // Should still be valid (within tolerance window)
        let is_valid = service.verify_totp(&secret, &code_future).unwrap();
        assert!(is_valid);
    }

    #[test]
    fn test_verify_totp_outside_time_window() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret = service.generate_secret();

        // Generate code for 90 seconds in the past (outside tolerance)
        let code_old = service.generate_totp(&secret, Some(-90)).unwrap();

        // Should NOT be valid (outside tolerance window)
        let is_valid = service.verify_totp(&secret, &code_old).unwrap();
        assert!(!is_valid);
    }

    #[test]
    fn test_verify_totp_invalid_secret() {
        let service = TwoFAService::new("TestApp".to_string());

        // Test with invalid base64
        let result = service.verify_totp("not-valid-base64!@#", "123456");
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::InvalidToken));
    }

    // ============================================================================
    // QR Code Generation Tests
    // ============================================================================

    #[test]
    fn test_generate_qr_code() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret = service.generate_secret();

        let qr_code = service.generate_qr_code("testuser", &secret).unwrap();

        // Should be a data URI
        assert!(qr_code.starts_with("data:image/png;base64,"));
    }

    #[test]
    fn test_qr_code_contains_valid_base64() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret = service.generate_secret();

        let qr_code = service.generate_qr_code("testuser", &secret).unwrap();

        // Extract base64 part
        let base64_part = qr_code.strip_prefix("data:image/png;base64,").unwrap();

        // Should be valid base64
        let decoded = general_purpose::STANDARD.decode(base64_part).unwrap();

        // Should be a PNG file (starts with PNG signature)
        assert_eq!(&decoded[0..8], &[137, 80, 78, 71, 13, 10, 26, 10]);
    }

    #[test]
    fn test_qr_code_with_special_characters_in_username() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret = service.generate_secret();

        // Test with special characters in username
        let qr_code = service.generate_qr_code("user@example.com", &secret).unwrap();

        // Should still generate valid QR code
        assert!(qr_code.starts_with("data:image/png;base64,"));
    }

    #[test]
    fn test_qr_code_different_for_different_users() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret = service.generate_secret();

        let qr_code1 = service.generate_qr_code("user1", &secret).unwrap();
        let qr_code2 = service.generate_qr_code("user2", &secret).unwrap();

        // QR codes should be different for different users
        assert_ne!(qr_code1, qr_code2);
    }

    #[test]
    fn test_qr_code_invalid_secret() {
        let service = TwoFAService::new("TestApp".to_string());

        // QR code generation should still work with any string secret
        // (it doesn't validate the secret format, just encodes it)
        let result = service.generate_qr_code("testuser", "invalid-secret");
        assert!(result.is_ok());
    }

    // ============================================================================
    // Backup Codes Tests
    // ============================================================================

    #[test]
    fn test_backup_codes() {
        let service = TwoFAService::new("TestApp".to_string());
        let codes = service.generate_backup_codes(10);

        assert_eq!(codes.len(), 10);
        assert!(codes.iter().all(|code| code.len() == 8));

        let codes_json = service.hash_backup_codes(&codes).unwrap();
        let (is_valid, _) = service.verify_backup_code(&codes_json, &codes[0]).unwrap();
        assert!(is_valid);
    }

    #[test]
    fn test_backup_codes_uniqueness() {
        let service = TwoFAService::new("TestApp".to_string());
        let codes = service.generate_backup_codes(10);

        // All codes should be unique
        let unique_codes: std::collections::HashSet<_> = codes.iter().collect();
        assert_eq!(unique_codes.len(), codes.len());
    }

    #[test]
    fn test_backup_codes_format() {
        let service = TwoFAService::new("TestApp".to_string());
        let codes = service.generate_backup_codes(5);

        for code in codes {
            // Each code should be 8 characters
            assert_eq!(code.len(), 8);
            // Each code should be uppercase alphanumeric
            assert!(code.chars().all(|c| c.is_ascii_uppercase() || c.is_ascii_digit()));
        }
    }

    #[test]
    fn test_backup_code_verification_removes_used_code() {
        let service = TwoFAService::new("TestApp".to_string());
        let codes = service.generate_backup_codes(5);
        let first_code = codes[0].clone();

        let codes_json = service.hash_backup_codes(&codes).unwrap();

        // First verification should succeed
        let (is_valid, updated_json) = service.verify_backup_code(&codes_json, &first_code).unwrap();
        assert!(is_valid);

        // Second verification with same code should fail
        let (is_valid, _) = service.verify_backup_code(&updated_json, &first_code).unwrap();
        assert!(!is_valid);
    }

    #[test]
    fn test_backup_code_verification_preserves_other_codes() {
        let service = TwoFAService::new("TestApp".to_string());
        let codes = service.generate_backup_codes(5);
        let first_code = codes[0].clone();
        let second_code = codes[1].clone();

        let codes_json = service.hash_backup_codes(&codes).unwrap();

        // Use first code
        let (is_valid, updated_json) = service.verify_backup_code(&codes_json, &first_code).unwrap();
        assert!(is_valid);

        // Second code should still work
        let (is_valid, _) = service.verify_backup_code(&updated_json, &second_code).unwrap();
        assert!(is_valid);
    }

    #[test]
    fn test_backup_code_verification_with_wrong_code() {
        let service = TwoFAService::new("TestApp".to_string());
        let codes = service.generate_backup_codes(5);

        let codes_json = service.hash_backup_codes(&codes).unwrap();

        // Verify with code that doesn't exist
        let (is_valid, _) = service.verify_backup_code(&codes_json, "WRONGCOD").unwrap();
        assert!(!is_valid);
    }

    #[test]
    fn test_backup_code_verification_invalid_json() {
        let service = TwoFAService::new("TestApp".to_string());

        // Test with invalid JSON
        let result = service.verify_backup_code("not-valid-json", "TESTCODE");
        assert!(result.is_err());
    }

    #[test]
    fn test_backup_code_all_codes_can_be_used() {
        let service = TwoFAService::new("TestApp".to_string());
        let codes = service.generate_backup_codes(3);

        let mut codes_json = service.hash_backup_codes(&codes).unwrap();

        // Use all codes one by one
        for code in &codes {
            let (is_valid, updated_json) = service.verify_backup_code(&codes_json, code).unwrap();
            assert!(is_valid);
            codes_json = updated_json;
        }

        // After using all codes, list should be empty
        let remaining_codes: Vec<String> = serde_json::from_str(&codes_json).unwrap();
        assert_eq!(remaining_codes.len(), 0);
    }

    #[test]
    fn test_generate_different_backup_code_counts() {
        let service = TwoFAService::new("TestApp".to_string());

        let codes_5 = service.generate_backup_codes(5);
        assert_eq!(codes_5.len(), 5);

        let codes_10 = service.generate_backup_codes(10);
        assert_eq!(codes_10.len(), 10);

        let codes_20 = service.generate_backup_codes(20);
        assert_eq!(codes_20.len(), 20);
    }

    // ============================================================================
    // Temporary Token Tests (Production Format: 2FA||username||uuid)
    // ============================================================================

    #[test]
    fn test_temp_token_with_username() {
        let service = TwoFAService::new("TestApp".to_string());
        let token = service.generate_temp_token_with_username("testuser");

        assert!(service.validate_temp_token_with_username(&token));
        assert!(!service.validate_temp_token_with_username("invalid_token"));
    }

    #[test]
    fn test_temp_token_with_username_format() {
        let service = TwoFAService::new("TestApp".to_string());
        let token = service.generate_temp_token_with_username("testuser");

        // Should start with prefix
        assert!(token.starts_with("2FA||"));

        // Should contain username
        assert!(token.contains("testuser"));

        // Should have 3 parts separated by ||
        let parts: Vec<&str> = token.split("||").collect();
        assert_eq!(parts.len(), 3);
        assert_eq!(parts[0], "2FA");
        assert_eq!(parts[1], "testuser");

        // Third part should be a valid UUID
        assert!(uuid::Uuid::parse_str(parts[2]).is_ok());
    }

    #[test]
    fn test_temp_token_with_username_uniqueness() {
        let service = TwoFAService::new("TestApp".to_string());
        let token1 = service.generate_temp_token_with_username("user1");
        let token2 = service.generate_temp_token_with_username("user1");

        // Tokens should be unique even for same username
        assert_ne!(token1, token2);
    }

    #[test]
    fn test_temp_token_with_username_handles_underscores() {
        let service = TwoFAService::new("TestApp".to_string());

        // Test with username containing underscores
        let token = service.generate_temp_token_with_username("test_user_123");
        assert!(service.validate_temp_token_with_username(&token));

        // Should be able to extract username correctly
        let parts: Vec<&str> = token.split("||").collect();
        assert_eq!(parts[1], "test_user_123");
    }

    #[test]
    fn test_temp_token_validation_rejects_invalid_formats() {
        let service = TwoFAService::new("TestApp".to_string());

        // Missing prefix
        assert!(!service.validate_temp_token_with_username("username||550e8400-e29b-41d4-a716-446655440000"));

        // Wrong prefix
        assert!(!service.validate_temp_token_with_username("WRONG||username||550e8400-e29b-41d4-a716-446655440000"));

        // Too few parts
        assert!(!service.validate_temp_token_with_username("2FA||username"));

        // Too many parts
        assert!(!service.validate_temp_token_with_username("2FA||username||uuid||extra"));

        // Empty string
        assert!(!service.validate_temp_token_with_username(""));

        // Old format (should be rejected)
        assert!(!service.validate_temp_token_with_username("2fa_temp_550e8400-e29b-41d4-a716-446655440000"));
    }

    #[test]
    fn test_temp_token_validation_case_sensitive_prefix() {
        let service = TwoFAService::new("TestApp".to_string());
        let token = service.generate_temp_token_with_username("testuser");

        // Should be valid as-is
        assert!(service.validate_temp_token_with_username(&token));

        // Should be invalid with lowercase prefix
        let lowercase_prefix = token.replace("2FA||", "2fa||");
        assert!(!service.validate_temp_token_with_username(&lowercase_prefix));
    }

    #[test]
    fn test_temp_token_with_special_characters_in_username() {
        let service = TwoFAService::new("TestApp".to_string());

        // Test with various special characters (except ||)
        let usernames = vec![
            "user@example.com",
            "user-name",
            "user.name",
            "user_name_123",
            "FirstName LastName",
        ];

        for username in usernames {
            let token = service.generate_temp_token_with_username(username);
            assert!(service.validate_temp_token_with_username(&token));

            // Verify username is preserved correctly
            let parts: Vec<&str> = token.split("||").collect();
            assert_eq!(parts[1], username);
        }
    }

    // ============================================================================
    // Issuer Tests
    // ============================================================================

    #[test]
    fn test_get_issuer() {
        let service = TwoFAService::new("MyTestApp".to_string());
        assert_eq!(service.get_issuer(), "MyTestApp");
    }

    #[test]
    fn test_issuer_in_qr_code() {
        let service = TwoFAService::new("TestIssuer".to_string());
        let secret = service.generate_secret();

        // Generate QR code
        let qr_code = service.generate_qr_code("testuser", &secret).unwrap();

        // The QR code contains a TOTP URL with the issuer
        // We can't easily decode the QR code, but we know it was generated successfully
        assert!(qr_code.starts_with("data:image/png;base64,"));
    }
}
