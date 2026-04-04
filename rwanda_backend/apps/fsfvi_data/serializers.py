"""Serializers for FSFVI indicator data entry."""

from decimal import Decimal
from rest_framework import serializers
from .models import Indicator, IndicatorData, IndicatorComponent


class IndicatorSerializer(serializers.ModelSerializer):
    """Indicator definition (37 indicators)."""

    component_display = serializers.SerializerMethodField()

    class Meta:
        model = Indicator
        fields = [
            "id", "code", "name", "component", "component_display",
            "description", "unit", "higher_is_better",
            "default_sensitivity", "display_order", "is_active",
        ]
        read_only_fields = fields

    def get_component_display(self, obj):
        return dict(IndicatorComponent.choices).get(obj.component, obj.component)


class IndicatorDataSerializer(serializers.ModelSerializer):
    """Full indicator data record."""

    indicator_code = serializers.CharField(source="indicator.code", read_only=True)
    indicator_name = serializers.CharField(source="indicator.name", read_only=True)
    component = serializers.CharField(source="indicator.component", read_only=True)
    component_display = serializers.SerializerMethodField()
    higher_is_better = serializers.BooleanField(source="indicator.higher_is_better", read_only=True)
    unit = serializers.CharField(source="indicator.unit", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, allow_null=True)

    class Meta:
        model = IndicatorData
        fields = [
            "id", "indicator_id", "indicator_code", "indicator_name",
            "component", "component_display", "higher_is_better", "unit",
            "fiscal_year", "records_count",
            "gross_lcu_bn", "weighted_lcu_bn", "share_weighted_percent",
            "observed_value", "benchmark_value", "benchmark_used_type",
            "financial_allocation_usd", "sensitivity_parameter",
            "performance_gap", "stress_value",
            "status", "created_by_username", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "indicator_code", "indicator_name", "component", "component_display",
            "higher_is_better", "unit", "performance_gap", "stress_value",
            "created_by_username", "created_at", "updated_at",
        ]

    def get_component_display(self, obj):
        return dict(IndicatorComponent.choices).get(obj.indicator.component, obj.indicator.component)


class IndicatorDataInputSerializer(serializers.Serializer):
    """Input for creating/updating indicator data for a fiscal year."""

    indicator_id = serializers.UUIDField()
    fiscal_year = serializers.IntegerField(min_value=2015, max_value=2050)
    records_count = serializers.IntegerField(min_value=0, default=0, required=False)
    gross_lcu_bn = serializers.DecimalField(
        max_digits=15, decimal_places=4, min_value=Decimal("0")
    )
    weighted_lcu_bn = serializers.DecimalField(
        max_digits=15, decimal_places=4, min_value=Decimal("0")
    )
    share_weighted_percent = serializers.DecimalField(
        max_digits=8,
        decimal_places=4,
        min_value=Decimal("0"),
        max_value=Decimal("100"),
        required=False,
    )
    observed_value = serializers.DecimalField(max_digits=15, decimal_places=4, allow_null=True, required=False)
    benchmark_value = serializers.DecimalField(max_digits=15, decimal_places=4, allow_null=True, required=False)
    benchmark_used_type = serializers.CharField(max_length=100, allow_blank=True, required=False)
    financial_allocation_usd = serializers.DecimalField(max_digits=18, decimal_places=2, allow_null=True, required=False)
    sensitivity_parameter = serializers.DecimalField(max_digits=10, decimal_places=6, allow_null=True, required=False)


class BulkIndicatorDataInputSerializer(serializers.Serializer):
    """Bulk input for saving multiple indicator data records for a fiscal year."""

    fiscal_year = serializers.IntegerField(min_value=2015, max_value=2050)
    indicators = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of indicator data objects with indicator_id, gross_lcu_bn, weighted_lcu_bn, observed_value, benchmark_value"
    )


class FiscalYearSummarySerializer(serializers.Serializer):
    """Summary of indicator data for a fiscal year."""

    fiscal_year = serializers.IntegerField()
    total_indicators = serializers.IntegerField()
    indicators_with_data = serializers.IntegerField()
    total_gross_lcu_bn = serializers.DecimalField(max_digits=15, decimal_places=4)
    total_weighted_lcu_bn = serializers.DecimalField(max_digits=15, decimal_places=4)
    status_counts = serializers.DictField(child=serializers.IntegerField())
    components_summary = serializers.ListField(
        child=serializers.DictField()
    )
