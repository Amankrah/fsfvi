"""
Optimization Views for Rwanda FSFSI API.

All computation is handled by the Rust fsfi_engine via services.
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
# OPTIMIZATION VIEWS
# =============================================================================


class EfficiencyAnalysisView(APIView):
    """
    Analyze budget allocation efficiency.

    POST /api/optimization/efficiency/

    Compares current allocation against optimal allocation to identify
    inefficiencies and improvement potential.
    """

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
    """
    Generate budget reallocation plan.

    POST /api/optimization/reallocation/

    Creates step-by-step recommendations for reallocating budget
    to minimize FSFSI (stress index).
    """

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
    """
    Calculate ROI per component.

    POST /api/optimization/roi/

    Analyzes return on investment for each component to identify
    where additional funding would have the greatest impact.
    """

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
