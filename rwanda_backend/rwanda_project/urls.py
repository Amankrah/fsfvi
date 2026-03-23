"""Rwanda FSFI Backend URL Configuration."""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.authentication.urls")),
    path("api/assessments/", include("apps.assessments.urls")),
    path("api/optimization/", include("apps.optimization.urls")),
    path("api/budget-analysis/", include("apps.budget_analysis.urls")),
    path("api/planning/", include("apps.planning.urls")),
    path("api/indicators/", include("apps.fsfvi_data.urls")),
]
