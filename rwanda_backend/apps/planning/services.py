"""
Planning Service – multi-year strategic plan and MTEF.

The assessment engine is the single source of truth for FSFSI scores.
Planning uses the CUMULATIVE stress as the baseline (accumulated damage)
and generates recovery trajectories that account for slow institutional rebuilding.

Architecture:
  Assessment (Rust) → FSFSI + cumulative stress (authoritative)
  Planning (Rust)   → allocation trajectories per year (math only)
  This service      → bridges both: loads assessment, calls planner,
                       stamps cumulative FSFSI, generates data-driven insights
"""

import json
import logging
from decimal import Decimal

import fsfi_engine

logger = logging.getLogger(__name__)


def _to_json(data):
    return json.dumps(data)


def _from_json(s):
    return json.loads(s)


def _progress_fraction(year: int, total_years: int, curve: str = "smoothstep") -> float:
    """Compute progress fraction for a given year in the planning horizon.

    - linear: equal reduction each year (t)
    - smoothstep: slow start, fast middle, slow end (t²(3-2t)) — matches institutional buildup
    - frontloaded: fast start, slow end (1-(1-t)²) — matches political push scenarios
    """
    t = year / total_years if total_years > 0 else 1.0
    t = max(0.0, min(1.0, t))

    if curve == "smoothstep":
        return t * t * (3 - 2 * t)
    elif curve == "frontloaded":
        return 1 - (1 - t) ** 2
    else:  # linear
        return t


def _build_planning_components(assessment):
    """Build planning component inputs from a saved assessment.

    Uses cumulative stress as the performance gap (this is what planning
    needs to address — not just the current-year snapshot).
    """
    from django.db.models import Avg
    from apps.fsfvi_data.models import Indicator

    # Component-level alpha = mean of per-indicator alphas (proper aggregation from 33 indicators)
    component_alphas = {
        r["component"]: float(r["alpha"])
        for r in Indicator.objects.filter(default_sensitivity__isnull=False)
        .values("component")
        .annotate(alpha=Avg("default_sensitivity"))
    }

    components = []
    for comp in assessment.component_results.all().order_by("component"):
        # Use cumulative stress as the gap (what needs to be addressed)
        cum_stress = float(comp.cumulative_stress) if comp.cumulative_stress else float(comp.component_stress)
        budget_bn = float(comp.budget_lcu_bn or 0)
        n_indicators = comp.indicators_count or 1
        weight = float(comp.weight) if comp.weight is not None else None
        alpha_bn = component_alphas.get(comp.component)

        # Alpha is calibrated per INDICATOR (alpha_per_bnLCU from Excel).
        # The Rust engine works at component level, so we must pass the
        # per-indicator average allocation to keep α·f in the correct range.
        # Rust does: alloc_m = financial_allocation_lcu / 1M
        # We want: alloc_m = avg_per_indicator_bn
        # So: financial_allocation_lcu = avg_bn * 1M = (budget_bn / n) * 1M
        avg_budget_bn = budget_bn / n_indicators

        components.append({
            "component_type": comp.component,
            "observed_value": max(0.0, 1.0 - cum_stress),
            "benchmark_value": 1.0,
            "financial_allocation_lcu": avg_budget_bn * 1_000_000,
            **({"sensitivity_parameter": alpha_bn} if alpha_bn else {}),
            **({"weight": weight} if weight is not None else {}),
        })
    return components


def _stamp_planning_result(result, assessment, target_fsfvi, planning_years, growth_rate):
    """Override Rust engine's internal FSFSI with assessment's authoritative values.

    Generates accurate, data-driven insights instead of generic text.
    """
    current_fsfsi = float(assessment.fsfsi_score)
    cumulative_fsfsi = float(assessment.cumulative_fsfsi) if assessment.cumulative_fsfsi else current_fsfsi
    damage_lag = cumulative_fsfsi - current_fsfsi

    # Stamp baseline and target with real values
    result["baseline_fsfvi"] = cumulative_fsfsi
    result["target_fsfvi"] = target_fsfvi
    result["target_already_achieved"] = False  # if we got here, it's not achieved

    # Get final projected value from yearly plans
    yearly_plans = result.get("yearly_plans", [])
    final_projected = yearly_plans[-1]["projected_fsfvi"] if yearly_plans else target_fsfvi

    # --- Analyze component trajectories for insights ---
    last_year_projections = yearly_plans[-1].get("component_projections", {}) if yearly_plans else {}
    comp_changes = []
    for comp in assessment.component_results.all():
        c = comp.component
        baseline_cum = float(comp.cumulative_stress) if comp.cumulative_stress else float(comp.component_stress)
        final_cum = last_year_projections.get(c, {}).get("cumulative_stress", baseline_cum)
        if isinstance(final_cum, str):
            final_cum = float(final_cum)
        change_pct = ((final_cum - baseline_cum) / baseline_cum * 100) if baseline_cum > 0 else 0
        comp_changes.append({
            "name": comp.get_component_display(),
            "baseline": baseline_cum,
            "final": final_cum,
            "change_pct": change_pct,
        })

    recovering = sorted([c for c in comp_changes if c["change_pct"] < -5], key=lambda x: x["change_pct"])
    worsening = [c for c in comp_changes if c["change_pct"] > 5]
    fastest = recovering[0] if recovering else None
    slowest = recovering[-1] if len(recovering) > 1 else None

    # --- Expected Outcomes (data-driven from component trajectories) ---
    reduction_pct = (cumulative_fsfsi - final_projected) / cumulative_fsfsi * 100 if cumulative_fsfsi > 0 else 0

    outcomes = [
        f"Cumulative stress reduction from {cumulative_fsfsi:.4f} to {final_projected:.4f} "
        f"({reduction_pct:.1f}% improvement over {planning_years} years)",
    ]
    if final_projected <= target_fsfvi:
        outcomes.append(f"Target of {target_fsfvi:.2f} achieved within {planning_years}-year planning horizon")
    else:
        outcomes.append(
            f"Target of {target_fsfvi:.2f} not fully achieved — "
            f"consider extending the planning horizon or increasing budget growth rate"
        )
    if fastest:
        outcomes.append(
            f"Fastest recovery: {fastest['name']} ({fastest['change_pct']:.0f}%) — "
            f"benefits most from optimal reallocation"
        )
    if slowest and slowest != fastest:
        outcomes.append(
            f"Slowest recovery: {slowest['name']} ({slowest['change_pct']:.0f}%) — "
            f"requires sustained long-term investment"
        )
    if len(recovering) == len(comp_changes):
        outcomes.append(
            f"All {len(recovering)} components projected to recover with optimal allocation"
        )
    elif worsening:
        outcomes.append(
            f"{len(worsening)} component(s) at risk: {', '.join(c['name'] for c in worsening)} — "
            f"may need additional targeted intervention"
        )
    result["expected_outcomes"] = outcomes

    # --- Implementation Risks (data-driven) ---
    risks = []

    # Count critical components based on CURRENT cumulative stress
    critical_count = sum(
        1 for comp in assessment.component_results.all()
        if (float(comp.cumulative_stress) if comp.cumulative_stress else float(comp.component_stress)) > 0.30
    )
    # How many components still critical at end of plan?
    still_critical = sum(
        1 for c in comp_changes if c["final"] > 0.30
    )
    if still_critical > 0:
        still_names = [c["name"] for c in comp_changes if c["final"] > 0.30]
        risks.append({
            "risk_type": "Residual Stress",
            "severity": "high",
            "description": (
                f"{still_critical} component(s) still above critical threshold (>0.30) at end of plan: "
                f"{', '.join(still_names[:3])}{'...' if len(still_names) > 3 else ''}. "
                f"Even with optimal allocation, accumulated damage takes longer to resolve."
            ),
            "mitigation": (
                f"Extend planning horizon beyond {planning_years} years for these components, "
                f"or increase targeted funding above the {growth_rate*100:.0f}% baseline growth"
            ),
        })

    if damage_lag > 0.10:
        risks.append({
            "risk_type": "Damage Persistence",
            "severity": "critical",
            "description": (
                f"Accumulated damage lag of {damage_lag:.3f} means current-year snapshot ({current_fsfsi:.4f}) "
                f"understates the real situation ({cumulative_fsfsi:.4f}). Structural damage persists."
            ),
            "mitigation": "Sustained multi-year investment required — single-year budget increases are insufficient",
        })

    risks.append({
        "risk_type": "Budget Commitment",
        "severity": "medium",
        "description": (
            f"Plan requires {planning_years} years of sustained "
            f"{growth_rate * 100:.0f}% annual budget growth. "
            f"Political or fiscal disruptions could derail recovery."
        ),
        "mitigation": "Lock in multi-year budget commitments through MTEF framework and donor coordination",
    })
    result["implementation_risks"] = risks

    # --- Success Factors (policy-relevant) ---
    result["success_factors"] = [
        "Political commitment across electoral cycles",
        "Adequate and predictable financing through MTEF",
        "Strong M&E for course correction",
        "Coordination across sectors (agriculture, health, environment, finance)",
        "Community-level implementation capacity",
    ]

    return result


# =============================================================================
# Assessment-based planning (preferred — single source of truth)
# =============================================================================


def plan_for_assessment(
    assessment_id: str,
    planning_years: int = 5,
    target_fsfvi: float = 0.30,
    yearly_budget_growth_rate: float = 0.05,
    yearly_target_curve: str = "smoothstep",
    weighting_method: str = "hybrid",
    scenario: str = "normal_operations",
) -> dict:
    """Generate a multi-year strategic plan using a saved assessment.

    Uses cumulative FSFSI as the baseline (the real starting point for recovery).
    """
    from apps.assessments.models import AssessmentResult

    assessment = AssessmentResult.objects.get(pk=assessment_id)
    components = _build_planning_components(assessment)

    # The Rust engine computes its own FSFSI from component inputs, which won't
    # match the indicator-level cumulative FSFSI. Scale the target so the Rust
    # engine's internal trajectory is proportionally correct.
    #
    # If cumulative=0.7241 maps to Rust_baseline=X, then user_target=0.30
    # maps to Rust_target = 0.30 * (X / 0.7241)
    cumulative = float(assessment.cumulative_fsfsi) if assessment.cumulative_fsfsi else float(assessment.fsfsi_score)

    # First, compute what the Rust engine would see as baseline
    import math
    test_payload = {
        "current_components": components,
        "planning_years": 1,
        "target_fsfvi": 0.001,  # impossibly low to force plan generation
        "yearly_budget_growth_rate": yearly_budget_growth_rate,
    }
    test_raw = _from_json(fsfi_engine.py_generate_multi_year_plan(_to_json(test_payload)))
    rust_baseline = test_raw.get("baseline_fsfvi", cumulative)

    # Scale target for Rust
    if cumulative > 0 and rust_baseline > 0:
        rust_target = target_fsfvi * (rust_baseline / cumulative)
    else:
        rust_target = target_fsfvi

    payload = {
        "current_components": components,
        "planning_years": planning_years,
        "target_fsfvi": max(0.001, rust_target),  # ensure positive
        "yearly_budget_growth_rate": yearly_budget_growth_rate,
    }

    raw = fsfi_engine.py_generate_multi_year_plan(_to_json(payload))
    result = _from_json(raw)

    # --- Project cumulative stress trajectory ---
    # The Rust engine gives us a point-in-time trajectory. But the real planning
    # question is: given this budget path, what will the CUMULATIVE stress be
    # each year? We simulate the asymmetric EMA forward.
    #
    # For each year:
    #   current_stress(t) = from Rust (point-in-time with new budget)
    #   cumulative(t) = cumulative(t-1) + rho * (current(t) - cumulative(t-1))
    #   where rho = rho_down (improving) since we're planning recovery
    from apps.assessments.models import ComponentPersistenceConfig

    # Get average rho_down across components
    rho_configs = {c.component: float(c.rho_down) for c in ComponentPersistenceConfig.objects.all()}
    defaults = ComponentPersistenceConfig.DEFAULTS
    rho_values = []
    for comp in assessment.component_results.all():
        if comp.component in rho_configs:
            rho_values.append(rho_configs[comp.component])
        elif comp.component in defaults:
            rho_values.append(float(defaults[comp.component]["rho_down"]))
        else:
            rho_values.append(0.15)
    avg_rho_down = sum(rho_values) / len(rho_values) if rho_values else 0.15

    yearly_plans = result.get("yearly_plans", [])

    # Scale budgets: compute factor from known real budget vs Rust input sum.
    real_budget_lcu = float(assessment.total_budget_lcu_bn or 0) * 1e9  # real LCU
    rust_input_sum = sum(c["financial_allocation_lcu"] for c in components)
    budget_scale = real_budget_lcu / rust_input_sum if rust_input_sum > 0 else 1000.0

    # Build per-component data: gap (δ), alpha, cumulative stress, rho_down
    from apps.fsfvi_data.models import Indicator
    from django.db.models import Avg
    import math

    component_alphas = {
        r["component"]: float(r["alpha"])
        for r in Indicator.objects.filter(default_sensitivity__isnull=False)
        .values("component")
        .annotate(alpha=Avg("default_sensitivity"))
    }

    comp_data = {}
    for comp in assessment.component_results.all():
        c = comp.component
        cum_stress = float(comp.cumulative_stress) if comp.cumulative_stress else float(comp.component_stress)
        gap = float(comp.avg_performance_gap or comp.component_stress)  # δ
        alpha = component_alphas.get(c, 0.02)  # α per bn LCU
        budget_bn = float(comp.budget_lcu_bn or 0)
        n_indicators = comp.indicators_count or 1
        avg_budget_bn = budget_bn / n_indicators  # per-indicator average
        rho = rho_configs.get(c) or float(defaults.get(c, {}).get("rho_down", "0.15"))
        comp_data[c] = {
            "prev_cumulative": cum_stress,
            "gap": gap,               # δ (performance gap)
            "alpha": alpha,            # α (sensitivity per bn LCU)
            "avg_budget_bn": avg_budget_bn,
            "n_indicators": n_indicators,
            "rho_down": rho,
            "display": comp.get_component_display(),
        }

    # Simulate cumulative trajectory (system + component level)
    prev_cumulative = cumulative
    for i, yp in enumerate(yearly_plans):
        # Rust's point-in-time stress (scaled to cumulative range)
        rust_remaining = yp["projected_fsfvi"] / rust_baseline if rust_baseline > 0 else 1.0
        point_in_time = cumulative * rust_remaining

        # Apply asymmetric EMA: cumulative recovers slowly
        rho = avg_rho_down  # recovering
        new_cumulative = prev_cumulative + rho * (point_in_time - prev_cumulative)
        yp["projected_fsfvi"] = round(new_cumulative, 4)

        # Per-component projection using FSFSI formula: v = δ · e^(-α·f)
        # where f = optimal allocation from Rust (per indicator avg, in bn LCU)
        recommended = yp.get("recommended_allocations", {})
        component_projections = {}
        for comp_name, cd in comp_data.items():
            # Get optimal allocation for this component from Rust
            # Rust returns total per-component allocation (in scaled units)
            rust_alloc = recommended.get(comp_name, 0)
            # Convert to per-indicator bn: rust_alloc * budget_scale / 1e9 / n_indicators
            if rust_alloc > 0 and budget_scale > 0:
                optimal_budget_bn = (rust_alloc * budget_scale) / 1e9 / cd["n_indicators"]
            else:
                # Fallback: grow current budget
                optimal_budget_bn = cd["avg_budget_bn"] * ((1 + yearly_budget_growth_rate) ** (i + 1))

            # FSFSI stress formula: v = δ · e^(-α · f)
            # δ = gap, α = alpha per bn LCU, f = avg budget per indicator in bn
            alpha_f = cd["alpha"] * optimal_budget_bn
            comp_point_in_time = cd["gap"] * math.exp(-alpha_f)

            # Apply asymmetric EMA for cumulative stress
            comp_cum = cd["prev_cumulative"] + cd["rho_down"] * (comp_point_in_time - cd["prev_cumulative"])

            component_projections[comp_name] = {
                "cumulative_stress": round(comp_cum, 4),
                "point_in_time_stress": round(comp_point_in_time, 4),
                "optimal_budget_bn": round(optimal_budget_bn, 2),
                "display": cd["display"],
            }
            cd["prev_cumulative"] = comp_cum  # carry forward

        yp["component_projections"] = component_projections
        prev_cumulative = new_cumulative

        # Year target using selected curve (smoothstep default — realistic recovery pacing)
        year_num = i + 1
        progress = _progress_fraction(year_num, planning_years, yearly_target_curve)
        year_target = round(cumulative - (cumulative - target_fsfvi) * progress, 4)
        yp["year_target"] = year_target
        yp["target_fsfvi"] = year_target  # override Rust's scaled target for chart display

        # Update on_track based on real values
        yp["on_track"] = yp["projected_fsfvi"] <= year_target

        # Scale budget
        if "total_budget" in yp:
            yp["total_budget"] *= budget_scale

    if "total_additional_investment_needed" in result:
        result["total_additional_investment_needed"] *= budget_scale

    return _stamp_planning_result(result, assessment, target_fsfvi, planning_years, yearly_budget_growth_rate)


def mtef_for_assessment(
    assessment_id: str,
    target_improvement_percent: float = 20,
    yearly_budget_growth_rate: float = 0.05,
) -> dict:
    """Generate a 3-year MTEF using a saved assessment.

    Uses the actual FSFSI formula v = δ · e^(-α·f) with Rust's optimal
    allocations, then applies cumulative EMA for realistic projections.
    """
    from apps.assessments.models import AssessmentResult, ComponentPersistenceConfig
    from apps.fsfvi_data.models import Indicator
    from django.db.models import Avg
    import math

    assessment = AssessmentResult.objects.get(pk=assessment_id)
    components = _build_planning_components(assessment)

    raw = fsfi_engine.py_generate_mtef(
        _to_json(components),
        target_improvement_percent,
        yearly_budget_growth_rate,
    )
    result = _from_json(raw)

    # Stamp cumulative FSFSI as baseline
    cumulative = float(assessment.cumulative_fsfsi) if assessment.cumulative_fsfsi else float(assessment.fsfsi_score)
    result["baseline_fsfvi"] = cumulative

    # Budget scaling
    rust_input_sum = sum(c["financial_allocation_lcu"] for c in components)
    real_budget_lcu = float(assessment.total_budget_lcu_bn or 0) * 1e9
    budget_scale = real_budget_lcu / rust_input_sum if rust_input_sum > 0 else 1000.0

    # Component data for FSFSI stress formula
    component_alphas = {
        r["component"]: float(r["alpha"])
        for r in Indicator.objects.filter(default_sensitivity__isnull=False)
        .values("component")
        .annotate(alpha=Avg("default_sensitivity"))
    }

    rho_configs = {c.component: float(c.rho_down) for c in ComponentPersistenceConfig.objects.all()}
    defaults_map = ComponentPersistenceConfig.DEFAULTS

    comp_data = {}
    for comp in assessment.component_results.all():
        c = comp.component
        cum = float(comp.cumulative_stress) if comp.cumulative_stress else float(comp.component_stress)
        gap = float(comp.avg_performance_gap or comp.component_stress)
        alpha = component_alphas.get(c, 0.02)
        n_ind = comp.indicators_count or 1
        avg_bn = float(comp.budget_lcu_bn or 0) / n_ind
        rho = rho_configs.get(c) or float(defaults_map.get(c, {}).get("rho_down", "0.15"))
        comp_data[c] = {
            "prev_cumulative": cum, "gap": gap, "alpha": alpha,
            "avg_budget_bn": avg_bn, "n_indicators": n_ind, "rho_down": rho,
            "display": comp.get_component_display(),
        }

    avg_rho_down = sum(cd["rho_down"] for cd in comp_data.values()) / len(comp_data) if comp_data else 0.15

    # Process each MTEF year using FSFSI formula with optimal allocations
    prev_cum_system = cumulative
    for year_idx, year_key in enumerate(["year_1_plan", "year_2_plan", "year_3_plan"]):
        yp = result.get(year_key)
        if not yp:
            continue

        # Compute point-in-time stress per component using FSFSI formula
        recommended = yp.get("component_allocations", {})
        system_point_in_time = 0
        n_comps = len(comp_data)

        for comp_name, cd in comp_data.items():
            rust_alloc = recommended.get(comp_name, 0)
            if rust_alloc > 0 and budget_scale > 0:
                optimal_bn = (rust_alloc * budget_scale) / 1e9 / cd["n_indicators"]
            else:
                optimal_bn = cd["avg_budget_bn"] * ((1 + yearly_budget_growth_rate) ** (year_idx + 1))

            # v = δ · e^(-α · f)
            comp_stress = cd["gap"] * math.exp(-cd["alpha"] * optimal_bn)
            system_point_in_time += comp_stress / n_comps

            # Cumulative EMA per component
            comp_cum = cd["prev_cumulative"] + cd["rho_down"] * (comp_stress - cd["prev_cumulative"])
            cd["prev_cumulative"] = comp_cum

        # System cumulative from component average
        new_cum = prev_cum_system + avg_rho_down * (system_point_in_time - prev_cum_system)
        if prev_cum_system > 0:
            yp["projected_fsfvi"] = round(cumulative * (new_cum / prev_cum_system), 4)
        else:
            yp["projected_fsfvi"] = round(new_cum, 4)
        prev_cum_system = new_cum

        # Scale budget and allocations to real LCU
        if "total_budget" in yp:
            yp["total_budget"] *= budget_scale
        for comp_name in list(yp.get("component_allocations", {}).keys()):
            yp["component_allocations"][comp_name] *= budget_scale

        # Stamp year target
        year_num = year_idx + 1
        linear_target = cumulative * (1 - target_improvement_percent / 100 * year_num / 3)
        yp["target_fsfvi"] = round(linear_target, 4)

    # Scale target and baseline budget
    result["target_fsfvi_year_3"] = round(cumulative * (1 - target_improvement_percent / 100), 4)
    if "baseline_budget" in result:
        result["baseline_budget"] *= budget_scale

    return result


# =============================================================================
# Legacy functions (raw component inputs — kept for backwards compatibility)
# =============================================================================


def generate_multi_year_plan(request_payload: dict) -> dict:
    """Legacy: generate plan from raw component inputs."""
    raw = fsfi_engine.py_generate_multi_year_plan(_to_json(request_payload))
    return _from_json(raw)


def generate_mtef(
    components: list[dict],
    target_fsfvi_improvement_percent: float,
    yearly_budget_growth_rate: float,
) -> dict:
    """Legacy: generate MTEF from raw component inputs."""
    raw = fsfi_engine.py_generate_mtef(
        _to_json(components),
        target_fsfvi_improvement_percent,
        yearly_budget_growth_rate,
    )
    return _from_json(raw)
