//! Weighting Data Models
//!
//! Component registry, cascade matrices, and scenario-specific dependency data.

use crate::config::get_weighting_config;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Component order (fixed for matrix consistency)
pub const COMPONENT_ORDER: [&str; 6] = [
    "agricultural_development",
    "infrastructure",
    "nutrition_health",
    "climate_natural_resources",
    "social_protection_equity",
    "governance_institutions",
];

/// Simple component data for weighting calculations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Component {
    pub name: String,
    pub component_type: String,
    pub financial_allocation: f64,
    pub observed_value: f64,
    pub benchmark_value: f64,
}

/// Normalize weights to sum to 1.0
pub fn normalize_weights(weights: &HashMap<String, f64>) -> HashMap<String, f64> {
    let sum: f64 = weights.values().sum();
    if sum <= 0.0 {
        let equal = 1.0 / weights.len() as f64;
        weights.keys().map(|k| (k.clone(), equal)).collect()
    } else {
        weights.iter().map(|(k, v)| (k.clone(), v / sum)).collect()
    }
}

/// Validate weights sum to 1.0 within tolerance
pub fn validate_weights(weights: &HashMap<String, f64>) -> Result<(), String> {
    let config = get_weighting_config();
    let sum: f64 = weights.values().sum();
    if (sum - 1.0).abs() > config.ahp_consistency_threshold {
        return Err(format!("Weights sum to {} (expected 1.0)", sum));
    }
    for (name, &w) in weights {
        if w < 0.0 || w > 1.0 {
            return Err(format!("Weight for {} is {} (must be in [0,1])", name, w));
        }
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Dependency Matrices by Scenario
// ---------------------------------------------------------------------------

/// Get the cascade dependency matrix for a given scenario.
///
/// Matrix[i][j] = "If component i fails, how much does it affect component j?"
/// Values in [0, 1]. Order follows COMPONENT_ORDER.
pub fn get_dependency_matrix(scenario: &str) -> Vec<Vec<f64>> {
    match scenario {
        "climate_shock" => climate_shock_matrix(),
        "financial_crisis" => financial_crisis_matrix(),
        "pandemic_disruption" => pandemic_matrix(),
        "political_instability" => conflict_matrix(),
        _ => baseline_matrix(),
    }
}

/// Baseline / Normal Operations dependency matrix
/// Source: IPC Technical Manual 3.1, FEWS NET framework
fn baseline_matrix() -> Vec<Vec<f64>> {
    vec![
        // agri  infra  nutr  clim  soc   gov
        vec![0.0, 0.25, 0.85, 0.30, 0.50, 0.20], // agricultural_development
        vec![0.60, 0.0, 0.40, 0.15, 0.30, 0.25], // infrastructure
        vec![0.20, 0.10, 0.0, 0.10, 0.45, 0.15], // nutrition_health
        vec![0.70, 0.35, 0.30, 0.0, 0.20, 0.15], // climate_natural_resources
        vec![0.25, 0.10, 0.55, 0.05, 0.0, 0.30], // social_protection_equity
        vec![0.40, 0.50, 0.30, 0.35, 0.45, 0.0], // governance_institutions
    ]
}

/// Climate shock scenario — amplified climate effects
fn climate_shock_matrix() -> Vec<Vec<f64>> {
    vec![
        vec![0.0, 0.30, 0.90, 0.45, 0.60, 0.25],
        vec![0.55, 0.0, 0.40, 0.20, 0.30, 0.25],
        vec![0.20, 0.10, 0.0, 0.15, 0.50, 0.15],
        vec![0.95, 0.70, 0.55, 0.0, 0.35, 0.20], // climate → agri critical
        vec![0.30, 0.10, 0.70, 0.05, 0.0, 0.30],
        vec![0.40, 0.50, 0.35, 0.40, 0.50, 0.0],
    ]
}

/// Financial crisis scenario
fn financial_crisis_matrix() -> Vec<Vec<f64>> {
    vec![
        vec![0.0, 0.20, 0.75, 0.25, 0.55, 0.25],
        vec![0.50, 0.0, 0.35, 0.10, 0.25, 0.20],
        vec![0.25, 0.10, 0.0, 0.10, 0.50, 0.15],
        vec![0.60, 0.30, 0.25, 0.0, 0.20, 0.15],
        vec![0.30, 0.15, 0.75, 0.05, 0.0, 0.40], // social_prot → nutr critical
        vec![0.45, 0.55, 0.35, 0.35, 0.75, 0.0], // gov → social_prot critical
    ]
}

/// Pandemic disruption scenario
fn pandemic_matrix() -> Vec<Vec<f64>> {
    vec![
        vec![0.0, 0.25, 0.80, 0.25, 0.50, 0.20],
        vec![0.55, 0.0, 0.70, 0.15, 0.35, 0.25], // infra → nutr elevated
        vec![0.20, 0.10, 0.0, 0.10, 0.55, 0.20],
        vec![0.65, 0.30, 0.30, 0.0, 0.20, 0.15],
        vec![0.30, 0.10, 0.80, 0.05, 0.0, 0.35], // social_prot → nutr critical
        vec![0.45, 0.55, 0.65, 0.35, 0.55, 0.0], // gov → nutr elevated
    ]
}

/// Political instability / conflict scenario
fn conflict_matrix() -> Vec<Vec<f64>> {
    vec![
        vec![0.0, 0.30, 0.80, 0.30, 0.55, 0.25],
        vec![0.65, 0.0, 0.45, 0.15, 0.35, 0.30],
        vec![0.20, 0.10, 0.0, 0.10, 0.50, 0.15],
        vec![0.65, 0.35, 0.30, 0.0, 0.25, 0.15],
        vec![0.25, 0.10, 0.60, 0.05, 0.0, 0.35],
        vec![0.55, 0.80, 0.45, 0.40, 0.85, 0.0], // gov failures cascade heavily
    ]
}

// ---------------------------------------------------------------------------
// AHP Expert Comparison Matrices by Scenario
// ---------------------------------------------------------------------------

/// Get AHP pairwise comparison matrix for a scenario.
/// Matrix[i][j] = importance of component i relative to component j.
/// Values follow Saaty scale (1-9). Matrix must be reciprocal: a[i][j] = 1/a[j][i].
pub fn get_expert_matrix(scenario: &str) -> Vec<Vec<f64>> {
    match scenario {
        "climate_shock" => expert_climate_shock(),
        "financial_crisis" => expert_financial_crisis(),
        "pandemic_disruption" => expert_pandemic(),
        "political_instability" => expert_conflict(),
        _ => expert_baseline(),
    }
}

/// Baseline AHP matrix (IPC Technical Manual 3.1)
fn expert_baseline() -> Vec<Vec<f64>> {
    vec![
        //  agri   infra  nutr   clim   soc    gov
        vec![1.0, 2.0, 1.0 / 2.0, 3.0, 2.0, 3.0],    // agri
        vec![1.0 / 2.0, 1.0, 1.0 / 3.0, 2.0, 1.0, 2.0], // infra
        vec![2.0, 3.0, 1.0, 4.0, 3.0, 4.0],            // nutr (highest)
        vec![1.0 / 3.0, 1.0 / 2.0, 1.0 / 4.0, 1.0, 1.0 / 2.0, 1.0], // clim
        vec![1.0 / 2.0, 1.0, 1.0 / 3.0, 2.0, 1.0, 2.0], // soc
        vec![1.0 / 3.0, 1.0 / 2.0, 1.0 / 4.0, 1.0, 1.0 / 2.0, 1.0], // gov
    ]
}

/// Climate shock AHP matrix — climate and agriculture elevated
fn expert_climate_shock() -> Vec<Vec<f64>> {
    vec![
        vec![1.0, 2.0, 1.0, 1.0 / 2.0, 2.0, 3.0],
        vec![1.0 / 2.0, 1.0, 1.0 / 2.0, 1.0 / 3.0, 1.0, 2.0],
        vec![1.0, 2.0, 1.0, 1.0 / 2.0, 2.0, 3.0],
        vec![2.0, 3.0, 2.0, 1.0, 3.0, 4.0], // climate elevated
        vec![1.0 / 2.0, 1.0, 1.0 / 2.0, 1.0 / 3.0, 1.0, 2.0],
        vec![1.0 / 3.0, 1.0 / 2.0, 1.0 / 3.0, 1.0 / 4.0, 1.0 / 2.0, 1.0],
    ]
}

/// Financial crisis AHP matrix — social protection and governance elevated
fn expert_financial_crisis() -> Vec<Vec<f64>> {
    vec![
        vec![1.0, 2.0, 1.0 / 2.0, 3.0, 1.0 / 2.0, 2.0],
        vec![1.0 / 2.0, 1.0, 1.0 / 3.0, 2.0, 1.0 / 2.0, 1.0],
        vec![2.0, 3.0, 1.0, 4.0, 1.0, 3.0],
        vec![1.0 / 3.0, 1.0 / 2.0, 1.0 / 4.0, 1.0, 1.0 / 3.0, 1.0 / 2.0],
        vec![2.0, 2.0, 1.0, 3.0, 1.0, 2.0], // social protection elevated
        vec![1.0 / 2.0, 1.0, 1.0 / 3.0, 2.0, 1.0 / 2.0, 1.0],
    ]
}

/// Pandemic AHP matrix — nutrition/health dominant
fn expert_pandemic() -> Vec<Vec<f64>> {
    vec![
        vec![1.0, 2.0, 1.0 / 3.0, 3.0, 1.0, 2.0],
        vec![1.0 / 2.0, 1.0, 1.0 / 4.0, 2.0, 1.0 / 2.0, 1.0],
        vec![3.0, 4.0, 1.0, 5.0, 3.0, 4.0], // nutrition dominant
        vec![1.0 / 3.0, 1.0 / 2.0, 1.0 / 5.0, 1.0, 1.0 / 3.0, 1.0 / 2.0],
        vec![1.0, 2.0, 1.0 / 3.0, 3.0, 1.0, 2.0],
        vec![1.0 / 2.0, 1.0, 1.0 / 4.0, 2.0, 1.0 / 2.0, 1.0],
    ]
}

/// Political instability AHP matrix — governance as origin of shock
fn expert_conflict() -> Vec<Vec<f64>> {
    vec![
        vec![1.0, 1.0, 1.0 / 2.0, 2.0, 1.0, 1.0 / 2.0],
        vec![1.0, 1.0, 1.0 / 2.0, 2.0, 1.0, 1.0 / 2.0],
        vec![2.0, 2.0, 1.0, 3.0, 2.0, 1.0],
        vec![1.0 / 2.0, 1.0 / 2.0, 1.0 / 3.0, 1.0, 1.0 / 2.0, 1.0 / 3.0],
        vec![1.0, 1.0, 1.0 / 2.0, 2.0, 1.0, 1.0 / 2.0],
        vec![2.0, 2.0, 1.0, 3.0, 2.0, 1.0], // governance elevated
    ]
}

// ---------------------------------------------------------------------------
// Cost-Effectiveness Multipliers
// ---------------------------------------------------------------------------

/// Get cost-effectiveness multipliers for financial weighting
pub fn get_cost_effectiveness_multipliers(scenario: &str) -> HashMap<String, f64> {
    let mut base = HashMap::new();
    base.insert("agricultural_development".to_string(), 1.2);
    base.insert("infrastructure".to_string(), 1.0);
    base.insert("nutrition_health".to_string(), 1.5);
    base.insert("climate_natural_resources".to_string(), 0.8);
    base.insert("social_protection_equity".to_string(), 1.3);
    base.insert("governance_institutions".to_string(), 0.6);

    // Apply scenario adjustments
    let adjustments = get_scenario_adjustments(scenario);
    for (comp, adj) in adjustments {
        if let Some(val) = base.get_mut(&comp) {
            *val *= adj;
        }
    }
    base
}

fn get_scenario_adjustments(scenario: &str) -> HashMap<String, f64> {
    let mut adj = HashMap::new();
    match scenario {
        "climate_shock" => {
            adj.insert("agricultural_development".to_string(), 1.4);
            adj.insert("social_protection_equity".to_string(), 1.5);
            adj.insert("climate_natural_resources".to_string(), 1.2);
        }
        "financial_crisis" => {
            adj.insert("social_protection_equity".to_string(), 1.6);
            adj.insert("infrastructure".to_string(), 0.7);
        }
        "pandemic_disruption" => {
            adj.insert("nutrition_health".to_string(), 1.8);
            adj.insert("infrastructure".to_string(), 1.3);
        }
        "political_instability" => {
            adj.insert("governance_institutions".to_string(), 1.2);
            adj.insert("social_protection_equity".to_string(), 1.4);
            adj.insert("infrastructure".to_string(), 0.5);
        }
        _ => {}
    }
    adj
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_baseline_matrix_is_square() {
        let m = baseline_matrix();
        assert_eq!(m.len(), 6);
        for row in &m {
            assert_eq!(row.len(), 6);
        }
    }

    #[test]
    fn test_baseline_matrix_diagonal_is_zero() {
        let m = baseline_matrix();
        for i in 0..6 {
            assert_eq!(m[i][i], 0.0);
        }
    }

    #[test]
    fn test_expert_baseline_reciprocal() {
        let m = expert_baseline();
        for i in 0..6 {
            for j in 0..6 {
                let product = m[i][j] * m[j][i];
                assert!(
                    (product - 1.0).abs() < 1e-6,
                    "Reciprocal check failed at [{},{}]: {} * {} = {}",
                    i, j, m[i][j], m[j][i], product
                );
            }
        }
    }

    #[test]
    fn test_normalize_weights() {
        let mut w = HashMap::new();
        w.insert("a".to_string(), 2.0);
        w.insert("b".to_string(), 3.0);
        let norm = normalize_weights(&w);
        let sum: f64 = norm.values().sum();
        assert!((sum - 1.0).abs() < 1e-10);
    }
}
