"""
FSFVI Validators
===============

Validation functions for FSFVI calculations and data.
Ensures data integrity and calculation correctness.
"""

from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd
from datetime import datetime
import logging

# Import dependencies
from config import (
    FSFVI_CONFIG,
    VALIDATION_CONFIG,
    WEIGHTING_CONFIG,
    get_weighting_methods,
    get_scenarios,
    normalize_component_type
)
from exceptions import (
    ValidationError, 
    FSFVIException,
    ComponentError,
    WeightValidationError,
    AHPValidationError,
    DependencyMatrixError,
    BudgetConstraintError,
    MethodError,
    ScenarioError,
    DataIntegrityError,
    handle_calculation_error
)


# Configure logging
logger = logging.getLogger(__name__)


def validate_component_data(components: List[Dict[str, Any]]) -> None:
    """
    Validate component data structure and values
    
    Args:
        components: List of component dictionaries
        
    Raises:
        ComponentError: If component data is invalid
        ValidationError: If overall validation fails
    """
    if not components:
        raise ValidationError("No components provided")
    
    required_fields = ['component_type', 'observed_value', 'benchmark_value', 'financial_allocation']
    numeric_fields = ['observed_value', 'benchmark_value', 'financial_allocation', 'weight', 'sensitivity_parameter']
    
    for i, comp in enumerate(components):
        comp_id = comp.get('component_id', f'component_{i}')
        
        # Check required fields
        for field in required_fields:
            if field not in comp:
                raise ComponentError(comp_id, field, "missing required field")
        
        # Check numeric field values
        for field in numeric_fields:
            if field in comp:
                value = comp[field]
                if not isinstance(value, (int, float)) or np.isnan(value) or np.isinf(value):
                    raise ComponentError(comp_id, field, f"invalid numeric value: {value}")
                
                # Check specific constraints
                if field == 'observed_value' and value < VALIDATION_CONFIG.min_observed_value:
                    raise ComponentError(comp_id, field, f"value {value} below minimum {VALIDATION_CONFIG.min_observed_value}")
                
                if field == 'benchmark_value' and value < VALIDATION_CONFIG.min_benchmark_value:
                    raise ComponentError(comp_id, field, f"value {value} below minimum {VALIDATION_CONFIG.min_benchmark_value}")
                
                if field == 'financial_allocation' and value < VALIDATION_CONFIG.min_financial_allocation:
                    raise ComponentError(comp_id, field, f"value {value} below minimum {VALIDATION_CONFIG.min_financial_allocation}")
                
                if field == 'sensitivity_parameter' and value < VALIDATION_CONFIG.min_sensitivity_parameter:
                    raise ComponentError(comp_id, field, f"value {value} below minimum {VALIDATION_CONFIG.min_sensitivity_parameter}")
                
                if field == 'weight' and (value < 0 or value > 1):
                    raise ComponentError(comp_id, field, f"weight {value} must be between 0 and 1")
        
        # Validate component type
        try:
            normalized_type = normalize_component_type(comp['component_type'])
            comp['component_type'] = normalized_type  # Update with normalized type
        except Exception as e:
            raise ComponentError(comp_id, 'component_type', f"invalid component type: {e}")


def validate_component_weights(components: List[Dict[str, Any]]) -> None:
    """
    Validate that component weights sum to approximately 1.0
    
    Args:
        components: List of component dictionaries with 'weight' field
        
    Raises:
        WeightValidationError: If weights don't sum to 1.0 within tolerance
    """
    weights = [comp.get('weight', 0.0) for comp in components]
    total_weight = sum(weights)
    
    if not (1.0 - FSFVI_CONFIG.weight_sum_tolerance <= total_weight <= 1.0 + FSFVI_CONFIG.weight_sum_tolerance):
        raise WeightValidationError(total_weight, 1.0, FSFVI_CONFIG.weight_sum_tolerance)
    
    # Check for extreme concentrations
    max_weight = max(weights) if weights else 0.0
    if max_weight > VALIDATION_CONFIG.max_weight_concentration:
        logger.warning(f"High weight concentration: max weight = {max_weight:.3f}")


def normalize_component_weights(components: List[Dict[str, Any]]) -> None:
    """
    Normalize component weights to sum to 1.0
    
    Args:
        components: List of component dictionaries (modified in-place)
    """
    weights = [comp.get('weight', 0.0) for comp in components]
    total_weight = sum(weights)
    
    if total_weight <= 0:
        # Assign equal weights if no weights exist
        equal_weight = 1.0 / len(components)
        for comp in components:
            comp['weight'] = equal_weight
        logger.info("Assigned equal weights to all components")
    else:
        # Normalize existing weights
        for comp in components:
            comp['weight'] = comp.get('weight', 0.0) / total_weight
        logger.info(f"Normalized weights from total {total_weight:.6f} to 1.0")


def validate_ahp_matrix(matrix: np.ndarray) -> None:
    """
    Validate AHP matrix consistency and properties
    
    Args:
        matrix: AHP pairwise comparison matrix
        
    Raises:
        AHPValidationError: If matrix is inconsistent or invalid
    """
    if not isinstance(matrix, np.ndarray):
        raise AHPValidationError("Matrix must be numpy array")
    
    if matrix.shape[0] != matrix.shape[1]:
        raise AHPValidationError(f"Matrix must be square, got shape {matrix.shape}")
    
    n = len(matrix)
    
    # Check reciprocal property
    for i in range(n):
        for j in range(n):
            if abs(matrix[i, j] * matrix[j, i] - 1.0) > 1e-6:
                raise AHPValidationError(
                    f"Matrix not reciprocal at ({i},{j}): {matrix[i,j]} * {matrix[j,i]} = {matrix[i,j] * matrix[j,i]}"
                )
    
    # Check diagonal elements are 1.0
    for i in range(n):
        if abs(matrix[i, i] - 1.0) > 1e-6:
            raise AHPValidationError(f"Diagonal element [{i},{i}] should be 1.0, got {matrix[i,i]}")
    
    # Calculate consistency ratio
    if n > 2:
        try:
            eigenvalues = np.linalg.eigvals(matrix)
            lambda_max = max(eigenvalues.real)
            ci = (lambda_max - n) / (n - 1)
            
            # Random Index values for different matrix sizes
            ri_values = {3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49}
            ri = ri_values.get(n, 1.24)
            cr = ci / ri
            
            if cr > WEIGHTING_CONFIG.ahp_consistency_threshold:
                raise AHPValidationError(
                    f"Matrix potentially inconsistent: CR = {cr:.3f} (threshold: {WEIGHTING_CONFIG.ahp_consistency_threshold})",
                    cr
                )
                
            logger.info(f"AHP matrix consistency validated: CR = {cr:.3f}")
            
        except Exception as e:
            raise AHPValidationError(f"Consistency calculation failed: {str(e)}")


def validate_dependency_matrix(matrix: np.ndarray) -> None:
    """
    Validate dependency matrix properties
    
    Args:
        matrix: Dependency matrix
        
    Raises:
        DependencyMatrixError: If matrix is invalid
    """
    if not isinstance(matrix, np.ndarray):
        raise DependencyMatrixError("Matrix must be numpy array", matrix.shape if hasattr(matrix, 'shape') else None)
    
    if matrix.shape[0] != matrix.shape[1]:
        raise DependencyMatrixError(f"Matrix must be square, got shape {matrix.shape}", matrix.shape)
    
    n = len(matrix)
    
    # Check diagonal is 1.0 (self-dependency)
    for i in range(n):
        if abs(matrix[i, i] - 1.0) > 1e-6:
            raise DependencyMatrixError(f"Diagonal element [{i},{i}] should be 1.0, got {matrix[i,i]}")
    
    # Check values are in valid range [0, 1]
    if np.any(matrix < VALIDATION_CONFIG.dependency_min_value) or np.any(matrix > VALIDATION_CONFIG.dependency_max_value):
        raise DependencyMatrixError(
            f"Dependency values must be in range [{VALIDATION_CONFIG.dependency_min_value}, {VALIDATION_CONFIG.dependency_max_value}]"
        )
    
    # Check for extreme asymmetries (warning only)
    for i in range(n):
        for j in range(n):
            if i != j and matrix[i, j] > 0:
                asymmetry_ratio = matrix[i, j] / (matrix[j, i] + 1e-6)
                if asymmetry_ratio > VALIDATION_CONFIG.dependency_asymmetry_threshold or asymmetry_ratio < 1.0/VALIDATION_CONFIG.dependency_asymmetry_threshold:
                    logger.warning(
                        f"High asymmetry in dependency [{i},{j}]: {matrix[i,j]:.3f} vs [{j},{i}]: {matrix[j,i]:.3f}"
                    )
    
    logger.info("Dependency matrix validation completed successfully")


def validate_budget_constraint(components: List[Dict[str, Any]], budget: float) -> None:
    """
    Validate budget constraints
    
    Args:
        components: List of components with financial_allocation
        budget: Total budget constraint
        
    Raises:
        BudgetConstraintError: If budget constraints are violated
    """
    if budget <= 0:
        raise ValidationError(f"Budget must be positive, got {budget}")
    
    total_allocation = sum(comp.get('financial_allocation', 0.0) for comp in components)
    
    # Allow slight over-allocation due to floating point precision
    tolerance = budget * 0.001  # 0.1% tolerance
    
    if total_allocation > budget + tolerance:
        raise BudgetConstraintError(total_allocation, budget)
    
    if total_allocation <= 0:
        raise ValidationError("Total allocation must be positive")


def validate_method(method: str) -> str:
    """
    Validate and normalize weighting method
    
    Args:
        method: Weighting method string
        
    Returns:
        Normalized method string
        
    Raises:
        MethodError: If method is invalid
    """
    available_methods = get_weighting_methods()
    
    if method not in available_methods:
        raise MethodError(method, available_methods)
    
    return method


def validate_scenario(scenario: str) -> str:
    """
    Validate and normalize scenario
    
    Args:
        scenario: Scenario string
        
    Returns:
        Normalized scenario string
        
    Raises:
        ScenarioError: If scenario is invalid
    """
    available_scenarios = get_scenarios()
    
    if scenario not in available_scenarios:
        raise ScenarioError(scenario, available_scenarios)
    
    return scenario


def validate_optimization_constraints(constraints: Dict[str, Any], budget: float, num_components: int) -> None:
    """
    Validate optimization constraints
    
    Args:
        constraints: Optimization constraint dictionary
        budget: Total budget
        num_components: Number of components
        
    Raises:
        ValidationError: If constraints are invalid
    """
    if 'min_allocation_per_component' in constraints:
        min_alloc = constraints['min_allocation_per_component']
        if min_alloc < 0:
            raise ValidationError("Minimum allocation per component must be non-negative")
        if min_alloc * num_components > budget:
            raise ValidationError(f"Minimum allocation {min_alloc} per component impossible with budget {budget}")
    
    if 'max_allocation_per_component' in constraints:
        max_alloc = constraints['max_allocation_per_component']
        if max_alloc < 0:
            raise ValidationError("Maximum allocation per component must be non-negative")
        if max_alloc > budget:
            raise ValidationError(f"Maximum allocation {max_alloc} exceeds total budget {budget}")
    
    if 'min_allocation_per_component' in constraints and 'max_allocation_per_component' in constraints:
        min_alloc = constraints['min_allocation_per_component']
        max_alloc = constraints['max_allocation_per_component']
        if min_alloc > max_alloc:
            raise ValidationError(f"Minimum allocation {min_alloc} exceeds maximum allocation {max_alloc}")


@handle_calculation_error
def validate_calculation_inputs(
    components: List[Dict[str, Any]], 
    method: Optional[str] = None,
    scenario: Optional[str] = None,
    budget: Optional[float] = None
) -> tuple:
    """
    STREAMLINED: Comprehensive validation of calculation inputs with consistent config access
    
    Args:
        components: Component data
        method: Weighting method (optional)
        scenario: Analysis scenario (optional)
        budget: Budget constraint (optional)
        
    Returns:
        Tuple of (validated_components, validated_method, validated_scenario)
        
    Raises:
        Various validation errors if inputs are invalid
    """
    logger.info(f"=== VALIDATION START ===")
    logger.info(f"Components: {len(components)}, Method: {method}, Scenario: {scenario}")
    
    # 1. Validate components structure and values
    validate_component_data(components)
    logger.info("PASS: Component data validation passed")
    
    # 2. Handle component weights - normalize if needed
    has_weights = all('weight' in comp for comp in components)
    if has_weights:
        try:
            validate_component_weights(components)
            logger.info("PASS: Component weights validation passed")
        except WeightValidationError as e:
            logger.warning(f"Weight validation failed: {e.message}. Auto-normalizing...")
            normalize_component_weights(components)
            logger.info("PASS: Component weights auto-normalized")
    else:
        logger.info("No weights found, assigning equal weights")
        normalize_component_weights(components)
        logger.info("PASS: Equal weights assigned")
    
    # 3. Validate and set defaults for method and scenario using config
    validated_method = validate_method(method) if method else FSFVI_CONFIG.default_weighting.value
    validated_scenario = validate_scenario(scenario) if scenario else FSFVI_CONFIG.default_scenario.value
    logger.info(f"PASS: Method: {validated_method}, Scenario: {validated_scenario}")
    
    # 4. Validate budget constraint if provided
    if budget is not None:
        validate_budget_constraint(components, budget)
        logger.info(f"PASS: Budget constraint validated: ${budget/1e6:.1f}M")
    
    logger.info(f"=== VALIDATION COMPLETE ===")
    return components, validated_method, validated_scenario


def validate_fsfvi_result(result: Dict[str, Any]) -> None:
    """
    Validate FSFVI calculation result
    
    Args:
        result: FSFVI calculation result dictionary
        
    Raises:
        DataIntegrityError: If result is invalid
    """
    required_fields = ['fsfvi_value', 'component_vulnerabilities', 'risk_level']
    
    for field in required_fields:
        if field not in result:
            raise DataIntegrityError(f"Missing required field in FSFVI result: {field}")
    
    fsfvi_value = result['fsfvi_value']
    if not isinstance(fsfvi_value, (int, float)) or np.isnan(fsfvi_value) or np.isinf(fsfvi_value):
        raise DataIntegrityError(f"Invalid FSFVI value: {fsfvi_value}")
    
    if fsfvi_value < 0:
        raise DataIntegrityError(f"FSFVI value cannot be negative: {fsfvi_value}")
    
    # Validate risk level
    valid_risk_levels = list(FSFVI_CONFIG.risk_thresholds.keys())
    if result['risk_level'] not in valid_risk_levels:
        raise DataIntegrityError(f"Invalid risk level: {result['risk_level']}. Valid: {valid_risk_levels}")


# Utility function for complete system validation
def validate_system_health() -> Dict[str, Any]:
    """
    Validate the health of the entire FSFVI system
    
    Returns:
        Dictionary with validation results
    """
    health_report = {
        'overall_status': True,
        'component_validations': [],
        'errors': [],
        'warnings': []
    }
    
    try:
        # Test component validation
        test_components = [
            {
                'component_id': 'test_1',
                'component_type': 'agricultural_development',
                'observed_value': 100.0,
                'benchmark_value': 120.0,
                'financial_allocation': 1000.0,
                'weight': 0.5,
                'sensitivity_parameter': 0.001
            },
            {
                'component_id': 'test_2',
                'component_type': 'infrastructure',
                'observed_value': 80.0,
                'benchmark_value': 100.0,
                'financial_allocation': 800.0,
                'weight': 0.5,
                'sensitivity_parameter': 0.001
            }
        ]
        
        validate_component_data(test_components)
        validate_component_weights(test_components)
        health_report['component_validations'].append('✓ Component validation passed')
        
        # Test method and scenario validation
        for method in get_weighting_methods():
            validate_method(method)
        health_report['component_validations'].append('✓ Method validation passed')
        
        for scenario in get_scenarios():
            validate_scenario(scenario)
        health_report['component_validations'].append('✓ Scenario validation passed')
        
        # Test budget validation
        validate_budget_constraint(test_components, 2000.0)
        health_report['component_validations'].append('✓ Budget validation passed')
        
    except Exception as e:
        health_report['overall_status'] = False
        health_report['errors'].append(f"System validation error: {str(e)}")
    
    return health_report 