"""
Planning API – multi-year strategic plan, MTEF, and saved plans.

Assessment-based endpoints (preferred — assessment is source of truth):
  GET  /api/planning/<assessment_id>/multi-year/
  GET  /api/planning/<assessment_id>/mtef/

Saved plans:
  POST /api/planning/saved-plans/          — save a plan
  GET  /api/planning/saved-plans/          — list saved plans
  GET  /api/planning/saved-plans/<id>/     — get a saved plan
  GET  /api/planning/active-plan/          — get active plan excerpt for dashboard
"""

import logging
from decimal import Decimal

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SavedStrategicPlan
from .serializers import SavedPlanExcerptSerializer, SavedPlanSerializer, SavePlanRequestSerializer
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
        target_curve = request.query_params.get("target_curve", "smoothstep")
        weighting_method = request.query_params.get("weighting_method", "hybrid")
        scenario = request.query_params.get("scenario", "normal_operations")

        try:
            result = plan_for_assessment(
                str(assessment_id),
                planning_years=planning_years,
                target_fsfvi=target_fsfvi,
                yearly_budget_growth_rate=growth_rate,
                yearly_target_curve=target_curve,
                weighting_method=weighting_method,
                scenario=scenario,
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


# =============================================================================
# SAVED STRATEGIC PLANS
# =============================================================================


class SaveStrategicPlanView(APIView):
    """
    Save or list strategic plans.

    POST /api/planning/saved-plans/ — save a plan (regenerates to ensure consistency)
    GET  /api/planning/saved-plans/?fiscal_year=2024 — list saved plans
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SavePlanRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            from apps.assessments.models import AssessmentResult
            assessment = AssessmentResult.objects.get(pk=data["assessment_id"])
        except Exception:
            return Response(
                {"error": "Assessment not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Regenerate the plan to ensure stored JSON matches parameters exactly
        try:
            plan_result = plan_for_assessment(
                str(assessment.pk),
                planning_years=data["planning_years"],
                target_fsfvi=data["target_fsfvi"],
                yearly_budget_growth_rate=data["yearly_budget_growth_rate"],
                yearly_target_curve=data["target_curve"],
            )
        except Exception as e:
            logger.exception("Plan generation failed during save")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Get final projected value
        yearly_plans = plan_result.get("yearly_plans", [])
        final_projected = yearly_plans[-1]["projected_fsfvi"] if yearly_plans else None
        total_investment = plan_result.get("total_additional_investment_needed", 0)

        # Deactivate previous active plan for this fiscal year
        SavedStrategicPlan.objects.filter(
            fiscal_year=assessment.fiscal_year, is_active=True
        ).update(is_active=False)

        # Create the saved plan
        saved = SavedStrategicPlan.objects.create(
            assessment=assessment,
            fiscal_year=assessment.fiscal_year,
            plan_name=data.get("plan_name", ""),
            planning_years=data["planning_years"],
            target_fsfvi=Decimal(str(data["target_fsfvi"])),
            target_reduction_pct=Decimal(str(data["target_reduction_pct"])),
            yearly_budget_growth_rate=Decimal(str(data["yearly_budget_growth_rate"])),
            target_curve=data["target_curve"],
            baseline_fsfsi=Decimal(str(plan_result["baseline_fsfvi"])),
            final_projected_fsfsi=Decimal(str(final_projected)) if final_projected else None,
            total_additional_investment=Decimal(str(total_investment)) if total_investment else None,
            plan_json=plan_result,
            created_by=request.user if hasattr(request.user, "pk") else None,
        )

        return Response(
            SavedPlanSerializer(saved).data,
            status=status.HTTP_201_CREATED,
        )

    def get(self, request):
        fy = request.query_params.get("fiscal_year")
        qs = SavedStrategicPlan.objects.all()
        if fy:
            qs = qs.filter(fiscal_year=int(fy))
        return Response(SavedPlanSerializer(qs, many=True).data)


class SavedPlanDetailView(APIView):
    """GET/DELETE a specific saved plan."""

    permission_classes = [IsAuthenticated]

    def get(self, request, plan_id):
        try:
            plan = SavedStrategicPlan.objects.get(pk=plan_id)
        except SavedStrategicPlan.DoesNotExist:
            return Response({"error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(SavedPlanSerializer(plan).data)

    def delete(self, request, plan_id):
        try:
            plan = SavedStrategicPlan.objects.get(pk=plan_id)
        except SavedStrategicPlan.DoesNotExist:
            return Response({"error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)
        plan.is_active = False
        plan.save(update_fields=["is_active"])
        return Response({"status": "deactivated"})


class ActivePlanExcerptView(APIView):
    """
    GET /api/planning/active-plan/?fiscal_year=2024

    Returns the active plan excerpt for the National Overview dashboard.
    Lightweight — no plan_json.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        fy = request.query_params.get("fiscal_year")
        if not fy:
            return Response(
                {"error": "fiscal_year parameter required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        plan = SavedStrategicPlan.objects.filter(
            fiscal_year=int(fy), is_active=True
        ).first()
        if not plan:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(SavedPlanExcerptSerializer(plan).data)
