"""
Optimization URL Routes for Rwanda FSFSI API.
"""

from django.urls import path

from .views import (
    AssessmentEfficiencyView,
    AssessmentReallocationView,
    AssessmentRoiView,
    EfficiencyAnalysisView,
    GapAnalysisView,
    PeerComparisonView,
    ReallocationPlanView,
    RoiAnalysisView,
    TargetRecommendationsView,
)

app_name = "optimization"

urlpatterns = [
    # ==========================================================================
    # ASSESSMENT-BASED OPTIMIZATION (preferred — assessment is source of truth)
    # ==========================================================================
    path("<uuid:assessment_id>/efficiency/", AssessmentEfficiencyView.as_view(), name="assessment-efficiency"),
    path("<uuid:assessment_id>/reallocation/", AssessmentReallocationView.as_view(), name="assessment-reallocation"),
    path("<uuid:assessment_id>/roi/", AssessmentRoiView.as_view(), name="assessment-roi"),

    # ==========================================================================
    # LEGACY BUDGET OPTIMIZATION (raw component inputs)
    # ==========================================================================
    path("efficiency/", EfficiencyAnalysisView.as_view(), name="efficiency-analysis"),
    path("reallocation/", ReallocationPlanView.as_view(), name="reallocation-plan"),
    path("roi/", RoiAnalysisView.as_view(), name="roi-analysis"),

    # ==========================================================================
    # PERFORMANCE GAP ENDPOINTS
    # ==========================================================================
    path("gaps/analyze/", GapAnalysisView.as_view(), name="gap-analysis"),
    path("gaps/peers/", PeerComparisonView.as_view(), name="peer-comparison"),
    path("gaps/targets/", TargetRecommendationsView.as_view(), name="target-recommendations"),
]
