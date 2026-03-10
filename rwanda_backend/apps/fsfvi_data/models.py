"""
FSFVI Data Models - Indicator-Based Structure.

Based on Rwanda's budget-to-food-system-indicators mapping:
- 8 Indicator Components (Markets, Crop Production, Nutrition, etc.)
- 37 Indicators with budget allocations
- FSFSI calculations at indicator and component level
"""

import uuid

from django.db import models

from apps.authentication.models import GovernmentUser


class IndicatorComponent(models.TextChoices):
    """
    8 Food System Indicator Components.

    These are the high-level categories that group related indicators.
    Maps directly to the Indicator_component column in budget data.
    """
    MARKETS = "markets", "Markets"
    CROP_PRODUCTION = "crop_production", "Crop Production"
    NUTRITION = "nutrition", "Nutrition"
    RESEARCH = "research", "Research"
    POST_HARVEST = "post_harvest", "Post-Harvest"
    ENVIRONMENT = "environment", "Environment"
    ANIMAL_SYSTEMS = "animal_systems", "Animal Systems"
    FINANCE = "finance", "Finance"


class DataStatus(models.TextChoices):
    """Workflow status for data submission."""
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    UNDER_REVIEW = "under_review", "Under Review"
    VALIDATED = "validated", "Validated"
    REJECTED = "rejected", "Rejected"


class Indicator(models.Model):
    """
    Individual Food System Indicator (37 total).

    Examples:
    - IND-01: Yield (t/ha)
    - IND-02: Irrigated land (%)
    - IND-16: Share of production marketed (%)
    - IND-20: Stunting rate (%)

    Each indicator belongs to one IndicatorComponent.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="e.g., IND-01, IND-16"
    )
    name = models.CharField(max_length=255, help_text="e.g., Yield (t/ha)")
    component = models.CharField(
        max_length=30,
        choices=IndicatorComponent.choices,
        db_index=True,
        help_text="Parent indicator component"
    )
    description = models.TextField(blank=True, default="")
    unit = models.CharField(max_length=50, blank=True, default="", help_text="e.g., %, t/ha, USD")

    # Direction for gap calculation
    higher_is_better = models.BooleanField(
        default=True,
        help_text="True if higher values are better (e.g., yield). False for metrics like stunting rate."
    )

    # Default sensitivity parameter (can be overridden per record)
    default_sensitivity = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=0.001,
        help_text="Default αᵢ for FSFSI calculation"
    )

    # Ordering for display
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "indicators"
        ordering = ["component", "display_order", "code"]
        verbose_name = "Indicator"
        verbose_name_plural = "Indicators"

    def __str__(self):
        return f"{self.code}: {self.name}"


class IndicatorData(models.Model):
    """
    Budget and performance data for a specific indicator in a fiscal year.

    This is the core input for FSFSI calculations at the indicator level.
    Aggregated to component level for system-wide assessment.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    indicator = models.ForeignKey(
        Indicator,
        on_delete=models.CASCADE,
        related_name="data_records"
    )

    # Time period
    fiscal_year = models.IntegerField(db_index=True, help_text="e.g., 2025 for FY 2025/2026")

    # Budget data (from Excel mapping)
    records_count = models.IntegerField(
        default=0,
        help_text="Number of budget line records for this indicator"
    )
    fallback_records = models.IntegerField(
        default=0,
        help_text="Number of fallback/estimated records"
    )
    gross_lcu_bn = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        help_text="Gross budget in Local Currency Units (billions)"
    )
    weighted_lcu_bn = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        help_text="Weighted budget in LCU (billions)"
    )
    share_weighted_percent = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        help_text="Share of total weighted budget (%)"
    )

    # FSFSI input values
    observed_value = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Current performance metric value"
    )
    benchmark_value = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Target/benchmark value"
    )
    benchmark_used_type = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Benchmark reference when value is missing, e.g. Global_10/90pct, SSA_10/90pct"
    )

    # Financial allocation in USD (converted from LCU)
    financial_allocation_usd = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Budget allocation in USD"
    )

    # Optional override of indicator's default sensitivity
    sensitivity_parameter = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Override αᵢ for this specific record"
    )

    # Computed FSFSI values (cached)
    performance_gap = models.DecimalField(
        max_digits=8,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Computed δᵢ"
    )
    stress_value = models.DecimalField(
        max_digits=8,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Computed υᵢ(fᵢ) = δᵢ · e^(-αᵢfᵢ)"
    )

    # Workflow
    status = models.CharField(
        max_length=20,
        choices=DataStatus.choices,
        default=DataStatus.DRAFT
    )

    # Audit
    created_by = models.ForeignKey(
        GovernmentUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_indicator_data"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "indicator_data"
        ordering = ["-fiscal_year", "indicator__component", "indicator__code"]
        verbose_name = "Indicator Data"
        verbose_name_plural = "Indicator Data"
        unique_together = [["indicator", "fiscal_year"]]
        indexes = [
            models.Index(fields=["fiscal_year", "status"]),
            models.Index(fields=["indicator", "fiscal_year"]),
        ]

    def __str__(self):
        return f"{self.indicator.code} - FY{self.fiscal_year}: {self.weighted_lcu_bn:.2f}bn LCU"

    @property
    def allocation_millions_usd(self) -> float:
        """Financial allocation in millions USD (for FSFSI calculations)."""
        if self.financial_allocation_usd:
            return float(self.financial_allocation_usd) / 1_000_000
        return 0.0

    def get_sensitivity(self) -> float:
        """Get sensitivity parameter (use override or indicator default)."""
        if self.sensitivity_parameter:
            return float(self.sensitivity_parameter)
        return float(self.indicator.default_sensitivity)


class ComponentAggregation(models.Model):
    """
    Aggregated data at the IndicatorComponent level.

    Pre-computed aggregations of indicator data for faster
    component-level FSFSI calculations.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    component = models.CharField(
        max_length=30,
        choices=IndicatorComponent.choices,
        db_index=True
    )
    fiscal_year = models.IntegerField(db_index=True)

    # Aggregated budget data
    total_records = models.IntegerField(default=0)
    total_gross_lcu_bn = models.DecimalField(max_digits=15, decimal_places=4)
    total_weighted_lcu_bn = models.DecimalField(max_digits=15, decimal_places=4)
    share_of_total_percent = models.DecimalField(max_digits=8, decimal_places=4)

    # Aggregated FSFSI values
    avg_performance_gap = models.DecimalField(
        max_digits=8, decimal_places=6, null=True, blank=True
    )
    component_stress = models.DecimalField(
        max_digits=8, decimal_places=6, null=True, blank=True,
        help_text="Aggregated stress for this component"
    )

    # Component weight (for system-level FSFSI)
    weight = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Component importance weight ωᵢ"
    )

    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "component_aggregations"
        ordering = ["-fiscal_year", "component"]
        unique_together = [["component", "fiscal_year"]]
        verbose_name = "Component Aggregation"
        verbose_name_plural = "Component Aggregations"

    def __str__(self):
        return f"{self.get_component_display()} - FY{self.fiscal_year}"


class BudgetLineMapping(models.Model):
    """
    Raw budget line to food system indicator mapping (from Excel Mapping sheet).

    One row per budget line. Used for traceability and audit.
    Optimized for bulk insert: minimal constraints, indexed by fiscal_year + indicator.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fiscal_year = models.IntegerField(db_index=True, help_text="e.g., 2018 from 2018/2019")
    code = models.CharField(max_length=50, blank=True, default="")
    mda = models.CharField(max_length=255, blank=True, default="")
    sub_program_name = models.CharField(max_length=255, blank=True, default="")
    project_name = models.CharField(max_length=500, blank=True, default="")
    budget_line = models.CharField(max_length=500, blank=True, default="")
    type = models.CharField(max_length=50, blank=True, default="")
    source = models.CharField(max_length=100, blank=True, default="")
    specific_supportive = models.CharField(max_length=100, blank=True, default="")
    group = models.CharField(max_length=100, blank=True, default="")
    food_system_component = models.CharField(max_length=100, blank=True, default="")
    amount_gross_lcu = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True
    )
    amount_weighted_lcu = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True
    )
    primary_indicator = models.CharField(max_length=100, blank=True, default="")
    direct_effect_pathway = models.TextField(blank=True, default="")
    key_references = models.TextField(blank=True, default="")
    match_type = models.CharField(max_length=50, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    indicator_component = models.CharField(max_length=50, db_index=True, blank=True, default="")
    indicator = models.CharField(max_length=255, blank=True, default="")
    specification = models.TextField(blank=True, default="")
    benchmark = models.CharField(max_length=100, blank=True, default="")
    gap = models.CharField(max_length=100, blank=True, default="")
    responsiveness = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        db_table = "budget_line_mappings"
        ordering = ["fiscal_year", "indicator_component", "primary_indicator"]
        indexes = [
            models.Index(fields=["fiscal_year", "indicator_component"]),
        ]
        verbose_name = "Budget Line Mapping"
        verbose_name_plural = "Budget Line Mappings"


class ExchangeRate(models.Model):
    """
    LCU to USD exchange rates for currency conversion.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fiscal_year = models.IntegerField(unique=True)
    lcu_per_usd = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        help_text="Local Currency Units per 1 USD"
    )
    source = models.CharField(max_length=255, blank=True, default="")
    effective_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "exchange_rates"
        ordering = ["-fiscal_year"]

    def __str__(self):
        return f"FY{self.fiscal_year}: {self.lcu_per_usd} LCU/USD"
