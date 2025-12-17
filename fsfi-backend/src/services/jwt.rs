use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::user::UserRole;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,           // User ID
    pub government_id: String, // Government ID
    pub email: String,
    pub role: UserRole,
    pub exp: i64,
    pub iat: i64,
    pub token_type: TokenType,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum TokenType {
    Access,
    Refresh,
}

pub struct JwtService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    access_token_expiry: i64,
    refresh_token_expiry: i64,
}

impl Clone for JwtService {
    fn clone(&self) -> Self {
        // Recreate the service from the secret (stored in decoding_key)
        // This is a workaround since EncodingKey/DecodingKey don't implement Clone
        Self {
            encoding_key: self.encoding_key.clone(),
            decoding_key: self.decoding_key.clone(),
            access_token_expiry: self.access_token_expiry,
            refresh_token_expiry: self.refresh_token_expiry,
        }
    }
}

impl JwtService {
    pub fn new(secret: &str, access_expiry: i64, refresh_expiry: i64) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_bytes()),
            decoding_key: DecodingKey::from_secret(secret.as_bytes()),
            access_token_expiry: access_expiry,
            refresh_token_expiry: refresh_expiry,
        }
    }

    pub fn generate_access_token(
        &self,
        user_id: Uuid,
        government_id: Uuid,
        email: &str,
        role: UserRole,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        let now = Utc::now();
        let exp = now + Duration::seconds(self.access_token_expiry);

        let claims = Claims {
            sub: user_id.to_string(),
            government_id: government_id.to_string(),
            email: email.to_string(),
            role,
            exp: exp.timestamp(),
            iat: now.timestamp(),
            token_type: TokenType::Access,
        };

        encode(&Header::default(), &claims, &self.encoding_key)
    }

    pub fn generate_refresh_token(
        &self,
        user_id: Uuid,
        government_id: Uuid,
        email: &str,
        role: UserRole,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        let now = Utc::now();
        let exp = now + Duration::seconds(self.refresh_token_expiry);

        let claims = Claims {
            sub: user_id.to_string(),
            government_id: government_id.to_string(),
            email: email.to_string(),
            role,
            exp: exp.timestamp(),
            iat: now.timestamp(),
            token_type: TokenType::Refresh,
        };

        encode(&Header::default(), &claims, &self.encoding_key)
    }

    pub fn verify_token(&self, token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
        let token_data = decode::<Claims>(token, &self.decoding_key, &Validation::default())?;
        Ok(token_data.claims)
    }

    pub fn get_access_token_expiry(&self) -> i64 {
        self.access_token_expiry
    }
}
