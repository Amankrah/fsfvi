/// Weighting System Models
/// ========================
///
/// Data structures for the advanced weighting system based on
/// IPC (Integrated Food Security Phase Classification) and
/// FEWS NET (Famine Early Warning Systems Network) frameworks.
///
/// Component relationships are grounded in:
/// - FEWS NET Livelihoods Framework (production, purchase, labor, transfer pathways)
/// - IPC Analytical Framework (food consumption, livelihood change, nutrition, mortality)
///
/// # Dependency Matrix Interpretation
///
/// Cascade relationship matrices use the interpretation:
/// **`matrix[i][j]` = "If component i fails, how much does it affect component j?"**
///
/// Example:
/// - `matrix[climate][agriculture] = 0.90` means: Climate failure has a **very high** (0.90) impact on agriculture
/// - `matrix[agriculture][nutrition] = 0.85` means: Agricultural failure has a **very high** (0.85) impact on nutrition
///
/// Weight ranges:
/// - `0.0-0.3`: Weak/indirect relationship
/// - `0.3-0.6`: Moderate relationship
/// - `0.6-0.8`: Strong relationship
/// - `0.8-1.0`: Critical/direct relationship
///
/// # External Configuration
///
/// Cascade weights can be externally configured by FSFVI administrators/food security experts
/// through admin API endpoints. This allows updating relationships based on new research or
/// regional adaptations without code deployment.
///
/// **Architecture**:
/// - Weights stored in external JSON/YAML file (location set via `FSFVI_WEIGHTS_CONFIG` env var)
/// - FSFVI admins update via PUT `/api/v1/admin/weights` endpoint
/// - Government clients transparently use current weights (no configuration needed)
/// - If external config missing/invalid, system uses built-in IPC/FEWS NET defaults
///
/// **Security**: Weight modification requires `Admin` role, not accessible to government users

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

/// Weighting context for context-aware calculations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeightingContext {
    pub country: Option<String>,
    pub income_level: Option<String>, // LIC, MIC, HIC
    pub region: Option<String>,
    pub crisis_type: Option<String>,
    pub development_stage: Option<String>,
    pub population_size: Option<String>, // small, medium, large
    pub climate_zone: Option<String>,
    pub custom_factors: HashMap<String, String>,
}

impl Default for WeightingContext {
    fn default() -> Self {
        Self {
            country: None,
            income_level: None,
            region: None,
            crisis_type: None,
            development_stage: None,
            population_size: None,
            climate_zone: None,
            custom_factors: HashMap::new(),
        }
    }
}

/// Component metadata for weighting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentMetadata {
    pub name: String,
    pub category: String,
    pub description: String,
    pub default_weight: f64,
    pub weight_range: (f64, f64),
    pub dependencies: Vec<String>,
    pub contexts: HashMap<String, f64>,
    /// FEWS NET pathway mapping (production, purchase, transfer, etc.)
    pub fewsnet_pathway: Option<String>,
    /// IPC outcome linkage (availability, access, utilization, stability)
    pub ipc_dimension: Option<String>,
}

impl ComponentMetadata {
    pub fn new(name: String, category: String, default_weight: f64) -> Self {
        Self {
            name,
            category,
            description: String::new(),
            default_weight,
            weight_range: (0.0, 1.0),
            dependencies: Vec::new(),
            contexts: HashMap::new(),
            fewsnet_pathway: None,
            ipc_dimension: None,
        }
    }
}

/// Scenario-specific cascade relationship matrix
/// Stores component-to-component cascade weights for a specific shock type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CascadeMatrix {
    /// Matrix values: relationships[source][target] = cascade_weight
    pub weights: HashMap<String, HashMap<String, f64>>,
    /// Description of the scenario
    pub description: String,
    /// Reference source for the weights
    pub source: String,
}

/// External weights configuration file structure
/// Allows governments to customize cascade relationships for their specific context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExternalWeightsConfig {
    /// Version of the configuration format
    pub version: String,
    /// Country or region this configuration applies to
    pub country: Option<String>,
    /// Date when weights were last updated
    pub last_updated: Option<String>,
    /// Source/methodology used for these weights
    pub methodology: Option<String>,
    /// Scenario-specific cascade matrices
    pub scenarios: HashMap<String, ScenarioCascadeConfig>,
}

/// Configuration for a single scenario's cascade relationships
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioCascadeConfig {
    /// Description of this scenario
    pub description: String,
    /// Scientific/methodological source
    pub source: String,
    /// Component-to-component relationships
    /// Format: { "source_component": { "target_component": weight_value } }
    pub relationships: HashMap<String, HashMap<String, f64>>,
}

impl CascadeMatrix {
    pub fn new(description: &str, source: &str) -> Self {
        Self {
            weights: HashMap::new(),
            description: description.to_string(),
            source: source.to_string(),
        }
    }

    pub fn set_weight(&mut self, source: &str, target: &str, weight: f64) {
        assert!(
            weight >= 0.0 && weight <= 1.0,
            "Cascade weight must be in [0.0, 1.0], got {} for {} -> {}",
            weight,
            source,
            target
        );
        self.weights
            .entry(source.to_string())
            .or_insert_with(HashMap::new)
            .insert(target.to_string(), weight);
    }

    pub fn get_weight(&self, source: &str, target: &str) -> Option<f64> {
        self.weights.get(source).and_then(|targets| targets.get(target).copied())
    }
}

/// Component registry for managing component metadata
#[derive(Debug, Clone)]
pub struct ComponentRegistry {
    pub components: HashMap<String, ComponentMetadata>,
    /// Scenario-specific relationship matrices
    /// Key: scenario name (e.g., "baseline", "climate_shock", "financial_crisis")
    pub relationships: HashMap<String, CascadeMatrix>,
}

impl Default for ComponentRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl ComponentRegistry {
    /// Create a new registry using external weights if configured
    ///
    /// Automatically checks `FSFVI_WEIGHTS_CONFIG` environment variable for custom weights path.
    /// If not set or file doesn't exist, uses built-in IPC/FEWS NET defaults.
    pub fn new() -> Self {
        // Check environment for external weights configuration
        let config_path = std::env::var("FSFVI_WEIGHTS_CONFIG").ok();
        Self::new_with_config_path(config_path.as_deref())
    }

    /// Create a new registry, optionally loading external weights configuration
    ///
    /// # Arguments
    /// * `config_path` - Path to JSON/YAML file with custom cascade weights.
    ///                  If None or file doesn't exist, uses built-in defaults.
    ///
    /// # Example
    /// ```
    /// // Use specific config file
    /// let registry = ComponentRegistry::new_with_config_path(Some("/etc/fsfvi/weights.json"));
    ///
    /// // Use defaults
    /// let registry = ComponentRegistry::new_with_config_path(None);
    /// ```
    pub fn new_with_config_path(config_path: Option<&str>) -> Self {
        let mut registry = Self {
            components: HashMap::new(),
            relationships: HashMap::new(),
        };
        registry.initialize_default_components();

        // Try to load external weights, fall back to defaults
        if let Some(path) = config_path {
            match registry.load_external_weights(path) {
                Ok(loaded) => {
                    if loaded {
                        tracing::info!(
                            "Loaded external cascade weights from: {}",
                            path
                        );
                    } else {
                        tracing::warn!(
                            "External weights file not found: {}, using defaults",
                            path
                        );
                        registry.initialize_cascade_relationships();
                    }
                }
                Err(e) => {
                    tracing::error!(
                        "Failed to load external weights from {}: {}. Using defaults.",
                        path,
                        e
                    );
                    registry.initialize_cascade_relationships();
                }
            }
        } else {
            // No external config specified, use defaults
            registry.initialize_cascade_relationships();
        }

        registry
    }

    /// Load cascade relationships from external JSON/YAML file
    ///
    /// Returns Ok(true) if file was loaded successfully,
    /// Ok(false) if file doesn't exist (not an error),
    /// Err if file exists but is invalid
    fn load_external_weights(&mut self, path: &str) -> Result<bool, Box<dyn std::error::Error>> {
        let path_obj = Path::new(path);

        if !path_obj.exists() {
            return Ok(false);
        }

        let contents = std::fs::read_to_string(path_obj)?;

        // Try JSON first, then YAML
        let config: ExternalWeightsConfig = if path.ends_with(".json") {
            serde_json::from_str(&contents)?
        } else if path.ends_with(".yaml") || path.ends_with(".yml") {
            serde_yaml::from_str(&contents)?
        } else {
            // Try JSON, fall back to YAML
            serde_json::from_str(&contents)
                .or_else(|_| serde_yaml::from_str(&contents))?
        };

        // Validate and load the configuration
        self.apply_external_config(config)?;

        Ok(true)
    }

    /// Apply external configuration to the registry
    fn apply_external_config(&mut self, config: ExternalWeightsConfig) -> Result<(), Box<dyn std::error::Error>> {
        tracing::info!(
            "Applying external weights config version {} for {:?}",
            config.version,
            config.country
        );

        // Clear existing relationships
        self.relationships.clear();

        // Load each scenario
        for (scenario_name, scenario_config) in config.scenarios {
            let mut cascade_matrix = CascadeMatrix::new(
                &scenario_config.description,
                &scenario_config.source,
            );

            // Load all relationships for this scenario
            for (source_component, targets) in scenario_config.relationships {
                for (target_component, weight) in targets {
                    // set_weight will validate bounds (0.0-1.0)
                    cascade_matrix.set_weight(&source_component, &target_component, weight);
                }
            }

            self.relationships.insert(scenario_name, cascade_matrix);
        }

        // Ensure we have at least a baseline scenario
        if !self.relationships.contains_key("baseline") {
            return Err("External config must include 'baseline' scenario".into());
        }

        Ok(())
    }

    fn initialize_default_components(&mut self) {
        // Agricultural Development - FEWS NET "Production" pathway
        let mut agri_contexts = HashMap::new();
        agri_contexts.insert("LIC".to_string(), 0.30);
        agri_contexts.insert("MIC".to_string(), 0.25);
        agri_contexts.insert("HIC".to_string(), 0.20);
        agri_contexts.insert("rural".to_string(), 0.35);
        agri_contexts.insert("drought".to_string(), 0.40);

        let mut agri = ComponentMetadata::new(
            "agricultural_development".to_string(),
            "economic".to_string(),
            0.25,
        );
        agri.description = "Agricultural productivity and rural development".to_string();
        agri.weight_range = (0.15, 0.35);
        agri.contexts = agri_contexts;
        agri.fewsnet_pathway = Some("production".to_string());
        agri.ipc_dimension = Some("availability".to_string());
        agri.dependencies = vec![
            "climate_natural_resources".to_string(),
            "infrastructure".to_string(),
            "governance_institutions".to_string(),
        ];
        self.components.insert(agri.name.clone(), agri);

        // Infrastructure - Enables "Purchase" pathway (market access)
        let mut infra_contexts = HashMap::new();
        infra_contexts.insert("LIC".to_string(), 0.25);
        infra_contexts.insert("MIC".to_string(), 0.20);
        infra_contexts.insert("HIC".to_string(), 0.15);

        let mut infra = ComponentMetadata::new(
            "infrastructure".to_string(),
            "physical".to_string(),
            0.20,
        );
        infra.description = "Physical and digital infrastructure enabling market access".to_string();
        infra.weight_range = (0.15, 0.30);
        infra.contexts = infra_contexts;
        infra.fewsnet_pathway = Some("purchase".to_string());
        infra.ipc_dimension = Some("access".to_string());
        infra.dependencies = vec![
            "governance_institutions".to_string(),
            "climate_natural_resources".to_string(),
        ];
        self.components.insert(infra.name.clone(), infra);

        // Nutrition Health - IPC Outcome indicator
        let mut nutrition_contexts = HashMap::new();
        nutrition_contexts.insert("pandemic".to_string(), 0.35);
        nutrition_contexts.insert("LIC".to_string(), 0.25);

        let mut nutrition = ComponentMetadata::new(
            "nutrition_health".to_string(),
            "social".to_string(),
            0.20,
        );
        nutrition.description = "Nutrition and health systems - primary IPC outcome".to_string();
        nutrition.weight_range = (0.15, 0.30);
        nutrition.contexts = nutrition_contexts;
        nutrition.fewsnet_pathway = Some("outcome".to_string());
        nutrition.ipc_dimension = Some("utilization".to_string());
        nutrition.dependencies = vec![
            "agricultural_development".to_string(),
            "infrastructure".to_string(),
            "social_protection_equity".to_string(),
        ];
        self.components.insert(nutrition.name.clone(), nutrition);

        // Climate & Natural Resources - Hazard driver
        let mut climate_contexts = HashMap::new();
        climate_contexts.insert("climate_shock".to_string(), 0.35);

        let mut climate = ComponentMetadata::new(
            "climate_natural_resources".to_string(),
            "environmental".to_string(),
            0.20,
        );
        climate.description = "Climate resilience and natural resource management - hazard driver".to_string();
        climate.weight_range = (0.10, 0.35);
        climate.contexts = climate_contexts;
        climate.fewsnet_pathway = Some("hazard".to_string());
        climate.ipc_dimension = Some("stability".to_string());
        climate.dependencies = vec!["governance_institutions".to_string()];
        self.components.insert(climate.name.clone(), climate);

        // Social Protection & Equity - FEWS NET "Transfers" pathway
        let mut social_contexts = HashMap::new();
        social_contexts.insert("financial_crisis".to_string(), 0.25);

        let mut social = ComponentMetadata::new(
            "social_protection_equity".to_string(),
            "social".to_string(),
            0.10,
        );
        social.description = "Social protection and equity - safety net transfers".to_string();
        social.weight_range = (0.05, 0.25);
        social.contexts = social_contexts;
        social.fewsnet_pathway = Some("transfer".to_string());
        social.ipc_dimension = Some("access".to_string());
        social.dependencies = vec!["governance_institutions".to_string()];
        self.components.insert(social.name.clone(), social);

        // Governance & Institutions - Enabling environment
        let mut gov_contexts = HashMap::new();
        gov_contexts.insert("political_instability".to_string(), 0.15);

        let mut gov = ComponentMetadata::new(
            "governance_institutions".to_string(),
            "institutional".to_string(),
            0.05,
        );
        gov.description = "Governance and institutional systems - response capacity".to_string();
        gov.weight_range = (0.02, 0.15);
        gov.contexts = gov_contexts;
        gov.fewsnet_pathway = Some("enabling".to_string());
        gov.ipc_dimension = Some("stability".to_string());
        gov.dependencies = vec![];
        self.components.insert(gov.name.clone(), gov);
    }

    /// Initialize cascade relationships based on IPC/FEWS NET frameworks
    /// 
    /// Matrix interpretation: relationships[source][target] = 
    ///   "If source component fails, how much does it affect target component?"
    ///
    /// Values:
    /// - 0.0-0.3: Weak/indirect relationship
    /// - 0.3-0.6: Moderate relationship
    /// - 0.6-0.8: Strong relationship  
    /// - 0.8-1.0: Critical/direct relationship
    fn initialize_cascade_relationships(&mut self) {
        // Component shorthand for readability
        let agri = "agricultural_development";
        let infra = "infrastructure";
        let nutri = "nutrition_health";
        let climate = "climate_natural_resources";
        let social = "social_protection_equity";
        let gov = "governance_institutions";

        // ============================================================
        // BASELINE - Normal Operations
        // ============================================================
        let mut baseline = CascadeMatrix::new(
            "Normal operations - standard food system interdependencies",
            "IPC Technical Manual 3.1; FEWS NET Guidance on Livelihoods Analysis",
        );

        // Agricultural Development cascade effects
        // Ag failure → Nutrition: Very High (0.85) - direct caloric impact via production pathway
        baseline.set_weight(agri, nutri, 0.85);
        // Ag failure → Infrastructure: Low (0.25) - reduced economic activity
        baseline.set_weight(agri, infra, 0.25);
        // Ag failure → Social Protection: Moderate (0.50) - increased demand for safety nets
        baseline.set_weight(agri, social, 0.50);
        // Ag failure → Climate: Moderate (0.30) - land use changes, resource depletion
        baseline.set_weight(agri, climate, 0.30);
        // Ag failure → Governance: Low (0.20) - political pressure, rural unrest
        baseline.set_weight(agri, gov, 0.20);

        // Infrastructure cascade effects
        // Infra failure → Agriculture: High (0.70) - input delivery, output marketing
        baseline.set_weight(infra, agri, 0.70);
        // Infra failure → Nutrition: Moderate-High (0.55) - market access disruption
        baseline.set_weight(infra, nutri, 0.55);
        // Infra failure → Social Protection: Moderate (0.40) - transfer delivery challenges
        baseline.set_weight(infra, social, 0.40);
        // Infra failure → Climate: Low (0.15) - limited direct effect
        baseline.set_weight(infra, climate, 0.15);
        // Infra failure → Governance: Low (0.15) - service delivery capacity
        baseline.set_weight(infra, gov, 0.15);

        // Nutrition/Health cascade effects (primarily an outcome, limited upstream effects)
        // Nutri failure → Agriculture: Low (0.20) - labor productivity loss
        baseline.set_weight(nutri, agri, 0.20);
        // Nutri failure → Infrastructure: Very Low (0.10)
        baseline.set_weight(nutri, infra, 0.10);
        // Nutri failure → Social Protection: Moderate (0.35) - increased healthcare/transfer demand
        baseline.set_weight(nutri, social, 0.35);
        // Nutri failure → Climate: Very Low (0.10)
        baseline.set_weight(nutri, climate, 0.10);
        // Nutri failure → Governance: Low (0.10) - political pressure
        baseline.set_weight(nutri, gov, 0.10);

        // Climate/Natural Resources cascade effects (primary shock driver)
        // Climate failure → Agriculture: Very High (0.90) - drought, flood, pest
        baseline.set_weight(climate, agri, 0.90);
        // Climate failure → Infrastructure: Moderate-High (0.60) - physical damage
        baseline.set_weight(climate, infra, 0.60);
        // Climate failure → Nutrition: Moderate (0.45) - indirect via production
        baseline.set_weight(climate, nutri, 0.45);
        // Climate failure → Social Protection: Moderate (0.40) - increased demand
        baseline.set_weight(climate, social, 0.40);
        // Climate failure → Governance: Low (0.25) - response pressure
        baseline.set_weight(climate, gov, 0.25);

        // Social Protection cascade effects
        // Social failure → Agriculture: Moderate (0.35) - reduced investment capacity
        baseline.set_weight(social, agri, 0.35);
        // Social failure → Infrastructure: Low (0.20)
        baseline.set_weight(social, infra, 0.20);
        // Social failure → Nutrition: Moderate-High (0.60) - transfer pathway critical
        baseline.set_weight(social, nutri, 0.60);
        // Social failure → Climate: Low (0.15) - reduced adaptive capacity
        baseline.set_weight(social, climate, 0.15);
        // Social failure → Governance: Moderate (0.30) - legitimacy, unrest
        baseline.set_weight(social, gov, 0.30);

        // Governance cascade effects (enabling environment)
        // Gov failure → Agriculture: Moderate (0.50) - policy, extension, markets
        baseline.set_weight(gov, agri, 0.50);
        // Gov failure → Infrastructure: Moderate-High (0.55) - public investment
        baseline.set_weight(gov, infra, 0.55);
        // Gov failure → Nutrition: Moderate (0.40) - health system, standards
        baseline.set_weight(gov, nutri, 0.40);
        // Gov failure → Climate: Moderate (0.35) - environmental management
        baseline.set_weight(gov, climate, 0.35);
        // Gov failure → Social Protection: High (0.65) - program delivery capacity
        baseline.set_weight(gov, social, 0.65);

        self.relationships.insert("baseline".to_string(), baseline);
        self.relationships.insert("normal_operations".to_string(), 
            self.relationships.get("baseline").unwrap().clone());

        // ============================================================
        // CLIMATE SHOCK (Drought/Flood)
        // ============================================================
        let mut climate_shock = CascadeMatrix::new(
            "Climate shock scenario - drought, flood, or extreme weather",
            "FEWS NET Climate Hazard Analysis; IPC Acute Food Insecurity Analysis",
        );

        // Amplified climate-related cascades
        climate_shock.set_weight(agri, nutri, 0.90);  // Production pathway dominates
        climate_shock.set_weight(agri, infra, 0.30);
        climate_shock.set_weight(agri, social, 0.55);
        climate_shock.set_weight(agri, climate, 0.20);
        climate_shock.set_weight(agri, gov, 0.15);

        climate_shock.set_weight(infra, agri, 0.75);
        climate_shock.set_weight(infra, nutri, 0.50);
        climate_shock.set_weight(infra, social, 0.35);
        climate_shock.set_weight(infra, climate, 0.10);
        climate_shock.set_weight(infra, gov, 0.10);

        climate_shock.set_weight(nutri, agri, 0.15);
        climate_shock.set_weight(nutri, infra, 0.10);
        climate_shock.set_weight(nutri, social, 0.40);
        climate_shock.set_weight(nutri, climate, 0.05);
        climate_shock.set_weight(nutri, gov, 0.10);

        // Climate is primary shock origin - amplified effects
        climate_shock.set_weight(climate, agri, 0.95);  // Critical
        climate_shock.set_weight(climate, infra, 0.70);  // Physical damage
        climate_shock.set_weight(climate, nutri, 0.55);
        climate_shock.set_weight(climate, social, 0.45);
        climate_shock.set_weight(climate, gov, 0.30);

        // Safety nets become more critical
        climate_shock.set_weight(social, agri, 0.40);
        climate_shock.set_weight(social, infra, 0.25);
        climate_shock.set_weight(social, nutri, 0.70);  // Critical buffer
        climate_shock.set_weight(social, climate, 0.10);
        climate_shock.set_weight(social, gov, 0.35);

        climate_shock.set_weight(gov, agri, 0.55);
        climate_shock.set_weight(gov, infra, 0.50);
        climate_shock.set_weight(gov, nutri, 0.45);
        climate_shock.set_weight(gov, climate, 0.30);
        climate_shock.set_weight(gov, social, 0.70);  // Response coordination

        self.relationships.insert("climate_shock".to_string(), climate_shock);

        // ============================================================
        // FINANCIAL CRISIS
        // ============================================================
        let mut financial = CascadeMatrix::new(
            "Financial/economic crisis - price shocks, currency collapse, recession",
            "FEWS NET Market Analysis; IPC Contributing Factors",
        );

        // Purchase pathway becomes more critical than production
        financial.set_weight(agri, nutri, 0.75);  // Less direct impact
        financial.set_weight(agri, infra, 0.20);
        financial.set_weight(agri, social, 0.60);
        financial.set_weight(agri, climate, 0.30);
        financial.set_weight(agri, gov, 0.25);

        financial.set_weight(infra, agri, 0.60);
        financial.set_weight(infra, nutri, 0.45);
        financial.set_weight(infra, social, 0.35);
        financial.set_weight(infra, climate, 0.15);
        financial.set_weight(infra, gov, 0.20);

        financial.set_weight(nutri, agri, 0.25);
        financial.set_weight(nutri, infra, 0.15);
        financial.set_weight(nutri, social, 0.45);
        financial.set_weight(nutri, climate, 0.10);
        financial.set_weight(nutri, gov, 0.15);

        financial.set_weight(climate, agri, 0.80);
        financial.set_weight(climate, infra, 0.50);
        financial.set_weight(climate, nutri, 0.35);
        financial.set_weight(climate, social, 0.35);
        financial.set_weight(climate, gov, 0.20);

        // Transfers become critical - cash/food assistance
        financial.set_weight(social, agri, 0.45);
        financial.set_weight(social, infra, 0.30);
        financial.set_weight(social, nutri, 0.75);  // Critical buffer
        financial.set_weight(social, climate, 0.15);
        financial.set_weight(social, gov, 0.40);

        // Fiscal capacity constrains everything
        financial.set_weight(gov, agri, 0.60);
        financial.set_weight(gov, infra, 0.65);
        financial.set_weight(gov, nutri, 0.50);
        financial.set_weight(gov, climate, 0.30);
        financial.set_weight(gov, social, 0.75);  // Fiscal constraint on transfers

        self.relationships.insert("financial_crisis".to_string(), financial);

        // ============================================================
        // PANDEMIC/HEALTH CRISIS
        // ============================================================
        let mut pandemic = CascadeMatrix::new(
            "Pandemic/health crisis - disease outbreak, health system stress",
            "IPC Acute Food Insecurity Analysis; COVID-19 Impact Studies",
        );

        pandemic.set_weight(agri, nutri, 0.80);
        pandemic.set_weight(agri, infra, 0.20);
        pandemic.set_weight(agri, social, 0.45);
        pandemic.set_weight(agri, climate, 0.30);
        pandemic.set_weight(agri, gov, 0.15);

        // Movement restrictions amplify infrastructure effects
        pandemic.set_weight(infra, agri, 0.80);
        pandemic.set_weight(infra, nutri, 0.70);  // Supply chain critical
        pandemic.set_weight(infra, social, 0.50);
        pandemic.set_weight(infra, climate, 0.15);
        pandemic.set_weight(infra, gov, 0.20);

        // Health-nutrition nexus - bidirectional amplification
        pandemic.set_weight(nutri, agri, 0.30);
        pandemic.set_weight(nutri, infra, 0.20);
        pandemic.set_weight(nutri, social, 0.50);
        pandemic.set_weight(nutri, climate, 0.10);
        pandemic.set_weight(nutri, gov, 0.20);  // Health system pressure

        pandemic.set_weight(climate, agri, 0.85);
        pandemic.set_weight(climate, infra, 0.55);
        pandemic.set_weight(climate, nutri, 0.40);
        pandemic.set_weight(climate, social, 0.35);
        pandemic.set_weight(climate, gov, 0.20);

        // Social support critical during lockdowns
        pandemic.set_weight(social, agri, 0.40);
        pandemic.set_weight(social, infra, 0.35);
        pandemic.set_weight(social, nutri, 0.80);  // Critical buffer
        pandemic.set_weight(social, climate, 0.15);
        pandemic.set_weight(social, gov, 0.45);

        // Health system capacity determines outcomes
        pandemic.set_weight(gov, agri, 0.55);
        pandemic.set_weight(gov, infra, 0.70);
        pandemic.set_weight(gov, nutri, 0.65);  // Health response capacity
        pandemic.set_weight(gov, climate, 0.30);
        pandemic.set_weight(gov, social, 0.80);

        self.relationships.insert("pandemic_disruption".to_string(), pandemic);

        // ============================================================
        // CONFLICT/POLITICAL INSTABILITY
        // ============================================================
        let mut conflict = CascadeMatrix::new(
            "Conflict/political instability - armed conflict, civil unrest",
            "IPC Conflict Analysis; FEWS NET Conflict and Food Security",
        );

        conflict.set_weight(agri, nutri, 0.85);
        conflict.set_weight(agri, infra, 0.30);
        conflict.set_weight(agri, social, 0.40);
        conflict.set_weight(agri, climate, 0.25);
        conflict.set_weight(agri, gov, 0.30);

        // Physical destruction of infrastructure
        conflict.set_weight(infra, agri, 0.85);
        conflict.set_weight(infra, nutri, 0.65);
        conflict.set_weight(infra, social, 0.45);
        conflict.set_weight(infra, climate, 0.15);
        conflict.set_weight(infra, gov, 0.25);

        conflict.set_weight(nutri, agri, 0.20);
        conflict.set_weight(nutri, infra, 0.15);
        conflict.set_weight(nutri, social, 0.35);
        conflict.set_weight(nutri, climate, 0.10);
        conflict.set_weight(nutri, gov, 0.15);

        conflict.set_weight(climate, agri, 0.85);
        conflict.set_weight(climate, infra, 0.55);
        conflict.set_weight(climate, nutri, 0.40);
        conflict.set_weight(climate, social, 0.35);
        conflict.set_weight(climate, gov, 0.20);

        conflict.set_weight(social, agri, 0.35);
        conflict.set_weight(social, infra, 0.25);
        conflict.set_weight(social, nutri, 0.55);
        conflict.set_weight(social, climate, 0.15);
        conflict.set_weight(social, gov, 0.40);

        // Governance failure is shock origin - amplified effects everywhere
        conflict.set_weight(gov, agri, 0.70);
        conflict.set_weight(gov, infra, 0.80);  // Physical destruction
        conflict.set_weight(gov, nutri, 0.60);
        conflict.set_weight(gov, climate, 0.40);
        conflict.set_weight(gov, social, 0.85);  // Service delivery collapse

        self.relationships.insert("political_instability".to_string(), conflict);
        self.relationships.insert("conflict".to_string(), 
            self.relationships.get("political_instability").unwrap().clone());
    }

    /// Get context-aware weights
    pub fn get_context_weights(&self, context: &WeightingContext) -> HashMap<String, f64> {
        let mut weights = HashMap::new();

        for (comp_name, comp_meta) in &self.components {
            let base_weight = comp_meta.default_weight;
            let mut adjustment = 1.0;

            // Apply context-specific adjustments
            if let Some(ref income_level) = context.income_level {
                if let Some(&context_weight) = comp_meta.contexts.get(income_level) {
                    adjustment *= 1.0 + context_weight - comp_meta.default_weight;
                }
            }

            if let Some(ref crisis_type) = context.crisis_type {
                if let Some(&context_weight) = comp_meta.contexts.get(crisis_type) {
                    adjustment *= 1.0 + context_weight - comp_meta.default_weight;
                }
            }

            // Apply adjustment with bounds
            let adjusted_weight = (base_weight * adjustment)
                .max(comp_meta.weight_range.0)
                .min(comp_meta.weight_range.1);

            weights.insert(comp_name.clone(), adjusted_weight);
        }

        // Normalize weights
        let total: f64 = weights.values().sum();
        if total > 0.0 {
            weights = weights.iter().map(|(k, v)| (k.clone(), v / total)).collect();
        }

        weights
    }

    /// Get component names (sorted for consistent matrix ordering)
    pub fn get_component_names(&self) -> Vec<String> {
        let mut names: Vec<String> = self.components.keys().cloned().collect();
        names.sort();  // Ensure consistent ordering
        names
    }

    /// Build dependency matrix for a specific scenario
    /// 
    /// # Arguments
    /// * `scenario` - Scenario name (e.g., "baseline", "climate_shock")
    ///               If None, uses "baseline"
    /// 
    /// # Returns
    /// NxN matrix where matrix[i][j] = "if component i fails, effect on component j"
    pub fn get_dependency_matrix(&self, scenario: Option<&str>) -> Vec<Vec<f64>> {
        let names = self.get_component_names();
        let n = names.len();
        let mut matrix = vec![vec![0.0; n]; n];

        // Set diagonal to 1.0 (self-dependency)
        for i in 0..n {
            matrix[i][i] = 1.0;
        }

        let scenario_key = scenario.unwrap_or("baseline");
        
        // Try to get scenario-specific relationships
        if let Some(cascade_matrix) = self.relationships.get(scenario_key) {
            // Use component-specific relationships
            for (i, source_name) in names.iter().enumerate() {
                for (j, target_name) in names.iter().enumerate() {
                    if i != j {
                        if let Some(weight) = cascade_matrix.get_weight(source_name, target_name) {
                            matrix[i][j] = weight;
                        }
                    }
                }
            }
            tracing::debug!(
                "Using scenario-specific relationships for '{}' ({})",
                scenario_key,
                cascade_matrix.description
            );
        } else {
            // Fall back to baseline if scenario not found
            tracing::warn!(
                "Scenario '{}' not found, falling back to baseline relationships",
                scenario_key
            );
            if let Some(baseline) = self.relationships.get("baseline") {
                for (i, source_name) in names.iter().enumerate() {
                    for (j, target_name) in names.iter().enumerate() {
                        if i != j {
                            if let Some(weight) = baseline.get_weight(source_name, target_name) {
                                matrix[i][j] = weight;
                            }
                        }
                    }
                }
            } else {
                // Ultimate fallback to category heuristics (should not happen)
                tracing::error!("No baseline relationships found, using category heuristics");
                for (i, source_name) in names.iter().enumerate() {
                    for (j, target_name) in names.iter().enumerate() {
                        if i != j {
                            if let (Some(source_meta), Some(target_meta)) = (
                                self.components.get(source_name),
                                self.components.get(target_name),
                            ) {
                                let dependency = calculate_category_dependency_fallback(
                                    &source_meta.category,
                                    &target_meta.category,
                                );
                                matrix[i][j] = dependency;
                            }
                        }
                    }
                }
            }
        }

        matrix
    }

}

/// Fallback category-based dependency calculation
/// Only used if scenario-specific relationships are not available
fn calculate_category_dependency_fallback(source_category: &str, target_category: &str) -> f64 {
    match (source_category, target_category) {
        ("economic", "social") => 0.7,
        ("economic", "physical") => 0.8,
        ("economic", "environmental") => 0.6,
        ("economic", "institutional") => 0.4,
        ("social", "economic") => 0.6,
        ("social", "institutional") => 0.5,
        ("physical", "economic") => 0.7,
        ("physical", "social") => 0.5,
        ("environmental", "economic") => 0.8,
        ("environmental", "social") => 0.4,
        ("institutional", "economic") => 0.3,
        ("institutional", "social") => 0.6,
        _ => 0.3, // Default dependency
    }
}

/// Scenario-specific weight configurations
#[derive(Debug, Clone)]
pub struct ScenarioWeights {
    scenarios: HashMap<String, HashMap<String, f64>>,
}

impl Default for ScenarioWeights {
    fn default() -> Self {
        Self::new()
    }
}

impl ScenarioWeights {
    pub fn new() -> Self {
        let mut scenarios = HashMap::new();

        // Normal Operations
        let mut normal = HashMap::new();
        normal.insert("agricultural_development".to_string(), 0.25);
        normal.insert("infrastructure".to_string(), 0.18);
        normal.insert("nutrition_health".to_string(), 0.22);
        normal.insert("climate_natural_resources".to_string(), 0.15);
        normal.insert("social_protection_equity".to_string(), 0.15);
        normal.insert("governance_institutions".to_string(), 0.05);
        scenarios.insert("normal_operations".to_string(), normal);

        // Climate Shock
        let mut climate = HashMap::new();
        climate.insert("agricultural_development".to_string(), 0.20);
        climate.insert("infrastructure".to_string(), 0.25);
        climate.insert("nutrition_health".to_string(), 0.15);
        climate.insert("climate_natural_resources".to_string(), 0.30);
        climate.insert("social_protection_equity".to_string(), 0.08);
        climate.insert("governance_institutions".to_string(), 0.02);
        scenarios.insert("climate_shock".to_string(), climate);

        // Financial Crisis
        let mut financial = HashMap::new();
        financial.insert("agricultural_development".to_string(), 0.30);
        financial.insert("infrastructure".to_string(), 0.15);
        financial.insert("nutrition_health".to_string(), 0.25);
        financial.insert("climate_natural_resources".to_string(), 0.10);
        financial.insert("social_protection_equity".to_string(), 0.18);
        financial.insert("governance_institutions".to_string(), 0.02);
        scenarios.insert("financial_crisis".to_string(), financial);

        // Pandemic
        let mut pandemic = HashMap::new();
        pandemic.insert("agricultural_development".to_string(), 0.28);
        pandemic.insert("infrastructure".to_string(), 0.22);
        pandemic.insert("nutrition_health".to_string(), 0.30);
        pandemic.insert("climate_natural_resources".to_string(), 0.08);
        pandemic.insert("social_protection_equity".to_string(), 0.10);
        pandemic.insert("governance_institutions".to_string(), 0.02);
        scenarios.insert("pandemic_disruption".to_string(), pandemic);

        Self { scenarios }
    }

    pub fn get_weights(&self, scenario: &str) -> Option<&HashMap<String, f64>> {
        self.scenarios.get(scenario)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_component_registry() {
        let registry = ComponentRegistry::new();
        assert_eq!(registry.components.len(), 6);
        assert!(registry.components.contains_key("agricultural_development"));
    }

    #[test]
    fn test_relationships_populated() {
        let registry = ComponentRegistry::new();
        
        // Check that relationships are populated
        assert!(!registry.relationships.is_empty());
        assert!(registry.relationships.contains_key("baseline"));
        assert!(registry.relationships.contains_key("climate_shock"));
        assert!(registry.relationships.contains_key("financial_crisis"));
        assert!(registry.relationships.contains_key("pandemic_disruption"));
        assert!(registry.relationships.contains_key("political_instability"));
    }

    #[test]
    fn test_cascade_matrix_weights() {
        let registry = ComponentRegistry::new();
        
        // Check specific expected relationships
        let baseline = registry.relationships.get("baseline").unwrap();
        
        // Climate → Agriculture should be high (0.90)
        let climate_agri = baseline.get_weight(
            "climate_natural_resources",
            "agricultural_development"
        ).unwrap();
        assert!((climate_agri - 0.90).abs() < 0.01);
        
        // Agriculture → Nutrition should be high (0.85)
        let agri_nutri = baseline.get_weight(
            "agricultural_development",
            "nutrition_health"
        ).unwrap();
        assert!((agri_nutri - 0.85).abs() < 0.01);
    }

    #[test]
    fn test_scenario_specific_matrix() {
        let registry = ComponentRegistry::new();
        
        // Get matrices for different scenarios
        let baseline_matrix = registry.get_dependency_matrix(Some("baseline"));
        let climate_matrix = registry.get_dependency_matrix(Some("climate_shock"));
        
        // Matrices should differ
        assert_ne!(baseline_matrix, climate_matrix);
        
        // Both should be valid (6x6)
        assert_eq!(baseline_matrix.len(), 6);
        assert_eq!(climate_matrix.len(), 6);
    }

    #[test]
    fn test_dependencies_populated() {
        let registry = ComponentRegistry::new();
        
        // Check that component dependencies are populated
        let agri = registry.components.get("agricultural_development").unwrap();
        assert!(!agri.dependencies.is_empty());
        assert!(agri.dependencies.contains(&"climate_natural_resources".to_string()));
    }

    #[test]
    fn test_fewsnet_pathway_mapping() {
        let registry = ComponentRegistry::new();
        
        let agri = registry.components.get("agricultural_development").unwrap();
        assert_eq!(agri.fewsnet_pathway, Some("production".to_string()));
        
        let social = registry.components.get("social_protection_equity").unwrap();
        assert_eq!(social.fewsnet_pathway, Some("transfer".to_string()));
    }

    #[test]
    fn test_context_weights() {
        let registry = ComponentRegistry::new();
        let context = WeightingContext {
            income_level: Some("LIC".to_string()),
            ..Default::default()
        };

        let weights = registry.get_context_weights(&context);
        let sum: f64 = weights.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_scenario_weights() {
        let scenarios = ScenarioWeights::new();
        let weights = scenarios.get_weights("climate_shock").unwrap();
        assert_eq!(weights["climate_natural_resources"], 0.30);
    }
}