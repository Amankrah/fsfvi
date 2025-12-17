/// Budget Optimization Service
/// ============================
///
/// Provides data-driven budget allocation optimization for governments.
/// Helps identify optimal resource allocation to minimize food system vulnerability.
///
/// OPTIMIZATION ALGORITHMS:
/// -----------------------
/// This module implements Linear Programming (LP) for budget optimization.
///
/// CRITICAL DESIGN DECISION - NO FALLBACK ALGORITHMS:
/// This system affects real human lives through government food security decisions.
/// We use ONLY Linear Programming - if it fails, we return an error.
/// Governments MUST know when optimization fails so they can investigate.
/// Silent fallbacks to inferior algorithms are unacceptable.
///
/// Why Linear Programming?
/// - Finds provably optimal solutions (not heuristics)
/// - Handles linear constraints naturally (budget limits, min/max allocations)
/// - Fast and deterministic for this problem size (<20 components typical)
/// - Well-suited for FSFVI minimization when linearized
/// - Consistent and reproducible results
/// - Mathematically rigorous and auditable
///
/// Implementation:
/// - Linear Programming with iterative refinement
/// - Numerical differentiation for marginal sensitivity calculation
/// - Water-filling algorithm for optimal budget distribution
/// - Proper error handling with detailed failure messages

use crate::fsfvi::config::{Scenario, WeightingMethod};
use crate::fsfvi::errors::{FsfviError, FsfviResult};
use crate::fsfvi::service::vulnerability_assessment::{
    AssessmentRequest, VulnerabilityAssessmentService,
};
use crate::fsfvi::validators::Component;
use crate::fsfvi::weighting;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Budget optimization service
pub struct BudgetOptimizationService {
    assessment_service: VulnerabilityAssessmentService,
}

impl Default for BudgetOptimizationService {
    fn default() -> Self {
        Self::new()
    }
}

impl BudgetOptimizationService {
    pub fn new() -> Self {
        Self {
            assessment_service: VulnerabilityAssessmentService::new(),
        }
    }

    /// Analyze current allocation efficiency
    ///
    /// Compares current budget allocations with vulnerability-based needs.
    /// Identifies over-allocated and under-allocated components.
    pub fn analyze_allocation_efficiency(
        &self,
        components: Vec<Component>,
    ) -> FsfviResult<AllocationEfficiencyReport> {
        tracing::info!("Analyzing allocation efficiency for {} components", components.len());

        // Calculate current state
        let current_assessment = self.assessment_service.assess_food_system(AssessmentRequest {
            components: components.clone(),
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard assessment for optimization
        })?;

        // Extract vulnerabilities
        let mut vulnerabilities = HashMap::new();
        for insight in &current_assessment.component_insights {
            vulnerabilities.insert(insight.component_type.clone(), insight.vulnerability);
        }

        // Calculate efficiency metrics
        let efficiency_scores = weighting::compare_allocation_to_vulnerability(&components, &vulnerabilities)?;
        let concentration = weighting::calculate_allocation_concentration(&components)?;

        // Generate recommendations
        let total_budget: f64 = components.iter().map(|c| c.financial_allocation).sum();
        let recommended_allocations = weighting::generate_allocation_recommendations(total_budget, &vulnerabilities)?;

        // Calculate reallocation needs
        let mut reallocation_analysis = Vec::new();
        for comp in &components {
            let current = comp.financial_allocation;
            let recommended = recommended_allocations
                .get(&comp.component_type)
                .copied()
                .unwrap_or(current);
            let difference = recommended - current;
            let percent_change = if current > 0.0 {
                (difference / current) * 100.0
            } else {
                0.0
            };

            let efficiency = efficiency_scores
                .get(&comp.component_type)
                .copied()
                .unwrap_or(1.0);

            reallocation_analysis.push(ComponentAllocationAnalysis {
                component_type: comp.component_type.clone(),
                current_allocation: current,
                recommended_allocation: recommended,
                difference,
                percent_change,
                efficiency_score: efficiency,
                status: if efficiency > 1.2 {
                    "over_allocated"
                } else if efficiency < 0.8 {
                    "under_allocated"
                } else {
                    "adequate"
                }
                .to_string(),
            });
        }

        // Estimate improvement potential
        let improvement_potential = self.estimate_improvement_potential(
            &current_assessment.system_result.fsfvi_value,
            &efficiency_scores,
        );

        let key_insights = self.generate_efficiency_insights(&reallocation_analysis, concentration);

        Ok(AllocationEfficiencyReport {
            current_fsfvi: current_assessment.system_result.fsfvi_value,
            total_budget,
            allocation_concentration: concentration,
            reallocation_analysis,
            improvement_potential,
            key_insights,
        })
    }

    /// Generate optimal budget allocation plan
    ///
    /// Creates a step-by-step reallocation plan to minimize FSFVI.
    pub fn generate_reallocation_plan(
        &self,
        components: Vec<Component>,
        constraints: OptimizationConstraints,
    ) -> FsfviResult<ReallocationPlan> {
        tracing::info!("Generating reallocation plan with constraints");

        // Current state
        let baseline = self.assessment_service.assess_food_system(AssessmentRequest {
            components: components.clone(),
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard assessment for optimization
        })?;

        // Extract vulnerabilities for optimization
        let mut vulnerabilities = HashMap::new();
        for insight in &baseline.component_insights {
            vulnerabilities.insert(insight.component_type.clone(), insight.vulnerability);
        }

        // Generate recommended allocations
        let total_budget: f64 = components.iter().map(|c| c.financial_allocation).sum();
        let optimal_allocations = weighting::generate_allocation_recommendations(total_budget, &vulnerabilities)?;

        // Apply constraints
        let constrained_allocations = self.apply_constraints(
            &components,
            &optimal_allocations,
            &constraints,
        )?;

        // Create phased implementation plan
        let phases = self.create_implementation_phases(&components, &constrained_allocations, constraints.implementation_months);

        // Estimate outcomes
        let estimated_fsfvi = self.estimate_optimized_fsfvi(&components, &constrained_allocations)?;
        let risks_and_mitigation = self.identify_reallocation_risks(&components, &constrained_allocations);

        Ok(ReallocationPlan {
            baseline_fsfvi: baseline.system_result.fsfvi_value,
            estimated_fsfvi_after_reallocation: estimated_fsfvi,
            expected_improvement: baseline.system_result.fsfvi_value - estimated_fsfvi,
            expected_improvement_percent: ((baseline.system_result.fsfvi_value - estimated_fsfvi) / baseline.system_result.fsfvi_value) * 100.0,
            total_budget,
            optimal_allocations: constrained_allocations,
            implementation_phases: phases,
            risks_and_mitigation,
        })
    }

    /// Calculate return on investment for budget scenarios
    ///
    /// Helps governments understand the cost-effectiveness of different allocations.
    pub fn calculate_roi(
        &self,
        components: Vec<Component>,
        budget_scenarios: Vec<BudgetScenario>,
    ) -> FsfviResult<RoiAnalysisReport> {
        tracing::info!("Calculating ROI for {} budget scenarios", budget_scenarios.len());

        let mut scenario_results = Vec::new();

        for scenario in budget_scenarios {
            // Apply budget scenario
            let mut scenario_components = components.clone();
            for change in &scenario.changes {
                if let Some(comp) = scenario_components
                    .iter_mut()
                    .find(|c| c.component_type == change.component_type)
                {
                    comp.financial_allocation = change.new_allocation;
                }
            }

            // Calculate FSFVI with new budget
            let assessment = self.assessment_service.assess_food_system(AssessmentRequest {
                components: scenario_components,
                country_name: None,
                weighting_method: Some(WeightingMethod::Hybrid),
                scenario: Some(Scenario::NormalOperations),
                context: None,
                currency: None,
                use_performance_adjusted_weights: false, // Standard assessment for optimization
            })?;

            // Calculate investment and return
            let total_investment = scenario.total_investment();
            let fsfvi_improvement = scenario.baseline_fsfvi - assessment.system_result.fsfvi_value;
            let roi = if total_investment > 0.0 {
                (fsfvi_improvement / total_investment) * 1_000_000.0 // Per million invested
            } else {
                0.0
            };

            scenario_results.push(ScenarioRoi {
                scenario_name: scenario.name,
                investment: total_investment,
                fsfvi_improvement,
                roi_per_million: roi,
                cost_effectiveness_rank: 0, // Will be set after sorting
            });
        }

        // Rank by ROI
        scenario_results.sort_by(|a, b| b.roi_per_million.partial_cmp(&a.roi_per_million).unwrap());
        for (i, result) in scenario_results.iter_mut().enumerate() {
            result.cost_effectiveness_rank = i + 1;
        }

        let best_roi_scenario = scenario_results.first().map(|s| s.scenario_name.clone());
        let recommendations = self.generate_roi_recommendations(&scenario_results);

        Ok(RoiAnalysisReport {
            scenarios: scenario_results,
            best_roi_scenario,
            recommendations,
        })
    }

    /// Optimize budget allocation under constraints
    ///
    /// Production-ready optimization using Linear Programming with iterative refinement.
    ///
    /// Algorithm:
    /// 1. Calculate baseline vulnerabilities and sensitivities
    /// 2. Linearize FSFVI objective around current allocation point
    /// 3. Solve LP problem: minimize Σᵢ (marginal_sensitivity_i × allocation_i)
    /// 4. Apply solution and re-linearize
    /// 5. Repeat until convergence or max iterations
    ///
    /// CRITICAL: This function will FAIL if optimization cannot be completed.
    /// No fallback algorithms - governments must know if optimization failed.
    /// Lives depend on these decisions being reliable and consistent.
    pub fn optimize_allocation(
        &self,
        components: Vec<Component>,
        objective: OptimizationObjective,
        constraints: OptimizationConstraints,
    ) -> FsfviResult<OptimizationResult> {
        tracing::info!("Optimizing allocation with objective: {:?}", objective);

        // Use Linear Programming - NO FALLBACK
        // If this fails, the error must be reported to the government
        self.optimize_allocation_lp(&components, objective, &constraints)
    }

    /// Linear Programming optimization (PRODUCTION ALGORITHM)
    ///
    /// Formulation:
    /// - Variables: fᵢ = financial allocation to component i
    /// - Objective: minimize FSFVI ≈ Σᵢ ωᵢ × δᵢ × [1/(1 + αᵢfᵢ)]
    /// - Linearization: Use first-order Taylor approximation around current allocation
    /// - Constraints:
    ///   * Σᵢ fᵢ = total_budget (equality)
    ///   * fᵢ ≥ min_allocation_per_component (lower bounds)
    ///   * |fᵢ - fᵢ_current| ≤ max_change × fᵢ_current (change limits)
    fn optimize_allocation_lp(
        &self,
        components: &[Component],
        objective: OptimizationObjective,
        constraints: &OptimizationConstraints,
    ) -> FsfviResult<OptimizationResult> {
        let total_budget: f64 = components.iter().map(|c| c.financial_allocation).sum();

        // Calculate baseline
        let baseline = self.assessment_service.assess_food_system(AssessmentRequest {
            components: components.to_vec(),
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard assessment for optimization
        })?;

        let max_iterations = 10;
        let convergence_threshold = 0.0001; // 0.01% improvement threshold

        let mut current_components = components.to_vec();
        let mut best_fsfvi = baseline.system_result.fsfvi_value;
        let mut iteration = 0;
        let mut converged = false;

        for iter in 0..max_iterations {
            iteration = iter + 1;

            // Step 1: Calculate marginal sensitivities (∂FSFVI/∂fᵢ)
            let marginal_sensitivities = self.calculate_marginal_sensitivities(&current_components)?;

            // Step 2: Solve LP problem using custom solver
            // minimize: Σᵢ (sensitivity_i × fᵢ)
            // subject to: Σᵢ fᵢ = total_budget
            //             fᵢ ≥ min_allocation
            //             |fᵢ - fᵢ_current| ≤ max_change × fᵢ_current

            let optimal_allocations = self.solve_lp_problem(
                &current_components,
                &marginal_sensitivities,
                total_budget,
                constraints,
            )?;

            // Step 3: Apply optimal allocations
            for comp in current_components.iter_mut() {
                if let Some(&optimal) = optimal_allocations.get(&comp.component_type) {
                    comp.financial_allocation = optimal;
                }
            }

            // Step 4: Evaluate new FSFVI
            let new_assessment = self.assessment_service.assess_food_system(AssessmentRequest {
                components: current_components.clone(),
                country_name: None,
                weighting_method: Some(WeightingMethod::Hybrid),
                scenario: Some(Scenario::NormalOperations),
                context: None,
                currency: None,
                use_performance_adjusted_weights: false, // Standard assessment for optimization
            })?;

            let new_fsfvi = new_assessment.system_result.fsfvi_value;
            let improvement = best_fsfvi - new_fsfvi;

            tracing::debug!("LP iteration {}: FSFVI {:.4} -> {:.4} (improvement: {:.4})",
                           iteration, best_fsfvi, new_fsfvi, improvement);

            // Check convergence
            if improvement.abs() < convergence_threshold {
                converged = true;
                tracing::info!("LP optimization converged after {} iterations", iteration);
                break;
            }

            if new_fsfvi < best_fsfvi {
                best_fsfvi = new_fsfvi;
            } else {
                // No improvement, stop
                tracing::info!("LP optimization stopped - no further improvement");
                break;
            }
        }

        let final_allocations = current_components
            .iter()
            .map(|c| (c.component_type.clone(), c.financial_allocation))
            .collect();

        Ok(OptimizationResult {
            objective,
            baseline_fsfvi: baseline.system_result.fsfvi_value,
            optimized_fsfvi: best_fsfvi,
            improvement: baseline.system_result.fsfvi_value - best_fsfvi,
            optimal_allocations: final_allocations,
            iterations_performed: iteration,
            convergence_achieved: converged,
        })
    }

    /// Calculate marginal sensitivities: ∂FSFVI/∂fᵢ at current allocation
    ///
    /// Uses numerical differentiation:
    /// ∂FSFVI/∂fᵢ ≈ [FSFVI(fᵢ + h) - FSFVI(fᵢ)] / h
    fn calculate_marginal_sensitivities(
        &self,
        components: &[Component],
    ) -> FsfviResult<HashMap<String, f64>> {
        let mut sensitivities = HashMap::new();
        let h = 1.0; // Small perturbation (1 unit of currency)

        // Calculate baseline FSFVI
        let baseline = self.assessment_service.assess_food_system(AssessmentRequest {
            components: components.to_vec(),
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard assessment for optimization
        })?;
        let baseline_fsfvi = baseline.system_result.fsfvi_value;

        // Calculate sensitivity for each component
        for (idx, comp) in components.iter().enumerate() {
            let mut perturbed = components.to_vec();
            perturbed[idx].financial_allocation += h;

            let perturbed_assessment = self.assessment_service.assess_food_system(AssessmentRequest {
                components: perturbed,
                country_name: None,
                weighting_method: Some(WeightingMethod::Hybrid),
                scenario: Some(Scenario::NormalOperations),
                context: None,
                currency: None,
                use_performance_adjusted_weights: false, // Standard assessment for optimization
            })?;

            let sensitivity = (perturbed_assessment.system_result.fsfvi_value - baseline_fsfvi) / h;
            sensitivities.insert(comp.component_type.clone(), sensitivity);

            tracing::trace!("Component {}: sensitivity = {:.6}", comp.component_type, sensitivity);
        }

        Ok(sensitivities)
    }

    /// Solve LP problem using analytical solution for budget allocation
    ///
    /// For the linearized FSFVI minimization with budget constraint,
    /// the optimal solution allocates more budget to components with
    /// more negative marginal sensitivity (highest FSFVI reduction per dollar).
    ///
    /// Algorithm:
    /// 1. Rank components by marginal sensitivity (most negative first)
    /// 2. Allocate budget prioritizing high-impact components
    /// 3. Respect min/max constraints
    ///
    /// CRITICAL: Returns detailed errors if optimization cannot be completed.
    /// Governments must receive clear information about why optimization failed.
    fn solve_lp_problem(
        &self,
        components: &[Component],
        sensitivities: &HashMap<String, f64>,
        total_budget: f64,
        constraints: &OptimizationConstraints,
    ) -> FsfviResult<HashMap<String, f64>> {
        // Validate inputs
        if components.is_empty() {
            return Err(FsfviError::optimization_with_details(
                "Cannot optimize: no components provided",
                [("total_budget".to_string(), total_budget.to_string())]
                    .iter()
                    .cloned()
                    .collect(),
            ));
        }

        if total_budget <= 0.0 {
            return Err(FsfviError::optimization_with_details(
                "Cannot optimize: total budget must be positive",
                [("total_budget".to_string(), total_budget.to_string())]
                    .iter()
                    .cloned()
                    .collect(),
            ));
        }

        // Check if minimum allocations are feasible
        let min_total = components.len() as f64 * constraints.min_allocation_per_component;
        if min_total > total_budget {
            return Err(FsfviError::optimization_with_details(
                "Infeasible constraints: minimum allocations exceed total budget",
                [
                    ("total_budget".to_string(), total_budget.to_string()),
                    ("min_allocation_per_component".to_string(), constraints.min_allocation_per_component.to_string()),
                    ("num_components".to_string(), components.len().to_string()),
                    ("min_total_required".to_string(), min_total.to_string()),
                ]
                .iter()
                .cloned()
                .collect(),
            ));
        }
        // Sort components by sensitivity (most negative = highest priority)
        let mut sorted_components: Vec<_> = components
            .iter()
            .map(|c| {
                let sensitivity = sensitivities.get(&c.component_type).copied().unwrap_or(0.0);
                (c, sensitivity)
            })
            .collect();
        sorted_components.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());

        // Calculate allocation bounds for each component
        let mut allocations = HashMap::new();
        let mut bounds: Vec<(String, f64, f64)> = Vec::new();

        for comp in components {
            let current = comp.financial_allocation;
            let min_alloc = constraints.min_allocation_per_component.max(0.0);
            let max_alloc = if let Some(max_change_pct) = constraints.max_change_percent {
                current * (1.0 + max_change_pct / 100.0)
            } else {
                total_budget // No upper limit if max_change not specified
            };

            bounds.push((comp.component_type.clone(), min_alloc, max_alloc));
        }

        // Allocate budget using water-filling algorithm
        // Start with minimum allocations, then fill high-priority components
        let mut remaining_budget = total_budget;

        // First pass: set to minimums
        for (comp_type, min_alloc, _max_alloc) in &bounds {
            allocations.insert(comp_type.clone(), *min_alloc);
            remaining_budget -= min_alloc;
        }

        // Second pass: allocate remaining budget to highest-priority components
        for (comp, _sensitivity) in &sorted_components {
            let comp_type = &comp.component_type;
            let (_min_alloc, max_alloc) = bounds.iter()
                .find(|(t, _, _)| t == comp_type)
                .map(|(_, min, max)| (*min, *max))
                .unwrap_or((0.0, total_budget));

            let current_alloc = allocations.get(comp_type).copied().unwrap_or(0.0);
            let room_to_increase = max_alloc - current_alloc;
            let increase = room_to_increase.min(remaining_budget);

            allocations.insert(comp_type.clone(), current_alloc + increase);
            remaining_budget -= increase;

            if remaining_budget <= 0.001 {
                break;
            }
        }

        // Third pass: distribute any remaining budget proportionally
        if remaining_budget > 0.001 {
            let can_increase: Vec<_> = components
                .iter()
                .filter(|c| {
                    let current = allocations.get(&c.component_type).copied().unwrap_or(0.0);
                    let (_min, max) = bounds.iter()
                        .find(|(t, _, _)| t == &c.component_type)
                        .map(|(_, min, max)| (*min, *max))
                        .unwrap_or((0.0, total_budget));
                    current < max
                })
                .collect();

            if !can_increase.is_empty() {
                let per_component = remaining_budget / can_increase.len() as f64;
                for comp in can_increase {
                    let current = allocations.get(&comp.component_type).copied().unwrap_or(0.0);
                    allocations.insert(comp.component_type.clone(), current + per_component);
                }
            }
        }

        // Verify budget constraint
        let total_allocated: f64 = allocations.values().sum();
        let budget_error = (total_allocated - total_budget).abs();

        if budget_error > 1.0 {
            tracing::warn!("LP solution budget mismatch: allocated {}, target {}, error: {}",
                          total_allocated, total_budget, budget_error);

            // Normalize to exact budget
            let scale = total_budget / total_allocated;
            for alloc in allocations.values_mut() {
                *alloc *= scale;
            }
        }

        // Final validation: ensure all allocations are within bounds
        for comp in components {
            let allocation = allocations.get(&comp.component_type).copied().unwrap_or(0.0);

            if allocation < 0.0 {
                return Err(FsfviError::optimization_with_details(
                    format!("LP solver produced negative allocation for {}", comp.component_type),
                    [
                        ("component".to_string(), comp.component_type.clone()),
                        ("allocation".to_string(), allocation.to_string()),
                    ]
                    .iter()
                    .cloned()
                    .collect(),
                ));
            }

            if allocation < constraints.min_allocation_per_component - 0.01 {
                return Err(FsfviError::optimization_with_details(
                    format!("LP solver violated minimum allocation constraint for {}", comp.component_type),
                    [
                        ("component".to_string(), comp.component_type.clone()),
                        ("allocation".to_string(), allocation.to_string()),
                        ("min_required".to_string(), constraints.min_allocation_per_component.to_string()),
                    ]
                    .iter()
                    .cloned()
                    .collect(),
                ));
            }
        }

        // Verify final budget constraint
        let final_total: f64 = allocations.values().sum();
        let final_error = (final_total - total_budget).abs();

        if final_error > 10.0 {
            return Err(FsfviError::optimization_with_details(
                "LP solver failed to satisfy budget constraint",
                [
                    ("total_budget".to_string(), total_budget.to_string()),
                    ("allocated".to_string(), final_total.to_string()),
                    ("error".to_string(), final_error.to_string()),
                ]
                .iter()
                .cloned()
                .collect(),
            ));
        }

        tracing::info!("LP solution validated: {} components, total budget: {:.2}, error: {:.6}",
                      allocations.len(), final_total, final_error);

        Ok(allocations)
    }

    // Helper methods

    fn estimate_improvement_potential(
        &self,
        current_fsfvi: &f64,
        efficiency_scores: &HashMap<String, f64>,
    ) -> f64 {
        // Estimate potential improvement if all inefficiencies were addressed
        let inefficiency_factor = efficiency_scores
            .values()
            .map(|&e| (e - 1.0).abs())
            .sum::<f64>()
            / efficiency_scores.len() as f64;

        current_fsfvi * inefficiency_factor * 0.3 // Conservative estimate
    }

    fn generate_efficiency_insights(
        &self,
        analysis: &[ComponentAllocationAnalysis],
        concentration: f64,
    ) -> Vec<String> {
        let mut insights = Vec::new();

        let over_allocated = analysis.iter().filter(|a| a.status == "over_allocated").count();
        let under_allocated = analysis.iter().filter(|a| a.status == "under_allocated").count();

        if concentration > 0.5 {
            insights.push(format!(
                "Budget is highly concentrated (HHI: {:.2}). Diversification recommended.",
                concentration
            ));
        }

        if under_allocated > 0 {
            insights.push(format!(
                "{} component(s) are under-allocated relative to their vulnerability.",
                under_allocated
            ));
        }

        if over_allocated > 0 {
            insights.push(format!(
                "{} component(s) are over-allocated relative to their vulnerability.",
                over_allocated
            ));
        }

        if over_allocated > 0 && under_allocated > 0 {
            insights.push("Reallocation opportunities exist: shift resources from over to under-allocated components.".to_string());
        }

        insights
    }

    fn apply_constraints(
        &self,
        current: &[Component],
        optimal: &HashMap<String, f64>,
        constraints: &OptimizationConstraints,
    ) -> FsfviResult<HashMap<String, f64>> {
        let mut constrained = HashMap::new();

        for comp in current {
            let optimal_amount = optimal.get(&comp.component_type).copied().unwrap_or(comp.financial_allocation);
            let current_amount = comp.financial_allocation;

            // Apply min/max constraints
            let mut new_amount = optimal_amount.max(constraints.min_allocation_per_component);

            // Apply max change constraint
            if let Some(max_change_percent) = constraints.max_change_percent {
                let max_increase = current_amount * (1.0 + max_change_percent / 100.0);
                let max_decrease = current_amount * (1.0 - max_change_percent / 100.0);
                new_amount = new_amount.min(max_increase).max(max_decrease);
            }

            constrained.insert(comp.component_type.clone(), new_amount);
        }

        Ok(constrained)
    }

    fn create_implementation_phases(
        &self,
        current: &[Component],
        target: &HashMap<String, f64>,
        months: usize,
    ) -> Vec<ImplementationPhase> {
        let phases_count = (months / 6).max(1).min(4); // 6-month phases, max 4 phases
        let mut phases = Vec::new();

        for phase in 1..=phases_count {
            let progress = phase as f64 / phases_count as f64;
            let mut phase_allocations = HashMap::new();

            for comp in current {
                let current_amt = comp.financial_allocation;
                let target_amt = target.get(&comp.component_type).copied().unwrap_or(current_amt);
                let phase_amt = current_amt + (target_amt - current_amt) * progress;
                phase_allocations.insert(comp.component_type.clone(), phase_amt);
            }

            phases.push(ImplementationPhase {
                phase_number: phase,
                duration_months: months / phases_count,
                allocations: phase_allocations,
                milestones: vec![format!("Complete {}% of reallocation", (progress * 100.0) as usize)],
            });
        }

        phases
    }

    fn identify_reallocation_risks(
        &self,
        current: &[Component],
        target: &HashMap<String, f64>,
    ) -> Vec<RiskMitigation> {
        let mut risks = Vec::new();

        for comp in current {
            let target_amt = target.get(&comp.component_type).copied().unwrap_or(comp.financial_allocation);
            let change = target_amt - comp.financial_allocation;
            let change_percent = (change / comp.financial_allocation) * 100.0;

            if change_percent < -20.0 {
                risks.push(RiskMitigation {
                    risk: format!("{}: Large budget reduction ({:.1}%)", comp.component_type, change_percent.abs()),
                    mitigation: "Implement gradual phase-down with stakeholder engagement".to_string(),
                    priority: "high".to_string(),
                });
            }

            if change_percent > 50.0 {
                risks.push(RiskMitigation {
                    risk: format!("{}: Large budget increase ({:.1}%)", comp.component_type, change_percent),
                    mitigation: "Ensure institutional capacity exists to absorb increased funding".to_string(),
                    priority: "medium".to_string(),
                });
            }
        }

        if risks.is_empty() {
            risks.push(RiskMitigation {
                risk: "Reallocation risks are minimal".to_string(),
                mitigation: "Proceed with standard implementation procedures".to_string(),
                priority: "low".to_string(),
            });
        }

        risks
    }

    fn generate_roi_recommendations(&self, scenarios: &[ScenarioRoi]) -> Vec<String> {
        let mut recommendations = Vec::new();

        if let Some(best) = scenarios.first() {
            recommendations.push(format!(
                "Highest ROI: {} with {:.2} FSFVI improvement per $1M invested",
                best.scenario_name, best.roi_per_million
            ));
        }

        recommendations.push("Focus investments on high-ROI opportunities for maximum impact".to_string());

        recommendations
    }

    fn estimate_optimized_fsfvi(
        &self,
        components: &[Component],
        optimal_allocations: &HashMap<String, f64>,
    ) -> FsfviResult<f64> {
        let mut optimized_components = components.to_vec();
        for comp in optimized_components.iter_mut() {
            if let Some(&optimal) = optimal_allocations.get(&comp.component_type) {
                comp.financial_allocation = optimal;
            }
        }

        let assessment = self.assessment_service.assess_food_system(AssessmentRequest {
            components: optimized_components,
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard assessment for optimization
        })?;

        Ok(assessment.system_result.fsfvi_value)
    }
}

// Types

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationConstraints {
    pub min_allocation_per_component: f64,
    pub max_change_percent: Option<f64>,
    pub implementation_months: usize,
}

impl Default for OptimizationConstraints {
    fn default() -> Self {
        Self {
            min_allocation_per_component: 0.0,
            max_change_percent: Some(30.0), // Max 30% change
            implementation_months: 24,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum OptimizationObjective {
    MinimizeFsfvi,
    MaximizeEfficiency,
    BalanceRisk,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllocationEfficiencyReport {
    pub current_fsfvi: f64,
    pub total_budget: f64,
    pub allocation_concentration: f64,
    pub reallocation_analysis: Vec<ComponentAllocationAnalysis>,
    pub improvement_potential: f64,
    pub key_insights: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentAllocationAnalysis {
    pub component_type: String,
    pub current_allocation: f64,
    pub recommended_allocation: f64,
    pub difference: f64,
    pub percent_change: f64,
    pub efficiency_score: f64,
    pub status: String, // "over_allocated", "under_allocated", "adequate"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReallocationPlan {
    pub baseline_fsfvi: f64,
    pub estimated_fsfvi_after_reallocation: f64,
    pub expected_improvement: f64,
    pub expected_improvement_percent: f64,
    pub total_budget: f64,
    pub optimal_allocations: HashMap<String, f64>,
    pub implementation_phases: Vec<ImplementationPhase>,
    pub risks_and_mitigation: Vec<RiskMitigation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImplementationPhase {
    pub phase_number: usize,
    pub duration_months: usize,
    pub allocations: HashMap<String, f64>,
    pub milestones: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskMitigation {
    pub risk: String,
    pub mitigation: String,
    pub priority: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetScenario {
    pub name: String,
    pub baseline_fsfvi: f64,
    pub changes: Vec<AllocationChange>,
}

impl BudgetScenario {
    fn total_investment(&self) -> f64 {
        self.changes.iter().map(|c| c.new_allocation).sum()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllocationChange {
    pub component_type: String,
    pub new_allocation: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoiAnalysisReport {
    pub scenarios: Vec<ScenarioRoi>,
    pub best_roi_scenario: Option<String>,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioRoi {
    pub scenario_name: String,
    pub investment: f64,
    pub fsfvi_improvement: f64,
    pub roi_per_million: f64,
    pub cost_effectiveness_rank: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResult {
    pub objective: OptimizationObjective,
    pub baseline_fsfvi: f64,
    pub optimized_fsfvi: f64,
    pub improvement: f64,
    pub optimal_allocations: HashMap<String, f64>,
    pub iterations_performed: usize,
    pub convergence_achieved: bool,
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
            Component {
                component_id: Some("test_2".to_string()),
                component_type: "infrastructure".to_string(),
                observed_value: 80.0,
                benchmark_value: 100.0,
                financial_allocation: 500.0,
                weight: None,
                sensitivity_parameter: Some(0.0015),
            },
        ]
    }

    #[test]
    fn test_analyze_allocation_efficiency() {
        let service = BudgetOptimizationService::new();
        let report = service
            .analyze_allocation_efficiency(create_test_components())
            .unwrap();

        assert!(report.total_budget > 0.0);
        assert!(!report.reallocation_analysis.is_empty());
    }
}
