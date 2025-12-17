use rand::Rng;
use sha2::{Digest, Sha256};

pub struct ApiKeyService;

impl ApiKeyService {
    /// Generate a new API key with format: fsfi_live_<random_32_chars>
    pub fn generate_api_key() -> String {
        let random_string: String = rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(32)
            .map(char::from)
            .collect();

        format!("fsfi_live_{}", random_string)
    }

    /// Hash an API key for secure storage
    pub fn hash_api_key(api_key: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(api_key.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Extract the prefix from an API key (first 8 characters)
    pub fn get_key_prefix(api_key: &str) -> String {
        api_key.chars().take(8).collect()
    }

    /// Verify an API key against its hash
    pub fn verify_api_key(api_key: &str, hash: &str) -> bool {
        Self::hash_api_key(api_key) == hash
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_key_generation() {
        let key = ApiKeyService::generate_api_key();
        assert!(key.starts_with("fsfi_live_"));
        assert_eq!(key.len(), 42); // "fsfi_live_" (10) + 32 random chars
    }

    #[test]
    fn test_api_key_hashing() {
        let key = ApiKeyService::generate_api_key();
        let hash = ApiKeyService::hash_api_key(&key);

        assert!(ApiKeyService::verify_api_key(&key, &hash));
        assert!(!ApiKeyService::verify_api_key("wrong_key", &hash));
    }

    #[test]
    fn test_key_prefix() {
        let key = "fsfi_live_abc123xyz";
        let prefix = ApiKeyService::get_key_prefix(key);
        assert_eq!(prefix, "fsfi_liv");
    }
}
