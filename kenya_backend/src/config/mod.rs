use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub jwt_secret: String,
    pub host: String,
    pub port: u16,
    pub cors_origins: Vec<String>,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "sqlite:./kenya_fsfvi.db".to_string()),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| {
                    log::warn!("JWT_SECRET not set, using default (NOT SECURE FOR PRODUCTION)");
                    "your-super-secret-jwt-key-change-this-in-production-kenya-government".to_string()
                }),
            host: env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .expect("PORT must be a valid number"),
            cors_origins: vec![
                "http://localhost:3000".to_string(),    // Development
                "https://kenya.fsfvi.ai".to_string(),   // Production
            ],
        }
    }
}