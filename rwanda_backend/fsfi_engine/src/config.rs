//! FSFI System Configuration
//!
//! Centralized configuration for the Food Systems Financial Intelligence (FSFI)
//! Financing Stress Index (FSFSI).
//!
//! # Configuration Governance
//! - All threshold values are based on empirical research and expert consensus
//! - Changes to default values require documented justification and approval
//! - Configuration changes should be audited and version-controlled

use pyo3::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Precision value for floating point calculations
pub const PRECISION: u32 = 6;

/// Convergence tolerance for iterative algorithms
pub const TOLERANCE: f64 = 1e-6;

/// Maximum iterations for convergence algorithms
pub const MAX_ITERATIONS: usize = 1000;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/// Available weighting methods for component importance calculation
///
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
    pub fn as_str(&self) -> &'static str {
        match self {
            WeightingMethod::Financial => "financial",
            WeightingMethod::Expert => "expert",
            WeightingMethod::Network => "network",
            WeightingMethod::Hybrid => "hybrid",
        }
    }
}

/// Available scenarios for stress analysis
///
/// Each scenario represents a distinct stress condition that affects food system stability.
/// Scenarios modify sensitivity parameters and component interactions to model different
/// types of systemic shocks and their cascading effects.
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
/// Six components representing the fundamental pillars of food system resilience,
/// derived from international food security frameworks (FAO, World Bank, etc.).
/// NOTE: This is the legacy 6-component structure, kept for backwards compatibility.
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
}

/// Indicator-based component types for Rwanda FSFSI
///
/// Eight components based on the Rwanda budget mapping structure with 37 indicators.
/// This is the primary structure for indicator-level FSFSI assessments.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IndicatorComponent {
    Markets,
    CropProduction,
    Nutrition,
    Research,
    PostHarvest,
    Environment,
    AnimalSystems,
    Finance,
}

impl IndicatorComponent {
    pub fn as_str(&self) -> &'static str {
        match self {
            IndicatorComponent::Markets => "markets",
            IndicatorComponent::CropProduction => "crop_production",
            IndicatorComponent::Nutrition => "nutrition",
            IndicatorComponent::Research => "research",
            IndicatorComponent::PostHarvest => "post_harvest",
            IndicatorComponent::Environment => "environment",
            IndicatorComponent::AnimalSystems => "animal_systems",
            IndicatorComponent::Finance => "finance",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            IndicatorComponent::Markets => "Markets",
            IndicatorComponent::CropProduction => "Crop Production",
            IndicatorComponent::Nutrition => "Nutrition",
            IndicatorComponent::Research => "Research",
            IndicatorComponent::PostHarvest => "Post-Harvest",
            IndicatorComponent::Environment => "Environment",
            IndicatorComponent::AnimalSystems => "Animal Systems",
            IndicatorComponent::Finance => "Finance",
        }
    }

    /// Get all 8 indicator components in order
    pub fn all() -> [IndicatorComponent; 8] {
        [
            IndicatorComponent::Markets,
            IndicatorComponent::CropProduction,
            IndicatorComponent::Nutrition,
            IndicatorComponent::Research,
            IndicatorComponent::PostHarvest,
            IndicatorComponent::Environment,
            IndicatorComponent::AnimalSystems,
            IndicatorComponent::Finance,
        ]
    }
}

/// Normalize indicator component string to IndicatorComponent enum
pub fn normalize_indicator_component(component: &str) -> IndicatorComponent {
    let normalized = component.to_lowercase().trim().replace(' ', "_").replace('-', "_");

    match normalized.as_str() {
        "markets" | "market" => IndicatorComponent::Markets,
        "crop_production" | "crop" | "crops" => IndicatorComponent::CropProduction,
        "nutrition" => IndicatorComponent::Nutrition,
        "research" | "research_innovation" => IndicatorComponent::Research,
        "post_harvest" | "postharvest" => IndicatorComponent::PostHarvest,
        "environment" | "environmental" => IndicatorComponent::Environment,
        "animal_systems" | "animal" | "livestock" => IndicatorComponent::AnimalSystems,
        "finance" | "financial" | "financing" => IndicatorComponent::Finance,
        _ => IndicatorComponent::Markets, // default
    }
}

/// Normalize component type string to standard category (legacy 6-component)
///
/// Handles variant input formats and legacy naming conventions.
/// Defaults to `AgriculturalDevelopment` if input doesn't match any known pattern.
pub fn normalize_component_type(component_type: &str) -> ComponentType {
    let normalized = component_type.to_lowercase().trim().to_string();

    // Handle legacy mapping
    if normalized == "social_assistance" || normalized == "social assistance" {
        return ComponentType::SocialProtectionEquity;
    }

    match normalized.as_str() {
        "agricultural_development" | "agriculture" | "agri" => {
            ComponentType::AgriculturalDevelopment
        }
        "infrastructure" => ComponentType::Infrastructure,
        "nutrition_health" | "nutrition" | "health" => ComponentType::NutritionHealth,
        "climate_natural_resources" | "climate" | "environment" => {
            ComponentType::ClimateNaturalResources
        }
        "social_protection_equity" | "social_protection" | "social" => {
            ComponentType::SocialProtectionEquity
        }
        "governance_institutions" | "governance" => ComponentType::GovernanceInstitutions,
        _ => ComponentType::AgriculturalDevelopment,
    }
}

// ---------------------------------------------------------------------------
// Configuration Structs
// ---------------------------------------------------------------------------

/// Core FSFSI calculation configuration
///
/// Central configuration containing all parameters for FSFSI stress assessment,
/// risk classification, and validation processes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsfiConfig {
    pub precision: u32,
    pub tolerance: f64,
    pub max_iterations: usize,
    pub default_weighting: WeightingMethod,
    pub default_scenario: Scenario,

    // Sensitivity parameter estimation
    pub sensitivity_estimation_method: String,
    pub sensitivity_estimation_fallback: String,

    /// Stress level thresholds: FSFSI score (0–1) → risk category.
    /// Higher score = more stress = worse. Used by determine_stress_level().
    /// - low:      score ≤ 0.05  (5%)
    /// - medium:   score ≤ 0.15  (15%)
    /// - high:     score ≤ 0.30  (30%)
    /// - critical: score > 0.30
    /// Example: 0.28 → high; 0.51 → critical.
    pub stress_thresholds: HashMap<String, f64>,
    pub alternative_thresholds: HashMap<String, HashMap<String, f64>>,

    // Weight validation tolerances
    pub weight_tolerance: f64,
    pub weight_sum_tolerance: f64,

    // Optimization parameters
    pub initial_learning_rate: f64,
    pub min_improvement: f64,
    pub max_optimization_iterations: usize,
}

impl Default for FsfiConfig {
    fn default() -> Self {
        let mut stress_thresholds = HashMap::new();
        stress_thresholds.insert("low".to_string(), 0.050);
        stress_thresholds.insert("medium".to_string(), 0.150);
        stress_thresholds.insert("high".to_string(), 0.300);
        stress_thresholds.insert("critical".to_string(), 0.500);

        let mut alternative_thresholds = HashMap::new();

        let mut original = HashMap::new();
        original.insert("low".to_string(), 0.15);
        original.insert("medium".to_string(), 0.30);
        original.insert("high".to_string(), 0.50);
        original.insert("critical".to_string(), 0.70);
        alternative_thresholds.insert("original".to_string(), original);

        let mut fine_grained = HashMap::new();
        fine_grained.insert("low".to_string(), 0.010);
        fine_grained.insert("medium".to_string(), 0.025);
        fine_grained.insert("high".to_string(), 0.075);
        fine_grained.insert("critical".to_string(), 0.200);
        alternative_thresholds.insert("fine_grained".to_string(), fine_grained);

        let mut crisis_mode = HashMap::new();
        crisis_mode.insert("low".to_string(), 0.100);
        crisis_mode.insert("medium".to_string(), 0.250);
        crisis_mode.insert("high".to_string(), 0.500);
        crisis_mode.insert("critical".to_string(), 0.750);
        alternative_thresholds.insert("crisis_mode".to_string(), crisis_mode);

        Self {
            precision: PRECISION,
            tolerance: TOLERANCE,
            max_iterations: MAX_ITERATIONS,
            default_weighting: WeightingMethod::Hybrid,
            default_scenario: Scenario::NormalOperations,
            sensitivity_estimation_method: "empirical".to_string(),
            sensitivity_estimation_fallback: "hardcoded".to_string(),
            stress_thresholds,
            alternative_thresholds,
            weight_tolerance: 1e-3,
            weight_sum_tolerance: 1e-3,
            initial_learning_rate: 0.1,
            min_improvement: 1e-6,
            max_optimization_iterations: 200,
        }
    }
}

impl FsfiConfig {
    /// Determine stress level from FSFSI score (Rwanda risk categorization).
    /// Single source of truth: higher FSFSI = more food system stress = worse outcome.
    pub fn determine_stress_level(&self, fsfsi_score: f64) -> &'static str {
        if fsfsi_score <= self.stress_thresholds["low"] {
            "low"
        } else if fsfsi_score <= self.stress_thresholds["medium"] {
            "medium"
        } else if fsfsi_score <= self.stress_thresholds["high"] {
            "high"
        } else {
            "critical"
        }
    }
}

/// Weighting system configuration (unchanged from FSFVI — robust existing system)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeightingConfig {
    // AHP configuration
    pub ahp_consistency_threshold: f64,

    // Network analysis (PageRank) configuration
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
    pub min_observed_value: f64,
    pub min_benchmark_value: f64,
    pub min_financial_allocation: f64,
    pub min_sensitivity_parameter: f64,
    pub max_weight_concentration: f64,
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

// ---------------------------------------------------------------------------
// Global configuration instances
// ---------------------------------------------------------------------------

/// Get the default FSFI config (thread-safe singleton pattern via lazy initialization)
pub fn get_config() -> &'static FsfiConfig {
    use std::sync::OnceLock;
    static CONFIG: OnceLock<FsfiConfig> = OnceLock::new();
    CONFIG.get_or_init(FsfiConfig::default)
}

pub fn get_weighting_config() -> &'static WeightingConfig {
    use std::sync::OnceLock;
    static CONFIG: OnceLock<WeightingConfig> = OnceLock::new();
    CONFIG.get_or_init(WeightingConfig::default)
}

pub fn get_validation_config() -> &'static ValidationConfig {
    use std::sync::OnceLock;
    static CONFIG: OnceLock<ValidationConfig> = OnceLock::new();
    CONFIG.get_or_init(ValidationConfig::default)
}

// ---------------------------------------------------------------------------
// PyO3 Module Registration
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PyO3 Functions
// ---------------------------------------------------------------------------

#[pyfunction]
fn get_default_config() -> PyResult<String> {
    let config = get_config();
    serde_json::to_string(config).map_err(|e| {
        pyo3::exceptions::PyValueError::new_err(format!("Config serialization error: {}", e))
    })
}

#[pyfunction]
fn get_stress_level(fsfsi_score: f64) -> PyResult<String> {
    let config = get_config();
    Ok(config.determine_stress_level(fsfsi_score).to_string())
}

#[pyfunction]
fn normalize_component(component_type: &str) -> PyResult<String> {
    Ok(normalize_component_type(component_type).as_str().to_string())
}

#[pyfunction]
fn py_normalize_indicator_component(component: &str) -> PyResult<String> {
    Ok(normalize_indicator_component(component).as_str().to_string())
}

#[pyfunction]
fn py_get_indicator_components() -> PyResult<Vec<String>> {
    Ok(IndicatorComponent::all()
        .iter()
        .map(|c| c.as_str().to_string())
        .collect())
}

/// Register config types and functions with the Python module
pub fn register_module(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(get_default_config, m)?)?;
    m.add_function(wrap_pyfunction!(get_stress_level, m)?)?;
    m.add_function(wrap_pyfunction!(normalize_component, m)?)?;
    m.add_function(wrap_pyfunction!(py_normalize_indicator_component, m)?)?;
    m.add_function(wrap_pyfunction!(py_get_indicator_components, m)?)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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
        assert_eq!(
            normalize_component_type("climate"),
            ComponentType::ClimateNaturalResources
        );
    }

    #[test]
    fn test_stress_level_determination() {
        let config = FsfiConfig::default();
        assert_eq!(config.determine_stress_level(0.03), "low");
        assert_eq!(config.determine_stress_level(0.10), "medium");
        assert_eq!(config.determine_stress_level(0.25), "high");
        assert_eq!(config.determine_stress_level(0.60), "critical");
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
        assert_eq!(
            Scenario::PandemicDisruption.as_str(),
            "pandemic_disruption"
        );
        assert_eq!(
            Scenario::SupplyChainDisruption.as_str(),
            "supply_chain_disruption"
        );
        assert_eq!(Scenario::CyberThreats.as_str(), "cyber_threats");
        assert_eq!(
            Scenario::PoliticalInstability.as_str(),
            "political_instability"
        );
    }

    #[test]
    fn test_default_config_values() {
        let config = FsfiConfig::default();
        assert_eq!(config.precision, 6);
        assert_eq!(config.tolerance, 1e-6);
        assert_eq!(config.max_iterations, 1000);
        assert_eq!(config.default_weighting, WeightingMethod::Hybrid);
        assert_eq!(config.default_scenario, Scenario::NormalOperations);
    }

    #[test]
    fn test_weighting_config_hybrid_sums_to_one() {
        let config = WeightingConfig::default();
        let sum = config.hybrid_expert_weight
            + config.hybrid_pagerank_weight
            + config.hybrid_cascade_weight
            + config.hybrid_financial_weight;
        assert!((sum - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_indicator_component_all() {
        let all = IndicatorComponent::all();
        assert_eq!(all.len(), 8);
        assert_eq!(all[0], IndicatorComponent::Markets);
        assert_eq!(all[7], IndicatorComponent::Finance);
    }

    #[test]
    fn test_indicator_component_as_str() {
        assert_eq!(IndicatorComponent::Markets.as_str(), "markets");
        assert_eq!(IndicatorComponent::CropProduction.as_str(), "crop_production");
        assert_eq!(IndicatorComponent::Nutrition.as_str(), "nutrition");
        assert_eq!(IndicatorComponent::Research.as_str(), "research");
        assert_eq!(IndicatorComponent::PostHarvest.as_str(), "post_harvest");
        assert_eq!(IndicatorComponent::Environment.as_str(), "environment");
        assert_eq!(IndicatorComponent::AnimalSystems.as_str(), "animal_systems");
        assert_eq!(IndicatorComponent::Finance.as_str(), "finance");
    }

    #[test]
    fn test_normalize_indicator_component() {
        assert_eq!(normalize_indicator_component("markets"), IndicatorComponent::Markets);
        assert_eq!(normalize_indicator_component("crop_production"), IndicatorComponent::CropProduction);
        assert_eq!(normalize_indicator_component("Nutrition"), IndicatorComponent::Nutrition);
        assert_eq!(normalize_indicator_component("post-harvest"), IndicatorComponent::PostHarvest);
        assert_eq!(normalize_indicator_component("ANIMAL_SYSTEMS"), IndicatorComponent::AnimalSystems);
        assert_eq!(normalize_indicator_component("finance"), IndicatorComponent::Finance);
    }

    #[test]
    fn test_indicator_component_display_name() {
        assert_eq!(IndicatorComponent::Markets.display_name(), "Markets");
        assert_eq!(IndicatorComponent::CropProduction.display_name(), "Crop Production");
        assert_eq!(IndicatorComponent::PostHarvest.display_name(), "Post-Harvest");
    }
}
