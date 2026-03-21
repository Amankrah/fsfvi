"""Planning serializers."""

from rest_framework import serializers

from .models import (
    PlanYearActual,
    SavedStrategicPlan,
    PSTA5Pillar,
    PSTA5KPI,
    PSTA5ComponentMapping,
    PSTA5KPIComponentMapping,
    PSTA5AnnualTarget,
    PSTA5Progress,
)


class SavePlanRequestSerializer(serializers.Serializer):
    """Input for saving a strategic plan."""
    assessment_id = serializers.UUIDField()
    plan_name = serializers.CharField(max_length=255, required=True)
    planning_years = serializers.IntegerField(min_value=1, max_value=15)
    target_fsfvi = serializers.FloatField(min_value=0.001, max_value=1.0)
    target_reduction_pct = serializers.FloatField(min_value=1, max_value=99)
    yearly_budget_growth_rate = serializers.FloatField(min_value=0, max_value=0.50)
    target_curve = serializers.ChoiceField(
        choices=["smoothstep", "linear", "frontloaded"], default="smoothstep"
    )
    weighting_method = serializers.CharField(max_length=32, default="hybrid", required=False)
    scenario = serializers.CharField(max_length=64, default="normal_operations", required=False)
    planning_start_fiscal_year = serializers.IntegerField(
        min_value=1990, max_value=2100, required=False, allow_null=True
    )

    def validate_plan_name(self, value):
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("Plan name is required.")
        return v


class UpdateSavedPlanSerializer(serializers.Serializer):
    """Partial update for a saved plan (name and/or parameters — parameters trigger regeneration)."""

    plan_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    assessment_id = serializers.UUIDField(required=False)
    planning_years = serializers.IntegerField(min_value=1, max_value=15, required=False)
    target_fsfvi = serializers.FloatField(min_value=0.001, max_value=1.0, required=False)
    target_reduction_pct = serializers.FloatField(min_value=1, max_value=99, required=False)
    yearly_budget_growth_rate = serializers.FloatField(min_value=0, max_value=0.50, required=False)
    target_curve = serializers.ChoiceField(
        choices=["smoothstep", "linear", "frontloaded"], required=False
    )
    weighting_method = serializers.CharField(max_length=32, required=False)
    scenario = serializers.CharField(max_length=64, required=False)
    planning_start_fiscal_year = serializers.IntegerField(
        min_value=1990, max_value=2100, required=False, allow_null=True
    )

    def validate_plan_name(self, value):
        if value is None:
            return value
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("Plan name cannot be empty.")
        return v


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
            "weighting_method", "scenario",
            "baseline_fsfsi", "final_projected_fsfsi", "total_additional_investment",
            "plan_json", "created_at", "updated_at", "created_by_username",
        ]
        read_only_fields = fields


class SavedPlanSummarySerializer(serializers.ModelSerializer):
    """List view — same metadata as SavedPlanSerializer without plan_json (keeps payloads small)."""

    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True, allow_null=True
    )

    class Meta:
        model = SavedStrategicPlan
        fields = [
            "id",
            "assessment_id",
            "fiscal_year",
            "plan_name",
            "is_active",
            "planning_years",
            "target_fsfvi",
            "target_reduction_pct",
            "yearly_budget_growth_rate",
            "target_curve",
            "weighting_method",
            "scenario",
            "baseline_fsfsi",
            "final_projected_fsfsi",
            "total_additional_investment",
            "created_at",
            "updated_at",
            "created_by_username",
        ]
        read_only_fields = fields


class PlanReferenceSnapshotSerializer(serializers.Serializer):
    """Optimal-plan cumulative FSFSI targets for one horizon year (from plan JSON)."""

    projected_cumulative_fsfsi = serializers.FloatField()
    year_target_fsfvi = serializers.FloatField()
    recommended_allocations = serializers.DictField(
        child=serializers.FloatField(),
        required=False,
    )
    plan_total_budget_bn = serializers.FloatField(required=False, allow_null=True, min_value=0)
    planning_weighting_method = serializers.CharField(max_length=32, required=False, allow_blank=True)
    planning_scenario = serializers.CharField(max_length=64, required=False, allow_blank=True)


class AllocationSimulateSerializer(serializers.Serializer):
    """POST body for /planning/<assessment_id>/simulate-allocation/."""

    plan_year = serializers.IntegerField(min_value=1, max_value=20)
    total_budget_bn = serializers.FloatField(min_value=0)
    component_shares_pct = serializers.DictField(child=serializers.FloatField(min_value=0))
    weighting_method = serializers.CharField(default="hybrid", required=False)
    scenario = serializers.CharField(default="normal_operations", required=False)
    prior_system_cumulative = serializers.FloatField(required=False, allow_null=True)
    prior_component_cumulative = serializers.DictField(
        child=serializers.FloatField(),
        required=False,
    )
    plan_reference = PlanReferenceSnapshotSerializer(required=False)


class SavedPlanExcerptSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dashboard display (no plan_json)."""

    class Meta:
        model = SavedStrategicPlan
        fields = [
            "id", "fiscal_year", "plan_name", "is_active",
            "planning_years", "target_fsfvi", "baseline_fsfsi",
            "final_projected_fsfsi", "total_additional_investment",
            "target_reduction_pct", "yearly_budget_growth_rate",
            "weighting_method", "scenario",
            "created_at",
        ]
        read_only_fields = fields


# =============================================================================
# Plan Year Actuals — Record actual budget allocations per year
# =============================================================================


class SaveYearActualRequestSerializer(serializers.Serializer):
    """Input for saving actual allocation for a plan year."""

    plan_year = serializers.IntegerField(min_value=1, max_value=20)
    fiscal_year = serializers.IntegerField(min_value=1990, max_value=2100)
    total_budget_bn = serializers.FloatField(min_value=0)
    component_allocations_bn = serializers.DictField(
        child=serializers.FloatField(min_value=0),
        help_text="Component allocations in billions LCU: {'markets': 379.42, ...}",
    )
    # Optional: pre-computed simulation results (if not provided, backend will compute)
    simulated_cumulative_fsfsi = serializers.FloatField(required=False, allow_null=True)
    simulated_component_stress = serializers.DictField(
        child=serializers.FloatField(), required=False
    )
    delta_vs_plan_fsfsi = serializers.FloatField(required=False, allow_null=True)


class PlanYearActualSerializer(serializers.ModelSerializer):
    """Full serializer for plan year actuals."""

    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True, allow_null=True
    )

    class Meta:
        model = PlanYearActual
        fields = [
            "id",
            "plan_id",
            "plan_year",
            "fiscal_year",
            "total_budget_bn",
            "component_allocations_bn",
            "simulated_cumulative_fsfsi",
            "simulated_component_stress",
            "delta_vs_plan_fsfsi",
            "created_at",
            "updated_at",
            "created_by_username",
        ]
        read_only_fields = fields


class PlanYearActualSummarySerializer(serializers.ModelSerializer):
    """Summary serializer for listing actuals (excludes large JSON fields)."""

    class Meta:
        model = PlanYearActual
        fields = [
            "id",
            "plan_year",
            "fiscal_year",
            "total_budget_bn",
            "simulated_cumulative_fsfsi",
            "delta_vs_plan_fsfsi",
            "updated_at",
        ]
        read_only_fields = fields


# =============================================================================
# PSTA-5 Alignment Tracking Serializers
# =============================================================================


class PSTA5PillarSerializer(serializers.ModelSerializer):
    """PSTA-5 Strategic Pillar."""

    kpi_count = serializers.SerializerMethodField()

    class Meta:
        model = PSTA5Pillar
        fields = [
            "id", "code", "name", "name_fr", "name_rw",
            "description", "weight", "sort_order", "kpi_count",
        ]
        read_only_fields = fields

    def get_kpi_count(self, obj):
        return obj.kpis.filter(is_active=True).count()


class PSTA5KPIComponentMappingSerializer(serializers.ModelSerializer):
    """Mapping between PSTA-5 KPI and its driving FSFSI component(s)."""

    kpi_code = serializers.CharField(source="kpi.code", read_only=True)

    class Meta:
        model = PSTA5KPIComponentMapping
        fields = ["kpi_id", "kpi_code", "component", "weight"]
        read_only_fields = fields


class PSTA5KPISerializer(serializers.ModelSerializer):
    """PSTA-5 Key Performance Indicator."""

    pillar_code = serializers.CharField(source="pillar.code", read_only=True)
    current_value = serializers.SerializerMethodField()
    current_year = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()
    driving_components = serializers.SerializerMethodField()

    class Meta:
        model = PSTA5KPI
        fields = [
            "id", "pillar_id", "pillar_code", "code", "name",
            "name_fr", "name_rw", "description", "unit",
            "baseline_year", "baseline_value",
            "target_year", "target_value",
            "higher_is_better", "weight", "sort_order",
            "current_value", "current_year", "progress_percent",
            "driving_components",
        ]
        read_only_fields = fields

    def get_current_value(self, obj):
        latest = obj.progress_records.order_by("-fiscal_year").first()
        return float(latest.actual_value) if latest else None

    def get_current_year(self, obj):
        latest = obj.progress_records.order_by("-fiscal_year").first()
        return latest.fiscal_year if latest else None

    def get_progress_percent(self, obj):
        latest = obj.progress_records.order_by("-fiscal_year").first()
        if latest:
            return round(obj.progress_percent(latest.actual_value), 1)
        return None

    def get_driving_components(self, obj):
        """Return list of components driving this KPI with their weights."""
        return [
            {"component": m.component, "weight": float(m.weight)}
            for m in obj.component_mappings.all()
        ]


class PSTA5ComponentMappingSerializer(serializers.ModelSerializer):
    """Mapping between FSFSI component and PSTA-5 pillar."""

    pillar_code = serializers.CharField(source="pillar.code", read_only=True)

    class Meta:
        model = PSTA5ComponentMapping
        fields = [
            "pillar_id", "pillar_code", "component",
            "contribution_weight", "indicator_codes",
        ]
        read_only_fields = fields


class PSTA5AnnualTargetSerializer(serializers.ModelSerializer):
    """Annual target for a KPI."""

    kpi_code = serializers.CharField(source="kpi.code", read_only=True)

    class Meta:
        model = PSTA5AnnualTarget
        fields = ["kpi_id", "kpi_code", "fiscal_year", "target_value", "notes"]
        read_only_fields = fields


class PSTA5ProgressSerializer(serializers.ModelSerializer):
    """Progress record for a KPI."""

    kpi_code = serializers.CharField(source="kpi.code", read_only=True)
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = PSTA5Progress
        fields = [
            "id", "kpi_id", "kpi_code", "fiscal_year",
            "actual_value", "progress_percent",
            "source", "notes", "recorded_at",
        ]
        read_only_fields = fields

    def get_progress_percent(self, obj):
        return round(obj.progress_percent, 1)


class PSTA5ProgressInputSerializer(serializers.Serializer):
    """Input for recording KPI progress."""

    kpi_id = serializers.UUIDField()
    fiscal_year = serializers.IntegerField(min_value=2020, max_value=2035)
    actual_value = serializers.FloatField()
    source = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class PSTA5AlignmentSummarySerializer(serializers.Serializer):
    """PSTA-5 alignment summary for dashboard."""

    overall_score = serializers.FloatField()
    pillar_scores = serializers.ListField(
        child=serializers.DictField()
    )
    component_alignment = serializers.ListField(
        child=serializers.DictField()
    )
    kpis_at_risk = serializers.ListField(
        child=serializers.DictField()
    )
    data_year = serializers.IntegerField()


class PSTA5TrackerDataSerializer(serializers.Serializer):
    """Full PSTA-5 tracker data."""

    pillars = PSTA5PillarSerializer(many=True)
    kpis = PSTA5KPISerializer(many=True)
    component_mappings = PSTA5ComponentMappingSerializer(many=True)
    annual_targets = PSTA5AnnualTargetSerializer(many=True)
    progress = PSTA5ProgressSerializer(many=True)
    alignment_summary = PSTA5AlignmentSummarySerializer()
