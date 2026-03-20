"""
Planning URL routes.

API base: /api/planning/
"""

from django.urls import path

from .views import (
    AssessmentMtefView,
    AssessmentMultiYearPlanView,
    MtefView,
    MultiYearPlanView,
)

app_name = "planning"

urlpatterns = [
    # Assessment-based (preferred — cumulative stress as baseline)
    path("<uuid:assessment_id>/multi-year/", AssessmentMultiYearPlanView.as_view(), name="assessment-multi-year"),
    path("<uuid:assessment_id>/mtef/", AssessmentMtefView.as_view(), name="assessment-mtef"),

    # Legacy (raw component inputs)
    path("multi-year/", MultiYearPlanView.as_view(), name="multi-year-plan"),
    path("mtef/", MtefView.as_view(), name="mtef"),
]
