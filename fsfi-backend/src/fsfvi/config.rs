/// FSFVI System Configuration
/// ===========================
///
/// Centralized configuration for the Food Systems Financial Intelligence (FSFI) Vulnerability Index (FSFVI).
/// This module provides consistent, scientifically-validated configuration parameters across
/// all FSFVI calculation modules.
///
/// # Purpose
/// The FSFVI system assesses food system vulnerability across multiple dimensions to inform
/// government policy decisions and resource allocation. Configuration values in this module
/// directly impact risk classifications and intervention recommendations.
///
/// # Configuration Governance
/// - All threshold values are based on empirical research and expert consensus
/// - Changes to default values require documented justification and approval
/// - Configuration changes should be audited and version-controlled
/// - Annual review of thresholds is recommended to reflect evolving conditions
///
/// # Critical Dependencies
/// This configuration affects:
/// - Risk level determination (low/medium/high/critical)
/// - Component weighting algorithms
/// - Sensitivity parameter estimation
/// - Validation and quality assurance processes

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Precision value for floating point calculations
///
/// Decimal places for rounding in FSFVI calculations to ensure consistency
/// and prevent floating-point accumulation errors in iterative algorithms.
pub const PRECISION: u32 = 6;

/// Convergence tolerance for iterative algorithms
///
/// Algorithms stop when changes between iterations fall below this threshold.
/// Value chosen to balance computational efficiency with numerical accuracy.
pub const TOLERANCE: f64 = 1e-6;

/// Maximum iterations for convergence algorithms
///
/// Safety limit to prevent infinite loops in optimization and weighting calculations.
/// Typical convergence occurs within 100-200 iterations under normal conditions.
pub const MAX_ITERATIONS: usize = 1000;

/// Available weighting methods for component importance calculation
///
/// Different methods capture different aspects of component significance:
/// - `Financial`: Based on actual budget allocations and financial flows
/// - `Expert`: Derived from expert judgment using Analytic Hierarchy Process (AHP)
/// - `Network`: Computed from dependency relationships using PageRank-style algorithms
/// - `Hybrid`: Balanced combination of all three methods (default, recommended)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WeightingMethod {
    Financial,
    Expert,
    Network,
    Hybrid,
}

impl WeightingMethod {
    /// Convert weighting method to string representation for database audit logging
    ///
    /// # Purpose
    /// This method is used for populating the `request_metadata` JSONB field in
    /// `fsfvi_operation_logs` table for government accountability and audit trails.
    ///
    /// # Use Cases
    /// 1. **Database Audit Logging**: Storing human-readable method names in
    ///    PostgreSQL JSONB columns for queryability and reporting
    /// 2. **Structured Logging**: Explicit string values for log aggregation systems
    /// 3. **Audit Reports**: Generating compliance reports showing which methods
    ///    were used for specific government decisions
    ///
    /// # Note
    /// While `#[serde(rename_all = "snake_case")]` handles JSON API responses,
    /// this method provides explicit control for database logging where we need
    /// guaranteed string format consistency for audit queries.
    ///
    /// # Returns
    /// Static string representation matching the snake_case serde format
    pub fn as_str(&self) -> &'static str {
        match self {
            WeightingMethod::Financial => "financial",
            WeightingMethod::Expert => "expert",
            WeightingMethod::Network => "network",
            WeightingMethod::Hybrid => "hybrid",
        }
    }
}

/// Available scenarios for vulnerability analysis
///
/// Each scenario represents a distinct stress condition that affects food system stability.
/// Scenarios modify sensitivity parameters and component interactions to model different
/// types of systemic shocks and their cascading effects.
///
/// # Scenario Descriptions
/// - `NormalOperations`: Baseline conditions without major disruptions
/// - `ClimateShock`: Extreme weather events, droughts, floods affecting production
/// - `FinancialCrisis`: Economic instability, currency devaluation, market disruptions
/// - `PandemicDisruption`: Disease outbreaks affecting labor, logistics, demand patterns
/// - `SupplyChainDisruption`: Transportation failures, trade restrictions, input shortages
/// - `CyberThreats`: Digital infrastructure attacks affecting payment/distribution systems
/// - `PoliticalInstability`: Governance failures, civil unrest, policy uncertainty
///
/// # Usage Guidelines
/// - Default scenario is `NormalOperations` for routine assessments
/// - Scenario selection should be based on current or anticipated conditions
/// - Multiple scenario analysis recommended for comprehensive risk assessment
/// - Scenario parameters are calibrated based on historical crisis data
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Scenario {
    NormalOperations,
    ClimateShock,
    FinancialCrisis,
    PandemicDisruption,
    SupplyChainDisruption,
    CyberThreats,
    PoliticalInstability,
}

impl Scenario {
    /// Convert scenario to string representation for database audit logging
    ///
    /// # Purpose
    /// This method is used for populating the `request_metadata` JSONB field in
    /// `fsfvi_operation_logs` table for government accountability and audit trails.
    ///
    /// # Use Cases
    /// 1. **Database Audit Logging**: Storing which crisis scenarios were analyzed
    ///    for specific government decisions, enabling retrospective analysis
    /// 2. **Compliance Reporting**: Track which scenarios were used during specific
    ///    time periods (e.g., "Did we analyze pandemic scenario before outbreak?")
    /// 3. **Decision Traceability**: Link policy decisions to the scenarios that
    ///    informed them for accountability and legal defensibility
    ///
    /// # Importance for Government Systems
    /// Scenario selection directly impacts vulnerability assessments and policy
    /// recommendations. Audit trails must capture:
    /// - Which scenario was used for each assessment
    /// - When scenario-based decisions were made
    /// - Whether appropriate scenarios were considered for emerging crises
    ///
    /// # Note
    /// While `#[serde(rename_all = "snake_case")]` handles JSON API responses,
    /// this method provides explicit control for database logging where we need
    /// guaranteed string format consistency for regulatory audits.
    ///
    /// # Returns
    /// Static string representation matching the snake_case serde format
    pub fn as_str(&self) -> &'static str {
        match self {
            Scenario::NormalOperations => "normal_operations",
            Scenario::ClimateShock => "climate_shock",
            Scenario::FinancialCrisis => "financial_crisis",
            Scenario::PandemicDisruption => "pandemic_disruption",
            Scenario::SupplyChainDisruption => "supply_chain_disruption",
            Scenario::CyberThreats => "cyber_threats",
            Scenario::PoliticalInstability => "political_instability",
        }
    }
}

/// Standard component types based on validated food systems frameworks
///
/// These six components represent the fundamental pillars of food system resilience,
/// derived from international food security frameworks (FAO, World Bank, etc.).
/// Each component encompasses specific indicators and metrics that collectively
/// determine food system performance and vulnerability.
///
/// # Component Definitions
/// - `AgriculturalDevelopment`: Productivity, technology adoption, farmer capacity
/// - `Infrastructure`: Physical systems (roads, storage, markets, water, energy)
/// - `NutritionHealth`: Food access, dietary diversity, health outcomes, food safety
/// - `ClimateNaturalResources`: Environmental sustainability, climate adaptation, resource management
/// - `SocialProtectionEquity`: Safety nets, equity measures, vulnerable population support
/// - `GovernanceInstitutions`: Policy effectiveness, institutional capacity, rule of law
///
/// # Framework Alignment
/// Components align with established frameworks including:
/// - FAO's Four Pillars of Food Security
/// - World Bank's Food Systems Dashboard
/// - Global Food Security Index methodology
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ComponentType {
    AgriculturalDevelopment,
    Infrastructure,
    NutritionHealth,
    ClimateNaturalResources,
    SocialProtectionEquity,
    GovernanceInstitutions,
}

impl ComponentType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ComponentType::AgriculturalDevelopment => "agricultural_development",
            ComponentType::Infrastructure => "infrastructure",
            ComponentType::NutritionHealth => "nutrition_health",
            ComponentType::ClimateNaturalResources => "climate_natural_resources",
            ComponentType::SocialProtectionEquity => "social_protection_equity",
            ComponentType::GovernanceInstitutions => "governance_institutions",
        }
    }

    /// Get performance direction preference for a component type
    ///
    /// Returns true if higher values indicate better performance, false if lower values are better.
    ///
    /// # Current Behavior
    /// All components currently return `true` (higher is better) because:
    /// - Components are normalized to positive-framed indicators
    /// - Inverse metrics (e.g., malnutrition rate) are transformed before input
    /// - Framework uses performance gaps where higher performance is always better
    ///
    /// # Note
    /// This method structure allows for future flexibility if raw metrics with
    /// inverse semantics need to be handled differently at the component level.
    ///
    /// # Returns
    /// - `true`: Higher component values indicate better performance (current: all components)
    /// - `false`: Lower component values indicate better performance (none currently)
    pub fn prefer_higher(&self) -> bool {
        match self {
            ComponentType::AgriculturalDevelopment => true,
            ComponentType::Infrastructure => true,
            ComponentType::NutritionHealth => true,
            ComponentType::ClimateNaturalResources => true,
            ComponentType::SocialProtectionEquity => true,
            ComponentType::GovernanceInstitutions => true,
        }
    }
}

/// Normalize component type string to standard category
///
/// Handles variant input formats and legacy naming conventions to ensure consistent
/// component type classification across different data sources and API versions.
///
/// # Arguments
/// * `component_type` - Input string (case-insensitive, whitespace-tolerant)
///
/// # Returns
/// Standardized `ComponentType` enum value. Defaults to `AgriculturalDevelopment`
/// if input doesn't match any known pattern (with warning logged).
///
/// # Supported Input Formats
/// - Full names: "agricultural_development", "infrastructure", etc.
/// - Short forms: "agriculture", "agri", "nutrition", "health", "climate", etc.
/// - Legacy mappings: "social_assistance" → `SocialProtectionEquity`
///
/// # Examples
/// ```
/// assert_eq!(normalize_component_type("Agriculture"), ComponentType::AgriculturalDevelopment);
/// assert_eq!(normalize_component_type("social_assistance"), ComponentType::SocialProtectionEquity);
/// ```
pub fn normalize_component_type(component_type: &str) -> ComponentType {
    let normalized = component_type.to_lowercase().trim().to_string();

    // Handle legacy mapping
    if normalized == "social_assistance" || normalized == "social assistance" {
        return ComponentType::SocialProtectionEquity;
    }

    // Direct match
    match normalized.as_str() {
        "agricultural_development" | "agriculture" | "agri" => ComponentType::AgriculturalDevelopment,
        "infrastructure" => ComponentType::Infrastructure,
        "nutrition_health" | "nutrition" | "health" => ComponentType::NutritionHealth,
        "climate_natural_resources" | "climate" | "environment" => {
            ComponentType::ClimateNaturalResources
        }
        "social_protection_equity" | "social_protection" | "social" => {
            ComponentType::SocialProtectionEquity
        }
        "governance_institutions" | "governance" => ComponentType::GovernanceInstitutions,
        _ => {
            tracing::warn!(
                "Unknown component type '{}', defaulting to agricultural_development",
                component_type
            );
            ComponentType::AgriculturalDevelopment
        }
    }
}

/// Core FSFVI calculation configuration
///
/// Central configuration structure containing all parameters for FSFVI vulnerability
/// assessment calculations, risk classification, and validation processes.
///
/// # Configuration Categories
///
/// ## Computational Parameters
/// - `precision`: Decimal places for rounding (default: 6)
/// - `tolerance`: Convergence threshold for iterative algorithms (default: 1e-6)
/// - `max_iterations`: Safety limit for iterative processes (default: 1000)
///
/// ## Methodology Defaults
/// - `default_weighting`: Component weighting method (default: Hybrid)
/// - `default_scenario`: Baseline scenario for assessments (default: NormalOperations)
///
/// ## Sensitivity Estimation
/// - `sensitivity_estimation_method`: Primary method (default: "empirical" - data-driven)
/// - `sensitivity_estimation_fallback`: Backup method (default: "hardcoded" - expert-defined)
///
/// ## Risk Classification Thresholds
/// - `risk_thresholds`: Primary thresholds for determining intervention levels
/// - `alternative_thresholds`: Additional threshold sets for sensitivity analysis
///
/// ## Validation Controls
/// - `weight_tolerance`: Acceptable deviation for individual weights (default: 0.001)
/// - `weight_sum_tolerance`: Acceptable deviation from sum=1.0 (default: 0.001)
///
/// ## Optimization Parameters
/// - `initial_learning_rate`: Starting step size for gradient-based optimization (default: 0.1)
/// - `min_improvement`: Minimum progress to continue optimization (default: 1e-6)
/// - `max_optimization_iterations`: Limit for optimization loops (default: 200)
///
/// # Critical for Government Use
/// Changes to risk thresholds and weighting parameters directly impact policy recommendations.
/// All modifications should be:
/// 1. Documented with scientific justification
/// 2. Validated against historical data
/// 3. Approved by technical review committee
/// 4. Version-controlled with change audit trail
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsfviConfig {
    pub precision: u32,
    pub tolerance: f64,
    pub max_iterations: usize,
    pub default_weighting: WeightingMethod,
    pub default_scenario: Scenario,

    // Sensitivity parameter estimation
    pub sensitivity_estimation_method: String,
    pub sensitivity_estimation_fallback: String,

    // Risk thresholds
    pub risk_thresholds: HashMap<String, f64>,

    // Alternative threshold sets
    pub alternative_thresholds: HashMap<String, HashMap<String, f64>>,

    // Weight validation tolerances
    pub weight_tolerance: f64,
    pub weight_sum_tolerance: f64,

    // Optimization parameters
    pub initial_learning_rate: f64,
    pub min_improvement: f64,
    pub max_optimization_iterations: usize,
}

impl Default for FsfviConfig {
    fn default() -> Self {
        let mut risk_thresholds = HashMap::new();
        risk_thresholds.insert("low".to_string(), 0.0500);
        risk_thresholds.insert("medium".to_string(), 0.1500);
        risk_thresholds.insert("high".to_string(), 0.3000);
        risk_thresholds.insert("critical".to_string(), 0.5000);

        let mut alternative_thresholds = HashMap::new();

        let mut original = HashMap::new();
        original.insert("low".to_string(), 0.1500);
        original.insert("medium".to_string(), 0.3000);
        original.insert("high".to_string(), 0.5000);
        original.insert("critical".to_string(), 0.7000);
        alternative_thresholds.insert("original".to_string(), original);


        let mut fine_grained = HashMap::new();
        fine_grained.insert("low".to_string(), 0.0100);
        fine_grained.insert("medium".to_string(), 0.0250);
        fine_grained.insert("high".to_string(), 0.0750);
        fine_grained.insert("critical".to_string(), 0.2000);
        alternative_thresholds.insert("fine_grained".to_string(), fine_grained);


        let mut logarithmic = HashMap::new();
        logarithmic.insert("low".to_string(), 0.0050);
        logarithmic.insert("medium".to_string(), 0.0250);
        logarithmic.insert("high".to_string(), 0.1000);
        logarithmic.insert("critical".to_string(), 0.4000);
        alternative_thresholds.insert("logarithmic".to_string(), logarithmic);


        let mut crisis_mode = HashMap::new();
        crisis_mode.insert("low".to_string(), 0.1000);
        crisis_mode.insert("medium".to_string(), 0.2500);
        crisis_mode.insert("high".to_string(), 0.5000);
        crisis_mode.insert("critical".to_string(), 0.7500);
        alternative_thresholds.insert("crisis_mode".to_string(), crisis_mode);

        Self {
            precision: PRECISION,
            tolerance: TOLERANCE,
            max_iterations: MAX_ITERATIONS,
            default_weighting: WeightingMethod::Hybrid,
            default_scenario: Scenario::NormalOperations,
            sensitivity_estimation_method: "empirical".to_string(),
            sensitivity_estimation_fallback: "hardcoded".to_string(),
            risk_thresholds,
            alternative_thresholds,
            weight_tolerance: 1e-3,
            weight_sum_tolerance: 1e-3,
            initial_learning_rate: 0.1,
            min_improvement: 1e-6,
            max_optimization_iterations: 200,
        }
    }
}

impl FsfviConfig {
    
    pub fn determine_risk_level(&self, fsfvi_score: f64) -> &'static str {
        if fsfvi_score <= self.risk_thresholds["low"] {
            "low"
        } else if fsfvi_score <= self.risk_thresholds["medium"] {
            "medium"
        } else if fsfvi_score <= self.risk_thresholds["high"] {
            "high"
        } else {
            "critical"
        }
    }
}

/// Weighting system configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeightingConfig {
    // AHP configuration
    pub ahp_consistency_threshold: f64,

    // Network analysis configuration
    pub pagerank_damping: f64,
    pub pagerank_tolerance: f64,
    pub pagerank_max_iterations: usize,

    // Hybrid weighting coefficients
    pub hybrid_expert_weight: f64,
    pub hybrid_pagerank_weight: f64,
    pub hybrid_cascade_weight: f64,
    pub hybrid_financial_weight: f64,

    // Performance adjustment bounds
    pub adjustment_min_factor: f64,
    pub adjustment_max_factor: f64,
}

impl Default for WeightingConfig {
    fn default() -> Self {
        Self {
            ahp_consistency_threshold: 0.1,
            pagerank_damping: 0.85,
            pagerank_tolerance: 1e-8,
            pagerank_max_iterations: 1000,
            hybrid_expert_weight: 0.35,
            hybrid_pagerank_weight: 0.30,
            hybrid_cascade_weight: 0.25,
            hybrid_financial_weight: 0.10,
            adjustment_min_factor: 0.5,
            adjustment_max_factor: 2.0,
        }
    }
}

/// Validation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationConfig {
    // Component validation
    pub min_observed_value: f64,
    pub min_benchmark_value: f64,
    pub min_financial_allocation: f64,
    pub min_sensitivity_parameter: f64,

    // Weight validation
    pub max_weight_concentration: f64,

    // Dependency matrix validation
    pub dependency_min_value: f64,
    pub dependency_max_value: f64,
    pub dependency_asymmetry_threshold: f64,
}

impl Default for ValidationConfig {
    fn default() -> Self {
        Self {
            min_observed_value: 0.0,
            min_benchmark_value: 0.0,
            min_financial_allocation: 0.0,
            min_sensitivity_parameter: 0.0005,
            max_weight_concentration: 0.7,
            dependency_min_value: 0.0,
            dependency_max_value: 1.0,
            dependency_asymmetry_threshold: 10.0,
        }
    }
}

// Global configuration instances
lazy_static::lazy_static! {
    pub static ref FSFVI_CONFIG: FsfviConfig = FsfviConfig::default();
    pub static ref WEIGHTING_CONFIG: WeightingConfig = WeightingConfig::default();
    pub static ref VALIDATION_CONFIG: ValidationConfig = ValidationConfig::default();
}


pub fn create_audit_metadata(
    weighting_method: WeightingMethod,
    scenario: Scenario,
    component_count: usize,
    country_name: Option<&str>,
) -> serde_json::Value {
    serde_json::json!({
        "weighting_method": weighting_method.as_str(),
        "scenario": scenario.as_str(),
        "component_count": component_count,
        "country": country_name,
        "timestamp": chrono::Utc::now().to_rfc3339(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_component_type_normalization() {
        assert_eq!(
            normalize_component_type("agriculture"),
            ComponentType::AgriculturalDevelopment
        );
        assert_eq!(
            normalize_component_type("social_assistance"),
            ComponentType::SocialProtectionEquity
        );
    }

    #[test]
    fn test_risk_level_determination() {
        let config = FsfviConfig::default();
        assert_eq!(config.determine_risk_level(0.03), "low");
        assert_eq!(config.determine_risk_level(0.10), "medium");
        assert_eq!(config.determine_risk_level(0.25), "high");
        assert_eq!(config.determine_risk_level(0.60), "critical");
    }

    #[test]
    fn test_audit_metadata_creation() {
        let metadata = create_audit_metadata(
            WeightingMethod::Hybrid,
            Scenario::ClimateShock,
            6,
            Some("Kenya"),
        );

        // Verify all required fields are present
        assert_eq!(metadata["weighting_method"], "hybrid");
        assert_eq!(metadata["scenario"], "climate_shock");
        assert_eq!(metadata["component_count"], 6);
        assert_eq!(metadata["country"], "Kenya");
        assert!(metadata["timestamp"].is_string());
    }

    #[test]
    fn test_weighting_method_as_str() {
        assert_eq!(WeightingMethod::Financial.as_str(), "financial");
        assert_eq!(WeightingMethod::Expert.as_str(), "expert");
        assert_eq!(WeightingMethod::Network.as_str(), "network");
        assert_eq!(WeightingMethod::Hybrid.as_str(), "hybrid");
    }

    #[test]
    fn test_scenario_as_str() {
        assert_eq!(Scenario::NormalOperations.as_str(), "normal_operations");
        assert_eq!(Scenario::ClimateShock.as_str(), "climate_shock");
        assert_eq!(Scenario::FinancialCrisis.as_str(), "financial_crisis");
        assert_eq!(Scenario::PandemicDisruption.as_str(), "pandemic_disruption");
        assert_eq!(Scenario::SupplyChainDisruption.as_str(), "supply_chain_disruption");
        assert_eq!(Scenario::CyberThreats.as_str(), "cyber_threats");
        assert_eq!(Scenario::PoliticalInstability.as_str(), "political_instability");
    }
}
