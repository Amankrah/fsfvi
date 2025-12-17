use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand::Rng;

pub struct PasswordService;

impl PasswordService {
    /// Generate a secure random password with 16 characters
    /// Contains uppercase, lowercase, numbers, and symbols
    pub fn generate_secure_password() -> String {
        const LENGTH: usize = 16;
        const LOWERCASE: &[u8] = b"abcdefghijklmnopqrstuvwxyz";
        const UPPERCASE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const NUMBERS: &[u8] = b"0123456789";
        const SYMBOLS: &[u8] = b"!@#$%^&*()_+-=[]{}|;:,.<>?";

        let mut rng = rand::thread_rng();
        let mut password = Vec::new();

        // Ensure at least one of each character type
        password.push(LOWERCASE[rng.gen_range(0..LOWERCASE.len())]);
        password.push(UPPERCASE[rng.gen_range(0..UPPERCASE.len())]);
        password.push(NUMBERS[rng.gen_range(0..NUMBERS.len())]);
        password.push(SYMBOLS[rng.gen_range(0..SYMBOLS.len())]);

        // Fill the rest with random characters from all sets
        let all_chars: Vec<u8> = LOWERCASE.iter()
            .chain(UPPERCASE.iter())
            .chain(NUMBERS.iter())
            .chain(SYMBOLS.iter())
            .copied()
            .collect();

        while password.len() < LENGTH {
            password.push(all_chars[rng.gen_range(0..all_chars.len())]);
        }

        // Shuffle the password
        for i in (1..password.len()).rev() {
            let j = rng.gen_range(0..=i);
            password.swap(i, j);
        }

        String::from_utf8(password).expect("Valid UTF-8 password")
    }

    pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2.hash_password(password.as_bytes(), &salt)?;
        Ok(password_hash.to_string())
    }

    pub fn verify_password(
        password: &str,
        password_hash: &str,
    ) -> Result<bool, argon2::password_hash::Error> {
        let parsed_hash = PasswordHash::new(password_hash)?;
        let argon2 = Argon2::default();

        match argon2.verify_password(password.as_bytes(), &parsed_hash) {
            Ok(_) => Ok(true),
            Err(argon2::password_hash::Error::Password) => Ok(false),
            Err(e) => Err(e),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let password = "SecurePassword123!";
        let hash = PasswordService::hash_password(password).unwrap();

        assert!(PasswordService::verify_password(password, &hash).unwrap());
        assert!(!PasswordService::verify_password("WrongPassword", &hash).unwrap());
    }
}
