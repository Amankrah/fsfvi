"""
Planning URL routes.

API base: /api/planning/
"""

from django.urls import path

from .views import MtefView, MultiYearPlanView

app_name = "planning"

urlpatterns = [
    path("multi-year/", MultiYearPlanView.as_view(), name="multi-year-plan"),
    path("mtef/", MtefView.as_view(), name="mtef"),
]
