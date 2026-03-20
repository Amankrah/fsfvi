"""
Assessment URL Routes for Rwanda FSFSI API.
"""

from django.urls import path

from apps.optimization.views import (
    AssessmentEfficiencyView,
    AssessmentReallocationView,
    AssessmentRoiView,
)
from .views import (
    # Assessment
    AssessmentDetailView,
    AssessmentHistoryView,
    AssessmentListView,
    AvailableFiscalYearsView,
    DashboardSummaryView,
    QuickCheckView,
    RunAssessmentView,
    RunForYearView,
    # Optimization (legacy)
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
    # POST /api/assessments/run-for-year/ - Run assessment for a year (indicators from DB)
    path("run-for-year/", RunForYearView.as_view(), name="run-for-year"),
    # POST /api/assessments/quick-check/ - Quick FSFSI check
    path("quick-check/", QuickCheckView.as_view(), name="quick-check"),
    # GET /api/assessments/ - List assessments
    path("", AssessmentListView.as_view(), name="list-assessments"),
    # GET /api/assessments/<id>/ - Get assessment details
    path("<uuid:assessment_id>/", AssessmentDetailView.as_view(), name="assessment-detail"),
    # GET /api/assessments/dashboard/ - Dashboard summary
    path("dashboard/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    # GET /api/assessments/available-years/ - Fiscal years that have assessments
    path("available-years/", AvailableFiscalYearsView.as_view(), name="available-fiscal-years"),
    # GET /api/assessments/history/ - Assessment history
    path("history/", AssessmentHistoryView.as_view(), name="assessment-history"),

    # ==========================================================================
    # ASSESSMENT-BASED OPTIMIZATION (assessment is source of truth for FSFSI)
    # ==========================================================================
    path("optimization/<uuid:assessment_id>/efficiency/", AssessmentEfficiencyView.as_view(), name="assessment-efficiency"),
    path("optimization/<uuid:assessment_id>/reallocation/", AssessmentReallocationView.as_view(), name="assessment-reallocation"),
    path("optimization/<uuid:assessment_id>/roi/", AssessmentRoiView.as_view(), name="assessment-roi"),

    # Legacy optimization (raw component inputs)
    path("optimization/efficiency/", EfficiencyAnalysisView.as_view(), name="efficiency-analysis"),
    path("optimization/reallocation/", ReallocationPlanView.as_view(), name="reallocation-plan"),
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
