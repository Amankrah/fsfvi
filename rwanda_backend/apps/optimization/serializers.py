"""
Optimization Serializers for Rwanda FSFSI API.

Provides serialization for optimization requests and responses.
"""

from rest_framework import serializers

from apps.fsfvi_data.models import IndicatorComponent

from .models import (
    ComponentGap,
    ComponentOptimization,
    GapAnalysisResult,
    OptimizationResult,
)


# =============================================================================
# INPUT SERIALIZERS
# =============================================================================


class ComponentInputSerializer(serializers.Serializer):
    """Input data for a component in optimization requests."""

    component_type = serializers.ChoiceField(
        choices=[c[0] for c in IndicatorComponent.choices],
        help_text="Component type (e.g., markets, crop_production)",
    )
    observed_value = serializers.FloatField(
        min_value=0,
        help_text="Current observed performance value",
    )
    benchmark_value = serializers.FloatField(
        min_value=0,
        help_text="Target benchmark value",
    )
    financial_allocation_usd = serializers.FloatField(
        min_value=0,
        help_text="Current financial allocation in USD",
    )
    sensitivity_parameter = serializers.FloatField(
        required=False,
        default=0.001,
        help_text="Sensitivity parameter (alpha). Default: 0.001",
    )
    weight = serializers.FloatField(
        required=False,
        min_value=0,
        max_value=1,
        help_text="Component weight (0-1). If not provided, equal weights used.",
    )
    name = serializers.CharField(
        required=False,
        max_length=255,
        help_text="Optional component name",
    )


class EfficiencyRequestSerializer(serializers.Serializer):
    """Request for efficiency analysis."""

    components = ComponentInputSerializer(many=True, min_length=1)


class ReallocationRequestSerializer(serializers.Serializer):
    """Request for reallocation plan."""

    components = ComponentInputSerializer(many=True, min_length=1)
    target_budget = serializers.FloatField(
        required=False,
        min_value=0,
        help_text="Target total budget in USD. If not provided, uses current total.",
    )


class RoiRequestSerializer(serializers.Serializer):
    """Request for ROI analysis."""

    components = ComponentInputSerializer(many=True, min_length=1)


class GapAnalysisRequestSerializer(serializers.Serializer):
    """Request for gap analysis."""

    components = ComponentInputSerializer(many=True, min_length=1)


class PeerInputSerializer(serializers.Serializer):
    """Input data for a peer country component."""

    country_code = serializers.CharField(max_length=10)
    country_name = serializers.CharField(max_length=100)
    component_type = serializers.ChoiceField(
        choices=[c[0] for c in IndicatorComponent.choices],
    )
    observed_value = serializers.FloatField(min_value=0)
    benchmark_value = serializers.FloatField(min_value=0)
    financial_allocation_usd = serializers.FloatField(min_value=0)


class PeerComparisonRequestSerializer(serializers.Serializer):
    """Request for peer comparison."""

    rwanda = ComponentInputSerializer(many=True, min_length=1)
    peers = PeerInputSerializer(many=True, min_length=1)


class TargetRecommendationRequestSerializer(serializers.Serializer):
    """Request for target recommendations."""

    components = ComponentInputSerializer(many=True, min_length=1)
    target_year = serializers.IntegerField(
        required=False,
        default=2029,
        min_value=2025,
        max_value=2050,
        help_text="Target year for gap closure (default: 2029)",
    )
    current_year = serializers.IntegerField(
        required=False,
        default=2025,
        min_value=2020,
        max_value=2030,
        help_text="Current year (default: 2025)",
    )


# =============================================================================
# OUTPUT SERIALIZERS (for Rust engine results)
# =============================================================================


class ComponentEfficiencyOutputSerializer(serializers.Serializer):
    """Output for component efficiency analysis."""

    component_type = serializers.CharField()
    current_allocation_usd = serializers.FloatField()
    optimal_allocation_usd = serializers.FloatField()
    allocation_gap_usd = serializers.FloatField()
    allocation_gap_pct = serializers.FloatField()
    current_stress = serializers.FloatField()
    optimal_stress = serializers.FloatField()
    stress_reduction = serializers.FloatField()
    is_underfunded = serializers.BooleanField()


class EfficiencyAnalysisOutputSerializer(serializers.Serializer):
    """Output for efficiency analysis."""

    current_fsfsi = serializers.FloatField()
    optimal_fsfsi = serializers.FloatField()
    efficiency_index = serializers.FloatField()
    waste_ratio = serializers.FloatField()
    components = ComponentEfficiencyOutputSerializer(many=True)
    total_budget_usd = serializers.FloatField()
    computing_time_ms = serializers.IntegerField()


class ReallocationItemOutputSerializer(serializers.Serializer):
    """Output for reallocation item."""

    component_type = serializers.CharField()
    current_allocation_usd = serializers.FloatField()
    recommended_allocation_usd = serializers.FloatField()
    change_usd = serializers.FloatField()
    change_pct = serializers.FloatField()
    priority = serializers.IntegerField()
    projected_impact = serializers.CharField()


class ReallocationPlanOutputSerializer(serializers.Serializer):
    """Output for reallocation plan."""

    components = ReallocationItemOutputSerializer(many=True)
    current_fsfsi = serializers.FloatField()
    projected_fsfsi = serializers.FloatField()
    projected_improvement = serializers.FloatField()
    projected_improvement_pct = serializers.FloatField()
    total_budget_usd = serializers.FloatField()
    computing_time_ms = serializers.IntegerField()


class ComponentRoiOutputSerializer(serializers.Serializer):
    """Output for component ROI."""

    component_type = serializers.CharField()
    current_stress = serializers.FloatField()
    marginal_benefit = serializers.FloatField()
    roi_per_million = serializers.FloatField()
    rank = serializers.IntegerField()


class RoiAnalysisOutputSerializer(serializers.Serializer):
    """Output for ROI analysis."""

    components = ComponentRoiOutputSerializer(many=True)
    best_roi_component = serializers.CharField()
    worst_roi_component = serializers.CharField()
    total_budget_usd = serializers.FloatField()
    computing_time_ms = serializers.IntegerField()


class GapDistributionOutputSerializer(serializers.Serializer):
    """Output for gap distribution."""

    on_track = serializers.IntegerField()
    behind = serializers.IntegerField()
    critical = serializers.IntegerField()


class ComponentGapOutputSerializer(serializers.Serializer):
    """Output for component gap."""

    component_type = serializers.CharField()
    observed_value = serializers.FloatField()
    benchmark_value = serializers.FloatField()
    gap = serializers.FloatField()
    gap_pct = serializers.FloatField()
    stress = serializers.FloatField()
    rank = serializers.IntegerField()
    status = serializers.CharField()
    recommendation = serializers.CharField()


class GapAnalysisOutputSerializer(serializers.Serializer):
    """Output for gap analysis."""

    component_gaps = ComponentGapOutputSerializer(many=True)
    average_gap = serializers.FloatField()
    worst_gap_component = serializers.CharField()
    best_gap_component = serializers.CharField()
    gap_distribution = GapDistributionOutputSerializer()
    computing_time_ms = serializers.IntegerField()


class PeerScoreOutputSerializer(serializers.Serializer):
    """Output for peer score."""

    country_code = serializers.CharField()
    country_name = serializers.CharField()
    average_gap = serializers.FloatField()
    rank = serializers.IntegerField()


class ComponentRankingOutputSerializer(serializers.Serializer):
    """Output for component ranking in peer comparison."""

    component_type = serializers.CharField()
    rwanda_value = serializers.FloatField()
    rwanda_gap = serializers.FloatField()
    peer_average = serializers.FloatField()
    rwanda_rank = serializers.IntegerField()
    total_peers = serializers.IntegerField()
    position = serializers.CharField()


class PeerComparisonOutputSerializer(serializers.Serializer):
    """Output for peer comparison."""

    rwanda_rank = serializers.IntegerField()
    total_countries = serializers.IntegerField()
    peer_scores = PeerScoreOutputSerializer(many=True)
    component_rankings = ComponentRankingOutputSerializer(many=True)
    computing_time_ms = serializers.IntegerField()


class TargetRecommendationOutputSerializer(serializers.Serializer):
    """Output for target recommendation."""

    component_type = serializers.CharField()
    current_value = serializers.FloatField()
    benchmark_value = serializers.FloatField()
    recommended_target = serializers.FloatField()
    current_gap = serializers.FloatField()
    target_gap = serializers.FloatField()
    annual_improvement_needed = serializers.FloatField()
    priority = serializers.CharField()


class TargetRecommendationsOutputSerializer(serializers.Serializer):
    """Output for target recommendations."""

    recommendations = TargetRecommendationOutputSerializer(many=True)
    target_year = serializers.IntegerField()
    years_to_target = serializers.IntegerField()
    computing_time_ms = serializers.IntegerField()


# =============================================================================
# MODEL SERIALIZERS
# =============================================================================


class ComponentOptimizationSerializer(serializers.ModelSerializer):
    """Serializer for ComponentOptimization model."""

    component_display = serializers.SerializerMethodField()

    class Meta:
        model = ComponentOptimization
        fields = [
            "component",
            "component_display",
            "current_allocation_usd",
            "optimal_allocation_usd",
            "allocation_gap_usd",
            "allocation_gap_pct",
            "current_stress",
            "optimal_stress",
            "stress_reduction",
            "roi_per_million",
            "roi_rank",
            "is_underfunded",
            "priority",
            "recommendation",
        ]

    def get_component_display(self, obj):
        return obj.get_component_display()


class OptimizationResultSerializer(serializers.ModelSerializer):
    """Serializer for OptimizationResult model."""

    component_optimizations = ComponentOptimizationSerializer(many=True, read_only=True)

    class Meta:
        model = OptimizationResult
        fields = [
            "id",
            "fiscal_year",
            "analysis_type",
            "total_budget_lcu_bn",
            "total_budget_usd",
            "current_fsfsi",
            "optimal_fsfsi",
            "efficiency_index",
            "improvement_potential",
            "result_json",
            "computed_at",
            "computing_time_ms",
            "component_optimizations",
        ]


class ComponentGapSerializer(serializers.ModelSerializer):
    """Serializer for ComponentGap model."""

    component_display = serializers.SerializerMethodField()

    class Meta:
        model = ComponentGap
        fields = [
            "component",
            "component_display",
            "observed_value",
            "benchmark_value",
            "gap",
            "gap_pct",
            "stress",
            "status",
            "rank",
            "recommendation",
            "recommended_target",
            "target_gap",
            "annual_improvement_needed",
            "priority",
        ]

    def get_component_display(self, obj):
        return obj.get_component_display()


class GapAnalysisResultSerializer(serializers.ModelSerializer):
    """Serializer for GapAnalysisResult model."""

    component_gaps = ComponentGapSerializer(many=True, read_only=True)

    class Meta:
        model = GapAnalysisResult
        fields = [
            "id",
            "fiscal_year",
            "analysis_type",
            "average_gap",
            "worst_gap_component",
            "best_gap_component",
            "on_track_count",
            "behind_count",
            "critical_count",
            "rwanda_rank",
            "total_peers",
            "target_year",
            "years_to_target",
            "result_json",
            "computed_at",
            "computing_time_ms",
            "component_gaps",
        ]
