use std::env;

#[derive(Debug, Clone, PartialEq)]
pub enum Environment {
    Development,
    Production,
}

impl Environment {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "production" | "prod" => Environment::Production,
            _ => Environment::Development,
        }
    }

    pub fn is_production(&self) -> bool {
        matches!(self, Environment::Production)
    }
}

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub environment: Environment,
    pub database_url: String,
    pub jwt_secret: String,
    pub host: String,
    pub port: u16,
    pub cors_origins: Vec<String>,
    pub fsfvi_api_url: String,
    pub fsfvi_api_key: Option<String>,
    pub rate_limit_per_minute: u32,
}

impl AppConfig {
    pub fn from_env() -> Self {
        // Determine environment
        let environment = Environment::from_str(
            &env::var("ENVIRONMENT").unwrap_or_else(|_| "development".to_string())
        );

        // Validate JWT secret in production
        let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| {
            if environment.is_production() {
                panic!("JWT_SECRET must be set in production environment!");
            }
            log::warn!("JWT_SECRET not set, using default (NOT SECURE FOR PRODUCTION)");
            "your-super-secret-jwt-key-change-this-in-production-demo-government".to_string()
        });

        // Check JWT secret strength in production
        if environment.is_production() && jwt_secret.len() < 32 {
            panic!("JWT_SECRET must be at least 32 characters in production!");
        }

        // Configure CORS origins based on environment
        let cors_origins = match environment {
            Environment::Development => {
                vec![
                    env::var("CORS_ORIGIN_DEV")
                        .unwrap_or_else(|_| "http://localhost:3000".to_string()),
                ]
            }
            Environment::Production => {
                vec![
                    env::var("CORS_ORIGIN_PROD")
                        .unwrap_or_else(|_| "https://demo.fsfvi.ai".to_string()),
                ]
            }
        };

        // FSFVI API configuration
        let fsfvi_api_url = env::var("FSFVI_API_URL")
            .unwrap_or_else(|_| "http://localhost:8080".to_string());

        let fsfvi_api_key = env::var("FSFVI_API_KEY").ok();

        // Validate FSFVI API key in production
        if environment.is_production() && fsfvi_api_key.is_none() {
            log::warn!("FSFVI_API_KEY not set in production - API calls will require user's API key");
        }

        Self {
            environment: environment.clone(),
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "sqlite:./demo_gov_backend.db".to_string()),
            jwt_secret,
            host: env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "8081".to_string())
                .parse()
                .expect("PORT must be a valid number"),
            cors_origins,
            fsfvi_api_url,
            fsfvi_api_key,
            rate_limit_per_minute: env::var("RATE_LIMIT_PER_MINUTE")
                .unwrap_or_else(|_| "60".to_string())
                .parse()
                .expect("RATE_LIMIT_PER_MINUTE must be a valid number"),
        }
    }
}