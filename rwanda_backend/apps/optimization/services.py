"""
Optimization Services for Rwanda FSFSI.

The assessment engine is the single source of truth for FSFSI scores.
Optimization services consume assessment results (via assessment_id) and only
compute allocation recommendations — they never re-derive the FSFSI.

Architecture:
  1. Assessment engine (Rust) → computes FSFSI from 33 indicators (authoritative)
  2. Optimization engine (Rust) → computes optimal allocations & efficiency ratios
  3. This service layer → bridges both: loads assessment, calls optimizer,
     stamps the assessment's FSFSI as the authoritative "current" score.
"""

import json
import logging

logger = logging.getLogger(__name__)


def _get_engine():
    """Import fsfi_engine lazily to avoid import errors during migrations."""
    try:
        import fsfi_engine
        return fsfi_engine
    except ImportError as e:
        logger.error(f"Failed to import fsfi_engine: {e}")
        raise RuntimeError(
            "fsfi_engine not available. Build with: cd fsfi_engine && maturin develop"
        ) from e


def _components_to_json(components: list[dict]) -> str:
    """Convert component list to JSON for Rust engine."""
    return json.dumps(components)


def _build_component_inputs_from_assessment(assessment) -> list[dict]:
    """Build optimization component inputs from a saved AssessmentResult.

    Uses the assessment's component results (stress, budget, weight, performance gap)
    to construct inputs the Rust optimization engine expects.

    The performance gap (δ) is preserved by setting observed_value = 1 - gap and
    benchmark_value = 1, so the Rust gap formula δ = |obs - bench| / max(obs, bench)
    reproduces the assessment's gap exactly.
    """
    from apps.fsfvi_data.models import Indicator

    # Get component-level alpha (alpha_per_bnLCU) from the Indicator model
    component_alphas = {}
    for ind in Indicator.objects.all():
        if ind.default_sensitivity and ind.component not in component_alphas:
            component_alphas[ind.component] = float(ind.default_sensitivity)

    components = []
    for comp in assessment.component_results.all().order_by("component"):
        gap = float(comp.avg_performance_gap or 0)
        budget_bn = float(comp.budget_lcu_bn or 0)
        n_indicators = comp.indicators_count or 1
        weight = float(comp.weight) if comp.weight is not None else None
        alpha_bn = component_alphas.get(comp.component)

        # Alpha is calibrated per INDICATOR (alpha_per_bnLCU from Excel).
        # The Rust engine works at component level, so pass per-indicator
        # average allocation to keep α·f in the correct range.
        avg_budget_bn = budget_bn / n_indicators

        components.append({
            "component_type": comp.component,
            "observed_value": max(0.0, 1.0 - gap),
            "benchmark_value": 1.0,
            "financial_allocation_lcu": avg_budget_bn * 1_000_000,
            **({"sensitivity_parameter": alpha_bn} if alpha_bn else {}),
            **({"weight": weight} if weight is not None else {}),
        })
    return components


def _stamp_assessment_fsfsi(result: dict, assessment) -> dict:
    """Override the optimizer's re-computed FSFSI with the assessment's authoritative scores.

    Uses the assessment's own FSFSI and efficiency metrics rather than the
    optimizer's component-level approximation.
    """
    fsfsi = float(assessment.fsfsi_score)
    fsfsi_optimal = float(assessment.fsfsi_optimal) if assessment.fsfsi_optimal else None
    efficiency = float(assessment.efficiency_index) if assessment.efficiency_index else None

    result["current_fsfsi"] = fsfsi

    if fsfsi_optimal is not None:
        if "optimal_fsfsi" in result:
            result["optimal_fsfsi"] = fsfsi_optimal
        if "projected_fsfsi" in result:
            result["projected_fsfsi"] = fsfsi_optimal
    if efficiency is not None:
        if "efficiency_index" in result:
            result["efficiency_index"] = efficiency
        if "waste_ratio" in result:
            result["waste_ratio"] = round(1.0 - efficiency, 4)
    if fsfsi_optimal is not None:
        improvement = fsfsi - fsfsi_optimal
        if "projected_improvement" in result:
            result["projected_improvement"] = improvement
        if "projected_improvement_pct" in result and fsfsi > 0:
            result["projected_improvement_pct"] = (improvement / fsfsi) * 100.0

    # Scale allocation values back to real LCU (component totals).
    # We passed avg_per_indicator_bn * 1M. Rust returns per-indicator allocations
    # in those units. To get component total in real LCU:
    # returned_value * 1000 (to get bn→real LCU) * n_indicators (avg→total)
    indicator_counts = {}
    for comp in assessment.component_results.all():
        indicator_counts[comp.component] = comp.indicators_count or 1

    alloc_fields = [
        "current_allocation_lcu", "optimal_allocation_lcu", "allocation_gap_lcu",
        "recommended_allocation_lcu", "change_lcu",
    ]
    total_budget = 0.0
    for comp in result.get("components", []):
        n = indicator_counts.get(comp.get("component_type", ""), 1)
        scale = 1000.0 * n  # per-indicator avg → component total in real LCU
        for field in alloc_fields:
            if field in comp:
                comp[field] *= scale
        if "current_allocation_lcu" in comp:
            total_budget += comp["current_allocation_lcu"]

    if "total_budget_lcu" in result:
        result["total_budget_lcu"] = total_budget

    return result


# =============================================================================
# OPTIMIZATION SERVICE
# =============================================================================


class OptimizationService:
    """Service for budget optimization operations via Rust fsfi_engine.

    The primary interface uses assessment_id to load the assessment's authoritative
    FSFSI and component data, then runs the Rust optimizer for allocation analysis.
    """

    # -----------------------------------------------------------------
    # Assessment-based methods (preferred — single source of truth)
    # -----------------------------------------------------------------

    def efficiency_for_assessment(self, assessment_id: str) -> dict:
        """Analyze efficiency using a saved assessment as the source of truth.

        Loads the assessment, builds component inputs from it, runs the Rust
        optimizer, then stamps the assessment's FSFSI as current_fsfsi.
        """
        from apps.assessments.models import AssessmentResult

        assessment = AssessmentResult.objects.get(pk=assessment_id)
        components = _build_component_inputs_from_assessment(assessment)
        result = self.analyze_efficiency(components)
        return _stamp_assessment_fsfsi(result, assessment)

    def reallocation_for_assessment(
        self, assessment_id: str, target_budget: float | None = None
    ) -> dict:
        """Generate reallocation plan using a saved assessment."""
        from apps.assessments.models import AssessmentResult

        assessment = AssessmentResult.objects.get(pk=assessment_id)
        components = _build_component_inputs_from_assessment(assessment)
        result = self.generate_reallocation_plan(components, target_budget)
        return _stamp_assessment_fsfsi(result, assessment)

    def roi_for_assessment(self, assessment_id: str) -> dict:
        """Calculate ROI using a saved assessment."""
        from apps.assessments.models import AssessmentResult

        assessment = AssessmentResult.objects.get(pk=assessment_id)
        components = _build_component_inputs_from_assessment(assessment)
        return self.calculate_roi(components)

    # -----------------------------------------------------------------
    # Low-level methods (raw component inputs — used internally)
    # -----------------------------------------------------------------

    def analyze_efficiency(self, components: list[dict]) -> dict:
        """Run Rust py_analyze_efficiency on raw component inputs."""
        engine = _get_engine()
        result_json = engine.py_analyze_efficiency(_components_to_json(components))
        return json.loads(result_json)

    def generate_reallocation_plan(
        self, components: list[dict], target_budget: float | None = None
    ) -> dict:
        """Run Rust py_generate_reallocation_plan on raw component inputs."""
        engine = _get_engine()
        result_json = engine.py_generate_reallocation_plan(
            _components_to_json(components), target_budget
        )
        return json.loads(result_json)

    def calculate_roi(self, components: list[dict]) -> dict:
        """Run Rust py_calculate_roi on raw component inputs."""
        engine = _get_engine()
        result_json = engine.py_calculate_roi(_components_to_json(components))
        return json.loads(result_json)


# =============================================================================
# PERFORMANCE GAP SERVICE
# =============================================================================


class PerformanceGapService:
    """Service for performance gap analysis via Rust fsfi_engine."""

    def analyze_gaps(self, components: list[dict]) -> dict:
        """
        Analyze performance gaps per component.

        Calls Rust: py_analyze_performance_gaps(components_json)

        Args:
            components: List of component dicts with observed_value, benchmark_value

        Returns:
            GapAnalysisResult with per-component gaps, distribution, and recommendations.
        """
        engine = _get_engine()
        components_json = _components_to_json(components)

        try:
            result_json = engine.py_analyze_performance_gaps(components_json)
            return json.loads(result_json)
        except Exception as e:
            logger.error(f"Gap analysis failed: {e}")
            raise

    def compare_peers(self, rwanda: list[dict], peers: list[dict]) -> dict:
        """
        Compare Rwanda against peer countries.

        Calls Rust: py_compare_peers(rwanda_json, peer_json)

        Args:
            rwanda: Rwanda's component performance data
            peers: List of peer country data with country_code, country_name,
                   component_type, observed_value, benchmark_value, financial_allocation_lcu

        Returns:
            PeerComparisonResult with rankings and per-component comparison.
        """
        engine = _get_engine()
        rwanda_json = _components_to_json(rwanda)
        peer_json = json.dumps(peers)

        try:
            result_json = engine.py_compare_peers(rwanda_json, peer_json)
            return json.loads(result_json)
        except Exception as e:
            logger.error(f"Peer comparison failed: {e}")
            raise

    def recommend_targets(
        self,
        components: list[dict],
        target_year: int = 2029,
        current_year: int = 2025,
    ) -> dict:
        """
        Generate target recommendations for gap closure.

        Calls Rust: py_recommend_targets(components_json, target_year, current_year)

        Args:
            components: List of component dicts
            target_year: Target year for gap closure (default: 2029 - PSTA5 end)
            current_year: Current year (default: 2025)

        Returns:
            TargetRecommendationsResult with per-component targets and milestones.
        """
        engine = _get_engine()
        components_json = _components_to_json(components)

        try:
            result_json = engine.py_recommend_targets(
                components_json, target_year, current_year
            )
            return json.loads(result_json)
        except Exception as e:
            logger.error(f"Target recommendation failed: {e}")
            raise


# =============================================================================
# SERVICE INSTANCES
# =============================================================================

_optimization_service = None
_performance_gap_service = None


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
