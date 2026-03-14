"""
Assessment Views for Rwanda FSFSI API.

All computation is handled by the Rust fsfi_engine via services.
Views strictly serve data from the backend only: stored assessment results (DB)
or direct Rust engine responses. No assessment/scoring/stress logic in views.
"""

import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    AssessmentHistorySerializer,
    AssessmentRequestSerializer,
    AssessmentResultListSerializer,
    AssessmentResultOutputSerializer,
    AssessmentResultSerializer,
    DashboardSummarySerializer,
    QuickCheckOutputSerializer,
    QuickCheckRequestSerializer,
    RunForYearRequestSerializer,
)
from .services import (
    get_assessment_service,
    get_calculations_service,
    get_config_service,
    get_optimization_service,
    get_performance_gap_service,
    get_weighting_service,
)

logger = logging.getLogger(__name__)


def _normalize_optimization_components(components):
    """Normalize component dicts for Rust: ensure required numeric fields are float. Returns (list, error_msg)."""
    normalized = []
    for i, c in enumerate(components):
        if not isinstance(c, dict):
            return None, f"Component at index {i} must be an object."
        try:
            component_type = str(c.get("component_type") or c.get("component") or "").strip()
            observed = float(c.get("observed_value", 0))
            benchmark = float(c.get("benchmark_value", 0))
            allocation = float(c.get("financial_allocation_usd", 0))
        except (TypeError, ValueError) as e:
            return None, f"Component at index {i}: invalid number ({e})."
        if not component_type:
            return None, f"Component at index {i}: component_type or component required."
        if allocation < 0:
            return None, f"Component at index {i}: financial_allocation_usd must be non-negative."
        out = {
            "component_type": component_type,
            "observed_value": observed,
            "benchmark_value": benchmark,
            "financial_allocation_usd": allocation,
        }
        if c.get("sensitivity_parameter") is not None:
            try:
                out["sensitivity_parameter"] = float(c["sensitivity_parameter"])
            except (TypeError, ValueError):
                pass
        if c.get("weight") is not None:
            try:
                out["weight"] = float(c["weight"])
            except (TypeError, ValueError):
                pass
        if c.get("name") is not None:
            out["name"] = str(c["name"])
        normalized.append(out)
    total = sum(c["financial_allocation_usd"] for c in normalized)
    if total <= 0:
        return None, "Total financial_allocation_usd across components must be positive."
    return normalized, None


# =============================================================================
# ASSESSMENT VIEWS
# =============================================================================

class RunAssessmentView(APIView):
    """
    Run a full FSFSI assessment.

    POST /api/assessments/run/

    Passes indicator data to Rust engine; returns engine result only. No view-level logic.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AssessmentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        service = get_assessment_service()

        try:
            if data.get("save_result", True):
                result = service.run_and_save_assessment(
                    indicators=data["indicators"],
                    fiscal_year=data["fiscal_year"],
                    assessment_name=data.get("assessment_name", ""),
                    weighting_method=data.get("weighting_method", "hybrid"),
                    scenario=data.get("scenario", "normal_operations"),
                    user=request.user,
                )
            else:
                result = service.run_indicator_assessment(
                    indicators=data["indicators"],
                    weighting_method=data.get("weighting_method", "hybrid"),
                    scenario=data.get("scenario", "normal_operations"),
                    fiscal_year=data["fiscal_year"],
                )

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class RunForYearView(APIView):
    """
    Run FSFSI assessment for a fiscal year using indicator data from the database.

    POST /api/assessments/run-for-year/

    Body: { "fiscal_year": 2024, "assessment_name": "FY2024 assessment" (optional) }
    Loads indicators from DB, runs Rust engine, saves result. No client-provided indicators.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RunForYearRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        service = get_assessment_service()
        fiscal_year = data["fiscal_year"]
        indicators = service.load_indicators_from_db(fiscal_year)

        if not indicators:
            return Response(
                {"error": f"No indicator data for fiscal year {fiscal_year}. Import budget mapping and indicator parameters first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = service.run_and_save_assessment(
                indicators=indicators,
                fiscal_year=fiscal_year,
                assessment_name=data.get("assessment_name") or f"FY{fiscal_year} assessment",
                weighting_method=data.get("weighting_method", "hybrid"),
                scenario=data.get("scenario", "normal_operations"),
                user=request.user,
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class QuickCheckView(APIView):
    """
    Run a quick FSFSI check (lightweight assessment).

    POST /api/assessments/quick-check/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = QuickCheckRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        service = get_assessment_service()

        try:
            # Option A: when observed is missing, use neutral gap (observed = benchmark).
            # Avoids mixing budget-share scale with real benchmark units.
            indicators = serializer.validated_data["indicators"]
            components = []
            for ind in indicators:
                bench = ind.get("benchmark_value")
                bench_val = float(bench) if bench is not None else 100.0
                obs = ind.get("observed_value")
                obs_val = float(obs) if obs is not None else bench_val
                components.append({
                    "component_type": ind["indicator_component"],
                    "observed_value": obs_val,
                    "benchmark_value": bench_val,
                    "financial_allocation_usd": float(ind["weighted_lcu_bn"]) * 1_000_000,
                })

            result = service.quick_check(components)
            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AssessmentListView(APIView):
    """
    List assessments. GET /api/assessments/

    Returns stored assessment records only (from DB).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        fiscal_year = request.query_params.get("fiscal_year")
        limit = int(request.query_params.get("limit", 50))

        service = get_assessment_service()
        assessments = service.list_assessments(
            fiscal_year=int(fiscal_year) if fiscal_year else None,
            limit=limit,
        )

        serializer = AssessmentResultListSerializer(assessments, many=True)
        return Response(serializer.data)


class AssessmentDetailView(APIView):
    """
    Get assessment details. GET /api/assessments/<id>/

    Returns stored assessment only; all scores/stress from backend.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):
        service = get_assessment_service()
        assessment = service.get_assessment(assessment_id)

        if not assessment:
            return Response(
                {"error": "Assessment not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AssessmentResultSerializer(assessment)
        return Response(serializer.data)


class DashboardSummaryView(APIView):
    """
    Get dashboard summary for a fiscal year.

    GET /api/assessments/dashboard/

    Returns data from stored assessment only (stress_level, priority_level from Rust).
    No client-side or view-level computation.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        fiscal_year = request.query_params.get("fiscal_year")

        service = get_assessment_service()
        summary = service.get_dashboard_summary(
            fiscal_year=int(fiscal_year) if fiscal_year else None
        )
        serializer = DashboardSummarySerializer(summary)
        return Response(serializer.data)


class AvailableFiscalYearsView(APIView):
    """
    List fiscal years that have at least one saved assessment (latest first).

    GET /api/assessments/available-years/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        service = get_assessment_service()
        years = service.get_available_fiscal_years()
        return Response({"fiscal_years": years})


class AssessmentHistoryView(APIView):
    """
    Get assessment history for trend analysis.

    GET /api/assessments/history/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_year = request.query_params.get("start_year")
        end_year = request.query_params.get("end_year")

        service = get_assessment_service()
        history = service.get_history(
            start_year=int(start_year) if start_year else None,
            end_year=int(end_year) if end_year else None,
        )

        return Response(history)


# =============================================================================
# OPTIMIZATION VIEWS
# =============================================================================

class EfficiencyAnalysisView(APIView):
    """
    Analyze current vs optimal allocation efficiency.

    POST /api/assessments/optimization/efficiency/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        components = request.data.get("components", [])
        if not components:
            return Response(
                {"error": "Components data required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        normalized, err = _normalize_optimization_components(components)
        if err:
            return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)

        service = get_optimization_service()
        try:
            result = service.analyze_efficiency(normalized)
            return Response(result)
        except Exception as e:
            logger.exception("Efficiency analysis failed")
            msg = str(e).strip() or "Efficiency analysis failed."
            return Response(
                {"error": msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ReallocationPlanView(APIView):
    """
    Generate budget reallocation plan.

    POST /api/assessments/optimization/reallocation/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        components = request.data.get("components", [])
        target_budget = request.data.get("target_budget")

        if not components:
            return Response(
                {"error": "Components data required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        normalized, err = _normalize_optimization_components(components)
        if err:
            return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target = float(target_budget) if target_budget is not None else None
        except (TypeError, ValueError):
            target = None

        service = get_optimization_service()
        try:
            result = service.generate_reallocation_plan(normalized, target_budget=target)
            return Response(result)
        except Exception as e:
            logger.exception("Reallocation plan failed")
            msg = str(e).strip() or "Reallocation plan failed."
            return Response(
                {"error": msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class RoiAnalysisView(APIView):
    """
    Calculate ROI per component.

    POST /api/assessments/optimization/roi/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        components = request.data.get("components", [])
        if not components:
            return Response(
                {"error": "Components data required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        normalized, err = _normalize_optimization_components(components)
        if err:
            return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)

        service = get_optimization_service()
        try:
            result = service.calculate_roi(normalized)
            return Response(result)
        except Exception as e:
            logger.exception("ROI analysis failed")
            msg = str(e).strip() or "ROI analysis failed."
            return Response(
                {"error": msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# =============================================================================
# PERFORMANCE GAP VIEWS
# =============================================================================

class GapAnalysisView(APIView):
    """
    Analyze performance gaps per component.

    POST /api/assessments/gaps/analyze/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        components = request.data.get("components", [])
        if not components:
            return Response(
                {"error": "Components data required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = get_performance_gap_service()

        try:
            result = service.analyze_gaps(components)
            return Response(result)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PeerComparisonView(APIView):
    """
    Compare Rwanda against peer countries.

    POST /api/assessments/gaps/peers/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        rwanda = request.data.get("rwanda", [])
        peers = request.data.get("peers", [])

        if not rwanda or not peers:
            return Response(
                {"error": "Rwanda and peers data required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = get_performance_gap_service()

        try:
            result = service.compare_peers(rwanda, peers)
            return Response(result)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class TargetRecommendationsView(APIView):
    """
    Generate gap closure target recommendations.

    POST /api/assessments/gaps/targets/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        components = request.data.get("components", [])
        target_year = request.data.get("target_year", 2029)
        current_year = request.data.get("current_year", 2025)

        if not components:
            return Response(
                {"error": "Components data required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = get_performance_gap_service()

        try:
            result = service.recommend_targets(
                components,
                target_year=int(target_year),
                current_year=int(current_year),
            )
            return Response(result)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# =============================================================================
# WEIGHTING VIEWS
# =============================================================================

class AhpWeightsView(APIView):
    """
    Calculate AHP expert weights.

    GET /api/assessments/weighting/ahp/?scenario=normal_operations
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        scenario = request.query_params.get("scenario", "normal_operations")
        service = get_weighting_service()

        try:
            result = service.calculate_ahp_weights(scenario)
            return Response(result)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class HybridWeightsView(APIView):
    """
    Calculate hybrid weights.

    POST /api/assessments/weighting/hybrid/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        components = request.data.get("components", [])
        scenario = request.data.get("scenario")

        if not components:
            return Response(
                {"error": "Components data required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = get_weighting_service()

        try:
            result = service.calculate_hybrid_weights(components, scenario)
            return Response(result)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class NetworkAnalysisView(APIView):
    """
    Analyze network dependencies (PageRank).

    GET /api/assessments/weighting/network/?scenario=normal_operations
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        scenario = request.query_params.get("scenario", "normal_operations")
        service = get_weighting_service()

        try:
            result = service.analyze_network(scenario)
            return Response(result)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# =============================================================================
# CONFIG VIEWS
# =============================================================================

class ConfigView(APIView):
    """
    Get FSFSI configuration.

    GET /api/assessments/config/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        service = get_config_service()
        return Response({
            "config": service.get_config(),
            "indicator_components": service.get_indicator_components(),
            "indicator_component_sensitivities": service.get_indicator_component_sensitivities(),
        })


class StressLevelView(APIView):
    """
    Get stress level for a score.

    GET /api/assessments/stress-level/?score=0.25

    Delegates to Rust engine only. Frontend must use this (or stored assessment) for stress level.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        score = request.query_params.get("score")
        if not score:
            return Response(
                {"error": "Score parameter required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = get_config_service()
        level = service.get_stress_level(float(score))
        return Response({"score": float(score), "stress_level": level})
