/// FSFVI HTTP Client
/// ==================
/// Core HTTP client for communicating with FSFI Backend API
/// Handles authentication, request/response lifecycle, and error handling
///
/// CRITICAL: All requests must use X-API-Key header for authentication

use reqwest::{Client, Method};
use serde::de::DeserializeOwned;
use std::time::Duration;

use super::error::FsfviServiceError;
use super::models::ApiResponse;

const DEFAULT_TIMEOUT_SECS: u64 = 120; // 2 minutes for complex calculations

#[derive(Debug, Clone)]
pub struct FsfviClient {
    client: Client,
    api_base_url: String,
    api_key: String,
}

impl FsfviClient {
    pub fn new(api_base_url: String, api_key: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            api_base_url,
            api_key,
        }
    }

    /// Make authenticated request to FSFVI API
    pub async fn request<T: DeserializeOwned>(
        &self,
        method: Method,
        endpoint: &str,
        body: Option<serde_json::Value>,
    ) -> Result<ApiResponse<T>, FsfviServiceError> {
        let url = format!("{}{}", self.api_base_url, endpoint);

        log::info!("FSFVI API Request: {} {}", method, url);

        let mut req = self
            .client
            .request(method.clone(), &url)
            .header("X-API-Key", &self.api_key)
            .header("Content-Type", "application/json");

        if let Some(payload) = body {
            log::debug!("Request body: {}", serde_json::to_string_pretty(&payload).unwrap_or_default());
            req = req.json(&payload);
        }

        let response = req.send().await
            .map_err(|e| FsfviServiceError::NetworkError(format!(
                "Failed to send request to {}: {}",
                endpoint, e
            )))?;

        let status = response.status();
        let response_text = response.text().await
            .map_err(|e| FsfviServiceError::ResponseParseError(format!(
                "Failed to read response body: {}",
                e
            )))?;

        if !status.is_success() {
            log::error!("FSFVI API Error {}: {}", status, response_text);
            return Err(FsfviServiceError::ApiError {
                status: status.as_u16(),
                message: response_text,
            });
        }

        let api_response: ApiResponse<T> = serde_json::from_str(&response_text)
            .map_err(|e| FsfviServiceError::ResponseParseError(format!(
                "Failed to parse response: {}. Response body: {}",
                e, response_text
            )))?;

        log::info!(
            "FSFVI API Success: {} ms processing time",
            api_response.metadata.processing_time_ms
        );

        Ok(api_response)
    }

    /// POST request helper
    pub async fn post<T: DeserializeOwned>(
        &self,
        endpoint: &str,
        body: serde_json::Value,
    ) -> Result<ApiResponse<T>, FsfviServiceError> {
        self.request(Method::POST, endpoint, Some(body)).await
    }

    /// GET request helper
    pub async fn get<T: DeserializeOwned>(
        &self,
        endpoint: &str,
    ) -> Result<ApiResponse<T>, FsfviServiceError> {
        self.request(Method::GET, endpoint, None).await
    }

    /// Health check for API connectivity
    pub async fn health_check(&self) -> bool {
        let url = format!("{}/health", self.api_base_url);
        match self.client.get(&url).send().await {
            Ok(response) => response.status().is_success(),
            Err(_) => false,
        }
    }
}
