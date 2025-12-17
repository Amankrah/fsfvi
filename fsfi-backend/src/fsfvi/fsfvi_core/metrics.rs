/// FSFVI System Metrics
/// =====================
///
/// System-level metrics and aggregation for FSFVI analysis.
/// Calculates comprehensive vulnerability assessments across all components.


use crate::fsfvi::errors::{FsfviError, FsfviResult};
use crate::fsfvi::fsfvi_core::calculations::{clamp, determine_risk_level, round_to_precision, safe_divide};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Component contribution to system vulnerability
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentContribution {
    pub component_name: String,
    pub component_type: String,
    pub vulnerability: f64,
    pub weight: f64,
    pub weighted_vulnerability: f64,
    pub contribution_to_system_vulnerability_percent: f64,
    pub financial_allocation: f64,
    pub allocation_percent: f64,
    pub priority_level: String,
    pub efficiency_ratio: f64,
}

/// System-level FSFVI result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemFsfviResult {
    // Core FSFVI Results
    pub fsfvi_value: f64,
    pub vulnerability_percent: f64,
    pub risk_level: String,

    // Financial Context
    pub total_allocation: f64,
    pub total_allocation_millions: f64,

    // Component Statistics
    pub component_statistics: ComponentStatistics,

    // Priority Analysis
    pub priority_distribution: HashMap<String, usize>,
    pub critical_components: Vec<ComponentInfo>,
    pub high_risk_components: Vec<ComponentInfo>,
    pub components_requiring_immediate_attention: usize,

    // Detailed Component Contributions
    pub component_contributions: Vec<ComponentContribution>,
    pub top_3_vulnerability_contributors: Vec<ComponentContribution>,

    // System Resilience
    pub resilience_indicators: ResilienceIndicators,
    pub efficiency_metrics: EfficiencyMetrics,

    // Government-Specific Insights
    pub government_insights: GovernmentInsights,

    // Action Priorities
    pub action_priorities: ActionPriorities,
}

/// Component statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentStatistics {
    pub total_components: usize,
    pub average_vulnerability: f64,
    pub weighted_average_vulnerability: f64,
    pub max_vulnerability: f64,
    pub min_vulnerability: f64,
    pub vulnerability_standard_deviation: f64,
    pub vulnerability_range: f64,
}

/// Component information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentInfo {
    pub name: String,
    pub vulnerability: f64,
    pub allocation: f64,
    pub weight: f64,
}

/// Resilience indicators
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResilienceIndicators {
    pub vulnerability_concentration: f64,
    pub component_balance: f64,
    pub resource_efficiency: f64,
    pub critical_dependency_risk: f64,
}

/// Efficiency metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EfficiencyMetrics {
    pub allocation_concentration: f64,
    pub vulnerability_concentration: f64,
    pub diversification_index: f64,
}

/// Government insights
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernmentInsights {
    pub financing_efficiency_percent: f64,
    pub intervention_urgency: String,
    pub budget_optimization_potential: String,
    pub system_stability: String,
    pub resource_allocation_quality: String,
}

/// Action priorities for government
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionPriorities {
    pub immediate_actions_0_6_months: Vec<String>,
    pub strategic_actions_6_24_months: Vec<String>,
    pub resource_recommendations: Vec<String>,
    pub overall_urgency: String,
    pub estimated_intervention_cost: String,
}

/// Input for system FSFVI calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentResult {
    pub component_name: Option<String>,
    pub component_type: String,
    pub vulnerability: f64,
    pub weighted_vulnerability: f64,
    pub weight: f64,
    pub financial_allocation: f64,
    pub priority_level: String,
    pub efficiency_index: f64,
}

/// Calculate system-level FSFVI
///
/// Formula: FSFVI = Σᵢ ωᵢ·υᵢ(fᵢ) = Σᵢ ωᵢ·δᵢ·[1/(1+αᵢfᵢ)]
pub fn calculate_system_fsfvi(
    component_results: &[ComponentResult],
) -> FsfviResult<SystemFsfviResult> {
    if component_results.is_empty() {
        return Err(FsfviError::calculation(
            "No component results provided for system FSFVI calculation",
        ));
    }

    // Core FSFVI Calculation: Σᵢ ωᵢ·υᵢ(fᵢ)
    let mut total_fsfvi: f64 = component_results
        .iter()
        .map(|r| r.weighted_vulnerability)
        .sum();

    // Mathematical validation
    if !(0.0..=1.0).contains(&total_fsfvi) {
        tracing::warn!("FSFVI outside expected range [0,1]: {}", total_fsfvi);
        total_fsfvi = clamp(total_fsfvi, 0.0, 1.0);
    }

    // Extract component data
    let vulnerabilities: Vec<f64> = component_results.iter().map(|r| r.vulnerability).collect();
    let weights: Vec<f64> = component_results.iter().map(|r| r.weight).collect();
    let allocations: Vec<f64> = component_results
        .iter()
        .map(|r| r.financial_allocation)
        .collect();

    // System-level metrics
    let total_allocation: f64 = allocations.iter().sum();
    let avg_vulnerability = safe_divide(
        vulnerabilities.iter().sum::<f64>(),
        vulnerabilities.len() as f64,
        0.0
    );
    let max_vulnerability = vulnerabilities
        .iter()
        .max_by(|a, b| a.partial_cmp(b).unwrap())
        .copied()
        .unwrap_or(0.0);
    let min_vulnerability = vulnerabilities
        .iter()
        .min_by(|a, b| a.partial_cmp(b).unwrap())
        .copied()
        .unwrap_or(0.0);

    // Calculate standard deviation
    let mean = avg_vulnerability;
    let variance = safe_divide(
        vulnerabilities
            .iter()
            .map(|v| (v - mean).powi(2))
            .sum::<f64>(),
        vulnerabilities.len() as f64,
        0.0
    );
    let vulnerability_std = variance.sqrt();

    // Weighted average vulnerability
    let total_weight: f64 = weights.iter().sum();
    let weighted_avg_vulnerability = safe_divide(
        vulnerabilities
            .iter()
            .zip(weights.iter())
            .map(|(v, w)| v * w)
            .sum::<f64>(),
        total_weight,
        avg_vulnerability
    );

    // Component priority analysis
    let mut priority_counts: HashMap<String, usize> = HashMap::new();
    let mut critical_components = Vec::new();
    let mut high_risk_components = Vec::new();

    for result in component_results {
        *priority_counts
            .entry(result.priority_level.clone())
            .or_insert(0) += 1;

        let comp_name = result
            .component_name
            .clone()
            .unwrap_or_else(|| result.component_type.clone());

        if result.priority_level == "critical" {
            critical_components.push(ComponentInfo {
                name: comp_name,
                vulnerability: result.vulnerability,
                allocation: result.financial_allocation,
                weight: result.weight,
            });
        } else if result.priority_level == "high" {
            high_risk_components.push(ComponentInfo {
                name: comp_name,
                vulnerability: result.vulnerability,
                allocation: result.financial_allocation,
                weight: result.weight,
            });
        }
    }

    // Risk level assessment
    let risk_level = determine_risk_level(total_fsfvi);

    // Component contributions
    let mut component_contributions = Vec::new();
    for result in component_results {
        let contribution_percent = safe_divide(
            result.weighted_vulnerability * 100.0,
            total_fsfvi,
            0.0
        );

        let allocation_percent = safe_divide(
            result.financial_allocation * 100.0,
            total_allocation,
            0.0
        );

        component_contributions.push(ComponentContribution {
            component_name: result
                .component_name
                .clone()
                .unwrap_or_else(|| result.component_type.clone()),
            component_type: result.component_type.clone(),
            vulnerability: result.vulnerability,
            weight: result.weight,
            weighted_vulnerability: result.weighted_vulnerability,
            contribution_to_system_vulnerability_percent: contribution_percent,
            financial_allocation: result.financial_allocation,
            allocation_percent,
            priority_level: result.priority_level.clone(),
            efficiency_ratio: result.efficiency_index,
        });
    }

    // Sort by contribution
    component_contributions
        .sort_by(|a, b| b.contribution_to_system_vulnerability_percent.partial_cmp(&a.contribution_to_system_vulnerability_percent).unwrap());

    // Top 3 contributors
    let top_3 = component_contributions.iter().take(3).cloned().collect();

    // Calculate efficiency metrics
    let efficiency_metrics = calculate_risk_concentration(&allocations, &vulnerabilities);

    // Resilience indicators
    let weighted_vulnerabilities: Vec<f64> = component_results
        .iter()
        .map(|r| r.weighted_vulnerability)
        .collect();
    let max_weighted = weighted_vulnerabilities
        .iter()
        .max_by(|a, b| a.partial_cmp(b).unwrap())
        .copied()
        .unwrap_or(0.0);

    let vulnerability_concentration = safe_divide(max_weighted, total_fsfvi, 0.0);

    let component_balance = 1.0 - safe_divide(vulnerability_std, max_vulnerability, 0.0);

    let resource_efficiency = safe_divide(
        1.0 - total_fsfvi,
        total_allocation / 1000.0,
        0.0
    );

    let critical_dependency_risk = safe_divide(
        critical_components.len() as f64,
        component_results.len() as f64,
        0.0
    );

    // Government insights
    let financing_efficiency = round_to_precision((1.0 - total_fsfvi) * 100.0, Some(1));
    let intervention_urgency = if !critical_components.is_empty() {
        "immediate"
    } else {
        "strategic"
    }
    .to_string();

    let budget_optimization = if total_fsfvi > 0.15 {
        "high"
    } else if total_fsfvi > 0.05 {
        "moderate"
    } else {
        "low"
    }
    .to_string();

    let system_stability = if vulnerability_std < 0.2 {
        "stable"
    } else {
        "unstable"
    }
    .to_string();

    let allocation_quality = if efficiency_metrics.diversification_index > 0.7 {
        "efficient"
    } else {
        "concentrated"
    }
    .to_string();

    // Action priorities
    let action_priorities = generate_action_priorities(
        total_fsfvi,
        risk_level,
        &critical_components,
        &high_risk_components,
        &component_contributions,
        total_allocation,
    );

    Ok(SystemFsfviResult {
        fsfvi_value: round_to_precision(total_fsfvi, None),
        vulnerability_percent: round_to_precision(total_fsfvi * 100.0, Some(2)),
        risk_level: risk_level.to_string(),
        total_allocation,
        total_allocation_millions: round_to_precision(total_allocation, Some(2)),
        component_statistics: ComponentStatistics {
            total_components: component_results.len(),
            average_vulnerability: round_to_precision(avg_vulnerability, None),
            weighted_average_vulnerability: round_to_precision(weighted_avg_vulnerability, None),
            max_vulnerability: round_to_precision(max_vulnerability, None),
            min_vulnerability: round_to_precision(min_vulnerability, None),
            vulnerability_standard_deviation: round_to_precision(vulnerability_std, None),
            vulnerability_range: round_to_precision(max_vulnerability - min_vulnerability, None),
        },
        priority_distribution: priority_counts,
        components_requiring_immediate_attention: critical_components.len()
            + high_risk_components.len(),
        critical_components,
        high_risk_components,
        component_contributions,
        top_3_vulnerability_contributors: top_3,
        resilience_indicators: ResilienceIndicators {
            vulnerability_concentration,
            component_balance,
            resource_efficiency,
            critical_dependency_risk,
        },
        efficiency_metrics,
        government_insights: GovernmentInsights {
            financing_efficiency_percent: financing_efficiency,
            intervention_urgency,
            budget_optimization_potential: budget_optimization,
            system_stability,
            resource_allocation_quality: allocation_quality,
        },
        action_priorities,
    })
}

/// Calculate risk concentration metrics
fn calculate_risk_concentration(
    allocations: &[f64],
    vulnerabilities: &[f64],
) -> EfficiencyMetrics {
    let total_budget: f64 = allocations.iter().sum();
    let total_vulnerability: f64 = vulnerabilities.iter().sum();

    if total_budget <= 0.0 || total_vulnerability <= 0.0 {
        return EfficiencyMetrics {
            allocation_concentration: 0.0,
            vulnerability_concentration: 0.0,
            diversification_index: 1.0,
        };
    }

    // Calculate Herfindahl index
    let allocation_shares: Vec<f64> = allocations.iter().map(|a| safe_divide(*a, total_budget, 0.0)).collect();
    let herfindahl_index: f64 = allocation_shares.iter().map(|s| s.powi(2)).sum();

    // Vulnerability concentration
    let max_vulnerability = vulnerabilities
        .iter()
        .max_by(|a, b| a.partial_cmp(b).unwrap())
        .copied()
        .unwrap_or(0.0);
    let vulnerability_concentration = safe_divide(max_vulnerability, total_vulnerability, 0.0);

    EfficiencyMetrics {
        allocation_concentration: herfindahl_index,
        vulnerability_concentration,
        diversification_index: 1.0 - herfindahl_index,
    }
}

/// Generate action priorities for government
fn generate_action_priorities(
    fsfvi_score: f64,
    risk_level: &str,
    critical_components: &[ComponentInfo],
    high_risk_components: &[ComponentInfo],
    contributions: &[ComponentContribution],
    total_budget: f64,
) -> ActionPriorities {
    let mut immediate_actions = Vec::new();
    let mut strategic_actions = Vec::new();
    let mut resource_recommendations = Vec::new();

    // Immediate actions (0-6 months) - vary by risk level
    if risk_level == "critical" {
        immediate_actions.push("URGENT: Activate emergency food security response protocol".to_string());
    }

    if !critical_components.is_empty() {
        immediate_actions.push(format!(
            "Emergency intervention for {} critical component(s)",
            critical_components.len()
        ));
    }

    if !high_risk_components.is_empty() {
        immediate_actions.push(format!(
            "Priority assessment of {} high-risk component(s)",
            high_risk_components.len()
        ));
    }

    if fsfvi_score > 0.30 {
        immediate_actions.push("Initiate emergency food system stabilization protocol".to_string());
    }

    // Strategic actions (6-24 months)
    if fsfvi_score > 0.15 {
        strategic_actions.push("Comprehensive budget reallocation strategy needed".to_string());
    }

    if let Some(top_contributor) = contributions.first() {
        if top_contributor.contribution_to_system_vulnerability_percent > 30.0 {
            strategic_actions.push(format!(
                "Focus optimization efforts on {} (contributes {:.1}% of system vulnerability)",
                top_contributor.component_name,
                top_contributor.contribution_to_system_vulnerability_percent
            ));
        }
    }

    strategic_actions.push("Implement performance monitoring system for all components".to_string());
    strategic_actions.push("Develop scenario-based contingency plans".to_string());

    // Resource recommendations
    if total_budget > 0.0 {
        let per_capita_estimate = total_budget / 50_000_000.0; // Assuming ~50M population
        resource_recommendations.push(format!(
            "Current investment: ${:.0} per capita",
            per_capita_estimate
        ));

        if fsfvi_score > 0.20 {
            resource_recommendations
                .push("Consider increasing total food system investment by 20-30%".to_string());
        } else if fsfvi_score > 0.10 {
            resource_recommendations
                .push("Current funding levels adequate, focus on reallocation".to_string());
        } else {
            resource_recommendations
                .push("Funding levels appropriate, maintain current investment".to_string());
        }
    }

    // Use the risk_level directly as it's based on FSFVI score
    // But escalate if there are multiple critical components
    let overall_urgency = if risk_level == "critical" || critical_components.len() > 2 {
        "critical"
    } else if risk_level == "high" || !critical_components.is_empty() {
        "high"
    } else if risk_level == "medium" {
        "medium"
    } else {
        "low"
    }
    .to_string();

    let intervention_cost = if total_budget > 0.0 {
        format!(
            "${:.1}M - ${:.1}M",
            total_budget * 0.1,
            total_budget * 0.3
        )
    } else {
        "TBD".to_string()
    };

    ActionPriorities {
        immediate_actions_0_6_months: immediate_actions,
        strategic_actions_6_24_months: strategic_actions,
        resource_recommendations,
        overall_urgency,
        estimated_intervention_cost: intervention_cost,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_fsfvi_calculation() {
        let components = vec![
            ComponentResult {
                component_name: Some("Agriculture".to_string()),
                component_type: "agricultural_development".to_string(),
                vulnerability: 0.3,
                weighted_vulnerability: 0.15,
                weight: 0.5,
                financial_allocation: 1000.0,
                priority_level: "medium".to_string(),
                efficiency_index: 10.0,
            },
            ComponentResult {
                component_name: Some("Infrastructure".to_string()),
                component_type: "infrastructure".to_string(),
                vulnerability: 0.2,
                weighted_vulnerability: 0.10,
                weight: 0.5,
                financial_allocation: 800.0,
                priority_level: "low".to_string(),
                efficiency_index: 15.0,
            },
        ];

        let result = calculate_system_fsfvi(&components).unwrap();
        assert!((result.fsfvi_value - 0.25).abs() < 1e-6);
        assert_eq!(result.component_statistics.total_components, 2);
    }
}
