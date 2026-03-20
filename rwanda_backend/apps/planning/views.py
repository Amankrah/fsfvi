"""
Planning API – multi-year strategic plan and MTEF.

Assessment-based endpoints (preferred — assessment is source of truth):
  GET /api/planning/<assessment_id>/multi-year/?planning_years=5&target_fsfvi=0.30&growth_rate=0.05
  GET /api/planning/<assessment_id>/mtef/?improvement_percent=20&growth_rate=0.05

Legacy endpoints (raw component inputs):
  POST /api/planning/multi-year/
  POST /api/planning/mtef/
"""

import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import (
    generate_mtef,
    generate_multi_year_plan,
    mtef_for_assessment,
    plan_for_assessment,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Assessment-based views (preferred — cumulative stress is the baseline)
# =============================================================================


class AssessmentMultiYearPlanView(APIView):
    """
    Generate multi-year plan using a saved assessment.

    GET /api/planning/<assessment_id>/multi-year/
    Query params:
      - planning_years (int, default 5)
      - target_fsfvi (float, default 0.30)
      - growth_rate (float, default 0.05)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):
        planning_years = int(request.query_params.get("planning_years", 5))
        target_fsfvi = float(request.query_params.get("target_fsfvi", 0.30))
        growth_rate = float(request.query_params.get("growth_rate", 0.05))

        try:
            result = plan_for_assessment(
                str(assessment_id),
                planning_years=planning_years,
                target_fsfvi=target_fsfvi,
                yearly_budget_growth_rate=growth_rate,
            )
            return Response(result)
        except Exception as e:
            error_name = type(e).__name__
            if "DoesNotExist" in error_name:
                return Response(
                    {"error": f"Assessment {assessment_id} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            logger.exception("Assessment multi-year plan failed")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AssessmentMtefView(APIView):
    """
    Generate 3-year MTEF using a saved assessment.

    GET /api/planning/<assessment_id>/mtef/
    Query params:
      - improvement_percent (float, default 20)
      - growth_rate (float, default 0.05)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):
        improvement = float(request.query_params.get("improvement_percent", 20))
        growth_rate = float(request.query_params.get("growth_rate", 0.05))

        try:
            result = mtef_for_assessment(
                str(assessment_id),
                target_improvement_percent=improvement,
                yearly_budget_growth_rate=growth_rate,
            )
            return Response(result)
        except Exception as e:
            error_name = type(e).__name__
            if "DoesNotExist" in error_name:
                return Response(
                    {"error": f"Assessment {assessment_id} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            logger.exception("Assessment MTEF failed")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# =============================================================================
# Legacy views (raw component inputs)
# =============================================================================


class MultiYearPlanView(APIView):
    """POST /api/planning/multi-year/ — legacy raw component input."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        components = data.get("current_components")
        if not components:
            return Response(
                {"error": "current_components is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        planning_years = data.get("planning_years")
        target_fsfvi = data.get("target_fsfvi")
        if planning_years is None or target_fsfvi is None:
            return Response(
                {"error": "planning_years and target_fsfvi are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = {
            "current_components": components,
            "country_name": data.get("country_name"),
            "currency": data.get("currency"),
            "planning_years": int(planning_years),
            "target_fsfvi": float(target_fsfvi),
            "yearly_budget_constraints": data.get("yearly_budget_constraints") or {},
        }
        growth_rate = data.get("yearly_budget_growth_rate")
        if growth_rate is not None:
            payload["yearly_budget_growth_rate"] = float(growth_rate)

        try:
            result = generate_multi_year_plan(payload)
            return Response(result)
        except Exception as e:
            logger.exception("Multi-year plan failed")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MtefView(APIView):
    """POST /api/planning/mtef/ — legacy raw component input."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        components = data.get("components") or data.get("current_components")
        if not components:
            return Response(
                {"error": "components is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        improvement = data.get("target_fsfvi_improvement_percent", 20)
        growth = data.get("yearly_budget_growth_rate", 0.05)

        try:
            result = generate_mtef(components, float(improvement), float(growth))
            return Response(result)
        except Exception as e:
            logger.exception("MTEF generation failed")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
