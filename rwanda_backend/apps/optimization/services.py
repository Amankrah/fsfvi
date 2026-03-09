"""
Optimization Services for Rwanda FSFSI.

Thin wrapper services around Rust fsfi_engine optimization functions.
NO duplicated computation logic - all math handled by Rust for performance.
"""

import json
import logging
from typing import Any

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
    """Convert component list to JSON for Rust engine.

    Expected component structure:
    {
        "component_type": "markets",
        "observed_value": 75.0,
        "benchmark_value": 90.0,
        "financial_allocation_usd": 125000000.0,
        "sensitivity_parameter": 0.0015,  # optional
        "weight": 0.35,  # optional
        "name": "Market Access"  # optional
    }
    """
    return json.dumps(components)


# =============================================================================
# OPTIMIZATION SERVICE
# =============================================================================


class OptimizationService:
    """Service for budget optimization operations via Rust fsfi_engine."""

    def analyze_efficiency(self, components: list[dict]) -> dict:
        """
        Analyze current vs optimal allocation efficiency.

        Calls Rust: py_analyze_efficiency(components_json)

        Args:
            components: List of component dicts with observed_value, benchmark_value,
                       financial_allocation_usd, etc.

        Returns:
            EfficiencyAnalysis with current_fsfsi, optimal_fsfsi, efficiency_index,
            and per-component efficiency breakdown.
        """
        engine = _get_engine()
        components_json = _components_to_json(components)

        try:
            result_json = engine.py_analyze_efficiency(components_json)
            return json.loads(result_json)
        except Exception as e:
            logger.error(f"Efficiency analysis failed: {e}")
            raise

    def generate_reallocation_plan(
        self, components: list[dict], target_budget: float | None = None
    ) -> dict:
        """
        Generate budget reallocation plan.

        Calls Rust: py_generate_reallocation_plan(components_json, target_budget)

        Args:
            components: List of component dicts
            target_budget: Optional target total budget (USD). If None, uses current total.

        Returns:
            ReallocationPlan with current_fsfsi, projected_fsfsi, improvement,
            and per-component reallocation recommendations.
        """
        engine = _get_engine()
        components_json = _components_to_json(components)

        try:
            result_json = engine.py_generate_reallocation_plan(
                components_json, target_budget
            )
            return json.loads(result_json)
        except Exception as e:
            logger.error(f"Reallocation plan generation failed: {e}")
            raise

    def calculate_roi(self, components: list[dict]) -> dict:
        """
        Calculate ROI per component.

        Calls Rust: py_calculate_roi(components_json)

        Args:
            components: List of component dicts

        Returns:
            RoiAnalysis with per-component ROI metrics and rankings.
        """
        engine = _get_engine()
        components_json = _components_to_json(components)

        try:
            result_json = engine.py_calculate_roi(components_json)
            return json.loads(result_json)
        except Exception as e:
            logger.error(f"ROI calculation failed: {e}")
            raise


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
                   component_type, observed_value, benchmark_value, financial_allocation_usd

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
