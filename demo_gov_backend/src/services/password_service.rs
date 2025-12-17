use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use bcrypt;
use rand::Rng;

use crate::models::auth::{AuthError, AuthResult, PasswordPolicy};

/// Password service for secure password hashing and validation
pub struct PasswordService {
    policy: PasswordPolicy,
    argon2: Argon2<'static>,
}

impl PasswordService {
    pub fn new() -> Self {
        Self {
            policy: PasswordPolicy::default(),
            argon2: Argon2::default(),
        }
    }

    pub fn with_policy(policy: PasswordPolicy) -> Self {
        Self {
            policy,
            argon2: Argon2::default(),
        }
    }

    /// Hash a password using Argon2 (primary) with bcrypt fallback
    pub fn hash_password(&self, password: &str) -> AuthResult<String> {
        // Validate password first
        self.validate_password_strength(password)?;

        // Generate salt
        let salt = SaltString::generate(&mut OsRng);

        // Hash with Argon2
        match self.argon2.hash_password(password.as_bytes(), &salt) {
            Ok(hash) => Ok(hash.to_string()),
            Err(_) => {
                // Fallback to bcrypt if Argon2 fails
                bcrypt::hash(password, 12)
                    .map_err(|_| AuthError::InternalError("Failed to hash password".to_string()))
            }
        }
    }

    /// Verify password against hash  
    pub fn verify_password(&self, password: &str, hash: &str) -> AuthResult<bool> {
        self.verify_password_with_context(password, hash, "Authentication")
    }

    /// Verify password against hash with context for better logging
    pub fn verify_password_with_context(&self, password: &str, hash: &str, context: &str) -> AuthResult<bool> {
        log::debug!("{}: Verifying password (length: {}) against hash (prefix: {})", 
                     context,
                     password.len(), 
                     hash.chars().take(20).collect::<String>());
        
        // Try Argon2 first
        if let Ok(parsed_hash) = PasswordHash::new(hash) {
            log::debug!("Successfully parsed hash as Argon2, attempting verification");
            match self.argon2.verify_password(password.as_bytes(), &parsed_hash) {
                Ok(_) => {
                    log::debug!("{}: Argon2 verification successful", context);
                    return Ok(true);
                }
                Err(argon2_err) => {
                    if context == "Password similarity check" {
                        log::debug!("{}: Argon2 verification failed (expected for different passwords): {:?}", context, argon2_err);
                    } else {
                        log::warn!("{}: Argon2 verification failed with error: {:?}", context, argon2_err);
                    }
                }
            }
        } else {
            log::debug!("Hash parsing failed, trying bcrypt directly");
        }

        // Fallback to bcrypt
        match bcrypt::verify(password, hash) {
            Ok(result) => {
                log::debug!("{}: bcrypt verification result: {}", context, result);
                Ok(result)
            }
            Err(e) => {
                if context == "Password similarity check" {
                    log::debug!("{}: bcrypt verification failed (expected for different passwords): {}", context, e);
                } else {
                    log::error!("{}: bcrypt verification error: {}", context, e);
                }
                Err(AuthError::InvalidCredentials)
            }
        }
    }

    /// Check if two passwords are the same (used for password change validation)
    pub fn passwords_are_same(&self, new_password: &str, current_hash: &str) -> bool {
        match self.verify_password_with_context(new_password, current_hash, "Password similarity check") {
            Ok(is_same) => is_same,
            Err(_) => false, // If verification fails, passwords are different
        }
    }

    /// Validate password strength according to policy
    pub fn validate_password_strength(&self, password: &str) -> AuthResult<()> {
        let mut errors = Vec::new();

        // Check minimum length
        if password.len() < self.policy.min_length {
            errors.push(format!("Password must be at least {} characters long", self.policy.min_length));
        }

        // Check character requirements
        if self.policy.require_uppercase && !password.chars().any(|c| c.is_uppercase()) {
            errors.push("Password must contain at least one uppercase letter".to_string());
        }

        if self.policy.require_lowercase && !password.chars().any(|c| c.is_lowercase()) {
            errors.push("Password must contain at least one lowercase letter".to_string());
        }

        if self.policy.require_numbers && !password.chars().any(|c| c.is_numeric()) {
            errors.push("Password must contain at least one number".to_string());
        }

        if self.policy.require_special_chars {
            let special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
            if !password.chars().any(|c| special_chars.contains(c)) {
                errors.push("Password must contain at least one special character".to_string());
            }
        }

        // Check for excessive repeating characters
        if self.has_excessive_repeating_chars(password) {
            errors.push(format!("Password cannot have more than {} repeating characters", self.policy.max_repeating_chars));
        }

        // Check for forbidden patterns
        let lowercase_password = password.to_lowercase();
        for pattern in &self.policy.forbidden_patterns {
            if lowercase_password.contains(&pattern.to_lowercase()) {
                errors.push(format!("Password cannot contain the pattern: {}", pattern));
            }
        }

        // Check for username inclusion (this would be done with user context)
        // For now, we'll check if it's just common weak patterns

        if errors.is_empty() {
            Ok(())
        } else {
            Err(AuthError::PasswordTooWeak)
        }
    }

    /// Check if password contains excessive repeating characters
    fn has_excessive_repeating_chars(&self, password: &str) -> bool {
        let chars: Vec<char> = password.chars().collect();
        let mut count = 1;
        let mut max_count = 1;

        for i in 1..chars.len() {
            if chars[i] == chars[i - 1] {
                count += 1;
                max_count = max_count.max(count);
            } else {
                count = 1;
            }
        }

        max_count > self.policy.max_repeating_chars
    }

    /// Generate a temporary password
    pub fn generate_temporary_password(&self) -> String {
        let mut rng = rand::thread_rng();

        // Character sets
        let uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let lowercase = "abcdefghijklmnopqrstuvwxyz";
        let numbers = "0123456789";
        let special = "!@#$%^&*";

        let mut password = String::new();

        // Ensure at least one from each required category
        password.push(uppercase.chars().nth(rng.gen_range(0..uppercase.len())).unwrap());
        password.push(lowercase.chars().nth(rng.gen_range(0..lowercase.len())).unwrap());
        password.push(numbers.chars().nth(rng.gen_range(0..numbers.len())).unwrap());
        password.push(special.chars().nth(rng.gen_range(0..special.len())).unwrap());

        // Fill the rest randomly
        let all_chars = format!("{}{}{}{}", uppercase, lowercase, numbers, special);
        let all_chars: Vec<char> = all_chars.chars().collect();

        for _ in 0..(self.policy.min_length - 4) {
            password.push(all_chars[rng.gen_range(0..all_chars.len())]);
        }

        // Shuffle the password
        let mut chars: Vec<char> = password.chars().collect();
        for i in 0..chars.len() {
            let j = rng.gen_range(0..chars.len());
            chars.swap(i, j);
        }

        chars.into_iter().collect()
    }

    /// Check if password is commonly used (basic check)
    pub fn is_common_password(&self, password: &str) -> bool {
        let common_passwords = [
            "password", "123456", "password123", "admin", "qwerty",
            "letmein", "welcome", "monkey", "dragon", "master",
            "kenya", "government", "nairobi", "fsfvi"
        ];

        let lowercase_password = password.to_lowercase();
        common_passwords.iter().any(|&common| lowercase_password.contains(common))
    }

    /// Calculate password entropy (rough estimation)
    pub fn calculate_entropy(&self, password: &str) -> f64 {
        if password.is_empty() {
            return 0.0;
        }

        let mut charset_size = 0;

        if password.chars().any(|c| c.is_lowercase()) {
            charset_size += 26;
        }
        if password.chars().any(|c| c.is_uppercase()) {
            charset_size += 26;
        }
        if password.chars().any(|c| c.is_numeric()) {
            charset_size += 10;
        }
        if password.chars().any(|c| "!@#$%^&*()_+-=[]{}|;:,.<>?".contains(c)) {
            charset_size += 32;
        }

        if charset_size == 0 {
            return 0.0;
        }

        let entropy = (password.len() as f64) * (charset_size as f64).log2();
        entropy
    }

    /// Rate password strength
    pub fn rate_password_strength(&self, password: &str) -> PasswordStrength {
        let entropy = self.calculate_entropy(password);
        let length = password.len();

        // Check for common patterns
        let has_common_patterns = self.is_common_password(password);
        let has_repeating = self.has_excessive_repeating_chars(password);

        // Scoring algorithm
        let mut score = 0;

        // Length scoring
        if length >= 12 { score += 20; }
        if length >= 16 { score += 10; }
        if length >= 20 { score += 10; }

        // Character variety scoring
        if password.chars().any(|c| c.is_lowercase()) { score += 5; }
        if password.chars().any(|c| c.is_uppercase()) { score += 5; }
        if password.chars().any(|c| c.is_numeric()) { score += 5; }
        if password.chars().any(|c| "!@#$%^&*()_+-=[]{}|;:,.<>?".contains(c)) { score += 10; }

        // Entropy scoring
        if entropy >= 60.0 { score += 20; }
        else if entropy >= 40.0 { score += 15; }
        else if entropy >= 25.0 { score += 10; }

        // Penalties
        if has_common_patterns { score -= 30; }
        if has_repeating { score -= 20; }

        match score {
            0..=30 => PasswordStrength::VeryWeak,
            31..=50 => PasswordStrength::Weak,
            51..=70 => PasswordStrength::Moderate,
            71..=85 => PasswordStrength::Strong,
            _ => PasswordStrength::VeryStrong,
        }
    }
}

/// Password strength levels
#[derive(Debug, Clone, PartialEq)]
pub enum PasswordStrength {
    VeryWeak,
    Weak,
    Moderate,
    Strong,
    VeryStrong,
}

impl std::fmt::Display for PasswordStrength {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PasswordStrength::VeryWeak => write!(f, "Very Weak"),
            PasswordStrength::Weak => write!(f, "Weak"),
            PasswordStrength::Moderate => write!(f, "Moderate"),
            PasswordStrength::Strong => write!(f, "Strong"),
            PasswordStrength::VeryStrong => write!(f, "Very Strong"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let service = PasswordService::new();
        let password = "TestPassword123!";

        let hash = service.hash_password(password).unwrap();
        assert!(service.verify_password(password, &hash).unwrap());
        assert!(!service.verify_password("wrong", &hash).unwrap());
    }

    #[test]
    fn test_password_strength_validation() {
        let service = PasswordService::new();

        // Should pass
        assert!(service.validate_password_strength("ComplexP@ssw0rd123").is_ok());

        // Should fail - too short
        assert!(service.validate_password_strength("Short1!").is_err());

        // Should fail - no special chars
        assert!(service.validate_password_strength("NoSpecialChars123").is_err());
    }

    #[test]
    fn test_temporary_password_generation() {
        let service = PasswordService::new();
        let temp_password = service.generate_temporary_password();

        // Should pass strength validation
        assert!(service.validate_password_strength(&temp_password).is_ok());
        assert!(temp_password.len() >= 12);
    }
}