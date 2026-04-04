"""Saved strategic plan API: uniqueness, PATCH, DELETE (plan_for_assessment mocked)."""

from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.assessments.models import AssessmentResult, StressLevel
from apps.authentication.models import GovernmentUser
from apps.planning.models import SavedStrategicPlan


def _mock_plan_result(baseline=0.39, final=0.23, wm="hybrid"):
    return {
        "baseline_fsfvi": baseline,
        "target_fsfvi": 0.24,
        "planning_years": 5,
        "planning_weighting_method": wm,
        "planning_scenario": "normal_operations",
        "target_already_achieved": False,
        "yearly_plans": [
            {"projected_fsfvi": 0.35},
            {"projected_fsfvi": final},
        ],
        "total_additional_investment_needed": 1_000_000,
        "expected_outcomes": [],
        "implementation_risks": [],
        "success_factors": [],
    }


class SavedPlansApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = GovernmentUser.objects.create_user(
            username="plan_tester",
            email="plan_tester@gov.rw",
            password="PlanTester@Secure123",
        )
        self.client.force_authenticate(user=self.user)
        self.assessment = AssessmentResult.objects.create(
            fiscal_year=2024,
            fsfsi_score=Decimal("0.391300"),
            stress_level=StressLevel.MEDIUM,
            result_json={},
        )

    @patch("apps.planning.views.plan_for_assessment")
    def test_save_different_weights_changes_baseline_in_stored_json(self, mock_plan):
        mock_plan.side_effect = [
            _mock_plan_result(baseline=0.39, final=0.23, wm="expert"),
            _mock_plan_result(baseline=0.41, final=0.21, wm="financial"),
        ]
        base_body = {
            "assessment_id": str(self.assessment.pk),
            "planning_years": 5,
            "target_fsfvi": 0.24,
            "target_reduction_pct": 40,
            "yearly_budget_growth_rate": 0.08,
            "target_curve": "smoothstep",
            "weighting_method": "expert",
            "scenario": "normal_operations",
        }
        r1 = self.client.post(
            "/api/planning/saved-plans/",
            {**base_body, "plan_name": "Expert weights"},
            format="json",
        )
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED, r1.data)
        self.assertEqual(float(r1.data["plan_json"]["baseline_fsfvi"]), 0.39)

        r2 = self.client.post(
            "/api/planning/saved-plans/",
            {
                **base_body,
                "plan_name": "Financial weights",
                "weighting_method": "financial",
            },
            format="json",
        )
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED, r2.data)
        self.assertEqual(float(r2.data["plan_json"]["baseline_fsfvi"]), 0.41)
        self.assertEqual(mock_plan.call_count, 2)

    @patch("apps.planning.views.plan_for_assessment")
    def test_duplicate_plan_name_rejected_case_insensitive(self, mock_plan):
        mock_plan.return_value = _mock_plan_result()
        body = {
            "assessment_id": str(self.assessment.pk),
            "plan_name": "My Plan",
            "planning_years": 5,
            "target_fsfvi": 0.24,
            "target_reduction_pct": 40,
            "yearly_budget_growth_rate": 0.08,
            "target_curve": "smoothstep",
        }
        r1 = self.client.post("/api/planning/saved-plans/", body, format="json")
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        r2 = self.client.post(
            "/api/planning/saved-plans/",
            {**body, "plan_name": "  MY plan  "},
            format="json",
        )
        self.assertEqual(r2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", r2.data)

    @patch("apps.planning.views.plan_for_assessment")
    def test_patch_updates_weighting_and_regenerates(self, mock_plan):
        mock_plan.return_value = _mock_plan_result(wm="hybrid")
        create = self.client.post(
            "/api/planning/saved-plans/",
            {
                "assessment_id": str(self.assessment.pk),
                "plan_name": "Patch me",
                "planning_years": 5,
                "target_fsfvi": 0.24,
                "target_reduction_pct": 40,
                "yearly_budget_growth_rate": 0.08,
                "target_curve": "smoothstep",
                "weighting_method": "hybrid",
                "scenario": "normal_operations",
            },
            format="json",
        )
        pid = create.data["id"]
        mock_plan.return_value = _mock_plan_result(baseline=0.50, final=0.19, wm="network")
        patch_r = self.client.patch(
            f"/api/planning/saved-plans/{pid}/",
            {"weighting_method": "network"},
            format="json",
        )
        self.assertEqual(patch_r.status_code, status.HTTP_200_OK, patch_r.data)
        plan = SavedStrategicPlan.objects.get(pk=pid)
        self.assertEqual(plan.weighting_method, "network")
        self.assertEqual(float(plan.plan_json["baseline_fsfvi"]), 0.50)

    @patch("apps.planning.views.plan_for_assessment")
    def test_delete_removes_row(self, mock_plan):
        mock_plan.return_value = _mock_plan_result()
        create = self.client.post(
            "/api/planning/saved-plans/",
            {
                "assessment_id": str(self.assessment.pk),
                "plan_name": "To delete",
                "planning_years": 5,
                "target_fsfvi": 0.24,
                "target_reduction_pct": 40,
                "yearly_budget_growth_rate": 0.08,
                "target_curve": "smoothstep",
            },
            format="json",
        )
        pid = create.data["id"]
        del_r = self.client.delete(f"/api/planning/saved-plans/{pid}/")
        self.assertEqual(del_r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SavedStrategicPlan.objects.filter(pk=pid).exists())
