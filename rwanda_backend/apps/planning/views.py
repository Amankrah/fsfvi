"""
Planning API – multi-year strategic plan, MTEF, and saved plans.

Assessment-based endpoints (preferred — assessment is source of truth):
  GET  /api/planning/<assessment_id>/multi-year/
  GET  /api/planning/<assessment_id>/mtef/

Saved plans:
  POST   /api/planning/saved-plans/              — save a plan (name unique per fiscal year, case-insensitive)
  GET    /api/planning/saved-plans/               — list saved plans (summary, no plan_json)
  GET    /api/planning/saved-plans/<id>/          — get a saved plan (full)
  PATCH  /api/planning/saved-plans/<id>/          — update name and/or parameters (parameters regenerate plan_json)
  DELETE /api/planning/saved-plans/<id>/          — permanently delete the plan
  POST   /api/planning/saved-plans/<id>/activate/ — mark plan active for its fiscal year
  GET    /api/planning/active-plan/               — get active plan excerpt for dashboard
"""

import logging
from decimal import Decimal

from django.db import IntegrityError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PlanYearActual, SavedStrategicPlan
from .serializers import (
    AllocationSimulateSerializer,
    PlanYearActualSerializer,
    PlanYearActualSummarySerializer,
    SavedPlanExcerptSerializer,
    SavedPlanSerializer,
    SavedPlanSummarySerializer,
    SavePlanRequestSerializer,
    SaveYearActualRequestSerializer,
    UpdateSavedPlanSerializer,
)
from .utils import plan_name_exists
from .services import (
    generate_mtef,
    generate_multi_year_plan,
    mtef_for_assessment,
    plan_for_assessment,
    simulate_user_allocation_year,
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
        psy = request.query_params.get("planning_start_fiscal_year")
        planning_start_fiscal_year = None
        if psy not in (None, ""):
            try:
                planning_start_fiscal_year = int(psy)
            except ValueError:
                return Response(
                    {"error": "planning_start_fiscal_year must be an integer"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            result = plan_for_assessment(
                str(assessment_id),
                planning_years=planning_years,
                target_fsfvi=target_fsfvi,
                yearly_budget_growth_rate=growth_rate,
                yearly_target_curve=target_curve,
                weighting_method=weighting_method,
                scenario=scenario,
                planning_start_fiscal_year=planning_start_fiscal_year,
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


class AssessmentAllocationSimulateView(APIView):
    """
    POST /api/planning/<assessment_id>/simulate-allocation/

    Counterfactual cumulative FSFSI / component stress for a user-specified national
    total (bn LCU) and component mix (%), using the same stress dynamics as planning.
    Optional plan_reference compares to the optimal plan row for that horizon year.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, assessment_id):
        ser = AllocationSimulateSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        data = ser.validated_data
        plan_ref = data.get("plan_reference")
        plan_ref_dict = dict(plan_ref) if plan_ref else None
        try:
            result = simulate_user_allocation_year(
                str(assessment_id),
                data["plan_year"],
                data["total_budget_bn"],
                dict(data["component_shares_pct"]),
                weighting_method=data.get("weighting_method") or "hybrid",
                scenario=data.get("scenario") or "normal_operations",
                prior_system_cumulative=data.get("prior_system_cumulative"),
                prior_component_cumulative=dict(data["prior_component_cumulative"])
                if data.get("prior_component_cumulative")
                else None,
                plan_reference=plan_ref_dict,
            )
        except Exception as e:
            error_name = type(e).__name__
            if "DoesNotExist" in error_name:
                return Response(
                    {"error": f"Assessment {assessment_id} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            logger.exception("Allocation simulation failed")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if isinstance(result, dict) and result.get("error"):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


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
        weighting_method = request.query_params.get("weighting_method", "hybrid")
        scenario = request.query_params.get("scenario", "normal_operations")

        try:
            result = mtef_for_assessment(
                str(assessment_id),
                target_improvement_percent=improvement,
                yearly_budget_growth_rate=growth_rate,
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

        wm = data.get("weighting_method") or "hybrid"
        sc = data.get("scenario") or "normal_operations"
        psy = data.get("planning_start_fiscal_year")
        planning_start_fiscal_year = int(psy) if psy is not None else None
        pname = data["plan_name"]
        if plan_name_exists(assessment.fiscal_year, pname):
            return Response(
                {
                    "error": "A plan with this name already exists for this fiscal year.",
                    "plan_name": ["This plan name is already in use."],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Regenerate the plan to ensure stored JSON matches parameters exactly
        try:
            plan_result = plan_for_assessment(
                str(assessment.pk),
                planning_years=data["planning_years"],
                target_fsfvi=data["target_fsfvi"],
                yearly_budget_growth_rate=data["yearly_budget_growth_rate"],
                yearly_target_curve=data["target_curve"],
                weighting_method=wm,
                scenario=sc,
                planning_start_fiscal_year=planning_start_fiscal_year,
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
        try:
            saved = SavedStrategicPlan.objects.create(
                assessment=assessment,
                fiscal_year=assessment.fiscal_year,
                plan_name=pname,
                planning_years=data["planning_years"],
                target_fsfvi=Decimal(str(data["target_fsfvi"])),
                target_reduction_pct=Decimal(str(data["target_reduction_pct"])),
                yearly_budget_growth_rate=Decimal(str(data["yearly_budget_growth_rate"])),
                target_curve=data["target_curve"],
                weighting_method=wm,
                scenario=sc,
                baseline_fsfsi=Decimal(str(plan_result["baseline_fsfvi"])),
                final_projected_fsfsi=Decimal(str(final_projected)) if final_projected else None,
                total_additional_investment=Decimal(str(total_investment)) if total_investment else None,
                plan_json=plan_result,
                created_by=request.user if hasattr(request.user, "pk") else None,
            )
        except IntegrityError:
            return Response(
                {
                    "error": "A plan with this name already exists for this fiscal year.",
                    "plan_name": ["This plan name is already in use."],
                },
                status=status.HTTP_400_BAD_REQUEST,
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
        return Response(SavedPlanSummarySerializer(qs, many=True).data)


class ActivateSavedPlanView(APIView):
    """
    POST /api/planning/saved-plans/<id>/activate/

    Sets this plan as the active strategic plan for its fiscal year (National Overview).
    Other plans for the same year are deactivated; plan_json is not regenerated.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, plan_id):
        try:
            plan = SavedStrategicPlan.objects.get(pk=plan_id)
        except SavedStrategicPlan.DoesNotExist:
            return Response({"error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)

        SavedStrategicPlan.objects.filter(fiscal_year=plan.fiscal_year).exclude(pk=plan.pk).update(
            is_active=False
        )
        plan.is_active = True
        plan.save(update_fields=["is_active"])

        return Response(SavedPlanSerializer(plan).data)


_REGEN_FIELDS = frozenset({
    "planning_years",
    "target_fsfvi",
    "target_reduction_pct",
    "yearly_budget_growth_rate",
    "target_curve",
    "weighting_method",
    "scenario",
})


class SavedPlanDetailView(APIView):
    """GET / PATCH / DELETE a specific saved plan."""

    permission_classes = [IsAuthenticated]

    def get(self, request, plan_id):
        try:
            plan = SavedStrategicPlan.objects.get(pk=plan_id)
        except SavedStrategicPlan.DoesNotExist:
            return Response({"error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(SavedPlanSerializer(plan).data)

    def patch(self, request, plan_id):
        try:
            plan = SavedStrategicPlan.objects.get(pk=plan_id)
        except SavedStrategicPlan.DoesNotExist:
            return Response({"error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)

        if not request.data:
            return Response(
                {"error": "No fields to update."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = UpdateSavedPlanSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        if not data:
            return Response(
                {"error": "No valid fields to update."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.assessments.models import AssessmentResult

        if "assessment_id" in data:
            try:
                new_assessment = AssessmentResult.objects.get(pk=data["assessment_id"])
            except AssessmentResult.DoesNotExist:
                return Response(
                    {"error": "Assessment not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            plan.assessment = new_assessment
            plan.fiscal_year = new_assessment.fiscal_year

        if "plan_name" in data:
            nm = data["plan_name"]
            if plan_name_exists(plan.fiscal_year, nm, exclude_plan_id=plan.pk):
                return Response(
                    {
                        "error": "A plan with this name already exists for this fiscal year.",
                        "plan_name": ["This plan name is already in use."],
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            plan.plan_name = nm

        need_regen = bool(_REGEN_FIELDS.intersection(data.keys())) or ("assessment_id" in data)

        if need_regen:
            py = data.get("planning_years", plan.planning_years)
            tf = data.get("target_fsfvi", float(plan.target_fsfvi))
            gr = data.get("yearly_budget_growth_rate", float(plan.yearly_budget_growth_rate))
            curve = data.get("target_curve", plan.target_curve)
            wm = data.get("weighting_method", plan.weighting_method)
            sc = data.get("scenario", plan.scenario)
            prev_start = None
            if isinstance(plan.plan_json, dict):
                prev_start = plan.plan_json.get("planning_start_fiscal_year")
            psy = data.get("planning_start_fiscal_year")
            if psy is not None:
                start_for_regen = int(psy)
            elif prev_start is not None:
                start_for_regen = int(prev_start)
            else:
                start_for_regen = None
            try:
                plan_result = plan_for_assessment(
                    str(plan.assessment.pk),
                    planning_years=py,
                    target_fsfvi=tf,
                    yearly_budget_growth_rate=gr,
                    yearly_target_curve=curve,
                    weighting_method=wm,
                    scenario=sc,
                    planning_start_fiscal_year=start_for_regen,
                )
            except Exception as e:
                logger.exception("Plan regeneration failed during update")
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            yearly_plans = plan_result.get("yearly_plans", [])
            final_projected = yearly_plans[-1]["projected_fsfvi"] if yearly_plans else None
            total_investment = plan_result.get("total_additional_investment_needed", 0)

            plan.planning_years = py
            plan.target_fsfvi = Decimal(str(tf))
            if "target_reduction_pct" in data:
                plan.target_reduction_pct = Decimal(str(data["target_reduction_pct"]))
            plan.yearly_budget_growth_rate = Decimal(str(gr))
            plan.target_curve = curve
            plan.weighting_method = wm
            plan.scenario = sc
            plan.baseline_fsfsi = Decimal(str(plan_result["baseline_fsfvi"]))
            plan.final_projected_fsfsi = (
                Decimal(str(final_projected)) if final_projected is not None else None
            )
            plan.total_additional_investment = (
                Decimal(str(total_investment)) if total_investment else None
            )
            plan.plan_json = plan_result

        elif "planning_start_fiscal_year" in data:
            import copy

            if not isinstance(plan.plan_json, dict):
                return Response(
                    {"error": "Cannot update horizon labels: plan has no stored JSON."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            pj = copy.deepcopy(plan.plan_json)
            start = int(data["planning_start_fiscal_year"])
            pj["planning_start_fiscal_year"] = start
            for yp in pj.get("yearly_plans", []) or []:
                yn = int(yp.get("year", 1))
                yp["fiscal_year"] = start + (yn - 1)
            plan.plan_json = pj

        try:
            plan.save()
        except IntegrityError:
            return Response(
                {
                    "error": "A plan with this name already exists for this fiscal year.",
                    "plan_name": ["This plan name is already in use."],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(SavedPlanSerializer(plan).data)

    def delete(self, request, plan_id):
        try:
            plan = SavedStrategicPlan.objects.get(pk=plan_id)
        except SavedStrategicPlan.DoesNotExist:
            return Response({"error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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


# =============================================================================
# PLAN YEAR ACTUALS — Record actual budget allocations per year
# =============================================================================


class PlanYearActualsView(APIView):
    """
    Manage actual allocations for a specific saved plan.

    GET  /api/planning/saved-plans/<plan_id>/actuals/       — list all actuals for plan
    POST /api/planning/saved-plans/<plan_id>/actuals/       — save/update actual for a year
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, plan_id):
        try:
            plan = SavedStrategicPlan.objects.get(pk=plan_id)
        except SavedStrategicPlan.DoesNotExist:
            return Response({"error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)

        actuals = plan.year_actuals.all()
        return Response(PlanYearActualSummarySerializer(actuals, many=True).data)

    def post(self, request, plan_id):
        try:
            plan = SavedStrategicPlan.objects.get(pk=plan_id)
        except SavedStrategicPlan.DoesNotExist:
            return Response({"error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = SaveYearActualRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        plan_year = data["plan_year"]
        fiscal_year = data["fiscal_year"]

        # If simulation results not provided, compute them
        simulated_fsfsi = data.get("simulated_cumulative_fsfsi")
        simulated_comp = data.get("simulated_component_stress", {})
        delta_vs_plan = data.get("delta_vs_plan_fsfsi")

        if simulated_fsfsi is None:
            # Compute simulation based on actual allocation
            comp_allocs = data["component_allocations_bn"]
            total_bn = data["total_budget_bn"]

            # Convert bn allocations to percentage shares
            if total_bn > 0:
                shares_pct = {k: (v / total_bn) * 100 for k, v in comp_allocs.items()}
            else:
                shares_pct = {k: 0 for k in comp_allocs}

            # Get plan reference from plan_json
            yearly_plans = plan.plan_json.get("yearly_plans", [])
            yp = next((y for y in yearly_plans if y.get("year") == plan_year), None)

            if yp:
                # Get prior year data if plan_year > 1
                prior_sys = None
                prior_comp = None
                if plan_year > 1:
                    prev_yp = next(
                        (y for y in yearly_plans if y.get("year") == plan_year - 1),
                        None,
                    )
                    if prev_yp:
                        # Check if we have actual for previous year, use that instead
                        prev_actual = plan.year_actuals.filter(plan_year=plan_year - 1).first()
                        if prev_actual and prev_actual.simulated_cumulative_fsfsi:
                            prior_sys = float(prev_actual.simulated_cumulative_fsfsi)
                            prior_comp = prev_actual.simulated_component_stress or {}
                        else:
                            prior_sys = float(prev_yp.get("projected_fsfvi", 0))
                            prior_comp = {
                                k: v.get("cumulative_stress", 0)
                                for k, v in (prev_yp.get("component_projections") or {}).items()
                            }

                plan_ref = {
                    "projected_cumulative_fsfsi": float(yp.get("projected_fsfvi", 0)),
                    "year_target_fsfvi": float(yp.get("year_target") or yp.get("target_fsfvi", 0)),
                    "recommended_allocations": yp.get("recommended_allocations", {}),
                    "plan_total_budget_bn": float(yp.get("total_budget", 0)) / 1e9,
                    "planning_weighting_method": plan.weighting_method,
                    "planning_scenario": plan.scenario,
                    "component_projections": yp.get("component_projections", {}),
                }

                try:
                    sim_result = simulate_user_allocation_year(
                        str(plan.assessment_id),
                        plan_year,
                        total_bn,
                        shares_pct,
                        weighting_method=plan.weighting_method,
                        scenario=plan.scenario,
                        prior_system_cumulative=prior_sys,
                        prior_component_cumulative=prior_comp,
                        plan_reference=plan_ref,
                    )

                    if not isinstance(sim_result, dict) or "error" not in sim_result:
                        simulated_fsfsi = sim_result.get("user_projected_cumulative_fsfsi")
                        simulated_comp = sim_result.get("user_component_cumulative_stress", {})
                        delta_vs_plan = sim_result.get("delta_user_minus_plan_fsfsi")
                except Exception as e:
                    logger.warning("Could not simulate allocation for actual: %s", e)

        # Create or update the actual record
        actual, created = PlanYearActual.objects.update_or_create(
            plan=plan,
            plan_year=plan_year,
            defaults={
                "fiscal_year": fiscal_year,
                "total_budget_bn": Decimal(str(data["total_budget_bn"])),
                "component_allocations_bn": data["component_allocations_bn"],
                "simulated_cumulative_fsfsi": (
                    Decimal(str(simulated_fsfsi)) if simulated_fsfsi is not None else None
                ),
                "simulated_component_stress": simulated_comp,
                "delta_vs_plan_fsfsi": (
                    Decimal(str(delta_vs_plan)) if delta_vs_plan is not None else None
                ),
                "created_by": request.user if hasattr(request.user, "pk") else None,
            },
        )

        return Response(
            PlanYearActualSerializer(actual).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class PlanYearActualDetailView(APIView):
    """
    GET/DELETE a specific year actual.

    GET    /api/planning/saved-plans/<plan_id>/actuals/<plan_year>/
    DELETE /api/planning/saved-plans/<plan_id>/actuals/<plan_year>/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, plan_id, plan_year):
        try:
            actual = PlanYearActual.objects.get(plan_id=plan_id, plan_year=plan_year)
        except PlanYearActual.DoesNotExist:
            return Response(
                {"error": "Actual not found for this plan year"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(PlanYearActualSerializer(actual).data)

    def delete(self, request, plan_id, plan_year):
        try:
            actual = PlanYearActual.objects.get(plan_id=plan_id, plan_year=plan_year)
        except PlanYearActual.DoesNotExist:
            return Response(
                {"error": "Actual not found for this plan year"},
                status=status.HTTP_404_NOT_FOUND,
            )
        actual.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
