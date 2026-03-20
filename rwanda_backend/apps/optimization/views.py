"""
Optimization Views for Rwanda FSFSI API.

The assessment engine is the single source of truth for FSFSI scores.
Optimization endpoints accept an assessment_id and delegate FSFSI computation
to the assessment — they only compute allocation recommendations.

Primary endpoints (assessment-based):
  GET /api/optimization/<assessment_id>/efficiency/
  GET /api/optimization/<assessment_id>/reallocation/
  GET /api/optimization/<assessment_id>/roi/

Legacy endpoints (raw component inputs — kept for backwards compatibility):
  POST /api/optimization/efficiency/
  POST /api/optimization/reallocation/
  POST /api/optimization/roi/
"""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    EfficiencyRequestSerializer,
    GapAnalysisRequestSerializer,
    PeerComparisonRequestSerializer,
    ReallocationRequestSerializer,
    RoiRequestSerializer,
    TargetRecommendationRequestSerializer,
)
from .services import get_optimization_service, get_performance_gap_service


# =============================================================================
# ASSESSMENT-BASED OPTIMIZATION VIEWS (preferred — single source of truth)
# =============================================================================


class AssessmentEfficiencyView(APIView):
    """
    Efficiency analysis driven by a saved assessment.

    GET /api/optimization/<assessment_id>/efficiency/

    Uses the assessment's FSFSI as the authoritative current score.
    Only computes optimal allocation and efficiency ratio.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):
        service = get_optimization_service()
        try:
            result = service.efficiency_for_assessment(str(assessment_id))
            return Response(result)
        except Exception as e:
            error_name = type(e).__name__
            if "DoesNotExist" in error_name:
                return Response(
                    {"error": f"Assessment {assessment_id} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AssessmentReallocationView(APIView):
    """
    Reallocation plan driven by a saved assessment.

    GET /api/optimization/<assessment_id>/reallocation/
    GET /api/optimization/<assessment_id>/reallocation/?target_budget=2000000000
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):
        service = get_optimization_service()
        target_budget = request.query_params.get("target_budget")
        target_budget = float(target_budget) if target_budget else None

        try:
            result = service.reallocation_for_assessment(
                str(assessment_id), target_budget
            )
            return Response(result)
        except Exception as e:
            error_name = type(e).__name__
            if "DoesNotExist" in error_name:
                return Response(
                    {"error": f"Assessment {assessment_id} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AssessmentRoiView(APIView):
    """
    ROI analysis driven by a saved assessment.

    GET /api/optimization/<assessment_id>/roi/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):
        service = get_optimization_service()
        try:
            result = service.roi_for_assessment(str(assessment_id))
            return Response(result)
        except Exception as e:
            error_name = type(e).__name__
            if "DoesNotExist" in error_name:
                return Response(
                    {"error": f"Assessment {assessment_id} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# =============================================================================
# LEGACY OPTIMIZATION VIEWS (raw component inputs)
# =============================================================================


class EfficiencyAnalysisView(APIView):
    """POST /api/optimization/efficiency/ — legacy raw component input."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = EfficiencyRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        service = get_optimization_service()

        try:
            result = service.analyze_efficiency(
                components=serializer.validated_data["components"]
            )
            return Response(result)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ReallocationPlanView(APIView):
    """POST /api/optimization/reallocation/ — legacy raw component input."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ReallocationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        service = get_optimization_service()

        try:
            result = service.generate_reallocation_plan(
                components=data["components"],
                target_budget=data.get("target_budget"),
            )
            return Response(result)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class RoiAnalysisView(APIView):
    """POST /api/optimization/roi/ — legacy raw component input."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RoiRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        service = get_optimization_service()

        try:
            result = service.calculate_roi(
                components=serializer.validated_data["components"]
            )
            return Response(result)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# =============================================================================
# PERFORMANCE GAP VIEWS
# =============================================================================


class GapAnalysisView(APIView):
    """
    Analyze performance gaps.

    POST /api/optimization/gaps/analyze/

    Identifies gaps between current performance and benchmarks
    for each component, with status classification and recommendations.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GapAnalysisRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        service = get_performance_gap_service()

        try:
            result = service.analyze_gaps(
                components=serializer.validated_data["components"]
            )
            return Response(result)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PeerComparisonView(APIView):
    """
    Compare Rwanda against peer countries.

    POST /api/optimization/gaps/peers/

    Benchmarks Rwanda's performance against peer countries
    in the region with rankings per component.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PeerComparisonRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        service = get_performance_gap_service()

        try:
            result = service.compare_peers(
                rwanda=data["rwanda"],
                peers=data["peers"],
            )
            return Response(result)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class TargetRecommendationsView(APIView):
    """
    Generate target recommendations.

    POST /api/optimization/gaps/targets/

    Creates evidence-based target recommendations for gap closure
    with annual milestones.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TargetRecommendationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        service = get_performance_gap_service()

        try:
            result = service.recommend_targets(
                components=data["components"],
                target_year=data.get("target_year", 2029),
                current_year=data.get("current_year", 2025),
            )
            return Response(result)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
