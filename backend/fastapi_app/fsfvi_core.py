"""
FSFVI Core Calculations
======================

Core calculation functions for FSFVI analysis.
Handles vulnerability calculations and optimization.
"""

from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd
from datetime import datetime
import logging
import os

# Import dependencies
from config import FSFVI_CONFIG
from exceptions import FSFVIException, CalculationError, handle_calculation_error
from validators import validate_calculation_inputs

# Configure logging
logger = logging.getLogger(__name__)


@handle_calculation_error
def calculate_performance_gap(observed: float, benchmark: float, prefer_higher: bool = True) -> float:
    """
    STREAMLINED: Calculate performance gap using FSFVI mathematical framework.
    
    Mathematical Formula:
    δᵢ = {
        max(0, (x̄ᵢ - xᵢ)/xᵢ)  if prefer_higher=True and xᵢ < x̄ᵢ
        max(0, (xᵢ - x̄ᵢ)/xᵢ)  if prefer_higher=False and xᵢ > x̄ᵢ  
        0                       otherwise (meeting/exceeding benchmark)
    }
    
    Performance gap only exists when underperforming:
    - For metrics where higher is better: gap only when observed < benchmark
    - For metrics where lower is better: gap only when observed > benchmark
    
    Mathematical Properties:
    - δᵢ ∈ [0,1] (bounded, dimensionless)
    - δᵢ = 0 when performance meets or exceeds benchmark
    - δᵢ represents fractional underperformance relative to current level
    
    Args:
        observed: Observed performance value (xᵢ)
        benchmark: Benchmark performance value (x̄ᵢ)
        prefer_higher: True if higher values are better (default), False if lower is better
        
    Returns:
        Performance gap value δᵢ ∈ [0,1] (0 when meeting/exceeding benchmark)
        
    Raises:
        CalculationError: If calculation fails
    """
    # Quick validation using config tolerances
    if abs(observed) < FSFVI_CONFIG.tolerance and abs(benchmark) < FSFVI_CONFIG.tolerance:
        return 0.0
    
    if observed <= 0:
        # Edge case: If observed is 0 or negative but benchmark is positive
        return 1.0 if benchmark > 0 else 0.0
    
    if benchmark <= 0:
        # Edge case: If benchmark is 0 or negative, no meaningful gap
        return 0.0
    
    # Core performance gap calculation
    if prefer_higher:
        # Higher values are better (e.g., income, yields, capacity)
        gap = max(0.0, (benchmark - observed) / observed) if observed < benchmark else 0.0
    else:
        # Lower values are better (e.g., costs, pollution, inefficiency)
        gap = max(0.0, (observed - benchmark) / observed) if observed > benchmark else 0.0
    
    # Apply configuration-based capping
    return min(gap, 1.0)


@handle_calculation_error
def calculate_vulnerability(gap: float, allocation: float, sensitivity: float) -> float:
    """
    STREAMLINED: Calculate FSFVI vulnerability using exact mathematical specification.
    
    Mathematical Formula: υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
    
    This is the core FSFVI vulnerability function representing how financial allocation 
    affects component vulnerability with diminishing returns.
    
    Mathematical Properties:
    - δᵢ = 0 → υᵢ = 0 (no gap = no vulnerability)
    - fᵢ → ∞ → υᵢ → 0 (infinite funding eliminates vulnerability)
    - αᵢ = 0 → υᵢ = δᵢ (no responsiveness to funding)
    - αᵢfᵢ: dimensionless financial effectiveness factor
    
    Unit Analysis:
    - δᵢ: dimensionless [0,1]
    - αᵢ: [1/financial_units] 
    - fᵢ: [financial_units]
    - αᵢfᵢ: dimensionless (units cancel)
    - υᵢ: dimensionless [0,1]
    
    Diminishing Returns Behavior:
    - Small αᵢfᵢ: υᵢ ≈ δᵢ(1 - αᵢfᵢ) (linear reduction)
    - Large αᵢfᵢ: υᵢ ≈ δᵢ/αᵢfᵢ (inverse relationship)
    
    Args:
        gap: Performance gap δᵢ (dimensionless, [0,1])
        allocation: Financial allocation fᵢ (currency units)
        sensitivity: Sensitivity parameter αᵢ (1/currency_units)
        
    Returns:
        Vulnerability value υᵢ(fᵢ) ∈ [0,1]
        
    Raises:
        CalculationError: If calculation fails or inputs are invalid
    """
    # Streamlined input validation using config tolerances
    if allocation < 0:
        raise CalculationError(f"Financial allocation must be non-negative: {allocation}")
    
    if sensitivity < 0:
        raise CalculationError(f"Sensitivity parameter must be non-negative: {sensitivity}")
    
    # Clamp gap to valid range using config tolerance
    gap = max(0.0, min(1.0, gap))
    
    # Core FSFVI vulnerability calculation: υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
    financial_effectiveness = sensitivity * allocation  # αᵢfᵢ (dimensionless)
    denominator = 1.0 + financial_effectiveness
    
    # Prevent division by zero and ensure denominator is reasonable
    if denominator <= FSFVI_CONFIG.tolerance:
        denominator = FSFVI_CONFIG.tolerance
    
    vulnerability = gap / denominator
    
    # Mathematical verification using config tolerance
    if denominator <= FSFVI_CONFIG.tolerance:
        raise CalculationError(f"Invalid denominator: {denominator}")
    
    # Return validated result
    return min(max(vulnerability, 0.0), 1.0)


@handle_calculation_error
def calculate_weighted_vulnerability(vulnerability: float, weight: float) -> float:
    """
    Calculate weighted vulnerability: ωᵢ · υᵢ
    
    Args:
        vulnerability: Component vulnerability
        weight: Component weight
        
    Returns:
        Weighted vulnerability
    """
    if weight < 0 or weight > 1:
        raise CalculationError(f"Weight must be between 0 and 1, got {weight}")
    
    return weight * vulnerability


@handle_calculation_error
def calculate_efficiency_index(vulnerability: float, allocation: float) -> float:
    """
    Calculate resource efficiency index as percentage
    
    Formula: Efficiency = (1 - vulnerability) / allocation × 100
    
    This measures effectiveness per million USD invested:
    - Higher values = better resource effectiveness
    - Typical range: 0.1% to 50% depending on allocation size
    - Interpretation: % effectiveness gained per $1M invested
    
    Args:
        vulnerability: Component vulnerability [0,1]
        allocation: Financial allocation (millions USD)
        
    Returns:
        Efficiency index as percentage (higher is better)
    """
    if allocation == 0:
        return 0.0
    
    # Efficiency = (1 - vulnerability) / allocation * 100 (percentage per million USD)
    efficiency = max(0, 1 - vulnerability) / allocation * 100
    return efficiency


@handle_calculation_error
def determine_priority_level(
    vulnerability: float, 
    financial_allocation: float = 0.0, 
    weight: float = 0.0,
    total_budget: float = 1.0
) -> str:
    """
    Determine priority level using robust multi-factor risk assessment
    
    Risk is primarily determined by vulnerability (which already incorporates performance gap),
    but adjusted for financial exposure and system importance to provide more nuanced risk assessment.
    
    Mathematical Foundation:
    - Primary Risk = vulnerability score [0,1] 
    - Financial Risk Multiplier = allocation_share^0.5 (square root for diminishing effect)
    - System Importance Multiplier = weight^0.3 (cube root for moderate effect)
    - Composite Risk = Primary Risk × (1 + 0.3×Financial_Multiplier + 0.2×Importance_Multiplier)
    
    Args:
        vulnerability: Component vulnerability score [0,1] (already includes performance gap)
        financial_allocation: Financial allocation in millions USD
        weight: Component weight in system [0,1]
        total_budget: Total system budget for allocation share calculation
        
    Returns:
        Priority level: 'critical', 'high', 'medium', or 'low'
    """
    # Primary risk is the vulnerability score (already accounts for performance gap)
    primary_risk = vulnerability
    
    # Financial exposure adjustment (larger allocations increase system risk)
    allocation_share = financial_allocation / max(total_budget, 1.0) if total_budget > 0 else 0
    financial_multiplier = allocation_share ** 0.5  # Square root for diminishing effect
    
    # System importance adjustment (higher weight = higher system impact)
    importance_multiplier = weight ** 0.3  # Cube root for moderate effect
    
    # Composite risk score with weighted adjustments
    composite_risk = primary_risk * (1 + 0.3 * financial_multiplier + 0.2 * importance_multiplier)
    
    # Risk thresholds based on composite score
    if composite_risk >= 0.6:  # Lowered from 0.7 to account for adjustments
        return "critical"
    elif composite_risk >= 0.4:  # Lowered from 0.5
        return "high"
    elif composite_risk >= 0.25:  # Lowered from 0.3
        return "medium"
    else:
        return "low"


@handle_calculation_error
def determine_risk_level(fsfvi_score: float, thresholds: Optional[Dict[str, float]] = None) -> str:
    """
    Determine overall risk level based on FSFVI score
    
    Args:
        fsfvi_score: Overall FSFVI score (dimensionless, range [0,1])
        thresholds: Custom risk thresholds (optional)
        
    Returns:
        Risk level: 'low', 'medium', 'high', or 'critical'
    """
    if thresholds is None:
        thresholds = FSFVI_CONFIG.risk_thresholds
    
    if fsfvi_score <= thresholds['low']:
        return 'low'
    elif fsfvi_score <= thresholds['medium']:
        return 'medium'
    elif fsfvi_score <= thresholds['high']:
        return 'high'
    else:
        return 'critical'


@handle_calculation_error
def calculate_component_fsfvi(
    observed_value: float,
    benchmark_value: float,
    financial_allocation: float,
    sensitivity_parameter: float,
    weight: float,
    prefer_higher: bool = True
) -> Dict[str, float]:
    """
    Calculate complete FSFVI metrics for a single component
    
    Args:
        observed_value: Observed performance value
        benchmark_value: Benchmark performance value
        financial_allocation: Financial allocation
        sensitivity_parameter: Sensitivity parameter
        weight: Component weight
        prefer_higher: True if higher values are better, False if lower is better
        
    Returns:
        Dictionary with all component FSFVI metrics
    """
    # Calculate core metrics with correct performance direction
    gap = calculate_performance_gap(observed_value, benchmark_value, prefer_higher)
    vulnerability = calculate_vulnerability(gap, financial_allocation, sensitivity_parameter)
    weighted_vulnerability = calculate_weighted_vulnerability(vulnerability, weight)
    efficiency = calculate_efficiency_index(vulnerability, financial_allocation)
    priority = determine_priority_level(vulnerability, financial_allocation, weight, financial_allocation)
    
    return {
        'performance_gap': gap,
        'vulnerability': vulnerability,
        'weighted_vulnerability': weighted_vulnerability,
        'efficiency_index': efficiency,
        'priority_level': priority
    }


@handle_calculation_error
def calculate_system_fsfvi(component_results: List[Dict[str, float]]) -> Dict[str, Any]:
    """
    Calculate system-level FSFVI using exact aggregation formula: FSFVI = Σᵢ ωᵢ·υᵢ(fᵢ)
    
    This function implements the FSFVI aggregation across all food system components,
    providing comprehensive system vulnerability assessment with detailed insights
    for government decision-making.
    
    Mathematical Foundation:
    FSFVI = Σᵢ₌₁ⁿ ωᵢ · υᵢ(fᵢ) = Σᵢ₌₁ⁿ ωᵢ · δᵢ · [1/(1 + αᵢfᵢ)]
    
    Where:
    - ωᵢ: Component weight (Σωᵢ = 1)
    - υᵢ(fᵢ): Component vulnerability function
    - δᵢ: Performance gap [0,1]
    - αᵢ: Sensitivity parameter
    - fᵢ: Financial allocation
    
    Args:
        component_results: List of component FSFVI result dictionaries containing:
                          - weighted_vulnerability, vulnerability, weight, etc.
        
    Returns:
        Comprehensive system-level FSFVI metrics with government insights
        
    Raises:
        CalculationError: If calculation fails or inputs are invalid
    """
    if not component_results:
        raise CalculationError("No component results provided for system FSFVI calculation")
    
    # Core FSFVI Calculation: Σᵢ ωᵢ·υᵢ(fᵢ)
    weighted_vulnerabilities = [result['weighted_vulnerability'] for result in component_results]
    total_fsfvi = sum(weighted_vulnerabilities)
    
    # Mathematical validation
    if total_fsfvi < 0 or total_fsfvi > 1:
        logger.warning(f"FSFVI outside expected range [0,1]: {total_fsfvi}")
        total_fsfvi = max(0.0, min(1.0, total_fsfvi))
    
    # Detailed Component Analysis for Government Insights
    vulnerabilities = [result['vulnerability'] for result in component_results]
    weights = [result.get('weight', 0) for result in component_results]
    allocations = [result.get('financial_allocation', 0) for result in component_results]
    
    # System-Level Metrics
    total_allocation = sum(allocations)
    avg_vulnerability = float(np.mean(vulnerabilities))
    max_vulnerability = float(max(vulnerabilities))
    min_vulnerability = float(min(vulnerabilities))
    vulnerability_std = float(np.std(vulnerabilities))
    
    # Weighted averages (more representative of system state)
    total_weight = sum(weights)
    if total_weight > 0:
        weighted_avg_vulnerability = sum(v * w for v, w in zip(vulnerabilities, weights)) / total_weight
    else:
        weighted_avg_vulnerability = avg_vulnerability
    
    # Component Priority Analysis
    priority_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
    critical_components = []
    high_risk_components = []
    
    for result in component_results:
        priority = result.get('priority_level', 'medium')
        priority_counts[priority] = priority_counts.get(priority, 0) + 1
        
        component_name = result.get('component_name', result.get('component_type', 'Unknown'))
        if priority == 'critical':
            critical_components.append({
                'name': component_name,
                'vulnerability': result['vulnerability'],
                'allocation': result.get('financial_allocation', 0),
                'weight': result.get('weight', 0)
            })
        elif priority == 'high':
            high_risk_components.append({
                'name': component_name,
                'vulnerability': result['vulnerability'],
                'allocation': result.get('financial_allocation', 0),
                'weight': result.get('weight', 0)
            })
    
    # Risk Level Assessment
    risk_level = determine_risk_level(total_fsfvi)
    
    # Financial Efficiency Analysis
    efficiency_metrics = calculate_risk_concentration(allocations, vulnerabilities)
    
    # Component Contribution Analysis (for targeting interventions)
    component_contributions = []
    for i, result in enumerate(component_results):
        contribution_percent = (result['weighted_vulnerability'] / total_fsfvi * 100) if total_fsfvi > 0 else 0
        component_contributions.append({
            'component_name': result.get('component_name', result.get('component_type', f'Component_{i}')),
            'component_type': result.get('component_type', 'unknown'),
            'vulnerability': result['vulnerability'],
            'weight': result.get('weight', 0),
            'weighted_vulnerability': result['weighted_vulnerability'],
            'contribution_to_system_vulnerability_percent': contribution_percent,
            'financial_allocation': result.get('financial_allocation', 0),
            'allocation_percent': (result.get('financial_allocation', 0) / total_allocation * 100) if total_allocation > 0 else 0,
            'priority_level': result.get('priority_level', 'medium'),
            'efficiency_ratio': result.get('efficiency_index', 0)
        })
    
    # Sort by contribution to identify highest impact components
    component_contributions.sort(key=lambda x: x['contribution_to_system_vulnerability_percent'], reverse=True)
    
    # System Resilience Indicators
    resilience_indicators = {
        'vulnerability_concentration': max(weighted_vulnerabilities) / total_fsfvi if total_fsfvi > 0 else 0,
        'component_balance': 1 - vulnerability_std / max(vulnerabilities) if max(vulnerabilities) > 0 else 1,
        'resource_efficiency': (1 - total_fsfvi) / (total_allocation / 1000) if total_allocation > 0 else 0,  # Per thousand units
        'critical_dependency_risk': len(critical_components) / len(component_results) if component_results else 0
    }
    
    # Detailed Mathematical Breakdown
    mathematical_breakdown = {
        'formula_applied': 'FSFVI = Σᵢ ωᵢ·υᵢ(fᵢ) = Σᵢ ωᵢ·δᵢ·[1/(1+αᵢfᵢ)]',
        'total_components': len(component_results),
        'sum_of_weights': total_weight,
        'weight_normalization_status': 'properly_normalized' if abs(total_weight - 1.0) < 1e-6 else 'weight_adjustment_needed',
        'individual_contributions': [
            {
                'component': result.get('component_name', f'Component_{i}'),
                'ωᵢ': result.get('weight', 0),
                'υᵢ': result['vulnerability'],
                'ωᵢ·υᵢ': result['weighted_vulnerability']
            }
            for i, result in enumerate(component_results)
        ]
    }
    
    # Government Action Priorities
    action_priorities = _generate_government_action_priorities(
        total_fsfvi, risk_level, critical_components, high_risk_components, 
        component_contributions, total_allocation
    )
    
    # Detailed debug logging for transparency
    logger.info(f"=== SYSTEM FSFVI CALCULATION ===")
    logger.info(f"Total Components: {len(component_results)}")
    logger.info(f"Total Budget: ${total_allocation:.1f}M")
    logger.info(f"FSFVI Score: {total_fsfvi:.6f}")
    logger.info(f"Risk Level: {risk_level}")
    logger.info(f"Critical Components: {len(critical_components)}")
    logger.info(f"High Risk Components: {len(high_risk_components)}")
    logger.info(f"Top Vulnerability Contributors: {[c['component_name'] for c in component_contributions[:3]]}")
    
    return {
        # Core FSFVI Results
        'fsfvi_value': round_to_precision(total_fsfvi),
        'vulnerability_percent': round_to_precision(total_fsfvi * 100, 2),
        'risk_level': risk_level,
        
        # Financial Context
        'total_allocation': total_allocation,
        'total_allocation_millions': round_to_precision(total_allocation, 2),
        
        # Component Statistics
        'component_statistics': {
            'total_components': len(component_results),
            'average_vulnerability': round_to_precision(avg_vulnerability),
            'weighted_average_vulnerability': round_to_precision(weighted_avg_vulnerability),
            'max_vulnerability': round_to_precision(max_vulnerability),
            'min_vulnerability': round_to_precision(min_vulnerability),
            'vulnerability_standard_deviation': round_to_precision(vulnerability_std),
            'vulnerability_range': round_to_precision(max_vulnerability - min_vulnerability)
        },
        
        # Priority Analysis
        'priority_distribution': priority_counts,
        'critical_components': critical_components,
        'high_risk_components': high_risk_components,
        'components_requiring_immediate_attention': len(critical_components) + len(high_risk_components),
        
        # Detailed Component Contributions
        'component_contributions': component_contributions,
        'top_3_vulnerability_contributors': component_contributions[:3],
        
        # System Resilience
        'resilience_indicators': resilience_indicators,
        'efficiency_metrics': efficiency_metrics,
        
        # Mathematical Transparency
        'mathematical_breakdown': mathematical_breakdown,
        
        # Government-Specific Insights
        'government_insights': {
            'financing_efficiency_percent': round_to_precision((1 - total_fsfvi) * 100, 1),
            'intervention_urgency': 'immediate' if len(critical_components) > 0 else 'strategic',
            'budget_optimization_potential': 'high' if total_fsfvi > 0.15 else 'moderate' if total_fsfvi > 0.05 else 'low',
            'system_stability': 'stable' if vulnerability_std < 0.2 else 'unstable',
            'resource_allocation_quality': 'efficient' if efficiency_metrics['diversification_index'] > 0.7 else 'concentrated'
        },
        
        # Action Priorities for Government
        'action_priorities': action_priorities
    }


def _generate_government_action_priorities(
    fsfvi_score: float, 
    risk_level: str, 
    critical_components: List[Dict], 
    high_risk_components: List[Dict],
    component_contributions: List[Dict],
    total_budget: float
) -> Dict[str, Any]:
    """Generate specific action priorities for government decision-makers"""
    
    immediate_actions = []
    strategic_actions = []
    resource_recommendations = []
    
    # Immediate Actions (0-6 months)
    if critical_components:
        immediate_actions.append(f"Emergency intervention for {len(critical_components)} critical component(s)")
        for comp in critical_components:
            immediate_actions.append(f"Urgent funding review for {comp['name']} (vulnerability: {comp['vulnerability']:.1%})")
    
    if high_risk_components:
        immediate_actions.append(f"Priority assessment of {len(high_risk_components)} high-risk component(s)")
    
    if fsfvi_score > 0.30:
        immediate_actions.append("Initiate emergency food system stabilization protocol")
    
    # Strategic Actions (6-24 months)
    if fsfvi_score > 0.15:
        strategic_actions.append("Comprehensive budget reallocation strategy needed")
    
    top_contributor = component_contributions[0] if component_contributions else None
    if top_contributor and top_contributor['contribution_to_system_vulnerability_percent'] > 30:
        strategic_actions.append(f"Focus optimization efforts on {top_contributor['component_name']} (contributes {top_contributor['contribution_to_system_vulnerability_percent']:.1f}% of system vulnerability)")
    
    strategic_actions.append("Implement performance monitoring system for all components")
    strategic_actions.append("Develop scenario-based contingency plans")
    
    # Resource Recommendations
    if total_budget > 0:
        per_capita_estimate = total_budget / 50e6  # Assuming ~50M population for context
        resource_recommendations.append(f"Current investment: ${per_capita_estimate:.0f} per capita")
        
        if fsfvi_score > 0.20:
            resource_recommendations.append("Consider increasing total food system investment by 20-30%")
        elif fsfvi_score > 0.10:
            resource_recommendations.append("Current funding levels adequate, focus on reallocation")
        else:
            resource_recommendations.append("Funding levels appropriate, maintain current investment")
    
    return {
        'immediate_actions_0_6_months': immediate_actions,
        'strategic_actions_6_24_months': strategic_actions,
        'resource_recommendations': resource_recommendations,
        'overall_urgency': 'critical' if len(critical_components) > 2 else 'high' if len(critical_components) > 0 else 'moderate',
        'estimated_intervention_cost': f"${total_budget * 0.1:.1f}M - ${total_budget * 0.3:.1f}M" if total_budget > 0 else "TBD"
    }


@handle_calculation_error
def estimate_sensitivity_parameter(
    component_type: str,
    observed_value: float,
    benchmark_value: float,
    financial_allocation: float,
    base_sensitivity: Optional[Dict[str, float]] = None
) -> float:
    """
    ENHANCED: Estimate sensitivity parameter using component characteristics and config-based defaults
    with proper scaling for financial allocation units.
    
    Mathematical Foundation:
    The sensitivity parameter αᵢ controls the rate of diminishing returns in the vulnerability function:
    υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
    
    Sensitivity Parameter Properties:
    - Units: [1/financial_units] to ensure αᵢfᵢ is dimensionless
    - For allocations in millions USD: αᵢ ∈ [0.0005, 0.005] typically
    - Higher αᵢ → faster vulnerability reduction with increased funding
    - Lower αᵢ → slower vulnerability reduction (less responsive to funding)
    
    Estimation Methodology:
    1. Base sensitivity by component type (from empirical analysis)
    2. Performance-based adjustments (δᵢ > 0.5 → structural issues)
    3. Scale economy effects (larger programs → higher efficiency)
    4. Complexity penalties (very large programs → coordination challenges)
    
    Component Type Base Values (for millions USD):
    - Agricultural Development: 0.0015 (moderate responsiveness)
    - Infrastructure: 0.0018 (higher responsiveness to capital)
    - Nutrition/Health: 0.0020 (high responsiveness to direct funding)
    - Social Protection Equity: 0.0025 (very responsive to funding)
    - Climate/Natural Resources: 0.0008 (lower responsiveness, long-term)
    - Governance/Institutions: 0.0006 (lowest responsiveness, structural)
    
    Args:
        component_type: Type of component
        observed_value: Observed performance value (xᵢ)
        benchmark_value: Benchmark performance value (x̄ᵢ)
        financial_allocation: Financial allocation fᵢ (in millions USD)
        base_sensitivity: Base sensitivity values by component type (optional)
        
    Returns:
        Estimated sensitivity parameter αᵢ properly scaled for financial units
    """
    # Use config-based or provided sensitivity values (PROPERLY SCALED for actual data)
    if base_sensitivity is None:
        from config import ComponentType
        base_sensitivity = {
            # Scaled for real-world financial allocations (hundreds/thousands of millions)
            ComponentType.AGRICULTURAL_DEVELOPMENT.value: 0.0015,  # Increased for meaningful vulnerability
            ComponentType.INFRASTRUCTURE.value: 0.0018,           # Higher sensitivity for infrastructure  
            ComponentType.NUTRITION_HEALTH.value: 0.0020,         # High responsiveness to funding
            ComponentType.SOCIAL_PROTECTION_EQUITY.value: 0.0025,     # Very responsive to funding
            ComponentType.CLIMATE_NATURAL_RESOURCES.value: 0.0008, # Lower sensitivity (harder to improve)
            ComponentType.GOVERNANCE_INSTITUTIONS.value: 0.0006   # Lowest sensitivity (structural)
        }
    
    # Get baseline sensitivity for component type
    estimated_parameter = base_sensitivity.get(component_type, 0.0015)  # Increased default
    
    # Apply performance-based adjustments (scaled proportionally)
    performance_gap = calculate_performance_gap(observed_value, benchmark_value)
    
    # Scale economy bonus for larger allocations (scaled adjustment)
    if financial_allocation > 100:  # > $100M
        normalized_expenditure = min(financial_allocation / 1000.0, 0.5)
        estimated_parameter += 0.0005 * normalized_expenditure  # Increased adjustment
    
    # Structural issues penalty for poor performance (scaled adjustment)
    if performance_gap > 0.5:
        penalty_factor = min(performance_gap, 1.0)
        estimated_parameter -= 0.0003 * penalty_factor  # Reduced penalty to maintain sensitivity
    
    # Complexity penalty for very large programs (scaled adjustment)
    if financial_allocation > 500:  # > $500M
        complexity_factor = min((financial_allocation - 500) / 2000, 0.2)
        estimated_parameter -= 0.0002 * complexity_factor  # Reduced penalty
    
    # Apply proper bounds for scaled sensitivity parameters
    return max(0.0005,  # Increased minimum 
               min(0.005, estimated_parameter))  # Increased maximum


@handle_calculation_error
def estimate_sensitivity_parameter_empirical(
    component_type: str,
    observed_value: float,
    benchmark_value: float,
    financial_allocation: float,
    country_context: Optional[Dict[str, Any]] = None,
    historical_data: Optional[List[Dict[str, Any]]] = None
) -> float:
    """
    ADVANCED: Estimate sensitivity parameter using empirical data and econometric principles
    
    Mathematical Foundation:
    This approach estimates αᵢ using multiple empirical methods:
    
    1. Historical Effectiveness Analysis:
       αᵢ = ∑ₜ (Δperformanceₜ / Δallocationₜ) / typical_allocation_scale
    
    2. Cross-sectional Estimation:
       Solve: target_vulnerability = δᵢ / (1 + αᵢfᵢ) for αᵢ
       αᵢ = (δᵢ/target_vulnerability - 1) / fᵢ
    
    3. Country Context Adjustment:
       αᵢ_adjusted = αᵢ_base × governance_factor × capacity_factor × market_factor
    
    4. Theoretical Bounds:
       Based on economic literature and component-specific characteristics
    
    Estimation Priority:
    1. Historical data (60% weight) if available
    2. Cross-sectional analysis (30% weight)
    3. Theoretical expectations (10% weight)
    4. Country context adjustments (multiplicative)
    
    Args:
        component_type: Type of component
        observed_value: Observed performance value (xᵢ)
        benchmark_value: Benchmark performance value (x̄ᵢ)
        financial_allocation: Financial allocation fᵢ (in millions USD)
        country_context: Country-specific factors (GDP, governance index, etc.)
        historical_data: Historical allocation-performance data for calibration
        
    Returns:
        Empirically-estimated sensitivity parameter αᵢ
    """
    # Method 1: Historical Effectiveness Estimation
    if historical_data:
        historical_sensitivity = _estimate_from_historical_effectiveness(
            component_type, historical_data
        )
    else:
        historical_sensitivity = None
    
    # Method 2: Cross-sectional Analysis (if multiple components available)
    cross_sectional_sensitivity = _estimate_from_allocation_performance_relationship(
        observed_value, benchmark_value, financial_allocation
    )
    
    # Method 3: Country Context Adjustment
    if country_context:
        context_adjustment = _calculate_country_context_adjustment(
            component_type, country_context
        )
    else:
        context_adjustment = 1.0
    
    # Method 4: Theoretical Bounds Based on Economic Principles
    theoretical_bounds = _calculate_theoretical_sensitivity_bounds(
        component_type, financial_allocation
    )
    
    # Combine estimates using weighted approach
    if historical_sensitivity is not None:
        # Weight historical data heavily if available
        estimated_sensitivity = (
            0.6 * historical_sensitivity +
            0.3 * cross_sectional_sensitivity +
            0.1 * theoretical_bounds['expected']
        )
    else:
        # Fall back to cross-sectional and theoretical
        estimated_sensitivity = (
            0.7 * cross_sectional_sensitivity +
            0.3 * theoretical_bounds['expected']
        )
    
    # Apply country context adjustment
    estimated_sensitivity *= context_adjustment
    
    # Ensure within theoretical bounds
    return max(
        theoretical_bounds['min'],
        min(theoretical_bounds['max'], estimated_sensitivity)
    )


def _estimate_from_historical_effectiveness(
    component_type: str, 
    historical_data: List[Dict[str, Any]]
) -> float:
    """Estimate sensitivity from historical allocation-effectiveness relationships"""
    
    # Filter data for this component type
    component_data = [
        d for d in historical_data 
        if d.get('component_type') == component_type
    ]
    
    if len(component_data) < 3:
        return _get_fallback_sensitivity(component_type)
    
    # Calculate effectiveness ratios: (performance improvement) / (allocation increase)
    effectiveness_ratios = []
    
    for i in range(1, len(component_data)):
        prev = component_data[i-1]
        curr = component_data[i]
        
        allocation_change = curr['financial_allocation'] - prev['financial_allocation']
        performance_change = curr['observed_value'] - prev['observed_value']
        
        if allocation_change > 0 and performance_change > 0:
            # Effectiveness = performance improvement per allocation unit
            effectiveness = performance_change / allocation_change
            effectiveness_ratios.append(effectiveness)
    
    if not effectiveness_ratios:
        return _get_fallback_sensitivity(component_type)
    
    # Convert effectiveness to sensitivity parameter
    # Sensitivity = 1 / (effectiveness * typical_allocation_scale)
    avg_effectiveness = np.mean(effectiveness_ratios)
    typical_allocation = np.mean([d['financial_allocation'] for d in component_data])
    
    # Scale to produce reasonable vulnerability values
    sensitivity = avg_effectiveness / (typical_allocation * 1000)  # Scale factor
    
    return max(0.0001, min(0.01, sensitivity))


def _estimate_from_allocation_performance_relationship(
    observed_value: float,
    benchmark_value: float, 
    financial_allocation: float
) -> float:
    """Estimate sensitivity from current allocation-performance relationship"""
    
    # Calculate performance gap
    performance_gap = calculate_performance_gap(observed_value, benchmark_value)
    
    if performance_gap <= 0 or financial_allocation <= 0:
        return 0.001  # Default moderate sensitivity
    
    # Target: vulnerability should be 20-60% of performance gap for meaningful analysis
    target_vulnerability_range = (0.2 * performance_gap, 0.6 * performance_gap)
    target_vulnerability = np.mean(target_vulnerability_range)
    
    # Solve for sensitivity: target_vuln = perf_gap / (1 + sensitivity * allocation)
    # Rearranging: sensitivity = (perf_gap/target_vuln - 1) / allocation
    
    if target_vulnerability > 0:
        estimated_sensitivity = (performance_gap / target_vulnerability - 1) / financial_allocation
        return max(0.0001, min(0.01, estimated_sensitivity))
    
    return 0.001


def _calculate_country_context_adjustment(
    component_type: str,
    country_context: Dict[str, Any]
) -> float:
    """Calculate country-specific adjustment factor for sensitivity"""
    
    adjustment = 1.0
    
    # GDP per capita effect (richer countries may have lower sensitivity to funding)
    gdp_per_capita = country_context.get('gdp_per_capita_usd', 5000)
    if gdp_per_capita > 10000:
        adjustment *= 0.8  # Lower sensitivity for richer countries
    elif gdp_per_capita < 2000:
        adjustment *= 1.2  # Higher sensitivity for poorer countries
    
    # Governance effectiveness (better governance = higher sensitivity)
    governance_index = country_context.get('governance_effectiveness_index', 0.5)  # 0-1 scale
    adjustment *= (0.7 + 0.6 * governance_index)  # Range: 0.7-1.3
    
    # Institutional capacity effect by component type
    institutional_capacity = country_context.get('institutional_capacity_index', 0.5)
    
    if component_type in ['governance_institutions', 'infrastructure']:
        # These require strong institutions
        adjustment *= (0.5 + institutional_capacity)  # Range: 0.5-1.5
    elif component_type in ['social_protection_equity', 'nutrition_health']:
        # These are less institution-dependent
        adjustment *= (0.8 + 0.4 * institutional_capacity)  # Range: 0.8-1.2
    
    # Market development level
    market_development = country_context.get('market_development_index', 0.5)
    if component_type == 'agricultural_development':
        adjustment *= (0.6 + 0.8 * market_development)  # Range: 0.6-1.4
    
    return max(0.3, min(2.0, adjustment))  # Bound adjustment factor


def _calculate_theoretical_sensitivity_bounds(
    component_type: str,
    financial_allocation: float
) -> Dict[str, float]:
    """Calculate theoretical bounds for sensitivity parameter based on economic principles"""
    
    # Base sensitivity ranges by component type (from economic literature/theory)
    base_ranges = {
        'agricultural_development': {'min': 0.0005, 'max': 0.003, 'expected': 0.0015},
        'infrastructure': {'min': 0.0008, 'max': 0.004, 'expected': 0.002},
        'nutrition_health': {'min': 0.001, 'max': 0.005, 'expected': 0.0025},
        'social_protection_equity': {'min': 0.0015, 'max': 0.006, 'expected': 0.003},
        'climate_natural_resources': {'min': 0.0003, 'max': 0.002, 'expected': 0.001},
        'governance_institutions': {'min': 0.0002, 'max': 0.0015, 'expected': 0.0008}
    }
    
    base_range = base_ranges.get(component_type, {'min': 0.0005, 'max': 0.003, 'expected': 0.0015})
    
    # Adjust for allocation size (diminishing returns principle)
    if financial_allocation > 1000:  # > $1B
        # Very large allocations should have lower sensitivity
        scale_factor = 0.7
    elif financial_allocation > 500:  # $500M - $1B
        scale_factor = 0.85
    elif financial_allocation < 50:  # < $50M
        # Small allocations may have higher sensitivity
        scale_factor = 1.3
    else:
        scale_factor = 1.0
    
    return {
        'min': base_range['min'] * scale_factor,
        'max': base_range['max'] * scale_factor,
        'expected': base_range['expected'] * scale_factor
    }


def _get_fallback_sensitivity(component_type: str) -> float:
    """Get fallback sensitivity when empirical estimation fails"""
    fallback_values = {
        'agricultural_development': 0.0015,
        'infrastructure': 0.0018,
        'nutrition_health': 0.0020,
        'social_protection_equity': 0.0025,
        'climate_natural_resources': 0.0008,
        'governance_institutions': 0.0006
    }
    return fallback_values.get(component_type, 0.0015)


@handle_calculation_error
def calculate_vulnerability_gradient(
    performance_gap: float,
    sensitivity_parameter: float,
    current_allocation: float,
    weight: float
) -> float:
    """
    Calculate gradient of the vulnerability function for optimization

    The gradient represents the rate of change of vulnerability with respect to financial allocation. In optimization terms, this tells us:
    - Which direction to move (increase or decrease allocation)
    - How much impact each unit of funding will have on reducing vulnerability
    - Where the most efficient investments should be made
    
    The gradient formula is:
    ∇υᵢ(fᵢ) = -δᵢ · αᵢ / (1 + αᵢ·fᵢ)²
    
    Args:
        performance_gap: Performance gap (δᵢ)
        sensitivity_parameter: Sensitivity parameter (αᵢ)
        current_allocation: Current financial allocation (fᵢ)
        weight: Component weight (ωᵢ)
        
    Returns:
        Weighted vulnerability gradient
    """
    # Calculate vulnerability gradient: -δᵢ · αᵢ / (1 + αᵢ·fᵢ)²
    denominator = (1 + sensitivity_parameter * current_allocation) ** 2
    vulnerability_gradient = -performance_gap * sensitivity_parameter / denominator
    
    # Apply component weight
    weighted_gradient = weight * vulnerability_gradient
    
    return weighted_gradient


@handle_calculation_error
def calculate_system_efficiency_metrics(
    original_fsfvi: float,
    optimized_fsfvi: float,
    original_allocations: List[float],
    optimized_allocations: List[float]
) -> Dict[str, float]:
    """
    Calculate comprehensive system efficiency metrics
    
    Args:
        original_fsfvi: Original FSFVI value
        optimized_fsfvi: Optimized FSFVI value
        original_allocations: Original allocation values
        optimized_allocations: Optimized allocation values
        
    Returns:
        Dictionary of efficiency metrics
    """
    if original_fsfvi <= 0:
        return {
            'absolute_gap': 0.0,
            'gap_ratio': 0.0,
            'efficiency_index': 1.0,
            'improvement_potential': 0.0
        }
    
    absolute_gap = original_fsfvi - optimized_fsfvi
    
    # Avoid division by zero
    if optimized_fsfvi == 0:
        gap_ratio = float('inf') if absolute_gap > 0 else 0.0
    else:
        gap_ratio = absolute_gap / optimized_fsfvi
    
    efficiency_index = optimized_fsfvi / original_fsfvi
    improvement_potential = (absolute_gap / original_fsfvi) * 100
    
    # Calculate reallocation intensity
    total_reallocation = sum(abs(opt - orig) for opt, orig in zip(optimized_allocations, original_allocations))
    total_budget = sum(optimized_allocations)
    reallocation_intensity = (total_reallocation / total_budget) * 100 if total_budget > 0 else 0.0
    
    return {
        'absolute_gap': absolute_gap,
        'gap_ratio': gap_ratio,
        'efficiency_index': efficiency_index,
        'improvement_potential': improvement_potential,
        'reallocation_intensity': reallocation_intensity
    }


@handle_calculation_error
def calculate_risk_concentration(allocations: List[float], vulnerabilities: List[float]) -> Dict[str, float]:
    """
    Calculate risk concentration metrics
    
    Args:
        allocations: List of financial allocations
        vulnerabilities: List of vulnerability values
        
    Returns:
        Risk concentration metrics
    """
    total_budget = sum(allocations)
    total_vulnerability = sum(vulnerabilities)
    
    if total_budget <= 0 or total_vulnerability <= 0:
        return {
            'allocation_concentration': 0.0,
            'vulnerability_concentration': 0.0,
            'diversification_index': 1.0
        }
    
    # Calculate Herfindahl index for allocation concentration
    allocation_shares = [alloc / total_budget for alloc in allocations]
    herfindahl_index = sum(share ** 2 for share in allocation_shares)
    
    # Calculate vulnerability concentration
    max_vulnerability = max(vulnerabilities)
    vulnerability_concentration = max_vulnerability / total_vulnerability
    
    return {
        'allocation_concentration': herfindahl_index,
        'vulnerability_concentration': vulnerability_concentration,
        'diversification_index': 1 - herfindahl_index
    }


# Utility functions for common calculations
def round_to_precision(value: float, precision: Optional[int] = None) -> float:
    """Round value to configured precision"""
    if precision is None:
        precision = FSFVI_CONFIG.precision
    return round(value, precision)


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safely divide two numbers, returning default if denominator is zero"""
    if abs(denominator) < FSFVI_CONFIG.tolerance:
        return default
    return numerator / denominator


def clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp value between min and max bounds"""
    return max(min_val, min(max_val, value))


def normalize_values(values: List[float]) -> List[float]:
    """Normalize a list of values to sum to 1.0"""
    total = sum(values)
    if total <= 0:
        return [1.0 / len(values)] * len(values)
    return [v / total for v in values]


@handle_calculation_error
def get_fsfvi_interpretation(fsfvi_score: float, context: str = 'default') -> Dict[str, any]:
    """
    Get comprehensive mathematical and practical interpretation of FSFVI score
    
    Args:
        fsfvi_score: FSFVI vulnerability score (dimensionless, [0,1])
        context: Threshold context ('default', 'fine_grained', 'crisis_mode', etc.)
        
    Returns:
        Comprehensive interpretation including mathematical details
    """
    # Get appropriate thresholds for context
    thresholds = FSFVI_CONFIG.get_threshold_set(context)
    
    # Basic interpretation
    interpretation = FSFVI_CONFIG.get_vulnerability_interpretation(fsfvi_score)
    
    # Add mathematical context
    interpretation.update({
        'mathematical_analysis': {
            'formula': 'FSFVI = Σᵢ ωᵢ · δᵢ · [1/(1 + αᵢfᵢ)]',
            'components': {
                'ωᵢ': 'Component weight (dimensionless, Σωᵢ=1)',
                'δᵢ': 'Performance gap = |xᵢ-x̄ᵢ|/xᵢ (dimensionless, [0,1])',
                'αᵢ': 'Sensitivity parameter (1/financial_units)',
                'fᵢ': 'Financial allocation (financial_units)',
                'αᵢfᵢ': 'Dimensionless financial effectiveness factor'
            },
            'unit_analysis': {
                'fsfvi_unit': 'Dimensionless ratio',
                'theoretical_range': '[0, 1]',
                'practical_range': '[0, 0.5] for most real systems',
                'kenya_observed': '[0.022, 0.026] for $2.9B portfolio'
            },
            'threshold_context': context,
            'active_thresholds': thresholds
        },
        
        'policy_implications': {
            'vulnerability_percentage': f"{fsfvi_score * 100:.2f}%",
            'financing_efficiency': f"{(1 - fsfvi_score) * 100:.2f}%",
            'comparative_assessment': _assess_comparative_performance(fsfvi_score),
            'optimization_potential': _estimate_optimization_potential(fsfvi_score)
        }
    })
    
    return interpretation


def _assess_comparative_performance(fsfvi_score: float) -> str:
    """Assess performance relative to typical food systems"""
    if fsfvi_score < 0.01:
        return "Exceptional - Among top 5% of food systems globally"
    elif fsfvi_score < 0.03:
        return "Excellent - Well-performing system with efficient financing"
    elif fsfvi_score < 0.08:
        return "Good - Above average performance with room for optimization"
    elif fsfvi_score < 0.20:
        return "Fair - Average performance, significant improvement opportunities"
    elif fsfvi_score < 0.40:
        return "Poor - Below average, requires substantial intervention"
    else:
        return "Critical - Among worst performing systems, emergency action needed"


def _estimate_optimization_potential(fsfvi_score: float) -> str:
    """Estimate potential for improvement through optimization"""
    if fsfvi_score < 0.02:
        return "Low potential - System already highly optimized (< 20% improvement likely)"
    elif fsfvi_score < 0.10:
        return "Moderate potential - Tactical improvements possible (20-50% improvement)"
    elif fsfvi_score < 0.30:
        return "High potential - Strategic optimization can yield substantial gains (50-80% improvement)"
    else:
        return "Very high potential - Comprehensive restructuring needed (> 80% improvement possible)"


@handle_calculation_error
def validate_fsfvi_score(fsfvi_score: float, tolerance: float = 1e-6) -> Dict[str, any]:
    """
    Validate FSFVI score mathematically and provide diagnostic information
    
    Args:
        fsfvi_score: Calculated FSFVI score
        tolerance: Numerical tolerance for validation
        
    Returns:
        Validation results and diagnostics
    """
    validation_results = {
        'is_valid': True,
        'warnings': [],
        'errors': [],
        'mathematical_properties': {},
        'recommendations': []
    }
    
    # Check basic mathematical properties
    if fsfvi_score < 0:
        validation_results['errors'].append("FSFVI cannot be negative")
        validation_results['is_valid'] = False
    
    if fsfvi_score > 1 + tolerance:
        validation_results['errors'].append(f"FSFVI {fsfvi_score:.6f} exceeds theoretical maximum of 1.0")
        validation_results['is_valid'] = False
    
    # Check for unusual values
    if fsfvi_score > 0.8:
        validation_results['warnings'].append("Extremely high vulnerability - verify input data")
    
    if fsfvi_score < tolerance:
        validation_results['warnings'].append("Unusually low vulnerability - may indicate perfect system or data issues")
    
    # Mathematical properties
    validation_results['mathematical_properties'] = {
        'dimensionality': 'Dimensionless',
        'bounded': f"[0, 1] with actual value {fsfvi_score:.6f}",
        'interpretation': f"{fsfvi_score * 100:.2f}% system vulnerability",
        'complement': f"{(1 - fsfvi_score) * 100:.2f}% system efficiency"
    }
    
    # Recommendations based on score
    if fsfvi_score > 0.5:
        validation_results['recommendations'].append("Critical: Immediate system-wide intervention required")
    elif fsfvi_score > 0.2:
        validation_results['recommendations'].append("High priority: Comprehensive optimization needed")
    elif fsfvi_score > 0.05:
        validation_results['recommendations'].append("Medium priority: Targeted improvements recommended")
    else:
        validation_results['recommendations'].append("Low priority: Monitor and maintain current performance")
    
    return validation_results


# Additional dynamic sensitivity estimation approaches

@handle_calculation_error  
def estimate_sensitivity_parameter_ml(
    component_type: str,
    observed_value: float,
    benchmark_value: float,
    financial_allocation: float,
    training_data: Optional[List[Dict[str, Any]]] = None,
    ml_model_path: Optional[str] = None
) -> float:
    """
    MACHINE LEARNING: Estimate sensitivity using trained ML models
    
    Uses gradient boosting or neural networks trained on historical allocation-effectiveness data
    to predict optimal sensitivity parameters for new components.
    
    Args:
        component_type: Type of component
        observed_value: Current performance value
        benchmark_value: Target performance value
        financial_allocation: Current funding level
        training_data: Historical data for training (if model doesn't exist)
        ml_model_path: Path to saved ML model
        
    Returns:
        ML-predicted sensitivity parameter
    """
    try:
        # Try to load pre-trained model
        if ml_model_path and os.path.exists(ml_model_path):
            model = _load_ml_model(ml_model_path)
        elif training_data and len(training_data) >= 50:
            # Train new model if sufficient data
            model = _train_sensitivity_model(training_data)
        else:
            # Fall back to empirical method
            return estimate_sensitivity_parameter_empirical(
                component_type, observed_value, benchmark_value, financial_allocation
            )
        
        # Prepare features for prediction
        features = _prepare_ml_features(
            component_type, observed_value, benchmark_value, financial_allocation
        )
        
        # Predict sensitivity
        predicted_sensitivity = model.predict([features])[0]
        
        # Apply bounds and validation
        return max(0.0001, min(0.01, predicted_sensitivity))
        
    except Exception as e:
        logger.warning(f"ML sensitivity estimation failed: {e}. Using fallback.")
        return _get_fallback_sensitivity(component_type)


@handle_calculation_error
def estimate_sensitivity_parameter_bayesian(
    component_type: str,
    observed_value: float,
    benchmark_value: float,
    financial_allocation: float,
    prior_beliefs: Optional[Dict[str, Any]] = None,
    uncertainty_quantification: bool = True
) -> Dict[str, float]:
    """
    BAYESIAN ESTIMATION: Estimate sensitivity with uncertainty quantification
    
    Uses Bayesian inference to estimate sensitivity parameters with confidence intervals,
    incorporating prior beliefs and updating with observed data.
    
    Args:
        component_type: Type of component
        observed_value: Current performance value
        benchmark_value: Target performance value  
        financial_allocation: Current funding level
        prior_beliefs: Prior distribution parameters
        uncertainty_quantification: Whether to return uncertainty bounds
        
    Returns:
        Dictionary with estimated sensitivity and uncertainty bounds
    """
    # Define prior distribution based on component type and theoretical knowledge
    if prior_beliefs is None:
        prior_beliefs = _get_prior_sensitivity_beliefs(component_type)
    
    # Calculate likelihood based on current performance vs allocation
    performance_gap = calculate_performance_gap(observed_value, benchmark_value)
    likelihood_params = _calculate_likelihood_parameters(
        performance_gap, financial_allocation
    )
    
    # Bayesian update: posterior ∝ prior × likelihood  
    posterior_params = _bayesian_update(prior_beliefs, likelihood_params)
    
    # Extract point estimates and uncertainty
    mean_sensitivity = posterior_params['mean']
    std_sensitivity = posterior_params['std']
    
    result = {
        'mean': mean_sensitivity,
        'std': std_sensitivity
    }
    
    if uncertainty_quantification:
        # Calculate confidence intervals
        result.update({
            'lower_95': max(0.0001, mean_sensitivity - 1.96 * std_sensitivity),
            'upper_95': min(0.01, mean_sensitivity + 1.96 * std_sensitivity),
            'lower_68': max(0.0001, mean_sensitivity - std_sensitivity),
            'upper_68': min(0.01, mean_sensitivity + std_sensitivity)
        })
    
    return result


@handle_calculation_error
def estimate_sensitivity_parameter_adaptive(
    component_type: str,
    observed_value: float,
    benchmark_value: float,
    financial_allocation: float,
    performance_history: Optional[List[Dict[str, Any]]] = None,
    update_frequency: str = 'quarterly'
) -> float:
    """
    ADAPTIVE ESTIMATION: Self-learning sensitivity that improves over time
    
    Maintains a running estimate of sensitivity that adapts based on observed
    performance outcomes, using techniques like Kalman filtering or exponential smoothing.
    
    Args:
        component_type: Type of component
        observed_value: Current performance value
        benchmark_value: Target performance value
        financial_allocation: Current funding level
        performance_history: Historical performance data for this component
        update_frequency: How often to update estimates
        
    Returns:
        Adaptively-estimated sensitivity parameter
    """
    # Initialize with theoretical prior if no history
    if not performance_history or len(performance_history) < 2:
        return _get_fallback_sensitivity(component_type)
    
    # Calculate effectiveness trends from history
    effectiveness_trend = _calculate_effectiveness_trend(performance_history)
    
    # Apply exponential smoothing with decay based on update frequency
    decay_factors = {
        'monthly': 0.9,
        'quarterly': 0.8, 
        'annually': 0.6
    }
    decay = decay_factors.get(update_frequency, 0.8)
    
    # Weighted average of historical sensitivities with recent bias
    weighted_sensitivities = []
    weights = []
    
    for i, period in enumerate(performance_history[-10:]):  # Last 10 periods
        if 'estimated_sensitivity' in period:
            weight = decay ** (len(performance_history) - i - 1)
            weighted_sensitivities.append(period['estimated_sensitivity'])
            weights.append(weight)
    
    if weighted_sensitivities:
        adaptive_sensitivity = np.average(weighted_sensitivities, weights=weights)
    else:
        adaptive_sensitivity = _get_fallback_sensitivity(component_type)
    
    # Adjust based on recent performance trend
    if effectiveness_trend > 0.1:  # Improving effectiveness
        adaptive_sensitivity *= 0.95  # Slightly reduce sensitivity
    elif effectiveness_trend < -0.1:  # Declining effectiveness
        adaptive_sensitivity *= 1.05  # Slightly increase sensitivity
    
    return max(0.0001, min(0.01, adaptive_sensitivity))


# Supporting functions for advanced estimation methods

def _load_ml_model(model_path: str):
    """Load pre-trained ML model for sensitivity estimation"""
    try:
        import joblib
        return joblib.load(model_path)
    except ImportError:
        logger.warning("joblib not available for ML model loading")
        return None


def _train_sensitivity_model(training_data: List[Dict[str, Any]]):
    """Train ML model for sensitivity estimation"""
    try:
        from sklearn.ensemble import GradientBoostingRegressor
        from sklearn.preprocessing import StandardScaler
        import numpy as np
        
        # Prepare training features and targets
        features = []
        targets = []
        
        for data_point in training_data:
            feature_vector = _prepare_ml_features(
                data_point['component_type'],
                data_point['observed_value'],
                data_point['benchmark_value'], 
                data_point['financial_allocation']
            )
            features.append(feature_vector)
            targets.append(data_point.get('optimal_sensitivity', 0.001))
        
        X = np.array(features)
        y = np.array(targets)
        
        # Train model
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=6,
            random_state=42
        )
        model.fit(X_scaled, y)
        
        # Create pipeline
        class SensitivityPipeline:
            def __init__(self, scaler, model):
                self.scaler = scaler
                self.model = model
            
            def predict(self, X):
                X_scaled = self.scaler.transform(X)
                return self.model.predict(X_scaled)
        
        return SensitivityPipeline(scaler, model)
        
    except ImportError:
        logger.warning("sklearn not available for ML training")
        return None


def _prepare_ml_features(
    component_type: str,
    observed_value: float,
    benchmark_value: float,
    financial_allocation: float
) -> List[float]:
    """Prepare feature vector for ML model"""
    
    # Component type encoding (one-hot)
    component_types = [
        'agricultural_development', 'infrastructure', 'nutrition_health',
        'social_protection_equity', 'climate_natural_resources', 'governance_institutions'
    ]
    component_encoding = [1.0 if ct == component_type else 0.0 for ct in component_types]
    
    # Performance metrics
    performance_gap = calculate_performance_gap(observed_value, benchmark_value)
    performance_ratio = observed_value / benchmark_value if benchmark_value > 0 else 1.0
    
    # Financial metrics
    log_allocation = np.log(max(1.0, financial_allocation))  # Log transform for scale
    allocation_intensity = financial_allocation / 1000.0  # Normalized to thousands
    
    # Combined features
    features = component_encoding + [
        performance_gap,
        performance_ratio,
        log_allocation,
        allocation_intensity,
        observed_value,
        benchmark_value
    ]
    
    return features


def _get_prior_sensitivity_beliefs(component_type: str) -> Dict[str, float]:
    """Get prior beliefs about sensitivity parameters for Bayesian estimation"""
    
    # Prior means and standard deviations based on theoretical knowledge
    priors = {
        'agricultural_development': {'mean': 0.0015, 'std': 0.0005},
        'infrastructure': {'mean': 0.0018, 'std': 0.0006},
        'nutrition_health': {'mean': 0.0020, 'std': 0.0007},
        'social_protection_equity': {'mean': 0.0025, 'std': 0.0008},
        'climate_natural_resources': {'mean': 0.0008, 'std': 0.0003},
        'governance_institutions': {'mean': 0.0006, 'std': 0.0002}
    }
    
    return priors.get(component_type, {'mean': 0.0015, 'std': 0.0005})


def _calculate_likelihood_parameters(
    performance_gap: float,
    financial_allocation: float
) -> Dict[str, float]:
    """Calculate likelihood parameters based on observed performance"""
    
    # Model: performance gap should be inversely related to effective allocation
    # Higher allocation with high performance gap suggests lower sensitivity
    # Lower allocation with high performance gap suggests higher sensitivity
    
    if performance_gap <= 0:
        # No gap - sensitivity less important
        likelihood_mean = 0.001
        likelihood_std = 0.0005
    else:
        # Gap exists - sensitivity depends on allocation effectiveness
        if financial_allocation > 1000:  # Large allocation
            # Large allocation with gap suggests low sensitivity to funding
            likelihood_mean = 0.0008
            likelihood_std = 0.0003
        elif financial_allocation > 100:  # Medium allocation
            likelihood_mean = 0.0015
            likelihood_std = 0.0005
        else:  # Small allocation
            # Small allocation with gap suggests high sensitivity potential
            likelihood_mean = 0.0025
            likelihood_std = 0.0008
    
    return {'mean': likelihood_mean, 'std': likelihood_std}


def _bayesian_update(
    prior: Dict[str, float],
    likelihood: Dict[str, float]
) -> Dict[str, float]:
    """Perform Bayesian update of sensitivity parameter distribution"""
    
    # For normal distributions: posterior precision = prior precision + likelihood precision
    prior_precision = 1 / (prior['std'] ** 2)
    likelihood_precision = 1 / (likelihood['std'] ** 2)
    posterior_precision = prior_precision + likelihood_precision
    
    # Posterior mean is precision-weighted average
    posterior_mean = (
        prior_precision * prior['mean'] + 
        likelihood_precision * likelihood['mean']
    ) / posterior_precision
    
    posterior_std = 1 / np.sqrt(posterior_precision)
    
    return {
        'mean': posterior_mean,
        'std': posterior_std,
        'precision': posterior_precision
    }


def _calculate_effectiveness_trend(performance_history: List[Dict[str, Any]]) -> float:
    """Calculate trend in allocation effectiveness over time"""
    
    if len(performance_history) < 3:
        return 0.0
    
    # Calculate effectiveness for each period: performance improvement per unit allocation
    effectiveness_scores = []
    
    for i in range(1, len(performance_history)):
        current = performance_history[i]
        previous = performance_history[i-1]
        
        perf_change = current['observed_value'] - previous['observed_value']
        alloc_change = current['financial_allocation'] - previous['financial_allocation']
        
        if alloc_change > 0:
            effectiveness = perf_change / alloc_change
            effectiveness_scores.append(effectiveness)
    
    if len(effectiveness_scores) < 2:
        return 0.0
    
    # Calculate trend (simple linear regression slope)
    x = list(range(len(effectiveness_scores)))
    y = effectiveness_scores
    
    n = len(x)
    slope = (n * sum(x[i] * y[i] for i in range(n)) - sum(x) * sum(y)) / (n * sum(x[i]**2 for i in range(n)) - sum(x)**2)
    
    return slope


