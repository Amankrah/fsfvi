from __future__ import annotations

from pydantic import BaseModel, Field, validator
from typing import Dict, List, Optional, Union
from datetime import date, datetime
from decimal import Decimal
import uuid


class FoodSystemComponentData(BaseModel):
    """Schema for food system component data based on 3FS methodology"""
    component_id: str
    component_name: str
    component_type: str = Field(..., description="Type: agricultural_development, infrastructure, etc.")
    weight: float = Field(..., ge=0, le=1, description="Component weight ωᵢ (0-1)")
    sensitivity_parameter: float = Field(default=1.0, ge=0, description="Sensitivity parameter αᵢ for financial efficiency")
    
    class Config:
        json_encoders = {
            Decimal: float
        }


class PerformanceMetricData(BaseModel):
    """Schema for performance metric data"""
    metric_id: str
    metric_name: str
    metric_code: str
    category: Optional[str] = Field(None, description="Metric category: access, availability, utilization, etc.")
    observed_value: float = Field(..., description="Observed performance value xᵢ")
    unit: Optional[str] = Field(None, description="Unit of measurement")
    data_quality_score: float = Field(default=1.0, ge=0, le=1, description="Data quality indicator")
    measurement_date: date
    data_source: Optional[str] = None


class BenchmarkData(BaseModel):
    """Schema for benchmark data"""
    benchmark_id: str
    metric_code: str
    benchmark_value: float = Field(..., description="Benchmark performance value x̄ᵢ")
    benchmark_type: str = Field(default="global_best", description="Type: global_best, regional_average, etc.")
    applicable_region: Optional[str] = Field(None, description="Specific region (null = global)")
    data_source: Optional[str] = None


class FinancialAllocationData(BaseModel):
    """Schema for financial allocation data"""
    allocation_id: str
    component_id: str
    amount: float = Field(..., ge=0, description="Financial allocation amount fᵢ")
    currency: str = Field(default="USD", description="Currency code")
    allocation_type: str = Field(..., description="Type: domestic_public, international_development, etc.")
    expenditure_type: str = Field(default="specific", description="specific or supportive expenditure")
    fiscal_year: int
    quarter: Optional[int] = Field(None, ge=1, le=4)
    funding_source: Optional[str] = None


class FoodSystemData(BaseModel):
    """Schema for comprehensive food system data input"""
    food_system_id: str
    food_system_name: str
    food_system_code: str
    country: Optional[str] = None
    region: Optional[str] = None
    administrative_level: str = Field(default="national", description="national, subnational, local, cross_border")
    
    # Component and metric data
    components: List[FoodSystemComponentData]
    performance_metrics: List[PerformanceMetricData]
    benchmarks: List[BenchmarkData]
    financial_allocations: List[FinancialAllocationData]
    
    # Analysis parameters
    fiscal_year: int
    total_budget: Optional[float] = Field(None, ge=0, description="Total budget constraint")
    measurement_date: date

    @validator('components')
    def validate_weights(cls, v):
        total_weight = sum(comp.weight for comp in v)
        if not (0.99999 <= total_weight <= 1.00001):  # Allow for small floating point errors
            raise ValueError(f'Component weights must sum to 1.0, got {total_weight}')
        return v

    @validator('performance_metrics')
    def validate_metrics_components_match(cls, v, values):
        if 'components' in values:
            component_ids = {comp.component_id for comp in values['components']}
            metric_component_ids = {metric.metric_id.split('_')[0] for metric in v}  # Assuming metric_id format
            # Additional validation logic can be added here
        return v


class PerformanceGapResult(BaseModel):
    """Schema for performance gap calculation results"""
    component_id: str
    component_name: str
    
    # Input values
    observed_value: float
    benchmark_value: float
    financial_allocation: float
    weight: float
    sensitivity_parameter: float
    
    # Gap calculations (Equation 1: δᵢ = |xᵢ-x̄ᵢ|/xᵢ)
    absolute_gap: float = Field(..., description="Absolute difference |xᵢ-x̄ᵢ|")
    relative_gap: float = Field(..., description="Relative gap as percentage")
    normalized_gap: float = Field(..., description="Normalized gap δᵢ")
    
    # Vulnerability calculations (Equation 2: νᵢ(fᵢ) = δᵢ·1/(1+αᵢfᵢ))
    vulnerability_score: float = Field(..., description="Component vulnerability score νᵢ(fᵢ)")
    weighted_contribution: float = Field(..., description="Weighted vulnerability ωᵢ·νᵢ(fᵢ)")


class ComponentVulnerabilityResult(BaseModel):
    """Schema for component vulnerability calculation results"""
    component_id: str
    component_name: str
    component_type: str
    
    # Financial allocation context
    financial_allocation: float
    allocation_type: str
    fiscal_year: int
    
    # Performance gap context
    performance_gaps: List[PerformanceGapResult]
    
    # Vulnerability calculation (Equation 2: νᵢ(fᵢ) = δᵢ·1/(1+αᵢfᵢ))
    vulnerability_score: float = Field(..., description="Component vulnerability score νᵢ(fᵢ)")
    weighted_contribution: float = Field(..., description="Weighted vulnerability ωᵢ·νᵢ(fᵢ)")
    
    # Risk assessment
    risk_level: str = Field(..., description="low, medium, high, critical")


class ComponentData(BaseModel):
    """Schema for component data as expected by the service layer"""
    component_id: str
    component_name: str
    component_type: str
    observed_value: float
    benchmark_value: float
    weight: Optional[float] = 0.0
    sensitivity_parameter: float
    financial_allocation: float
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v) if v is not None else None
        }


class RegionData(BaseModel):
    """Schema for region data as expected by the service layer"""
    region_id: str
    region_name: str
    components: List["ComponentPerformance"]
    
    # Optional additional fields
    country: Optional[str] = None
    administrative_level: str = Field(default="national", description="national, subnational, local, cross_border")
    fiscal_year: int = Field(default=2024)
    total_budget: Optional[float] = Field(None, ge=0, description="Total budget constraint")


class FSFVICalculationResult(BaseModel):
    """Schema for comprehensive FSFVI calculation results"""
    region_id: str
    region_name: str
    calculation_date: datetime
    fsfvi_score: float = Field(..., description="Overall FSFVI score")
    
    # Detailed breakdown
    component_results: List[PerformanceGapResult]
    
    # Summary statistics
    total_financial_allocation: float
    average_gap: float
    highest_gap_component: str = Field(..., description="Component with highest gap")
    lowest_gap_component: str = Field(..., description="Component with lowest gap")
    
    # Risk indicators
    risk_level: str = Field(..., description="Overall risk level: low, medium, high, critical")
    vulnerability_distribution: Dict[str, float] = Field(..., description="Vulnerability distribution by component")


class OptimizationConstraints(BaseModel):
    """Schema for optimization constraints based on 3FS methodology"""
    total_budget: float = Field(..., ge=0, description="Total budget constraint (Equation 4)")
    min_allocation_per_component: float = Field(default=0.0, ge=0, description="Minimum allocation per component")
    max_allocation_per_component: Optional[float] = Field(None, ge=0, description="Maximum allocation per component")
    
    # Component-specific constraints
    priority_component_types: Optional[List[str]] = Field(default=[], description="Priority component types")
    preserve_allocation_ratios: bool = Field(default=True, description="Preserve relative allocation ratios")
    preserve_relative_priorities: bool = Field(default=True, description="Maintain priority based on gaps (Equation 6)")
    
    # Allocation type constraints
    min_domestic_share: Optional[float] = Field(None, ge=0, le=1, description="Minimum domestic financing share")
    max_external_dependence: Optional[float] = Field(None, ge=0, le=1, description="Maximum external dependence")


class OptimizationRequest(BaseModel):
    """Schema for optimization analysis request"""
    food_system_data: FoodSystemData
    constraints: OptimizationConstraints
    optimization_objective: str = Field(default="minimize_fsfvi", description="Optimization objective")
    solver_options: Dict[str, Union[str, float, int]] = Field(default_factory=dict)
    include_sensitivity_analysis: bool = Field(default=False, description="Include sensitivity analysis")


class OptimizationResult(BaseModel):
    """Schema for optimization results with gap analysis metrics"""
    food_system_id: str
    food_system_name: str
    optimization_date: datetime
    fiscal_year: int
    
    # Current state
    current_fsfvi: float
    current_allocations: Dict[str, Dict[str, float]]  # {component_id: {allocation_type: amount}}
    
    # Optimized state
    optimized_fsfvi: float
    optimized_allocations: Dict[str, Dict[str, float]]
    
    # Gap analysis metrics (Equations 8-10)
    gap_fsfvi: float = Field(..., description="Absolute FSFVI improvement")
    gap_ratio: float = Field(..., description="Percentage FSFVI improvement")
    efficiency_index: float = Field(..., description="Resource allocation efficiency")
    
    # Optimization details
    optimization_status: str
    solver_used: str
    solver_iterations: int
    convergence_time_seconds: float
    objective_value: float
    
    # Detailed recommendations
    reallocation_recommendations: List[Dict[str, Union[str, float]]]
    priority_actions: List[str]
    component_specific_recommendations: Dict[str, List[str]]
    
    # Sensitivity analysis (if requested)
    sensitivity_analysis: Optional[Dict[str, float]] = Field(None, description="Parameter sensitivity results")


class GapAnalysisRequest(BaseModel):
    """Schema for comprehensive gap analysis request"""
    food_system_data: FoodSystemData
    benchmark_types: List[str] = Field(default=["global_best"], description="Types of benchmarks to compare")
    include_peer_comparison: bool = Field(default=True, description="Include peer food system comparison")
    include_trend_analysis: bool = Field(default=True, description="Include historical trend analysis")
    include_scenario_analysis: bool = Field(default=False, description="Include scenario analysis")
    analysis_depth: str = Field(default="comprehensive", description="basic, standard, comprehensive")
    
    # Peer comparison parameters
    peer_selection_criteria: Optional[Dict[str, Union[str, float]]] = Field(None, description="Criteria for peer selection")
    max_peers: int = Field(default=5, ge=1, le=20, description="Maximum number of peer comparisons")


class PeerComparisonData(BaseModel):
    """Schema for peer food system comparison"""
    peer_food_system_id: str
    peer_food_system_name: str
    peer_country: Optional[str] = None
    peer_region: Optional[str] = None
    
    peer_fsfvi_score: float
    peer_component_vulnerabilities: Dict[str, float]
    peer_financial_allocations: Dict[str, float]
    
    similarity_score: float = Field(..., ge=0, le=1, description="Similarity to target food system")
    comparison_metrics: Dict[str, float] = Field(..., description="Detailed comparison metrics")


class TrendAnalysisData(BaseModel):
    """Schema for trend analysis"""
    component_id: str
    component_name: str
    component_type: str
    
    historical_data: List[Dict[str, Union[str, float]]]  # [{date, value, gap, allocation}]
    
    # Trend characteristics
    trend_direction: str = Field(..., description="improving, declining, stable, volatile")
    trend_magnitude: float = Field(..., description="Rate of change")
    trend_significance: float = Field(..., ge=0, le=1, description="Statistical significance")
    seasonality_detected: bool = Field(default=False, description="Whether seasonal patterns detected")
    
    # Forecasting
    projected_values: Optional[List[Dict[str, Union[str, float]]]] = Field(None, description="Projected future values")
    forecast_confidence: Optional[float] = Field(None, ge=0, le=1, description="Forecast confidence level")


class ScenarioAnalysisData(BaseModel):
    """Schema for scenario analysis"""
    scenario_name: str
    scenario_description: str
    
    # Scenario parameters
    budget_adjustment: float = Field(0.0, description="Budget change as percentage")
    component_weights_adjustment: Dict[str, float] = Field(default_factory=dict, description="Weight adjustments")
    external_shock_factors: Dict[str, float] = Field(default_factory=dict, description="External shock impacts")
    
    # Scenario results
    projected_fsfvi: float
    projected_component_vulnerabilities: Dict[str, float]
    projected_risk_level: str
    
    # Risk assessment
    scenario_probability: float = Field(..., ge=0, le=1, description="Scenario probability")
    impact_severity: str = Field(..., description="low, medium, high, critical")


class GapAnalysisResult(BaseModel):
    """Schema for comprehensive gap analysis results"""
    food_system_id: str
    food_system_name: str
    analysis_date: datetime
    analysis_period_start: date
    analysis_period_end: date
    fiscal_year: int
    
    # Current performance
    current_fsfvi_result: FSFVICalculationResult
    
    # Benchmark comparisons
    benchmark_comparisons: Dict[str, FSFVICalculationResult]
    
    # Peer analysis
    peer_comparisons: List[PeerComparisonData]
    peer_ranking: int
    peer_percentile: float
    best_practice_insights: List[str]
    
    # Trend analysis
    trend_analysis: List[TrendAnalysisData]
    overall_trend: str
    trend_summary: Dict[str, Union[str, float]]
    
    # Scenario analysis (if requested)
    scenario_analysis: Optional[List[ScenarioAnalysisData]] = None
    
    # Priority analysis
    critical_gaps: List[str] = Field(..., description="Components with critical performance gaps")
    improvement_opportunities: List[Dict[str, Union[str, float]]]
    quick_wins: List[str] = Field(..., description="High impact, low effort improvements")
    
    # Strategic insights
    strategic_recommendations: List[str]
    tactical_recommendations: List[str]
    resource_recommendations: List[Dict[str, Union[str, float]]]
    
    # Risk assessment
    risk_factors: List[str]
    risk_mitigation_strategies: List[str]
    vulnerability_forecast: Dict[str, float]
    
    # Financial recommendations
    optimal_budget_allocation: Optional[Dict[str, float]] = None
    funding_gap_analysis: Optional[Dict[str, float]] = None
    investment_priorities: List[Dict[str, Union[str, float]]]


class BatchCalculationRequest(BaseModel):
    """Schema for batch calculations across multiple food systems"""
    food_systems_data: List[FoodSystemData]
    calculation_type: str = Field(default="fsfvi", description="fsfvi, gap_analysis, optimization")
    parallel_processing: bool = Field(default=True, description="Enable parallel processing")
    save_results: bool = Field(default=True, description="Save results to database")
    
    # Common parameters for all calculations
    common_fiscal_year: Optional[int] = Field(None, description="Common fiscal year for all systems")
    common_benchmark_types: Optional[List[str]] = Field(None, description="Common benchmark types")


class BatchCalculationResult(BaseModel):
    """Schema for batch calculation results"""
    batch_id: str
    calculation_date: datetime
    calculation_type: str
    
    # Processing summary
    total_food_systems: int
    successful_calculations: int
    failed_calculations: int
    processing_time_seconds: float
    
    # Results
    results: List[Union[FSFVICalculationResult, GapAnalysisResult, OptimizationResult]]
    errors: List[Dict[str, str]]
    
    # Comparative analysis
    comparative_rankings: List[Dict[str, Union[str, float, int]]]
    regional_patterns: Dict[str, Dict[str, float]]
    summary_statistics: Dict[str, float]
    
    # Cross-system insights
    best_performers: List[Dict[str, Union[str, float]]]
    improvement_clusters: List[Dict[str, Union[str, List[str]]]]
    resource_efficiency_insights: Dict[str, float]


class CalculationStatus(BaseModel):
    """Schema for calculation status tracking"""
    calculation_id: str
    status: str = Field(..., description="pending, in_progress, completed, failed")
    progress: float = Field(default=0.0, ge=0, le=100, description="Progress percentage")
    current_step: Optional[str] = Field(None, description="Current processing step")
    estimated_completion: Optional[datetime] = None
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    
    # Additional context
    food_system_id: str
    calculation_type: str
    user_id: Optional[str] = None


class FoodSystemSummary(BaseModel):
    """Schema for food system summary information"""
    food_system_id: str
    food_system_name: str
    country: Optional[str] = None
    region: Optional[str] = None
    administrative_level: str
    
    # Latest metrics
    latest_fsfvi_score: Optional[float] = None
    latest_risk_level: Optional[str] = None
    latest_calculation_date: Optional[datetime] = None
    
    # Summary statistics
    total_components: int
    total_metrics: int
    total_budget: Optional[float] = None
    data_quality_average: Optional[float] = None
    
    # Trends
    fsfvi_trend: Optional[str] = None  # improving, declining, stable
    last_optimization_date: Optional[datetime] = None


class RegionalComparison(BaseModel):
    """Schema for regional/cross-system comparison"""
    comparison_id: str
    comparison_date: datetime
    comparison_scope: str = Field(..., description="national, regional, global")
    
    # Systems included
    food_systems: List[FoodSystemSummary]
    
    # Comparative metrics
    fsfvi_rankings: List[Dict[str, Union[str, float, int]]]
    component_performance_comparison: Dict[str, Dict[str, float]]
    resource_efficiency_comparison: Dict[str, float]
    
    # Regional patterns
    regional_averages: Dict[str, float]
    best_practices_by_component: Dict[str, Dict[str, Union[str, float]]]
    improvement_opportunities_by_region: Dict[str, List[str]]
    
    # Statistical analysis
    correlation_analysis: Dict[str, float]
    cluster_analysis: Optional[Dict[str, List[str]]] = None


# Simplified schemas that match Django service expectations and FastAPI main.py usage
class ComponentPerformance(BaseModel):
    """Simplified component performance input model - matches main.py usage"""
    component_id: str
    component_name: str = Field(default="", description="Component name (optional for API)")
    component_type: str = Field(..., description="Component type from 3FS methodology")
    observed_value: float = Field(..., gt=0, description="Observed performance value (xᵢ)")
    benchmark_value: float = Field(..., gt=0, description="Benchmark performance value (x̄ᵢ)")
    weight: float = Field(..., ge=0, le=1, description="Component weight (ωᵢ)")
    sensitivity_parameter: float = Field(..., ge=0, description="Sensitivity parameter (αᵢ)")
    financial_allocation: float = Field(..., ge=0, description="Financial allocation (fᵢ)")
    
    @validator('observed_value')
    def validate_observed_value(cls, v):
        if v <= 0:
            raise ValueError('Observed value must be positive')
        return v
    
    @validator('benchmark_value')
    def validate_benchmark_value(cls, v):
        if v <= 0:
            raise ValueError('Benchmark value must be positive')
        return v
    
    @staticmethod
    def from_component_performance(comp: ComponentPerformance) -> 'ComponentData':
        """Convert ComponentPerformance to ComponentData for service layer compatibility"""
        return ComponentData(
            component_id=comp.component_id,
            component_name=comp.component_name,
            component_type=comp.component_type,
            observed_value=comp.observed_value,
            benchmark_value=comp.benchmark_value,
            weight=comp.weight,
            sensitivity_parameter=comp.sensitivity_parameter,
            financial_allocation=comp.financial_allocation
        )


class FSFVIRequest(BaseModel):
    """Simplified FSFVI calculation request - matches Django service expectations"""
    food_system_id: str
    food_system_name: str
    fiscal_year: int
    total_budget: float = Field(..., gt=0, description="Total budget available")
    components: List[ComponentPerformance]
    
    @validator('components')
    def validate_weights(cls, v):
        total_weight = sum(comp.weight for comp in v)
        if not (0.99999 <= total_weight <= 1.00001):  # Allow for small floating point errors
            raise ValueError(f'Component weights must sum to 1.0, got {total_weight}')
        return v
    
    @validator('fiscal_year')
    def validate_fiscal_year(cls, v):
        current_year = datetime.now().year
        if v < 2000 or v > current_year + 10:
            raise ValueError(f'Fiscal year must be between 2000 and {current_year + 10}')
        return v


class VulnerabilityResult(BaseModel):
    """Component vulnerability calculation result - matches Django expectations"""
    component_id: str
    component_type: str
    vulnerability: float = Field(..., description="Component vulnerability score")
    weighted_vulnerability: float = Field(..., description="Weighted vulnerability contribution")
    performance_gap: float = Field(..., description="Normalized performance gap")
    efficiency_index: float = Field(default=0.0, description="Resource efficiency index")
    priority_level: str = Field(default="medium", description="Priority level: critical, high, medium, low")


class FSFVIResponse(BaseModel):
    """Enhanced FSFVI calculation response - matches Django service expectations"""
    # Core identifiers
    food_system_id: Optional[str] = None
    food_system_name: Optional[str] = None
    fiscal_year: Optional[int] = None
    calculation_date: Optional[datetime] = None
    
    # Core FSFVI metrics - field names must match Django service expectations
    fsfvi_value: float = Field(..., description="Current FSFVI score")
    optimal_fsfvi_value: Optional[float] = Field(None, description="Optimal FSFVI from optimization")
    
    # Component analysis
    component_vulnerabilities: List[VulnerabilityResult]
    
    # Additional metrics that Django service expects
    efficiency_gap: float = Field(default=0.0, description="Gap between current and optimal")
    budget_utilization: float = Field(default=0.0, description="Budget utilization ratio")
    improvement_potential: float = Field(default=0.0, description="Potential improvement percentage")
    recommendations: List[str] = Field(default_factory=list)
    critical_components: List[str] = Field(default_factory=list)
    risk_level: str = Field(default="medium", description="Overall risk level: low, medium, high, critical")
    data_quality_overall: float = Field(default=1.0, description="Overall data quality score")


class ShockSimulationRequest(BaseModel):
    """Request model for shock simulation"""
    base_request: FSFVIRequest
    shock_type: str = Field(..., description="Type: budget_cut, performance_decline, allocation_freeze")
    shock_magnitude: float = Field(..., ge=-100, le=100, description="Shock magnitude as percentage")
    affected_components: Optional[List[str]] = Field(None, description="Specific components affected")
    duration_years: int = Field(default=1, ge=1, le=10, description="Shock duration in years")


class ShockSimulationResponse(BaseModel):
    """Response model for shock simulation"""
    simulation_id: Optional[str] = None
    shock_scenario: Optional[Dict[str, Union[str, float]]] = None
    
    # Core metrics that Django service expects
    baseline_fsfvi: float
    shocked_fsfvi: float
    impact_magnitude: float
    resilience_score: float = Field(..., ge=0, le=1, description="System resilience score")
    affected_components_impact: Dict[str, float] = Field(default_factory=dict)
    recovery_recommendations: List[str] = Field(default_factory=list)
    
    # Optional detailed analysis
    component_impacts: Optional[List[Dict[str, Union[str, float]]]] = None
    recovery_time_estimate: Optional[int] = None
    mitigation_strategies: Optional[List[str]] = None


class OptimizationRequest(BaseModel):
    """Schema for optimization request - matching Django service"""
    food_system_id: str
    food_system_name: str
    fiscal_year: int
    total_budget: float
    components: List[ComponentPerformance]


class EnhancedOptimizationResult(BaseModel):
    """Enhanced optimization result with all fields Django service might expect"""
    optimization_status: str = Field(default="success")
    optimal_fsfvi: Optional[float] = None
    efficiency_gap: Optional[float] = None
    improvement_potential: float = Field(default=0.0)
    iterations: int = Field(default=0)
    convergence_time: float = Field(default=0.0)
    reallocation_recommendations: List[Dict[str, Union[str, float]]] = Field(default_factory=list)
    optimized_allocations: Dict[str, float] = Field(default_factory=dict)
    total_reallocated: float = Field(default=0.0)


# Performance gaps calculation response
class PerformanceGapsResponse(BaseModel):
    """Response for performance gaps calculation"""
    performance_gaps: List[Dict[str, Union[str, float]]]
    summary: Dict[str, Union[str, float, int]] 