/// Strategic Planning Service
/// ==========================
///
/// Multi-year strategic planning for achieving food system resilience.
///
/// CRITICAL DISTINCTION:
/// - Past budgets are SUNK COSTS - cannot be changed
/// - Current year budget may be partially flexible
/// - FUTURE years (Year 2, 3, 4, 5+) are where strategic planning matters
///
/// PURPOSE:
/// Help governments plan multi-year budget trajectories to systematically
/// reduce FSFVI and achieve food security targets over realistic timelines.
///
/// KEY INSIGHTS:
/// - Food system transformation takes 3-5+ years, not months
/// - Each year's allocation builds on previous investments
/// - Some components need sequential investments (infrastructure before programs)
/// - Budget constraints vary by year (fiscal space, donor commitments, etc.)
/// - Political cycles affect implementation timelines
///
/// PLANNING HORIZONS:
/// - Short-term: 1-2 years (immediate priorities)
/// - Medium-term: 3-5 years (structural improvements)
/// - Long-term: 5-10 years (transformation goals)
///
/// USE CASES:
/// 1. National Development Plans (5-year plans)
/// 2. Medium-Term Expenditure Frameworks (MTEF)
/// 3. Sector Investment Plans
/// 4. Donor coordination and resource mobilization
/// 5. SDG achievement pathways

use crate::fsfvi::config::{Scenario, WeightingMethod};
use crate::fsfvi::errors::{FsfviError, FsfviResult};
use crate::fsfvi::service::budget_optimization::{
    BudgetOptimizationService, OptimizationConstraints, OptimizationObjective,
};
use crate::fsfvi::service::performance_gap_analysis::PerformanceGapAnalysisService;
use crate::fsfvi::service::vulnerability_assessment::{
    AssessmentRequest, VulnerabilityAssessmentService,
};
use crate::fsfvi::validators::Component;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Strategic planning service for multi-year budgeting
pub struct StrategicPlanningService {
    assessment_service: VulnerabilityAssessmentService,
    optimization_service: BudgetOptimizationService,
    gap_analysis_service: PerformanceGapAnalysisService,
}

impl Default for StrategicPlanningService {
    fn default() -> Self {
        Self::new()
    }
}

impl StrategicPlanningService {
    pub fn new() -> Self {
        Self {
            assessment_service: VulnerabilityAssessmentService::new(),
            optimization_service: BudgetOptimizationService::new(),
            gap_analysis_service: PerformanceGapAnalysisService::new(),
        }
    }

    /// Generate multi-year strategic plan to achieve FSFVI targets
    ///
    /// CRITICAL: This is for FUTURE budget planning, not reallocating past budgets.
    ///
    /// Takes current state and generates year-by-year budget allocation plan
    /// to achieve target FSFVI within specified timeline.
    pub fn generate_multi_year_plan(
        &self,
        request: MultiYearPlanRequest,
    ) -> FsfviResult<MultiYearStrategicPlan> {
        tracing::info!(
            "Generating {}-year strategic plan to achieve FSFVI target of {:.2}",
            request.planning_years,
            request.target_fsfvi
        );

        // Validate inputs
        self.validate_plan_request(&request)?;

        // Step 1: Assess current state (Year 0 - baseline)
        let baseline_assessment = self.assessment_service.assess_food_system(AssessmentRequest {
            components: request.current_components.clone(),
            country_name: request.country_name.clone(),
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: request.currency.clone(),
            use_performance_adjusted_weights: false, // Standard baseline for planning
        })?;

        let baseline_fsfvi = baseline_assessment.system_result.fsfvi_value;

        if baseline_fsfvi <= request.target_fsfvi {
            return Ok(MultiYearStrategicPlan {
                baseline_fsfvi,
                target_fsfvi: request.target_fsfvi,
                planning_years: request.planning_years,
                target_already_achieved: true,
                yearly_plans: vec![],
                total_additional_investment_needed: 0.0,
                expected_outcomes: vec!["Target already achieved - maintain current trajectory".to_string()],
                implementation_risks: vec![],
                success_factors: vec![],
            });
        }

        // Step 2: Calculate required FSFVI reduction per year
        let total_reduction_needed = baseline_fsfvi - request.target_fsfvi;
        let annual_reduction_target = total_reduction_needed / request.planning_years as f64;

        // Step 3: Generate year-by-year plans
        let mut yearly_plans = Vec::new();
        let mut current_state = request.current_components.clone();
        let mut cumulative_fsfvi = baseline_fsfvi;
        let baseline_total_budget: f64 = request.current_components.iter().map(|c| c.financial_allocation).sum();

        for year in 1..=request.planning_years {
            let year_target_fsfvi = baseline_fsfvi - (annual_reduction_target * year as f64);

            // Get budget constraints for this year
            let year_budget_constraint = request
                .yearly_budget_constraints
                .get(&year)
                .cloned()
                .unwrap_or_else(|| {
                    // CRITICAL FIX: Apply compound growth year-over-year, not flat 5% from baseline
                    // Year 1: baseline * 1.05^1, Year 2: baseline * 1.05^2, etc.
                    let growth_factor = 1.05_f64.powi(year as i32);
                    YearlyBudgetConstraint {
                        total_budget_ceiling: baseline_total_budget * growth_factor,
                        min_allocation_per_component: 0.0,
                        max_change_percent_from_previous: Some(30.0),
                        priority_components: vec![],
                    }
                });

            // Optimize allocation for this year
            let year_plan = self.plan_single_year(
                &current_state,
                year,
                year_target_fsfvi,
                cumulative_fsfvi,
                &year_budget_constraint,
                &request,
            )?;

            cumulative_fsfvi = year_plan.projected_fsfvi;
            current_state = year_plan.recommended_allocations_components.clone();

            yearly_plans.push(year_plan);
        }

        // Step 4: Calculate total investment needed
        let baseline_total_budget: f64 = request.current_components.iter().map(|c| c.financial_allocation).sum();
        // CRITICAL FIX: Use total_budget field instead of summing recommended_allocations
        // to avoid floating-point rounding errors
        let final_total_budget: f64 = yearly_plans.last()
            .map(|p| p.total_budget)
            .unwrap_or(baseline_total_budget);
        let total_additional_investment = final_total_budget - baseline_total_budget;

        // Step 5: Identify implementation risks
        let implementation_risks = self.identify_implementation_risks(&yearly_plans, &request);

        // Step 6: Identify success factors
        let success_factors = self.identify_success_factors(&yearly_plans, total_reduction_needed);

        // Step 7: Generate expected outcomes
        let expected_outcomes = self.generate_expected_outcomes(&yearly_plans, baseline_fsfvi, request.target_fsfvi);

        Ok(MultiYearStrategicPlan {
            baseline_fsfvi,
            target_fsfvi: request.target_fsfvi,
            planning_years: request.planning_years,
            target_already_achieved: false,
            yearly_plans,
            total_additional_investment_needed: total_additional_investment,
            expected_outcomes,
            implementation_risks,
            success_factors,
        })
    }

    /// Generate Medium-Term Expenditure Framework (MTEF)
    ///
    /// Standard 3-year rolling budget framework used by many governments.
    pub fn generate_mtef(
        &self,
        current_components: Vec<Component>,
        target_fsfvi_improvement_percent: f64, // e.g., 20% reduction over 3 years
        yearly_budget_growth_rate: f64,        // e.g., 5% annual growth
    ) -> FsfviResult<MtefPlan> {
        tracing::info!(
            "Generating MTEF: {:.0}% FSFVI improvement target with {:.1}% annual budget growth",
            target_fsfvi_improvement_percent,
            yearly_budget_growth_rate * 100.0
        );

        // Calculate baseline
        let baseline = self.assessment_service.assess_food_system(AssessmentRequest {
            components: current_components.clone(),
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard baseline for MTEF
        })?;

        let baseline_fsfvi = baseline.system_result.fsfvi_value;
        let target_fsfvi = baseline_fsfvi * (1.0 - target_fsfvi_improvement_percent / 100.0);
        let baseline_budget: f64 = current_components.iter().map(|c| c.financial_allocation).sum();

        let mut year_plans = Vec::new();

        // CRITICAL FIX: Keep baseline components immutable to prevent compounding
        // Bug was: scaling current_state each iteration caused allocations to compound
        let baseline_components = current_components.clone();

        for year in 1..=3 {
            let year_budget = baseline_budget * (1.0 + yearly_budget_growth_rate).powi(year as i32);
            let year_target = baseline_fsfvi - ((baseline_fsfvi - target_fsfvi) * (year as f64 / 3.0));

            // FIX: Create fresh scaled copy for THIS year only (not from previous year)
            let mut year_components = baseline_components.clone();
            let budget_scale = year_budget / baseline_budget;
            for comp in year_components.iter_mut() {
                comp.financial_allocation *= budget_scale;
            }

            // Optimize with year-specific scaled components
            let optimized = self.optimization_service.optimize_allocation(
                year_components.clone(),
                OptimizationObjective::MinimizeFsfvi,
                OptimizationConstraints {
                    min_allocation_per_component: 0.0,
                    max_change_percent: Some(25.0),
                    implementation_months: 12,
                },
            )?;

            // CRITICAL FIX: Normalize allocations to EXACT budget (enforce conservation)
            // The optimizer may not perfectly hit the budget ceiling due to constraints
            let optimized_total: f64 = optimized.optimal_allocations.values().sum();
            let normalization_factor = year_budget / optimized_total;

            let mut normalized_allocations = HashMap::new();
            for (comp_type, alloc) in optimized.optimal_allocations {
                normalized_allocations.insert(comp_type, alloc * normalization_factor);
            }

            // Verify budget conservation (CRITICAL for government accountability)
            let final_total: f64 = normalized_allocations.values().sum();
            let conservation_error = ((final_total - year_budget) / year_budget).abs();

            // Log warning if conservation violated (should never happen with normalization)
            if conservation_error > 0.0001 {
                tracing::warn!(
                    "Budget conservation error in MTEF Year {}: Expected ${:.2}M, Got ${:.2}M, Error: {:.4}%",
                    year, year_budget, final_total, conservation_error * 100.0
                );
            }

            year_plans.push(MtefYearPlan {
                year,
                total_budget: year_budget,
                target_fsfvi: year_target,
                projected_fsfvi: optimized.optimized_fsfvi,
                component_allocations: normalized_allocations,
                key_interventions: self.identify_key_interventions(&year_components, year),
            });
        }

        Ok(MtefPlan {
            baseline_year: 0,
            baseline_fsfvi,
            target_fsfvi_year_3: target_fsfvi,
            baseline_budget,
            year_1_plan: year_plans[0].clone(),
            year_2_plan: year_plans[1].clone(),
            year_3_plan: year_plans[2].clone(),
            fiscal_implications: self.generate_fiscal_implications(&year_plans, baseline_budget),
        })
    }

    /// Investment sequencing analysis
    ///
    /// Some components must be invested in first (e.g., infrastructure before programs).
    /// This determines optimal sequencing of investments across years.
    pub fn analyze_investment_sequencing(
        &self,
        components: Vec<Component>,
        planning_years: usize,
    ) -> FsfviResult<InvestmentSequencingPlan> {
        tracing::info!("Analyzing investment sequencing over {} years", planning_years);

        // Categorize components by investment type
        let mut foundational = Vec::new();  // Infrastructure, institutions
        let mut programmatic = Vec::new();  // Programs that depend on foundations
        let mut enabling = Vec::new();      // Governance, capacity building

        for comp in &components {
            match comp.component_type.as_str() {
                "infrastructure" | "governance_institutions" => {
                    foundational.push(comp.clone());
                }
                "agricultural_development" | "nutrition_health" | "social_protection_equity" => {
                    programmatic.push(comp.clone());
                }
                _ => {
                    enabling.push(comp.clone());
                }
            }
        }

        // Generate sequenced phases
        let phases = vec![
            SequencingPhase {
                phase_number: 1,
                years: vec![1, 2],
                focus: "Foundation Building".to_string(),
                priority_components: foundational.iter().map(|c| c.component_type.clone()).collect(),
                rationale: "Establish infrastructure and institutional capacity first".to_string(),
                estimated_budget_share: 0.40, // 40% of total multi-year budget
            },
            SequencingPhase {
                phase_number: 2,
                years: (3..=(planning_years.min(5))).collect(),
                focus: "Program Scale-Up".to_string(),
                priority_components: programmatic.iter().map(|c| c.component_type.clone()).collect(),
                rationale: "Scale programs once foundations are in place".to_string(),
                estimated_budget_share: 0.45, // 45%
            },
            SequencingPhase {
                phase_number: 3,
                years: ((planning_years.min(5) + 1)..=planning_years).collect(),
                focus: "Sustainability & Optimization".to_string(),
                priority_components: enabling.iter().map(|c| c.component_type.clone()).collect(),
                rationale: "Strengthen governance and optimize operations for long-term sustainability".to_string(),
                estimated_budget_share: 0.15, // 15%
            },
        ];

        Ok(InvestmentSequencingPlan {
            planning_years,
            sequencing_rationale: "Sequential investment approach maximizes effectiveness by ensuring foundations before programs".to_string(),
            phases,
            dependencies: self.identify_investment_dependencies(&components),
            quick_wins_year_1: self.identify_year_one_quick_wins(&components),
        })
    }

    /// Resource mobilization plan
    ///
    /// Helps governments plan how to mobilize resources (domestic + external) over multiple years.
    pub fn generate_resource_mobilization_plan(
        &self,
        strategic_plan: &MultiYearStrategicPlan,
        domestic_resource_capacity: Vec<YearlyResourceCapacity>,
    ) -> FsfviResult<ResourceMobilizationPlan> {
        tracing::info!("Generating resource mobilization plan for {} years", strategic_plan.planning_years);

        let mut yearly_mobilization = Vec::new();

        for (idx, year_plan) in strategic_plan.yearly_plans.iter().enumerate() {
            let year = idx + 1;
            let required_budget: f64 = year_plan.recommended_allocations.values().sum();

            let domestic_capacity = domestic_resource_capacity
                .get(idx)
                .map(|c| c.available_domestic_resources)
                .unwrap_or(required_budget * 0.7); // Assume 70% domestic if not specified

            let financing_gap = (required_budget - domestic_capacity).max(0.0);

            yearly_mobilization.push(YearlyResourceMobilization {
                year,
                required_total: required_budget,
                domestic_resources: domestic_capacity,
                external_financing_needed: financing_gap,
                financing_gap_percent: if required_budget > 0.0 {
                    (financing_gap / required_budget) * 100.0
                } else {
                    0.0
                },
                recommended_financing_sources: self.recommend_financing_sources(financing_gap, year),
            });
        }

        let total_external_needed: f64 = yearly_mobilization.iter().map(|y| y.external_financing_needed).sum();

        Ok(ResourceMobilizationPlan {
            planning_years: strategic_plan.planning_years,
            yearly_mobilization,
            total_external_financing_needed: total_external_needed,
            financing_strategy: self.generate_financing_strategy(total_external_needed, strategic_plan.planning_years),
        })
    }

    // Helper methods

    fn validate_plan_request(&self, request: &MultiYearPlanRequest) -> FsfviResult<()> {
        if request.planning_years == 0 {
            return Err(FsfviError::Validation {
                message: "Planning years must be greater than 0".to_string(),
                details: HashMap::new(),
            });
        }

        if request.planning_years > 20 {
            return Err(FsfviError::Validation {
                message: "Planning period too long (max 20 years for realistic forecasting)".to_string(),
                details: [("requested_years".to_string(), request.planning_years.to_string())]
                    .iter()
                    .cloned()
                    .collect(),
            });
        }

        if request.target_fsfvi < 0.0 || request.target_fsfvi > 1.0 {
            return Err(FsfviError::Validation {
                message: "Target FSFVI must be between 0.0 and 1.0".to_string(),
                details: [("target_fsfvi".to_string(), request.target_fsfvi.to_string())]
                    .iter()
                    .cloned()
                    .collect(),
            });
        }

        Ok(())
    }

    fn plan_single_year(
        &self,
        current_state: &[Component],
        year: usize,
        year_target_fsfvi: f64,
        current_fsfvi: f64,
        budget_constraint: &YearlyBudgetConstraint,
        request: &MultiYearPlanRequest,
    ) -> FsfviResult<YearlyPlan> {
        // Optimize allocations for this year
        let optimization_result = self.optimization_service.optimize_allocation(
            current_state.to_vec(),
            OptimizationObjective::MinimizeFsfvi,
            OptimizationConstraints {
                min_allocation_per_component: budget_constraint.min_allocation_per_component,
                max_change_percent: budget_constraint.max_change_percent_from_previous,
                implementation_months: 12,
            },
        )?;

        // Apply budget ceiling if specified
        let mut final_allocations = optimization_result.optimal_allocations.clone();
        let optimized_total: f64 = final_allocations.values().sum();

        if optimized_total > budget_constraint.total_budget_ceiling {
            // Scale down to budget ceiling
            let scale = budget_constraint.total_budget_ceiling / optimized_total;
            for allocation in final_allocations.values_mut() {
                *allocation *= scale;
            }
        }

        // Create updated components for next year
        let mut updated_components = current_state.to_vec();
        for comp in updated_components.iter_mut() {
            if let Some(&new_alloc) = final_allocations.get(&comp.component_type) {
                comp.financial_allocation = new_alloc;
            }
        }

        // Estimate projected FSFVI after these allocations
        let projected_assessment = self.assessment_service.assess_food_system(AssessmentRequest {
            components: updated_components.clone(),
            country_name: request.country_name.clone(),
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: request.currency.clone(),
            use_performance_adjusted_weights: false, // Standard projection for planning
        })?;

        let projected_fsfvi = projected_assessment.system_result.fsfvi_value;
        let actual_reduction = current_fsfvi - projected_fsfvi;

        Ok(YearlyPlan {
            year,
            target_fsfvi: year_target_fsfvi,
            projected_fsfvi,
            fsfvi_reduction_from_previous: actual_reduction,
            on_track: projected_fsfvi <= year_target_fsfvi + 0.02, // 2% tolerance
            recommended_allocations: final_allocations,
            recommended_allocations_components: updated_components,
            total_budget: budget_constraint.total_budget_ceiling,
            key_interventions: self.identify_key_year_interventions(&projected_assessment, year),
            milestones: vec![
                format!("Q2: Mid-year review and budget adjustment"),
                format!("Q4: Annual assessment and next year planning"),
            ],
        })
    }

    fn identify_implementation_risks(&self, plans: &[YearlyPlan], request: &MultiYearPlanRequest) -> Vec<ImplementationRisk> {
        let mut risks = Vec::new();

        // Use gap analysis to validate closure rates are realistic
        let baseline_components = request.current_components.clone();
        if let Ok(baseline_gap_report) = self.gap_analysis_service.analyze_performance_gaps(baseline_components) {
            // Check if average gap is very large
            if baseline_gap_report.average_gap > 0.5 {
                risks.push(ImplementationRisk {
                    risk_type: "large_baseline_gaps".to_string(),
                    severity: "high".to_string(),
                    description: format!("Starting with {:.1}% average performance gap - significant structural reforms needed", baseline_gap_report.average_gap * 100.0),
                    mitigation: "Phase reforms over multiple years, prioritize foundational investments first".to_string(),
                });
            }

            // Check for critical components that may derail plan
            if baseline_gap_report.critical_gaps > 2 {
                risks.push(ImplementationRisk {
                    risk_type: "multiple_critical_gaps".to_string(),
                    severity: "high".to_string(),
                    description: format!("{} components have critical gaps (>50%) requiring urgent attention", baseline_gap_report.critical_gaps),
                    mitigation: "Address critical gaps in Year 1-2 before scaling other interventions".to_string(),
                });
            }
        }

        // Check if plan is overly ambitious
        let avg_annual_reduction: f64 = plans.iter().map(|p| p.fsfvi_reduction_from_previous).sum::<f64>() / plans.len() as f64;
        if avg_annual_reduction > 0.10 {
            risks.push(ImplementationRisk {
                risk_type: "ambitious_targets".to_string(),
                severity: "high".to_string(),
                description: format!("Average annual FSFVI reduction of {:.1}% is very ambitious", avg_annual_reduction * 100.0),
                mitigation: "Build in contingency years, strengthen M&E systems, ensure political commitment".to_string(),
            });
        }

        // Check budget volatility
        let budget_changes: Vec<f64> = plans.windows(2)
            .map(|w| {
                let change = (w[1].total_budget - w[0].total_budget) / w[0].total_budget;
                change.abs()
            })
            .collect();

        if budget_changes.iter().any(|&c| c > 0.3) {
            risks.push(ImplementationRisk {
                risk_type: "budget_volatility".to_string(),
                severity: "medium".to_string(),
                description: "Large year-to-year budget changes may be fiscally challenging".to_string(),
                mitigation: "Smooth budget trajectory, explore multi-year commitments from donors".to_string(),
            });
        }

        // Check if any component gets drastically reduced
        for plan in plans {
            for (comp_type, &allocation) in &plan.recommended_allocations {
                if allocation < request.current_components.iter()
                    .find(|c| &c.component_type == comp_type)
                    .map(|c| c.financial_allocation * 0.5)
                    .unwrap_or(0.0)
                {
                    risks.push(ImplementationRisk {
                        risk_type: "drastic_reallocation".to_string(),
                        severity: "medium".to_string(),
                        description: format!("Year {}: {} budget cut by >50%", plan.year, comp_type),
                        mitigation: "Gradual transition, stakeholder engagement, alternative programming".to_string(),
                    });
                    break; // Only report once per year
                }
            }
        }

        risks
    }

    fn identify_success_factors(&self, plans: &[YearlyPlan], _total_reduction: f64) -> Vec<String> {
        let mut factors = Vec::new();

        factors.push("Political commitment across electoral cycles".to_string());
        factors.push("Adequate and predictable financing".to_string());
        factors.push("Strong M&E systems for course correction".to_string());

        if plans.len() >= 5 {
            factors.push("Long-term planning horizon allows structural transformation".to_string());
        }

        factors.push("Coordination across sectors and stakeholders".to_string());
        factors.push("Adaptive management based on annual assessments".to_string());

        factors
    }

    fn generate_expected_outcomes(&self, plans: &[YearlyPlan], baseline: f64, target: f64) -> Vec<String> {
        let mut outcomes = Vec::new();

        if let Some(final_plan) = plans.last() {
            let total_reduction = baseline - final_plan.projected_fsfvi;
            let reduction_percent = (total_reduction / baseline) * 100.0;

            outcomes.push(format!(
                "FSFVI reduction from {:.2} to {:.2} ({:.1}% improvement)",
                baseline, final_plan.projected_fsfvi, reduction_percent
            ));

            if final_plan.projected_fsfvi <= target {
                outcomes.push("Target achieved within planning horizon".to_string());
            } else {
                outcomes.push(format!(
                    "Additional {:.1}% reduction needed beyond plan to reach target",
                    ((final_plan.projected_fsfvi - target) / baseline) * 100.0
                ));
            }

            // Add gap closure insights from performance gap analysis
            let final_components = &final_plan.recommended_allocations_components;
            if !final_components.is_empty() {
                if let Ok(final_gap_report) = self.gap_analysis_service.analyze_performance_gaps(final_components.clone()) {
                    outcomes.push(format!(
                        "Expected average performance gap closure to {:.1}%",
                        final_gap_report.average_gap * 100.0
                    ));

                    if final_gap_report.critical_gaps == 0 {
                        outcomes.push("All critical performance gaps eliminated".to_string());
                    } else {
                        outcomes.push(format!(
                            "{} critical gap(s) remaining - continue monitoring",
                            final_gap_report.critical_gaps
                        ));
                    }
                }
            }
        }

        outcomes.push("Improved food security and nutrition outcomes".to_string());
        outcomes.push("Strengthened resilience to shocks and stresses".to_string());
        outcomes.push("Enhanced capacity for evidence-based policy making".to_string());

        outcomes
    }

    fn identify_key_interventions(&self, components: &[Component], year: usize) -> Vec<String> {
        let mut interventions = Vec::new();

        for comp in components.iter().take(3) {
            interventions.push(format!("Year {}: Strengthen {}", year, comp.component_type.replace("_", " ")));
        }

        interventions
    }

    fn identify_key_year_interventions(
        &self,
        assessment: &crate::fsfvi::service::vulnerability_assessment::AssessmentReport,
        year: usize,
    ) -> Vec<String> {
        // Use gap analysis to identify high-priority components
        let components: Vec<Component> = assessment.component_insights
            .iter()
            .map(|insight| {
                // Convert vulnerability score to observed/benchmark for gap analysis
                Component {
                    component_id: Some(insight.component_type.clone()),
                    component_type: insight.component_type.clone(),
                    observed_value: (1.0 - insight.vulnerability) * 100.0, // Lower vulnerability = higher performance
                    benchmark_value: 100.0, // Target is 100% (zero vulnerability)
                    financial_allocation: 0.0, // Not needed for gap analysis
                    weight: Some(insight.weight),
                    sensitivity_parameter: None,
                }
            })
            .collect();

        // Analyze performance gaps to identify priorities
        match self.gap_analysis_service.analyze_performance_gaps(components) {
            Ok(gap_report) => {
                // Use top priorities from gap analysis
                gap_report
                    .top_priorities
                    .iter()
                    .take(3)
                    .map(|priority| format!("Year {}: Address {}", year, priority))
                    .collect()
            }
            Err(_) => {
                // Fallback to vulnerability-based recommendations if gap analysis fails
                assessment
                    .component_insights
                    .iter()
                    .filter(|i| i.vulnerability > 0.3)
                    .take(3)
                    .map(|i| format!("Year {}: {}", year, i.recommendations.first().unwrap_or(&"Strengthen component".to_string())))
                    .collect()
            }
        }
    }

    fn generate_fiscal_implications(&self, plans: &[MtefYearPlan], baseline: f64) -> Vec<String> {
        let year_3_budget = plans.last().map(|p| p.total_budget).unwrap_or(baseline);
        let total_increase = year_3_budget - baseline;
        let increase_percent = (total_increase / baseline) * 100.0;

        vec![
            format!("Total budget increase over 3 years: {:.1}%", increase_percent),
            format!("Average annual growth: {:.1}%", increase_percent / 3.0),
            "Requires sustained domestic resource mobilization and donor coordination".to_string(),
        ]
    }

    fn identify_investment_dependencies(&self, _components: &[Component]) -> Vec<InvestmentDependency> {
        vec![
            InvestmentDependency {
                prerequisite: "infrastructure".to_string(),
                dependent: "agricultural_development".to_string(),
                rationale: "Rural roads and storage needed before scaling agricultural programs".to_string(),
            },
            InvestmentDependency {
                prerequisite: "governance_institutions".to_string(),
                dependent: "social_protection_equity".to_string(),
                rationale: "Institutional capacity needed to administer safety net programs".to_string(),
            },
        ]
    }

    fn identify_year_one_quick_wins(&self, components: &[Component]) -> Vec<String> {
        components
            .iter()
            .take(2)
            .map(|c| format!("Strengthen {} for immediate impact", c.component_type.replace("_", " ")))
            .collect()
    }

    fn recommend_financing_sources(&self, gap: f64, year: usize) -> Vec<String> {
        if gap <= 0.0 {
            return vec!["Fully funded through domestic resources".to_string()];
        }

        vec![
            format!("Multilateral development banks (World Bank, AfDB, etc.)"),
            format!("Bilateral donors and development partners"),
            if year == 1 { "Emergency/catalytic grants for quick wins".to_string() } else { "Concessional loans for infrastructure".to_string() },
            "Private sector partnerships for commercial components".to_string(),
        ]
    }

    fn generate_financing_strategy(&self, total_external: f64, years: usize) -> Vec<String> {
        vec![
            format!("Total external financing target: ${:.1}M over {} years", total_external / 1_000_000.0, years),
            "Prioritize grants for social sectors, loans for infrastructure".to_string(),
            "Establish pooled financing mechanism with development partners".to_string(),
            "Gradually increase domestic resource contribution year-over-year".to_string(),
        ]
    }
}

// Request/Response Types

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiYearPlanRequest {
    pub current_components: Vec<Component>,
    pub country_name: Option<String>,
    pub currency: Option<String>,
    pub planning_years: usize, // e.g., 5 for 5-year plan
    pub target_fsfvi: f64,      // Target to achieve by end of planning period
    pub yearly_budget_constraints: HashMap<usize, YearlyBudgetConstraint>, // Year -> constraint
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YearlyBudgetConstraint {
    pub total_budget_ceiling: f64,
    pub min_allocation_per_component: f64,
    pub max_change_percent_from_previous: Option<f64>,
    pub priority_components: Vec<String>, // Components to prioritize
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiYearStrategicPlan {
    pub baseline_fsfvi: f64,
    pub target_fsfvi: f64,
    pub planning_years: usize,
    pub target_already_achieved: bool,
    pub yearly_plans: Vec<YearlyPlan>,
    pub total_additional_investment_needed: f64,
    pub expected_outcomes: Vec<String>,
    pub implementation_risks: Vec<ImplementationRisk>,
    pub success_factors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YearlyPlan {
    pub year: usize,
    pub target_fsfvi: f64,
    pub projected_fsfvi: f64,
    pub fsfvi_reduction_from_previous: f64,
    pub on_track: bool,
    pub recommended_allocations: HashMap<String, f64>,
    #[serde(skip)] // Don't serialize full components
    pub recommended_allocations_components: Vec<Component>,
    pub total_budget: f64,
    pub key_interventions: Vec<String>,
    pub milestones: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImplementationRisk {
    pub risk_type: String,
    pub severity: String, // "high", "medium", "low"
    pub description: String,
    pub mitigation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MtefPlan {
    pub baseline_year: usize,
    pub baseline_fsfvi: f64,
    pub target_fsfvi_year_3: f64,
    pub baseline_budget: f64,
    pub year_1_plan: MtefYearPlan,
    pub year_2_plan: MtefYearPlan,
    pub year_3_plan: MtefYearPlan,
    pub fiscal_implications: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MtefYearPlan {
    pub year: usize,
    pub total_budget: f64,
    pub target_fsfvi: f64,
    pub projected_fsfvi: f64,
    pub component_allocations: HashMap<String, f64>,
    pub key_interventions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvestmentSequencingPlan {
    pub planning_years: usize,
    pub sequencing_rationale: String,
    pub phases: Vec<SequencingPhase>,
    pub dependencies: Vec<InvestmentDependency>,
    pub quick_wins_year_1: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SequencingPhase {
    pub phase_number: usize,
    pub years: Vec<usize>,
    pub focus: String,
    pub priority_components: Vec<String>,
    pub rationale: String,
    pub estimated_budget_share: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvestmentDependency {
    pub prerequisite: String,
    pub dependent: String,
    pub rationale: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceMobilizationPlan {
    pub planning_years: usize,
    pub yearly_mobilization: Vec<YearlyResourceMobilization>,
    pub total_external_financing_needed: f64,
    pub financing_strategy: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YearlyResourceMobilization {
    pub year: usize,
    pub required_total: f64,
    pub domestic_resources: f64,
    pub external_financing_needed: f64,
    pub financing_gap_percent: f64,
    pub recommended_financing_sources: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YearlyResourceCapacity {
    pub year: usize,
    pub available_domestic_resources: f64,
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
                benchmark_value: 150.0,
                financial_allocation: 1000.0,
                weight: Some(0.4),
                sensitivity_parameter: Some(0.001),
            },
            Component {
                component_id: Some("test_2".to_string()),
                component_type: "infrastructure".to_string(),
                observed_value: 80.0,
                benchmark_value: 100.0,
                financial_allocation: 500.0,
                weight: Some(0.6),
                sensitivity_parameter: Some(0.0015),
            },
        ]
    }

    #[test]
    fn test_multi_year_plan_generation() {
        let service = StrategicPlanningService::new();
        let request = MultiYearPlanRequest {
            current_components: create_test_components(),
            country_name: Some("TestCountry".to_string()),
            currency: Some("USD".to_string()),
            planning_years: 5,
            target_fsfvi: 0.15,
            yearly_budget_constraints: HashMap::new(),
        };

        let plan = service.generate_multi_year_plan(request).unwrap();
        assert!(plan.planning_years == 5);
    }
}
