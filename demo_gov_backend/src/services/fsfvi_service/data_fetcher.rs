/// Data Fetcher Module
/// ====================
/// Fetches validated FSFVI component data from the database
///
/// CRITICAL: Only fetches from fsfvi_data (validated data), NEVER from demo_raw_data
/// This ensures that only validated, government-approved data is used for calculations

use sqlx::{Row, SqlitePool};

use super::error::FsfviServiceError;
use super::models::ComponentInput;

pub struct DataFetcher;

impl DataFetcher {
    /// Fetch validated FSFVI components from database
    ///
    /// IMPORTANT: This only queries the fsfvi_data table which contains validated data
    /// Raw data must be validated and moved to fsfvi_data before it can be used
    pub async fn fetch_components(
        pool: &SqlitePool,
        government_id: &str,
        fiscal_year: Option<i32>,
        reporting_period: Option<&str>,
    ) -> Result<Vec<ComponentInput>, FsfviServiceError> {
        log::info!(
            "Fetching validated components: government={}, year={:?}, period={:?}",
            government_id, fiscal_year, reporting_period
        );

        // Build query with filters
        let mut query = String::from(
            "SELECT
                component_id,
                component_type,
                observed_value,
                benchmark_value,
                financial_allocation_usd,
                weight,
                sensitivity_parameter
            FROM fsfvi_data
            WHERE government_id = $1"
        );

        let has_year = fiscal_year.is_some();
        let has_period = reporting_period.is_some();

        if has_year {
            query.push_str(" AND fiscal_year = $2");
        }
        if has_period {
            if has_year {
                query.push_str(" AND reporting_period = $3");
            } else {
                query.push_str(" AND reporting_period = $2");
            }
        }

        query.push_str(" ORDER BY component_type");

        // Execute query with dynamic binding
        let mut sql_query = sqlx::query(&query).bind(government_id);

        if let Some(year) = fiscal_year {
            sql_query = sql_query.bind(year);
        }

        if let Some(period) = reporting_period {
            sql_query = sql_query.bind(period);
        }

        let rows = sql_query
            .fetch_all(pool)
            .await
            .map_err(|e| FsfviServiceError::DatabaseError(format!(
                "Failed to fetch components: {}",
                e
            )))?;

        if rows.is_empty() {
            log::warn!("No validated components found for the specified criteria");
            return Ok(Vec::new());
        }

        let mut components = Vec::new();

        for row in rows {
            // CRITICAL: Explicitly specify Option<f64> type for NULL-able columns
            // SQLite NULL values must be read as Option<f64>, not f64
            let weight: Option<f64> = row.try_get::<Option<f64>, _>("weight")
                .unwrap_or(None);
            let sensitivity_parameter: Option<f64> = row.try_get::<Option<f64>, _>("sensitivity_parameter")
                .unwrap_or(None);

            let component = ComponentInput {
                component_id: row.try_get("component_id").ok(),
                component_type: row.try_get("component_type")
                    .map_err(|e| FsfviServiceError::DatabaseError(format!(
                        "Missing component_type: {}",
                        e
                    )))?,
                observed_value: row.try_get("observed_value")
                    .map_err(|e| FsfviServiceError::DatabaseError(format!(
                        "Missing observed_value: {}",
                        e
                    )))?,
                benchmark_value: row.try_get("benchmark_value")
                    .map_err(|e| FsfviServiceError::DatabaseError(format!(
                        "Missing benchmark_value: {}",
                        e
                    )))?,
                financial_allocation_usd: row.try_get("financial_allocation_usd")
                    .map_err(|e| FsfviServiceError::DatabaseError(format!(
                        "Missing financial_allocation_usd: {}",
                        e
                    )))?,
                weight,
                sensitivity_parameter,
            };

            // Validate component data integrity
            Self::validate_component(&component)?;
            components.push(component);
        }

        log::info!("Successfully fetched {} validated components", components.len());
        Ok(components)
    }

    /// Validate component data before use
    /// CRITICAL: Ensures data integrity for government decision-making
    fn validate_component(component: &ComponentInput) -> Result<(), FsfviServiceError> {
        // Validate component_type
        const VALID_TYPES: &[&str] = &[
            "agricultural_development",
            "infrastructure",
            "nutrition_health",
            "climate_natural_resources",
            "social_protection_equity",
            "governance_institutions",
        ];

        if !VALID_TYPES.contains(&component.component_type.as_str()) {
            return Err(FsfviServiceError::ValidationError(format!(
                "Invalid component_type '{}'. Must be one of: {}",
                component.component_type,
                VALID_TYPES.join(", ")
            )));
        }

        // Validate observed_value
        if component.observed_value < 0.0 || !component.observed_value.is_finite() {
            return Err(FsfviServiceError::ValidationError(format!(
                "Invalid observed_value for '{}': must be >= 0 and finite (got: {})",
                component.component_type, component.observed_value
            )));
        }

        // Validate benchmark_value
        if component.benchmark_value < 0.0 || !component.benchmark_value.is_finite() {
            return Err(FsfviServiceError::ValidationError(format!(
                "Invalid benchmark_value for '{}': must be >= 0 and finite (got: {})",
                component.component_type, component.benchmark_value
            )));
        }

        // Validate financial_allocation_usd
        if component.financial_allocation_usd < 0.0 || !component.financial_allocation_usd.is_finite() {
            return Err(FsfviServiceError::ValidationError(format!(
                "Invalid financial_allocation_usd for '{}': must be >= 0 and finite (got: {})",
                component.component_type, component.financial_allocation_usd
            )));
        }

        // Sanity check: budget should be reasonable (not more than $1 trillion USD per component)
        if component.financial_allocation_usd > 1_000_000_000_000.0 {
            log::warn!(
                "Unusually large budget allocation for '{}': ${:.2} USD",
                component.component_type, component.financial_allocation_usd
            );
        }

        // Validate weight if present
        if let Some(weight) = component.weight {
            if weight < 0.0 || weight > 1.0 || !weight.is_finite() {
                return Err(FsfviServiceError::ValidationError(format!(
                    "Invalid weight for '{}': must be between 0 and 1 (got: {})",
                    component.component_type, weight
                )));
            }
        }

        // Validate sensitivity_parameter if present
        if let Some(sensitivity) = component.sensitivity_parameter {
            if sensitivity < 0.0005 || sensitivity > 0.005 || !sensitivity.is_finite() {
                return Err(FsfviServiceError::ValidationError(format!(
                    "Invalid sensitivity_parameter for '{}': must be between 0.0005 and 0.005 (got: {})",
                    component.component_type, sensitivity
                )));
            }
        }

        Ok(())
    }

    /// Fetch components for multiple fiscal years (useful for trend analysis)
    pub async fn fetch_components_multi_year(
        pool: &SqlitePool,
        government_id: &str,
        fiscal_years: Vec<i32>,
        reporting_period: Option<&str>,
    ) -> Result<Vec<(i32, Vec<ComponentInput>)>, FsfviServiceError> {
        let mut results = Vec::new();

        for year in fiscal_years {
            let components = Self::fetch_components(
                pool,
                government_id,
                Some(year),
                reporting_period,
            )
            .await?;

            results.push((year, components));
        }

        Ok(results)
    }
}
