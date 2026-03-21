"""Budget analysis API — multi-year financial trends (IndicatorData only; no FSFSI / optimization)."""

import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import build_budget_history_analysis, build_budget_snapshot

logger = logging.getLogger(__name__)


class BudgetHistoryView(APIView):
    """
    GET /api/budget-analysis/history/

    Query params:
      - start_year, end_year — optional; clipped to available IndicatorData years (FY ≥ 2018 only)
      - top_movers — optional cap on indicator mover rows (default 25)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        sy = request.query_params.get("start_year")
        ey = request.query_params.get("end_year")
        tm = request.query_params.get("top_movers")
        try:
            start_year = int(sy) if sy else None
            end_year = int(ey) if ey else None
            top_movers = int(tm) if tm else 25
        except ValueError:
            return Response({"error": "Invalid numeric query parameter"}, status=status.HTTP_400_BAD_REQUEST)

        top_movers = max(5, min(top_movers, 200))

        try:
            payload = build_budget_history_analysis(
                start_year,
                end_year,
                top_indicator_movers=top_movers,
            )
        except Exception:
            logger.exception("Budget history analysis failed")
            return Response(
                {"error": "Budget history analysis failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not payload:
            return Response(
                {"error": "No indicator budget data found. Run import_budget_mapping first."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(payload)


class BudgetSnapshotView(APIView):
    """
    GET /api/budget-analysis/snapshot/?fiscal_year=2024

    Single-year composition table (indicators + component shares). Fiscal year must be ≥ 2018.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        fy = request.query_params.get("fiscal_year")
        if not fy:
            return Response(
                {"error": "fiscal_year is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            fiscal_year = int(fy)
        except ValueError:
            return Response({"error": "Invalid fiscal_year"}, status=status.HTTP_400_BAD_REQUEST)

        payload = build_budget_snapshot(fiscal_year)
        if not payload:
            return Response(
                {"error": f"No budget data for fiscal year {fiscal_year}"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(payload)
