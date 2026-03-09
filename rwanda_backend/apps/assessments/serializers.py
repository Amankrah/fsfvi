"""
Assessment Serializers for Rwanda FSFSI API.

Provides serialization for assessment requests and responses.
"""

from decimal import Decimal

from rest_framework import serializers

from apps.fsfvi_data.models import IndicatorComponent

from .models import (
    AssessmentHistory,
    AssessmentResult,
    ComponentResult,
    IndicatorResult,
    Scenario,
    StressLevel,
    WeightingMethod,
)


# ---------------------------------------------------------------------------
# Input Serializers (for API requests)
# ---------------------------------------------------------------------------


class IndicatorInputSerializer(serializers.Serializer):
    """Input data for a single indicator in an assessment request."""

    indicator_code = serializers.CharField(
        max_length=20, help_text="Indicator code, e.g., IND-01"
    )
    indicator_component = serializers.ChoiceField(
        choices=[c[0] for c in IndicatorComponent.choices],
        help_text="Component this indicator belongs to",
    )
    name = serializers.CharField(max_length=255, help_text="Indicator name")
    records_count = serializers.IntegerField(
        min_value=0, default=0, help_text="Number of budget records"
    )
    gross_lcu_bn = serializers.DecimalField(
        max_digits=15,
        decimal_places=4,
        help_text="Gross budget in billions LCU",
    )
    weighted_lcu_bn = serializers.DecimalField(
        max_digits=15,
        decimal_places=4,
        help_text="Weighted budget in billions LCU",
    )
    share_weighted_percent = serializers.DecimalField(
        max_digits=8,
        decimal_places=4,
        help_text="Share of total weighted budget (%)",
    )
    observed_value = serializers.DecimalField(
        max_digits=15,
        decimal_places=4,
        required=False,
        allow_null=True,
        help_text="Observed performance metric (optional)",
    )
    benchmark_value = serializers.DecimalField(
        max_digits=15,
        decimal_places=4,
        required=False,
        allow_null=True,
        help_text="Benchmark/target value (optional)",
    )


class AssessmentRequestSerializer(serializers.Serializer):
    """Input for running a full FSFSI assessment."""

    fiscal_year = serializers.IntegerField(
        min_value=2000, max_value=2100, help_text="Fiscal year for assessment"
    )
    assessment_name = serializers.CharField(
        max_length=255,
        required=False,
        default="",
        help_text="Optional name for this assessment",
    )
    weighting_method = serializers.ChoiceField(
        choices=[m[0] for m in WeightingMethod.choices],
        default="hybrid",
        help_text="Weighting methodology to use",
    )
    scenario = serializers.ChoiceField(
        choices=[s[0] for s in Scenario.choices],
        default="normal_operations",
        help_text="Scenario for stress analysis",
    )
    indicators = IndicatorInputSerializer(many=True, min_length=1)
    save_result = serializers.BooleanField(
        default=True, help_text="Whether to save assessment to database"
    )


class QuickCheckRequestSerializer(serializers.Serializer):
    """Input for quick FSFSI check (lightweight assessment)."""

    indicators = IndicatorInputSerializer(many=True, min_length=1)


# ---------------------------------------------------------------------------
# Output Serializers (for API responses)
# ---------------------------------------------------------------------------


class IndicatorAssessmentOutputSerializer(serializers.Serializer):
    """Output for a single indicator's assessment result."""

    indicator_code = serializers.CharField()
    indicator_component = serializers.CharField()
    name = serializers.CharField()
    stress = serializers.DecimalField(max_digits=8, decimal_places=4)
    weighted_stress = serializers.DecimalField(max_digits=8, decimal_places=6)
    performance_gap = serializers.DecimalField(max_digits=8, decimal_places=4)
    risk_level = serializers.CharField()
    gross_lcu_bn = serializers.DecimalField(max_digits=15, decimal_places=4)
    weighted_lcu_bn = serializers.DecimalField(max_digits=15, decimal_places=4)
    share_weighted_percent = serializers.DecimalField(max_digits=8, decimal_places=4)


class ComponentAggregationOutputSerializer(serializers.Serializer):
    """Output for component-level aggregation."""

    component = serializers.CharField()
    component_display = serializers.SerializerMethodField()
    indicator_count = serializers.IntegerField()
    total_gross_lcu_bn = serializers.DecimalField(max_digits=15, decimal_places=4)
    total_weighted_lcu_bn = serializers.DecimalField(max_digits=15, decimal_places=4)
    total_share_weighted_percent = serializers.DecimalField(max_digits=8, decimal_places=4)
    average_performance_gap = serializers.DecimalField(max_digits=8, decimal_places=4)

    def get_component_display(self, obj):
        """Get human-readable component name."""
        display_names = {
            "markets": "Markets",
            "crop_production": "Crop Production",
            "nutrition": "Nutrition",
            "research": "Research",
            "post_harvest": "Post-Harvest",
            "environment": "Environment",
            "animal_systems": "Animal Systems",
            "finance": "Finance",
        }
        return display_names.get(obj.get("component", ""), obj.get("component", ""))


class ActionPriorityOutputSerializer(serializers.Serializer):
    """Output for action priority recommendation."""

    rank = serializers.IntegerField()
    component = serializers.CharField()
    action = serializers.CharField()
    expected_impact = serializers.CharField()
    budget_implication = serializers.CharField()
    timeline = serializers.CharField()


class EfficiencyMetricsOutputSerializer(serializers.Serializer):
    """Output for efficiency metrics."""

    efficiency_index = serializers.DecimalField(max_digits=8, decimal_places=4)
    gap_ratio = serializers.DecimalField(max_digits=8, decimal_places=4)
    fsfsi_actual = serializers.DecimalField(max_digits=8, decimal_places=6)
    fsfsi_optimal = serializers.DecimalField(max_digits=8, decimal_places=6)
    potential_improvement = serializers.DecimalField(max_digits=8, decimal_places=6)


class AssessmentMetadataOutputSerializer(serializers.Serializer):
    """Output for assessment metadata."""

    fiscal_year = serializers.IntegerField()
    weighting_method = serializers.CharField()
    scenario = serializers.CharField()
    calculated_at = serializers.DateTimeField()
    computing_time_ms = serializers.IntegerField()
    indicator_count = serializers.IntegerField()
    component_count = serializers.IntegerField()
    total_budget_lcu_bn = serializers.DecimalField(max_digits=15, decimal_places=4)


class AssessmentResultOutputSerializer(serializers.Serializer):
    """Full assessment result output."""

    overall_fsfsi = serializers.DecimalField(max_digits=8, decimal_places=4)
    risk_level = serializers.CharField()
    indicator_results = IndicatorAssessmentOutputSerializer(many=True)
    component_aggregations = ComponentAggregationOutputSerializer(many=True)
    action_priorities = ActionPriorityOutputSerializer(many=True)
    efficiency = EfficiencyMetricsOutputSerializer()
    metadata = AssessmentMetadataOutputSerializer()


class QuickCheckOutputSerializer(serializers.Serializer):
    """Quick check result output."""

    fsfi_score = serializers.DecimalField(max_digits=8, decimal_places=4)
    risk_level = serializers.CharField()
    critical_components = serializers.IntegerField()
    top_concern = serializers.CharField()
    computing_time_ms = serializers.IntegerField()


# ---------------------------------------------------------------------------
# Model Serializers (for database models)
# ---------------------------------------------------------------------------


class IndicatorResultSerializer(serializers.ModelSerializer):
    """Serializer for IndicatorResult model."""

    component_display = serializers.SerializerMethodField()

    class Meta:
        model = IndicatorResult
        fields = [
            "id",
            "indicator_code",
            "indicator_name",
            "component",
            "component_display",
            "observed_value",
            "benchmark_value",
            "financial_allocation",
            "sensitivity",
            "performance_gap",
            "stress_value",
            "weighted_lcu_bn",
            "share_weighted_percent",
        ]
        read_only_fields = fields

    def get_component_display(self, obj):
        return obj.get_component_display()


class ComponentResultSerializer(serializers.ModelSerializer):
    """Serializer for ComponentResult model."""

    component_display = serializers.SerializerMethodField()

    class Meta:
        model = ComponentResult
        fields = [
            "id",
            "component",
            "component_display",
            "weight",
            "avg_performance_gap",
            "component_stress",
            "weighted_stress",
            "priority_level",
            "budget_lcu_bn",
            "budget_share_percent",
            "optimal_allocation_usd",
            "allocation_gap_usd",
            "indicators_count",
        ]
        read_only_fields = fields

    def get_component_display(self, obj):
        return obj.get_component_display()


class AssessmentResultSerializer(serializers.ModelSerializer):
    """Serializer for AssessmentResult model."""

    component_results = ComponentResultSerializer(many=True, read_only=True)
    indicator_results = IndicatorResultSerializer(many=True, read_only=True)
    computed_by_username = serializers.CharField(
        source="computed_by.username", read_only=True, allow_null=True
    )

    class Meta:
        model = AssessmentResult
        fields = [
            "id",
            "fiscal_year",
            "assessment_name",
            "weighting_method",
            "scenario",
            "fsfsi_score",
            "stress_level",
            "fsfsi_optimal",
            "efficiency_index",
            "gap_ratio",
            "total_budget_lcu_bn",
            "total_budget_usd",
            "indicators_count",
            "components_count",
            "result_json",
            "computed_at",
            "computing_time_ms",
            "computed_by_username",
            "component_results",
            "indicator_results",
        ]
        read_only_fields = fields


class AssessmentResultListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing assessments."""

    class Meta:
        model = AssessmentResult
        fields = [
            "id",
            "fiscal_year",
            "assessment_name",
            "weighting_method",
            "scenario",
            "fsfsi_score",
            "stress_level",
            "components_count",
            "indicators_count",
            "computed_at",
        ]
        read_only_fields = fields


class AssessmentHistorySerializer(serializers.ModelSerializer):
    """Serializer for AssessmentHistory model."""

    class Meta:
        model = AssessmentHistory
        fields = [
            "id",
            "fiscal_year",
            "fsfsi_score",
            "stress_level",
            "component_scores",
            "total_budget_lcu_bn",
            "yoy_change",
            "yoy_change_percent",
            "created_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Dashboard/Summary Serializers
# ---------------------------------------------------------------------------


class ComponentSummarySerializer(serializers.Serializer):
    """Summary of a component for dashboard display."""

    component = serializers.CharField()
    component_display = serializers.CharField()
    stress = serializers.DecimalField(max_digits=8, decimal_places=4)
    weight = serializers.DecimalField(max_digits=8, decimal_places=4)
    budget_lcu_bn = serializers.DecimalField(max_digits=15, decimal_places=4)
    budget_share_percent = serializers.DecimalField(max_digits=8, decimal_places=4)
    indicator_count = serializers.IntegerField()
    priority_level = serializers.CharField()


class DashboardSummarySerializer(serializers.Serializer):
    """Dashboard summary data."""

    overall_fsfsi = serializers.DecimalField(max_digits=8, decimal_places=4)
    stress_level = serializers.CharField()
    fiscal_year = serializers.IntegerField()
    total_budget_lcu_bn = serializers.DecimalField(max_digits=15, decimal_places=4)
    components = ComponentSummarySerializer(many=True)
    top_priorities = ActionPriorityOutputSerializer(many=True)
    efficiency_index = serializers.DecimalField(max_digits=8, decimal_places=4)
    yoy_change_percent = serializers.DecimalField(
        max_digits=8, decimal_places=4, allow_null=True
    )
