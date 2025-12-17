/// Decision Support Service
/// =======================
///
/// Synthesizes FSFVI analyses into actionable policy recommendations for governments.
/// The ultimate goal: help governments make evidence-based decisions that improve food security.
///
/// CRITICAL RESPONSIBILITY:
/// This module's recommendations directly influence policies affecting millions of lives.
/// Every recommendation must be:
/// - Evidence-based from FSFVI analysis
/// - Actionable with clear next steps
/// - Prioritized by impact and urgency
/// - Transparent about uncertainty and limitations
///
/// DECISION SUPPORT TYPES:
/// 1. Strategic Planning: Long-term policy direction
/// 2. Budget Allocation: Where to invest resources
/// 3. Crisis Response: Urgent interventions during shocks
/// 4. Monitoring & Evaluation: Track progress over time

use crate::fsfvi::config::{Scenario, WeightingMethod};
use crate::fsfvi::errors::FsfviResult;
use crate::fsfvi::service::budget_optimization::{
    BudgetOptimizationService, OptimizationConstraints, OptimizationObjective,
};
use crate::fsfvi::service::sensitivity_analysis::SensitivityAnalysisService;
use crate::fsfvi::service::vulnerability_assessment::{
    AssessmentRequest, VulnerabilityAssessmentService,
};
use crate::fsfvi::validators::Component;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Decision support service
pub struct DecisionSupportService {
    assessment_service: VulnerabilityAssessmentService,
    optimization_service: BudgetOptimizationService,
    sensitivity_service: SensitivityAnalysisService,
}

impl Default for DecisionSupportService {
    fn default() -> Self {
        Self::new()
    }
}

impl DecisionSupportService {
    pub fn new() -> Self {
        Self {
            assessment_service: VulnerabilityAssessmentService::new(),
            optimization_service: BudgetOptimizationService::new(),
            sensitivity_service: SensitivityAnalysisService::new(),
        }
    }

    /// Generate comprehensive policy recommendations
    ///
    /// Combines vulnerability assessment, optimization, and sensitivity analysis
    /// to provide evidence-based policy guidance.
    pub fn generate_policy_recommendations(
        &self,
        request: PolicyRecommendationRequest,
    ) -> FsfviResult<PolicyRecommendationReport> {
        tracing::info!(
            "Generating policy recommendations for {} components",
            request.components.len()
        );

        // Step 1: Assess current vulnerability
        let assessment = self.assessment_service.assess_food_system(AssessmentRequest {
            components: request.components.clone(),
            country_name: request.country_name.clone(),
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: request.currency.clone(),
            use_performance_adjusted_weights: false, // Standard assessment for policy recommendations
        })?;

        // Step 2: Identify priority interventions
        let priority_interventions = self.identify_priority_interventions(&assessment)?;

        // Step 3: Generate budget recommendations (if budget optimization requested)
        let budget_recommendations = if request.include_budget_optimization {
            Some(self.generate_budget_recommendations(&request.components)?)
        } else {
            None
        };

        // Step 4: Assess robustness of recommendations
        let robustness_assessment = if request.include_sensitivity_analysis {
            Some(self.assess_recommendation_robustness(&request.components)?)
        } else {
            None
        };

        // Step 5: Generate timeline and implementation plan
        let implementation_plan = self.generate_implementation_plan(
            &priority_interventions,
            request.planning_horizon_months,
        );

        // Step 6: Identify quick wins
        let quick_wins = self.identify_quick_wins(&assessment, &priority_interventions);

        // Step 7: Risk assessment
        let risk_assessment = self.generate_risk_assessment(&assessment, &request.components);

        // Step 8: Create executive summary for policymakers
        let executive_summary = self.generate_executive_summary(
            &assessment,
            &priority_interventions,
            budget_recommendations.as_ref(),
        );

        Ok(PolicyRecommendationReport {
            executive_summary,
            current_vulnerability: VulnerabilitySnapshot {
                fsfvi: assessment.system_result.fsfvi_value,
                risk_level: assessment.system_result.risk_level.clone(),
                critical_components: assessment
                    .system_result
                    .critical_components
                    .iter()
                    .map(|c| c.name.clone())
                    .collect(),
            },
            priority_interventions,
            budget_recommendations,
            implementation_plan,
            quick_wins,
            risk_assessment,
            robustness_assessment,
            monitoring_indicators: self.generate_monitoring_indicators(&assessment),
        })
    }

    /// Generate crisis response recommendations
    ///
    /// Urgent interventions for drought, pandemic, conflict, etc.
    pub fn generate_crisis_response(
        &self,
        components: Vec<Component>,
        crisis_type: Scenario,
        available_emergency_budget: f64,
    ) -> FsfviResult<CrisisResponseReport> {
        tracing::info!("Generating crisis response for {:?}", crisis_type);

        // Assess vulnerability under crisis scenario
        let crisis_assessment = self.assessment_service.assess_food_system(AssessmentRequest {
            components: components.clone(),
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(crisis_type),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard assessment for crisis response
        })?;

        // Compare with normal operations
        let baseline_assessment = self.assessment_service.assess_food_system(AssessmentRequest {
            components: components.clone(),
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard assessment for decision support
        })?;

        let fsfvi_increase = crisis_assessment.system_result.fsfvi_value
            - baseline_assessment.system_result.fsfvi_value;

        // Identify components most affected by crisis
        let most_affected_components = self.identify_crisis_vulnerable_components(
            &baseline_assessment,
            &crisis_assessment,
        );

        // Generate emergency interventions
        let emergency_interventions = self.generate_emergency_interventions(
            &most_affected_components,
            available_emergency_budget,
            &crisis_type,
        );

        // Timeline for emergency response
        let response_timeline = self.generate_crisis_timeline(&emergency_interventions);

        Ok(CrisisResponseReport {
            crisis_type: format!("{:?}", crisis_type),
            baseline_fsfvi: baseline_assessment.system_result.fsfvi_value,
            crisis_fsfvi: crisis_assessment.system_result.fsfvi_value,
            fsfvi_increase,
            severity_level: if fsfvi_increase > 0.2 {
                "critical"
            } else if fsfvi_increase > 0.1 {
                "severe"
            } else {
                "moderate"
            }
            .to_string(),
            most_affected_components,
            emergency_interventions,
            response_timeline,
            estimated_people_affected: self.estimate_affected_population(fsfvi_increase),
        })
    }

    /// Progress tracking and monitoring dashboard
    ///
    /// Compare current state against baseline to track improvement.
    pub fn track_progress(
        &self,
        baseline_components: Vec<Component>,
        current_components: Vec<Component>,
        time_period_months: usize,
    ) -> FsfviResult<ProgressTrackingReport> {
        tracing::info!("Tracking progress over {} months", time_period_months);

        let baseline_assessment = self.assessment_service.assess_food_system(AssessmentRequest {
            components: baseline_components,
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard assessment for progress tracking
        })?;

        let current_assessment = self.assessment_service.assess_food_system(AssessmentRequest {
            components: current_components.clone(),
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard assessment for progress tracking
        })?;

        let fsfvi_change = current_assessment.system_result.fsfvi_value
            - baseline_assessment.system_result.fsfvi_value;

        let component_changes = self.calculate_component_changes(
            &baseline_assessment.component_insights,
            &current_assessment.component_insights,
        );

        let performance_status = if fsfvi_change < -0.05 {
            "excellent"
        } else if fsfvi_change < 0.0 {
            "good"
        } else if fsfvi_change < 0.05 {
            "stable"
        } else {
            "declining"
        }
        .to_string();

        let achievements = self.identify_achievements(&component_changes);
        let areas_needing_attention = self.identify_areas_needing_attention(&component_changes);
        let recommended_next_steps = self.generate_next_steps(&current_assessment);

        Ok(ProgressTrackingReport {
            time_period_months,
            baseline_fsfvi: baseline_assessment.system_result.fsfvi_value,
            current_fsfvi: current_assessment.system_result.fsfvi_value,
            fsfvi_change,
            performance_status,
            component_changes,
            achievements,
            areas_needing_attention,
            recommended_next_steps,
        })
    }

    /// Stakeholder communication brief
    ///
    /// Translates technical FSFVI analysis into clear, non-technical language
    /// for ministers, parliament, public, etc.
    pub fn generate_stakeholder_brief(
        &self,
        components: Vec<Component>,
        audience: StakeholderAudience,
    ) -> FsfviResult<StakeholderBrief> {
        tracing::info!("Generating stakeholder brief for {:?}", audience);

        let assessment = self.assessment_service.assess_food_system(AssessmentRequest {
            components,
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard assessment for stakeholder briefs
        })?;

        let key_messages = self.generate_key_messages(&assessment, &audience);
        let talking_points = self.generate_talking_points(&assessment, &audience);
        let infographic_data = self.generate_infographic_data(&assessment);

        Ok(StakeholderBrief {
            audience: format!("{:?}", audience),
            key_messages,
            talking_points,
            infographic_data,
            call_to_action: self.generate_call_to_action(&assessment, &audience),
        })
    }

    // Helper methods

    fn identify_priority_interventions(
        &self,
        assessment: &crate::fsfvi::service::vulnerability_assessment::AssessmentReport,
    ) -> FsfviResult<Vec<PriorityIntervention>> {
        let mut interventions = Vec::new();

        for insight in &assessment.component_insights {
            if insight.vulnerability > 0.3 || insight.is_critical {
                let urgency = if insight.vulnerability > 0.5 {
                    "immediate"
                } else if insight.vulnerability > 0.4 {
                    "urgent"
                } else {
                    "high"
                }
                .to_string();

                interventions.push(PriorityIntervention {
                    component_type: insight.component_type.clone(),
                    current_vulnerability: insight.vulnerability,
                    urgency: urgency.clone(),
                    recommended_actions: insight.recommendations.clone(),
                    estimated_impact: self.estimate_intervention_impact(insight.vulnerability),
                    estimated_cost_range: self.estimate_intervention_cost(
                        &insight.component_type,
                        insight.vulnerability,
                    ),
                });
            }
        }

        // Sort by urgency then vulnerability
        interventions.sort_by(|a, b| {
            let urgency_order = |u: &str| match u {
                "immediate" => 0,
                "urgent" => 1,
                "high" => 2,
                _ => 3,
            };

            urgency_order(&a.urgency)
                .cmp(&urgency_order(&b.urgency))
                .then(
                    b.current_vulnerability
                        .partial_cmp(&a.current_vulnerability)
                        .unwrap(),
                )
        });

        Ok(interventions)
    }

    fn generate_budget_recommendations(
        &self,
        components: &[Component],
    ) -> FsfviResult<BudgetRecommendations> {
        let efficiency_report = self
            .optimization_service
            .analyze_allocation_efficiency(components.to_vec())?;

        let optimization_result = self.optimization_service.optimize_allocation(
            components.to_vec(),
            OptimizationObjective::MinimizeFsfvi,
            OptimizationConstraints::default(),
        )?;

        Ok(BudgetRecommendations {
            current_allocation_efficiency: efficiency_report.allocation_concentration,
            optimal_allocations: optimization_result.optimal_allocations,
            expected_fsfvi_improvement: optimization_result.improvement,
            reallocation_priorities: efficiency_report
                .reallocation_analysis
                .iter()
                .filter(|a| a.status == "under_allocated")
                .map(|a| (a.component_type.clone(), a.recommended_allocation))
                .collect(),
        })
    }

    fn assess_recommendation_robustness(
        &self,
        components: &[Component],
    ) -> FsfviResult<RobustnessAssessment> {
        let scenario_robustness = self
            .sensitivity_service
            .analyze_scenario_robustness(components.to_vec())?;

        Ok(RobustnessAssessment {
            is_robust: scenario_robustness.is_robust,
            confidence_level: if scenario_robustness.coefficient_of_variation < 0.10 {
                "high"
            } else if scenario_robustness.coefficient_of_variation < 0.20 {
                "medium"
            } else {
                "low"
            }
            .to_string(),
            key_uncertainties: if scenario_robustness.coefficient_of_variation > 0.15 {
                vec!["Results vary across scenarios. Consider adaptive policies.".to_string()]
            } else {
                vec!["Results are stable across scenarios.".to_string()]
            },
        })
    }

    fn generate_implementation_plan(
        &self,
        interventions: &[PriorityIntervention],
        planning_horizon_months: usize,
    ) -> ImplementationPlan {
        let immediate = interventions
            .iter()
            .filter(|i| i.urgency == "immediate")
            .map(|i| i.component_type.clone())
            .collect();

        let short_term = interventions
            .iter()
            .filter(|i| i.urgency == "urgent")
            .map(|i| i.component_type.clone())
            .collect();

        let medium_term = interventions
            .iter()
            .filter(|i| i.urgency == "high")
            .map(|i| i.component_type.clone())
            .collect();

        ImplementationPlan {
            planning_horizon_months,
            immediate_actions: immediate,
            short_term_actions: short_term,
            medium_term_actions: medium_term,
            milestones: self.generate_milestones(planning_horizon_months),
        }
    }

    fn identify_quick_wins(
        &self,
        assessment: &crate::fsfvi::service::vulnerability_assessment::AssessmentReport,
        interventions: &[PriorityIntervention],
    ) -> Vec<QuickWin> {
        let mut quick_wins = Vec::new();

        for intervention in interventions {
            // Find the component vulnerability from the assessment
            let component_vulnerability = assessment
                .component_insights
                .iter()
                .find(|c| c.component_type == intervention.component_type)
                .map(|c| c.vulnerability)
                .unwrap_or(0.0);

            // Quick win criteria: high impact, low cost, fast implementation, and addresses actual vulnerability
            if intervention.estimated_impact > 0.05
                && intervention.estimated_cost_range.0 < 100000.0
                && component_vulnerability > 0.2  // Only if component is actually vulnerable
            {
                quick_wins.push(QuickWin {
                    component_type: intervention.component_type.clone(),
                    action: intervention.recommended_actions.first().cloned().unwrap_or_default(),
                    estimated_impact: intervention.estimated_impact,
                    estimated_duration_months: 3, // Quick wins <= 3 months
                    justification: format!(
                        "High impact ({:.1}% FSFVI reduction) at low cost for vulnerable component ({:.1}% vulnerability)",
                        intervention.estimated_impact * 100.0,
                        component_vulnerability * 100.0
                    ),
                });
            }
        }

        quick_wins.sort_by(|a, b| {
            b.estimated_impact
                .partial_cmp(&a.estimated_impact)
                .unwrap()
        });
        quick_wins.truncate(5); // Top 5 quick wins

        quick_wins
    }

    fn generate_risk_assessment(
        &self,
        assessment: &crate::fsfvi::service::vulnerability_assessment::AssessmentReport,
        components: &[Component],
    ) -> RiskAssessment {
        let mut risks = Vec::new();

        // High FSFVI risk
        if assessment.system_result.fsfvi_value > 0.4 {
            risks.push(Risk {
                risk_type: "high_vulnerability".to_string(),
                severity: "critical".to_string(),
                description: format!(
                    "Food system vulnerability at {:.1}% requires urgent intervention",
                    assessment.system_result.fsfvi_value * 100.0
                ),
                mitigation: "Implement emergency interventions in critical components".to_string(),
            });
        }

        // Budget concentration risk
        let total_budget: f64 = components.iter().map(|c| c.financial_allocation).sum();
        if let Some(max_allocation) = components
            .iter()
            .map(|c| c.financial_allocation)
            .max_by(|a, b| a.partial_cmp(b).unwrap())
        {
            if max_allocation / total_budget > 0.5 {
                risks.push(Risk {
                    risk_type: "budget_concentration".to_string(),
                    severity: "medium".to_string(),
                    description: "Budget highly concentrated in single component".to_string(),
                    mitigation: "Diversify investments across multiple components".to_string(),
                });
            }
        }

        RiskAssessment { risks }
    }

    fn generate_executive_summary(
        &self,
        assessment: &crate::fsfvi::service::vulnerability_assessment::AssessmentReport,
        interventions: &[PriorityIntervention],
        budget_recs: Option<&BudgetRecommendations>,
    ) -> ExecutiveSummary {
        let situation = format!(
            "Food system vulnerability at {:.1}% ({} risk). {} components require immediate attention.",
            assessment.system_result.fsfvi_value * 100.0,
            assessment.system_result.risk_level,
            assessment.system_result.components_requiring_immediate_attention
        );

        let key_recommendations = interventions
            .iter()
            .take(3)
            .map(|i| format!("{}: {}", i.component_type, i.recommended_actions.first().unwrap_or(&"Immediate intervention required".to_string())))
            .collect();

        let expected_impact = if let Some(budget) = budget_recs {
            format!(
                "Optimal budget reallocation could reduce FSFVI by {:.1}%",
                budget.expected_fsfvi_improvement * 100.0
            )
        } else {
            "Implement priority interventions to reduce vulnerability".to_string()
        };

        ExecutiveSummary {
            situation,
            key_recommendations,
            expected_impact,
            urgency: if assessment.system_result.fsfvi_value > 0.4 {
                "immediate_action_required"
            } else if assessment.system_result.fsfvi_value > 0.25 {
                "urgent"
            } else {
                "important"
            }
            .to_string(),
        }
    }

    fn generate_monitoring_indicators(
        &self,
        assessment: &crate::fsfvi::service::vulnerability_assessment::AssessmentReport,
    ) -> Vec<MonitoringIndicator> {
        let mut indicators = Vec::new();

        // Overall FSFVI
        indicators.push(MonitoringIndicator {
            indicator_name: "Overall FSFVI".to_string(),
            current_value: assessment.system_result.fsfvi_value,
            target_value: (assessment.system_result.fsfvi_value * 0.8).max(0.1), // 20% reduction
            measurement_frequency: "monthly".to_string(),
            data_source: "FSFVI System Assessment".to_string(),
        });

        // Component-specific indicators
        for insight in assessment.component_insights.iter().take(3) {
            indicators.push(MonitoringIndicator {
                indicator_name: format!("{} vulnerability", insight.component_type),
                current_value: insight.vulnerability,
                target_value: (insight.vulnerability * 0.7).max(0.05), // 30% reduction
                measurement_frequency: "quarterly".to_string(),
                data_source: format!("{} monitoring data", insight.component_type),
            });
        }

        indicators
    }

    fn identify_crisis_vulnerable_components(
        &self,
        baseline: &crate::fsfvi::service::vulnerability_assessment::AssessmentReport,
        crisis: &crate::fsfvi::service::vulnerability_assessment::AssessmentReport,
    ) -> Vec<ComponentCrisisImpact> {
        let mut impacts = Vec::new();

        for (baseline_insight, crisis_insight) in baseline
            .component_insights
            .iter()
            .zip(crisis.component_insights.iter())
        {
            let vulnerability_increase =
                crisis_insight.vulnerability - baseline_insight.vulnerability;

            if vulnerability_increase > 0.05 {
                impacts.push(ComponentCrisisImpact {
                    component_type: baseline_insight.component_type.clone(),
                    baseline_vulnerability: baseline_insight.vulnerability,
                    crisis_vulnerability: crisis_insight.vulnerability,
                    vulnerability_increase,
                    impact_level: if vulnerability_increase > 0.2 {
                        "severe"
                    } else if vulnerability_increase > 0.1 {
                        "high"
                    } else {
                        "moderate"
                    }
                    .to_string(),
                });
            }
        }

        impacts.sort_by(|a, b| {
            b.vulnerability_increase
                .partial_cmp(&a.vulnerability_increase)
                .unwrap()
        });

        impacts
    }

    fn generate_emergency_interventions(
        &self,
        affected_components: &[ComponentCrisisImpact],
        emergency_budget: f64,
        crisis_type: &Scenario,
    ) -> Vec<EmergencyIntervention> {
        let mut interventions = Vec::new();

        for comp in affected_components.iter().take(5) {
            let allocation = emergency_budget * (comp.vulnerability_increase / 0.5).min(0.3); // Max 30% to any component

            interventions.push(EmergencyIntervention {
                component_type: comp.component_type.clone(),
                intervention_type: self.determine_crisis_intervention(&comp.component_type, crisis_type),
                budget_allocation: allocation,
                timeline_days: if comp.impact_level == "severe" { 7 } else { 30 },
                expected_vulnerability_reduction: comp.vulnerability_increase * 0.6, // 60% mitigation
            });
        }

        interventions
    }

    fn determine_crisis_intervention(&self, component_type: &str, crisis: &Scenario) -> String {
        match crisis {
            Scenario::ClimateShock => match component_type {
                "agricultural_development" => "Emergency irrigation and drought-resistant seeds".to_string(),
                "infrastructure" => "Water storage and distribution".to_string(),
                _ => "Drought resilience measures".to_string(),
            },
            Scenario::PandemicDisruption => match component_type {
                "nutrition_health" => "Emergency food assistance and health services".to_string(),
                "social_protection_equity" => "Cash transfers and safety nets".to_string(),
                _ => "Pandemic response measures".to_string(),
            },
            Scenario::PoliticalInstability => "Emergency food distribution and security".to_string(),
            Scenario::FinancialCrisis => "Price subsidies and social protection".to_string(),
            _ => "Emergency intervention".to_string(),
        }
    }

    fn generate_crisis_timeline(&self, interventions: &[EmergencyIntervention]) -> Vec<TimelinePhase> {
        vec![
            TimelinePhase {
                phase: "Immediate (0-7 days)".to_string(),
                actions: interventions
                    .iter()
                    .filter(|i| i.timeline_days <= 7)
                    .map(|i| format!("{}: {}", i.component_type, i.intervention_type))
                    .collect(),
            },
            TimelinePhase {
                phase: "Short-term (1-4 weeks)".to_string(),
                actions: interventions
                    .iter()
                    .filter(|i| i.timeline_days > 7 && i.timeline_days <= 30)
                    .map(|i| format!("{}: {}", i.component_type, i.intervention_type))
                    .collect(),
            },
        ]
    }

    fn estimate_affected_population(&self, fsfvi_increase: f64) -> String {
        // Rough estimate: 1% FSFVI increase affects ~1M people in average country
        let affected_millions = fsfvi_increase * 100.0;
        format!("Approximately {:.1}M people potentially affected", affected_millions)
    }

    fn calculate_component_changes(
        &self,
        baseline: &[crate::fsfvi::service::vulnerability_assessment::ComponentInsight],
        current: &[crate::fsfvi::service::vulnerability_assessment::ComponentInsight],
    ) -> Vec<ComponentProgress> {
        baseline
            .iter()
            .zip(current.iter())
            .map(|(b, c)| ComponentProgress {
                component_type: b.component_type.clone(),
                baseline_vulnerability: b.vulnerability,
                current_vulnerability: c.vulnerability,
                change: c.vulnerability - b.vulnerability,
                trend: if c.vulnerability < b.vulnerability - 0.02 {
                    "improving"
                } else if c.vulnerability > b.vulnerability + 0.02 {
                    "declining"
                } else {
                    "stable"
                }
                .to_string(),
            })
            .collect()
    }

    fn identify_achievements(&self, changes: &[ComponentProgress]) -> Vec<String> {
        changes
            .iter()
            .filter(|c| c.trend == "improving")
            .map(|c| {
                format!(
                    "{}: Vulnerability reduced by {:.1}%",
                    c.component_type,
                    (c.change.abs()) * 100.0
                )
            })
            .collect()
    }

    fn identify_areas_needing_attention(&self, changes: &[ComponentProgress]) -> Vec<String> {
        changes
            .iter()
            .filter(|c| c.trend == "declining")
            .map(|c| {
                format!(
                    "{}: Vulnerability increased by {:.1}%",
                    c.component_type,
                    c.change * 100.0
                )
            })
            .collect()
    }

    fn generate_next_steps(
        &self,
        assessment: &crate::fsfvi::service::vulnerability_assessment::AssessmentReport,
    ) -> Vec<String> {
        let mut steps = Vec::new();

        if assessment.system_result.components_requiring_immediate_attention > 0 {
            steps.push(format!(
                "Address {} critical components requiring immediate intervention",
                assessment.system_result.components_requiring_immediate_attention
            ));
        }

        steps.push("Continue monthly FSFVI monitoring".to_string());
        steps.push("Implement recommended budget reallocations".to_string());

        steps
    }

    fn generate_key_messages(
        &self,
        assessment: &crate::fsfvi::service::vulnerability_assessment::AssessmentReport,
        audience: &StakeholderAudience,
    ) -> Vec<String> {
        match audience {
            StakeholderAudience::Ministers => vec![
                format!(
                    "Food system vulnerability at {:.0}% - {} priority",
                    assessment.system_result.fsfvi_value * 100.0,
                    assessment.system_result.risk_level
                ),
                format!(
                    "{} components require immediate policy intervention",
                    assessment.system_result.components_requiring_immediate_attention
                ),
                "Evidence-based budget reallocation recommended".to_string(),
            ],
            StakeholderAudience::Parliament => vec![
                format!(
                    "National food security assessment: {:.0}% vulnerability",
                    assessment.system_result.fsfvi_value * 100.0
                ),
                "Strategic investments needed in agriculture and infrastructure".to_string(),
                "Monitoring system in place to track progress".to_string(),
            ],
            StakeholderAudience::Public => vec![
                format!(
                    "Government working to strengthen food security (currently {:.0}% vulnerable)",
                    assessment.system_result.fsfvi_value * 100.0
                ),
                "Priority areas: agriculture, infrastructure, nutrition".to_string(),
                "Progress tracked and reported regularly".to_string(),
            ],
            StakeholderAudience::DonorsPartners => vec![
                format!(
                    "FSFVI assessment: {:.2} vulnerability index",
                    assessment.system_result.fsfvi_value
                ),
                "Evidence-based prioritization using hybrid weighting methodology".to_string(),
                "Partnership opportunities in critical components identified".to_string(),
            ],
        }
    }

    fn generate_talking_points(
        &self,
        assessment: &crate::fsfvi::service::vulnerability_assessment::AssessmentReport,
        _audience: &StakeholderAudience,
    ) -> Vec<String> {
        vec![
            "Using evidence-based FSFVI methodology".to_string(),
            format!(
                "Top priorities: {}",
                assessment
                    .system_result
                    .top_3_vulnerability_contributors
                    .iter()
                    .map(|c| c.component_name.clone())
                    .collect::<Vec<_>>()
                    .join(", ")
            ),
            "Transparent, scientifically-validated approach".to_string(),
        ]
    }

    fn generate_infographic_data(&self, assessment: &crate::fsfvi::service::vulnerability_assessment::AssessmentReport) -> InfographicData {
        InfographicData {
            overall_score: assessment.system_result.fsfvi_value,
            risk_level_color: match assessment.system_result.risk_level.as_str() {
                "critical" => "red".to_string(),
                "high" => "orange".to_string(),
                "medium" => "yellow".to_string(),
                _ => "green".to_string(),
            },
            component_scores: assessment
                .component_insights
                .iter()
                .map(|c| (c.component_type.clone(), c.vulnerability))
                .collect(),
        }
    }

    fn generate_call_to_action(&self, assessment: &crate::fsfvi::service::vulnerability_assessment::AssessmentReport, audience: &StakeholderAudience) -> String {
        let risk_level = &assessment.system_result.risk_level;
        let fsfvi_pct = assessment.system_result.fsfvi_value * 100.0;

        match (audience, risk_level.as_str()) {
            (StakeholderAudience::Ministers, "critical") =>
                format!("URGENT: Approve emergency response - food system at critical risk ({:.1}%)", fsfvi_pct),
            (StakeholderAudience::Ministers, "high") =>
                format!("Prioritize and approve recommended interventions - high vulnerability ({:.1}%)", fsfvi_pct),
            (StakeholderAudience::Ministers, _) =>
                "Approve recommended budget reallocations and policy interventions".to_string(),

            (StakeholderAudience::Parliament, "critical") =>
                "URGENT: Support emergency food security funding and oversight".to_string(),
            (StakeholderAudience::Parliament, _) =>
                "Support food security budget and monitor implementation".to_string(),

            (StakeholderAudience::Public, "critical") | (StakeholderAudience::Public, "high") =>
                "Stay informed and prepared - government taking action on food security challenges".to_string(),
            (StakeholderAudience::Public, _) =>
                "Stay informed about government food security initiatives".to_string(),

            (StakeholderAudience::DonorsPartners, "critical") =>
                "URGENT: Emergency coordination needed for crisis response".to_string(),
            (StakeholderAudience::DonorsPartners, _) =>
                "Partner with government on priority interventions".to_string(),
        }
    }

    fn generate_milestones(&self, months: usize) -> Vec<String> {
        let mut milestones = Vec::new();

        milestones.push("Month 1: Immediate interventions launched".to_string());

        if months >= 6 {
            milestones.push("Month 6: First progress assessment".to_string());
        }

        if months >= 12 {
            milestones.push("Month 12: Mid-term evaluation and adjustment".to_string());
        }

        if months >= 24 {
            milestones.push("Month 24: Comprehensive impact assessment".to_string());
        }

        milestones
    }

    fn estimate_intervention_impact(&self, vulnerability: f64) -> f64 {
        // Estimate: effective intervention reduces vulnerability by 40-60%
        vulnerability * 0.5
    }

    fn estimate_intervention_cost(&self, component_type: &str, vulnerability: f64) -> (f64, f64) {
        // Rough cost estimates (min, max) in thousands
        let base_cost = match component_type {
            "agricultural_development" => (50.0, 500.0),
            "infrastructure" => (200.0, 2000.0),
            "nutrition_health" => (30.0, 300.0),
            "climate_natural_resources" => (100.0, 1000.0),
            "social_protection_equity" => (40.0, 400.0),
            "governance_institutions" => (20.0, 200.0),
            _ => (50.0, 500.0),
        };

        // Scale by vulnerability
        let scale_factor = 1.0 + vulnerability;
        (base_cost.0 * scale_factor, base_cost.1 * scale_factor)
    }
}

// Request/Response Types

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRecommendationRequest {
    pub components: Vec<Component>,
    pub country_name: Option<String>,
    pub currency: Option<String>,
    pub planning_horizon_months: usize,
    pub include_budget_optimization: bool,
    pub include_sensitivity_analysis: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRecommendationReport {
    pub executive_summary: ExecutiveSummary,
    pub current_vulnerability: VulnerabilitySnapshot,
    pub priority_interventions: Vec<PriorityIntervention>,
    pub budget_recommendations: Option<BudgetRecommendations>,
    pub implementation_plan: ImplementationPlan,
    pub quick_wins: Vec<QuickWin>,
    pub risk_assessment: RiskAssessment,
    pub robustness_assessment: Option<RobustnessAssessment>,
    pub monitoring_indicators: Vec<MonitoringIndicator>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutiveSummary {
    pub situation: String,
    pub key_recommendations: Vec<String>,
    pub expected_impact: String,
    pub urgency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VulnerabilitySnapshot {
    pub fsfvi: f64,
    pub risk_level: String,
    pub critical_components: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriorityIntervention {
    pub component_type: String,
    pub current_vulnerability: f64,
    pub urgency: String, // "immediate", "urgent", "high"
    pub recommended_actions: Vec<String>,
    pub estimated_impact: f64,
    pub estimated_cost_range: (f64, f64),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetRecommendations {
    pub current_allocation_efficiency: f64,
    pub optimal_allocations: HashMap<String, f64>,
    pub expected_fsfvi_improvement: f64,
    pub reallocation_priorities: Vec<(String, f64)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RobustnessAssessment {
    pub is_robust: bool,
    pub confidence_level: String, // "high", "medium", "low"
    pub key_uncertainties: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImplementationPlan {
    pub planning_horizon_months: usize,
    pub immediate_actions: Vec<String>,    // 0-1 months
    pub short_term_actions: Vec<String>,   // 1-6 months
    pub medium_term_actions: Vec<String>,  // 6-24 months
    pub milestones: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickWin {
    pub component_type: String,
    pub action: String,
    pub estimated_impact: f64,
    pub estimated_duration_months: usize,
    pub justification: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub risks: Vec<Risk>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Risk {
    pub risk_type: String,
    pub severity: String,
    pub description: String,
    pub mitigation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringIndicator {
    pub indicator_name: String,
    pub current_value: f64,
    pub target_value: f64,
    pub measurement_frequency: String,
    pub data_source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrisisResponseReport {
    pub crisis_type: String,
    pub baseline_fsfvi: f64,
    pub crisis_fsfvi: f64,
    pub fsfvi_increase: f64,
    pub severity_level: String,
    pub most_affected_components: Vec<ComponentCrisisImpact>,
    pub emergency_interventions: Vec<EmergencyIntervention>,
    pub response_timeline: Vec<TimelinePhase>,
    pub estimated_people_affected: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentCrisisImpact {
    pub component_type: String,
    pub baseline_vulnerability: f64,
    pub crisis_vulnerability: f64,
    pub vulnerability_increase: f64,
    pub impact_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyIntervention {
    pub component_type: String,
    pub intervention_type: String,
    pub budget_allocation: f64,
    pub timeline_days: usize,
    pub expected_vulnerability_reduction: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelinePhase {
    pub phase: String,
    pub actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressTrackingReport {
    pub time_period_months: usize,
    pub baseline_fsfvi: f64,
    pub current_fsfvi: f64,
    pub fsfvi_change: f64,
    pub performance_status: String,
    pub component_changes: Vec<ComponentProgress>,
    pub achievements: Vec<String>,
    pub areas_needing_attention: Vec<String>,
    pub recommended_next_steps: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentProgress {
    pub component_type: String,
    pub baseline_vulnerability: f64,
    pub current_vulnerability: f64,
    pub change: f64,
    pub trend: String, // "improving", "stable", "declining"
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum StakeholderAudience {
    Ministers,
    Parliament,
    Public,
    DonorsPartners,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakeholderBrief {
    pub audience: String,
    pub key_messages: Vec<String>,
    pub talking_points: Vec<String>,
    pub infographic_data: InfographicData,
    pub call_to_action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfographicData {
    pub overall_score: f64,
    pub risk_level_color: String,
    pub component_scores: Vec<(String, f64)>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_components() -> Vec<Component> {
        vec![
            Component {
                component_id: Some("test_1".to_string()),
                component_type: "agricultural_development".to_string(),
                observed_value: 60.0,  // Increased gap: 60 vs 120 benchmark
                benchmark_value: 120.0,
                financial_allocation: 1000.0,
                weight: Some(0.4),
                sensitivity_parameter: Some(0.0005),  // Lower sensitivity = higher vulnerability
            },
            Component {
                component_id: Some("test_2".to_string()),
                component_type: "infrastructure".to_string(),
                observed_value: 50.0,  // Increased gap: 50 vs 100 benchmark
                benchmark_value: 100.0,
                financial_allocation: 500.0,
                weight: Some(0.6),
                sensitivity_parameter: Some(0.0005),  // Lower sensitivity = higher vulnerability
            },
        ]
    }

    #[test]
    fn test_policy_recommendations() {
        let service = DecisionSupportService::new();
        let request = PolicyRecommendationRequest {
            components: create_test_components(),
            country_name: Some("TestCountry".to_string()),
            currency: Some("USD".to_string()),
            planning_horizon_months: 24,
            include_budget_optimization: true,
            include_sensitivity_analysis: false,
        };

        let report = service.generate_policy_recommendations(request).unwrap();
        assert!(!report.priority_interventions.is_empty());
    }
}
