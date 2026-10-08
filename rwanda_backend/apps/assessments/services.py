"""
Assessment Services for Rwanda FSFSI.

Thin wrapper around the Rust fsfi_engine.
All computations are handled by Rust for performance and security.
"""

import json
import logging
from decimal import Decimal
from typing import Any

from django.db import transaction

import fsfi_engine

from apps.fsfvi_data.models import Indicator, IndicatorData

from . import classification
from .models import (
    AssessmentHistory,
    AssessmentResult,
    ComponentResult,
    IndicatorResult,
)

logger = logging.getLogger(__name__)


def _to_json(data: list[dict] | dict) -> str:
    """Convert data to JSON string, handling Decimals."""
    def converter(obj):
        if isinstance(obj, Decimal):
            return float(obj)
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
    return json.dumps(data, default=converter)


def _from_json(json_str: str) -> dict | list:
    """Parse JSON string from Rust engine."""
    return json.loads(json_str)


def _relabel_engine_result(result: dict) -> dict:
    """Replace the engine's fixed-threshold labels with calibrated ones, in place.

    The Rust engine labels with its built-in 0.05/0.15/0.30 cut-points. Every
    label that leaves the service layer must come from the calibrated
    thresholds, so the known label/score pairs are rewritten here.
    """
    if not isinstance(result, dict):
        return result
    sys_lvl = classification.LEVEL_SYSTEM
    pairs = (
        ("overall_fsfsi", "risk_level"),
        ("fsfi_score", "risk_level"),
        ("baseline_fsfsi", "baseline_risk_level"),
        ("scenario_fsfsi", "scenario_risk_level"),
    )
    for score_key, label_key in pairs:
        if label_key in result and result.get(score_key) is not None:
            try:
                result[label_key] = classification.classify(float(result[score_key]), sys_lvl)
            except (TypeError, ValueError):
                pass
    for ind in result.get("indicator_results") or []:
        if isinstance(ind, dict) and "risk_level" in ind and ind.get("stress") is not None:
            ind["risk_level"] = classification.classify(float(ind["stress"]), classification.LEVEL_INDICATOR)
    for agg in result.get("component_aggregations") or []:
        if isinstance(agg, dict) and "priority_level" in agg:
            s = agg.get("average_stress", agg.get("average_performance_gap"))
            if s is not None:
                agg["priority_level"] = classification.classify(float(s), classification.LEVEL_COMPONENT)
    return result


# =============================================================================
# ASSESSMENT SERVICE
# =============================================================================

class AssessmentService:
    """
    Service for running FSFSI assessments via Rust engine.

    Provides access to:
    - Full assessments (6-component legacy and 37-indicator models)
    - Quick checks
    - Historical tracking across fiscal years
    """

    # -------------------------------------------------------------------------
    # Core Assessment Functions (Rust Engine)
    # -------------------------------------------------------------------------

    def run_assessment(
        self,
        components: list[dict],
        weighting_method: str = "hybrid",
        scenario: str = "normal_operations",
        fiscal_year: int = 2025,
    ) -> dict:
        """
        Run full FSFSI assessment (legacy 6-component model).

        Args:
            components: List of ComponentInput dicts
            weighting_method: expert|financial|network|hybrid
            scenario: normal_operations|climate_shock|financial_crisis|
                     pandemic_disruption|supply_chain_disruption|
                     cyber_threats|political_instability
            fiscal_year: Fiscal year for assessment

        Returns:
            AssessmentResult dict from Rust engine
        """
        result_json = fsfi_engine.py_run_assessment(
            _to_json(components),
            weighting_method,
            scenario,
            fiscal_year,
        )
        return _relabel_engine_result(_from_json(result_json))

    def run_indicator_assessment(
        self,
        indicators: list[dict],
        weighting_method: str = "hybrid",
        scenario: str = "normal_operations",
        fiscal_year: int = 2025,
    ) -> dict:
        """
        Run indicator-based FSFSI assessment (37 indicators, 8 components).

        Args:
            indicators: List of IndicatorInput dicts with:
                - indicator_code: str (e.g., "IND-01")
                - indicator_component: str (markets|crop_production|nutrition|
                  research|post_harvest|environment|animal_systems|finance)
                - name: str
                - records_count: int
                - gross_lcu_bn: float
                - weighted_lcu_bn: float
                - share_weighted_percent: float
                - observed_value: float (optional)
                - benchmark_value: float (optional)
            weighting_method: expert|financial|network|hybrid
            scenario: stress scenario
            fiscal_year: Fiscal year

        Returns:
            IndicatorAssessmentResult dict from Rust engine
        """
        result_json = fsfi_engine.py_run_indicator_assessment(
            _to_json(indicators),
            weighting_method,
            scenario,
            fiscal_year,
        )
        return _relabel_engine_result(_from_json(result_json))

    def run_indicator_investment_scenario(
        self,
        indicators: list[dict],
        investment: dict,
        weighting_method: str = "hybrid",
        scenario: str = "normal_operations",
        fiscal_year: int = 2025,
    ) -> dict:
        """
        Baseline vs counterfactual FSFSI after adding an envelope (bn LCU) per indicator
        and/or split equally across indicators in each component. Computed in Rust.
        """
        result_json = fsfi_engine.py_indicator_investment_scenario(
            _to_json(indicators),
            _to_json(investment),
            weighting_method,
            scenario,
            fiscal_year,
        )
        return _relabel_engine_result(_from_json(result_json))

    def quick_check(self, components: list[dict]) -> dict:
        """
        Run quick FSFSI check (lightweight assessment).

        Returns:
            QuickCheckResult dict with fsfi_score, risk_level, critical_components
        """
        result_json = fsfi_engine.py_quick_check(_to_json(components))
        return _relabel_engine_result(_from_json(result_json))

    # -------------------------------------------------------------------------
    # Database Operations
    # -------------------------------------------------------------------------

    @transaction.atomic
    def run_and_save_assessment(
        self,
        indicators: list[dict],
        fiscal_year: int,
        assessment_name: str = "",
        weighting_method: str = "hybrid",
        scenario: str = "normal_operations",
        user=None,
    ) -> dict:
        """
        Run indicator assessment and save results to database.

        Returns:
            Assessment result dict with assessment_id added
        """
        result = self.run_indicator_assessment(
            indicators, weighting_method, scenario, fiscal_year
        )

        # Classify with the calibrated system-level thresholds (not the engine's
        # fixed 0.05/0.15/0.30). The Rust risk_level is overwritten so stored
        # JSON and DB columns agree.
        stress_level = classification.classify(float(result["overall_fsfsi"]), classification.LEVEL_SYSTEM)
        result["risk_level"] = stress_level

        # Create main assessment record
        assessment = AssessmentResult.objects.create(
            fiscal_year=fiscal_year,
            assessment_name=assessment_name,
            weighting_method=weighting_method,
            scenario=scenario,
            fsfsi_score=Decimal(str(result["overall_fsfsi"])),
            stress_level=stress_level,
            fsfsi_optimal=Decimal(str(result["efficiency"]["fsfsi_optimal"])),
            efficiency_index=Decimal(str(result["efficiency"]["efficiency_index"])),
            gap_ratio=Decimal(str(result["efficiency"]["gap_ratio"])),
            total_budget_lcu_bn=Decimal(str(result["metadata"]["total_budget_lcu_bn"])),
            indicators_count=result["metadata"]["indicator_count"],
            components_count=result["metadata"]["component_count"],
            result_json=result,
            computing_time_ms=result["metadata"]["computing_time_ms"],
            computed_by=user,
        )

        # Save component aggregations (priority_level from Rust only — no Django logic)
        # Compute component weights using the hybrid weighting system
        import json as _json
        comp_inputs = [
            {
                "name": agg["component"],
                "component_type": agg["component"],
                "financial_allocation": agg["total_weighted_lcu_bn"],
                "observed_value": agg["average_performance_gap"],
                "benchmark_value": 1.0,
            }
            for agg in result["component_aggregations"]
        ]
        try:
            hybrid_result = _json.loads(
                fsfi_engine.py_calculate_hybrid_weights(_json.dumps(comp_inputs), scenario)
            )
            hybrid_weights = hybrid_result.get("hybrid_weights", {})
        except Exception:
            hybrid_weights = {}

        for comp_agg in result["component_aggregations"]:
            comp = comp_agg["component"]
            weight = hybrid_weights.get(comp, 1.0 / 8)

            gap = comp_agg["average_performance_gap"]
            stress = comp_agg.get("average_stress", gap)

            comp_result = ComponentResult(
                assessment=assessment,
                component=comp,
                weight=Decimal(str(round(weight, 6))),
                avg_performance_gap=Decimal(str(gap)),
                component_stress=Decimal(str(stress)),
                weighted_stress=Decimal(str(round(stress * weight, 6))),
                budget_lcu_bn=Decimal(str(comp_agg["total_weighted_lcu_bn"])),
                budget_share_percent=Decimal(str(comp_agg["total_share_weighted_percent"])),
                indicators_count=comp_agg["indicator_count"],
            )
            # Component-level calibrated classification + gap × coverage diagnosis
            classification.apply_component_labels(comp_result)
            comp_result.save()
            # keep the stored engine JSON consistent with the DB label
            comp_agg["priority_level"] = comp_result.priority_level

        # Benchmark provenance for this fiscal year (from the parameters-sheet import)
        provenance = {
            code: (btype, imputed)
            for code, btype, imputed in IndicatorData.objects.filter(
                fiscal_year=fiscal_year
            ).values_list("indicator__code", "benchmark_used_type", "delta_imputed")
        }

        # Save indicator results (observed_value and benchmark_value from Rust output)
        for ind in result["indicator_results"]:
            btype, imputed = provenance.get(ind["indicator_code"], ("", False))
            ind_result = IndicatorResult(
                assessment=assessment,
                indicator_code=ind["indicator_code"],
                indicator_name=ind["name"],
                component=ind["indicator_component"],
                performance_gap=Decimal(str(ind["performance_gap"])),
                stress_value=Decimal(str(ind["stress"])),
                weighted_lcu_bn=Decimal(str(ind["weighted_lcu_bn"])),
                share_weighted_percent=Decimal(str(ind["share_weighted_percent"])),
                observed_value=Decimal(str(ind["observed_value"])) if ind.get("observed_value") is not None else None,
                benchmark_value=Decimal(str(ind["benchmark_value"])) if ind.get("benchmark_value") is not None else None,
                benchmark_used_type=btype or "",
                delta_imputed=bool(imputed),
            )
            classification.apply_indicator_labels(ind_result)
            ind_result.save()

        # result_json was captured at create(); persist the relabelled copy
        assessment.result_json = result
        assessment.save(update_fields=["result_json"])

        # Compute cumulative stress (asymmetric EMA)
        self._compute_cumulative_stress(assessment)

        # Update history
        self._update_history(assessment)

        result["assessment_id"] = str(assessment.id)
        result["cumulative_fsfsi"] = float(assessment.cumulative_fsfsi) if assessment.cumulative_fsfsi else None
        return result

    def _compute_cumulative_stress(self, assessment: AssessmentResult):
        """
        Apply asymmetric EMA at the INDICATOR level (33 indicators), then
        aggregate to components and system level using the same weights as the
        Rust engine.

        For each indicator i:
          CS_i(t) = CS_i(t-1) + ρ · (v_i(t) - CS_i(t-1))
          where ρ = ρ_up if worsening, ρ_down if improving

        System cumulative FSFSI = Σ ωᵢ · CS_i(t)
        where ωᵢ = share_weighted_percent (same weights the Rust engine uses)

        Component cumulative = average of indicator cumulative stresses within
        that component (for dashboard display).
        """
        from apps.assessments.models import ComponentPersistenceConfig, IndicatorResult

        # Load persistence configs per component
        configs = {}
        for cfg in ComponentPersistenceConfig.objects.all():
            configs[cfg.component] = (float(cfg.rho_up), float(cfg.rho_down))
        defaults = ComponentPersistenceConfig.DEFAULTS

        # Find previous year's indicator-level cumulative stress
        prev_assessment = (
            AssessmentResult.objects
            .filter(
                fiscal_year__lt=assessment.fiscal_year,
                cumulative_fsfsi__isnull=False,
            )
            .order_by("-fiscal_year")
            .first()
        )

        # Build lookup: indicator_code -> previous cumulative stress
        prev_indicator_cs = {}
        if prev_assessment:
            for ind in prev_assessment.indicator_results.all():
                if ind.cumulative_stress is not None:
                    prev_indicator_cs[ind.indicator_code] = float(ind.cumulative_stress)

        is_bootstrap = not prev_assessment

        # --- Step 1: Compute cumulative stress per indicator ---
        indicator_results = list(assessment.indicator_results.all())

        n = len(indicator_results)

        cumulative_fsfsi = 0.0
        # Track per-component cumulative stresses for aggregation
        from collections import defaultdict
        component_cumulative = defaultdict(list)

        for ind in indicator_results:
            v = float(ind.stress_value)
            cs_prev = prev_indicator_cs.get(ind.indicator_code, v)  # bootstrap

            # Get persistence parameters from the indicator's component
            comp = ind.component
            if comp in configs:
                rho_up, rho_down = configs[comp]
            elif comp in defaults:
                d = defaults[comp]
                rho_up, rho_down = float(d["rho_up"]), float(d["rho_down"])
            else:
                rho_up, rho_down = 0.40, 0.15

            # Asymmetric EMA
            if is_bootstrap:
                cs_new = v
            else:
                rho = rho_up if v > cs_prev else rho_down
                cs_new = cs_prev + rho * (v - cs_prev)

            # Save indicator cumulative
            ind.cumulative_stress = Decimal(str(round(cs_new, 6)))
            ind.save(update_fields=["cumulative_stress"])

            # Track for component aggregation
            component_cumulative[comp].append((v, cs_new))

        # --- Step 2: Aggregate to component level (average for display) ---
        for comp_result in assessment.component_results.all():
            pairs = component_cumulative.get(comp_result.component, [])
            if pairs:
                avg_cum = sum(cs for _, cs in pairs) / len(pairs)
            else:
                avg_cum = float(comp_result.component_stress)

            comp_weight = float(comp_result.weight)
            comp_result.cumulative_stress = Decimal(str(round(avg_cum, 6)))
            comp_result.cumulative_weighted_stress = Decimal(str(round(comp_weight * avg_cum, 6)))
            comp_result.cumulative_priority_level = classification.classify(avg_cum, classification.LEVEL_COMPONENT)
            comp_result.save(update_fields=[
                "cumulative_stress", "cumulative_weighted_stress", "cumulative_priority_level",
            ])

        # --- Step 3: Compute system-level cumulative FSFSI ---
        # Instead of re-weighting indicators (which requires matching Rust's exact
        # weighting logic), we scale the Rust FSFSI by the aggregate cumulative/current
        # ratio across all indicators. This ensures consistency.
        rust_fsfsi = float(assessment.fsfsi_score)

        if is_bootstrap:
            cumulative_fsfsi = rust_fsfsi
        else:
            # Collect all (current_stress, cumulative_stress) pairs
            all_current = []
            all_cumulative = []
            for pairs in component_cumulative.values():
                for v, cs in pairs:
                    all_current.append(v)
                    all_cumulative.append(cs)

            sum_current = sum(all_current)
            sum_cumulative = sum(all_cumulative)

            if sum_current > 0:
                # Scale Rust's FSFSI by the ratio of cumulative to current stress
                ratio = sum_cumulative / sum_current
                cumulative_fsfsi = rust_fsfsi * ratio
            else:
                cumulative_fsfsi = rust_fsfsi

        assessment.cumulative_fsfsi = Decimal(str(round(cumulative_fsfsi, 6)))
        assessment.cumulative_stress_level = classification.classify(cumulative_fsfsi, classification.LEVEL_SYSTEM)
        assessment.save(update_fields=["cumulative_fsfsi", "cumulative_stress_level"])

    @staticmethod
    def _classify_stress(score: float, level: str = classification.LEVEL_SYSTEM) -> str:
        """Classify a stress score with the calibrated thresholds for ``level``.

        Kept as a thin shim for callers that imported it; see
        ``apps.assessments.classification`` for the calibration logic.
        """
        return classification.classify(score, level)

    def _update_history(self, assessment: AssessmentResult):
        """Update or create history record for trend analysis."""
        component_scores = {
            comp.component: float(comp.component_stress)
            for comp in assessment.component_results.all()
        }

        # YoY: prefer previous fiscal year from history, else latest prior assessment
        prev = AssessmentHistory.objects.filter(
            fiscal_year=assessment.fiscal_year - 1
        ).first()
        prev_score = prev.fsfsi_score if prev and prev.fsfsi_score is not None else None
        if prev_score is None:
            prev_assessment = (
                AssessmentResult.objects.filter(fiscal_year__lt=assessment.fiscal_year)
                .order_by("-fiscal_year")
                .first()
            )
            if prev_assessment and prev_assessment.fsfsi_score is not None:
                prev_score = prev_assessment.fsfsi_score

        yoy_change = None
        yoy_pct = None
        if prev_score is not None and float(prev_score) != 0:
            yoy_change = assessment.fsfsi_score - prev_score
            yoy_pct = (float(yoy_change) / float(prev_score)) * 100

        AssessmentHistory.objects.update_or_create(
            fiscal_year=assessment.fiscal_year,
            defaults={
                "fsfsi_score": assessment.fsfsi_score,
                "stress_level": assessment.stress_level,
                "component_scores": component_scores,
                "total_budget_lcu_bn": assessment.total_budget_lcu_bn,
                "yoy_change": yoy_change,
                "yoy_change_percent": yoy_pct,
                "cumulative_fsfsi": assessment.cumulative_fsfsi,
                "cumulative_component_scores": {
                    comp.component: float(comp.cumulative_stress)
                    for comp in assessment.component_results.all()
                    if comp.cumulative_stress is not None
                },
            },
        )

    # -------------------------------------------------------------------------
    # Query Functions
    # -------------------------------------------------------------------------

    def get_assessment(self, assessment_id: str) -> AssessmentResult | None:
        """Get assessment by ID."""
        try:
            return AssessmentResult.objects.get(id=assessment_id)
        except AssessmentResult.DoesNotExist:
            return None

    def get_latest_assessment(self, fiscal_year: int = None) -> AssessmentResult | None:
        """Get most recent assessment, optionally filtered by fiscal year."""
        qs = AssessmentResult.objects.all()
        if fiscal_year:
            qs = qs.filter(fiscal_year=fiscal_year)
        return qs.order_by("-computed_at").first()

    def list_assessments(
        self,
        fiscal_year: int = None,
        limit: int = 50,
    ) -> list[AssessmentResult]:
        """List assessments with optional filters."""
        qs = AssessmentResult.objects.all()
        if fiscal_year:
            qs = qs.filter(fiscal_year=fiscal_year)
        return list(qs.order_by("-computed_at")[:limit])

    def get_history(self, start_year: int = None, end_year: int = None) -> list[dict]:
        """Get assessment history for trend analysis."""
        qs = AssessmentHistory.objects.all()
        if start_year:
            qs = qs.filter(fiscal_year__gte=start_year)
        if end_year:
            qs = qs.filter(fiscal_year__lte=end_year)
        return list(qs.order_by("fiscal_year").values())

    def get_available_fiscal_years(self) -> list[int]:
        """Return distinct fiscal years that have at least one assessment, latest first."""
        return list(
            AssessmentResult.objects.values_list("fiscal_year", flat=True)
            .distinct()
            .order_by("-fiscal_year")
        )

    # Order in which diagnosis buckets are reported (money problem → results problem)
    DIAGNOSIS_ORDER = (
        classification.DIAG_UNFUNDED_GAP,
        classification.DIAG_PARTIALLY_FUNDED_GAP,
        classification.DIAG_FUNDED_GAP,
        classification.DIAG_AT_BENCHMARK,
    )
    DIAGNOSIS_TOP_N = 5

    def build_diagnosis_summary(self, assessment: AssessmentResult) -> dict:
        """Group an assessment's indicators by gap × financing-coverage diagnosis.

        Separates the "money problem" (unfunded gap) from the "results/delivery
        problem" (funded gap, outcome lag). Per bucket: indicator count, budget
        (bn LCU and share of total), share of the national FSFSI carried by the
        bucket (Σ wᵢυᵢ from the stored engine output), how many of its indicators
        rest on imputed (placeholder) benchmarks, and the top indicators by stress.
        """
        indicators = list(assessment.indicator_results.all())
        total_n = len(indicators)
        total_budget = sum(float(i.weighted_lcu_bn or 0) for i in indicators)

        # Per-indicator contribution to the national index (wᵢ·υᵢ) from engine JSON
        weighted_stress = {}
        for ind in (assessment.result_json or {}).get("indicator_results", []) or []:
            code = ind.get("indicator_code")
            if code is not None and ind.get("weighted_stress") is not None:
                weighted_stress[code] = float(ind["weighted_stress"])
        total_weighted_stress = sum(weighted_stress.values())

        buckets = []
        for diag in self.DIAGNOSIS_ORDER:
            rows = [i for i in indicators if i.diagnosis == diag]
            rows.sort(key=lambda i: float(i.stress_value), reverse=True)
            budget = sum(float(i.weighted_lcu_bn or 0) for i in rows)
            ws = sum(weighted_stress.get(i.indicator_code, 0.0) for i in rows)
            buckets.append({
                "diagnosis": diag,
                "indicator_count": len(rows),
                "indicator_share_percent": (len(rows) / total_n * 100) if total_n else 0.0,
                "budget_lcu_bn": budget,
                "budget_share_percent": (budget / total_budget * 100) if total_budget else 0.0,
                "stress_share_percent": (ws / total_weighted_stress * 100) if total_weighted_stress else 0.0,
                "imputed_count": sum(1 for i in rows if i.delta_imputed),
                "indicators": [
                    {
                        "indicator_code": i.indicator_code,
                        "indicator_name": i.indicator_name,
                        "component": i.component,
                        "component_display": i.get_component_display(),
                        "performance_gap": float(i.performance_gap),
                        "stress_value": float(i.stress_value),
                        "financing_coverage": float(i.financing_coverage) if i.financing_coverage is not None else None,
                        "weighted_lcu_bn": float(i.weighted_lcu_bn or 0),
                        "delta_imputed": bool(i.delta_imputed),
                    }
                    for i in rows[: self.DIAGNOSIS_TOP_N]
                ],
            })

        return {
            "buckets": buckets,
            "total_indicators": total_n,
            "imputed_indicator_count": sum(1 for i in indicators if i.delta_imputed),
            "unlabelled_count": sum(1 for i in indicators if not i.diagnosis),
        }

    def get_dashboard_summary(self, fiscal_year: int = None) -> dict:
        """Get summary data for dashboard display. Returns empty summary when no assessment exists."""
        assessment = self.get_latest_assessment(fiscal_year)
        if not assessment:
            year = fiscal_year or 2024
            return {
                "assessment_id": None,
                "overall_fsfsi": 0.0,
                "stress_level": "low",
                "fiscal_year": year,
                "total_budget_lcu_bn": 0.0,
                "components": [],
                "top_priorities": [],
                "efficiency_index": 0.0,
                "yoy_change_percent": None,
                "computed_at": None,
                "weighting_method": None,
                "scenario": None,
                "stress_thresholds": classification.get_all_thresholds(),
                "diagnosis_summary": None,
                "empty": True,
            }

        components = [
            {
                "component": comp.component,
                "component_display": comp.get_component_display(),
                "stress": float(comp.component_stress),
                "weight": float(comp.weight),
                "budget_lcu_bn": float(comp.budget_lcu_bn or 0),
                "budget_share_percent": float(comp.budget_share_percent or 0),
                "indicator_count": comp.indicators_count,
                "priority_level": comp.priority_level,
                "cumulative_stress": float(comp.cumulative_stress) if comp.cumulative_stress else None,
                "cumulative_priority_level": comp.cumulative_priority_level,
                "avg_performance_gap": float(comp.avg_performance_gap),
                "financing_coverage": float(comp.financing_coverage) if comp.financing_coverage is not None else None,
                "diagnosis": comp.diagnosis,
            }
            for comp in assessment.component_results.all()
        ]

        history = AssessmentHistory.objects.filter(
            fiscal_year=assessment.fiscal_year
        ).first()

        yoy_pct = None
        if history and history.yoy_change_percent is not None:
            yoy_pct = float(history.yoy_change_percent)
        else:
            # Fallback: compute YoY from latest prior assessment (e.g. 2020 vs 2018)
            prev = (
                AssessmentResult.objects.filter(fiscal_year__lt=assessment.fiscal_year)
                .order_by("-fiscal_year")
                .first()
            )
            if prev and prev.fsfsi_score is not None and float(prev.fsfsi_score) != 0:
                yoy_pct = (
                    (float(assessment.fsfsi_score) - float(prev.fsfsi_score))
                    / float(prev.fsfsi_score)
                    * 100
                )

        return {
            "assessment_id": str(assessment.id),
            "overall_fsfsi": float(assessment.fsfsi_score),
            "stress_level": assessment.stress_level,
            "fiscal_year": assessment.fiscal_year,
            "total_budget_lcu_bn": float(assessment.total_budget_lcu_bn or 0),
            "components": components,
            "top_priorities": assessment.result_json.get("action_priorities", [])[:5],
            "efficiency_index": float(assessment.efficiency_index or 0),
            "yoy_change_percent": yoy_pct,
            "cumulative_fsfsi": float(assessment.cumulative_fsfsi) if assessment.cumulative_fsfsi else None,
            "cumulative_stress_level": assessment.cumulative_stress_level,
            "computed_at": assessment.computed_at.isoformat(),
            "weighting_method": assessment.weighting_method,
            "scenario": assessment.scenario,
            "stress_thresholds": classification.get_all_thresholds(),
            "diagnosis_summary": self.build_diagnosis_summary(assessment),
            "empty": False,
        }

    def recalculate_all_cumulative_stress(self) -> int:
        """Recalculate cumulative stress for all assessments after config change.

        Clears all cumulative values, then recomputes in chronological order.
        Returns the number of assessments recalculated.
        """
        from apps.assessments.models import IndicatorResult, ComponentResult

        # Clear all cumulative data
        IndicatorResult.objects.all().update(cumulative_stress=None)
        ComponentResult.objects.all().update(cumulative_stress=None, cumulative_weighted_stress=None)
        AssessmentResult.objects.all().update(cumulative_fsfsi=None, cumulative_stress_level=None)

        # Recompute in chronological order
        assessments = AssessmentResult.objects.order_by("fiscal_year", "computed_at")
        count = 0
        for assessment in assessments:
            self._compute_cumulative_stress(assessment)
            self._update_history(assessment)
            count += 1

        return count

    def load_indicators_from_db(self, fiscal_year: int) -> list[dict]:
        """Load indicator data from database for assessment.

        For indicators where the target fiscal year has no budget data (gross_lcu_bn=0),
        falls back to the nearest fiscal year that has budget data for that indicator.
        This allows assessments for years where only observed/benchmark values were
        interpolated but no budget mapping was imported.
        """
        indicators = []
        for ind in Indicator.objects.all():
            data = IndicatorData.objects.filter(
                indicator=ind, fiscal_year=fiscal_year
            ).first()
            if data:
                gross = float(data.gross_lcu_bn)
                weighted = float(data.weighted_lcu_bn)
                share = float(data.share_weighted_percent)

                # If budget data is zero, fall back to nearest year with budget
                if gross == 0 and weighted == 0:
                    budget_fallback = (
                        IndicatorData.objects.filter(indicator=ind, gross_lcu_bn__gt=0)
                        .order_by(
                            # Prefer closest year
                        )
                        .extra(select={"year_diff": f"ABS(fiscal_year - {int(fiscal_year)})"})
                        .order_by("year_diff")
                        .first()
                    )
                    if budget_fallback:
                        gross = float(budget_fallback.gross_lcu_bn)
                        weighted = float(budget_fallback.weighted_lcu_bn)
                        share = float(budget_fallback.share_weighted_percent)

                # Resolve sensitivity: prefer IndicatorData.sensitivity_parameter (from Excel),
                # then Indicator.default_sensitivity, then let Rust fall back to its default.
                alpha = (
                    float(data.sensitivity_parameter) if data.sensitivity_parameter else
                    float(ind.default_sensitivity) if ind.default_sensitivity else
                    None
                )

                indicators.append({
                    "indicator_code": ind.code,
                    "indicator_component": ind.component,
                    "name": ind.name,
                    "records_count": data.records_count,
                    "gross_lcu_bn": gross,
                    "weighted_lcu_bn": weighted,
                    "share_weighted_percent": share,
                    # `is not None`, not truthiness: a legitimate 0.0 must not be
                    # treated as missing (which would trigger the engine's synthetic
                    # benchmark/observed fallback).
                    "observed_value": float(data.observed_value) if data.observed_value is not None else None,
                    "benchmark_value": float(data.benchmark_value) if data.benchmark_value is not None else None,
                    "higher_is_better": ind.higher_is_better,
                    "sensitivity_parameter": alpha,
                })
        return indicators


# =============================================================================
# OPTIMIZATION SERVICE
# =============================================================================

class OptimizationService:
    """
    Service for budget optimization analysis via Rust engine.

    Provides:
    - Efficiency analysis (current vs optimal allocation)
    - Reallocation plans
    - ROI analysis per component
    """

    def analyze_efficiency(self, components: list[dict]) -> dict:
        """
        Analyze current vs optimal allocation efficiency.

        Returns:
            EfficiencyAnalysis with current/optimal FSFSI, efficiency_index,
            and per-component allocation gaps
        """
        result_json = fsfi_engine.py_analyze_efficiency(_to_json(components))
        return _from_json(result_json)

    def generate_reallocation_plan(
        self,
        components: list[dict],
        target_budget: float = None,
    ) -> dict:
        """
        Generate budget reallocation plan.

        Args:
            components: Current component allocations
            target_budget: Optional new total budget (None = same budget)

        Returns:
            ReallocationPlan with recommended allocations and projected impact
        """
        if target_budget:
            result_json = fsfi_engine.py_generate_reallocation_plan(
                _to_json(components), target_budget
            )
        else:
            result_json = fsfi_engine.py_generate_reallocation_plan(
                _to_json(components)
            )
        return _from_json(result_json)

    def calculate_roi(self, components: list[dict]) -> dict:
        """
        Calculate ROI per component (stress reduction per million USD).

        Returns:
            RoiAnalysis with marginal benefit and ROI ranking
        """
        result_json = fsfi_engine.py_calculate_roi(_to_json(components))
        return _from_json(result_json)


# =============================================================================
# PERFORMANCE GAP SERVICE
# =============================================================================

class PerformanceGapService:
    """
    Service for performance gap analysis via Rust engine.

    Provides:
    - Gap analysis per component
    - Peer country comparisons
    - Target recommendations for gap closure
    """

    def analyze_gaps(self, components: list[dict]) -> dict:
        """
        Analyze performance gaps per component.

        Returns:
            GapAnalysisResult with gaps, ranking, and recommendations
        """
        result_json = fsfi_engine.py_analyze_performance_gaps(_to_json(components))
        return _from_json(result_json)

    def compare_peers(
        self,
        rwanda_components: list[dict],
        peer_components: list[dict],
    ) -> dict:
        """
        Compare Rwanda against peer countries.

        Args:
            rwanda_components: Rwanda's component data
            peer_components: List of peer country component data

        Returns:
            PeerComparisonResult with rankings and position analysis
        """
        result_json = fsfi_engine.py_compare_peers(
            _to_json(rwanda_components),
            _to_json(peer_components),
        )
        return _from_json(result_json)

    def recommend_targets(
        self,
        components: list[dict],
        target_year: int = 2029,
        current_year: int = 2025,
    ) -> dict:
        """
        Generate gap closure target recommendations.

        Args:
            components: Current component data
            target_year: Year to achieve targets
            current_year: Current fiscal year

        Returns:
            TargetRecommendationsResult with annual targets
        """
        result_json = fsfi_engine.py_recommend_targets(
            _to_json(components), target_year, current_year
        )
        return _from_json(result_json)


# =============================================================================
# WEIGHTING SERVICE
# =============================================================================

class WeightingService:
    """
    Service for component weighting calculations via Rust engine.

    Provides:
    - Expert (AHP) weights
    - Financial weights
    - Network (PageRank) weights
    - Hybrid weights
    """

    def calculate_ahp_weights(self, scenario: str = "normal_operations") -> dict:
        """
        Calculate AHP expert weights.

        Returns:
            AhpResult with weights, consistency ratio, and validation
        """
        result_json = fsfi_engine.py_calculate_ahp_weights(scenario)
        return _from_json(result_json)

    def calculate_financial_weights(self, components: list[dict]) -> dict:
        """
        Calculate budget-proportional weights.

        Returns:
            Dict mapping component -> weight
        """
        result_json = fsfi_engine.py_calculate_financial_weights(_to_json(components))
        return _from_json(result_json)

    def analyze_financial(
        self,
        components: list[dict],
        scenario: str = None,
        is_crisis: bool = False,
    ) -> dict:
        """
        Full financial analysis with effective weights.

        Returns:
            FinancialAnalysisResult with concentration index, underfunded components
        """
        if scenario:
            result_json = fsfi_engine.py_analyze_financial(
                _to_json(components), scenario, is_crisis
            )
        else:
            result_json = fsfi_engine.py_analyze_financial(
                _to_json(components)
            )
        return _from_json(result_json)

    def calculate_pagerank(self, scenario: str = "normal_operations") -> dict:
        """
        Calculate PageRank centrality weights.

        Returns:
            Dict mapping component -> weight
        """
        result_json = fsfi_engine.py_calculate_pagerank(scenario)
        return _from_json(result_json)

    def analyze_network(self, scenario: str = "normal_operations") -> dict:
        """
        Full network analysis with cascade multipliers.

        Returns:
            NetworkResult with pagerank and cascade weights
        """
        result_json = fsfi_engine.py_analyze_network(scenario)
        return _from_json(result_json)

    def calculate_hybrid_weights(
        self,
        components: list[dict],
        scenario: str = None,
    ) -> dict:
        """
        Calculate hybrid weights (blend of all methods).

        Default blend: 35% expert + 30% pagerank + 25% cascade + 10% financial

        Returns:
            HybridResult with all weight components
        """
        if scenario:
            result_json = fsfi_engine.py_calculate_hybrid_weights(
                _to_json(components), scenario
            )
        else:
            result_json = fsfi_engine.py_calculate_hybrid_weights(_to_json(components))
        return _from_json(result_json)

    def calculate_hybrid_weights_with_performance(
        self,
        components: list[dict],
        stress_values: dict[str, float],
        scenario: str = None,
    ) -> dict:
        """
        Calculate hybrid weights adjusted by component stress.

        Higher stress = higher weight adjustment (clamped 0.5-2.0)

        Returns:
            Dict mapping component -> adjusted weight
        """
        if scenario:
            result_json = fsfi_engine.py_calculate_hybrid_weights_with_performance(
                _to_json(components), _to_json(stress_values), scenario
            )
        else:
            result_json = fsfi_engine.py_calculate_hybrid_weights_with_performance(
                _to_json(components), _to_json(stress_values)
            )
        return _from_json(result_json)


# =============================================================================
# CONFIG SERVICE
# =============================================================================

class ConfigService:
    """
    Service for FSFSI configuration and utilities.
    """

    def get_config(self) -> dict:
        """Engine configuration, with stress thresholds replaced by the calibrated set.

        The Rust defaults (0.05/0.15/0.30) are kept under ``engine_default_stress_thresholds``
        for reference only; classification uses ``stress_thresholds`` (per level).
        """
        cfg = _from_json(fsfi_engine.get_default_config())
        if isinstance(cfg, dict):
            if "stress_thresholds" in cfg:
                cfg["engine_default_stress_thresholds"] = cfg["stress_thresholds"]
            cfg["stress_thresholds"] = classification.get_all_thresholds()
        return cfg

    def get_stress_level(self, fsfsi_score: float, level: str = classification.LEVEL_SYSTEM) -> str:
        """Classify a score with the calibrated thresholds for ``level`` (default: system)."""
        return classification.classify(fsfsi_score, level)

    def get_indicator_components(self) -> list[str]:
        """Get list of 8 indicator component names."""
        return fsfi_engine.py_get_indicator_components()

    def normalize_indicator_component(self, component: str) -> str:
        """Normalize indicator component name."""
        return fsfi_engine.py_normalize_indicator_component(component)

    def get_indicator_sensitivity(self, component: str) -> float:
        """Get default sensitivity parameter for an indicator component."""
        return fsfi_engine.py_get_indicator_sensitivity(component)

    def get_indicator_component_sensitivities(self) -> list[dict]:
        """Get sensitivity (α) for each of the 8 indicator components (from engine)."""
        display_names = {
            "markets": "Markets",
            "crop_production": "Crop Production",
            "nutrition": "Nutrition",
            "research": "Research",
            "post_harvest": "Post-Harvest",
            "environment": "Environment",
            "animal_systems": "Animal Systems",
            "finance": "Finance",
        }
        components = self.get_indicator_components()
        return [
            {
                "component": c,
                "component_display": display_names.get(c, c.replace("_", " ").title()),
                "sensitivity": round(self.get_indicator_sensitivity(c), 6),
            }
            for c in components
        ]


# =============================================================================
# CORE CALCULATIONS SERVICE
# =============================================================================

class CalculationsService:
    """
    Low-level FSFSI calculation functions via Rust engine.

    Use these for custom calculations or debugging.
    """

    def performance_gap(self, observed: float, benchmark: float) -> float:
        """Calculate performance gap: δᵢ = |xᵢ - x̄ᵢ| / max(xᵢ, x̄ᵢ)"""
        return fsfi_engine.py_performance_gap(observed, benchmark)

    def component_stress(
        self,
        gap: float,
        allocation: float,
        sensitivity: float,
    ) -> float:
        """Calculate component stress: υᵢ(fᵢ) = δᵢ · e^(-αᵢfᵢ)"""
        return fsfi_engine.py_component_stress(gap, allocation, sensitivity)

    def weighted_stress(self, stress: float, weight: float) -> float:
        """Calculate weighted stress: ωᵢ · υᵢ"""
        return fsfi_engine.py_weighted_stress(stress, weight)

    def system_fsfsi(
        self,
        gaps: list[float],
        allocations: list[float],
        sensitivities: list[float],
        weights: list[float],
    ) -> float:
        """Calculate system FSFSI: Σᵢ ωᵢ · δᵢ · e^(-αᵢfᵢ)"""
        return fsfi_engine.py_system_fsfsi(gaps, allocations, sensitivities, weights)

    def optimal_allocation(
        self,
        gaps: list[float],
        sensitivities: list[float],
        weights: list[float],
        total_budget: float,
    ) -> list[float]:
        """Calculate optimal allocation using closed-form solution."""
        return fsfi_engine.py_optimal_allocation(gaps, sensitivities, weights, total_budget)

    def efficiency_index(self, fsfsi_actual: float, fsfsi_optimal: float) -> float:
        """Calculate efficiency: FSFSI_optimal / FSFSI_actual"""
        return fsfi_engine.py_efficiency_index(fsfsi_actual, fsfsi_optimal)

    def gap_ratio(self, fsfsi_actual: float, fsfsi_optimal: float) -> float:
        """Calculate gap ratio: (FSFSI_actual - FSFSI_optimal) / FSFSI_optimal"""
        return fsfi_engine.py_gap_ratio(fsfsi_actual, fsfsi_optimal)

    def full_component_stress(
        self,
        observed: float,
        benchmark: float,
        allocation: float,
        sensitivity: float,
        weight: float,
        total_budget: float,
    ) -> dict:
        """Complete component calculation."""
        result_json = fsfi_engine.py_full_component_stress(
            observed, benchmark, allocation, sensitivity, weight, total_budget
        )
        return _from_json(result_json)


# =============================================================================
# SERVICE FACTORY
# =============================================================================

# Singleton instances
_assessment_service: AssessmentService | None = None
_optimization_service: OptimizationService | None = None
_performance_gap_service: PerformanceGapService | None = None
_weighting_service: WeightingService | None = None
_config_service: ConfigService | None = None
_calculations_service: CalculationsService | None = None


def get_assessment_service() -> AssessmentService:
    """Get singleton AssessmentService instance."""
    global _assessment_service
    if _assessment_service is None:
        _assessment_service = AssessmentService()
    return _assessment_service


def get_optimization_service() -> OptimizationService:
    """Get singleton OptimizationService instance."""
    global _optimization_service
    if _optimization_service is None:
        _optimization_service = OptimizationService()
    return _optimization_service


def get_performance_gap_service() -> PerformanceGapService:
    """Get singleton PerformanceGapService instance."""
    global _performance_gap_service
    if _performance_gap_service is None:
        _performance_gap_service = PerformanceGapService()
    return _performance_gap_service


def get_weighting_service() -> WeightingService:
    """Get singleton WeightingService instance."""
    global _weighting_service
    if _weighting_service is None:
        _weighting_service = WeightingService()
    return _weighting_service


def get_config_service() -> ConfigService:
    """Get singleton ConfigService instance."""
    global _config_service
    if _config_service is None:
        _config_service = ConfigService()
    return _config_service


def get_calculations_service() -> CalculationsService:
    """Get singleton CalculationsService instance."""
    global _calculations_service
    if _calculations_service is None:
        _calculations_service = CalculationsService()
    return _calculations_service
