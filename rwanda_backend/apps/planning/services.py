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


def _rust_current_fsfsi(components: list[dict]) -> float:
    """Point-in-time system FSFSI from the Rust core (same as planning / analyze-efficiency)."""
    raw = fsfi_engine.py_analyze_efficiency(_to_json(components))
    return float(_from_json(raw)["current_fsfsi"])


def _plan_total_bn_from_recommended(
    recommended: dict[str, float],
    keys: list[str],
    budget_scale: float,
) -> float:
    """National total (bn LCU) implied by Rust recommended row × planning budget_scale."""
    return sum((float(recommended.get(k, 0) or 0) * budget_scale) / 1e9 for k in keys)


def _shares_match_recommended(
    norm_shares_pct: dict[str, float],
    recommended: dict[str, float],
    keys: list[str],
    tol_pp: float = 0.5,
) -> bool:
    """True if submitted % mix matches the plan row (same rules as the UI / plan JSON).

    The API stamps ``recommended_share_pct`` with ``round(..., 4)``; the UI fills bn via
    ``toFixed(4)`` then re-derives %. Multiple rounds of rounding (backend share % → frontend
    bn values → re-derived %) accumulate small errors. A tolerance of 0.5 pp handles this
    while still detecting meaningful allocation changes by policy makers.

    Previous 0.12 pp tolerance was too tight and caused "phantom deltas" when users
    clicked "Fill from plan mix" without making any changes.
    """
    tot = sum(float(v or 0) for v in recommended.values())
    if tot <= 0:
        return False
    for k in keys:
        if k not in recommended:
            return False
        opt = round((float(recommended.get(k, 0) or 0) / tot) * 100.0, 4)
        if abs(float(norm_shares_pct.get(k, 0) or 0) - opt) > tol_pp:
            return False
    return True


def _national_totals_match_for_plan_row(
    user_total_bn: float,
    plan_total_budget_bn: float | None,
    recommended: dict[str, float],
    keys: list[str],
    budget_scale: float,
    rel: float = 5e-4,
) -> bool:
    if plan_total_budget_bn is not None and float(plan_total_budget_bn) > 0:
        ref = float(plan_total_budget_bn)
    else:
        ref = _plan_total_bn_from_recommended(recommended, keys, budget_scale)
    if ref <= 0:
        return False
    return abs(user_total_bn - ref) <= max(rel * ref, 1e-3)


def _system_cumulative_ema_from_rust_relative(
    prev_cumulative: float,
    assessment_cumulative: float,
    rust_point_fsfsi: float,
    rust_baseline_fsfsi: float,
    avg_rho_down: float,
) -> float:
    """One planning year: map Rust FSFSI onto assessment cumulative scale, then ρ_down EMA.

    Must stay identical to the loop in ``plan_for_assessment`` (strategic plan chart).
    """
    rb = rust_baseline_fsfsi if rust_baseline_fsfsi and rust_baseline_fsfsi > 0 else 1.0
    rust_remaining = rust_point_fsfsi / rb
    point_in_time = assessment_cumulative * rust_remaining
    return prev_cumulative + avg_rho_down * (point_in_time - prev_cumulative)


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


def _apply_planning_weighting(
    components: list[dict],
    weighting_method: str = "hybrid",
    scenario: str = "normal_operations",
) -> None:
    """Set each planning component's ``weight`` for Rust multi-year / MTEF (mutates ``components``).

    The saved assessment stores hybrid component weights in the DB; planning must
    override ωᵢ when the user selects expert | financial | network | equal | hybrid
    so trajectories and investment differ by method.
    """
    if not components:
        return
    method = (weighting_method or "hybrid").lower().strip()
    scen = scenario or "normal_operations"
    n = len(components)
    keys = [c["component_type"] for c in components]

    def _normalize(local: dict[str, float]) -> dict[str, float]:
        s = sum(local.get(k, 0.0) for k in keys)
        if s <= 0:
            return {k: 1.0 / n for k in keys}
        return {k: float(local.get(k, 0.0)) / s for k in keys}

    weights: dict[str, float] = {}
    try:
        if method == "equal":
            weights = {k: 1.0 / n for k in keys}
        elif method == "expert":
            data = _from_json(fsfi_engine.py_calculate_ahp_weights(scen))
            raw = data.get("weights") or {}
            weights = _normalize({k: float(raw.get(k, 0.0)) for k in keys})
        elif method == "financial":
            comp_payload = [
                {
                    "name": c["component_type"],
                    "component_type": c["component_type"],
                    "financial_allocation": float(c["financial_allocation_lcu"]),
                    "observed_value": float(c["observed_value"]),
                    "benchmark_value": float(c["benchmark_value"]),
                }
                for c in components
            ]
            raw = _from_json(fsfi_engine.py_calculate_financial_weights(_to_json(comp_payload)))
            weights = _normalize({k: float(raw.get(k, 0.0)) for k in keys})
        elif method == "network":
            raw = _from_json(fsfi_engine.py_calculate_pagerank(scen))
            weights = _normalize({k: float(raw.get(k, 0.0)) for k in keys})
        else:
            comp_payload = [
                {
                    "name": c["component_type"],
                    "component_type": c["component_type"],
                    "financial_allocation": float(c["financial_allocation_lcu"]),
                    "observed_value": float(c["observed_value"]),
                    "benchmark_value": float(c["benchmark_value"]),
                }
                for c in components
            ]
            data = _from_json(fsfi_engine.py_calculate_hybrid_weights(_to_json(comp_payload), scen))
            raw = data.get("hybrid_weights") or {}
            weights = _normalize({k: float(raw.get(k, 0.0)) for k in keys})
    except Exception as exc:
        logger.warning("Planning weighting fallback to equal (%s): %s", method, exc)
        weights = {k: 1.0 / n for k in keys}

    for c in components:
        c["weight"] = weights[c["component_type"]]


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
    planning_start_fiscal_year: int | None = None,
) -> dict:
    """Generate a multi-year strategic plan using a saved assessment.

    Uses cumulative FSFSI as the baseline (the real starting point for recovery).

    planning_start_fiscal_year:
        Calendar fiscal year label for plan index 1 (Rust ``year`` == 1). If omitted,
        defaults to the assessment's fiscal year + 1 (first horizon year after baseline).
    """
    from apps.assessments.models import AssessmentResult

    assessment = AssessmentResult.objects.get(pk=assessment_id)
    components = _build_planning_components(assessment)
    _apply_planning_weighting(components, weighting_method, scenario)

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
        rust_raw_projected = float(yp["projected_fsfvi"])
        new_cumulative = _system_cumulative_ema_from_rust_relative(
            prev_cumulative,
            cumulative,
            rust_raw_projected,
            float(rust_baseline),
            avg_rho_down,
        )
        yp["projected_fsfvi"] = round(new_cumulative, 4)

        # Per-component projection using FSFSI formula: v = δ · e^(-α·f)
        # where f = optimal allocation from Rust (per indicator avg, in bn LCU)
        recommended = yp.get("recommended_allocations", {})
        component_projections = {}
        for comp_name, cd in comp_data.items():
            rust_alloc = recommended.get(comp_name, 0)
            if rust_alloc > 0 and budget_scale > 0:
                optimal_budget_bn = (rust_alloc * budget_scale) / 1e9 / cd["n_indicators"]
            else:
                optimal_budget_bn = cd["avg_budget_bn"] * ((1 + yearly_budget_growth_rate) ** (i + 1))

            alpha_f = cd["alpha"] * optimal_budget_bn
            comp_point_in_time = cd["gap"] * math.exp(-alpha_f)

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

    assessment_fy = int(assessment.fiscal_year)
    start_fy = (
        int(planning_start_fiscal_year)
        if planning_start_fiscal_year is not None
        else assessment_fy + 1
    )
    for yp in yearly_plans:
        y_num = int(yp.get("year", 1))
        yp["fiscal_year"] = start_fy + (y_num - 1)
        rec = yp.get("recommended_allocations") or {}
        tot_alloc = sum(float(v or 0) for v in rec.values())
        if tot_alloc > 0:
            yp["recommended_share_pct"] = {
                k: round(float(rec.get(k) or 0) / tot_alloc * 100.0, 4) for k in rec
            }
        else:
            yp["recommended_share_pct"] = {}

    result["planning_start_fiscal_year"] = start_fy
    result["baseline_assessment_fiscal_year"] = assessment_fy

    stamped = _stamp_planning_result(
        result, assessment, target_fsfvi, planning_years, yearly_budget_growth_rate
    )
    stamped["planning_weighting_method"] = weighting_method
    stamped["planning_scenario"] = scenario
    return stamped


def simulate_user_allocation_year(
    assessment_id: str,
    plan_year: int,
    total_budget_bn: float,
    component_shares_pct: dict[str, float],
    *,
    weighting_method: str = "hybrid",
    scenario: str = "normal_operations",
    prior_system_cumulative: float | None = None,
    prior_component_cumulative: dict[str, float] | None = None,
    plan_reference: dict | None = None,
) -> dict[str, object]:
    """
    One-step counterfactual: given a national total (bn LCU) and a component mix (%),
    apply the **same** dynamics as multi-year planning.

    System cumulative FSFSI uses ``fsfi_engine.py_analyze_efficiency`` (Rust
    ``calculate_system_fsfsi``) on planning-shaped component payloads, then
    ``_system_cumulative_ema_from_rust_relative`` — identical to ``plan_for_assessment``.
    Per-component cumulative stress still uses δ·e^(−α·f) + component ρ_down EMA
    (same Python path as the plan’s component projections).
    """
    import math

    from apps.assessments.models import AssessmentResult, ComponentPersistenceConfig
    from apps.fsfvi_data.models import Indicator
    from django.db.models import Avg

    assessment = AssessmentResult.objects.get(pk=assessment_id)
    wm = (weighting_method or "hybrid").strip() or "hybrid"
    sc = (scenario or "normal_operations").strip() or "normal_operations"
    if plan_reference:
        pr_wm = plan_reference.get("planning_weighting_method")
        pr_sc = plan_reference.get("planning_scenario")
        if isinstance(pr_wm, str) and pr_wm.strip():
            wm = pr_wm.strip()
        if isinstance(pr_sc, str) and pr_sc.strip():
            sc = pr_sc.strip()

    components = _build_planning_components(assessment)
    _apply_planning_weighting(components, wm, sc)
    keys = [c["component_type"] for c in components]
    if not keys:
        return {"error": "Assessment has no component results"}

    component_alphas = {
        r["component"]: float(r["alpha"])
        for r in Indicator.objects.filter(default_sensitivity__isnull=False)
        .values("component")
        .annotate(alpha=Avg("default_sensitivity"))
    }

    rho_configs = {c.component: float(c.rho_down) for c in ComponentPersistenceConfig.objects.all()}
    defaults_map = ComponentPersistenceConfig.DEFAULTS
    rho_values = []
    for comp in assessment.component_results.all():
        if comp.component in rho_configs:
            rho_values.append(rho_configs[comp.component])
        elif comp.component in defaults_map:
            rho_values.append(float(defaults_map[comp.component]["rho_down"]))
        else:
            rho_values.append(0.15)
    avg_rho_down = sum(rho_values) / len(rho_values) if rho_values else 0.15

    baseline_cumulative = float(assessment.cumulative_fsfsi) if assessment.cumulative_fsfsi else float(
        assessment.fsfsi_score
    )

    comp_rows: dict[str, dict] = {}
    for comp in assessment.component_results.all():
        c = comp.component
        if c not in keys:
            continue
        rho = rho_configs.get(c) or float(defaults_map.get(c, {}).get("rho_down", "0.15"))
        comp_rows[c] = {
            "gap": float(comp.avg_performance_gap or comp.component_stress),
            "alpha": component_alphas.get(c, 0.02),
            "n_indicators": max(1, int(comp.indicators_count or 1)),
            "rho_down": rho,
            "display": comp.get_component_display(),
        }

    raw_shares = {k: float(component_shares_pct.get(k, 0) or 0) for k in keys}
    s = sum(raw_shares.values())
    if s <= 0:
        return {"error": "component_shares_pct must sum to a positive percentage"}
    norm_shares = {k: raw_shares[k] / s * 100.0 for k in keys}

    if plan_year < 1:
        return {"error": "plan_year must be >= 1"}

    if plan_year == 1:
        prev_sys = baseline_cumulative
        prev_comp: dict[str, float] = {}
        for comp in assessment.component_results.all():
            c = comp.component
            if c not in keys:
                continue
            prev_comp[c] = float(comp.cumulative_stress) if comp.cumulative_stress else float(
                comp.component_stress
            )
    else:
        if prior_system_cumulative is None or prior_component_cumulative is None:
            return {
                "error": "For plan_year > 1, prior_system_cumulative and prior_component_cumulative "
                "(end of previous plan year, optimal path) are required",
            }
        prev_sys = float(prior_system_cumulative)
        prev_comp = {}
        for k in keys:
            if k not in prior_component_cumulative:
                return {"error": f"prior_component_cumulative missing key: {k}"}
            prev_comp[k] = float(prior_component_cumulative[k])

    total_bn = float(total_budget_bn)
    if total_bn < 0:
        return {"error": "total_budget_bn must be non-negative"}

    real_budget_lcu = float(assessment.total_budget_lcu_bn or 0) * 1e9
    rust_input_sum = sum(c["financial_allocation_lcu"] for c in components)
    budget_scale = real_budget_lcu / rust_input_sum if rust_input_sum > 0 else 1000.0

    rec_opt: dict[str, float] | None = None
    plan_bn_ref: float | None = None
    if plan_reference:
        raw_rec = plan_reference.get("recommended_allocations")
        if isinstance(raw_rec, dict) and raw_rec:
            rec_opt = {str(k): float(v or 0) for k, v in raw_rec.items()}
        pt = plan_reference.get("plan_total_budget_bn")
        if pt is not None and float(pt) > 0:
            plan_bn_ref = float(pt)

    ptbn = plan_bn_ref if plan_bn_ref and plan_bn_ref > 0 else None
    if ptbn is None and rec_opt and budget_scale > 0:
        ptbn = _plan_total_bn_from_recommended(rec_opt, keys, budget_scale)

    totals_match = _national_totals_match_for_plan_row(total_bn, plan_bn_ref, rec_opt, keys, budget_scale) if rec_opt else False
    shares_match = _shares_match_recommended(norm_shares, rec_opt, keys) if rec_opt else False

    use_engine_optimal = bool(
        rec_opt
        and budget_scale > 0
        and ptbn
        and ptbn > 0
        and all(float(rec_opt.get(k, 0) or 0) > 0 for k in keys)
        and totals_match
        and shares_match,
    )

    # When user matches the plan exactly, use the plan's pre-computed projection directly.
    # This avoids numerical differences between py_generate_multi_year_plan (used for planning)
    # and py_analyze_efficiency (used for simulation) which can cause "phantom deltas".
    use_plan_projection_directly = (
        use_engine_optimal
        and plan_reference
        and "projected_cumulative_fsfsi" in plan_reference
        and totals_match
        and shares_match
    )

    ratio = (total_bn / ptbn) if (use_engine_optimal and ptbn and ptbn > 0) else 1.0

    avg_bn_by_comp: dict[str, float] = {}
    user_components: list[dict] = []
    for c in components:
        ct = c["component_type"]
        if ct not in norm_shares:
            return {"error": f"component_shares_pct missing key: {ct}"}
        n_ind = comp_rows[ct]["n_indicators"]
        if use_engine_optimal and rec_opt is not None:
            ra = float(rec_opt.get(ct, 0) or 0)
            if ra > 0:
                avg_bn = (ra * budget_scale) / 1e9 / n_ind * ratio
            else:
                avg_bn = (total_bn * (norm_shares[ct] / 100.0)) / n_ind
        else:
            comp_total_bn = total_bn * (norm_shares[ct] / 100.0)
            avg_bn = comp_total_bn / n_ind
        avg_bn_by_comp[ct] = avg_bn
        u = dict(c)
        u["financial_allocation_lcu"] = avg_bn * 1_000_000
        user_components.append(u)

    if use_plan_projection_directly:
        # User's allocation matches the plan — use the plan's pre-computed cumulative FSFSI
        # to ensure zero delta when following the optimal path.
        new_sys = float(plan_reference["projected_cumulative_fsfsi"])
        point_in_time_cumulative = new_sys  # Approximation; cumulative ≈ point-in-time for matching case

        # For component stress, use the plan's component projections if available
        new_comp: dict[str, float] = {}
        plan_comp_proj = plan_reference.get("component_projections", {})
        for c in keys:
            if c in plan_comp_proj and "cumulative_stress" in plan_comp_proj[c]:
                new_comp[c] = float(plan_comp_proj[c]["cumulative_stress"])
            else:
                # Fallback: compute using the formula
                cd = comp_rows[c]
                f_bn = avg_bn_by_comp[c]
                pit = cd["gap"] * math.exp(-cd["alpha"] * f_bn)
                pc = prev_comp[c]
                new_comp[c] = pc + cd["rho_down"] * (pit - pc)

        note = (
            "Your allocation matches the optimal plan exactly. Using the plan's pre-computed "
            "cumulative FSFSI projection to ensure consistency with the trajectory chart."
        )
    else:
        try:
            rust_baseline_fsfsi = _rust_current_fsfsi(components)
            rust_point_fsfsi = _rust_current_fsfsi(user_components)
        except Exception as e:
            logger.exception("Rust FSFSI evaluation in simulate_user_allocation_year")
            return {"error": f"Rust FSFSI evaluation failed: {e}"}

        new_sys = _system_cumulative_ema_from_rust_relative(
            prev_sys,
            baseline_cumulative,
            rust_point_fsfsi,
            rust_baseline_fsfsi,
            avg_rho_down,
        )
        rb = rust_baseline_fsfsi if rust_baseline_fsfsi and rust_baseline_fsfsi > 0 else 1.0
        point_in_time_cumulative = baseline_cumulative * (rust_point_fsfsi / rb)

        new_comp: dict[str, float] = {}
        for c in keys:
            cd = comp_rows[c]
            f_bn = avg_bn_by_comp[c]
            pit = cd["gap"] * math.exp(-cd["alpha"] * f_bn)
            pc = prev_comp[c]
            new_comp[c] = pc + cd["rho_down"] * (pit - pc)

        note = (
            "System FSFSI uses Rust calculate_system_fsfsi (py_analyze_efficiency) and the same "
            "cumulative EMA as plan_for_assessment. Per-component stress uses δ·e^(−α·f) with the "
            "same per-indicator bn as the Rust payload."
        )
        if use_engine_optimal:
            note += (
                " Allocations are taken from recommended_allocations (not re-derived from "
                "rounded bn inputs)."
            )

    out: dict[str, object] = {
        "user_projected_cumulative_fsfsi": round(new_sys, 4),
        "user_component_cumulative_stress": {k: round(new_comp[k], 4) for k in keys},
        "user_point_in_time_stress_system": round(point_in_time_cumulative, 4),
        "normalized_component_shares_pct": {k: round(norm_shares[k], 4) for k in keys},
        "baseline_cumulative_fsfsi_used": round(baseline_cumulative, 4),
        "plan_year": plan_year,
        "methodology_note": note,
    }

    if plan_reference:
        try:
            pfs = float(plan_reference["projected_cumulative_fsfsi"])
            tgt = float(plan_reference["year_target_fsfvi"])
        except (KeyError, TypeError, ValueError):
            return {"error": "plan_reference must include projected_cumulative_fsfsi and year_target_fsfvi"}
        out["plan_projected_cumulative_fsfsi"] = round(pfs, 4)
        out["plan_year_target_fsfvi"] = round(tgt, 4)
        out["delta_user_minus_plan_fsfsi"] = round(new_sys - pfs, 4)
        out["user_worse_than_plan_optimal"] = new_sys > pfs
        out["user_on_track_vs_plan_target"] = new_sys <= tgt

    return out


def mtef_for_assessment(
    assessment_id: str,
    target_improvement_percent: float = 20,
    yearly_budget_growth_rate: float = 0.05,
    target_curve: str = "linear",
    weighting_method: str = "hybrid",
    scenario: str = "normal_operations",
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
    _apply_planning_weighting(components, weighting_method, scenario)

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

    target_year_3 = cumulative * (1 - target_improvement_percent / 100)

    # MTEF policy targets remain linear for fiscal accountability; operational
    # targets can follow a configurable curve to reflect implementation pacing.
    curve = (target_curve or "linear").strip().lower()
    if curve not in {"linear", "smoothstep", "frontloaded"}:
        curve = "linear"

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

        # Stamp policy + operational year targets
        year_num = year_idx + 1
        policy_target = cumulative * (1 - target_improvement_percent / 100 * year_num / 3)
        progress = _progress_fraction(year_num, 3, curve)
        operational_target = cumulative - (cumulative - target_year_3) * progress

        yp["policy_target_fsfvi"] = round(policy_target, 4)
        yp["operational_target_fsfvi"] = round(operational_target, 4)
        yp["target_fsfvi"] = yp["policy_target_fsfvi"]  # backwards compatibility
        yp["on_track_policy"] = yp["projected_fsfvi"] <= yp["policy_target_fsfvi"]
        yp["on_track_operational"] = yp["projected_fsfvi"] <= yp["operational_target_fsfvi"]

    # Scale target and baseline budget
    result["target_fsfvi_year_3"] = round(target_year_3, 4)
    result["policy_target_definition"] = "linear_3y"
    result["operational_target_curve"] = curve
    if "baseline_budget" in result:
        result["baseline_budget"] *= budget_scale

    return result


# =============================================================================
# PSTA-5 Alignment Computation
# =============================================================================


def compute_psta5_budget_alignment(
    component_allocations_bn: dict[str, float],
    total_budget_bn: float | None = None,
) -> dict:
    """
    Compute how well a budget allocation pattern aligns with PSTA-5 priorities.

    Given component allocations (from a strategic plan), this function:
    1. Maps each component allocation to Priority Areas using contribution weights
    2. Calculates the effective budget flow to each Priority Area
    3. Compares actual allocation % to PSTA-5 target % (PA1:58%, PA2:17%, PA3:24%)
    4. Returns an alignment score (0-100) and detailed breakdown

    Args:
        component_allocations_bn: Budget per component in billions LCU
            e.g., {"markets": 100.5, "crop_production": 200.3, ...}
        total_budget_bn: Optional override; if None, computed from sum of allocations

    Returns:
        {
            "alignment_score": 85.3,  # 0-100, higher = better alignment
            "priority_area_allocations": [
                {"code": "PA1", "name": "...", "actual_pct": 55.2, "target_pct": 58.0, "deviation_ppt": -2.8},
                ...
            ],
            "component_contributions": [
                {"component": "markets", "allocation_bn": 100.5, "contributions": {"PA2": 50.25}},
                ...
            ],
            "total_budget_bn": 1234.5,
            "methodology": "..."
        }
    """
    from .models import PSTA5Pillar, PSTA5ComponentMapping

    # Get all Priority Areas and mappings
    priority_areas = list(PSTA5Pillar.objects.filter(is_active=True).order_by("sort_order"))
    mappings = list(PSTA5ComponentMapping.objects.select_related("pillar").all())

    if not priority_areas:
        return {"error": "No PSTA-5 Priority Areas defined. Run seed_psta5 command."}

    # Build mapping lookup: component -> [(pillar_code, weight), ...]
    component_to_pillars: dict[str, list[tuple[str, float]]] = {}
    for m in mappings:
        comp = m.component
        if comp not in component_to_pillars:
            component_to_pillars[comp] = []
        component_to_pillars[comp].append((m.pillar.code, float(m.contribution_weight)))

    # Calculate total budget
    total_bn = total_budget_bn if total_budget_bn and total_budget_bn > 0 else sum(
        float(v or 0) for v in component_allocations_bn.values()
    )
    if total_bn <= 0:
        return {"error": "Total budget must be positive"}

    # Compute effective allocation to each Priority Area
    pa_allocations: dict[str, float] = {pa.code: 0.0 for pa in priority_areas}
    component_contributions = []

    for comp, alloc_bn in component_allocations_bn.items():
        alloc = float(alloc_bn or 0)
        if alloc <= 0:
            continue

        contributions: dict[str, float] = {}
        if comp in component_to_pillars:
            for pillar_code, weight in component_to_pillars[comp]:
                contrib = alloc * weight
                pa_allocations[pillar_code] = pa_allocations.get(pillar_code, 0) + contrib
                contributions[pillar_code] = contrib
        # else: component not mapped (e.g., legacy or unknown)

        component_contributions.append({
            "component": comp,
            "allocation_bn": round(alloc, 2),
            "contributions": {k: round(v, 2) for k, v in contributions.items()},
        })

    # Calculate actual % for each Priority Area
    total_mapped = sum(pa_allocations.values())
    pa_results = []

    for pa in priority_areas:
        code = pa.code
        actual_bn = pa_allocations.get(code, 0)
        target_pct = float(pa.weight) * 100  # weight stored as 0.58 -> 58%

        if total_mapped > 0:
            actual_pct = (actual_bn / total_mapped) * 100
        else:
            actual_pct = 0

        deviation_ppt = actual_pct - target_pct

        pa_results.append({
            "code": code,
            "name": pa.name,
            "actual_bn": round(actual_bn, 2),
            "actual_pct": round(actual_pct, 1),
            "target_pct": round(target_pct, 1),
            "deviation_ppt": round(deviation_ppt, 1),
        })

    # Compute alignment score: 100 - average absolute deviation
    # Perfect alignment = 0 deviation = score 100
    # Maximum deviation (all in one PA) ≈ 42 ppt average = score ~58
    avg_abs_deviation = sum(abs(pa["deviation_ppt"]) for pa in pa_results) / len(pa_results) if pa_results else 0
    alignment_score = max(0, 100 - avg_abs_deviation * 2)  # Scale: 1 ppt deviation = -2 points

    return {
        "alignment_score": round(alignment_score, 1),
        "priority_area_allocations": pa_results,
        "component_contributions": component_contributions,
        "total_budget_bn": round(total_bn, 2),
        "total_mapped_bn": round(total_mapped, 2),
        "unmapped_bn": round(total_bn - total_mapped, 2),
        "methodology": (
            "Budget alignment computed by mapping FSFSI component allocations to PSTA-5 Priority Areas "
            "using contribution weights (e.g., crop_production→PA1 at 40%). Alignment score = 100 - "
            "2×(average absolute deviation from target %). Perfect alignment with 58/17/24 split = 100."
        ),
    }


def compute_psta5_alignment_summary(
    plan_id: str | None = None,
    fiscal_year: int | None = None,
) -> dict:
    """
    Compute PSTA-5 alignment summary for dashboard display.

    Computes TWO key metrics:
    1. Budget Alignment: How well the plan's budget allocation matches PSTA-5 targets (PA1:58%, PA2:17%, PA3:24%)
    2. Projected KPI Improvement: How much the plan's allocations will improve each PSTA-5 KPI,
       using KPI-specific component mappings.

    The KPI improvement is derived from the plan's component_projections:
    - Each KPI has specific component(s) that drive it (via PSTA5KPIComponentMapping)
    - Each component's stress reduction indicates indicator improvement
    - KPI improvement = weighted sum of its driving components' improvements
    - This provides KPI-specific granularity (e.g., PA1.1 shows crop_production improvement,
      PA1.4 shows animal_systems improvement, not a PA-level average)
    """
    from .models import (
        SavedStrategicPlan,
        PSTA5Pillar,
        PSTA5KPI,
        PSTA5ComponentMapping,
        PSTA5KPIComponentMapping,
    )
    from apps.assessments.models import AssessmentResult

    # Find the plan to use
    plan = None
    if plan_id:
        try:
            plan = SavedStrategicPlan.objects.get(pk=plan_id)
        except SavedStrategicPlan.DoesNotExist:
            pass
    elif fiscal_year:
        plan = SavedStrategicPlan.objects.filter(
            fiscal_year=fiscal_year, is_active=True
        ).first()
    else:
        plan = SavedStrategicPlan.objects.filter(is_active=True).order_by("-fiscal_year").first()

    # Get Priority Areas and component mappings
    priority_areas = list(PSTA5Pillar.objects.filter(is_active=True).order_by("sort_order"))
    kpis = list(PSTA5KPI.objects.filter(is_active=True).select_related("pillar"))
    mappings = list(PSTA5ComponentMapping.objects.select_related("pillar").all())

    if not priority_areas:
        return {
            "overall_score": 0,
            "pillar_scores": [],
            "component_alignment": [],
            "kpis_at_risk": [],
            "data_year": 2024,
            "error": "No PSTA-5 Priority Areas defined",
        }

    # Build component -> Priority Area mapping: {component: [(pa_code, weight), ...]}
    component_to_pa: dict[str, list[tuple[str, float]]] = {}
    for m in mappings:
        comp = m.component
        if comp not in component_to_pa:
            component_to_pa[comp] = []
        component_to_pa[comp].append((m.pillar.code, float(m.contribution_weight)))

    # Compute budget alignment and projected indicator improvement if we have a plan
    budget_alignment = None
    yearly_alignments = []
    component_improvements: dict[str, float] = {}  # component -> improvement %
    baseline_stresses: dict[str, float] = {}
    final_stresses: dict[str, float] = {}

    if plan and plan.plan_json:
        yearly_plans = plan.plan_json.get("yearly_plans", [])
        baseline_fsfvi = plan.plan_json.get("baseline_fsfvi", 0)

        # Get baseline component stresses from the assessment
        try:
            assessment = AssessmentResult.objects.get(pk=plan.assessment_id)
            for comp in assessment.component_results.all():
                baseline_stresses[comp.component] = float(
                    comp.cumulative_stress if comp.cumulative_stress else comp.component_stress
                )
        except AssessmentResult.DoesNotExist:
            pass

        # Compute alignment for each year in the plan
        for yp in yearly_plans:
            fy = yp.get("fiscal_year")
            recommended = yp.get("recommended_allocations", {})
            total_budget = yp.get("total_budget", 0)
            projected_fsfvi = yp.get("projected_fsfvi", 0)
            year_target = yp.get("year_target") or yp.get("target_fsfvi", 0)
            component_projections = yp.get("component_projections", {})

            # Scale to billions
            total_budget_bn = total_budget / 1e9 if total_budget > 1e6 else total_budget
            allocations_bn = {}
            for comp, alloc in recommended.items():
                alloc_bn = alloc / 1e9 if alloc > 1e6 else alloc
                allocations_bn[comp] = alloc_bn

            # Compute projected indicator improvement for this year
            year_component_improvements: dict[str, float] = {}
            for comp_name, proj in component_projections.items():
                baseline = baseline_stresses.get(comp_name, 0)
                final = float(proj.get("cumulative_stress", baseline))
                if baseline > 0:
                    # Stress reduction = indicator improvement
                    improvement_pct = ((baseline - final) / baseline) * 100
                    year_component_improvements[comp_name] = max(0, improvement_pct)
                else:
                    year_component_improvements[comp_name] = 0

            if allocations_bn:
                year_alignment = compute_psta5_budget_alignment(allocations_bn, total_budget_bn)

                # Compute projected PA improvement from component improvements
                pa_improvements: dict[str, float] = {pa.code: 0.0 for pa in priority_areas}
                pa_weights: dict[str, float] = {pa.code: 0.0 for pa in priority_areas}

                for comp_name, improvement in year_component_improvements.items():
                    if comp_name in component_to_pa:
                        for pa_code, weight in component_to_pa[comp_name]:
                            pa_improvements[pa_code] += improvement * weight
                            pa_weights[pa_code] += weight

                # Normalize by total weights
                for pa_code in pa_improvements:
                    if pa_weights[pa_code] > 0:
                        pa_improvements[pa_code] /= pa_weights[pa_code]

                yearly_alignments.append({
                    "fiscal_year": fy,
                    "plan_year": yp.get("year", 0),
                    "alignment_score": year_alignment.get("alignment_score", 0),
                    "total_budget_bn": total_budget_bn,
                    "projected_fsfvi": round(projected_fsfvi, 4) if projected_fsfvi else None,
                    "year_target": round(year_target, 4) if year_target else None,
                    "priority_area_allocations": year_alignment.get("priority_area_allocations", []),
                    "pa_indicator_improvements": {k: round(v, 1) for k, v in pa_improvements.items()},
                    "component_improvements": {k: round(v, 1) for k, v in year_component_improvements.items()},
                })

        # Use the final year for main metrics
        if yearly_plans:
            final_year = yearly_plans[-1]
            recommended = final_year.get("recommended_allocations", {})
            total_budget = final_year.get("total_budget", 0)
            total_budget_bn = total_budget / 1e9 if total_budget > 1e6 else total_budget
            allocations_bn = {}
            for comp, alloc in recommended.items():
                alloc_bn = alloc / 1e9 if alloc > 1e6 else alloc
                allocations_bn[comp] = alloc_bn
            if allocations_bn:
                budget_alignment = compute_psta5_budget_alignment(allocations_bn, total_budget_bn)

            # Final year component improvements
            final_projections = final_year.get("component_projections", {})
            for comp_name, proj in final_projections.items():
                baseline = baseline_stresses.get(comp_name, 0)
                final = float(proj.get("cumulative_stress", baseline))
                final_stresses[comp_name] = final
                if baseline > 0:
                    component_improvements[comp_name] = max(0, ((baseline - final) / baseline) * 100)
                else:
                    component_improvements[comp_name] = 0

    # Build KPI -> Component mapping for KPI-specific improvements
    kpi_component_mappings = list(PSTA5KPIComponentMapping.objects.select_related("kpi").all())
    kpi_to_components: dict[str, list[tuple[str, float]]] = {}  # kpi_code -> [(component, weight), ...]
    for m in kpi_component_mappings:
        kpi_code = m.kpi.code
        if kpi_code not in kpi_to_components:
            kpi_to_components[kpi_code] = []
        kpi_to_components[kpi_code].append((m.component, float(m.weight)))

    # Compute KPI-specific projected improvements
    kpi_improvements: dict[str, float] = {}  # kpi_code -> improvement %
    for kpi in kpis:
        if kpi.code in kpi_to_components:
            # KPI has specific component mappings - use weighted average of its components
            kpi_improvement = 0.0
            weight_sum = 0.0
            for comp_name, weight in kpi_to_components[kpi.code]:
                if comp_name in component_improvements:
                    kpi_improvement += component_improvements[comp_name] * weight
                    weight_sum += weight
            if weight_sum > 0:
                kpi_improvements[kpi.code] = kpi_improvement / weight_sum
            else:
                kpi_improvements[kpi.code] = 0.0
        else:
            # Fallback to PA-level average if no KPI-specific mapping exists
            pa_code = kpi.pillar.code
            pa_improvement = 0.0
            pa_weight_sum = 0.0
            for comp_name, improvement in component_improvements.items():
                if comp_name in component_to_pa:
                    for pa_c, weight in component_to_pa[comp_name]:
                        if pa_c == pa_code:
                            pa_improvement += improvement * weight
                            pa_weight_sum += weight
            if pa_weight_sum > 0:
                kpi_improvements[kpi.code] = pa_improvement / pa_weight_sum
            else:
                kpi_improvements[kpi.code] = 0.0

    # Compute pillar scores with PROJECTED indicator improvements
    pillar_scores = []
    kpis_at_risk = []

    # Count components mapped to each PA
    pa_component_counts: dict[str, int] = {pa.code: 0 for pa in priority_areas}
    for comp_name in component_improvements.keys():
        if comp_name in component_to_pa:
            for pa_code, _ in component_to_pa[comp_name]:
                pa_component_counts[pa_code] = pa_component_counts.get(pa_code, 0) + 1

    for pa in priority_areas:
        pa_kpis = [k for k in kpis if k.pillar_id == pa.id]

        # Budget alignment score for this Priority Area
        budget_score = 0
        if budget_alignment and "priority_area_allocations" in budget_alignment:
            pa_alloc = next(
                (a for a in budget_alignment["priority_area_allocations"] if a["code"] == pa.code),
                None
            )
            if pa_alloc:
                budget_score = max(0, 100 - abs(pa_alloc["deviation_ppt"]) * 2)

        # PA-level indicator improvement = weighted average of KPI improvements
        pa_indicator_improvement = 0.0
        pa_kpi_weight_sum = 0.0
        pa_component_list: list[str] = []

        for kpi in pa_kpis:
            kpi_weight = float(kpi.weight)
            kpi_improv = kpi_improvements.get(kpi.code, 0.0)
            pa_indicator_improvement += kpi_improv * kpi_weight
            pa_kpi_weight_sum += kpi_weight

            # Collect components driving this KPI
            if kpi.code in kpi_to_components:
                for comp_name, _ in kpi_to_components[kpi.code]:
                    if comp_name not in pa_component_list:
                        pa_component_list.append(comp_name)

        if pa_kpi_weight_sum > 0:
            pa_indicator_improvement /= pa_kpi_weight_sum

        # If no KPI-specific mappings, fall back to component -> PA mappings
        if not pa_component_list:
            for comp_name in component_improvements.keys():
                if comp_name in component_to_pa:
                    for pa_code, _ in component_to_pa[comp_name]:
                        if pa_code == pa.code and comp_name not in pa_component_list:
                            pa_component_list.append(comp_name)

        # Flag KPIs at risk if they have low projected improvement
        for kpi in pa_kpis:
            kpi_improv = kpi_improvements.get(kpi.code, 0.0)
            if kpi_improv < 40:
                kpis_at_risk.append({
                    "code": kpi.code,
                    "name": kpi.name,
                    "pillar_code": pa.code,
                    "baseline_value": float(kpi.baseline_value),
                    "target_value": float(kpi.target_value),
                    "projected_improvement": round(kpi_improv, 1),
                })

        pillar_scores.append({
            "pillar_code": pa.code,
            "pillar_name": pa.name,
            "score": round(budget_score, 1),  # Budget alignment
            "indicator_improvement": round(pa_indicator_improvement, 1),  # Projected from plan
            "budget_alignment_score": round(budget_score, 1),
            "weight": float(pa.weight),
            "components_count": len(pa_component_list),  # How many FSFSI components contribute
            "components": pa_component_list,  # Which components
            "kpis_total": len(pa_kpis),  # PSTA-5 KPIs linked to this PA
        })

    # Overall scores
    overall_budget_alignment = sum(ps["budget_alignment_score"] * ps["weight"] for ps in pillar_scores)
    overall_indicator_improvement = sum(ps["indicator_improvement"] * ps["weight"] for ps in pillar_scores)

    # Component-level improvements for display
    component_alignment = []
    for comp_name, improvement in component_improvements.items():
        baseline = baseline_stresses.get(comp_name, 0)
        final = final_stresses.get(comp_name, baseline)
        component_alignment.append({
            "component": comp_name,
            "baseline_stress": round(baseline * 100, 1),  # as %
            "projected_stress": round(final * 100, 1),
            "improvement_pct": round(improvement, 1),
        })

    # Sort by improvement (best first)
    component_alignment.sort(key=lambda x: x["improvement_pct"], reverse=True)

    # Compute average yearly alignment score
    avg_yearly_alignment = (
        sum(ya["alignment_score"] for ya in yearly_alignments) / len(yearly_alignments)
        if yearly_alignments else 0
    )

    # Data year = final year of the plan
    data_year = yearly_alignments[-1]["fiscal_year"] if yearly_alignments else 2024

    return {
        # PRIMARY: Budget alignment with PSTA-5 targets
        "overall_score": round(overall_budget_alignment, 1),

        # SECONDARY: Projected indicator improvement from plan allocations
        "overall_indicator_improvement": round(overall_indicator_improvement, 1),

        "pillar_scores": pillar_scores,
        "component_alignment": component_alignment,
        "kpis_at_risk": kpis_at_risk,
        "data_year": data_year,
        "plan_used": {
            "id": str(plan.id) if plan else None,
            "name": plan.plan_name if plan else None,
            "fiscal_year": plan.fiscal_year if plan else None,
            "planning_years": plan.planning_years if plan else None,
            "planning_start_fy": plan.plan_json.get("planning_start_fiscal_year") if plan and plan.plan_json else None,
        } if plan else None,
        "budget_alignment": budget_alignment,
        "yearly_alignments": yearly_alignments,
        "avg_yearly_alignment_score": round(avg_yearly_alignment, 1),
        # KPI-specific improvements (using KPI → Component mappings)
        "kpi_improvements": {k: round(v, 1) for k, v in kpi_improvements.items()},
    }


def get_psta5_tracker_data() -> dict:
    """
    Get full PSTA-5 tracker data including alignment with active plan.

    Returns all data needed for the PSTA-5 Tracker page:
    - Priority Areas (pillars)
    - KPIs with current progress
    - Component mappings
    - Annual targets
    - Progress records
    - Alignment summary (computed from active plan)
    """
    from .models import (
        PSTA5Pillar,
        PSTA5KPI,
        PSTA5ComponentMapping,
        PSTA5AnnualTarget,
        PSTA5Progress,
    )
    from .serializers import (
        PSTA5PillarSerializer,
        PSTA5KPISerializer,
        PSTA5ComponentMappingSerializer,
        PSTA5AnnualTargetSerializer,
        PSTA5ProgressSerializer,
    )

    pillars = PSTA5Pillar.objects.filter(is_active=True).order_by("sort_order")
    kpis = PSTA5KPI.objects.filter(is_active=True).select_related("pillar").prefetch_related("progress_records")
    mappings = PSTA5ComponentMapping.objects.select_related("pillar").all()
    targets = PSTA5AnnualTarget.objects.select_related("kpi").all()
    progress = PSTA5Progress.objects.select_related("kpi").order_by("-fiscal_year")

    alignment_summary = compute_psta5_alignment_summary()

    return {
        "pillars": PSTA5PillarSerializer(pillars, many=True).data,
        "kpis": PSTA5KPISerializer(kpis, many=True).data,
        "component_mappings": PSTA5ComponentMappingSerializer(mappings, many=True).data,
        "annual_targets": PSTA5AnnualTargetSerializer(targets, many=True).data,
        "progress": PSTA5ProgressSerializer(progress, many=True).data,
        "alignment_summary": alignment_summary,
    }


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
