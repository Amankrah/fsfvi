"""
FSFVI Core Mathematical Functions
================================

Core mathematical functions for FSFVI calculations, separated from business logic
and API concerns for better maintainability and testability.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
import logging

from .config import FSFVI_CONFIG
from .exceptions import CalculationError, handle_calculation_error

logger = logging.getLogger(__name__)


@handle_calculation_error
def calculate_performance_gap(observed: float, benchmark: float) -> float:
    """
    Calculate performance gap: δᵢ = |xᵢ - x̄ᵢ| / xᵢ
    
    Args:
        observed: Observed performance value (xᵢ)
        benchmark: Benchmark performance value (x̄ᵢ)
        
    Returns:
        Performance gap value
        
    Raises:
        CalculationError: If calculation fails
    """
    if observed <= 0:
        return 1.0 if benchmark > 0 else 0.0
    
    gap = abs(observed - benchmark) / observed
    return min(gap, 1.0)  # Cap at 1.0 for extreme cases


@handle_calculation_error
def calculate_vulnerability(gap: float, allocation: float, sensitivity: float) -> float:
    """
    Calculate FSFVI vulnerability: υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
    
    This is the core FSFVI vulnerability function that represents how financial
    allocation affects component vulnerability.
    
    Args:
        gap: Performance gap (δᵢ)
        allocation: Financial allocation (fᵢ)
        sensitivity: Sensitivity parameter (αᵢ)
        
    Returns:
        Vulnerability value
        
    Raises:
        CalculationError: If calculation fails
    """
    if allocation < 0:
        raise CalculationError("Financial allocation must be non-negative")
    
    if sensitivity < 0:
        raise CalculationError("Sensitivity parameter must be non-negative")
    
    # FSFVI vulnerability function: υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
    vulnerability = gap * (1 / (1 + sensitivity * allocation))
    
    return vulnerability


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
    Calculate resource efficiency index
    
    Args:
        vulnerability: Component vulnerability
        allocation: Financial allocation
        
    Returns:
        Efficiency index (higher is better)
    """
    if allocation == 0:
        return 0.0
    
    # Efficiency = (1 - vulnerability) / allocation * 1000 for scaling
    efficiency = max(0, 1 - vulnerability) / allocation * 1000
    return efficiency


@handle_calculation_error
def determine_priority_level(vulnerability: float, performance_gap: float) -> str:
    """Determine priority level based on vulnerability and performance gap"""
    if vulnerability >= 0.7 or performance_gap >= 0.5:
        return "critical"
    elif vulnerability >= 0.5 or performance_gap >= 0.3:
        return "high"
    elif vulnerability >= 0.3 or performance_gap >= 0.2:
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
    weight: float
) -> Dict[str, float]:
    """
    Calculate complete FSFVI metrics for a single component
    
    Args:
        observed_value: Observed performance value
        benchmark_value: Benchmark performance value
        financial_allocation: Financial allocation
        sensitivity_parameter: Sensitivity parameter
        weight: Component weight
        
    Returns:
        Dictionary with all component FSFVI metrics
    """
    # Calculate core metrics
    gap = calculate_performance_gap(observed_value, benchmark_value)
    vulnerability = calculate_vulnerability(gap, financial_allocation, sensitivity_parameter)
    weighted_vulnerability = calculate_weighted_vulnerability(vulnerability, weight)
    efficiency = calculate_efficiency_index(vulnerability, financial_allocation)
    priority = determine_priority_level(vulnerability, gap)
    
    return {
        'performance_gap': gap,
        'vulnerability': vulnerability,
        'weighted_vulnerability': weighted_vulnerability,
        'efficiency_index': efficiency,
        'priority_level': priority
    }


@handle_calculation_error
def calculate_system_fsfvi(component_results: List[Dict[str, float]]) -> Dict[str, float]:
    """
    Calculate system-level FSFVI from component results
    
    Args:
        component_results: List of component FSFVI result dictionaries
        
    Returns:
        System-level FSFVI metrics
    """
    if not component_results:
        raise CalculationError("No component results provided")
    
    # Sum weighted vulnerabilities for overall FSFVI
    total_fsfvi = sum(result['weighted_vulnerability'] for result in component_results)
    
    # Calculate additional system metrics
    total_allocation = sum(result.get('financial_allocation', 0) for result in component_results)
    
    avg_vulnerability = np.mean([result['vulnerability'] for result in component_results])
    max_vulnerability = max(result['vulnerability'] for result in component_results)
    
    # Count components by priority
    priority_counts = {}
    for result in component_results:
        priority = result['priority_level']
        priority_counts[priority] = priority_counts.get(priority, 0) + 1
    
    # Determine overall risk level
    risk_level = determine_risk_level(total_fsfvi)
    
    return {
        'fsfvi_value': total_fsfvi,
        'total_allocation': total_allocation,
        'average_vulnerability': avg_vulnerability,
        'max_vulnerability': max_vulnerability,
        'risk_level': risk_level,
        'priority_counts': priority_counts
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
    Estimate sensitivity parameter based on component characteristics
    
    Args:
        component_type: Type of component
        observed_value: Observed performance value
        benchmark_value: Benchmark performance value
        financial_allocation: Financial allocation
        base_sensitivity: Base sensitivity values by component type
        
    Returns:
        Estimated sensitivity parameter
    """
    if base_sensitivity is None:
        # Default sensitivity factors for different categories
        base_sensitivity = {
            'agricultural_development': 0.70,
            'infrastructure': 0.65,
            'nutrition_health': 0.60,
            'social_assistance': 0.50,
            'climate_natural_resources': 0.30,
            'governance_institutions': 0.25
        }
    
    default_sensitivity = 0.40
    
    # Get baseline sensitivity for component type
    estimated_parameter = base_sensitivity.get(component_type, default_sensitivity)
    
    # Adjust based on performance gap
    performance_gap = calculate_performance_gap(observed_value, benchmark_value)
    
    # Adjust based on allocation level (proxy for scale economies)
    normalized_expenditure = min(financial_allocation / 100.0, 1.0)
    if normalized_expenditure > 0.5:
        estimated_parameter += 0.10 * normalized_expenditure  # Scale bonus
    
    # Adjust based on performance gap (structural issues penalty)
    if performance_gap > 1.0:
        penalty_factor = min(performance_gap / 3.0, 1.0)
        estimated_parameter -= 0.20 * penalty_factor  # Lag penalty
    
    # Add complexity penalty for very high allocations
    if financial_allocation > 500:
        complexity_factor = min((financial_allocation - 500) / 1000, 1.0)
        estimated_parameter -= 0.15 * complexity_factor  # Complexity penalty
    
    # Ensure parameter stays in reasonable bounds
    estimated_parameter = max(0.1, min(0.8, estimated_parameter))
    
    return estimated_parameter


@handle_calculation_error
def calculate_vulnerability_gradient(
    performance_gap: float,
    sensitivity_parameter: float,
    current_allocation: float,
    weight: float
) -> float:
    """
    Calculate gradient of the vulnerability function for optimization
    
    Gradient: ∇υᵢ(fᵢ) = -δᵢ · αᵢ / (1 + αᵢ·fᵢ)²
    
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