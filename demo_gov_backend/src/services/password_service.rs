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
    bcrypt_cost: u32,
}

impl PasswordService {
    pub fn new() -> Self {
        Self {
            policy: PasswordPolicy::default(),
            argon2: Argon2::default(),
            bcrypt_cost: 12, // Default cost for bcrypt fallback
        }
    }

    /// Create password service with custom policy and bcrypt cost
    /// CRITICAL: bcrypt_cost (password_salt_rounds) affects hashing strength
    /// Higher cost = more secure but slower. Government systems should use ≥12
    ///
    /// PUBLIC API: Kept for flexibility when governments only need to customize policy
    /// Currently used as building block for with_policy_and_bcrypt_cost
    #[allow(dead_code)]
    pub fn with_policy(policy: PasswordPolicy) -> Self {
        Self {
            policy,
            argon2: Argon2::default(),
            bcrypt_cost: 12,
        }
    }

    /// Create password service with custom bcrypt cost
    /// Used to integrate SecurityConfig.password_salt_rounds
    ///
    /// PUBLIC API: Kept for flexibility when governments only need to customize bcrypt cost
    /// Currently used as building block for with_policy_and_bcrypt_cost
    #[allow(dead_code)]
    pub fn with_bcrypt_cost(bcrypt_cost: u32) -> Self {
        Self {
            policy: PasswordPolicy::default(),
            argon2: Argon2::default(),
            bcrypt_cost,
        }
    }

    /// Create password service with BOTH custom policy AND bcrypt cost
    /// CRITICAL: Most comprehensive configuration for government compliance
    /// Allows governments to configure both password complexity requirements (policy)
    /// and hashing strength (bcrypt_cost) to meet security standards like NIST, NATO, etc.
    pub fn with_policy_and_bcrypt_cost(policy: PasswordPolicy, bcrypt_cost: u32) -> Self {
        Self {
            policy,
            argon2: Argon2::default(),
            bcrypt_cost,
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
                // SECURITY: Uses configured password_salt_rounds from SecurityConfig
                log::warn!("Argon2 hashing failed, using bcrypt fallback with cost {}", self.bcrypt_cost);
                bcrypt::hash(password, self.bcrypt_cost)
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

        // CRITICAL: Determine hash type by prefix
        // Argon2 hashes start with "$argon2"
        // Bcrypt hashes start with "$2" or "$2a" or "$2b" or "$2y"

        if hash.starts_with("$argon2") {
            // This is an Argon2 hash - must use Argon2 verification only
            log::debug!("{}: Detected Argon2 hash, using Argon2 verification", context);

            match PasswordHash::new(hash) {
                Ok(parsed_hash) => {
                    match self.argon2.verify_password(password.as_bytes(), &parsed_hash) {
                        Ok(_) => {
                            log::debug!("{}: Argon2 verification successful", context);
                            Ok(true)
                        }
                        Err(argon2_err) => {
                            if context == "Password similarity check" {
                                log::debug!("{}: Argon2 verification failed (passwords don't match): {:?}", context, argon2_err);
                            } else {
                                log::warn!("{}: Argon2 verification failed (invalid password): {:?}", context, argon2_err);
                            }
                            // CRITICAL: Argon2 password mismatch = authentication failure
                            // Do NOT fall back to bcrypt for Argon2 hashes
                            Ok(false)
                        }
                    }
                }
                Err(parse_err) => {
                    log::error!("{}: Failed to parse Argon2 hash: {:?}", context, parse_err);
                    Err(AuthError::InvalidCredentials)
                }
            }
        } else {
            // This is likely a bcrypt hash (or other format)
            log::debug!("{}: Detected bcrypt hash, using bcrypt verification", context);

            match bcrypt::verify(password, hash) {
                Ok(result) => {
                    log::debug!("{}: bcrypt verification result: {}", context, result);
                    Ok(result)
                }
                Err(e) => {
                    if context == "Password similarity check" {
                        log::debug!("{}: bcrypt verification failed (passwords don't match): {}", context, e);
                    } else {
                        log::error!("{}: bcrypt verification error: {}", context, e);
                    }
                    Err(AuthError::InvalidCredentials)
                }
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

        // CRITICAL SECURITY: Check for common passwords
        // Government systems must not allow easily guessable passwords
        if self.is_common_password(password) {
            errors.push("Password is too common and easily guessable. Please choose a more unique password".to_string());
        }

        // CRITICAL SECURITY: Check password entropy
        // Minimum 40 bits for government-level security
        // This ensures passwords are not predictable through pattern analysis
        let entropy = self.calculate_entropy(password);
        const MIN_ENTROPY_BITS: f64 = 40.0;
        if entropy < MIN_ENTROPY_BITS {
            errors.push(format!(
                "Password is too predictable (strength: {:.1} bits, required: {:.1} bits). Add more variety in character types",
                entropy, MIN_ENTROPY_BITS
            ));
        }

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

    /// CRITICAL: Test password hashing for government security compliance
    /// Ensures passwords are securely hashed and verified
    #[test]
    fn test_password_hashing_basic() {
        let service = PasswordService::new();
        let password = "CompliantPhrase@2025!";

        let hash = service.hash_password(password).unwrap();
        assert!(service.verify_password(password, &hash).unwrap());

        // Test with different password - should return Ok(false) for wrong password
        let wrong_result = service.verify_password("DifferentPhrase@8047!", &hash);
        assert!(wrong_result.is_ok());
        assert!(!wrong_result.unwrap(), "Wrong password should return false");
    }

    /// Test that different passwords produce different hashes
    #[test]
    fn test_password_hashing_uniqueness() {
        let service = PasswordService::new();
        let password = "UniquePhrase@2025!Secure";

        let hash1 = service.hash_password(password).unwrap();
        let hash2 = service.hash_password(password).unwrap();

        // Hashes should be different due to salt
        assert_ne!(hash1, hash2);

        // But both should verify correctly
        assert!(service.verify_password(password, &hash1).unwrap());
        assert!(service.verify_password(password, &hash2).unwrap());
    }

    /// Test bcrypt cost configuration for different security levels
    #[test]
    fn test_password_service_with_bcrypt_cost() {
        let service = PasswordService::with_bcrypt_cost(10);
        let password = "SecurePhrase@2025!Valid";

        let hash = service.hash_password(password).unwrap();
        assert!(service.verify_password(password, &hash).unwrap());
    }

    /// Test custom password policy enforcement
    #[test]
    fn test_password_service_with_custom_policy() {
        let policy = PasswordPolicy {
            min_length: 16, // Stricter requirement
            require_uppercase: true,
            require_lowercase: true,
            require_numbers: true,
            require_special_chars: true,
            max_repeating_chars: 2,
            forbidden_patterns: vec!["test".to_string()],
        };

        let service = PasswordService::with_policy(policy);

        // Should fail - too short
        assert!(service.validate_password_strength("Short123!").is_err());

        // Should fail - contains forbidden pattern "test"
        assert!(service.validate_password_strength("TestPassword123!").is_err());

        // Should pass - meets stricter requirements
        assert!(service.validate_password_strength("VerySecureP@ssw0rd1234").is_ok());
    }

    /// Test combined policy and bcrypt cost configuration
    #[test]
    fn test_password_service_with_policy_and_bcrypt_cost() {
        let policy = PasswordPolicy {
            min_length: 14,
            require_uppercase: true,
            require_lowercase: true,
            require_numbers: true,
            require_special_chars: true,
            max_repeating_chars: 3,
            forbidden_patterns: vec!["government".to_string()],
        };

        let service = PasswordService::with_policy_and_bcrypt_cost(policy, 10);
        let password = "ComplexP@ssw0rd2025";

        let hash = service.hash_password(password).unwrap();
        assert!(service.verify_password(password, &hash).unwrap());
    }

    /// CRITICAL: Test password validation for NIST compliance
    #[test]
    fn test_password_strength_validation_nist() {
        let service = PasswordService::new();

        // Should pass - meets all requirements (no forbidden patterns)
        assert!(service.validate_password_strength("ComplexPhrase@2025!").is_ok());
        assert!(service.validate_password_strength("MyS3curePhrase!2025").is_ok());

        // Should fail - too short (< 12 characters)
        assert!(service.validate_password_strength("Short1!").is_err());

        // Should fail - no uppercase
        assert!(service.validate_password_strength("lowercase123!").is_err());

        // Should fail - no lowercase
        assert!(service.validate_password_strength("UPPERCASE123!").is_err());

        // Should fail - no numbers
        assert!(service.validate_password_strength("NoNumbers!Pass").is_err());

        // Should fail - no special chars
        assert!(service.validate_password_strength("NoSpecialChars123").is_err());
    }

    /// Test forbidden patterns detection (common passwords, patterns)
    #[test]
    fn test_password_forbidden_patterns() {
        let service = PasswordService::new();

        // Should fail - contains "password"
        assert!(service.validate_password_strength("MyPassword123!").is_err());

        // Should fail - contains "123"
        assert!(service.validate_password_strength("Abc123!Secure").is_err());

        // Should fail - contains "qwerty"
        assert!(service.validate_password_strength("Qwerty!789Pass").is_err());

        // Should fail - contains "kenya" (government-specific)
        assert!(service.validate_password_strength("Kenya!Secure123").is_err());
    }

    /// Test common password detection
    #[test]
    fn test_common_password_detection() {
        let service = PasswordService::new();

        assert!(service.is_common_password("password123"));
        assert!(service.is_common_password("admin"));
        assert!(service.is_common_password("qwerty"));
        assert!(service.is_common_password("kenya"));
        assert!(service.is_common_password("government"));

        assert!(!service.is_common_password("ComplexPhrase@2025!Valid"));
    }

    /// Test excessive repeating characters detection
    #[test]
    fn test_excessive_repeating_characters() {
        let service = PasswordService::new();

        // Should fail - more than 3 repeating characters
        assert!(service.validate_password_strength("Vaaaa567!Phrase8").is_err());
        assert!(service.validate_password_strength("Valid4444!Phrase").is_err());

        // Should pass - 3 or fewer repeating characters
        assert!(service.validate_password_strength("Vaaa567!Phrase8").is_ok());
    }

    /// Test password entropy calculation for predictability detection
    #[test]
    fn test_password_entropy() {
        let service = PasswordService::new();

        // High entropy password
        let strong_password = "Xk8#mL9$pQ2!rT5";
        let entropy_strong = service.calculate_entropy(strong_password);
        assert!(entropy_strong >= 60.0); // Should have high entropy

        // Low entropy password (only lowercase, low variety)
        let weak_password = "aaaaaa";
        let entropy_weak = service.calculate_entropy(weak_password);
        assert!(entropy_weak < 40.0); // Should have low entropy
    }

    /// Test password strength rating system
    #[test]
    fn test_password_strength_rating() {
        let service = PasswordService::new();

        // Very strong password (longer and more complex)
        let very_strong = service.rate_password_strength("X#9mL$pQ!2rT@5wK8zNv");
        // Accept either Strong or VeryStrong (both are good)
        assert!(matches!(very_strong, PasswordStrength::Strong | PasswordStrength::VeryStrong));

        // Weak password (common pattern) - should be weak
        let weak_result = service.rate_password_strength("weakpassword");
        assert!(matches!(weak_result, PasswordStrength::VeryWeak | PasswordStrength::Weak));
    }

    /// Test temporary password generation for government officials
    #[test]
    fn test_temporary_password_generation() {
        let service = PasswordService::new();
        let temp_password = service.generate_temporary_password();

        // Should pass strength validation
        assert!(service.validate_password_strength(&temp_password).is_ok());
        assert!(temp_password.len() >= 12);

        // Should contain at least one from each category
        assert!(temp_password.chars().any(|c| c.is_uppercase()));
        assert!(temp_password.chars().any(|c| c.is_lowercase()));
        assert!(temp_password.chars().any(|c| c.is_numeric()));
        assert!(temp_password.chars().any(|c| "!@#$%^&*".contains(c)));
    }

    /// Test that temporary passwords are random (don't repeat)
    #[test]
    fn test_temporary_password_randomness() {
        let service = PasswordService::new();
        let password1 = service.generate_temporary_password();
        let password2 = service.generate_temporary_password();

        // Should be different
        assert_ne!(password1, password2);
    }

    /// Test password similarity detection for password change
    #[test]
    fn test_passwords_are_same() {
        let service = PasswordService::new();
        let password = "UniquePhrase@2025!Valid";

        let hash = service.hash_password(password).unwrap();

        // Same password should return true
        assert!(service.passwords_are_same(password, &hash));

        // Different password should return false
        assert!(!service.passwords_are_same("DifferentPhrase@2026!Secure", &hash));
    }

    /// CRITICAL: Test that minimum entropy requirement is enforced
    /// Government systems must not allow predictable passwords
    #[test]
    fn test_minimum_entropy_enforcement() {
        let service = PasswordService::new();

        // Very predictable password (low entropy)
        let result = service.validate_password_strength("Aaaaaa1!");
        assert!(result.is_err()); // Should fail due to low entropy

        // Complex password (high entropy)
        let result = service.validate_password_strength("Xk8#mL9$pQ2!");
        assert!(result.is_ok());
    }
}