"""Planning serializers."""

from rest_framework import serializers

from .models import SavedStrategicPlan


class SavePlanRequestSerializer(serializers.Serializer):
    """Input for saving a strategic plan."""
    assessment_id = serializers.UUIDField()
    plan_name = serializers.CharField(max_length=255, required=False, default="")
    planning_years = serializers.IntegerField(min_value=1, max_value=15)
    target_fsfvi = serializers.FloatField(min_value=0.001, max_value=1.0)
    target_reduction_pct = serializers.FloatField(min_value=1, max_value=99)
    yearly_budget_growth_rate = serializers.FloatField(min_value=0, max_value=0.50)
    target_curve = serializers.ChoiceField(
        choices=["smoothstep", "linear", "frontloaded"], default="smoothstep"
    )


class SavedPlanSerializer(serializers.ModelSerializer):
    """Full serializer for saved plans (includes plan_json)."""
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True, allow_null=True
    )

    class Meta:
        model = SavedStrategicPlan
        fields = [
            "id", "assessment_id", "fiscal_year", "plan_name", "is_active",
            "planning_years", "target_fsfvi", "target_reduction_pct",
            "yearly_budget_growth_rate", "target_curve",
            "baseline_fsfsi", "final_projected_fsfsi", "total_additional_investment",
            "plan_json", "created_at", "updated_at", "created_by_username",
        ]
        read_only_fields = fields


class SavedPlanExcerptSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dashboard display (no plan_json)."""

    class Meta:
        model = SavedStrategicPlan
        fields = [
            "id", "fiscal_year", "plan_name", "is_active",
            "planning_years", "target_fsfvi", "baseline_fsfsi",
            "final_projected_fsfsi", "total_additional_investment",
            "target_reduction_pct", "yearly_budget_growth_rate",
            "created_at",
        ]
        read_only_fields = fields
