"""
Planning Models for Rwanda FSFSI.

Stores saved strategic plans so policymakers can persist their final
planning decisions and display them on the National Overview dashboard.
"""

import uuid
from decimal import Decimal

from django.db import models

from apps.authentication.models import GovernmentUser


class SavedStrategicPlan(models.Model):
    """
    A saved multi-year strategic plan.

    Policymakers explore different scenarios (targets, horizons, growth rates)
    on the Strategic Planning page. When satisfied, they save the final version.
    One active plan per fiscal year — saving a new one deactivates the previous.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Link to source assessment
    assessment = models.ForeignKey(
        "assessments.AssessmentResult",
        on_delete=models.CASCADE,
        related_name="strategic_plans",
    )

    # Plan identification
    fiscal_year = models.IntegerField(db_index=True)
    plan_name = models.CharField(max_length=255, blank=True, default="")
    is_active = models.BooleanField(default=True, db_index=True)

    # Input parameters (so the plan is reproducible)
    planning_years = models.IntegerField()
    target_fsfvi = models.DecimalField(max_digits=8, decimal_places=6)
    target_reduction_pct = models.DecimalField(max_digits=5, decimal_places=2)
    yearly_budget_growth_rate = models.DecimalField(max_digits=5, decimal_places=4)
    target_curve = models.CharField(max_length=20, default="smoothstep")

    # Summary fields (denormalized for quick dashboard reads)
    baseline_fsfsi = models.DecimalField(max_digits=8, decimal_places=6)
    final_projected_fsfsi = models.DecimalField(max_digits=8, decimal_places=6, null=True)
    total_additional_investment = models.DecimalField(max_digits=18, decimal_places=2, null=True)

    # Full plan result as JSON
    plan_json = models.JSONField(default=dict)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        GovernmentUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "saved_strategic_plans"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["fiscal_year", "is_active"]),
        ]

    def __str__(self):
        name = self.plan_name or f"Plan FY{self.fiscal_year}"
        return f"{name}: {self.baseline_fsfsi:.4f} → {self.target_fsfvi:.4f} ({self.planning_years}yr)"
