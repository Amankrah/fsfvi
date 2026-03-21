"""Planning URL routes."""

from django.urls import path

from .views import (
    ActivateSavedPlanView,
    ActivePlanExcerptView,
    AssessmentAllocationSimulateView,
    AssessmentMtefView,
    AssessmentMultiYearPlanView,
    MtefView,
    MultiYearPlanView,
    PlanYearActualDetailView,
    PlanYearActualsView,
    SavedPlanDetailView,
    SaveStrategicPlanView,
    # PSTA-5
    PSTA5AlignmentSummaryView,
    PSTA5ComponentMappingsView,
    PSTA5KPIsView,
    PSTA5PillarsView,
    PSTA5ProgressView,
    PSTA5TrackerDataView,
)

app_name = "planning"

urlpatterns = [
    # Assessment-based (preferred)
    path("<uuid:assessment_id>/multi-year/", AssessmentMultiYearPlanView.as_view(), name="assessment-multi-year"),
    path("<uuid:assessment_id>/mtef/", AssessmentMtefView.as_view(), name="assessment-mtef"),
    path(
        "<uuid:assessment_id>/simulate-allocation/",
        AssessmentAllocationSimulateView.as_view(),
        name="assessment-simulate-allocation",
    ),

    # Saved plans (activate before detail so paths resolve correctly)
    path("saved-plans/", SaveStrategicPlanView.as_view(), name="saved-plans"),
    path(
        "saved-plans/<uuid:plan_id>/activate/",
        ActivateSavedPlanView.as_view(),
        name="saved-plan-activate",
    ),
    # Plan year actuals (before detail so paths resolve correctly)
    path(
        "saved-plans/<uuid:plan_id>/actuals/",
        PlanYearActualsView.as_view(),
        name="plan-year-actuals",
    ),
    path(
        "saved-plans/<uuid:plan_id>/actuals/<int:plan_year>/",
        PlanYearActualDetailView.as_view(),
        name="plan-year-actual-detail",
    ),
    path("saved-plans/<uuid:plan_id>/", SavedPlanDetailView.as_view(), name="saved-plan-detail"),
    path("active-plan/", ActivePlanExcerptView.as_view(), name="active-plan-excerpt"),

    # Legacy
    path("multi-year/", MultiYearPlanView.as_view(), name="multi-year-plan"),
    path("mtef/", MtefView.as_view(), name="mtef"),

    # PSTA-5 Alignment Tracking
    path("psta5/pillars/", PSTA5PillarsView.as_view(), name="psta5-pillars"),
    path("psta5/kpis/", PSTA5KPIsView.as_view(), name="psta5-kpis"),
    path("psta5/mappings/", PSTA5ComponentMappingsView.as_view(), name="psta5-mappings"),
    path("psta5/progress/", PSTA5ProgressView.as_view(), name="psta5-progress"),
    path("psta5/alignment-summary/", PSTA5AlignmentSummaryView.as_view(), name="psta5-alignment-summary"),
    path("psta5/tracker/", PSTA5TrackerDataView.as_view(), name="psta5-tracker"),
]
