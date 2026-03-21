"""
Planning Models for Rwanda FSFSI.

Stores saved strategic plans so policymakers can persist their final
planning decisions and display them on the National Overview dashboard.
"""

import uuid
from decimal import Decimal

from django.db import models
from django.db.models.functions import Lower

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
    # Must match the weighting used when generating plan_json (Rust multi-year uses these ωᵢ).
    weighting_method = models.CharField(max_length=32, default="hybrid", db_index=True)
    scenario = models.CharField(max_length=64, default="normal_operations")

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
        constraints = [
            models.UniqueConstraint(
                Lower("plan_name"),
                "fiscal_year",
                name="uniq_saved_plan_name_per_fy_ci",
            ),
        ]

    def __str__(self):
        name = self.plan_name or f"Plan FY{self.fiscal_year}"
        return f"{name}: {self.baseline_fsfsi:.4f} → {self.target_fsfvi:.4f} ({self.planning_years}yr)"


class PlanYearActual(models.Model):
    """
    Stores actual budget allocations for a specific year within a strategic plan.

    Policy makers use this to record what was actually allocated (which may differ
    from the optimal plan). The system then re-calculates future year projections
    based on these actuals, showing the real trajectory vs the planned trajectory.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Link to parent plan
    plan = models.ForeignKey(
        SavedStrategicPlan,
        on_delete=models.CASCADE,
        related_name="year_actuals",
    )

    # Which year this actual is for (1-indexed plan year, matches yearly_plans[].year)
    plan_year = models.IntegerField()
    fiscal_year = models.IntegerField(db_index=True)

    # Total actual budget allocated (bn LCU)
    total_budget_bn = models.DecimalField(max_digits=14, decimal_places=4)

    # Per-component actual allocations (bn LCU)
    # Format: {"markets": 379.4215, "finance": 341.7583, ...}
    component_allocations_bn = models.JSONField(default=dict)

    # Simulated results based on actual allocation (cached from simulate_user_allocation_year)
    simulated_cumulative_fsfsi = models.DecimalField(
        max_digits=8, decimal_places=6, null=True, blank=True
    )
    simulated_component_stress = models.JSONField(default=dict, blank=True)

    # Comparison with plan
    delta_vs_plan_fsfsi = models.DecimalField(
        max_digits=8, decimal_places=6, null=True, blank=True
    )

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
        db_table = "plan_year_actuals"
        ordering = ["plan_year"]
        constraints = [
            models.UniqueConstraint(
                "plan",
                "plan_year",
                name="uniq_plan_year_actual",
            ),
        ]

    def __str__(self):
        return f"FY{self.fiscal_year} actual: {self.total_budget_bn:.2f} bn"


# ---------------------------------------------------------------------------
# PSTA-5 Alignment Tracking Models
# ---------------------------------------------------------------------------

class PSTA5Pillar(models.Model):
    """
    PSTA-5 Strategic Pillars (2024-2029).

    Rwanda's Fifth Strategic Plan for Agriculture Transformation defines
    priority areas that guide agricultural investment and policy.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Pillar identification
    code = models.CharField(max_length=10, unique=True)  # e.g., "P1", "P2"
    name = models.CharField(max_length=255)  # e.g., "Agricultural Productivity & Resilience"
    name_fr = models.CharField(max_length=255, blank=True)  # French translation
    name_rw = models.CharField(max_length=255, blank=True)  # Kinyarwanda translation
    description = models.TextField(blank=True)

    # Display order
    sort_order = models.IntegerField(default=0)

    # Weight for alignment scoring (sum across all pillars = 1.0)
    weight = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal("0.2000"))

    # Status
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "psta5_pillars"
        ordering = ["sort_order"]
        verbose_name = "PSTA-5 Pillar"
        verbose_name_plural = "PSTA-5 Pillars"

    def __str__(self):
        return f"{self.code}: {self.name}"


class PSTA5KPI(models.Model):
    """
    Key Performance Indicators for PSTA-5 pillars.

    Each pillar has specific KPIs with baseline values, targets, and units.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Link to pillar
    pillar = models.ForeignKey(
        PSTA5Pillar,
        on_delete=models.CASCADE,
        related_name="kpis",
    )

    # KPI identification
    code = models.CharField(max_length=20)  # e.g., "P1.1", "P1.2"
    name = models.CharField(max_length=255)  # e.g., "Crop productivity (MT/ha)"
    name_fr = models.CharField(max_length=255, blank=True)
    name_rw = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    unit = models.CharField(max_length=50, blank=True)  # e.g., "MT/ha", "%", "index"

    # Baseline and target values
    baseline_year = models.IntegerField(default=2023)
    baseline_value = models.DecimalField(max_digits=14, decimal_places=4)
    target_year = models.IntegerField(default=2029)  # End of PSTA-5
    target_value = models.DecimalField(max_digits=14, decimal_places=4)

    # Direction: True = higher is better, False = lower is better
    higher_is_better = models.BooleanField(default=True)

    # Weight within pillar (sum of KPIs in a pillar = 1.0)
    weight = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal("0.2500"))

    # Display order
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "psta5_kpis"
        ordering = ["pillar__sort_order", "sort_order"]
        verbose_name = "PSTA-5 KPI"
        verbose_name_plural = "PSTA-5 KPIs"
        constraints = [
            models.UniqueConstraint("pillar", "code", name="uniq_kpi_code_per_pillar"),
        ]

    def __str__(self):
        return f"{self.code}: {self.name}"

    def progress_percent(self, current_value: Decimal) -> float:
        """Calculate progress percentage toward target."""
        baseline = float(self.baseline_value)
        target = float(self.target_value)
        current = float(current_value)

        if target == baseline:
            return 100.0 if current == target else 0.0

        if self.higher_is_better:
            progress = (current - baseline) / (target - baseline) * 100
        else:
            progress = (baseline - current) / (baseline - target) * 100

        return max(0.0, min(100.0, progress))


class PSTA5ComponentMapping(models.Model):
    """
    Maps FSFSI components to PSTA-5 pillars.

    A component can contribute to multiple pillars with different weights.
    This enables automatic alignment scoring based on budget allocations.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    pillar = models.ForeignKey(
        PSTA5Pillar,
        on_delete=models.CASCADE,
        related_name="component_mappings",
    )

    # FSFSI component key (matches IndicatorComponent enum)
    component = models.CharField(max_length=50)  # e.g., "markets", "crop_production"

    # Contribution weight (how much this component contributes to this pillar)
    # A component with weight 0.8 for pillar P1 contributes 80% to P1 alignment
    contribution_weight = models.DecimalField(max_digits=5, decimal_places=4)

    # Optional: specific indicators within the component that map to this pillar
    indicator_codes = models.JSONField(default=list, blank=True)  # e.g., ["I01", "I02"]

    class Meta:
        db_table = "psta5_component_mappings"
        ordering = ["pillar__sort_order", "component"]
        constraints = [
            models.UniqueConstraint("pillar", "component", name="uniq_pillar_component"),
        ]

    def __str__(self):
        return f"{self.pillar.code} ← {self.component} ({self.contribution_weight:.0%})"


class PSTA5KPIComponentMapping(models.Model):
    """
    Maps PSTA-5 KPIs to their driving FSFSI components.

    Unlike PSTA5ComponentMapping (Component → Priority Area), this provides
    KPI-level granularity. Each KPI can be driven by one or more components
    with different weights, enabling accurate projected improvement calculations.

    Example:
        PA1.1 "Crop productivity" → crop_production (100%)
        PA1.4 "Livestock productivity" → animal_systems (100%)
        PA1.7 "Food self-sufficiency" → crop_production (60%) + animal_systems (40%)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    kpi = models.ForeignKey(
        PSTA5KPI,
        on_delete=models.CASCADE,
        related_name="component_mappings",
    )

    # FSFSI component key (matches IndicatorComponent enum)
    component = models.CharField(max_length=50)  # e.g., "crop_production", "animal_systems"

    # How much this component contributes to this KPI's improvement
    # Weights for a KPI should sum to 1.0
    weight = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal("1.0000"))

    class Meta:
        db_table = "psta5_kpi_component_mappings"
        ordering = ["kpi__pillar__sort_order", "kpi__sort_order", "-weight"]
        constraints = [
            models.UniqueConstraint("kpi", "component", name="uniq_kpi_component_mapping"),
        ]

    def __str__(self):
        return f"{self.kpi.code} ← {self.component} ({self.weight:.0%})"


class PSTA5AnnualTarget(models.Model):
    """
    Year-by-year targets for each KPI (interpolated milestones).

    PSTA-5 spans 2024-2029. This table stores intermediate targets
    for tracking year-by-year progress.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    kpi = models.ForeignKey(
        PSTA5KPI,
        on_delete=models.CASCADE,
        related_name="annual_targets",
    )

    fiscal_year = models.IntegerField()
    target_value = models.DecimalField(max_digits=14, decimal_places=4)

    # Optional notes for this year's target
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "psta5_annual_targets"
        ordering = ["kpi", "fiscal_year"]
        constraints = [
            models.UniqueConstraint("kpi", "fiscal_year", name="uniq_kpi_annual_target"),
        ]

    def __str__(self):
        return f"{self.kpi.code} FY{self.fiscal_year}: {self.target_value}"


class PSTA5Progress(models.Model):
    """
    Records actual progress for KPIs.

    Tracks observed values over time to compare against targets.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    kpi = models.ForeignKey(
        PSTA5KPI,
        on_delete=models.CASCADE,
        related_name="progress_records",
    )

    fiscal_year = models.IntegerField()
    actual_value = models.DecimalField(max_digits=14, decimal_places=4)

    # Data source/notes
    source = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    # Metadata
    recorded_at = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(
        GovernmentUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "psta5_progress"
        ordering = ["kpi", "-fiscal_year"]
        constraints = [
            models.UniqueConstraint("kpi", "fiscal_year", name="uniq_kpi_progress_per_year"),
        ]

    def __str__(self):
        return f"{self.kpi.code} FY{self.fiscal_year}: {self.actual_value}"

    @property
    def progress_percent(self) -> float:
        """Calculate progress toward final target."""
        return self.kpi.progress_percent(self.actual_value)
