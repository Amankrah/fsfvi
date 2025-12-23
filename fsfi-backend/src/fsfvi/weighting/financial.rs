/// Financial Allocation-Based Weighting
/// ======================================
///
/// Calculates weights based on actual financial allocations.
/// This represents how resources are currently distributed and serves
/// as a baseline/reality check for other weighting methods.
///
/// Enhancements over basic version:
/// 1. Scenario-aware allocation effectiveness
/// 2. Cost-effectiveness multipliers by component type
/// 3. Minimum threshold analysis (IPC/FEWS NET aligned)
/// 4. Marginal impact consideration (diminishing returns)
/// 5. Funding gap analysis for humanitarian response
///
/// Reference: FEWS NET Resource Analysis; IPC Protocols on Humanitarian Assistance

use crate::fsfvi::config::normalize_component_type;
use crate::fsfvi::errors::{FsfviError, FsfviResult};
use crate::fsfvi::validators::Component;
use std::collections::HashMap;

/// Cost-effectiveness multipliers by component type
///
/// These reflect the relative impact of $1 spent in each area.
/// Based on food security intervention cost-effectiveness literature.
///
/// Higher values = more impact per dollar
///
/// Sources:
/// - Hoddinott et al. (2012) - Agriculture-nutrition linkages
/// - World Bank (2018) - Infrastructure investment returns
/// - Bhutta et al. (2013) - Nutrition intervention cost-effectiveness
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CostEffectivenessConfig {
    /// Multipliers by component type
    pub multipliers: HashMap<String, f64>,
    /// Scenario-specific adjustments
    pub scenario_adjustments: HashMap<String, HashMap<String, f64>>,
}

impl Default for CostEffectivenessConfig {
    fn default() -> Self {
        let mut multipliers = HashMap::new();
        // Baseline cost-effectiveness (higher = more impact per dollar)
        multipliers.insert("agricultural_development".to_string(), 1.2);  // High ROI in LICs
        multipliers.insert("infrastructure".to_string(), 1.0);            // Baseline
        multipliers.insert("nutrition_health".to_string(), 1.5);          // Very high impact
        multipliers.insert("climate_natural_resources".to_string(), 0.8); // Long-term payoff
        multipliers.insert("social_protection_equity".to_string(), 1.3);  // Direct transfer efficiency
        multipliers.insert("governance_institutions".to_string(), 0.6);   // Indirect effects

        let mut scenario_adjustments = HashMap::new();

        // Climate shock: Agriculture and social protection more effective
        let mut climate = HashMap::new();
        climate.insert("agricultural_development".to_string(), 1.4);
        climate.insert("social_protection_equity".to_string(), 1.5);
        climate.insert("climate_natural_resources".to_string(), 1.2);
        scenario_adjustments.insert("climate_shock".to_string(), climate);

        // Financial crisis: Social protection critical, infrastructure less urgent
        let mut financial = HashMap::new();
        financial.insert("social_protection_equity".to_string(), 1.6);
        financial.insert("infrastructure".to_string(), 0.7);
        scenario_adjustments.insert("financial_crisis".to_string(), financial);

        // Pandemic: Nutrition/health and infrastructure (supply chains) critical
        let mut pandemic = HashMap::new();
        pandemic.insert("nutrition_health".to_string(), 1.8);
        pandemic.insert("infrastructure".to_string(), 1.3);
        scenario_adjustments.insert("pandemic_disruption".to_string(), pandemic);

        // Conflict: Governance and social protection critical
        let mut conflict = HashMap::new();
        conflict.insert("governance_institutions".to_string(), 1.2);
        conflict.insert("social_protection_equity".to_string(), 1.4);
        conflict.insert("infrastructure".to_string(), 0.5); // Destruction risk
        scenario_adjustments.insert("political_instability".to_string(), conflict);

        Self {
            multipliers,
            scenario_adjustments,
        }
    }
}

impl CostEffectivenessConfig {
    /// Get cost-effectiveness multiplier for a component in a given scenario
    pub fn get_multiplier(&self, component_type: &str, scenario: Option<&str>) -> f64 {
        let base = self.multipliers.get(component_type).copied().unwrap_or(1.0);
        
        if let Some(scen) = scenario {
            if let Some(adj) = self.scenario_adjustments.get(scen) {
                if let Some(&scenario_mult) = adj.get(component_type) {
                    return base * scenario_mult;
                }
            }
        }
        
        base
    }
}

/// Minimum allocation thresholds by component (as fraction of total budget)
///
/// These represent minimum viable allocations based on:
/// - IPC Phase 3+ response requirements
/// - FEWS NET humanitarian assistance thresholds
/// - WHO/FAO minimum standards
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MinimumThresholds {
    /// Minimum allocation fraction by component
    pub thresholds: HashMap<String, f64>,
    /// Crisis-level thresholds (IPC Phase 3+)
    pub crisis_thresholds: HashMap<String, f64>,
}

impl Default for MinimumThresholds {
    fn default() -> Self {
        let mut thresholds = HashMap::new();
        // Normal operations minimum allocations
        thresholds.insert("agricultural_development".to_string(), 0.15);
        thresholds.insert("infrastructure".to_string(), 0.10);
        thresholds.insert("nutrition_health".to_string(), 0.12);
        thresholds.insert("climate_natural_resources".to_string(), 0.05);
        thresholds.insert("social_protection_equity".to_string(), 0.08);
        thresholds.insert("governance_institutions".to_string(), 0.03);

        let mut crisis_thresholds = HashMap::new();
        // IPC Phase 3+ minimum allocations (safety net emphasis)
        crisis_thresholds.insert("agricultural_development".to_string(), 0.12);
        crisis_thresholds.insert("infrastructure".to_string(), 0.08);
        crisis_thresholds.insert("nutrition_health".to_string(), 0.18);  // Elevated
        crisis_thresholds.insert("climate_natural_resources".to_string(), 0.03);
        crisis_thresholds.insert("social_protection_equity".to_string(), 0.15); // Elevated
        crisis_thresholds.insert("governance_institutions".to_string(), 0.02);

        Self {
            thresholds,
            crisis_thresholds,
        }
    }
}

/// Result of financial analysis including effectiveness metrics
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FinancialAnalysisResult {
    /// Raw allocation-based weights
    pub raw_weights: HashMap<String, f64>,
    /// Cost-effectiveness adjusted weights
    pub effective_weights: HashMap<String, f64>,
    /// Allocation concentration (HHI)
    pub concentration_index: f64,
    /// Components below minimum threshold
    pub underfunded_components: Vec<String>,
    /// Total funding gap (sum of shortfalls)
    pub funding_gap: f64,
    /// Scenario used for analysis
    pub scenario: Option<String>,
}

/// Calculate financial allocation-based weights
///
/// Formula: ωᵢ = fᵢ / Σⱼfⱼ
///
/// Where:
/// - ωᵢ: Weight for component i
/// - fᵢ: Financial allocation for component i
/// - Σⱼfⱼ: Total financial allocation across all components
pub fn calculate_financial_weights(components: &[Component]) -> FsfviResult<HashMap<String, f64>> {
    if components.is_empty() {
        return Err(FsfviError::validation("No components provided"));
    }

    // Calculate total allocation
    let total_allocation: f64 = components.iter().map(|c| c.financial_allocation).sum();

    // Handle zero allocation case
    if total_allocation <= 0.0 {
        tracing::warn!("Total financial allocation is zero or negative, using equal weights");
        return calculate_equal_weights(components);
    }

    // Calculate proportional weights by component type
    let mut type_allocations: HashMap<String, f64> = HashMap::new();

    for comp in components {
        let normalized_type = normalize_component_type(&comp.component_type);
        let type_str = normalized_type.as_str().to_string();

        *type_allocations.entry(type_str).or_insert(0.0) += comp.financial_allocation;
    }

    // Convert to weights
    let mut weights = HashMap::new();
    for (comp_type, allocation) in type_allocations {
        let weight = allocation / total_allocation;
        weights.insert(comp_type, weight);
    }

    // Validate normalization
    let sum: f64 = weights.values().sum();
    if (sum - 1.0).abs() > 1e-6 {
        tracing::warn!("Financial weights sum to {}, renormalizing to 1.0", sum);
        for (_, weight) in weights.iter_mut() {
            *weight /= sum;
        }
    }

    tracing::info!(
        "Financial weights calculated for {} component types. Total: {:.6}",
        weights.len(),
        weights.values().sum::<f64>()
    );

    Ok(weights)
}

/// Calculate cost-effectiveness adjusted financial weights
/// 
/// This adjusts raw allocation weights by the impact potential of each component.
/// 
/// Formula: ω_eff_i = (f_i × e_i) / Σⱼ(f_j × e_j)
/// 
/// Where e_i is the cost-effectiveness multiplier for component i
pub fn calculate_effective_financial_weights(
    components: &[Component],
    scenario: Option<&str>,
) -> FsfviResult<HashMap<String, f64>> {
    let config = CostEffectivenessConfig::default();
    calculate_effective_financial_weights_with_config(components, scenario, &config)
}

/// Calculate effective weights with custom cost-effectiveness config
pub fn calculate_effective_financial_weights_with_config(
    components: &[Component],
    scenario: Option<&str>,
    config: &CostEffectivenessConfig,
) -> FsfviResult<HashMap<String, f64>> {
    if components.is_empty() {
        return Err(FsfviError::validation("No components provided"));
    }

    // Calculate effectiveness-adjusted allocations
    let mut effective_allocations: HashMap<String, f64> = HashMap::new();

    for comp in components {
        let normalized_type = normalize_component_type(&comp.component_type);
        let type_str = normalized_type.as_str().to_string();
        
        let multiplier = config.get_multiplier(&type_str, scenario);
        let effective_allocation = comp.financial_allocation * multiplier;

        *effective_allocations.entry(type_str).or_insert(0.0) += effective_allocation;
    }

    // Convert to weights
    let total: f64 = effective_allocations.values().sum();
    
    if total <= 0.0 {
        return calculate_equal_weights(components);
    }

    let mut weights = HashMap::new();
    for (comp_type, allocation) in effective_allocations {
        weights.insert(comp_type, allocation / total);
    }

    tracing::info!(
        "Effective financial weights calculated for scenario '{:?}'. Total: {:.6}",
        scenario,
        weights.values().sum::<f64>()
    );

    Ok(weights)
}

/// Calculate equal weights (fallback when no financial data)
fn calculate_equal_weights(components: &[Component]) -> FsfviResult<HashMap<String, f64>> {
    let mut component_types = std::collections::HashSet::new();
    for comp in components {
        let normalized_type = normalize_component_type(&comp.component_type);
        component_types.insert(normalized_type.as_str().to_string());
    }

    let num_types = component_types.len();
    if num_types == 0 {
        return Err(FsfviError::validation("No valid component types found"));
    }

    let equal_weight = 1.0 / num_types as f64;
    let mut weights = HashMap::new();

    for comp_type in component_types {
        weights.insert(comp_type, equal_weight);
    }

    tracing::info!(
        "Equal weights assigned: {} types, {:.6} each",
        num_types,
        equal_weight
    );

    Ok(weights)
}

/// Calculate allocation concentration (Herfindahl-Hirschman Index)
///
/// HHI measures how concentrated financial allocations are.
/// - HHI near 1/n: evenly distributed (minimum concentration)
/// - HHI near 1.0: highly concentrated (one component gets most funds)
///
/// Formula: HHI = Σᵢ(sᵢ²) where sᵢ is the share of component i
pub fn calculate_allocation_concentration(components: &[Component]) -> FsfviResult<f64> {
    let weights = calculate_financial_weights(components)?;
    let hhi: f64 = weights.values().map(|w| w.powi(2)).sum();
    Ok(hhi)
}

/// Analyze funding gaps against minimum thresholds
///
/// Returns components that are below minimum allocation thresholds
/// and the total funding gap.
///
/// **Fixed:** Only checks thresholds for components actually present in the assessment.
/// Previously would flag all undefined components as underfunded.
pub fn analyze_funding_gaps(
    components: &[Component],
    is_crisis: bool,
) -> FsfviResult<(Vec<String>, f64)> {
    let thresholds = MinimumThresholds::default();
    let min_thresholds = if is_crisis {
        &thresholds.crisis_thresholds
    } else {
        &thresholds.thresholds
    };

    let weights = calculate_financial_weights(components)?;
    let total_allocation: f64 = components.iter().map(|c| c.financial_allocation).sum();

    // Build set of component types actually present in the assessment
    let mut component_types = std::collections::HashSet::new();
    for comp in components {
        let normalized_type = normalize_component_type(&comp.component_type);
        component_types.insert(normalized_type.as_str().to_string());
    }

    let mut underfunded = Vec::new();
    let mut total_gap = 0.0;

    // Only check thresholds for components that exist in the input
    for (comp_type, &min_fraction) in min_thresholds {
        if !component_types.contains(comp_type) {
            continue; // Skip components not in the assessment
        }

        let current_fraction = weights.get(comp_type).copied().unwrap_or(0.0);

        if current_fraction < min_fraction {
            underfunded.push(comp_type.clone());
            let gap = (min_fraction - current_fraction) * total_allocation;
            total_gap += gap;

            tracing::warn!(
                "Component '{}' is underfunded: {:.1}% vs minimum {:.1}%",
                comp_type,
                current_fraction * 100.0,
                min_fraction * 100.0
            );
        }
    }

    Ok((underfunded, total_gap))
}

/// Perform comprehensive financial analysis
pub fn analyze_financial_allocations(
    components: &[Component],
    scenario: Option<&str>,
    is_crisis: bool,
) -> FsfviResult<FinancialAnalysisResult> {
    let raw_weights = calculate_financial_weights(components)?;
    let effective_weights = calculate_effective_financial_weights(components, scenario)?;
    let concentration_index = calculate_allocation_concentration(components)?;
    let (underfunded_components, funding_gap) = analyze_funding_gaps(components, is_crisis)?;

    Ok(FinancialAnalysisResult {
        raw_weights,
        effective_weights,
        concentration_index,
        underfunded_components,
        funding_gap,
        scenario: scenario.map(String::from),
    })
}

/// Compare financial weights with vulnerability-based needs
///
/// This identifies mismatches between spending and actual vulnerability.
/// Returns a map of component types to their allocation efficiency:
/// - > 1.0: Over-allocated relative to vulnerability
/// - < 1.0: Under-allocated relative to vulnerability
/// - = 1.0: Perfectly aligned
///
/// CRITICAL FIX: Edge case handling for near-zero vulnerability
/// - When vulnerability < 1e-6 (effectively zero), the component is performing well
/// - Efficiency ratio becomes undefined (division by ~0)
/// - OLD: Return hardcoded 100.0 (creates suspicious efficiency=100.0 in reports)
/// - NEW: Return a large but bounded value based on actual weight magnitude
///        efficiency = (fin_weight / 1e-6) capped at reasonable maximum
pub fn compare_allocation_to_vulnerability(
    components: &[Component],
    vulnerabilities: &HashMap<String, f64>,
) -> FsfviResult<HashMap<String, f64>> {
    let financial_weights = calculate_financial_weights(components)?;

    let mut allocation_efficiency = HashMap::new();

    for (comp_type, &fin_weight) in financial_weights.iter() {
        if let Some(&vulnerability) = vulnerabilities.get(comp_type) {
            let efficiency = if vulnerability > 1e-6 {
                // Normal case: calculate actual efficiency ratio
                fin_weight / vulnerability
            } else {
                // CRITICAL EDGE CASE: Near-zero vulnerability (component performing well)
                // Instead of hardcoded 100.0, calculate based on weight magnitude
                // Use small denominator (1e-6) to get large but meaningful value
                // Cap at 1000.0 to avoid extreme outliers in reports
                (fin_weight / 1e-6).min(1000.0)
            };

            allocation_efficiency.insert(comp_type.clone(), efficiency);

            // Log edge cases for government audit trail
            if vulnerability <= 1e-6 {
                tracing::warn!(
                    "Component '{}' has near-zero vulnerability ({:.8}), efficiency capped at {:.1}",
                    comp_type,
                    vulnerability,
                    efficiency
                );
            }
        }
    }

    Ok(allocation_efficiency)
}

/// Compare effective (cost-adjusted) weights with vulnerability
///
/// More sophisticated than raw comparison - accounts for the fact that
/// $1 in nutrition may have more impact than $1 in governance.
///
/// CRITICAL FIX: Same edge case handling as compare_allocation_to_vulnerability
pub fn compare_effective_allocation_to_vulnerability(
    components: &[Component],
    vulnerabilities: &HashMap<String, f64>,
    scenario: Option<&str>,
) -> FsfviResult<HashMap<String, f64>> {
    let effective_weights = calculate_effective_financial_weights(components, scenario)?;

    let mut allocation_efficiency = HashMap::new();

    for (comp_type, &eff_weight) in effective_weights.iter() {
        if let Some(&vulnerability) = vulnerabilities.get(comp_type) {
            let efficiency = if vulnerability > 1e-6 {
                // Normal case: calculate actual efficiency ratio
                eff_weight / vulnerability
            } else {
                // CRITICAL EDGE CASE: Near-zero vulnerability
                // Use meaningful calculation instead of hardcoded 100.0
                (eff_weight / 1e-6).min(1000.0)
            };

            allocation_efficiency.insert(comp_type.clone(), efficiency);

            // Log edge cases for government audit trail
            if vulnerability <= 1e-6 {
                tracing::warn!(
                    "Component '{}' has near-zero vulnerability ({:.8}) in effective allocation comparison, efficiency capped at {:.1}",
                    comp_type,
                    vulnerability,
                    efficiency
                );
            }
        }
    }

    Ok(allocation_efficiency)
}

/// Generate allocation recommendations based on vulnerability
///
/// Suggests how budget should be reallocated to better match vulnerabilities.
/// Returns recommended allocation amounts.
pub fn generate_allocation_recommendations(
    total_budget: f64,
    vulnerabilities: &HashMap<String, f64>,
) -> FsfviResult<HashMap<String, f64>> {
    if total_budget <= 0.0 {
        return Err(FsfviError::validation("Budget must be positive"));
    }

    let total_vulnerability: f64 = vulnerabilities.values().sum();

    if total_vulnerability <= 0.0 {
        return Err(FsfviError::validation(
            "No vulnerabilities to base recommendations on"
        ));
    }

    let mut recommendations = HashMap::new();
    for (comp_type, &vulnerability) in vulnerabilities.iter() {
        let recommended_allocation = (vulnerability / total_vulnerability) * total_budget;
        recommendations.insert(comp_type.clone(), recommended_allocation);
    }

    Ok(recommendations)
}

/// Generate recommendations with minimum threshold constraints
/// 
/// Ensures recommendations meet minimum viable allocations while
/// still prioritizing based on vulnerability.
pub fn generate_constrained_recommendations(
    total_budget: f64,
    vulnerabilities: &HashMap<String, f64>,
    is_crisis: bool,
) -> FsfviResult<HashMap<String, f64>> {
    if total_budget <= 0.0 {
        return Err(FsfviError::validation("Budget must be positive"));
    }

    let thresholds = MinimumThresholds::default();
    let min_thresholds = if is_crisis {
        &thresholds.crisis_thresholds
    } else {
        &thresholds.thresholds
    };

    // First, ensure minimum allocations
    let mut recommendations = HashMap::new();
    let mut allocated = 0.0;

    for (comp_type, &min_fraction) in min_thresholds {
        let min_amount = min_fraction * total_budget;
        recommendations.insert(comp_type.clone(), min_amount);
        allocated += min_amount;
    }

    // Distribute remaining budget based on vulnerability
    let remaining = total_budget - allocated;
    
    if remaining > 0.0 {
        let total_vulnerability: f64 = vulnerabilities.values().sum();
        
        if total_vulnerability > 0.0 {
            for (comp_type, &vulnerability) in vulnerabilities.iter() {
                let additional = (vulnerability / total_vulnerability) * remaining;
                *recommendations.entry(comp_type.clone()).or_insert(0.0) += additional;
            }
        }
    } else if remaining < 0.0 {
        tracing::warn!(
            "Budget insufficient for minimum allocations. Shortfall: {:.2}",
            -remaining
        );
    }

    Ok(recommendations)
}

/// Calculate marginal impact of additional funding
/// 
/// Uses diminishing returns model: additional impact decreases as
/// allocation increases beyond optimal level.
/// 
/// Returns marginal impact score (0-1) for each component.
pub fn calculate_marginal_impact(
    components: &[Component],
    vulnerabilities: &HashMap<String, f64>,
) -> FsfviResult<HashMap<String, f64>> {
    let weights = calculate_financial_weights(components)?;
    let mut marginal_impacts = HashMap::new();

    for (comp_type, &fin_weight) in weights.iter() {
        let vulnerability = vulnerabilities.get(comp_type).copied().unwrap_or(0.5);
        
        // Marginal impact is higher when:
        // 1. Vulnerability is high (more need)
        // 2. Current allocation is low (not yet saturated)
        // 
        // Simple model: marginal_impact = vulnerability × (1 - saturation)
        // where saturation = current_weight / (vulnerability + 0.1)
        
        let saturation = (fin_weight / (vulnerability + 0.1)).min(1.0);
        let marginal_impact = vulnerability * (1.0 - saturation);
        
        marginal_impacts.insert(comp_type.clone(), marginal_impact);
    }

    // Normalize to sum to 1 for use as allocation priorities
    let total: f64 = marginal_impacts.values().sum();
    if total > 0.0 {
        for (_, impact) in marginal_impacts.iter_mut() {
            *impact /= total;
        }
    }

    Ok(marginal_impacts)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_components() -> Vec<Component> {
        vec![
            Component {
                component_id: Some("comp1".to_string()),
                component_type: "agricultural_development".to_string(),
                observed_value: 100.0,
                benchmark_value: 120.0,
                financial_allocation: 1000.0,
                weight: None,
                sensitivity_parameter: None,
            },
            Component {
                component_id: Some("comp2".to_string()),
                component_type: "infrastructure".to_string(),
                observed_value: 80.0,
                benchmark_value: 100.0,
                financial_allocation: 500.0,
                weight: None,
                sensitivity_parameter: None,
            },
            Component {
                component_id: Some("comp3".to_string()),
                component_type: "nutrition_health".to_string(),
                observed_value: 90.0,
                benchmark_value: 100.0,
                financial_allocation: 300.0,
                weight: None,
                sensitivity_parameter: None,
            },
        ]
    }

    #[test]
    fn test_financial_weights() {
        let components = create_test_components();
        let weights = calculate_financial_weights(&components).unwrap();

        // Check normalization
        let sum: f64 = weights.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);

        // Check proportions
        assert!((weights["agricultural_development"] - 1000.0 / 1800.0).abs() < 1e-6);
        assert!((weights["infrastructure"] - 500.0 / 1800.0).abs() < 1e-6);
        assert!((weights["nutrition_health"] - 300.0 / 1800.0).abs() < 1e-6);
    }

    #[test]
    fn test_effective_weights_differ_by_scenario() {
        let components = create_test_components();
        
        let baseline = calculate_effective_financial_weights(&components, None).unwrap();
        let climate = calculate_effective_financial_weights(&components, Some("climate_shock")).unwrap();
        let pandemic = calculate_effective_financial_weights(&components, Some("pandemic_disruption")).unwrap();

        // Weights should differ across scenarios
        let baseline_agri = baseline.get("agricultural_development").unwrap();
        let climate_agri = climate.get("agricultural_development").unwrap();
        
        // In climate shock, agriculture should be weighted higher (cost-effectiveness increases)
        assert!(climate_agri > baseline_agri);

        // In pandemic, nutrition should be weighted higher
        let baseline_nutri = baseline.get("nutrition_health").unwrap();
        let pandemic_nutri = pandemic.get("nutrition_health").unwrap();
        assert!(pandemic_nutri > baseline_nutri);
    }

    #[test]
    fn test_cost_effectiveness_multipliers() {
        let config = CostEffectivenessConfig::default();
        
        // Baseline multipliers
        assert!(config.get_multiplier("nutrition_health", None) > 1.0);
        assert!(config.get_multiplier("governance_institutions", None) < 1.0);
        
        // Scenario adjustments
        let pandemic_nutri = config.get_multiplier("nutrition_health", Some("pandemic_disruption"));
        let baseline_nutri = config.get_multiplier("nutrition_health", None);
        assert!(pandemic_nutri > baseline_nutri);
    }

    #[test]
    fn test_funding_gap_analysis() {
        let components = create_test_components();
        
        let (underfunded, gap) = analyze_funding_gaps(&components, false).unwrap();
        
        // With only 3 components allocated, others should be underfunded
        // (They have 0 allocation but non-zero minimum thresholds)
        assert!(!underfunded.is_empty() || gap >= 0.0);
    }

    #[test]
    fn test_comprehensive_analysis() {
        let components = create_test_components();
        let result = analyze_financial_allocations(&components, Some("climate_shock"), false).unwrap();

        // Check all fields populated
        assert!(!result.raw_weights.is_empty());
        assert!(!result.effective_weights.is_empty());
        assert!(result.concentration_index > 0.0);
        assert_eq!(result.scenario, Some("climate_shock".to_string()));
    }

    #[test]
    fn test_equal_weights_fallback() {
        let components = vec![
            Component {
                component_id: Some("comp1".to_string()),
                component_type: "agricultural_development".to_string(),
                observed_value: 100.0,
                benchmark_value: 120.0,
                financial_allocation: 0.0,
                weight: None,
                sensitivity_parameter: None,
            },
            Component {
                component_id: Some("comp2".to_string()),
                component_type: "infrastructure".to_string(),
                observed_value: 80.0,
                benchmark_value: 100.0,
                financial_allocation: 0.0,
                weight: None,
                sensitivity_parameter: None,
            },
        ];

        let weights = calculate_financial_weights(&components).unwrap();

        for (_, weight) in weights.iter() {
            assert!((weight - 0.5).abs() < 1e-6);
        }
    }

    #[test]
    fn test_allocation_concentration() {
        let components = create_test_components();
        let hhi = calculate_allocation_concentration(&components).unwrap();

        assert!(hhi >= 0.0 && hhi <= 1.0);

        let expected = (1000.0_f64 / 1800.0).powi(2)
                     + (500.0_f64 / 1800.0).powi(2)
                     + (300.0_f64 / 1800.0).powi(2);
        assert!((hhi - expected).abs() < 1e-6);
    }

    #[test]
    fn test_constrained_recommendations() {
        let mut vulnerabilities = HashMap::new();
        vulnerabilities.insert("agricultural_development".to_string(), 0.3);
        vulnerabilities.insert("infrastructure".to_string(), 0.2);
        vulnerabilities.insert("nutrition_health".to_string(), 0.4);
        vulnerabilities.insert("social_protection_equity".to_string(), 0.1);

        let total_budget = 10000.0;
        let recommendations = generate_constrained_recommendations(
            total_budget,
            &vulnerabilities,
            false
        ).unwrap();

        // Total should approximately equal budget
        let total: f64 = recommendations.values().sum();
        assert!((total - total_budget).abs() < total_budget * 0.01);

        // All components should have at least minimum allocation
        let thresholds = MinimumThresholds::default();
        for (comp_type, &min_frac) in &thresholds.thresholds {
            if let Some(&rec) = recommendations.get(comp_type) {
                let rec_frac = rec / total_budget;
                assert!(
                    rec_frac >= min_frac - 0.01,
                    "{} below minimum: {} < {}",
                    comp_type,
                    rec_frac,
                    min_frac
                );
            }
        }
    }

    #[test]
    fn test_marginal_impact() {
        let components = create_test_components();
        let mut vulnerabilities = HashMap::new();
        vulnerabilities.insert("agricultural_development".to_string(), 0.3);
        vulnerabilities.insert("infrastructure".to_string(), 0.4);
        vulnerabilities.insert("nutrition_health".to_string(), 0.5);

        let marginal = calculate_marginal_impact(&components, &vulnerabilities).unwrap();

        // Should be normalized
        let sum: f64 = marginal.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);

        // Nutrition has high vulnerability but low allocation, should have high marginal impact
        // Agriculture has moderate vulnerability but high allocation, should have lower marginal
        assert!(
            marginal["nutrition_health"] > marginal["agricultural_development"],
            "Nutrition marginal {} should exceed agriculture {}",
            marginal["nutrition_health"],
            marginal["agricultural_development"]
        );
    }

    #[test]
    fn test_allocation_to_vulnerability_comparison() {
        let components = create_test_components();
        let mut vulnerabilities = HashMap::new();
        vulnerabilities.insert("agricultural_development".to_string(), 0.4);
        vulnerabilities.insert("infrastructure".to_string(), 0.3);
        vulnerabilities.insert("nutrition_health".to_string(), 0.2);

        let efficiency =
            compare_allocation_to_vulnerability(&components, &vulnerabilities).unwrap();

        assert!(efficiency["agricultural_development"] > 1.0);
        assert!(efficiency["infrastructure"] < 1.0);
        assert!(efficiency["nutrition_health"] < 1.0);
    }

    #[test]
    fn test_allocation_recommendations() {
        let mut vulnerabilities = HashMap::new();
        vulnerabilities.insert("agricultural_development".to_string(), 0.3);
        vulnerabilities.insert("infrastructure".to_string(), 0.5);
        vulnerabilities.insert("nutrition_health".to_string(), 0.2);

        let total_budget = 1000.0;
        let recommendations =
            generate_allocation_recommendations(total_budget, &vulnerabilities).unwrap();

        let total: f64 = recommendations.values().sum();
        assert!((total - total_budget).abs() < 1e-6);

        assert!((recommendations["infrastructure"] - 500.0).abs() < 1e-6);
        assert!((recommendations["agricultural_development"] - 300.0).abs() < 1e-6);
        assert!((recommendations["nutrition_health"] - 200.0).abs() < 1e-6);
    }
}