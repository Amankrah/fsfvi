"""
Optimization URL Routes for Rwanda FSFSI API.
"""

from django.urls import path

from .views import (
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
    # BUDGET OPTIMIZATION ENDPOINTS
    # ==========================================================================
    # POST /api/optimization/efficiency/ - Efficiency analysis
    path("efficiency/", EfficiencyAnalysisView.as_view(), name="efficiency-analysis"),
    # POST /api/optimization/reallocation/ - Reallocation plan
    path("reallocation/", ReallocationPlanView.as_view(), name="reallocation-plan"),
    # POST /api/optimization/roi/ - ROI analysis
    path("roi/", RoiAnalysisView.as_view(), name="roi-analysis"),

    # ==========================================================================
    # PERFORMANCE GAP ENDPOINTS
    # ==========================================================================
    # POST /api/optimization/gaps/analyze/ - Gap analysis
    path("gaps/analyze/", GapAnalysisView.as_view(), name="gap-analysis"),
    # POST /api/optimization/gaps/peers/ - Peer comparison
    path("gaps/peers/", PeerComparisonView.as_view(), name="peer-comparison"),
    # POST /api/optimization/gaps/targets/ - Target recommendations
    path("gaps/targets/", TargetRecommendationsView.as_view(), name="target-recommendations"),
]
