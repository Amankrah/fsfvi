/// Scenario Simulation Service
/// ============================
///
/// Enables government strategic planning through what-if analysis.
/// Simulates different scenarios (crises, budget changes, interventions)
/// to inform decision-making.

use crate::fsfvi::config::{Scenario, WeightingMethod};
use crate::fsfvi::errors::FsfviResult;
use crate::fsfvi::service::vulnerability_assessment::{
    AssessmentRequest, VulnerabilityAssessmentService,
};
use crate::fsfvi::validators::Component;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Scenario simulation service
pub struct ScenarioSimulationService {
    assessment_service: VulnerabilityAssessmentService,
}

impl Default for ScenarioSimulationService {
    fn default() -> Self {
        Self::new()
    }
}

impl ScenarioSimulationService {
    pub fn new() -> Self {
        Self {
            assessment_service: VulnerabilityAssessmentService::new(),
        }
    }

    /// Compare multiple scenarios for strategic planning
    ///
    /// Runs FSFVI calculations across different scenarios (e.g., normal, climate shock,
    /// financial crisis) to understand system resilience and vulnerability ranges.
    pub fn compare_scenarios(
        &self,
        components: Vec<Component>,
        scenarios: Vec<Scenario>,
    ) -> FsfviResult<ScenarioComparisonReport> {
        tracing::info!("Comparing {} scenarios", scenarios.len());

        let mut scenario_results = HashMap::new();
        let mut fsfvi_scores = HashMap::new();

        for scenario in &scenarios {
            let request = AssessmentRequest {
                components: components.clone(),
                country_name: None,
                weighting_method: Some(WeightingMethod::Hybrid),
                scenario: Some(*scenario),
                context: None,
                currency: None,
                use_performance_adjusted_weights: false, // Consistent methodology across scenarios
            };

            let assessment = self.assessment_service.assess_food_system(request)?;
            fsfvi_scores.insert(scenario.as_str().to_string(), assessment.system_result.fsfvi_value);
            scenario_results.insert(scenario.as_str().to_string(), assessment);
        }

        // Find best and worst scenarios
        let (best_scenario, best_fsfvi) = fsfvi_scores
            .iter()
            .min_by(|a, b| a.1.partial_cmp(b.1).unwrap())
            .map(|(k, v)| (k.clone(), *v))
            .unwrap_or(("unknown".to_string(), 0.0));

        let (worst_scenario, worst_fsfvi) = fsfvi_scores
            .iter()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
            .map(|(k, v)| (k.clone(), *v))
            .unwrap_or(("unknown".to_string(), 0.0));

        let vulnerability_range = worst_fsfvi - best_fsfvi;

        // Generate strategic insights
        let strategic_insights = self.generate_strategic_insights(
            &scenario_results,
            &best_scenario,
            &worst_scenario,
            vulnerability_range,
        );

        Ok(ScenarioComparisonReport {
            scenarios: scenario_results,
            best_case: ScenarioBenchmark {
                scenario: best_scenario.clone(),
                fsfvi: best_fsfvi,
                risk_level: FSFVI_CONFIG.determine_risk_level(best_fsfvi).to_string(),
            },
            worst_case: ScenarioBenchmark {
                scenario: worst_scenario.clone(),
                fsfvi: worst_fsfvi,
                risk_level: FSFVI_CONFIG.determine_risk_level(worst_fsfvi).to_string(),
            },
            vulnerability_range,
            resilience_score: self.calculate_resilience_score(vulnerability_range),
            strategic_insights,
        })
    }

    /// Simulate specific crisis impact
    ///
    /// Models how a specific crisis (e.g., drought, pandemic) would affect
    /// the food system, allowing governments to prepare contingency plans.
    pub fn simulate_crisis(
        &self,
        components: Vec<Component>,
        crisis_type: CrisisType,
        intensity: CrisisIntensity,
    ) -> FsfviResult<CrisisSimulationReport> {
        tracing::info!("Simulating {:?} crisis at {:?} intensity", crisis_type, intensity);

        // Baseline assessment
        let baseline = self.assessment_service.assess_food_system(AssessmentRequest {
            components: components.clone(),
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard baseline measurement
        })?;

        // Apply crisis impacts to components
        let mut crisis_components = components.clone();
        self.apply_crisis_impacts(&mut crisis_components, crisis_type, intensity)?;

        // Crisis assessment with appropriate scenario
        let crisis_scenario = self.map_crisis_to_scenario(crisis_type);
        let crisis_assessment = self.assessment_service.assess_food_system(AssessmentRequest {
            components: crisis_components,
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(crisis_scenario),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Consistent methodology for comparison
        })?;

        // Calculate impact metrics
        let fsfvi_increase = crisis_assessment.system_result.fsfvi_value
            - baseline.system_result.fsfvi_value;
        let fsfvi_increase_percent = (fsfvi_increase / baseline.system_result.fsfvi_value) * 100.0;

        // Identify most affected components
        let most_affected = self.identify_most_affected_components(
            &baseline.component_insights,
            &crisis_assessment.component_insights,
        );

        // Generate crisis response plan
        let response_plan = self.generate_crisis_response_plan(
            &crisis_assessment,
            crisis_type,
            &most_affected,
        );

        Ok(CrisisSimulationReport {
            crisis_type,
            intensity,
            baseline_fsfvi: baseline.system_result.fsfvi_value,
            crisis_fsfvi: crisis_assessment.system_result.fsfvi_value,
            fsfvi_increase,
            fsfvi_increase_percent,
            baseline_risk_level: baseline.system_result.risk_level.clone(),
            crisis_risk_level: crisis_assessment.system_result.risk_level.clone(),
            most_affected_components: most_affected,
            crisis_response_plan: response_plan,
        })
    }

    /// Simulate budget changes
    ///
    /// Models how increasing/decreasing budget for specific components
    /// affects overall system vulnerability.
    pub fn simulate_budget_changes(
        &self,
        components: Vec<Component>,
        budget_changes: Vec<BudgetChange>,
    ) -> FsfviResult<BudgetSimulationReport> {
        tracing::info!("Simulating {} budget changes", budget_changes.len());

        // Baseline assessment
        let baseline = self.assessment_service.assess_food_system(AssessmentRequest {
            components: components.clone(),
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard baseline measurement
        })?;

        // Apply budget changes
        let mut modified_components = components.clone();
        self.apply_budget_changes(&mut modified_components, &budget_changes)?;

        // Simulate with new budgets
        let simulated = self.assessment_service.assess_food_system(AssessmentRequest {
            components: modified_components,
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Consistent methodology for comparison
        })?;

        let fsfvi_change = simulated.system_result.fsfvi_value - baseline.system_result.fsfvi_value;
        let improvement = fsfvi_change < 0.0;

        Ok(BudgetSimulationReport {
            baseline_fsfvi: baseline.system_result.fsfvi_value,
            simulated_fsfvi: simulated.system_result.fsfvi_value,
            fsfvi_change,
            improvement,
            improvement_percent: if improvement {
                (fsfvi_change.abs() / baseline.system_result.fsfvi_value) * 100.0
            } else {
                0.0
            },
            total_budget_change: self.calculate_total_budget_change(&budget_changes),
            roi_estimate: self.calculate_roi_estimate(fsfvi_change, &budget_changes),
            budget_changes_applied: budget_changes,
        })
    }

    /// Simulate intervention impact
    ///
    /// Models the impact of specific policy interventions on component performance.
    pub fn simulate_intervention(
        &self,
        components: Vec<Component>,
        interventions: Vec<Intervention>,
    ) -> FsfviResult<InterventionSimulationReport> {
        tracing::info!("Simulating {} interventions", interventions.len());

        // Baseline
        let baseline = self.assessment_service.assess_food_system(AssessmentRequest {
            components: components.clone(),
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard baseline measurement
        })?;

        // Apply interventions
        let mut improved_components = components.clone();
        self.apply_interventions(&mut improved_components, &interventions)?;

        // Simulate with interventions
        let improved = self.assessment_service.assess_food_system(AssessmentRequest {
            components: improved_components,
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Consistent methodology for comparison
        })?;

        let fsfvi_reduction = baseline.system_result.fsfvi_value - improved.system_result.fsfvi_value;

        Ok(InterventionSimulationReport {
            baseline_fsfvi: baseline.system_result.fsfvi_value,
            improved_fsfvi: improved.system_result.fsfvi_value,
            fsfvi_reduction,
            improvement_percent: (fsfvi_reduction / baseline.system_result.fsfvi_value) * 100.0,
            interventions_applied: interventions,
            cost_effectiveness: self.calculate_intervention_cost_effectiveness(
                fsfvi_reduction,
                &improved.component_insights,
            ),
        })
    }

    // Helper methods

    fn apply_crisis_impacts(
        &self,
        components: &mut [Component],
        crisis_type: CrisisType,
        intensity: CrisisIntensity,
    ) -> FsfviResult<()> {
        let impact_multiplier = match intensity {
            CrisisIntensity::Mild => 0.9,
            CrisisIntensity::Moderate => 0.8,
            CrisisIntensity::Severe => 0.6,
            CrisisIntensity::Extreme => 0.4,
        };

        for comp in components.iter_mut() {
            let impact = self.get_crisis_component_impact(&comp.component_type, crisis_type);
            comp.observed_value *= impact_multiplier * impact;
        }

        Ok(())
    }

    fn get_crisis_component_impact(&self, component_type: &str, crisis: CrisisType) -> f64 {
        match (component_type, crisis) {
            ("agricultural_development", CrisisType::Drought) => 0.6,
            ("agricultural_development", CrisisType::Flood) => 0.7,
            ("infrastructure", CrisisType::Flood) => 0.6,
            ("nutrition_health", CrisisType::Pandemic) => 0.5,
            ("climate_natural_resources", CrisisType::Drought) => 0.4,
            _ => 0.9,
        }
    }

    fn map_crisis_to_scenario(&self, crisis: CrisisType) -> Scenario {
        match crisis {
            CrisisType::Drought | CrisisType::Flood | CrisisType::Cyclone => Scenario::ClimateShock,
            CrisisType::Pandemic => Scenario::PandemicDisruption,
            CrisisType::EconomicShock => Scenario::FinancialCrisis,
            CrisisType::Conflict => Scenario::PoliticalInstability,
        }
    }

    fn apply_budget_changes(
        &self,
        components: &mut [Component],
        changes: &[BudgetChange],
    ) -> FsfviResult<()> {
        for change in changes {
            if let Some(comp) = components
                .iter_mut()
                .find(|c| c.component_type == change.component_type)
            {
                match change.change_type {
                    ChangeType::Absolute => {
                        comp.financial_allocation += change.amount;
                    }
                    ChangeType::Percentage => {
                        comp.financial_allocation *= 1.0 + (change.amount / 100.0);
                    }
                }
            }
        }
        Ok(())
    }

    fn apply_interventions(
        &self,
        components: &mut [Component],
        interventions: &[Intervention],
    ) -> FsfviResult<()> {
        for intervention in interventions {
            if let Some(comp) = components
                .iter_mut()
                .find(|c| c.component_type == intervention.component_type)
            {
                // Interventions improve observed values
                comp.observed_value *= 1.0 + (intervention.expected_improvement_percent / 100.0);
            }
        }
        Ok(())
    }

    fn calculate_total_budget_change(&self, changes: &[BudgetChange]) -> f64 {
        changes.iter().map(|c| c.amount).sum()
    }

    fn calculate_roi_estimate(&self, fsfvi_change: f64, changes: &[BudgetChange]) -> f64 {
        let total_investment: f64 = changes.iter().map(|c| c.amount).sum();
        if total_investment > 0.0 {
            (fsfvi_change.abs() / total_investment) * 1_000_000.0 // Per million invested
        } else {
            0.0
        }
    }

    fn calculate_resilience_score(&self, vulnerability_range: f64) -> f64 {
        // Lower range = higher resilience
        (1.0 - vulnerability_range).max(0.0).min(1.0)
    }

    fn identify_most_affected_components(
        &self,
        baseline: &[crate::fsfvi::service::vulnerability_assessment::ComponentInsight],
        crisis: &[crate::fsfvi::service::vulnerability_assessment::ComponentInsight],
    ) -> Vec<String> {
        let mut affected = Vec::new();

        for (b, c) in baseline.iter().zip(crisis.iter()) {
            let impact = c.vulnerability - b.vulnerability;
            if impact > 0.1 {
                affected.push(b.component_name.clone());
            }
        }

        affected
    }

    fn generate_strategic_insights(
        &self,
        _scenarios: &HashMap<String, crate::fsfvi::service::vulnerability_assessment::AssessmentReport>,
        best: &str,
        worst: &str,
        range: f64,
    ) -> Vec<String> {
        vec![
            format!("Best case scenario: {} (lowest vulnerability)", best),
            format!("Worst case scenario: {} (highest vulnerability)", worst),
            format!("Vulnerability range: {:.1} percentage points", range * 100.0),
            if range < 0.1 {
                "System shows good resilience across scenarios".to_string()
            } else {
                "System vulnerable to scenario variations - strengthen weak components".to_string()
            },
        ]
    }

    fn generate_crisis_response_plan(
        &self,
        _assessment: &crate::fsfvi::service::vulnerability_assessment::AssessmentReport,
        crisis: CrisisType,
        affected: &[String],
    ) -> Vec<String> {
        let mut plan = vec![
            format!("Activate emergency response protocols for {:?}", crisis),
            format!("Prioritize support for: {}", affected.join(", ")),
        ];

        match crisis {
            CrisisType::Drought => {
                plan.push("Deploy water conservation measures".to_string());
                plan.push("Activate drought-resistant seed distribution".to_string());
            }
            CrisisType::Pandemic => {
                plan.push("Ensure food supply chain continuity".to_string());
                plan.push("Expand social protection coverage".to_string());
            }
            _ => {}
        }

        plan
    }

    fn calculate_intervention_cost_effectiveness(
        &self,
        fsfvi_reduction: f64,
        _components: &[crate::fsfvi::service::vulnerability_assessment::ComponentInsight],
    ) -> f64 {
        // Simplified cost-effectiveness (improvement per unit cost)
        fsfvi_reduction * 100.0
    }
}

use crate::fsfvi::config::FSFVI_CONFIG;

// Types

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum CrisisType {
    Drought,
    Flood,
    Cyclone,
    Pandemic,
    EconomicShock,
    Conflict,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum CrisisIntensity {
    Mild,
    Moderate,
    Severe,
    Extreme,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetChange {
    pub component_type: String,
    pub amount: f64,
    pub change_type: ChangeType,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ChangeType {
    Absolute,
    Percentage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Intervention {
    pub component_type: String,
    pub description: String,
    pub expected_improvement_percent: f64,
    pub estimated_cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioComparisonReport {
    pub scenarios: HashMap<String, crate::fsfvi::service::vulnerability_assessment::AssessmentReport>,
    pub best_case: ScenarioBenchmark,
    pub worst_case: ScenarioBenchmark,
    pub vulnerability_range: f64,
    pub resilience_score: f64,
    pub strategic_insights: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioBenchmark {
    pub scenario: String,
    pub fsfvi: f64,
    pub risk_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrisisSimulationReport {
    pub crisis_type: CrisisType,
    pub intensity: CrisisIntensity,
    pub baseline_fsfvi: f64,
    pub crisis_fsfvi: f64,
    pub fsfvi_increase: f64,
    pub fsfvi_increase_percent: f64,
    pub baseline_risk_level: String,
    pub crisis_risk_level: String,
    pub most_affected_components: Vec<String>,
    pub crisis_response_plan: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetSimulationReport {
    pub baseline_fsfvi: f64,
    pub simulated_fsfvi: f64,
    pub fsfvi_change: f64,
    pub improvement: bool,
    pub improvement_percent: f64,
    pub budget_changes_applied: Vec<BudgetChange>,
    pub total_budget_change: f64,
    pub roi_estimate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterventionSimulationReport {
    pub baseline_fsfvi: f64,
    pub improved_fsfvi: f64,
    pub fsfvi_reduction: f64,
    pub improvement_percent: f64,
    pub interventions_applied: Vec<Intervention>,
    pub cost_effectiveness: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_components() -> Vec<Component> {
        vec![
            Component {
                component_id: Some("test_1".to_string()),
                component_type: "agricultural_development".to_string(),
                observed_value: 100.0,
                benchmark_value: 120.0,
                financial_allocation: 1000.0,
                weight: None,
                sensitivity_parameter: Some(0.001),
            },
        ]
    }

    #[test]
    fn test_compare_scenarios() {
        let service = ScenarioSimulationService::new();
        let scenarios = vec![Scenario::NormalOperations, Scenario::ClimateShock];

        let report = service
            .compare_scenarios(create_test_components(), scenarios)
            .unwrap();

        assert_eq!(report.scenarios.len(), 2);
        assert!(report.vulnerability_range >= 0.0);
    }
}
