"""Budget analysis routes."""

from django.urls import path

from .views import BudgetHistoryView, BudgetSnapshotView

app_name = "budget_analysis"

urlpatterns = [
    path("history/", BudgetHistoryView.as_view(), name="budget-analysis-history"),
    path("snapshot/", BudgetSnapshotView.as_view(), name="budget-analysis-snapshot"),
]
