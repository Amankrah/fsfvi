"""Budget analysis API — history & snapshot (IndicatorData only)."""

from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.authentication.models import GovernmentUser
from apps.fsfvi_data.models import Indicator, IndicatorData, IndicatorComponent


class BudgetAnalysisFinancialApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = GovernmentUser.objects.create_user(
            username="budget_fin",
            email="budget_fin@gov.rw",
            password="x",
        )
        self.client.force_authenticate(user=self.user)
        self.ind = Indicator.objects.create(
            code="IND-B-01",
            name="Test budget indicator",
            component=IndicatorComponent.MARKETS,
            display_order=1,
        )

    def test_history_multi_year(self):
        for fy, w in [(2022, "10.0"), (2023, "12.0"), (2024, "11.0")]:
            IndicatorData.objects.create(
                indicator=self.ind,
                fiscal_year=fy,
                records_count=10,
                fallback_records=1,
                gross_lcu_bn=Decimal(w),
                weighted_lcu_bn=Decimal(w),
                share_weighted_percent=Decimal("100.0"),
            )
        r = self.client.get("/api/budget-analysis/history/")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(r.data["scope"]["years"], [2022, 2023, 2024])
        m0 = r.data["indicator_movers"][0]
        self.assertIn("share_change_ppt", m0)
        self.assertIn("share_of_national_first_pct", m0)
        self.assertIn("national_trend", r.data)
        self.assertIn("insights", r.data)
        self.assertNotIn("efficiency", r.data)
        self.assertNotIn("reallocation_plan", r.data)

    def test_history_skips_years_with_no_budget_amounts(self):
        """Placeholder FY rows (zero weighted & gross) must not anchor the default range."""
        IndicatorData.objects.create(
            indicator=self.ind,
            fiscal_year=2015,
            records_count=0,
            fallback_records=0,
            gross_lcu_bn=Decimal("0"),
            weighted_lcu_bn=Decimal("0"),
            share_weighted_percent=Decimal("0"),
        )
        IndicatorData.objects.create(
            indicator=self.ind,
            fiscal_year=2020,
            records_count=5,
            fallback_records=0,
            gross_lcu_bn=Decimal("5.0"),
            weighted_lcu_bn=Decimal("5.0"),
            share_weighted_percent=Decimal("100.0"),
        )
        r = self.client.get("/api/budget-analysis/history/")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(r.data["scope"]["years"], [2020])
        self.assertEqual(r.data["scope"]["available_range"]["min"], 2020)

    def test_snapshot_year(self):
        IndicatorData.objects.create(
            indicator=self.ind,
            fiscal_year=2024,
            records_count=5,
            fallback_records=0,
            gross_lcu_bn=Decimal("8.0"),
            weighted_lcu_bn=Decimal("8.0"),
            share_weighted_percent=Decimal("100.0"),
        )
        r = self.client.get("/api/budget-analysis/snapshot/", {"fiscal_year": 2024})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["fiscal_year"], 2024)
        self.assertEqual(len(r.data["indicator_breakdown"]), 1)

    def test_snapshot_missing_404(self):
        r = self.client.get("/api/budget-analysis/snapshot/", {"fiscal_year": 1999})
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
