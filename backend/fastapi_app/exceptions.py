"""
FSFVI Custom Exceptions
=======================

Centralized exception handling for the FSFVI system to provide consistent
error handling across all modules.
"""

from typing import Optional, Dict, Any


class FSFVIException(Exception):
    """Base exception for all FSFVI-related errors"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(FSFVIException):
    """Raised when input validation fails"""
    pass


class WeightingError(FSFVIException):
    """Raised when weighting calculation fails"""
    pass


class OptimizationError(FSFVIException):
    """Raised when optimization fails"""
    pass


class CalculationError(FSFVIException):
    """Raised when FSFVI calculation fails"""
    pass


class ConfigurationError(FSFVIException):
    """Raised when configuration is invalid"""
    pass


class ComponentError(ValidationError):
    """Raised when component data is invalid"""
    
    def __init__(self, component_id: str, field: str, message: str):
        self.component_id = component_id
        self.field = field
        details = {
            'component_id': component_id,
            'field': field
        }
        super().__init__(f"Component {component_id} field '{field}': {message}", details)


class WeightValidationError(WeightingError):
    """Raised when weight validation fails"""
    
    def __init__(self, total_weight: float, expected: float = 1.0, tolerance: float = 1e-3):
        self.total_weight = total_weight
        self.expected = expected
        self.tolerance = tolerance
        details = {
            'total_weight': total_weight,
            'expected': expected,
            'tolerance': tolerance,
            'difference': abs(total_weight - expected)
        }
        super().__init__(
            f"Weights sum to {total_weight:.6f}, expected {expected:.6f} (tolerance: {tolerance})",
            details
        )


class AHPValidationError(WeightingError):
    """Raised when AHP matrix validation fails"""
    
    def __init__(self, message: str, consistency_ratio: Optional[float] = None):
        self.consistency_ratio = consistency_ratio
        details = {}
        if consistency_ratio is not None:
            details['consistency_ratio'] = consistency_ratio
        super().__init__(f"AHP validation failed: {message}", details)


class NetworkAnalysisError(WeightingError):
    """Raised when network analysis fails"""
    pass


class DependencyMatrixError(NetworkAnalysisError):
    """Raised when dependency matrix is invalid"""
    
    def __init__(self, message: str, matrix_shape: Optional[tuple] = None):
        self.matrix_shape = matrix_shape
        details = {}
        if matrix_shape:
            details['matrix_shape'] = matrix_shape
        super().__init__(f"Dependency matrix error: {message}", details)


class OptimizationConvergenceError(OptimizationError):
    """Raised when optimization fails to converge"""
    
    def __init__(self, iterations: int, final_improvement: float, tolerance: float):
        self.iterations = iterations
        self.final_improvement = final_improvement
        self.tolerance = tolerance
        details = {
            'iterations': iterations,
            'final_improvement': final_improvement,
            'tolerance': tolerance
        }
        super().__init__(
            f"Optimization failed to converge after {iterations} iterations "
            f"(improvement: {final_improvement:.6f}, tolerance: {tolerance})",
            details
        )


class ScenarioError(ValidationError):
    """Raised when scenario is invalid or unavailable"""
    
    def __init__(self, scenario: str, available_scenarios: list):
        self.scenario = scenario
        self.available_scenarios = available_scenarios
        details = {
            'requested_scenario': scenario,
            'available_scenarios': available_scenarios
        }
        super().__init__(
            f"Invalid scenario '{scenario}'. Available: {', '.join(available_scenarios)}",
            details
        )


class MethodError(ValidationError):
    """Raised when weighting method is invalid or unavailable"""
    
    def __init__(self, method: str, available_methods: list):
        self.method = method
        self.available_methods = available_methods
        details = {
            'requested_method': method,
            'available_methods': available_methods
        }
        super().__init__(
            f"Invalid method '{method}'. Available: {', '.join(available_methods)}",
            details
        )


class DataIntegrityError(ValidationError):
    """Raised when data integrity checks fail"""
    pass


class BudgetConstraintError(ValidationError):
    """Raised when budget constraints are violated"""
    
    def __init__(self, total_allocation: float, budget: float):
        self.total_allocation = total_allocation
        self.budget = budget
        details = {
            'total_allocation': total_allocation,
            'budget': budget,
            'excess': total_allocation - budget
        }
        super().__init__(
            f"Total allocation {total_allocation:.2f} exceeds budget {budget:.2f}",
            details
        )


# Utility functions for exception handling
def handle_calculation_error(func):
    """Decorator to handle calculation errors consistently"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except FSFVIException:
            # Re-raise FSFVI exceptions as-is
            raise
        except ValueError as e:
            raise ValidationError(f"Invalid input: {str(e)}") from e
        except ZeroDivisionError as e:
            raise CalculationError(f"Division by zero in calculation: {str(e)}") from e
        except Exception as e:
            raise CalculationError(f"Unexpected calculation error: {str(e)}") from e
    return wrapper


def handle_weighting_error(func):
    """Decorator to handle weighting errors consistently"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except FSFVIException:
            # Re-raise FSFVI exceptions as-is
            raise
        except Exception as e:
            raise WeightingError(f"Weighting calculation failed: {str(e)}") from e
    return wrapper


def handle_optimization_error(func):
    """Decorator to handle optimization errors consistently"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except FSFVIException:
            # Re-raise FSFVI exceptions as-is
            raise
        except Exception as e:
            raise OptimizationError(f"Optimization failed: {str(e)}") from e
    return wrapper 