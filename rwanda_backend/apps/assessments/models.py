"""
Assessment Models for Rwanda FSFSI.

Stores assessment results at both indicator and component levels.
Based on the FSFSI framework (Ulimwengu, IFPRI 2026).

Includes cumulative stress extension: an asymmetric exponential moving average
that captures the reality that food system damage accumulates quickly but
recovery is slow — even when funding increases, institutions, infrastructure,
and human capital take years to rebuild.
"""

import uuid
from decimal import Decimal

from django.db import models

from apps.authentication.models import GovernmentUser
from apps.fsfvi_data.models import IndicatorComponent


class WeightingMethod(models.TextChoices):
    """Supported weighting methodologies."""
    EXPERT = "expert", "Expert (AHP)"
    FINANCIAL = "financial", "Financial (Budget-based)"
    NETWORK = "network", "Network (PageRank)"
    HYBRID = "hybrid", "Hybrid (Default)"


class Scenario(models.TextChoices):
    """Crisis/stress scenarios for simulation."""
    NORMAL = "normal_operations", "Normal Operations"
    CLIMATE_SHOCK = "climate_shock", "Climate Shock"
    FINANCIAL_CRISIS = "financial_crisis", "Financial Crisis"
    PANDEMIC = "pandemic_disruption", "Pandemic Disruption"
    SUPPLY_CHAIN = "supply_chain_disruption", "Supply Chain Disruption"


class StressLevel(models.TextChoices):
    """FSFSI stress classification — aligned with Rust backend thresholds."""
    LOW = "low", "Low (≤ 0.05)"
    MEDIUM = "medium", "Medium (0.05 - 0.15)"
    HIGH = "high", "High (0.15 - 0.30)"
    CRITICAL = "critical", "Critical (> 0.30)"


class ComponentPersistenceConfig(models.Model):
    """
    Per-component persistence parameters for cumulative stress.

    Controls how fast cumulative stress responds to changes:
    - rho_up: damage absorption speed (how quickly WORSENING is reflected)
    - rho_down: recovery speed (how quickly IMPROVEMENT is reflected)

    The asymmetry (rho_up > rho_down) encodes the empirical observation that
    food systems degrade faster than they recover.

    Formula: CS_i(t) = CS_i(t-1) + ρ · (v_i(t) - CS_i(t-1))
    where ρ = rho_up if worsening, rho_down if improving.
    """
    component = models.CharField(
        max_length=30,
        choices=IndicatorComponent.choices,
        unique=True,
        db_index=True,
    )
    rho_up = models.DecimalField(
        max_digits=6, decimal_places=4, default=Decimal("0.40"),
        help_text="Damage speed (0-1): how fast cumulative stress rises when current stress worsens"
    )
    rho_down = models.DecimalField(
        max_digits=6, decimal_places=4, default=Decimal("0.15"),
        help_text="Recovery speed (0-1): how fast cumulative stress falls when current stress improves"
    )

    class Meta:
        db_table = "component_persistence_config"
        verbose_name = "Component Persistence Config"

    def __str__(self):
        return f"{self.get_component_display()}: ρ↑={self.rho_up} ρ↓={self.rho_down}"

    # Default persistence parameters with real-world justification
    DEFAULTS = {
        # Markets: price shocks propagate fast; recovery depends on supply normalization
        "markets":         {"rho_up": "0.50", "rho_down": "0.20"},
        # Crop production: failures hit in one season; recovery takes multiple cycles
        "crop_production": {"rho_up": "0.35", "rho_down": "0.12"},
        # Nutrition: malnutrition damage is fast; stunting in children is irreversible
        "nutrition":       {"rho_up": "0.30", "rho_down": "0.10"},
        # Research: institutional degradation is gradual; rebuilding capacity takes years
        "research":        {"rho_up": "0.20", "rho_down": "0.08"},
        # Post-harvest: infrastructure damage is fast; rebuilding storage/logistics is slow
        "post_harvest":    {"rho_up": "0.40", "rho_down": "0.15"},
        # Environment: damage is cumulative; ecosystem recovery is the slowest of all
        "environment":     {"rho_up": "0.25", "rho_down": "0.06"},
        # Animal systems: disease/herd loss is rapid; restocking takes multiple cycles
        "animal_systems":  {"rho_up": "0.35", "rho_down": "0.12"},
        # Finance: financial stress propagates quickly; recovery is relatively fast with policy
        "finance":         {"rho_up": "0.45", "rho_down": "0.25"},
    }


class AssessmentResult(models.Model):
    """
    System-level FSFSI assessment result.

    Represents a complete assessment for a fiscal year,
    aggregating all indicator components.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Assessment scope
    fiscal_year = models.IntegerField(db_index=True)
    assessment_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Optional name for this assessment"
    )

    # Configuration
    weighting_method = models.CharField(
        max_length=20,
        choices=WeightingMethod.choices,
        default=WeightingMethod.HYBRID,
    )
    scenario = models.CharField(
        max_length=30,
        choices=Scenario.choices,
        default=Scenario.NORMAL,
    )

    # System-level FSFSI results
    fsfsi_score = models.DecimalField(
        max_digits=8,
        decimal_places=6,
        help_text="System-level FSFSI: Σᵢ ωᵢ · δᵢ · e^(-αᵢfᵢ)"
    )
    stress_level = models.CharField(max_length=20, choices=StressLevel.choices)

    # Optimal allocation comparison (FSFSI closed-form solution)
    fsfsi_optimal = models.DecimalField(
        max_digits=8,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="FSFSI under optimal allocation"
    )
    efficiency_index = models.DecimalField(
        max_digits=8,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="FSFSI_optimal / FSFSI_actual (closer to 1 = better)"
    )
    gap_ratio = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="(FSFSI_actual - FSFSI_optimal) / FSFSI_optimal"
    )

    # Cumulative stress (asymmetric EMA — damage fast, recovery slow)
    cumulative_fsfsi = models.DecimalField(
        max_digits=8, decimal_places=6, null=True, blank=True,
        help_text="System cumulative FSFSI: Σ ωᵢ · CS_i(t)"
    )
    cumulative_stress_level = models.CharField(
        max_length=20, choices=StressLevel.choices, null=True, blank=True,
        help_text="Stress classification based on cumulative FSFSI"
    )

    # Budget summary
    total_budget_lcu_bn = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Total budget in billions LCU"
    )
    total_budget_usd = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total budget in USD"
    )

    # Number of indicators/components included
    indicators_count = models.IntegerField(default=0)
    components_count = models.IntegerField(default=0)

    # Full result JSON (for detailed breakdown)
    result_json = models.JSONField(
        default=dict,
        help_text="Complete assessment output including component details"
    )

    # Metadata
    computed_at = models.DateTimeField(auto_now_add=True)
    computing_time_ms = models.IntegerField(null=True, blank=True)
    computed_by = models.ForeignKey(
        GovernmentUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "assessment_results"
        ordering = ["-computed_at"]
        verbose_name = "Assessment Result"
        verbose_name_plural = "Assessment Results"
        indexes = [
            models.Index(fields=["fiscal_year", "weighting_method"]),
            models.Index(fields=["computed_at"]),
        ]

    def __str__(self):
        name = self.assessment_name or f"Assessment FY{self.fiscal_year}"
        return f"{name}: FSFSI={self.fsfsi_score:.4f} ({self.stress_level})"


class ComponentResult(models.Model):
    """
    Component-level FSFSI result within an assessment.

    One record per IndicatorComponent in each assessment.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    assessment = models.ForeignKey(
        AssessmentResult,
        on_delete=models.CASCADE,
        related_name="component_results"
    )
    component = models.CharField(
        max_length=30,
        choices=IndicatorComponent.choices,
        db_index=True
    )

    # Component FSFSI values
    weight = models.DecimalField(
        max_digits=8,
        decimal_places=6,
        help_text="Component weight ωᵢ"
    )
    avg_performance_gap = models.DecimalField(
        max_digits=8,
        decimal_places=6,
        help_text="Average performance gap across indicators"
    )
    component_stress = models.DecimalField(
        max_digits=8,
        decimal_places=6,
        help_text="Component stress value"
    )
    weighted_stress = models.DecimalField(
        max_digits=8,
        decimal_places=6,
        help_text="ωᵢ · υᵢ contribution to system FSFSI"
    )
    priority_level = models.CharField(
        max_length=20,
        choices=StressLevel.choices,
        help_text="Priority level for this component"
    )

    # Cumulative stress (asymmetric EMA)
    cumulative_stress = models.DecimalField(
        max_digits=8, decimal_places=6, null=True, blank=True,
        help_text="Cumulative stress CS_i(t): accounts for damage persistence and slow recovery"
    )
    cumulative_weighted_stress = models.DecimalField(
        max_digits=8, decimal_places=6, null=True, blank=True,
        help_text="ωᵢ · CS_i(t) contribution to system cumulative FSFSI"
    )

    # Budget data
    budget_lcu_bn = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        null=True,
        blank=True
    )
    budget_share_percent = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        null=True,
        blank=True
    )

    # Optimal allocation
    optimal_allocation_usd = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Recommended allocation from optimization"
    )
    allocation_gap_usd = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Difference between optimal and current"
    )

    # Indicator count
    indicators_count = models.IntegerField(default=0)

    class Meta:
        db_table = "component_results"
        ordering = ["assessment", "-weighted_stress"]
        unique_together = [["assessment", "component"]]
        verbose_name = "Component Result"
        verbose_name_plural = "Component Results"

    def __str__(self):
        return f"{self.get_component_display()}: stress={self.component_stress:.4f}"


class IndicatorResult(models.Model):
    """
    Indicator-level FSFSI result within an assessment.

    Granular results for each of the 37 indicators.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    assessment = models.ForeignKey(
        AssessmentResult,
        on_delete=models.CASCADE,
        related_name="indicator_results"
    )
    indicator_code = models.CharField(max_length=20, db_index=True)
    indicator_name = models.CharField(max_length=255)
    component = models.CharField(max_length=30, choices=IndicatorComponent.choices)

    # Input values
    observed_value = models.DecimalField(
        max_digits=15, decimal_places=4, null=True, blank=True
    )
    benchmark_value = models.DecimalField(
        max_digits=15, decimal_places=4, null=True, blank=True
    )
    financial_allocation = models.DecimalField(
        max_digits=15, decimal_places=4, null=True, blank=True,
        help_text="In millions USD"
    )
    sensitivity = models.DecimalField(
        max_digits=10, decimal_places=6, null=True, blank=True
    )

    # FSFSI calculations
    performance_gap = models.DecimalField(
        max_digits=8, decimal_places=6,
        help_text="δᵢ = |xᵢ - x̄ᵢ| / max(xᵢ, x̄ᵢ)"
    )
    stress_value = models.DecimalField(
        max_digits=8, decimal_places=6,
        help_text="υᵢ(fᵢ) = δᵢ · e^(-αᵢfᵢ)"
    )

    # Cumulative stress (asymmetric EMA at indicator level)
    cumulative_stress = models.DecimalField(
        max_digits=8, decimal_places=6, null=True, blank=True,
        help_text="Cumulative indicator stress: accounts for damage persistence"
    )

    # Budget share from original data
    weighted_lcu_bn = models.DecimalField(
        max_digits=15, decimal_places=4, null=True, blank=True
    )
    share_weighted_percent = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True
    )

    class Meta:
        db_table = "indicator_results"
        ordering = ["assessment", "component", "indicator_code"]
        unique_together = [["assessment", "indicator_code"]]
        verbose_name = "Indicator Result"
        verbose_name_plural = "Indicator Results"

    def __str__(self):
        return f"{self.indicator_code}: gap={self.performance_gap:.4f}, stress={self.stress_value:.4f}"


class AssessmentHistory(models.Model):
    """
    Simplified historical FSFSI values for trend analysis.

    One record per fiscal year for quick time-series queries.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    fiscal_year = models.IntegerField(unique=True, db_index=True)
    fsfsi_score = models.DecimalField(max_digits=8, decimal_places=6)
    stress_level = models.CharField(max_length=20, choices=StressLevel.choices)

    # Component-level scores
    component_scores = models.JSONField(
        default=dict,
        help_text="Dict of component -> stress value"
    )

    # Budget totals
    total_budget_lcu_bn = models.DecimalField(
        max_digits=15, decimal_places=4, null=True, blank=True
    )

    # Cumulative stress
    cumulative_fsfsi = models.DecimalField(
        max_digits=8, decimal_places=6, null=True, blank=True,
    )
    cumulative_component_scores = models.JSONField(
        default=dict, blank=True,
        help_text="Dict of component -> cumulative stress value"
    )

    # Year-over-year change
    yoy_change = models.DecimalField(
        max_digits=8, decimal_places=6, null=True, blank=True,
        help_text="Change from previous year"
    )
    yoy_change_percent = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "assessment_history"
        ordering = ["-fiscal_year"]
        verbose_name = "Assessment History"
        verbose_name_plural = "Assessment History"

    def __str__(self):
        return f"FY{self.fiscal_year}: FSFSI={self.fsfsi_score:.4f}"
