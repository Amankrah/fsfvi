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

from .models import (
    AssessmentHistory,
    AssessmentResult,
    ComponentResult,
    IndicatorResult,
    StressLevel,
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
        return _from_json(result_json)

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
        return _from_json(result_json)

    def quick_check(self, components: list[dict]) -> dict:
        """
        Run quick FSFSI check (lightweight assessment).

        Returns:
            QuickCheckResult dict with fsfi_score, risk_level, critical_components
        """
        result_json = fsfi_engine.py_quick_check(_to_json(components))
        return _from_json(result_json)

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

        # Map risk level
        stress_level = self._map_stress_level(result["risk_level"])

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

        # Save component aggregations
        for comp_agg in result["component_aggregations"]:
            ComponentResult.objects.create(
                assessment=assessment,
                component=comp_agg["component"],
                weight=Decimal("0.125"),  # 1/8
                avg_performance_gap=Decimal(str(comp_agg["average_performance_gap"])),
                component_stress=Decimal(str(comp_agg["average_performance_gap"])),
                weighted_stress=Decimal(str(comp_agg["average_performance_gap"] / 8)),
                priority_level=self._map_stress_level(
                    fsfi_engine.get_stress_level(comp_agg["average_performance_gap"])
                ),
                budget_lcu_bn=Decimal(str(comp_agg["total_weighted_lcu_bn"])),
                budget_share_percent=Decimal(str(comp_agg["total_share_weighted_percent"])),
                indicators_count=comp_agg["indicator_count"],
            )

        # Save indicator results
        for ind in result["indicator_results"]:
            IndicatorResult.objects.create(
                assessment=assessment,
                indicator_code=ind["indicator_code"],
                indicator_name=ind["name"],
                component=ind["indicator_component"],
                performance_gap=Decimal(str(ind["performance_gap"])),
                stress_value=Decimal(str(ind["stress"])),
                weighted_lcu_bn=Decimal(str(ind["weighted_lcu_bn"])),
                share_weighted_percent=Decimal(str(ind["share_weighted_percent"])),
            )

        # Update history
        self._update_history(assessment)

        result["assessment_id"] = str(assessment.id)
        return result

    def _map_stress_level(self, level: str) -> str:
        """Map Rust stress level string to Django enum."""
        mapping = {
            "low": StressLevel.LOW,
            "medium": StressLevel.MEDIUM,
            "high": StressLevel.HIGH,
            "critical": StressLevel.CRITICAL,
        }
        return mapping.get(level.lower(), StressLevel.MEDIUM)

    def _update_history(self, assessment: AssessmentResult):
        """Update or create history record for trend analysis."""
        component_scores = {
            comp.component: float(comp.component_stress)
            for comp in assessment.component_results.all()
        }

        prev = AssessmentHistory.objects.filter(
            fiscal_year=assessment.fiscal_year - 1
        ).first()

        yoy_change = None
        yoy_pct = None
        if prev and prev.fsfsi_score:
            yoy_change = assessment.fsfsi_score - prev.fsfsi_score
            if prev.fsfsi_score != 0:
                yoy_pct = (yoy_change / prev.fsfsi_score) * 100

        AssessmentHistory.objects.update_or_create(
            fiscal_year=assessment.fiscal_year,
            defaults={
                "fsfsi_score": assessment.fsfsi_score,
                "stress_level": assessment.stress_level,
                "component_scores": component_scores,
                "total_budget_lcu_bn": assessment.total_budget_lcu_bn,
                "yoy_change": yoy_change,
                "yoy_change_percent": yoy_pct,
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

    def get_dashboard_summary(self, fiscal_year: int = None) -> dict | None:
        """Get summary data for dashboard display."""
        assessment = self.get_latest_assessment(fiscal_year)
        if not assessment:
            return None

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
            }
            for comp in assessment.component_results.all()
        ]

        history = AssessmentHistory.objects.filter(
            fiscal_year=assessment.fiscal_year
        ).first()

        return {
            "assessment_id": str(assessment.id),
            "overall_fsfsi": float(assessment.fsfsi_score),
            "stress_level": assessment.stress_level,
            "fiscal_year": assessment.fiscal_year,
            "total_budget_lcu_bn": float(assessment.total_budget_lcu_bn or 0),
            "components": components,
            "top_priorities": assessment.result_json.get("action_priorities", [])[:5],
            "efficiency_index": float(assessment.efficiency_index or 0),
            "yoy_change_percent": float(history.yoy_change_percent) if history and history.yoy_change_percent else None,
            "computed_at": assessment.computed_at.isoformat(),
        }

    def load_indicators_from_db(self, fiscal_year: int) -> list[dict]:
        """Load indicator data from database for assessment."""
        indicators = []
        for ind in Indicator.objects.all():
            data = IndicatorData.objects.filter(
                indicator=ind, fiscal_year=fiscal_year
            ).first()
            if data:
                indicators.append({
                    "indicator_code": ind.code,
                    "indicator_component": ind.component,
                    "name": ind.name,
                    "records_count": data.records_count,
                    "gross_lcu_bn": float(data.gross_lcu_bn),
                    "weighted_lcu_bn": float(data.weighted_lcu_bn),
                    "share_weighted_percent": float(data.share_weighted_percent),
                    "observed_value": float(data.observed_value) if data.observed_value else None,
                    "benchmark_value": float(data.benchmark_value) if data.benchmark_value else None,
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
        """Get default FSFSI configuration."""
        return _from_json(fsfi_engine.get_default_config())

    def get_stress_level(self, fsfsi_score: float) -> str:
        """Get stress level for a given FSFSI score."""
        return fsfi_engine.get_stress_level(fsfsi_score)

    def get_indicator_components(self) -> list[str]:
        """Get list of 8 indicator component names."""
        return fsfi_engine.py_get_indicator_components()

    def normalize_indicator_component(self, component: str) -> str:
        """Normalize indicator component name."""
        return fsfi_engine.py_normalize_indicator_component(component)

    def get_indicator_sensitivity(self, component: str) -> float:
        """Get default sensitivity parameter for an indicator component."""
        return fsfi_engine.py_get_indicator_sensitivity(component)


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
