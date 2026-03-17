"""
Planning API – multi-year strategic plan and MTEF.

POST /api/planning/multi-year/
POST /api/planning/mtef/

All computation in Rust fsfi_engine; views only validate and pass through.
"""

import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import generate_mtef, generate_multi_year_plan

logger = logging.getLogger(__name__)


class MultiYearPlanView(APIView):
    """
    Generate multi-year strategic plan to achieve target FSFSI.

    POST /api/planning/multi-year/
    Body: {
      "current_components": [ { "component_type", "observed_value", "benchmark_value", "financial_allocation_usd", ... } ],
      "planning_years": 5,
      "target_fsfvi": 0.15,
      "yearly_budget_constraints": { "1": { "total_budget_ceiling": 1e9 }, ... }  // optional
    }
    """

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
        if planning_years is None:
            return Response(
                {"error": "planning_years is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target_fsfvi is None:
            return Response(
                {"error": "target_fsfvi is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # yearly_budget_constraints: optional map year -> constraint (keys as string "1","2" for JSON)
        constraints = data.get("yearly_budget_constraints") or {}
        # yearly_budget_growth_rate: optional (e.g. 0.05, 0.1); used when no constraint per year
        growth_rate = data.get("yearly_budget_growth_rate")

        payload = {
            "current_components": components,
            "country_name": data.get("country_name"),
            "currency": data.get("currency"),
            "planning_years": int(planning_years),
            "target_fsfvi": float(target_fsfvi),
            "yearly_budget_constraints": constraints,
        }
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
    """
    Generate 3-year MTEF (Medium-Term Expenditure Framework).

    POST /api/planning/mtef/
    Body: {
      "components": [ ... ],
      "target_fsfvi_improvement_percent": 20,
      "yearly_budget_growth_rate": 0.05
    }
    """

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
            result = generate_mtef(
                components,
                float(improvement),
                float(growth),
            )
            return Response(result)
        except Exception as e:
            logger.exception("MTEF generation failed")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
