"""
Optimization Models for Rwanda FSFSI.

Stores optimization analysis results and reallocation plans.
All computation is handled by Rust fsfi_engine.
"""

import uuid

from django.db import models

from apps.fsfvi_data.models import IndicatorComponent


class OptimizationResult(models.Model):
    """Stores a budget optimization analysis result."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fiscal_year = models.IntegerField()
    analysis_type = models.CharField(
        max_length=50,
        choices=[
            ("efficiency", "Efficiency Analysis"),
            ("reallocation", "Reallocation Plan"),
            ("roi", "ROI Analysis"),
        ],
    )
    total_budget_lcu_bn = models.DecimalField(
        max_digits=15, decimal_places=4, null=True, blank=True
    )
    total_budget_usd = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )

    # Efficiency metrics
    current_fsfsi = models.DecimalField(
        max_digits=8, decimal_places=6, null=True, blank=True
    )
    optimal_fsfsi = models.DecimalField(
        max_digits=8, decimal_places=6, null=True, blank=True
    )
    efficiency_index = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True
    )
    improvement_potential = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True
    )

    # Full result JSON from Rust engine
    result_json = models.JSONField(default=dict)

    # Metadata
    computed_at = models.DateTimeField(auto_now_add=True)
    computing_time_ms = models.IntegerField(default=0)
    computed_by = models.ForeignKey(
        "authentication.GovernmentUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="optimization_results",
    )

    class Meta:
        ordering = ["-computed_at"]
        indexes = [
            models.Index(fields=["fiscal_year", "analysis_type"]),
            models.Index(fields=["computed_at"]),
        ]

    def __str__(self):
        return f"{self.analysis_type} - FY{self.fiscal_year} ({self.computed_at.date()})"


class ComponentOptimization(models.Model):
    """Stores component-level optimization details."""

    optimization = models.ForeignKey(
        OptimizationResult,
        on_delete=models.CASCADE,
        related_name="component_optimizations",
    )
    component = models.CharField(
        max_length=50,
        choices=IndicatorComponent.choices,
    )

    # Allocation data
    current_allocation_usd = models.DecimalField(max_digits=15, decimal_places=2)
    optimal_allocation_usd = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    allocation_gap_usd = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    allocation_gap_pct = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )

    # Stress data
    current_stress = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True
    )
    optimal_stress = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True
    )
    stress_reduction = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True
    )

    # ROI data
    roi_per_million = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )
    roi_rank = models.IntegerField(null=True, blank=True)

    # Status
    is_underfunded = models.BooleanField(default=False)
    priority = models.IntegerField(default=0)
    recommendation = models.TextField(blank=True)

    class Meta:
        unique_together = ["optimization", "component"]
        ordering = ["priority", "component"]

    def __str__(self):
        return f"{self.get_component_display()} - {self.optimization}"

    def get_component_display(self):
        return dict(IndicatorComponent.choices).get(self.component, self.component)


class GapAnalysisResult(models.Model):
    """Stores performance gap analysis results."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fiscal_year = models.IntegerField()
    analysis_type = models.CharField(
        max_length=50,
        choices=[
            ("gaps", "Gap Analysis"),
            ("peers", "Peer Comparison"),
            ("targets", "Target Recommendations"),
        ],
    )

    # Summary metrics
    average_gap = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True
    )
    worst_gap_component = models.CharField(max_length=50, blank=True)
    best_gap_component = models.CharField(max_length=50, blank=True)
    on_track_count = models.IntegerField(default=0)
    behind_count = models.IntegerField(default=0)
    critical_count = models.IntegerField(default=0)

    # Peer comparison
    rwanda_rank = models.IntegerField(null=True, blank=True)
    total_peers = models.IntegerField(null=True, blank=True)

    # Target recommendations
    target_year = models.IntegerField(null=True, blank=True)
    years_to_target = models.IntegerField(null=True, blank=True)

    # Full result JSON from Rust engine
    result_json = models.JSONField(default=dict)

    # Metadata
    computed_at = models.DateTimeField(auto_now_add=True)
    computing_time_ms = models.IntegerField(default=0)
    computed_by = models.ForeignKey(
        "authentication.GovernmentUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gap_analysis_results",
    )

    class Meta:
        ordering = ["-computed_at"]
        indexes = [
            models.Index(fields=["fiscal_year", "analysis_type"]),
            models.Index(fields=["computed_at"]),
        ]

    def __str__(self):
        return f"{self.analysis_type} - FY{self.fiscal_year} ({self.computed_at.date()})"


class ComponentGap(models.Model):
    """Stores component-level gap analysis details."""

    gap_analysis = models.ForeignKey(
        GapAnalysisResult,
        on_delete=models.CASCADE,
        related_name="component_gaps",
    )
    component = models.CharField(
        max_length=50,
        choices=IndicatorComponent.choices,
    )

    # Gap data
    observed_value = models.DecimalField(max_digits=15, decimal_places=4)
    benchmark_value = models.DecimalField(max_digits=15, decimal_places=4)
    gap = models.DecimalField(max_digits=8, decimal_places=4)
    gap_pct = models.DecimalField(max_digits=8, decimal_places=2)
    stress = models.DecimalField(max_digits=8, decimal_places=4)

    # Classification
    status = models.CharField(
        max_length=20,
        choices=[
            ("on_track", "On Track"),
            ("behind", "Behind"),
            ("critical", "Critical"),
        ],
    )
    rank = models.IntegerField(default=0)
    recommendation = models.TextField(blank=True)

    # Target data (for target recommendations)
    recommended_target = models.DecimalField(
        max_digits=15, decimal_places=4, null=True, blank=True
    )
    target_gap = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True
    )
    annual_improvement_needed = models.DecimalField(
        max_digits=15, decimal_places=4, null=True, blank=True
    )
    priority = models.CharField(max_length=20, blank=True)

    class Meta:
        unique_together = ["gap_analysis", "component"]
        ordering = ["rank"]

    def __str__(self):
        return f"{self.get_component_display()} - {self.gap_analysis}"

    def get_component_display(self):
        return dict(IndicatorComponent.choices).get(self.component, self.component)
