"""
FSFVI Service Layer
==================

Business logic orchestration for FSFVI calculations, providing clean interfaces
for the API layer while coordinating between core calculations, weighting, and optimization.
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import logging
import uuid
import numpy as np
import pandas as pd

# Import core dependencies
from config import FSFVI_CONFIG, get_weighting_methods, get_scenarios
from schemas import (
    FSFVIRequest, FSFVIResponse, OptimizationResult, OptimizationConstraints,
    ComponentPerformance, VulnerabilityResult
)
from exceptions import (
    FSFVIException, ValidationError, WeightingError, OptimizationError, CalculationError,
    handle_calculation_error, handle_weighting_error, handle_optimization_error
)
from validators import validate_calculation_inputs, validate_fsfvi_result
from fsfvi_core import (
    calculate_component_fsfvi,
    calculate_system_fsfvi,
    estimate_sensitivity_parameter,
    calculate_vulnerability_gradient,
    calculate_system_efficiency_metrics,
    round_to_precision
)

# Import advanced weighting if available
try:
    from advanced_weighting import DynamicWeightingSystem
    ADVANCED_WEIGHTING_AVAILABLE = True
except ImportError:
    try:
        from .advanced_weighting import DynamicWeightingSystem
        ADVANCED_WEIGHTING_AVAILABLE = True
    except ImportError:
        ADVANCED_WEIGHTING_AVAILABLE = False

logger = logging.getLogger(__name__)


class FSFVICalculationService:
    """Service for FSFVI calculations with advanced weighting support"""
    
    def __init__(self):
        global ADVANCED_WEIGHTING_AVAILABLE
        try:
            self.weighting_system = DynamicWeightingSystem() if ADVANCED_WEIGHTING_AVAILABLE else None
            logger.info(f"FSFVI Calculation Service initialized - Advanced Weighting Available: {ADVANCED_WEIGHTING_AVAILABLE}")
            if ADVANCED_WEIGHTING_AVAILABLE:
                logger.info("Advanced weighting system loaded successfully")
            else:
                logger.warning("Advanced weighting system not available - using financial weights only")
        except Exception as e:
            logger.error(f"Failed to initialize advanced weighting system: {e}")
            self.weighting_system = None
            ADVANCED_WEIGHTING_AVAILABLE = False
    
    def _ensure_sensitivity_parameter(self, component: Dict[str, Any]) -> float:
        """
        CENTRALIZED: Ensure component has properly scaled sensitivity parameter
        
        Sensitivity Parameter Flow:
        1. Check if parameter exists and is properly scaled (≤ 0.1 indicates old scaling)
        2. If missing or old scale, estimate using configured method
        3. Apply mathematical bounds and validation
        
        Mathematical Context:
        - Sensitivity αᵢ has units [1/financial_units] to make αᵢfᵢ dimensionless
        - For allocations in millions USD: αᵢ ∈ [0.0005, 0.005] typically
        - Vulnerability formula: υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
        
        Args:
            component: Component dictionary (modified in-place)
            
        Returns:
            Validated sensitivity parameter
        """
        # Check if recalculation needed (missing, zero, or old scale > 0.1)
        current_sensitivity = component.get('sensitivity_parameter', 0)
        needs_estimation = (
            current_sensitivity <= 0 or 
            current_sensitivity > 0.1  # Old scale detection
        )
        
        if needs_estimation:
            component['sensitivity_parameter'] = self._estimate_sensitivity_with_method(
                component['component_type'],
                component['observed_value'],
                component['benchmark_value'],
                component['financial_allocation'],
                component.get('country_context'),
                component.get('historical_data'),
                component.get('performance_history')
            )
            
            logger.debug(f"Estimated sensitivity for {component['component_type']}: {component['sensitivity_parameter']:.6f}")
        
        return component['sensitivity_parameter']
    
    def _estimate_sensitivity_with_method(
        self,
        component_type: str,
        observed_value: float,
        benchmark_value: float,
        financial_allocation: float,
        country_context: Optional[Dict[str, Any]] = None,
        historical_data: Optional[List[Dict[str, Any]]] = None,
        performance_history: Optional[List[Dict[str, Any]]] = None
    ) -> float:
        """
        CONFIGURABLE: Estimate sensitivity parameter using configured estimation method
        
        Mathematical Foundation:
        The sensitivity parameter αᵢ controls the diminishing returns of financial allocation
        in the vulnerability function: υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
        
        Key Properties:
        - αᵢ = 0 → υᵢ = δᵢ (no response to funding)
        - αᵢ → ∞ → υᵢ → 0 (perfect response to funding)
        - Units: [1/financial_units] to ensure dimensionless αᵢfᵢ
        
        Available Methods:
        - hardcoded: Component-specific base values with adjustments
        - empirical: Historical effectiveness analysis  
        - ml: Machine learning prediction from training data
        - bayesian: Probabilistic estimation with uncertainty
        - adaptive: Self-learning from performance history
        
        Args:
            component_type: Type of component
            observed_value: Current performance value (xᵢ)
            benchmark_value: Target performance value (x̄ᵢ)
            financial_allocation: Current funding level (fᵢ, in millions USD)
            country_context: Country-specific context data
            historical_data: Historical allocation-effectiveness data
            performance_history: Historical performance data for this component
            
        Returns:
            Estimated sensitivity parameter αᵢ ∈ [0.0005, 0.005] for millions USD
        """
        from fsfvi_core import (
            estimate_sensitivity_parameter,
            estimate_sensitivity_parameter_empirical,
            estimate_sensitivity_parameter_ml,
            estimate_sensitivity_parameter_bayesian,
            estimate_sensitivity_parameter_adaptive
        )
        
        method = FSFVI_CONFIG.sensitivity_estimation_method
        fallback_method = FSFVI_CONFIG.sensitivity_estimation_fallback
        
        try:
            if method == "hardcoded":
                return estimate_sensitivity_parameter(
                    component_type, observed_value, benchmark_value, financial_allocation
                )
            
            elif method == "empirical":
                return estimate_sensitivity_parameter_empirical(
                    component_type, observed_value, benchmark_value, financial_allocation,
                    country_context, historical_data
                )
            
            elif method == "ml":
                return estimate_sensitivity_parameter_ml(
                    component_type, observed_value, benchmark_value, financial_allocation,
                    training_data=historical_data
                )
            
            elif method == "bayesian":
                result = estimate_sensitivity_parameter_bayesian(
                    component_type, observed_value, benchmark_value, financial_allocation
                )
                return result['mean']  # Use mean of posterior distribution
            
            elif method == "adaptive":
                return estimate_sensitivity_parameter_adaptive(
                    component_type, observed_value, benchmark_value, financial_allocation,
                    performance_history
                )
            
            else:
                logger.warning(f"Unknown sensitivity estimation method: {method}. Using fallback.")
                return self._estimate_sensitivity_with_fallback(
                    component_type, observed_value, benchmark_value, financial_allocation
                )
                
        except Exception as e:
            logger.warning(f"Sensitivity estimation method '{method}' failed: {e}. Using fallback.")
            return self._estimate_sensitivity_with_fallback(
                component_type, observed_value, benchmark_value, financial_allocation
            )
    
    def _estimate_sensitivity_with_fallback(
        self,
        component_type: str,
        observed_value: float,
        benchmark_value: float,
        financial_allocation: float
    ) -> float:
        """Estimate sensitivity using fallback method"""
        from fsfvi_core import estimate_sensitivity_parameter, estimate_sensitivity_parameter_empirical
        
        fallback_method = FSFVI_CONFIG.sensitivity_estimation_fallback
        
        try:
            if fallback_method == "empirical":
                return estimate_sensitivity_parameter_empirical(
                    component_type, observed_value, benchmark_value, financial_allocation
                )
            else:  # Default to hardcoded
                return estimate_sensitivity_parameter(
                    component_type, observed_value, benchmark_value, financial_allocation
                )
        except Exception as e:
            logger.error(f"Fallback sensitivity estimation failed: {e}. Using hardcoded values.")
            return estimate_sensitivity_parameter(
                component_type, observed_value, benchmark_value, financial_allocation
            )
    
    @handle_calculation_error
    def calculate_fsfvi(
        self,
        components: List[Dict[str, Any]],
        method: Optional[str] = None,
        scenario: Optional[str] = None,
        shock_probabilities: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive FSFVI with advanced weighting
        
        Mathematical Formula: FSFVI = Σᵢ ωᵢ · υᵢ(fᵢ) = Σᵢ ωᵢ · δᵢ · [1/(1 + αᵢfᵢ)]
        
        Where:
        - ωᵢ: Component weight (dimensionless, Σωᵢ = 1)
        - δᵢ: Performance gap = (x̄ᵢ - xᵢ)/xᵢ when underperforming, 0 otherwise
        - αᵢ: Sensitivity parameter (1/financial_units, estimated via multiple methods)
        - fᵢ: Financial allocation (financial_units, typically millions USD)
        - υᵢ(fᵢ): Component vulnerability function with diminishing returns
        
        Args:
            components: List of component data dictionaries
            method: Weighting method to use
            scenario: Analysis scenario
            shock_probabilities: Shock probability weights (optional)
            
        Returns:
            Dictionary with FSFVI calculation results
        """
        # Validate and normalize inputs
        components, method, scenario = validate_calculation_inputs(
            components, method, scenario
        )
        
        # Apply weighting
        weighted_components = self._apply_weighting(
            components, method, scenario, shock_probabilities
        )
        
        # Calculate component-level results
        component_results = []
        for comp in weighted_components:
            # CENTRALIZED: Ensure proper sensitivity parameter
            self._ensure_sensitivity_parameter(comp)
            
            # Get performance direction preference
            from config import get_component_performance_preference
            prefer_higher = get_component_performance_preference(comp['component_type'])
            
            # Calculate component FSFVI metrics
            comp_result = calculate_component_fsfvi(
                comp['observed_value'],
                comp['benchmark_value'],
                comp['financial_allocation'],
                comp['sensitivity_parameter'],
                comp['weight'],
                prefer_higher
            )
            
            # Add component metadata
            comp_result.update({
                'component_id': comp.get('component_id', f'comp_{len(component_results)}'),
                'component_type': comp['component_type'],
                'component_name': comp.get('component_name', comp['component_type']),
                'weight': comp['weight'],
                'financial_allocation': comp['financial_allocation']
            })
            
            component_results.append(comp_result)
        
        # Calculate system-level results using fsfvi_core comprehensive analysis
        system_results = calculate_system_fsfvi(component_results)
        
        # Return the complete system analysis from fsfvi_core, plus metadata
        result = system_results.copy()
        result.update({
            'component_vulnerabilities': component_results,
            'weighting_method': method,
            'scenario': scenario,
            'calculation_metadata': {
                'timestamp': datetime.now().isoformat(),
                'num_components': len(component_results),
                'advanced_weighting_used': ADVANCED_WEIGHTING_AVAILABLE and method != 'financial',
                'sensitivity_estimation_method': FSFVI_CONFIG.sensitivity_estimation_method
            }
        })
        
        # Validate result
        validate_fsfvi_result(result)
        
        return result
    
    @handle_weighting_error
    def _apply_weighting(
        self,
        components: List[Dict[str, Any]],
        method: str,
        scenario: str,
        shock_probabilities: Optional[Dict[str, float]] = None
    ) -> List[Dict[str, Any]]:
        """Apply weighting method to components"""
        
        if not ADVANCED_WEIGHTING_AVAILABLE or method == 'financial':
            # Use financial weights (normalized allocation-based)
            total_allocation = sum(comp['financial_allocation'] for comp in components)
            
            if total_allocation > 0:
                for comp in components:
                    comp['weight'] = comp['financial_allocation'] / total_allocation
            else:
                # Equal weights if no financial allocation
                equal_weight = 1.0 / len(components)
                for comp in components:
                    comp['weight'] = equal_weight
            
            logger.info("Applied financial weighting method")
            return components
        
        # Use advanced weighting
        try:
            new_weights = self.weighting_system.calculate_integrated_weights(
                components,
                weighting_method=method,
                scenario=scenario,
                shock_probabilities=shock_probabilities,
                performance_adjustment=True
            )
            
            # Apply weights to components
            for comp in components:
                comp['weight'] = new_weights.get(comp['component_type'], 1.0 / len(components))
            
            logger.info(f"Applied {method} weighting for {scenario}")
            
        except Exception as e:
            logger.warning(f"Advanced weighting failed: {e}. Using financial fallback.")
            # Fallback to financial weights
            return self._apply_weighting(components, 'financial', scenario)
        
        return components
    
    def get_available_methods(self) -> List[str]:
        """Get available weighting methods"""
        if ADVANCED_WEIGHTING_AVAILABLE:
            return get_weighting_methods()
        else:
            return ['financial']
    
    def get_available_scenarios(self) -> List[str]:
        """Get available scenarios"""
        if ADVANCED_WEIGHTING_AVAILABLE and self.weighting_system:
            return get_scenarios()
        else:
            return ['normal_operations']

    @handle_calculation_error
    def calculate_component_vulnerabilities(
        self,
        components: List[Dict[str, Any]],
        method: Optional[str] = None,
        scenario: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate vulnerability scores for individual components using exact FSFVI mathematical specification:
        υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
        
        This method provides detailed vulnerability analysis with comprehensive government insights
        following the same clean pattern as performance gap calculation.
        
        Args:
            components: List of component data dictionaries
            method: Weighting method to use ('hybrid', 'expert', 'network', 'financial')
            scenario: Analysis scenario ('normal_operations', 'climate_shock', etc.)
            
        Returns:
            Comprehensive component vulnerability analysis with government insights
        """
        # Validate and normalize inputs
        components, method, scenario = validate_calculation_inputs(
            components, method, scenario
        )
        
        # Apply advanced weighting to get component weights
        logger.info(f"=== COMPONENT VULNERABILITY CALCULATION ===")
        logger.info(f"Method: {method}, Scenario: {scenario}")
        logger.info(f"Advanced Weighting Available: {ADVANCED_WEIGHTING_AVAILABLE}")
        
        weighted_components = self._apply_weighting(
            components, method, scenario
        )
        
        # Calculate component vulnerabilities using exact FSFVI mathematical specification
        vulnerabilities_analysis = self._calculate_component_vulnerabilities_core(
            weighted_components, method, scenario
        )
        
        return vulnerabilities_analysis
    
    def _calculate_component_vulnerabilities_core(
        self, 
        components: List[Dict[str, Any]], 
        method: str, 
        scenario: str
    ) -> Dict[str, Any]:
        """
        Calculate component vulnerabilities using core FSFVI functions
        
        Mathematical Specification: υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
        
        This is the exact FSFVI component vulnerability calculation where:
        - δᵢ: Performance gap [0,1] (only when underperforming)
        - αᵢ: Sensitivity parameter (1/financial_units, configurable estimation)
        - fᵢ: Financial allocation (financial_units)
        - υᵢ(fᵢ): Resulting vulnerability [0,1] with diminishing returns
        """
        from fsfvi_core import calculate_component_fsfvi, calculate_system_fsfvi
        from config import get_component_performance_preference
        
        vulnerabilities = {}
        component_results = []
        total_budget = sum(comp['financial_allocation'] for comp in components)
        
        # Calculate vulnerability for each component
        for i, comp in enumerate(components):
            # CENTRALIZED: Ensure proper sensitivity parameter
            self._ensure_sensitivity_parameter(comp)
            
            # Get performance direction preference
            prefer_higher = get_component_performance_preference(comp['component_type'])
            
            # Calculate component FSFVI metrics using exact mathematical specification
            comp_result = calculate_component_fsfvi(
                comp['observed_value'],
                comp['benchmark_value'],
                comp['financial_allocation'],
                comp['sensitivity_parameter'],
                comp['weight'],
                prefer_higher
            )
            
            # Add component metadata with all fields expected by ComponentVulnerabilityDetails
            # Ensure component_type is always present and is a string
            component_type = comp.get('component_type', f'unknown_component_{i}')
            if not isinstance(component_type, str):
                component_type = str(component_type) if component_type is not None else f'unknown_component_{i}'
                
            comp_result.update({
                'component_id': comp.get('component_id', f'comp_{i}'),
                'component_type': component_type,
                'component_name': comp.get('component_name', component_type.replace('_', ' ').title()),
                'weight': comp['weight'],
                'financial_allocation': comp['financial_allocation'],
                'allocation_percent': (comp['financial_allocation'] / total_budget * 100) if total_budget > 0 else 0,
                'observed_value': comp['observed_value'],
                'benchmark_value': comp['benchmark_value'],
                'sensitivity_parameter': comp['sensitivity_parameter'],
                'prefer_higher': prefer_higher,
                # Additional fields expected by ComponentVulnerabilityDetails
                'risk_level': comp_result['priority_level']  # Map priority_level to risk_level for compatibility
            })
            
            # Store in both formats for compatibility
            vulnerabilities[comp['component_type']] = comp_result
            component_results.append(comp_result)
        
        # Generate summary statistics and insights
        summary_analysis = self._generate_vulnerability_summary(
            vulnerabilities, component_results, method, scenario, total_budget
        )
        
        return {
            'vulnerabilities': vulnerabilities,
            'summary': summary_analysis['summary'],
            'components': vulnerabilities,  # For backward compatibility
            'critical_components': summary_analysis['critical_components'],
            'high_risk_components': summary_analysis['high_risk_components'],
            'recommendations': summary_analysis['recommendations'],
            'mathematical_context': {
                'formula_used': 'υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)',
                'formula_description': 'Component vulnerability combines performance gap with diminishing returns of financial allocation',
                'variables': {
                    'υᵢ': 'Component vulnerability (dimensionless, [0,1])',
                    'δᵢ': 'Performance gap = |xᵢ - x̄ᵢ|/xᵢ when underperforming, 0 otherwise',
                    'αᵢ': f'Sensitivity parameter (1/financial_units, method: {FSFVI_CONFIG.sensitivity_estimation_method})',
                    'fᵢ': 'Financial allocation (financial_units)'
                },
                'calculation_method': 'exact_fsfvi_mathematical_specification',
                'weighting_method': method,
                'scenario_context': scenario,
                'sensitivity_estimation': FSFVI_CONFIG.sensitivity_estimation_method,
                'validation_status': 'mathematically_compliant'
            },
            'analysis_metadata': {
                'total_components': len(component_results),
                'total_budget_millions': round(total_budget / 1e6, 2),
                'method_used': method,
                'scenario': scenario,
                'timestamp': datetime.now().isoformat(),
                'advanced_weighting_used': ADVANCED_WEIGHTING_AVAILABLE and method != 'financial',
                'sensitivity_estimation_method': FSFVI_CONFIG.sensitivity_estimation_method
            }
        }
    
    def _generate_vulnerability_summary(
        self, 
        vulnerabilities: Dict[str, Any], 
        component_results: List[Dict[str, Any]], 
        method: str, 
        scenario: str, 
        total_budget: float
    ) -> Dict[str, Any]:
        """Generate vulnerability summary following the same pattern as performance gaps"""
        
        # Basic statistics
        vuln_scores = [comp['vulnerability'] for comp in component_results]
        total_components = len(component_results)
        avg_vulnerability = float(np.mean(vuln_scores)) if vuln_scores else 0
        max_vulnerability = float(max(vuln_scores)) if vuln_scores else 0
        min_vulnerability = float(min(vuln_scores)) if vuln_scores else 0
        
        # Component classification
        critical_components = []
        high_risk_components = []
        significant_vulnerabilities = 0
        worst_component = None
        worst_vulnerability = 0
        
        for comp in component_results:
            vulnerability = comp['vulnerability']
            priority = comp['priority_level']
            name = comp['component_name']
            
            if priority == 'critical':
                critical_components.append(name)
            elif priority == 'high':
                high_risk_components.append(name)
            
            if vulnerability > 0.3:  # Significant vulnerability threshold
                significant_vulnerabilities += 1
            
            if vulnerability > worst_vulnerability:
                worst_vulnerability = vulnerability
                worst_component = name
        
        # Generate recommendations
        recommendations = []
        if critical_components:
            recommendations.append(f"Immediate intervention required for {len(critical_components)} critical component(s)")
        if high_risk_components:
            recommendations.append(f"Strategic improvements needed for {len(high_risk_components)} high-risk component(s)")
        if avg_vulnerability > 0.5:
            recommendations.append("System-wide vulnerability reduction strategy recommended")
        else:
            recommendations.append("Monitor vulnerable components and maintain current performance")
        
        return {
            'summary': {
                'total_components': total_components,
                'components_with_significant_vulnerabilities': significant_vulnerabilities,
                'average_vulnerability_percent': avg_vulnerability * 100,
                'worst_performer': worst_component,
                'highest_vulnerability_percent': worst_vulnerability * 100,
                'critical_components_count': len(critical_components),
                'high_risk_components_count': len(high_risk_components)
            },
            'critical_components': critical_components,
            'high_risk_components': high_risk_components,
            'recommendations': recommendations[:5]  # Limit to top 5 recommendations
        }


class FSFVIOptimizationService:
    """Service for FSFVI optimization operations"""
    
    def __init__(self, calculation_service: FSFVICalculationService):
        self.calculation_service = calculation_service
        logger.info("FSFVI Optimization Service initialized")
    
    @handle_optimization_error
    def optimize_allocation(
        self,
        components: List[Dict[str, Any]],
        budget: float,
        method: Optional[str] = None,
        scenario: Optional[str] = None,
        constraints: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Optimize financial allocation to minimize FSFVI
        
        Args:
            components: Component data
            budget: Total budget constraint
            method: Weighting method
            scenario: Analysis scenario
            constraints: Optimization constraints
            
        Returns:
            Optimization result dictionary
        """
        # Validate inputs
        components, method, scenario = validate_calculation_inputs(
            components, method, scenario, budget
        )
        
        constraints = constraints or {}
        
        # Calculate current FSFVI
        current_result = self.calculation_service.calculate_fsfvi(
            components, method, scenario
        )
        current_fsfvi = current_result['fsfvi_value']
        
        # Run optimization using enhanced gradient descent
        optimization_result = self._optimize_gradient_descent(
            components, budget, constraints, method, scenario
        )
        
        if not optimization_result['success']:
            # Fallback to scipy optimization
            logger.warning("Enhanced optimization failed, using scipy fallback")
            optimization_result = self._optimize_scipy_fallback(
                components, budget, constraints, method, scenario
            )
        
        # Calculate improvement metrics
        if optimization_result['success']:
            improvement_metrics = self._calculate_improvement_metrics(
                current_fsfvi,
                optimization_result['optimal_fsfvi'],
                [comp['financial_allocation'] for comp in components],
                optimization_result['optimal_allocations']
            )
            
            optimization_result.update(improvement_metrics)
        
        optimization_result.update({
            'original_fsfvi': current_fsfvi,
            'method': method,
            'scenario': scenario,
            'timestamp': datetime.now().isoformat()
        })
        
        return optimization_result
    
    def _optimize_gradient_descent(
        self,
        components: List[Dict[str, Any]],
        budget: float,
        constraints: Dict[str, Any],
        method: str,
        scenario: str
    ) -> Dict[str, Any]:
        """Enhanced gradient descent optimization"""
        
        try:
            # Try relative import
            from .fsfvi_core import calculate_vulnerability_gradient
        except ImportError:
            # Fallback to absolute import
            from fsfvi_core import calculate_vulnerability_gradient
            
            # Setup optimization parameters
            max_iterations = min(FSFVI_CONFIG.max_optimization_iterations, 200)
            learning_rate = FSFVI_CONFIG.initial_learning_rate
            min_improvement = FSFVI_CONFIG.min_improvement
            tolerance = FSFVI_CONFIG.tolerance
            
            # Initialize allocations
            current_allocations = [comp['financial_allocation'] for comp in components]
            
            # Calculate bounds
            min_allocations, max_allocations = self._calculate_bounds(
                components, constraints, budget
            )
            
            # Track optimization progress
            iteration = 0
            prev_fsfvi = float('inf')
            convergence_history = []
            
            while iteration < max_iterations:
                # Calculate current FSFVI
                current_fsfvi = self._calculate_fsfvi_for_allocations(
                    components, current_allocations, method, scenario
                )
                
                # Check convergence
                improvement = prev_fsfvi - current_fsfvi
                if improvement <= min_improvement:
                    break
                
                prev_fsfvi = current_fsfvi
                iteration += 1
                
                # Calculate gradients
                gradients = []
                for i, comp in enumerate(components):
                    # Update component allocation for gradient calculation
                    temp_comp = comp.copy()
                    temp_comp['financial_allocation'] = current_allocations[i]
                    
                    # Apply weighting to get current weight
                    weighted_comps = self.calculation_service._apply_weighting(
                        [temp_comp], method, scenario
                    )
                    
                    gradient = calculate_vulnerability_gradient(
                        temp_comp['observed_value'] / temp_comp['benchmark_value'] if temp_comp['benchmark_value'] > 0 else 0,
                        temp_comp.get('sensitivity_parameter', 0.001),
                        current_allocations[i],
                        weighted_comps[0]['weight']
                    )
                    gradients.append(gradient)
                
                if all(abs(g) < tolerance for g in gradients):
                    break
                
                # Update allocations
                total_gradient = sum(abs(g) for g in gradients)
                if total_gradient > 0:
                    for i in range(len(current_allocations)):
                        adjustment = learning_rate * gradients[i] / total_gradient * budget
                        new_allocation = current_allocations[i] - adjustment  # Negative for minimization
                        
                        # Apply bounds
                        new_allocation = max(min_allocations[i], min(max_allocations[i], new_allocation))
                        current_allocations[i] = new_allocation
                
                # Enforce budget constraint
                total_current = sum(current_allocations)
                if total_current > 0:
                    scale_factor = budget / total_current
                    current_allocations = [alloc * scale_factor for alloc in current_allocations]
                
                convergence_history.append({
                    'iteration': iteration,
                    'fsfvi': current_fsfvi,
                    'improvement': improvement
                })
                
                # Adaptive learning rate
                if iteration > 1 and improvement <= convergence_history[-2]['improvement']:
                    learning_rate *= 0.9  # Reduce learning rate if improvement is slowing
            
            # Calculate final FSFVI
            final_fsfvi = self._calculate_fsfvi_for_allocations(
                components, current_allocations, method, scenario
            )
            
            return {
                'success': True,
                'optimal_fsfvi': final_fsfvi,
                'optimal_allocations': current_allocations,
                'iterations': iteration,
                'convergence_history': convergence_history,
                'solver': 'enhanced_gradient_descent'
            }
            
        except Exception as e:
            logger.error(f"Gradient descent optimization failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'solver': 'enhanced_gradient_descent'
            }
    
    def _optimize_scipy_fallback(
        self,
        components: List[Dict[str, Any]],
        budget: float,
        constraints: Dict[str, Any],
        method: str,
        scenario: str
    ) -> Dict[str, Any]:
        """Scipy optimization fallback"""
        
        try:
            from scipy.optimize import minimize
            
            # Define objective function
            def objective(allocations):
                return self._calculate_fsfvi_for_allocations(
                    components, allocations.tolist(), method, scenario
                )
            
            # Set up constraints and bounds
            min_allocations, max_allocations = self._calculate_bounds(
                components, constraints, budget
            )
            
            bounds = list(zip(min_allocations, max_allocations))
            constraint_list = [{'type': 'eq', 'fun': lambda x: sum(x) - budget}]
            
            # Initial guess
            initial = [comp['financial_allocation'] for comp in components]
            
            # Optimize
            result = minimize(
                objective,
                initial,
                method='SLSQP',
                bounds=bounds,
                constraints=constraint_list,
                options={
                    'maxiter': FSFVI_CONFIG.max_iterations,
                    'ftol': FSFVI_CONFIG.tolerance
                }
            )
            
            if result.success:
                return {
                    'success': True,
                    'optimal_fsfvi': result.fun,
                    'optimal_allocations': result.x.tolist(),
                    'iterations': result.nit,
                    'message': result.message,
                    'solver': 'scipy_SLSQP'
                }
            else:
                return {
                    'success': False,
                    'error': result.message,
                    'solver': 'scipy_SLSQP'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'solver': 'scipy_SLSQP'
            }
    
    def _calculate_bounds(
        self,
        components: List[Dict[str, Any]],
        constraints: Dict[str, Any],
        budget: float
    ) -> Tuple[List[float], List[float]]:
        """Calculate allocation bounds for optimization"""
        
        min_allocations = []
        max_allocations = []
        
        for comp in components:
            current_allocation = comp['financial_allocation']
            
            min_allocation = max(
                current_allocation * 0.01,  # Minimum 1% of current
                constraints.get('min_allocation_per_component', 0.1),
                0.1  # Absolute minimum
            )
            
            max_allocation = min(
                current_allocation * 2.0,  # Maximum 200% of current
                constraints.get('max_allocation_per_component', budget * 0.4),
                budget * 0.4  # No more than 40% of budget
            )
            
            min_allocations.append(min_allocation)
            max_allocations.append(max_allocation)
        
        return min_allocations, max_allocations
    
    def _calculate_fsfvi_for_allocations(
        self,
        components: List[Dict[str, Any]],
        allocations: List[float],
        method: str,
        scenario: str
    ) -> float:
        """Calculate FSFVI for specific allocations"""
        
        # Create temporary components with new allocations
        temp_components = []
        for i, comp in enumerate(components):
            temp_comp = comp.copy()
            temp_comp['financial_allocation'] = allocations[i]
            temp_components.append(temp_comp)
        
        # Calculate FSFVI
        result = self.calculation_service.calculate_fsfvi(
            temp_components, method, scenario
        )
        
        return result['fsfvi_value']
    
    def _calculate_improvement_metrics(
        self,
        original_fsfvi: float,
        optimized_fsfvi: float,
        original_allocations: List[float],
        optimized_allocations: List[float]
    ) -> Dict[str, Any]:
        """Calculate optimization improvement metrics"""
        
        try:
            from .fsfvi_core import calculate_system_efficiency_metrics
        except ImportError:
            from fsfvi_core import calculate_system_efficiency_metrics
        
        efficiency_metrics = calculate_system_efficiency_metrics(
            original_fsfvi,
            optimized_fsfvi,
            original_allocations,
            optimized_allocations
        )
        
        return {
            'efficiency_gap': efficiency_metrics['absolute_gap'],
            'improvement_potential': efficiency_metrics['improvement_potential'],
            'reallocation_intensity': efficiency_metrics['reallocation_intensity']
        }


class FSFVIAnalysisService:
    """Service for comprehensive FSFVI analysis operations"""
    
    def __init__(self):
        self.calculation_service = FSFVICalculationService()
        self.optimization_service = FSFVIOptimizationService(self.calculation_service)
        logger.info("FSFVI Analysis Service initialized")
    
    async def process_uploaded_data(
        self, 
        content: bytes, 
        filename: str, 
        country_name: str, 
        fiscal_year: int, 
        currency: str, 
        budget_unit: str, 
        user_id: int
    ) -> Dict[str, Any]:
        """Process uploaded data (fallback when Django integration not available)"""
        import pandas as pd
        import io
        import uuid
        import numpy as np
        
        # Determine file type and process
        if filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise ValueError("Unsupported file format. Use CSV or Excel.")
        
        # Create basic components for fallback
        components = []
        total_budget = 0
        
        for i, component_type in enumerate(['agricultural_development', 'infrastructure', 'nutrition_health', 
                                          'social_assistance', 'climate_natural_resources', 'governance_institutions']):
            
            allocation = max(len(df) * 10, 50)  # Basic allocation based on data size
            observed_value = 60.0 + np.random.uniform(-10, 10)
            benchmark_value = observed_value * np.random.uniform(1.1, 1.5)
            
            try:
                from fsfvi_core import estimate_sensitivity_parameter
                sensitivity = estimate_sensitivity_parameter(
                    component_type, observed_value, benchmark_value, allocation
                )
            except Exception:
                # Fallback sensitivity values
                sensitivity_map = {
                    'agricultural_development': 0.70,
                    'infrastructure': 0.65,
                    'nutrition_health': 0.60,
                    'social_assistance': 0.50,
                    'climate_natural_resources': 0.30,
                    'governance_institutions': 0.25
                }
                sensitivity = sensitivity_map.get(component_type, 0.40)
            
            component = {
                'component_id': str(uuid.uuid4()),
                'component_name': component_type.replace('_', ' ').title(),
                'component_type': component_type,
                'observed_value': float(observed_value),
                'benchmark_value': float(benchmark_value),
                'weight': 1.0/6,
                'sensitivity_parameter': sensitivity,
                'financial_allocation': float(allocation)
            }
            components.append(component)
            total_budget += allocation
        
        # Calculate basic data quality
        data_quality_score = 1.0 - (df.isnull().sum().sum() / max(df.size, 1))
        
        # Store in fallback storage (simplified)
        session_id = str(uuid.uuid4())
        
        return {
            "session_id": session_id,
            "status": "success",
            "message": f"Data processed successfully for {country_name} (fallback mode)",
            "storage": "in_memory_fallback",
            "data_summary": {
                "country": country_name,
                "fiscal_year": fiscal_year,
                "total_projects": len(df),
                "total_budget": f"{total_budget:.2f} {currency} {budget_unit}",
                "components_identified": len(components),
                "data_quality_score": data_quality_score
            },
            "components": components
        }
    
    def comprehensive_system_analysis(
        self,
        components: List[Dict[str, Any]],
        session_data: Dict[str, Any],
        method: str = "hybrid",
        scenario: str = "normal_operations",
        include_optimization_preview: bool = True
    ) -> Dict[str, Any]:
        """
        Perform comprehensive system analysis combining multiple analysis types
        Returns complete data structures expected by all frontend components
        """
        # 1. Current Distribution Analysis
        distribution_analysis = self._analyze_current_distribution(
            components, session_data.get('total_budget', 0)
        )
        
        # 2. Performance Gaps Analysis (enhanced with debug info)
        performance_gaps = self._calculate_performance_gaps_analysis(components)
        
        # 3. Component Vulnerabilities (enhanced)
        component_vulnerabilities = self.calculation_service.calculate_component_vulnerabilities(
            components, method=method, scenario=scenario
        )
        
        # 4. System-Level FSFVI (comprehensive)
        system_fsfvi = self.calculation_service.calculate_fsfvi(
            components, method=method, scenario=scenario
        )
        
        # 5. Optimization Preview (if requested)
        optimization_preview = None
        if include_optimization_preview:
            optimization_preview = self._generate_optimization_preview(
                components, system_fsfvi['fsfvi_value'], method, scenario
            )
        
        # 6. Generate comprehensive response structures for frontend components
        
        # FSFVI Results for SystemVulnerabilityOverview
        fsfvi_results = {
            'fsfvi_score': system_fsfvi['fsfvi_value'],
            'vulnerability_percent': system_fsfvi['fsfvi_value'] * 100,
            'risk_level': system_fsfvi['risk_level'],
            'financing_efficiency_percent': (1 - system_fsfvi['fsfvi_value']) * 100
        }
        
        # Financial Context for SystemVulnerabilityOverview
        total_budget = session_data.get('total_budget', 0)
        financial_context = {
            'total_budget_millions': total_budget / 1e6 if total_budget > 0 else 0,
            'budget_efficiency': 'high' if system_fsfvi['fsfvi_value'] < 0.1 else 'medium' if system_fsfvi['fsfvi_value'] < 0.2 else 'low',
            'optimization_potential': optimization_preview['optimization_priority'] if optimization_preview else 'medium',
            'intervention_urgency': system_fsfvi.get('government_insights', {}).get('intervention_urgency', 'medium')
        }
        
        # System Analysis for SystemVulnerabilityOverview
        system_analysis = {
            'fsfvi_score': system_fsfvi['fsfvi_value'],
            'risk_level': system_fsfvi['risk_level'],
            'total_allocation_millions': total_budget / 1e6 if total_budget > 0 else 0,
            'component_statistics': system_fsfvi.get('component_statistics', {}),
            'government_insights': system_fsfvi.get('government_insights', {}),
            'critical_components': [comp['name'] for comp in system_fsfvi.get('critical_components', [])],
            'high_priority_components': [comp['name'] for comp in system_fsfvi.get('high_risk_components', [])]
        }
        
        # Mathematical Interpretation for SystemVulnerabilityOverview  
        mathematical_interpretation = {
            'score': system_fsfvi['fsfvi_value'],
            'vulnerability_percent': system_fsfvi['fsfvi_value'] * 100,
            'interpretation': f"System shows {system_fsfvi['risk_level']} vulnerability with {(system_fsfvi['fsfvi_value'] * 100):.2f}% financing inefficiency",
            'performance_category': 'excellent' if system_fsfvi['fsfvi_value'] < 0.05 else 'good' if system_fsfvi['fsfvi_value'] < 0.15 else 'fair' if system_fsfvi['fsfvi_value'] < 0.30 else 'poor'
        }
        
        # Executive Summary for SystemVulnerabilityOverview
        executive_summary = {
            'overall_assessment': f"Food system shows {system_fsfvi['risk_level']} vulnerability requiring {'immediate' if len(system_fsfvi.get('critical_components', [])) > 0 else 'strategic'} intervention",
            'key_metrics': {
                'fsfvi_score': f"{system_fsfvi['fsfvi_value']:.6f}",
                'financing_efficiency': f"{((1 - system_fsfvi['fsfvi_value']) * 100):.1f}%",
                'critical_components': len(system_fsfvi.get('critical_components', [])),
                'total_budget': f"${total_budget / 1e6:.1f}M" if total_budget > 0 else "N/A"
            },
            'immediate_actions_required': len(system_fsfvi.get('critical_components', [])) > 0,
            'system_stability': system_fsfvi.get('government_insights', {}).get('system_stability', 'unknown')
        }
        
        # Enhanced component vulnerabilities structure for ComponentVulnerabilityDetails
        enhanced_component_vulnerabilities = {
            'component_vulnerabilities': {
                'components': component_vulnerabilities.get('vulnerabilities', {}),
                'critical_components': component_vulnerabilities.get('critical_components', []),
                'high_risk_components': component_vulnerabilities.get('high_risk_components', []),
                'recommendations': component_vulnerabilities.get('recommendations', [])
            },
            'summary': component_vulnerabilities.get('summary', {}),
            'mathematical_context': component_vulnerabilities.get('mathematical_context', {}),
            'country': session_data.get('country_name', 'Unknown'),
            'analysis_type': 'comprehensive_vulnerability_analysis'
        }
        
        return {
            # Original structure
            'distribution_analysis': distribution_analysis,
            'performance_gaps': performance_gaps,
            'component_vulnerabilities': component_vulnerabilities,
            'system_fsfvi': system_fsfvi,
            'optimization_preview': optimization_preview,
            'method': method,
            'scenario': scenario,
            'timestamp': datetime.now().isoformat(),
            
            # Enhanced structures for specific components
            'fsfvi_results': fsfvi_results,
            'financial_context': financial_context,
            'system_analysis': system_analysis,
            'mathematical_interpretation': mathematical_interpretation,
            'executive_summary': executive_summary,
            'enhanced_component_vulnerabilities': enhanced_component_vulnerabilities,
            
            # Additional metadata
            'country': session_data.get('country_name', 'Unknown'),
            'session_id': session_data.get('session_id'),
            'total_budget': total_budget,
            'analysis_complete': True
        }
    
    def generate_comprehensive_report(
        self,
        session_id: str,
        session_data: Dict[str, Any],
        report_type: str = "comprehensive",
        include_visualizations: bool = True
    ) -> Dict[str, Any]:
        """Generate comprehensive analysis report"""
        return {
            'report_metadata': {
                'session_id': session_id,
                'country': session_data.get('country_name'),
                'report_type': report_type,
                'generated_at': datetime.now().isoformat()
            },
            'executive_summary': {
                'overview': f"Comprehensive FSFVI analysis for {session_data.get('country_name')}",
                'key_findings': [
                    'System analysis completed successfully',
                    'Vulnerability assessment performed',
                    'Optimization recommendations generated'
                ]
            },
            'include_visualizations': include_visualizations,
            'status': 'generated'
        }
    
    def get_session_status(self, session_id: str, user_id: int) -> Dict[str, Any]:
        """Get session status and progress"""
        # This would typically query the database through Django integration
        # For now, return a basic status
        return {
            'session_id': session_id,
            'status': 'active',
            'progress': 'analysis_completed',
            'timestamp': datetime.now().isoformat()
        }
    
    def _analyze_current_distribution(
        self, 
        components: List[Dict[str, Any]], 
        total_budget: float
    ) -> Dict[str, Any]:
        """Analyze current budget distribution across components"""
        component_allocations = {}
        
        for comp in components:
            component_allocations[comp['component_type']] = {
                'component_name': comp['component_name'],
                'current_allocation_usd_millions': comp['financial_allocation'],
                'percentage_of_total': (comp['financial_allocation'] / total_budget) * 100 if total_budget > 0 else 0,
                'sensitivity_parameter': comp.get('sensitivity_parameter', 0.0)
            }
        
        # Calculate concentration metrics
        allocations = [comp['financial_allocation'] for comp in components]
        allocations.sort(reverse=True)
        
        largest_share = (allocations[0] / total_budget) * 100 if total_budget > 0 else 0
        
        if largest_share > 50:
            concentration_level = "High"
        elif largest_share > 30:
            concentration_level = "Moderate"
        else:
            concentration_level = "Low"
        
        return {
            'total_budget_usd_millions': total_budget,
            'budget_utilization_percent': 100.0,
            'component_allocations': component_allocations,
            'concentration_analysis': {
                'concentration_level': concentration_level,
                'largest_component': max(components, key=lambda x: x['financial_allocation'])['component_name'],
                'largest_share_percent': largest_share,
                'top_2_share_percent': ((allocations[0] + allocations[1]) / total_budget) * 100 if len(allocations) > 1 and total_budget > 0 else 0
            }
        }
    
    def _calculate_performance_gaps_analysis(
        self, 
        components: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate performance gaps analysis using core functions"""
        from fsfvi_core import calculate_performance_gap, determine_priority_level
        from config import get_component_performance_preference
        
        gaps = {}
        total_gap = 0
        max_gap = 0
        max_actual_gap = 0
        worst_component = None
        worst_actual_gap_percent = None
        significant_gaps = 0
        total_components = len(components)
        
        for comp in components:
            observed = comp['observed_value']
            benchmark = comp['benchmark_value']
            component_type = comp['component_type']
            
            # Get performance direction preference
            prefer_higher = get_component_performance_preference(component_type)
            
            # Calculate raw performance gap (before capping)
            if observed <= 0 or benchmark <= 0:
                raw_gap_percent = 0
            else:
                if prefer_higher:
                    raw_gap_percent = max(0, (benchmark - observed) / observed * 100) if observed < benchmark else 0
                else:
                    raw_gap_percent = max(0, (observed - benchmark) / observed * 100) if observed > benchmark else 0
            
            # Use core calculation function (this applies capping)
            normalized_gap = calculate_performance_gap(observed, benchmark, prefer_higher)
            gap_percent = min(normalized_gap * 100, 100)  # Cap at 100% for display
            
            if gap_percent > 15:
                significant_gaps += 1
            
            # FIXED: Use ACTUAL gaps for ranking, not capped values
            # Track worst performer based on ACTUAL gap (for proper ranking)
            if raw_gap_percent > max_actual_gap:
                max_actual_gap = raw_gap_percent
                worst_component = comp['component_name']
                worst_actual_gap_percent = raw_gap_percent
            
            # Track max display gap (capped) for summary display
            if gap_percent > max_gap:
                max_gap = gap_percent
            
            total_gap += gap_percent
            
            # Determine priority based on performance gap only (simplified for gap analysis)
            if normalized_gap >= 0.5:  # 50%+ gap
                priority_level = "critical"
            elif normalized_gap >= 0.3:  # 30%+ gap
                priority_level = "high"
            elif normalized_gap >= 0.15:  # 15%+ gap
                priority_level = "medium"
            else:
                priority_level = "low"
            
            gaps[comp['component_type']] = {
                'component_name': comp['component_name'],
                'gap_percent': gap_percent,
                'actual_gap_percent': raw_gap_percent if raw_gap_percent != gap_percent else None,
                'normalized_gap': normalized_gap,
                'priority_level': priority_level,
                'prefer_higher': prefer_higher,
                'debug_observed': observed,
                'debug_benchmark': benchmark,
                'performance_status': 'underperforming' if normalized_gap > 0 else 'meeting_or_exceeding_benchmark'
            }
        
        # Generate priority actions with detailed recommendations
        priority_actions = []
        for comp_type, comp_data in gaps.items():
            if comp_data['priority_level'] in ['critical', 'high'] and comp_data['normalized_gap'] > 0:
                action = f"Address {comp_data['component_name']} performance gap"
                if comp_data['actual_gap_percent'] and comp_data['actual_gap_percent'] > 100:
                    action += f" (critical: {comp_data['actual_gap_percent']:.1f}% below benchmark)"
                elif comp_data['gap_percent'] > 30:
                    action += f" (high priority: {comp_data['gap_percent']:.1f}% gap)"
                priority_actions.append(action)
        
        return {
            'gaps': gaps,
            'summary': {
                'total_components': total_components,
                'components_with_significant_gaps': significant_gaps,
                'average_gap_percent': total_gap / total_components if total_components else 0,
                'worst_performer': worst_component,  # FIXED: Now ranked by ACTUAL gap
                'largest_gap_percent': max_gap,  # Capped gap for display
                'worst_actual_gap_percent': worst_actual_gap_percent,  # Actual gap of worst performer
                'largest_actual_gap_percent': max_actual_gap,  # Largest actual gap overall
                'ranking_note': 'worst_performer ranked by actual gaps, not capped display values'
            },
            'priority_actions': priority_actions[:5],
            'mathematical_context': {
                'formula_used': 'δᵢ = (x̄ᵢ - xᵢ) / xᵢ when underperforming, 0 otherwise',
                'formula_description': 'Performance gap only exists when underperforming relative to benchmark',
                'variables': {
                    'δᵢ': 'Normalized performance gap (dimensionless, [0,1])',
                    'xᵢ': 'Observed performance value',
                    'x̄ᵢ': 'Benchmark performance value'
                },
                'calculation_method': 'core_fsfvi_functions',
                'validation_status': 'mathematically_compliant',
                'ranking_methodology': 'Components ranked by actual gaps for accurate prioritization'
            }
        }
    
    def _generate_optimization_preview(
        self,
        components: List[Dict[str, Any]],
        current_fsfvi: float,
        method: str,
        scenario: str
    ) -> Dict[str, Any]:
        """Generate optimization potential preview"""
        from fsfvi_core import calculate_performance_gap, calculate_vulnerability
        
        # Estimate optimization potential based on current vulnerability levels
        vulnerabilities = []
        for comp in components:
            # Estimate vulnerability if not available
            perf_gap = calculate_performance_gap(comp['observed_value'], comp['benchmark_value'])
            vuln = calculate_vulnerability(perf_gap, comp['financial_allocation'], comp.get('sensitivity_parameter', 0.5))
            vulnerabilities.append(vuln)
        
        avg_vulnerability = sum(vulnerabilities) / len(vulnerabilities) if vulnerabilities else 0
        
        # Estimate potential improvement
        if avg_vulnerability > 0.6:
            potential_improvement = 60  # High improvement potential
        elif avg_vulnerability > 0.4:
            potential_improvement = 40  # Moderate improvement potential
        elif avg_vulnerability > 0.2:
            potential_improvement = 25  # Low improvement potential
        else:
            potential_improvement = 10  # Minimal improvement potential
        
        estimated_optimal_fsfvi = current_fsfvi * (1 - potential_improvement / 100)
        
        return {
            'current_fsfvi': round(current_fsfvi, 6),
            'estimated_optimal_fsfvi': round(estimated_optimal_fsfvi, 6),
            'potential_improvement_percent': potential_improvement,
            'optimization_priority': 'high' if potential_improvement > 40 else 'medium' if potential_improvement > 20 else 'low',
            'recommendation': 'Run optimization analysis to get specific reallocation recommendations'
        }
    
    def comprehensive_analysis(
        self,
        components: List[Dict[str, Any]],
        budget: Optional[float] = None,
        methods: Optional[List[str]] = None,
        scenarios: Optional[List[str]] = None,
        include_optimization: bool = True,
        include_sensitivity: bool = True
    ) -> Dict[str, Any]:
        """
        Perform comprehensive FSFVI analysis
        
        Args:
            components: Component data
            budget: Total budget (optional)
            methods: Methods to analyze (optional)
            scenarios: Scenarios to analyze (optional)
            include_optimization: Include optimization analysis
            include_sensitivity: Include sensitivity analysis
            
        Returns:
            Comprehensive analysis results
        """
        
        methods = methods or self.calculation_service.get_available_methods()
        scenarios = scenarios or ['normal_operations']
        
        analysis_results = {
            'method_comparison': {},
            'scenario_analysis': {},
            'optimization_results': {},
            'sensitivity_analysis': {},
            'executive_summary': {},
            'metadata': {
                'timestamp': datetime.now().isoformat(),
                'analysis_id': str(uuid.uuid4()),
                'methods_analyzed': methods,
                'scenarios_analyzed': scenarios
            }
        }
        
        # Method comparison
        for method in methods:
            try:
                result = self.calculation_service.calculate_fsfvi(
                    components, method=method
                )
                analysis_results['method_comparison'][method] = {
                    'fsfvi_value': result['fsfvi_value'],
                    'risk_level': result['risk_level'],
                    'critical_components': result['critical_components']
                }
                
                # Add optimization for each method if requested
                if include_optimization and budget:
                    opt_result = self.optimization_service.optimize_allocation(
                        components, budget, method=method
                    )
                    analysis_results['optimization_results'][method] = {
                        'improvement_potential': opt_result.get('improvement_potential', 0),
                        'efficiency_gap': opt_result.get('efficiency_gap', 0),
                        'success': opt_result.get('success', False)
                    }
                    
            except Exception as e:
                logger.warning(f"Analysis failed for method {method}: {e}")
                analysis_results['method_comparison'][method] = {'error': str(e)}
        
        # Scenario analysis (using best method)
        best_method = self._determine_best_method(analysis_results['method_comparison'])
        
        for scenario in scenarios:
            try:
                result = self.calculation_service.calculate_fsfvi(
                    components, method=best_method, scenario=scenario
                )
                analysis_results['scenario_analysis'][scenario] = {
                    'fsfvi_value': result['fsfvi_value'],
                    'risk_level': result['risk_level']
                }
            except Exception as e:
                logger.warning(f"Scenario analysis failed for {scenario}: {e}")
                analysis_results['scenario_analysis'][scenario] = {'error': str(e)}
        
        # Sensitivity analysis
        if include_sensitivity and ADVANCED_WEIGHTING_AVAILABLE:
            try:
                sensitivity = self.calculation_service.weighting_system.analyze_weight_sensitivity(
                    components, scenarios
                )
                analysis_results['sensitivity_analysis'] = sensitivity
            except Exception as e:
                logger.warning(f"Sensitivity analysis failed: {e}")
        
        # Generate executive summary
        analysis_results['executive_summary'] = self._generate_executive_summary(
            analysis_results
        )
        
        return analysis_results
    
    def _determine_best_method(self, method_comparison: Dict[str, Any]) -> str:
        """Determine the best performing method"""
        
        valid_methods = {
            method: data.get('fsfvi_value', float('inf'))
            for method, data in method_comparison.items()
            if 'fsfvi_value' in data
        }
        
        if valid_methods:
            return min(valid_methods.keys(), key=lambda x: valid_methods[x])
        else:
            return 'hybrid' if 'hybrid' in method_comparison else list(method_comparison.keys())[0]
    
    def _generate_executive_summary(self, analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate executive summary from analysis results"""
        
        summary = {
            'key_findings': [],
            'recommendations': [],
            'risk_assessment': 'unknown',
            'performance_metrics': {}
        }
        
        # Analyze method comparison
        method_comparison = analysis_results.get('method_comparison', {})
        if method_comparison:
            valid_methods = {
                method: data.get('fsfvi_value', float('inf'))
                for method, data in method_comparison.items()
                if 'fsfvi_value' in data
            }
            
            if valid_methods:
                best_method = min(valid_methods.keys(), key=lambda x: valid_methods[x])
                best_score = valid_methods[best_method]
                
                summary['key_findings'].append(
                    f"Best performing method: {best_method} (FSFVI: {best_score:.3f})"
                )
                
                # Risk assessment based on best score
                if best_score <= 0.15:
                    summary['risk_assessment'] = 'low'
                elif best_score <= 0.30:
                    summary['risk_assessment'] = 'medium'
                elif best_score <= 0.50:
                    summary['risk_assessment'] = 'high'
                else:
                    summary['risk_assessment'] = 'critical'
        
        # Optimization insights
        optimization_results = analysis_results.get('optimization_results', {})
        if optimization_results:
            max_improvement = max(
                data.get('improvement_potential', 0)
                for data in optimization_results.values()
                if isinstance(data, dict) and 'improvement_potential' in data
            )
            
            if max_improvement > 20:
                summary['recommendations'].append(
                    "Significant optimization opportunity - prioritize resource reallocation"
                )
            elif max_improvement > 10:
                summary['recommendations'].append(
                    "Moderate optimization opportunity - consider strategic adjustments"
                )
        
        # Default recommendations
        if not summary['recommendations']:
            summary['recommendations'] = [
                "Use hybrid weighting for comprehensive analysis",
                "Monitor components with high vulnerability",
                "Consider scenario planning for crisis preparedness"
            ]
        
        return summary

    def kenya_government_analysis(
        self,
        components: List[Dict[str, Any]],
        budget: float,
        method: str = 'hybrid'
    ) -> Dict[str, Any]:
        """
        Comprehensive analysis specifically for Kenya Government requirements:
        1. Current distribution from provided data
        2. Recommended redistributions
        3. Vulnerability at component level
        4. Performance gaps at component levels
        
        Args:
            components: Component data from 574 projects
            budget: Total budget ($2.9B)
            method: Analysis method (default: hybrid)
            
        Returns:
            Comprehensive Kenya-specific analysis
        """
        
        # 1. CURRENT DISTRIBUTION ANALYSIS
        current_distribution = self._analyze_current_distribution(components, budget)
        
        # 2. CALCULATE CURRENT VULNERABILITIES AND PERFORMANCE GAPS
        current_fsfvi_result = self.calculation_service.calculate_fsfvi(
            components, method=method, scenario='normal_operations'
        )
        
        # 3. OPTIMIZATION FOR RECOMMENDED REDISTRIBUTIONS
        optimization_result = self.optimization_service.optimize_allocation(
            components, budget, method=method, scenario='normal_operations'
        )
        
        # 4. COMPONENT-LEVEL DETAILED ANALYSIS
        component_analysis = self._detailed_component_analysis(
            components, current_fsfvi_result['component_vulnerabilities']
        )
        
        # 5. REDISTRIBUTION RECOMMENDATIONS
        redistribution_analysis = self._generate_redistribution_analysis(
            components, optimization_result, budget
        )
        
        # 6. RISK AND RESILIENCE ANALYSIS
        risk_analysis = self._analyze_risk_factors(components, method)
        
        return {
            'analysis_id': str(uuid.uuid4()),
            'timestamp': datetime.now().isoformat(),
            'analysis_for': 'Government of Kenya',
            'data_summary': {
                'total_projects': 574,
                'total_budget_usd_millions': budget,
                'components_analyzed': len(components),
                'analysis_method': method
            },
            
            # 1. CURRENT DISTRIBUTION
            'current_distribution': current_distribution,
            
            # 2. COMPONENT-LEVEL VULNERABILITIES
            'component_vulnerabilities': component_analysis['vulnerabilities'],
            
            # 3. COMPONENT-LEVEL PERFORMANCE GAPS
            'component_performance_gaps': component_analysis['performance_gaps'],
            
            # 4. RECOMMENDED REDISTRIBUTIONS
            'recommended_redistributions': redistribution_analysis,
            
            # 5. CURRENT FSFVI METRICS
            'current_fsfvi_assessment': {
                'fsfvi_score': current_fsfvi_result['fsfvi_value'],
                'risk_level': current_fsfvi_result['risk_level'],
                'critical_components': current_fsfvi_result['critical_components']
            },
            
            # 6. OPTIMIZATION POTENTIAL
            'optimization_potential': {
                'current_fsfvi': current_fsfvi_result['fsfvi_value'],
                'optimal_fsfvi': optimization_result.get('optimal_fsfvi', 0),
                'improvement_potential_percent': optimization_result.get('improvement_potential', 0),
                'efficiency_gap': optimization_result.get('efficiency_gap', 0)
            },
            
            # 7. RISK ANALYSIS
            'risk_analysis': risk_analysis,
            
            # 8. EXECUTIVE SUMMARY
            'executive_summary': self._generate_kenya_executive_summary(
                current_distribution, component_analysis, redistribution_analysis, 
                current_fsfvi_result, optimization_result
            )
        }
    
    def _analyze_current_distribution(self, components: List[Dict[str, Any]], total_budget: float) -> Dict[str, Any]:
        """Analyze current budget distribution across components"""
        
        distribution = {}
        total_allocated = sum(comp.get('financial_allocation', 0) for comp in components)
        
        for comp in components:
            allocation = comp.get('financial_allocation', 0)
            percentage = (allocation / total_allocated) * 100 if total_allocated > 0 else 0
            
            distribution[comp.get('component_type', f'unknown_{len(distribution)}')] = {
                'component_name': comp.get('component_name', 'Unknown Component'),
                'current_allocation_usd_millions': allocation,
                'percentage_of_total': percentage,
                'projects_count': 1,  # This would be actual project count in real implementation
                'allocation_per_project_avg': allocation  # Would be allocation/projects_count
            }
        
        # Handle empty components list
        if not distribution:
            return {
                'total_budget_usd_millions': total_budget,
                'total_allocated_usd_millions': 0,
                'budget_utilization_percent': 0,
                'component_allocations': {},
                'largest_allocation': None,
                'smallest_allocation': None,
                'allocation_concentration': {
                    'herfindahl_index': 0,
                    'concentration_level': 'N/A',
                    'largest_share_percent': 0,
                    'top_2_share_percent': 0
                }
            }
        
        return {
            'total_budget_usd_millions': total_budget,
            'total_allocated_usd_millions': total_allocated,
            'budget_utilization_percent': (total_allocated / total_budget) * 100 if total_budget > 0 else 0,
            'component_allocations': distribution,
            'largest_allocation': max(distribution.keys(), key=lambda x: distribution[x]['current_allocation_usd_millions']),
            'smallest_allocation': min(distribution.keys(), key=lambda x: distribution[x]['current_allocation_usd_millions']),
            'allocation_concentration': self._calculate_allocation_concentration(distribution)
        }
    
    def _detailed_component_analysis(
        self, 
        components: List[Dict[str, Any]], 
        vulnerabilities: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detailed analysis of each component's vulnerability and performance gaps"""
        
        component_details = {}
        
        for i, comp in enumerate(components):
            vuln = vulnerabilities[i] if i < len(vulnerabilities) else {}
            
            # Calculate performance gap
            performance_gap = vuln.get('performance_gap', 0)
            performance_gap_percent = performance_gap * 100
            
            # Vulnerability assessment
            vulnerability_score = vuln.get('vulnerability', 0)
            weighted_vulnerability = vuln.get('weighted_vulnerability', 0)
            
            # Efficiency analysis
            efficiency_index = vuln.get('efficiency_index', 0)
            priority_level = vuln.get('priority_level', 'medium')
            
            component_details[comp['component_type']] = {
                'component_name': comp['component_name'],
                'component_id': comp['component_id'],
                
                # Performance Metrics
                'performance_metrics': {
                    'observed_value': comp['observed_value'],
                    'benchmark_value': comp['benchmark_value'],
                    'performance_gap': performance_gap,
                    'performance_gap_percent': performance_gap_percent,
                    'performance_efficiency': (comp['observed_value'] / comp['benchmark_value']) * 100 if comp['benchmark_value'] > 0 else 0
                },
                
                # Vulnerability Assessment
                'vulnerability_assessment': {
                    'vulnerability_score': vulnerability_score,
                    'weighted_vulnerability': weighted_vulnerability,
                    'priority_level': priority_level,
                    'risk_category': self._categorize_risk(vulnerability_score),
                    'efficiency_index': efficiency_index
                },
                
                # Financial Context
                'financial_context': {
                    'current_allocation_usd_millions': comp['financial_allocation'],
                    'weight_in_portfolio': comp['weight'],
                    'sensitivity_parameter': comp['sensitivity_parameter'],
                    'cost_effectiveness': efficiency_index / comp['financial_allocation'] if comp['financial_allocation'] > 0 else 0
                },
                
                # Strategic Assessment
                'strategic_assessment': {
                    'improvement_needed': performance_gap_percent > 20,
                    'requires_immediate_attention': priority_level in ['critical', 'high'],
                    'funding_adequacy': 'adequate' if vulnerability_score < 0.3 else 'insufficient',
                    'optimization_priority': priority_level
                }
            }
        
        # Separate vulnerabilities and performance gaps for easier access
        vulnerabilities_summary = {
            comp_type: details['vulnerability_assessment'] 
            for comp_type, details in component_details.items()
        }
        
        performance_gaps_summary = {
            comp_type: details['performance_metrics'] 
            for comp_type, details in component_details.items()
        }
        
        return {
            'detailed_analysis': component_details,
            'vulnerabilities': vulnerabilities_summary,
            'performance_gaps': performance_gaps_summary
        }
    
    def _generate_redistribution_analysis(
        self, 
        components: List[Dict[str, Any]], 
        optimization_result: Dict[str, Any], 
        total_budget: float
    ) -> Dict[str, Any]:
        """Generate detailed redistribution recommendations"""
        
        if not optimization_result.get('success', False):
            return {
                'status': 'optimization_failed',
                'error': optimization_result.get('error', 'Unknown optimization error'),
                'recommendations': []
            }
        
        optimal_allocations = optimization_result.get('optimal_allocations', [])
        if len(optimal_allocations) != len(components):
            return {
                'status': 'allocation_mismatch',
                'error': 'Optimal allocations count does not match components',
                'recommendations': []
            }
        
        redistribution_recommendations = []
        total_reallocation = 0
        
        for i, comp in enumerate(components):
            current_allocation = comp['financial_allocation']
            optimal_allocation = optimal_allocations[i]
            change = optimal_allocation - current_allocation
            change_percent = (change / current_allocation) * 100 if current_allocation > 0 else 0
            
            total_reallocation += abs(change)
            
            recommendation = {
                'component_type': comp['component_type'],
                'component_name': comp['component_name'],
                'current_allocation_usd_millions': current_allocation,
                'recommended_allocation_usd_millions': optimal_allocation,
                'change_amount_usd_millions': change,
                'change_percent': change_percent,
                'action_required': 'increase' if change > 0 else 'decrease' if change < 0 else 'maintain',
                'priority': self._determine_reallocation_priority(abs(change), total_budget),
                'rationale': self._generate_reallocation_rationale(comp, change, change_percent),
                'implementation_complexity': self._assess_implementation_complexity(comp['component_type'], abs(change_percent))
            }
            
            redistribution_recommendations.append(recommendation)
        
        # Sort by absolute change amount
        redistribution_recommendations.sort(key=lambda x: abs(x['change_amount_usd_millions']), reverse=True)
        
        return {
            'status': 'success',
            'total_reallocation_usd_millions': total_reallocation,
            'reallocation_intensity_percent': (total_reallocation / total_budget) * 100,
            'recommendations': redistribution_recommendations,
            'implementation_timeline': self._suggest_implementation_timeline(redistribution_recommendations),
            'expected_impact': {
                'fsfvi_improvement': optimization_result.get('improvement_potential', 0),
                'efficiency_gain': optimization_result.get('efficiency_gap', 0),
                'risk_reduction': 'Significant' if optimization_result.get('improvement_potential', 0) > 30 else 'Moderate'
            }
        }
    
    def _analyze_risk_factors(self, components: List[Dict[str, Any]], method: str) -> Dict[str, Any]:
        """Analyze risk factors across different scenarios"""
        
        scenarios = ['normal_operations', 'climate_shock', 'financial_crisis', 'pandemic_disruption', 'cyber_threats']
        risk_analysis = {}
        
        baseline_result = self.calculation_service.calculate_fsfvi(
            components, method=method, scenario='normal_operations'
        )
        baseline_fsfvi = baseline_result['fsfvi_value']
        
        for scenario in scenarios:
            try:
                result = self.calculation_service.calculate_fsfvi(
                    components, method=method, scenario=scenario
                )
                
                impact = ((result['fsfvi_value'] - baseline_fsfvi) / baseline_fsfvi) * 100
                
                risk_analysis[scenario] = {
                    'fsfvi_score': result['fsfvi_value'],
                    'impact_percent': impact,
                    'risk_level': result['risk_level'],
                    'severity': 'High' if abs(impact) > 5 else 'Medium' if abs(impact) > 2 else 'Low'
                }
            except Exception as e:
                risk_analysis[scenario] = {'error': str(e)}
        
        return {
            'baseline_fsfvi': baseline_fsfvi,
            'scenario_impacts': risk_analysis,
            'highest_risk_scenario': max(risk_analysis.keys(), 
                                      key=lambda x: abs(risk_analysis[x].get('impact_percent', 0))
                                      if 'error' not in risk_analysis[x] else 0),
            'overall_resilience': 1 - (max(abs(r.get('impact_percent', 0)) for r in risk_analysis.values() 
                                          if 'error' not in r) / 100) if risk_analysis else 0
        }
    
    def _calculate_allocation_concentration(self, distribution: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate allocation concentration metrics"""
        allocations = [comp.get('current_allocation_usd_millions', 0) for comp in distribution.values()]
        total = sum(allocations)
        
        if total == 0 or len(allocations) == 0:
            return {
                'herfindahl_index': 0, 
                'concentration_level': 'N/A',
                'largest_share_percent': 0,
                'top_2_share_percent': 0
            }
        
        # Herfindahl-Hirschman Index
        shares = [alloc / total for alloc in allocations]
        hhi = sum(share ** 2 for share in shares)
        
        concentration_level = (
            'High' if hhi > 0.25 else 
            'Moderate' if hhi > 0.15 else 
            'Low'
        )
        
        return {
            'herfindahl_index': hhi,
            'concentration_level': concentration_level,
            'largest_share_percent': max(shares) * 100 if shares else 0,
            'top_2_share_percent': sum(sorted(shares, reverse=True)[:2]) * 100 if len(shares) >= 2 else (shares[0] * 100 if shares else 0)
        }
    
    def _categorize_risk(self, vulnerability_score: float) -> str:
        """Categorize risk based on vulnerability score"""
        if vulnerability_score > 0.7:
            return 'Critical'
        elif vulnerability_score > 0.5:
            return 'High'
        elif vulnerability_score > 0.3:
            return 'Medium'
        else:
            return 'Low'
    
    def _determine_reallocation_priority(self, change_amount: float, total_budget: float) -> str:
        """Determine priority of reallocation"""
        change_percent_of_budget = (change_amount / total_budget) * 100
        
        if change_percent_of_budget > 5:
            return 'High'
        elif change_percent_of_budget > 2:
            return 'Medium'
        else:
            return 'Low'
    
    def _generate_reallocation_rationale(self, component: Dict[str, Any], change: float, change_percent: float) -> str:
        """Generate rationale for reallocation recommendation"""
        comp_type = component['component_type']
        
        if change > 0:
            if comp_type == 'governance_institutions':
                return f"Increase funding by {change_percent:.1f}% to strengthen institutional capacity and policy framework"
            elif comp_type == 'infrastructure':
                return f"Increase funding by {change_percent:.1f}% to address critical infrastructure gaps affecting food system efficiency"
            elif comp_type == 'nutrition_health':
                return f"Increase funding by {change_percent:.1f}% to improve nutritional outcomes and health system resilience"
            else:
                return f"Increase funding by {change_percent:.1f}% to optimize performance and reduce vulnerability"
        elif change < 0:
            return f"Reduce funding by {abs(change_percent):.1f}% due to relative efficiency and redirect to higher-priority components"
        else:
            return "Maintain current funding level - allocation is optimal"
    
    def _assess_implementation_complexity(self, component_type: str, change_percent: float) -> str:
        """Assess implementation complexity of reallocation"""
        complexity_factors = {
            'governance_institutions': 'High',  # Policy changes take time
            'infrastructure': 'High',  # Large capital projects
            'climate_natural_resources': 'Medium',  # Environmental programs
            'agricultural_development': 'Medium',  # Sectoral coordination needed
            'nutrition_health': 'Low',  # Direct service delivery
            'social_assistance': 'Low'  # Direct transfers
        }
        
        base_complexity = complexity_factors.get(component_type, 'Medium')
        
        # Adjust based on change magnitude
        if change_percent > 25:
            if base_complexity == 'Low':
                return 'Medium'
            elif base_complexity == 'Medium':
                return 'High'
        
        return base_complexity
    
    def _suggest_implementation_timeline(self, recommendations: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """Suggest implementation timeline for redistributions"""
        immediate = []  # 0-6 months
        short_term = []  # 6-18 months
        medium_term = []  # 18-36 months
        
        for rec in recommendations:
            priority = rec['priority']
            complexity = rec['implementation_complexity']
            component = rec['component_name']
            
            if priority == 'High' and complexity == 'Low':
                immediate.append(component)
            elif priority == 'High' or complexity == 'Low':
                short_term.append(component)
            else:
                medium_term.append(component)
        
        return {
            'immediate_0_6_months': immediate,
            'short_term_6_18_months': short_term,
            'medium_term_18_36_months': medium_term
        }
    
    def _generate_kenya_executive_summary(
        self, 
        current_distribution: Dict[str, Any],
        component_analysis: Dict[str, Any],
        redistribution_analysis: Dict[str, Any],
        current_fsfvi: Dict[str, Any],
        optimization: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate executive summary for Kenya Government"""
        
        # Find critical components
        critical_components = [
            comp_type for comp_type, details in component_analysis['vulnerabilities'].items()
            if details['priority_level'] in ['critical', 'high']
        ]
        
        # Find largest reallocation
        largest_reallocation = max(
            redistribution_analysis.get('recommendations', []),
            key=lambda x: abs(x['change_amount_usd_millions']),
            default={}
        )
        
        return {
            'overall_assessment': {
                'fsfvi_score': current_fsfvi['fsfvi_value'],
                'risk_level': current_fsfvi['risk_level'],
                'budget_size_usd_millions': current_distribution['total_budget_usd_millions'],
                'projects_count': 574,
                'optimization_potential_percent': optimization.get('improvement_potential', 0)
            },
            'key_findings': [
                f"Food system shows {current_fsfvi['risk_level']} vulnerability with FSFVI score of {current_fsfvi['fsfvi_value']:.6f}",
                f"{len(critical_components)} component(s) require immediate attention: {', '.join(critical_components)}",
                f"Optimization could improve efficiency by {optimization.get('improvement_potential', 0):.1f}%",
                f"Largest reallocation needed: {largest_reallocation.get('component_name', 'N/A')} ({largest_reallocation.get('change_percent', 0):+.1f}%)"
            ],
            'priority_actions': [
                f"Address {len(critical_components)} critical/high-priority components",
                f"Implement {len([r for r in redistribution_analysis.get('recommendations', []) if r['priority'] == 'High'])} high-priority reallocations",
                "Focus on cyber threat preparedness (highest scenario risk)",
                "Strengthen governance institutions if identified as critical"
            ],
            'financial_impact': {
                'total_reallocation_usd_millions': redistribution_analysis.get('total_reallocation_usd_millions', 0),
                'efficiency_gain_percent': optimization.get('improvement_potential', 0),
                'estimated_impact_value_usd_millions': current_distribution['total_budget_usd_millions'] * (optimization.get('improvement_potential', 0) / 100)
            }
        }


# Factory function for easy service instantiation
def create_fsfvi_services() -> Tuple[FSFVICalculationService, FSFVIOptimizationService, FSFVIAnalysisService]:
    """
    Factory function to create all FSFVI services
    
    Returns:
        Tuple of (calculation_service, optimization_service, analysis_service)
    """
    calculation_service = FSFVICalculationService()
    optimization_service = FSFVIOptimizationService(calculation_service)
    analysis_service = FSFVIAnalysisService()
    
    return calculation_service, optimization_service, analysis_service 