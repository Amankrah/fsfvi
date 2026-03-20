"""Planning URL routes."""

from django.urls import path

from .views import (
    ActivePlanExcerptView,
    AssessmentMtefView,
    AssessmentMultiYearPlanView,
    MtefView,
    MultiYearPlanView,
    SavedPlanDetailView,
    SaveStrategicPlanView,
)

app_name = "planning"

urlpatterns = [
    # Assessment-based (preferred)
    path("<uuid:assessment_id>/multi-year/", AssessmentMultiYearPlanView.as_view(), name="assessment-multi-year"),
    path("<uuid:assessment_id>/mtef/", AssessmentMtefView.as_view(), name="assessment-mtef"),

    # Saved plans
    path("saved-plans/", SaveStrategicPlanView.as_view(), name="saved-plans"),
    path("saved-plans/<uuid:plan_id>/", SavedPlanDetailView.as_view(), name="saved-plan-detail"),
    path("active-plan/", ActivePlanExcerptView.as_view(), name="active-plan-excerpt"),

    # Legacy
    path("multi-year/", MultiYearPlanView.as_view(), name="multi-year-plan"),
    path("mtef/", MtefView.as_view(), name="mtef"),
]
