"""
Assessment URL Routes for Rwanda FSFSI API.
"""

from django.urls import path

from .views import (
    # Assessment
    AssessmentDetailView,
    AssessmentHistoryView,
    AssessmentListView,
    DashboardSummaryView,
    QuickCheckView,
    RunAssessmentView,
    # Optimization
    EfficiencyAnalysisView,
    ReallocationPlanView,
    RoiAnalysisView,
    # Performance Gap
    GapAnalysisView,
    PeerComparisonView,
    TargetRecommendationsView,
    # Weighting
    AhpWeightsView,
    HybridWeightsView,
    NetworkAnalysisView,
    # Config
    ConfigView,
    StressLevelView,
)

app_name = "assessments"

urlpatterns = [
    # ==========================================================================
    # ASSESSMENT ENDPOINTS
    # ==========================================================================
    # POST /api/assessments/run/ - Run full assessment
    path("run/", RunAssessmentView.as_view(), name="run-assessment"),
    # POST /api/assessments/quick-check/ - Quick FSFSI check
    path("quick-check/", QuickCheckView.as_view(), name="quick-check"),
    # GET /api/assessments/ - List assessments
    path("", AssessmentListView.as_view(), name="list-assessments"),
    # GET /api/assessments/<id>/ - Get assessment details
    path("<uuid:assessment_id>/", AssessmentDetailView.as_view(), name="assessment-detail"),
    # GET /api/assessments/dashboard/ - Dashboard summary
    path("dashboard/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    # GET /api/assessments/history/ - Assessment history
    path("history/", AssessmentHistoryView.as_view(), name="assessment-history"),

    # ==========================================================================
    # OPTIMIZATION ENDPOINTS
    # ==========================================================================
    # POST /api/assessments/optimization/efficiency/ - Efficiency analysis
    path("optimization/efficiency/", EfficiencyAnalysisView.as_view(), name="efficiency-analysis"),
    # POST /api/assessments/optimization/reallocation/ - Reallocation plan
    path("optimization/reallocation/", ReallocationPlanView.as_view(), name="reallocation-plan"),
    # POST /api/assessments/optimization/roi/ - ROI analysis
    path("optimization/roi/", RoiAnalysisView.as_view(), name="roi-analysis"),

    # ==========================================================================
    # PERFORMANCE GAP ENDPOINTS
    # ==========================================================================
    # POST /api/assessments/gaps/analyze/ - Gap analysis
    path("gaps/analyze/", GapAnalysisView.as_view(), name="gap-analysis"),
    # POST /api/assessments/gaps/peers/ - Peer comparison
    path("gaps/peers/", PeerComparisonView.as_view(), name="peer-comparison"),
    # POST /api/assessments/gaps/targets/ - Target recommendations
    path("gaps/targets/", TargetRecommendationsView.as_view(), name="target-recommendations"),

    # ==========================================================================
    # WEIGHTING ENDPOINTS
    # ==========================================================================
    # GET /api/assessments/weighting/ahp/ - AHP weights
    path("weighting/ahp/", AhpWeightsView.as_view(), name="ahp-weights"),
    # POST /api/assessments/weighting/hybrid/ - Hybrid weights
    path("weighting/hybrid/", HybridWeightsView.as_view(), name="hybrid-weights"),
    # GET /api/assessments/weighting/network/ - Network analysis
    path("weighting/network/", NetworkAnalysisView.as_view(), name="network-analysis"),

    # ==========================================================================
    # CONFIG ENDPOINTS
    # ==========================================================================
    # GET /api/assessments/config/ - FSFSI configuration
    path("config/", ConfigView.as_view(), name="config"),
    # GET /api/assessments/stress-level/ - Get stress level
    path("stress-level/", StressLevelView.as_view(), name="stress-level"),
]
