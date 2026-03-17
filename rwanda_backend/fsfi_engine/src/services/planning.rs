//! Strategic Planning Service
//! ==========================
//!
//! Multi-year planning and MTEF (Medium-Term Expenditure Framework) aligned with
//! the Food System Financing Stress Index (FSFSI) methodology.
//!
//! - **Multi-year plan**: Year-by-year budget trajectory to achieve a target FSFSI.
//! - **MTEF**: Standard 3-year rolling framework with target improvement % and budget growth.
//!
//! Uses existing engine: optimal allocation (core), system FSFSI (core), component vectors (optimization).

use crate::core::calculations::{
    calculate_optimal_allocation, calculate_system_fsfsi, round_to_precision,
};
use crate::errors::{FsfiError, FsfiResult};
use crate::services::assessment::ComponentInput;
use crate::services::optimization::get_component_vectors;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// Request / Response types (JSON-serializable for Django)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiYearPlanRequest {
    pub current_components: Vec<ComponentInput>,
    #[serde(default)]
    pub country_name: Option<String>,
    #[serde(default)]
    pub currency: Option<String>,
    pub planning_years: usize,
    pub target_fsfvi: f64,
    /// Year -> constraint; keys are strings in JSON ("1", "2", ...).
    #[serde(default)]
    pub yearly_budget_constraints: HashMap<String, YearlyBudgetConstraint>,
    /// When no constraint per year: year_budget = baseline_budget * (1 + rate)^year. Default 0.05 (5%).
    #[serde(default)]
    pub yearly_budget_growth_rate: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YearlyBudgetConstraint {
    pub total_budget_ceiling: f64,
    #[serde(default)]
    pub min_allocation_per_component: f64,
    pub max_change_percent_from_previous: Option<f64>,
    #[serde(default)]
    pub priority_components: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiYearStrategicPlan {
    pub baseline_fsfvi: f64,
    pub target_fsfvi: f64,
    pub planning_years: usize,
    pub target_already_achieved: bool,
    pub yearly_plans: Vec<YearlyPlanOutput>,
    pub total_additional_investment_needed: f64,
    pub expected_outcomes: Vec<String>,
    pub implementation_risks: Vec<ImplementationRisk>,
    pub success_factors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YearlyPlanOutput {
    pub year: usize,
    pub target_fsfvi: f64,
    pub projected_fsfvi: f64,
    pub fsfvi_reduction_from_previous: f64,
    pub on_track: bool,
    pub recommended_allocations: HashMap<String, f64>,
    pub total_budget: f64,
    pub key_interventions: Vec<String>,
    pub milestones: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImplementationRisk {
    pub risk_type: String,
    pub severity: String,
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

// ---------------------------------------------------------------------------
// Multi-year plan
// ---------------------------------------------------------------------------

pub fn generate_multi_year_plan(request: MultiYearPlanRequest) -> FsfiResult<MultiYearStrategicPlan> {
    validate_plan_request(&request)?;

    let (gaps, allocs_m, sensitivities, weights) =
        get_component_vectors(&request.current_components)?;
    let baseline_fsfvi =
        calculate_system_fsfsi(&gaps, &allocs_m, &sensitivities, &weights)?;
    let baseline_budget: f64 = request
        .current_components
        .iter()
        .map(|c| c.financial_allocation_usd)
        .sum();

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

    let total_reduction = baseline_fsfvi - request.target_fsfvi;
    let annual_reduction = total_reduction / request.planning_years as f64;

    let mut yearly_plans = Vec::with_capacity(request.planning_years);
    let mut current_components = request.current_components.clone();
    let mut cumulative_fsfvi = baseline_fsfvi;

    let growth_rate = request.yearly_budget_growth_rate.unwrap_or(0.05);
    for year in 1..=request.planning_years {
        let year_target_fsfvi = baseline_fsfvi - (annual_reduction * year as f64);
        let year_budget = request
            .yearly_budget_constraints
            .get(&year.to_string())
            .map(|c| c.total_budget_ceiling)
            .unwrap_or_else(|| baseline_budget * (1.0 + growth_rate).powi(year as i32));

        let plan = plan_single_year(
            &current_components,
            year,
            year_target_fsfvi,
            cumulative_fsfvi,
            year_budget,
        )?;

        cumulative_fsfvi = plan.projected_fsfvi;
        current_components = plan.updated_components.clone();
        yearly_plans.push(plan.output);
    }

    let final_budget = yearly_plans
        .last()
        .map(|p| p.total_budget)
        .unwrap_or(baseline_budget);
    let total_additional = final_budget - baseline_budget;

    let implementation_risks = identify_risks(&yearly_plans, baseline_fsfvi);
    let success_factors = vec![
        "Political commitment across electoral cycles".to_string(),
        "Adequate and predictable financing".to_string(),
        "Strong M&E for course correction".to_string(),
        "Coordination across sectors".to_string(),
    ];
    let expected_outcomes = generate_outcomes(&yearly_plans, baseline_fsfvi, request.target_fsfvi);

    Ok(MultiYearStrategicPlan {
        baseline_fsfvi,
        target_fsfvi: request.target_fsfvi,
        planning_years: request.planning_years,
        target_already_achieved: false,
        yearly_plans,
        total_additional_investment_needed: total_additional,
        expected_outcomes,
        implementation_risks,
        success_factors,
    })
}

// ---------------------------------------------------------------------------
// MTEF (3-year)
// ---------------------------------------------------------------------------

pub fn generate_mtef(
    current_components: Vec<ComponentInput>,
    target_fsfvi_improvement_percent: f64,
    yearly_budget_growth_rate: f64,
) -> FsfiResult<MtefPlan> {
    let (gaps, allocs_m, sensitivities, weights) = get_component_vectors(&current_components)?;
    let baseline_fsfvi = calculate_system_fsfsi(&gaps, &allocs_m, &sensitivities, &weights)?;
    let baseline_budget: f64 = current_components.iter().map(|c| c.financial_allocation_usd).sum();
    let target_fsfvi = baseline_fsfvi * (1.0 - target_fsfvi_improvement_percent / 100.0);

    let mut year_plans = Vec::with_capacity(3);
    let mut components = current_components.clone();

    for year in 1..=3 {
        let year_budget = baseline_budget * (1.0 + yearly_budget_growth_rate).powi(year as i32);
        let year_target = baseline_fsfvi
            - (baseline_fsfvi - target_fsfvi) * (year as f64 / 3.0);

        let plan = plan_single_year(
            &components,
            year,
            year_target,
            baseline_fsfvi,
            year_budget,
        )?;
        let mtef_year = plan.mtef_year_plan();
        components = plan.updated_components;
        year_plans.push(mtef_year);
    }

    let y3_budget = year_plans[2].total_budget;
    let fiscal_implications = vec![
        format!(
            "Total budget increase over 3 years: {:.1}%",
            (y3_budget - baseline_budget) / baseline_budget * 100.0
        ),
        "Requires sustained resource mobilization and donor coordination".to_string(),
    ];

    Ok(MtefPlan {
        baseline_year: 0,
        baseline_fsfvi,
        target_fsfvi_year_3: target_fsfvi,
        baseline_budget,
        year_1_plan: year_plans[0].clone(),
        year_2_plan: year_plans[1].clone(),
        year_3_plan: year_plans[2].clone(),
        fiscal_implications,
    })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

struct PlanSingleYearResult {
    output: YearlyPlanOutput,
    updated_components: Vec<ComponentInput>,
    projected_fsfvi: f64,
}

impl PlanSingleYearResult {
    fn mtef_year_plan(&self) -> MtefYearPlan {
        MtefYearPlan {
            year: self.output.year,
            total_budget: self.output.total_budget,
            target_fsfvi: self.output.target_fsfvi,
            projected_fsfvi: self.output.projected_fsfvi,
            component_allocations: self.output.recommended_allocations.clone(),
            key_interventions: self.output.key_interventions.clone(),
        }
    }
}

fn plan_single_year(
    current: &[ComponentInput],
    year: usize,
    year_target_fsfvi: f64,
    current_fsfvi: f64,
    total_budget_usd: f64,
) -> FsfiResult<PlanSingleYearResult> {
    let (gaps, _allocs_m, sensitivities, weights) = get_component_vectors(current)?;
    let total_budget_m = total_budget_usd / 1_000_000.0;

    let optimal_allocs =
        calculate_optimal_allocation(&gaps, &sensitivities, &weights, total_budget_m)?;
    let projected_fsfvi =
        calculate_system_fsfsi(&gaps, &optimal_allocs, &sensitivities, &weights)?;

    let reduction = current_fsfvi - projected_fsfvi;
    let on_track = projected_fsfvi <= year_target_fsfvi + 0.02;

    let recommended_allocations: HashMap<String, f64> = current
        .iter()
        .enumerate()
        .map(|(i, c)| {
            let usd = optimal_allocs[i] * 1_000_000.0;
            (c.component_type.clone(), round_to_precision(usd, Some(0)))
        })
        .collect();

    let updated_components: Vec<ComponentInput> = current
        .iter()
        .enumerate()
        .map(|(i, c)| ComponentInput {
            financial_allocation_usd: optimal_allocs[i] * 1_000_000.0,
            ..c.clone()
        })
        .collect();

    let key_interventions = current
        .iter()
        .take(3)
        .map(|c| {
            format!(
                "Year {}: Strengthen {}",
                year,
                c.component_type.replace('_', " ")
            )
        })
        .collect();

    let output = YearlyPlanOutput {
        year,
        target_fsfvi: year_target_fsfvi,
        projected_fsfvi,
        fsfvi_reduction_from_previous: reduction,
        on_track,
        recommended_allocations,
        total_budget: total_budget_usd,
        key_interventions,
        milestones: vec![
            "Q2: Mid-year review and budget adjustment".to_string(),
            "Q4: Annual assessment and next year planning".to_string(),
        ],
    };

    Ok(PlanSingleYearResult {
        output,
        updated_components,
        projected_fsfvi,
    })
}

fn validate_plan_request(request: &MultiYearPlanRequest) -> FsfiResult<()> {
    if request.planning_years == 0 {
        return Err(FsfiError::Validation {
            message: "Planning years must be greater than 0".to_string(),
            details: HashMap::new(),
        });
    }
    if request.planning_years > 20 {
        let mut d = HashMap::new();
        d.insert("requested_years".to_string(), request.planning_years.to_string());
        return Err(FsfiError::Validation {
            message: "Planning period too long (max 20 years)".to_string(),
            details: d,
        });
    }
    if request.target_fsfvi < 0.0 || request.target_fsfvi > 1.0 {
        let mut d = HashMap::new();
        d.insert(
            "target_fsfvi".to_string(),
            request.target_fsfvi.to_string(),
        );
        return Err(FsfiError::Validation {
            message: "Target FSFSI must be between 0.0 and 1.0".to_string(),
            details: d,
        });
    }
    if request.current_components.is_empty() {
        return Err(FsfiError::Validation {
            message: "At least one component required".to_string(),
            details: HashMap::new(),
        });
    }
    Ok(())
}

fn identify_risks(plans: &[YearlyPlanOutput], _baseline: f64) -> Vec<ImplementationRisk> {
    let mut risks = Vec::new();
    let n = plans.len() as f64;
    if n > 0.0 {
        let avg_reduction: f64 = plans.iter().map(|p| p.fsfvi_reduction_from_previous).sum::<f64>() / n;
        if avg_reduction > 0.10 {
            risks.push(ImplementationRisk {
                risk_type: "ambitious_targets".to_string(),
                severity: "high".to_string(),
                description: format!(
                    "Average annual FSFSI reduction of {:.1}% is very ambitious",
                    avg_reduction * 100.0
                ),
                mitigation: "Build in contingency, strengthen M&E, ensure political commitment".to_string(),
            });
        }
    }
    if plans.windows(2).any(|w| (w[1].total_budget - w[0].total_budget).abs() / w[0].total_budget > 0.3) {
        risks.push(ImplementationRisk {
            risk_type: "budget_volatility".to_string(),
            severity: "medium".to_string(),
            description: "Large year-to-year budget changes may be fiscally challenging".to_string(),
            mitigation: "Smooth trajectory, explore multi-year donor commitments".to_string(),
        });
    }
    risks
}

fn generate_outcomes(
    plans: &[YearlyPlanOutput],
    baseline: f64,
    target: f64,
) -> Vec<String> {
    let mut out = Vec::new();
    if let Some(final_plan) = plans.last() {
        let reduction_pct = (baseline - final_plan.projected_fsfvi) / baseline * 100.0;
        out.push(format!(
            "FSFSI reduction from {:.4} to {:.4} ({:.1}% improvement)",
            baseline,
            final_plan.projected_fsfvi,
            reduction_pct
        ));
        if final_plan.projected_fsfvi <= target {
            out.push("Target achieved within planning horizon".to_string());
        }
    }
    out.push("Improved food security and nutrition outcomes".to_string());
    out.push("Strengthened resilience to shocks".to_string());
    out
}

// ---------------------------------------------------------------------------
// PyO3
// ---------------------------------------------------------------------------

use pyo3::prelude::*;

#[pyfunction]
pub fn py_generate_multi_year_plan(request_json: &str) -> PyResult<String> {
    let request: MultiYearPlanRequest = serde_json::from_str(request_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid JSON: {}", e)))?;
    let result = generate_multi_year_plan(request)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;
    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

#[pyfunction]
pub fn py_generate_mtef(
    components_json: &str,
    target_fsfvi_improvement_percent: f64,
    yearly_budget_growth_rate: f64,
) -> PyResult<String> {
    let components: Vec<ComponentInput> = serde_json::from_str(components_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid JSON: {}", e)))?;
    let result = generate_mtef(
        components,
        target_fsfvi_improvement_percent,
        yearly_budget_growth_rate,
    )
    .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;
    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

pub fn register_functions(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(pyo3::wrap_pyfunction!(py_generate_multi_year_plan, m)?)?;
    m.add_function(pyo3::wrap_pyfunction!(py_generate_mtef, m)?)?;
    Ok(())
}
