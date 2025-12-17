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

    /// Generate a new TOTP secret
    pub fn generate_secret(&self) -> String {
        let secret: Vec<u8> = (0..20).map(|_| rand::random::<u8>()).collect();
        general_purpose::STANDARD.encode(&secret)
    }

    /// Generate TOTP code for given secret
    pub fn generate_totp(&self, secret: &str, time_offset: Option<i64>) -> AuthResult<String> {
        let decoded_secret = general_purpose::STANDARD
            .decode(secret)
            .map_err(|_| AuthError::InvalidToken)?;

        let time = if let Some(offset) = time_offset {
            (Utc::now().timestamp() + offset) as u64
        } else {
            Utc::now().timestamp() as u64
        };

        let code = totp::<Sha1>(&decoded_secret, time);
        Ok(format!("{:06}", code))
    }

    /// Verify TOTP code against secret
    pub fn verify_totp(&self, secret: &str, code: &str) -> AuthResult<bool> {
        let decoded_secret = general_purpose::STANDARD
            .decode(secret)
            .map_err(|_| AuthError::InvalidToken)?;

        // Check current time window and one window before/after to account for clock drift
        let current_time = Utc::now().timestamp() as u64;
        
        for time_offset in [-30i64, 0i64, 30i64] {
            let check_time = if time_offset < 0 {
                current_time.saturating_sub((-time_offset) as u64)
            } else {
                current_time + time_offset as u64
            };

            let expected_code = totp::<Sha1>(&decoded_secret, check_time);
            let expected_str = format!("{:06}", expected_code);

            if expected_str == code {
                return Ok(true);
            }
        }

        Ok(false)
    }

    /// Generate QR code for TOTP setup
    pub fn generate_qr_code(&self, username: &str, secret: &str) -> AuthResult<String> {
        let totp_url = format!(
            "otpauth://totp/{}:{}?secret={}&issuer={}",
            self.issuer,
            username,
            secret,
            self.issuer
        );

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

    /// Generate temporary token for 2FA completion
    pub fn generate_temp_token(&self) -> String {
        format!("2fa_temp_{}", Uuid::new_v4())
    }

    /// Validate temporary token format
    pub fn validate_temp_token(&self, token: &str) -> bool {
        token.starts_with("2fa_temp_") && token.len() == 45 // "2fa_temp_" + 36 chars UUID
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

    #[test]
    fn test_generate_secret() {
        let service = TwoFAService::new("TestApp".to_string());
        let secret = service.generate_secret();
        
        assert!(!secret.is_empty());
        assert!(general_purpose::STANDARD.decode(&secret).is_ok());
    }

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
    fn test_temp_token() {
        let service = TwoFAService::new("TestApp".to_string());
        let token = service.generate_temp_token();
        
        assert!(service.validate_temp_token(&token));
        assert!(!service.validate_temp_token("invalid_token"));
    }
}
