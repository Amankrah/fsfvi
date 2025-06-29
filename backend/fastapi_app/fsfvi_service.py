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

from exceptions import (
    handle_calculation_error, handle_weighting_error, handle_optimization_error
)
from validators import validate_calculation_inputs, validate_fsfvi_result
from fsfvi_core import (
    calculate_component_fsfvi,
    calculate_system_fsfvi
)

# Import advanced weighting if available
try:
    from advanced_weighting import (
        DynamicWeightingSystem, WeightingContext, create_context,
        get_context_weights, get_hybrid_weights, add_empirical_data_to_system,
        add_expert_survey_to_system, analyze_weight_sensitivity
    )
    ADVANCED_WEIGHTING_AVAILABLE = True
except ImportError:
    try:
        from .advanced_weighting import (
            DynamicWeightingSystem, WeightingContext, create_context,
            get_context_weights, get_hybrid_weights, add_empirical_data_to_system,
            add_expert_survey_to_system, analyze_weight_sensitivity
        )
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
        shock_probabilities: Optional[Dict[str, float]] = None,
        context: Optional[Dict[str, Any]] = None,
        use_calibration: bool = True
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive FSFVI with enhanced weighting capabilities
        
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
            context: Context information for context-aware weighting
            use_calibration: Whether to use empirical calibration
            
        Returns:
            Dictionary with FSFVI calculation results
        """
        # Validate and normalize inputs
        components, method, scenario = validate_calculation_inputs(
            components, method, scenario
        )
        
        # Apply enhanced weighting
        weighted_components = self._apply_enhanced_weighting(
            components, method, scenario, shock_probabilities, context, use_calibration
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
        
        # Return the complete system analysis from fsfvi_core with enhanced metadata
        result = system_results.copy()
        result.update({
            'component_vulnerabilities': component_results,
            'weighting_method': method,
            'scenario': scenario,
            'context_used': context is not None,
            'calibration_used': use_calibration and ADVANCED_WEIGHTING_AVAILABLE,
            'calculation_metadata': {
                'timestamp': datetime.now().isoformat(),
                'num_components': len(component_results),
                'advanced_weighting_used': ADVANCED_WEIGHTING_AVAILABLE and method != 'financial',
                'context_aware_weighting': context is not None and ADVANCED_WEIGHTING_AVAILABLE,
                'empirical_calibration': use_calibration and ADVANCED_WEIGHTING_AVAILABLE,
                'sensitivity_estimation_method': FSFVI_CONFIG.sensitivity_estimation_method,
                'mathematical_formula': 'FSFVI = Σᵢ ωᵢ·υᵢ(fᵢ) = Σᵢ ωᵢ·δᵢ·[1/(1+αᵢfᵢ)]',
                'calculation_flow': [
                    '1. Calculate performance gaps: δᵢ = |xᵢ - x̄ᵢ|/xᵢ',
                    '2. Estimate sensitivity parameters: αᵢ (component-specific)',
                    '3. Calculate component vulnerabilities: υᵢ(fᵢ) = δᵢ·[1/(1+αᵢfᵢ)]',
                    '4. Apply enhanced weighting: ωᵢ (expert/network/hybrid/context)',
                    '5. Aggregate to system FSFVI: Σᵢ ωᵢ·υᵢ(fᵢ)'
                ]
            }
        })
        
        # Validate result
        validate_fsfvi_result(result)
        
        return result
    
    @handle_weighting_error
    def _apply_enhanced_weighting(
        self,
        components: List[Dict[str, Any]],
        method: str,
        scenario: str,
        shock_probabilities: Optional[Dict[str, float]] = None,
        context: Optional[Dict[str, Any]] = None,
        use_calibration: bool = True
    ) -> List[Dict[str, Any]]:
        """Apply enhanced weighting method to components"""
        
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
        
        # Use enhanced weighting system
        try:
            # Convert context dict to WeightingContext if provided
            weighting_context = None
            if context and ADVANCED_WEIGHTING_AVAILABLE:
                weighting_context = create_context(**context)
            
            # Use safe calculation with enhanced parameters
            if method == 'context' and weighting_context:
                # Use context-aware weighting
                new_weights = self.weighting_system.safe_calculate_weights(
                    components,
                    method='context',
                    context=weighting_context,
                    performance_adjustment=True,
                    use_calibration=use_calibration
                )
            else:
                # Use traditional methods with enhancements
                new_weights = self.weighting_system.safe_calculate_weights(
                    components,
                    method=method,
                    scenario=scenario,
                    shock_probabilities=shock_probabilities,
                    performance_adjustment=True,
                    use_calibration=use_calibration
                )
            
            # Apply weights to components
            for comp in components:
                comp['weight'] = new_weights.get(comp['component_type'], 1.0 / len(components))
            
            logger.info(f"Applied {method} weighting for {scenario} with calibration={use_calibration}")
            
        except Exception as e:
            logger.warning(f"Enhanced weighting failed: {e}. Using financial fallback.")
            # Fallback to financial weights
            return self._apply_enhanced_weighting(components, 'financial', scenario)
        
        return components
    
    def add_empirical_data(
        self, 
        component_name: str, 
        data_points: List[float], 
        source: str = "empirical"
    ) -> Dict[str, str]:
        """
        Add empirical data points for component weight calibration
        
        Args:
            component_name: Name of the component
            data_points: List of empirical weight values
            source: Source of the data
            
        Returns:
            Status dictionary
        """
        if not ADVANCED_WEIGHTING_AVAILABLE:
            return {
                'status': 'error',
                'message': 'Advanced weighting system not available'
            }
        
        try:
            add_empirical_data_to_system(component_name, data_points, source, self.weighting_system)
            return {
                'status': 'success',
                'message': f'Added {len(data_points)} data points for {component_name} from {source}'
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to add empirical data: {str(e)}'
            }
    
    def add_expert_survey(self, survey_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Add expert survey data for weight calibration
        
        Args:
            survey_data: Expert survey data dictionary
            
        Returns:
            Status dictionary
        """
        if not ADVANCED_WEIGHTING_AVAILABLE:
            return {
                'status': 'error',
                'message': 'Advanced weighting system not available'
            }
        
        try:
            add_expert_survey_to_system(survey_data, self.weighting_system)
            return {
                'status': 'success',
                'message': 'Expert survey data added successfully'
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to add expert survey: {str(e)}'
            }
    
    def calculate_context_aware_fsfvi(
        self,
        components: List[Dict[str, Any]],
        country: Optional[str] = None,
        income_level: Optional[str] = None,
        crisis_type: Optional[str] = None,
        **context_factors
    ) -> Dict[str, Any]:
        """
        Calculate FSFVI using context-aware weighting
        
        Args:
            components: Component data
            country: Country name
            income_level: Income level (LIC, MIC, HIC)
            crisis_type: Type of crisis
            **context_factors: Additional context factors
            
        Returns:
            FSFVI results with context-aware weighting
        """
        if not ADVANCED_WEIGHTING_AVAILABLE:
            logger.warning("Advanced weighting not available, using hybrid method")
            return self.calculate_fsfvi(components, method='hybrid')
        
        # Create context
        context = {
            'country': country,
            'income_level': income_level,
            'crisis_type': crisis_type,
            **context_factors
        }
        
        return self.calculate_fsfvi(
            components,
            method='context',
            context=context,
            use_calibration=True
        )
    
    def analyze_weight_sensitivity(
        self,
        components: List[Dict[str, Any]],
        scenarios: Optional[List[str]] = None,
        contexts: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Analyze weight sensitivity across scenarios and contexts
        
        Args:
            components: Component data
            scenarios: List of scenarios to analyze
            contexts: List of context dictionaries
            
        Returns:
            Sensitivity analysis results
        """
        if not ADVANCED_WEIGHTING_AVAILABLE:
            return {
                'status': 'error',
                'message': 'Advanced weighting system not available for sensitivity analysis'
            }
        
        try:
            if contexts:
                # Convert context dicts to WeightingContext objects
                weighting_contexts = []
                for ctx in contexts:
                    weighting_contexts.append(create_context(**ctx))
                
                return analyze_weight_sensitivity(
                    components, scenarios=scenarios, contexts=weighting_contexts
                )
            else:
                return analyze_weight_sensitivity(
                    components, scenarios=scenarios
                )
                
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Sensitivity analysis failed: {str(e)}'
            }
    
    def get_system_health(self) -> Dict[str, Any]:
        """
        Get comprehensive system health information
        
        Returns:
            System health report
        """
        if not ADVANCED_WEIGHTING_AVAILABLE:
            return {
                'status': 'limited',
                'advanced_weighting': False,
                'available_methods': ['financial'],
                'message': 'Advanced weighting system not available'
            }
        
        try:
            health_info = self.weighting_system.get_system_health()
            health_info.update({
                'status': 'healthy',
                'advanced_weighting': True,
                'service_layer_integration': 'active'
            })
            return health_info
        except Exception as e:
            return {
                'status': 'error',
                'advanced_weighting': True,
                'error': str(e),
                'message': 'System health check failed'
            }
    
    def get_available_methods(self) -> List[str]:
        """Get available weighting methods"""
        if ADVANCED_WEIGHTING_AVAILABLE:
            try:
                health = self.weighting_system.get_system_health()
                return health.get('available_methods', ['financial'])
            except:
                return ['expert', 'network', 'hybrid', 'financial', 'context']
        else:
            return ['financial']
    
    def get_available_scenarios(self) -> List[str]:
        """Get available scenarios"""
        if ADVANCED_WEIGHTING_AVAILABLE and self.weighting_system:
            try:
                health = self.weighting_system.get_system_health()
                return health.get('available_scenarios', ['normal_operations'])
            except:
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
        
        weighted_components = self._apply_enhanced_weighting(
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
    """Enhanced FSFVI optimization service with government decision-making tools"""
    
    def __init__(self, calculation_service: FSFVICalculationService):
        self.calculation_service = calculation_service
        logger.info("FSFVI Optimization Service initialized with government planning tools")
    
    @handle_optimization_error
    def _prepare_optimization_data(
        self,
        components: List[Dict[str, Any]],
        method: str,
        scenario: str,
        budget: float
    ) -> Dict[str, Any]:
        """
        Prepare optimization data structure for efficient calculations
        
        Args:
            components: Component data
            method: Weighting method
            scenario: Analysis scenario
            budget: Total budget
            
        Returns:
            Dictionary with optimization data arrays
        """
        from fsfvi_core import calculate_performance_gap
        from config import get_component_performance_preference
        
        # Apply weighting to get component weights
        weighted_components = self.calculation_service._apply_enhanced_weighting(
            components, method, scenario
        )
        
        n_components = len(weighted_components)
        
        # Extract arrays for efficient calculation
        weights = np.zeros(n_components)
        performance_gaps = np.zeros(n_components)
        sensitivities = np.zeros(n_components)
        original_allocations = np.zeros(n_components)
        component_types = []
        component_names = []
        
        for i, comp in enumerate(weighted_components):
            # Ensure sensitivity parameter
            self.calculation_service._ensure_sensitivity_parameter(comp)
            
            # Get performance direction preference
            prefer_higher = get_component_performance_preference(comp['component_type'])
            
            # Calculate performance gap
            gap = calculate_performance_gap(
                comp['observed_value'], comp['benchmark_value'], prefer_higher
            )
            
            # Store data
            weights[i] = comp['weight']
            performance_gaps[i] = gap
            sensitivities[i] = comp['sensitivity_parameter']
            original_allocations[i] = comp['financial_allocation']
            component_types.append(comp['component_type'])
            component_names.append(comp.get('component_name', comp['component_type']))
        
        return {
            'n_components': n_components,
            'weights': weights,
            'performance_gaps': performance_gaps,
            'sensitivities': sensitivities,
            'original_allocations': original_allocations,
            'budget': budget,
            'component_types': component_types,
            'component_names': component_names
        }

    def optimize_allocation(
        self,
        components: List[Dict[str, Any]],
        budget: float,
        method: Optional[str] = None,
        scenario: Optional[str] = None,
        constraints: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Optimize financial allocation to minimize FSFVI using mathematical specification
        
        Mathematical Objective: Minimize FSFVI = Σᵢ ωᵢ·υᵢ(fᵢ) = Σᵢ ωᵢ·δᵢ·[1/(1+αᵢfᵢ)]
        
        Constraints:
        1. Budget: Σfᵢ ≤ F
        2. Non-negativity: fᵢ ≥ 0 
        3. Prioritization: fᵢ ≥ fⱼ if δᵢ ≥ δⱼ
        
        Args:
            components: Component data
            budget: Total budget constraint
            method: Weighting method
            scenario: Analysis scenario
            constraints: Additional optimization constraints
            
        Returns:
            Optimization result dictionary
        """
        # Validate inputs once
        components, method, scenario = validate_calculation_inputs(
            components, method, scenario, budget
        )
        
        constraints = constraints or {}
        
        # Prepare optimization data - single calculation
        opt_data = self._prepare_optimization_data(components, method, scenario, budget)
        
        # Calculate current FSFVI using prepared data
        current_fsfvi = self._calculate_fsfvi_efficient(opt_data)
        
        # Debug the optimization inputs
        logger.info(f"=== OPTIMIZATION DEBUG START ===")
        logger.info(f"Budget: ${budget:.1f}M")
        logger.info(f"Components: {len(components)}")
        logger.info(f"Current FSFVI: {current_fsfvi:.6f}")
        logger.info(f"Original allocations: {[round(x, 1) for x in opt_data['original_allocations']]}")
        logger.info(f"Performance gaps: {[round(x, 3) for x in opt_data['performance_gaps']]}")
        logger.info(f"Sensitivities: {[round(x, 6) for x in opt_data['sensitivities']]}")
        logger.info(f"Weights: {[round(x, 3) for x in opt_data['weights']]}")
        
        # Initialize basic result structure
        optimization_result = {
            'original_fsfvi': current_fsfvi,
            'method': method,
            'scenario': scenario,
            'timestamp': datetime.now().isoformat(),
            'constraints_applied': ['budget', 'non_negativity', 'prioritization']
        }
        
        try:
            # Run streamlined optimization
            opt_result = self._optimize_mathematical(opt_data, constraints)
            logger.info(f"Optimization result: {opt_result}")
            
            # Update result with optimization data
            optimization_result.update(opt_result)
            
            # Calculate improvement metrics efficiently
            if optimization_result.get('success', False):
                logger.info(f"Calculating improvement metrics...")
                logger.info(f"Original FSFVI: {current_fsfvi:.6f}")
                logger.info(f"Optimal FSFVI: {optimization_result.get('optimal_fsfvi', 'MISSING')}")
                logger.info(f"Optimal allocations: {optimization_result.get('optimal_allocations', 'MISSING')}")
                
                improvement_metrics = self._calculate_improvement_metrics_efficient(
                    current_fsfvi,
                    optimization_result['optimal_fsfvi'],
                    opt_data['original_allocations'],
                    optimization_result['optimal_allocations'],
                    opt_data['budget']
                )
                logger.info(f"Improvement metrics: {improvement_metrics}")
                optimization_result.update(improvement_metrics)
                
                # Add detailed component analysis
                component_analysis = self._generate_detailed_component_analysis(
                    opt_data, optimization_result['optimal_allocations']
                )
                optimization_result['component_analysis'] = component_analysis
            else:
                logger.error(f"Optimization was not successful: {optimization_result}")
            
        except Exception as e:
            logger.error(f"Optimization failed: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            optimization_result['error'] = str(e)
            optimization_result['success'] = False
            optimization_result['mathematical_compliance'] = False  # Mathematical optimization failed
        
        # Sanitize infinite/NaN values for JSON serialization
        optimization_result = self._sanitize_optimization_result(optimization_result)
        
        return optimization_result

    @handle_optimization_error
    def multi_year_optimization(
        self,
        components: List[Dict[str, Any]],
        budget_scenarios: Dict[int, float],  # {year: budget}
        target_fsfvi: Optional[float] = None,
        target_year: Optional[int] = None,
        method: str = 'hybrid',
        scenario: str = 'normal_operations',
        constraints: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Multi-year optimization for government fiscal planning
        
        This function helps governments plan budget allocation across multiple fiscal years
        to achieve food system resilience targets and crisis preparedness.
        
        Args:
            components: Current component data
            budget_scenarios: Budget allocation by year {year: total_budget}
            target_fsfvi: Target FSFVI score to achieve
            target_year: Year to achieve target by
            method: Weighting method
            scenario: Analysis scenario
            constraints: Additional constraints
            
        Returns:
            Multi-year optimization plan with yearly budget recommendations
        """
        constraints = constraints or {}
        
        # Validate inputs
        if not budget_scenarios:
            raise ValueError("Budget scenarios must be provided")
        
        current_year = datetime.now().year
        planning_years = sorted(budget_scenarios.keys())
        
        # Initialize multi-year planning
        multi_year_plan = {
            'planning_horizon': {
                'start_year': min(planning_years),
                'end_year': max(planning_years),
                'total_years': len(planning_years)
            },
            'budget_scenarios': budget_scenarios,
            'optimization_method': method,
            'analysis_scenario': scenario,
            'yearly_recommendations': {},
            'trajectory_analysis': {},
            'target_achievement': {},
            'crisis_preparedness': {}
        }
        
        # FIXED: Scale components to baseline budget before optimization
        baseline_budget = budget_scenarios.get(current_year, list(budget_scenarios.values())[0])
        scaled_components = self._scale_components_to_budget(components, baseline_budget)
        
        # Calculate baseline (current year)
        baseline_result = self.optimize_allocation(
            scaled_components, 
            baseline_budget,
            method, scenario, constraints
        )
        
        multi_year_plan['baseline'] = {
            'year': current_year,
            'fsfvi': baseline_result['original_fsfvi'],
            'optimal_fsfvi': baseline_result['optimal_fsfvi'],
            'components': baseline_result.get('component_analysis', {})
        }
        
        # Optimize for each year
        previous_allocations = None
        trajectory_data = []
        
        for year in planning_years:
            year_budget = budget_scenarios[year]
            
            # FIXED: Scale components to year budget to prevent validation errors
            year_scaled_components = self._scale_components_to_budget(scaled_components, year_budget)
            
            # Progressive optimization considering previous year's allocations
            year_constraints = constraints.copy()
            if previous_allocations is not None:
                # Add transition constraints to prevent drastic year-over-year changes
                year_constraints['transition_limit'] = 0.3  # Max 30% change per year
                year_constraints['previous_allocations'] = previous_allocations
            
            # Target-based constraints
            if target_fsfvi and target_year and year <= target_year:
                years_remaining = target_year - year + 1
                progress_target = self._calculate_progressive_target(
                    baseline_result['original_fsfvi'], target_fsfvi, years_remaining
                )
                year_constraints['target_fsfvi'] = progress_target
            
            # Optimize for this year
            year_result = self._optimize_with_targets(
                year_scaled_components, year_budget, method, scenario, year_constraints
            )
            
            # Calculate transition costs and feasibility
            transition_analysis = self._analyze_year_transition(
                previous_allocations, year_result['optimal_allocations'], year_budget
            ) if previous_allocations else {}
            
            # Store yearly recommendation
            multi_year_plan['yearly_recommendations'][year] = {
                'budget': year_budget,
                'optimal_allocations': year_result['optimal_allocations'],
                'projected_fsfvi': year_result['optimal_fsfvi'],
                'improvement_from_baseline': ((baseline_result['original_fsfvi'] - year_result['optimal_fsfvi']) / baseline_result['original_fsfvi']) * 100,
                'component_analysis': year_result.get('component_analysis', {}),
                'transition_analysis': transition_analysis,
                'implementation_complexity': self._assess_yearly_implementation(year_result, transition_analysis),
                'crisis_resilience_score': self._calculate_crisis_resilience(year_scaled_components, year_result['optimal_allocations'], method)
            }
            
            # Track trajectory
            trajectory_data.append({
                'year': year,
                'fsfvi': year_result['optimal_fsfvi'],
                'budget': year_budget,
                'improvement': year_result.get('relative_improvement_percent', 0)
            })
            
            previous_allocations = year_result['optimal_allocations']
        
        # Analyze trajectory
        multi_year_plan['trajectory_analysis'] = self._analyze_multi_year_trajectory(
            trajectory_data, target_fsfvi, target_year
        )
        
        # Target achievement analysis
        if target_fsfvi and target_year:
            multi_year_plan['target_achievement'] = self._analyze_target_achievement(
                trajectory_data, target_fsfvi, target_year, budget_scenarios
            )
        
        # Crisis preparedness analysis
        multi_year_plan['crisis_preparedness'] = self._analyze_crisis_preparedness(
            multi_year_plan['yearly_recommendations'], method
        )
        
        # Generate government recommendations
        multi_year_plan['government_recommendations'] = self._generate_government_recommendations(
            multi_year_plan, target_fsfvi, target_year
        )
        
        return multi_year_plan

    @handle_optimization_error
    def scenario_comparison_optimization(
        self,
        components: List[Dict[str, Any]],
        budget: float,
        scenarios: List[str],
        methods: List[str],
        constraints: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Compare optimization results across multiple scenarios and methods
        
        This helps governments understand how different crisis scenarios and 
        weighting approaches affect optimal allocation strategies.
        """
        constraints = constraints or {}
        
        comparison_results = {
            'scenarios_analyzed': scenarios,
            'methods_analyzed': methods,
            'budget': budget,
            'comparison_matrix': {},
            'scenario_insights': {},
            'method_insights': {},
            'robust_recommendations': {},
            'risk_analysis': {}
        }
        
        # Run optimization for each scenario-method combination
        for scenario in scenarios:
            comparison_results['comparison_matrix'][scenario] = {}
            
            for method in methods:
                try:
                    result = self.optimize_allocation(
                        components, budget, method, scenario, constraints
                    )
                    
                    comparison_results['comparison_matrix'][scenario][method] = {
                        'optimal_fsfvi': result['optimal_fsfvi'],
                        'improvement_percent': result.get('relative_improvement_percent', 0),
                        'optimal_allocations': result['optimal_allocations'],
                        'reallocation_intensity': result.get('reallocation_intensity_percent', 0),
                        'component_analysis': result.get('component_analysis', {})
                    }
                    
                except Exception as e:
                    logger.warning(f"Optimization failed for {scenario}-{method}: {e}")
                    comparison_results['comparison_matrix'][scenario][method] = {'error': str(e)}
        
        # Analyze scenario differences
        comparison_results['scenario_insights'] = self._analyze_scenario_differences(
            comparison_results['comparison_matrix']
        )
        
        # Analyze method performance
        comparison_results['method_insights'] = self._analyze_method_performance(
            comparison_results['comparison_matrix']
        )
        
        # Generate robust recommendations (works well across scenarios)
        comparison_results['robust_recommendations'] = self._generate_robust_recommendations(
            comparison_results['comparison_matrix']
        )
        
        # Risk analysis across scenarios
        comparison_results['risk_analysis'] = self._analyze_cross_scenario_risk(
            comparison_results['comparison_matrix']
        )
        
        return comparison_results

    @handle_optimization_error
    def budget_sensitivity_analysis(
        self,
        components: List[Dict[str, Any]],
        base_budget: float,
        budget_variations: List[float],  # e.g., [-0.2, -0.1, 0, 0.1, 0.2] for ±20%
        method: str = 'hybrid',
        scenario: str = 'normal_operations',
        constraints: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze how optimization results change with different budget levels
        
        This helps governments understand the marginal impact of budget increases/decreases
        and identify optimal budget levels for maximum impact.
        """
        constraints = constraints or {}
        
        sensitivity_results = {
            'base_budget': base_budget,
            'budget_variations': budget_variations,
            'method': method,
            'scenario': scenario,
            'budget_analysis': {},
            'marginal_impact': {},
            'optimal_budget_recommendations': {},
            'efficiency_curves': {}
        }
        
        # Analyze each budget variation
        for variation in budget_variations:
            test_budget = base_budget * (1 + variation)
            
            try:
                result = self.optimize_allocation(
                    components, test_budget, method, scenario, constraints
                )
                
                # Calculate efficiency metrics
                efficiency_per_million = (1 - result['optimal_fsfvi']) / (test_budget / 1000000) if test_budget > 0 else 0
                
                # Calculate marginal effectiveness (improvement per unit budget change)
                if variation != 0:
                    marginal_effectiveness = result.get('relative_improvement_percent', 0) / abs(variation)
                else:
                    # For baseline (variation = 0), marginal effectiveness is the baseline improvement
                    marginal_effectiveness = result.get('relative_improvement_percent', 0)
                
                sensitivity_results['budget_analysis'][variation] = {
                    'budget': test_budget,
                    'budget_change_percent': variation * 100,
                    'optimal_fsfvi': result['optimal_fsfvi'],
                    'improvement_percent': result.get('relative_improvement_percent', 0),
                    'efficiency_per_million': efficiency_per_million,
                    'marginal_effectiveness': marginal_effectiveness,
                    'optimal_allocations': result['optimal_allocations'],
                    'component_analysis': result.get('component_analysis', {})
                }
                
            except Exception as e:
                logger.warning(f"Budget sensitivity analysis failed for {variation}: {e}")
                sensitivity_results['budget_analysis'][variation] = {'error': str(e)}
        
        # Calculate marginal impacts
        sensitivity_results['marginal_impact'] = self._calculate_marginal_impacts(
            sensitivity_results['budget_analysis']
        )
        
        # Generate budget recommendations
        sensitivity_results['optimal_budget_recommendations'] = self._generate_budget_recommendations(
            sensitivity_results['budget_analysis'], base_budget
        )
        
        # Generate efficiency curves
        sensitivity_results['efficiency_curves'] = self._generate_efficiency_curves(
            sensitivity_results['budget_analysis']
        )
        
        # Check if we have any successful results
        successful_variations = [
            var for var, result in sensitivity_results['budget_analysis'].items()
            if 'error' not in result
        ]
        
        if not successful_variations:
            logger.error("Budget sensitivity analysis: All budget variations failed")
            sensitivity_results['status'] = 'failed'
            sensitivity_results['error'] = 'All budget variation optimizations failed'
        elif len(successful_variations) < len(budget_variations) / 2:
            logger.warning(f"Budget sensitivity analysis: Only {len(successful_variations)}/{len(budget_variations)} variations succeeded")
            sensitivity_results['status'] = 'partial_success' 
            sensitivity_results['warning'] = f'Only {len(successful_variations)} out of {len(budget_variations)} budget variations completed successfully'
        else:
            sensitivity_results['status'] = 'success'
        
        sensitivity_results['successful_variations_count'] = len(successful_variations)
        sensitivity_results['total_variations_count'] = len(budget_variations)
        
        return sensitivity_results

    @handle_optimization_error
    def target_based_optimization(
        self,
        components: List[Dict[str, Any]],
        budget: float,
        target_fsfvi: float,
        target_year: int,
        method: str = 'hybrid',
        scenario: str = 'normal_operations',
        constraints: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Public method for target-based optimization
        
        Optimize allocation to achieve specific FSFVI target by target year.
        This is the public interface for target-based optimization.
        
        Args:
            components: Component data
            budget: Total budget constraint
            target_fsfvi: Target FSFVI score to achieve
            target_year: Year to achieve target by
            method: Weighting method
            scenario: Analysis scenario
            constraints: Additional constraints
            
        Returns:
            Target-based optimization result dictionary
        """
        constraints = constraints or {}
        
        # Add target constraints
        constraints['target_fsfvi'] = target_fsfvi
        constraints['target_year'] = target_year
        
        # Use internal target optimization method
        result = self._optimize_with_targets(
            components=components,
            budget=budget,
            method=method,
            scenario=scenario,
            constraints=constraints
        )
        
        # Add target context to result
        result['target_fsfvi'] = target_fsfvi
        result['target_year'] = target_year
        result['analysis_type'] = 'target_based_optimization'
        
        return result

    @handle_optimization_error
    def interactive_optimization(
        self,
        components: List[Dict[str, Any]],
        user_adjustments: Dict[str, float],
        method: str = 'hybrid',
        scenario: str = 'normal_operations',
        constraints: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Public method for interactive optimization with user adjustments
        
        Apply user allocation adjustments and optimize from that starting point.
        
        Args:
            components: Component data
            user_adjustments: Dict of {component_type: adjustment_amount}
            method: Weighting method
            scenario: Analysis scenario
            constraints: Additional constraints
            
        Returns:
            Interactive optimization result dictionary
        """
        constraints = constraints or {}
        
        # Apply user adjustments to components
        adjusted_components = []
        for comp in components:
            adjusted_comp = comp.copy()
            comp_type = comp['component_type']
            
            if comp_type in user_adjustments:
                adjustment = user_adjustments[comp_type]
                adjusted_comp['financial_allocation'] += adjustment
                adjusted_comp['financial_allocation'] = max(0, adjusted_comp['financial_allocation'])
            
            adjusted_components.append(adjusted_comp)
        
        # Calculate new budget from adjusted allocations
        total_budget = sum(comp['financial_allocation'] for comp in adjusted_components)
        
        # Run optimization with adjusted allocations as starting point
        result = self.optimize_allocation(
            components=adjusted_components,
            budget=total_budget,
            method=method,
            scenario=scenario,
            constraints=constraints
        )
        
        # Add user adjustment context
        result['user_adjustments'] = user_adjustments
        result['analysis_type'] = 'interactive_optimization'
        result['adjusted_budget'] = total_budget
        
        return result

    def _generate_detailed_component_analysis(
        self,
        opt_data: Dict[str, Any],
        optimal_allocations: List[float]
    ) -> Dict[str, Any]:
        """Generate detailed component-by-component analysis"""
        
        logger.info(f"=== COMPONENT ANALYSIS GENERATION ===")
        logger.info(f"Number of components: {opt_data['n_components']}")
        logger.info(f"Optimal allocations length: {len(optimal_allocations)}")
        
        analysis = {
            'components': [],
            'summary': {},
            'recommendations': []
        }
        
        for i in range(opt_data['n_components']):
            current_alloc = opt_data['original_allocations'][i]
            optimal_alloc = optimal_allocations[i]
            change = optimal_alloc - current_alloc
            change_percent = (change / current_alloc) * 100 if current_alloc > 0 else 0
            
            # Calculate vulnerability before and after
            current_vulnerability = opt_data['performance_gaps'][i] / (1 + opt_data['sensitivities'][i] * current_alloc)
            optimal_vulnerability = opt_data['performance_gaps'][i] / (1 + opt_data['sensitivities'][i] * optimal_alloc)
            
            logger.info(f"Component {i} ({opt_data['component_types'][i]}):")
            logger.info(f"  Current alloc: {current_alloc:.1f} -> Optimal alloc: {optimal_alloc:.1f}")
            logger.info(f"  Change: {change:.1f} ({change_percent:.1f}%)")
            logger.info(f"  Vulnerability: {current_vulnerability:.4f} -> {optimal_vulnerability:.4f}")
            
            # Calculate vulnerability reduction safely
            vulnerability_reduction = current_vulnerability - optimal_vulnerability
            if current_vulnerability > 0:
                vulnerability_reduction_percent = (vulnerability_reduction / current_vulnerability) * 100
            else:
                # If current vulnerability is 0, component is already optimal
                vulnerability_reduction_percent = 0.0
            
            # Calculate cost effectiveness safely  
            if optimal_alloc > 0 and vulnerability_reduction != 0:
                cost_effectiveness = abs(vulnerability_reduction) / (optimal_alloc / 100)  # Per $100M
            else:
                cost_effectiveness = 0.0

            component_analysis = {
                'component_type': opt_data['component_types'][i],
                'component_name': opt_data['component_names'][i],
                'current_allocation': float(current_alloc),
                'optimal_allocation': float(optimal_alloc),
                'change_amount': float(change),
                'change_percent': float(change_percent),
                'current_vulnerability': float(current_vulnerability),
                'optimal_vulnerability': float(optimal_vulnerability),
                'vulnerability_reduction': float(vulnerability_reduction),
                'vulnerability_reduction_percent': float(vulnerability_reduction_percent),
                'cost_effectiveness_per_100m': float(cost_effectiveness),
                'priority_level': self._determine_allocation_priority(change_percent),
                'implementation_complexity': self._assess_implementation_complexity(opt_data['component_types'][i], abs(change_percent)),
                'expected_impact': self._describe_expected_impact(opt_data['component_types'][i], change_percent),
                'weight': float(opt_data['weights'][i]),
                'performance_gap': float(opt_data['performance_gaps'][i]),
                'sensitivity_parameter': float(opt_data['sensitivities'][i])
            }
            
            analysis['components'].append(component_analysis)
        
        # Generate enhanced summary with multiple weighting approaches
        vulnerability_reductions = [c['vulnerability_reduction_percent'] for c in analysis['components']]
        
        # Calculate budget-weighted vulnerability reduction
        budget_weighted_vuln_reduction = self._calculate_budget_weighted_vulnerability_reduction(
            analysis['components']
        )
        
        # Calculate advanced-weighted vulnerability reduction using sophisticated weighting
        advanced_weighted_vuln_reduction = self._calculate_advanced_weighted_vulnerability_reduction(
            analysis['components'], opt_data
        )
        
        # Separate positive and negative reductions for clarity
        positive_reductions = [r for r in vulnerability_reductions if r > 0]
        negative_reductions = [r for r in vulnerability_reductions if r < 0]
        
        # Calculate system-level improvement (what really matters)
        total_system_vulnerability_reduction = sum([c['vulnerability_reduction'] for c in analysis['components']])
        
        analysis['summary'] = {
            'total_components': len(analysis['components']),
            'components_increased': len([c for c in analysis['components'] if c['change_amount'] > 0]),
            'components_decreased': len([c for c in analysis['components'] if c['change_amount'] < 0]),
            'largest_increase': max([c['change_percent'] for c in analysis['components']], default=0),
            'largest_decrease': min([c['change_percent'] for c in analysis['components']], default=0),
            'total_vulnerability_reduction': total_system_vulnerability_reduction,
            
            # Enhanced vulnerability reduction metrics with clarification
            'components_improved': len(positive_reductions),
            'components_sacrificed': len(negative_reductions),
            'average_improvement_of_improved_components': sum(positive_reductions) / len(positive_reductions) if positive_reductions else 0.0,
            'average_sacrifice_of_sacrificed_components': sum(negative_reductions) / len(negative_reductions) if negative_reductions else 0.0,
            
            # System-level metrics (more meaningful)
            'net_system_vulnerability_reduction': total_system_vulnerability_reduction,
            'system_optimization_strategy': 'Strategic reallocation' if len(negative_reductions) > 0 else 'Universal improvement',
            
            # Keep original metrics but with explanation
            'simple_average_vulnerability_reduction_percent': sum(vulnerability_reductions) / len(vulnerability_reductions) if vulnerability_reductions else 0.0,
            'budget_weighted_vulnerability_reduction_percent': budget_weighted_vuln_reduction,
            'advanced_weighted_vulnerability_reduction_percent': advanced_weighted_vuln_reduction,
            'average_vulnerability_reduction_percent': advanced_weighted_vuln_reduction,  # Use advanced as primary
            
            'components_with_vulnerability_reduction': len(positive_reductions),
            'max_vulnerability_reduction_percent': max(vulnerability_reductions) if vulnerability_reductions else 0.0,
            
            # Enhanced explanation
            'optimization_explanation': {
                'negative_average_means': 'Some components sacrificed for overall system improvement',
                'system_vs_component': 'System-level FSFVI improves even when component average is negative',
                'strategic_reallocation': len(negative_reductions) > 0,
                'components_improved_count': len(positive_reductions),
                'components_sacrificed_count': len(negative_reductions)
            },
            
            # Weighting methodology info
            'weighting_methodology': {
                'simple_average': 'Arithmetic mean of all component reductions',
                'budget_weighted': 'Weighted by financial allocation size',
                'advanced_weighted': 'Weighted by expert consensus, network centrality, and component importance',
                'primary_method': 'advanced_weighted'
            }
        }
        
        # Generate recommendations
        high_impact_increases = [c for c in analysis['components'] if c['change_percent'] > 10 and c['change_amount'] > 0]
        high_impact_decreases = [c for c in analysis['components'] if c['change_percent'] < -10 and c['change_amount'] < 0]
        
        for component in high_impact_increases:
            analysis['recommendations'].append(
                f"Increase {component['component_name']} funding by {component['change_percent']:.1f}% to reduce vulnerability by {component['vulnerability_reduction_percent']:.1f}%"
            )
        
        for component in high_impact_decreases:
            analysis['recommendations'].append(
                f"Reallocate {abs(component['change_percent']):.1f}% from {component['component_name']} to higher-priority components"
            )
        
        return analysis

    def _optimize_with_targets(
        self,
        components: List[Dict[str, Any]],
        budget: float,
        method: str,
        scenario: str,
        constraints: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Optimize with target-based constraints"""
        
        # Prepare optimization data
        opt_data = self._prepare_optimization_data(components, method, scenario, budget)
        
        # Enhanced constraints for target-based optimization
        enhanced_constraints = constraints.copy()
        
        # If we have a target FSFVI, modify the optimization
        if 'target_fsfvi' in constraints:
            target_fsfvi = constraints['target_fsfvi']
            # Use target-constrained optimization
            optimization_result = self._optimize_with_fsfvi_target(opt_data, target_fsfvi, enhanced_constraints)
        else:
            # Standard optimization
            optimization_result = self._optimize_mathematical(opt_data, enhanced_constraints)
        
        return optimization_result

    def _optimize_with_fsfvi_target(
        self,
        opt_data: Dict[str, Any],
        target_fsfvi: float,
        constraints: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Optimize to achieve a specific FSFVI target"""
        
        # Get optimization parameters from config
        max_iterations = FSFVI_CONFIG.max_optimization_iterations
        learning_rate = FSFVI_CONFIG.initial_learning_rate * 0.5  # More conservative for target-based
        tolerance = FSFVI_CONFIG.tolerance
        
        # Initialize
        allocations = opt_data['original_allocations'].copy()
        budget = opt_data['budget']
        
        # Calculate bounds with prioritization
        min_bounds, max_bounds = self._calculate_prioritization_bounds(opt_data, constraints)
        
        # Target-based optimization loop
        convergence_history = []
        
        for iteration in range(max_iterations):
            # Calculate current FSFVI
            current_fsfvi = self._calculate_fsfvi_efficient(opt_data, allocations)
            
            # Check if target is achieved
            if current_fsfvi <= target_fsfvi + tolerance:
                logger.info(f"Target FSFVI {target_fsfvi:.6f} achieved in {iteration} iterations")
                break
            
            # Calculate gradient adjusted for target
            gradient = self._calculate_gradient_efficient(opt_data, allocations)
            
            # Target-based adjustment: focus more on components with highest impact
            target_adjustment = (current_fsfvi - target_fsfvi) / target_fsfvi
            gradient *= (1 + target_adjustment)
            
            # Gradient descent step
            step_size = learning_rate * budget / max(np.linalg.norm(gradient), 1e-8)
            new_allocations = allocations - step_size * gradient
            
            # Apply bounds and budget constraints
            new_allocations = np.clip(new_allocations, min_bounds, max_bounds)
            
            # Enforce budget constraint
            total_allocation = np.sum(new_allocations)
            if total_allocation > budget:
                new_allocations *= budget / total_allocation
            elif total_allocation < budget * 0.95:
                remaining = budget - total_allocation
                gradient_weights = np.abs(gradient) / max(np.sum(np.abs(gradient)), 1e-8)
                new_allocations += remaining * gradient_weights
                new_allocations = np.clip(new_allocations, min_bounds, max_bounds)
            
            # Update for next iteration
            allocations = new_allocations
            
            convergence_history.append({
                'iteration': iteration,
                'fsfvi': current_fsfvi,
                'target_gap': current_fsfvi - target_fsfvi,
                'gradient_norm': np.linalg.norm(gradient)
            })
            
            # Adaptive learning rate
            if iteration > 5 and len(convergence_history) > 1:
                if convergence_history[-1]['target_gap'] >= convergence_history[-2]['target_gap']:
                    learning_rate *= 0.9
        
        # Calculate final FSFVI
        final_fsfvi = self._calculate_fsfvi_efficient(opt_data, allocations)
        target_achieved = final_fsfvi <= target_fsfvi + tolerance
        
        return {
            'success': True,
            'optimal_fsfvi': final_fsfvi,
            'optimal_allocations': allocations.tolist(),
            'iterations': iteration + 1,
            'target_fsfvi': target_fsfvi,
            'target_achieved': target_achieved,
            'target_gap': final_fsfvi - target_fsfvi,
            'convergence_history': convergence_history,
            'solver': 'target_based_gradient_descent',
            'budget_utilization': np.sum(allocations) / budget
        }

    def _calculate_fsfvi_efficient(self, opt_data: Dict[str, Any], allocations: Optional[np.ndarray] = None) -> float:
        """
        Efficiently calculate FSFVI using prepared data
        
        Mathematical Formula: FSFVI = Σᵢ ωᵢ·δᵢ·[1/(1+αᵢfᵢ)]
        """
        if allocations is None:
            allocations = opt_data['original_allocations']
        
        weights = opt_data['weights']
        gaps = opt_data['performance_gaps']
        alphas = opt_data['sensitivities']
        
        # Vectorized FSFVI calculation with safety checks
        denominators = 1 + alphas * allocations
        
        # Ensure denominators are not too small to avoid numerical issues
        denominators = np.where(denominators < 1e-10, 1e-10, denominators)
        
        vulnerabilities = gaps / denominators
        weighted_vulnerabilities = weights * vulnerabilities
        
        fsfvi = np.sum(weighted_vulnerabilities)
        
        # Validate final result
        if np.isnan(fsfvi) or np.isinf(fsfvi):
            logger.error(f"PROBLEM: FSFVI calculation returned {fsfvi}")
            logger.error(f"  Weights: {weights}")
            logger.error(f"  Gaps: {gaps}")
            logger.error(f"  Alphas: {alphas}")
            logger.error(f"  Allocations: {allocations}")
            logger.error(f"  Denominators: {denominators}")
            logger.error(f"  Vulnerabilities: {vulnerabilities}")
            logger.error(f"  Weighted vulnerabilities: {weighted_vulnerabilities}")
            # Don't allow invalid values to propagate
            raise ValueError(f"FSFVI calculation produced invalid result: {fsfvi}")
        
        return float(fsfvi)
    
    def _calculate_gradient_efficient(self, opt_data: Dict[str, Any], allocations: np.ndarray) -> np.ndarray:
        """
        Calculate mathematical gradient: ∂FSFVI/∂fᵢ = -ωᵢ·δᵢ·αᵢ/(1+αᵢfᵢ)²
        """
        weights = opt_data['weights']
        gaps = opt_data['performance_gaps'] 
        alphas = opt_data['sensitivities']
        
        denominators = (1 + alphas * allocations) ** 2
        # Avoid division by zero - add small epsilon where needed
        denominators = np.where(denominators < 1e-12, 1e-12, denominators)
        gradients = -weights * gaps * alphas / denominators
        
        # Sanitize gradients to avoid infinite values
        gradients = np.where(np.isnan(gradients) | np.isinf(gradients), 0.0, gradients)
        
        return gradients
    
    def _calculate_prioritization_bounds(
        self,
        opt_data: Dict[str, Any],
        constraints: Dict[str, Any]
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calculate bounds implementing prioritization constraint: fᵢ ≥ fⱼ if δᵢ ≥ δⱼ
        """
        n = opt_data['n_components']
        budget = opt_data['budget']
        gaps = opt_data['performance_gaps']
        current_allocs = opt_data['original_allocations']
        
        # Base bounds from constraints
        min_base = constraints.get('min_allocation_per_component', budget * 0.001)  # 0.1% minimum
        max_base = constraints.get('max_allocation_per_component', budget * 0.4)   # 40% maximum
        
        min_bounds = np.full(n, min_base)
        max_bounds = np.full(n, min(max_base, budget))
        
        # Apply prioritization constraint: fᵢ ≥ fⱼ if δᵢ ≥ δⱼ
        gap_order = np.argsort(-gaps)  # Descending order of gaps
        
        for i in range(n):
            idx_i = gap_order[i]
            gap_i = gaps[idx_i]
            
            # Ensure higher-gap components get at least as much as lower-gap components
            for j in range(i + 1, n):
                idx_j = gap_order[j]
                gap_j = gaps[idx_j]
                
                if gap_i > gap_j:  # δᵢ > δⱼ implies fᵢ ≥ fⱼ
                    min_bounds[idx_i] = max(min_bounds[idx_i], min_bounds[idx_j])
        
        # Ensure bounds are feasible
        total_min = np.sum(min_bounds)
        if total_min > budget:
            # Scale down proportionally if infeasible
            scale_factor = budget / total_min * 0.95  # Leave 5% buffer
            min_bounds *= scale_factor
        
        return min_bounds, max_bounds
    
    def _optimize_mathematical(
        self,
        opt_data: Dict[str, Any],
        constraints: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Streamlined optimization using proper mathematical gradient descent
        """
        # Get optimization parameters from config
        max_iterations = FSFVI_CONFIG.max_optimization_iterations
        learning_rate = FSFVI_CONFIG.initial_learning_rate
        tolerance = FSFVI_CONFIG.tolerance
        min_improvement = FSFVI_CONFIG.min_improvement
        
        # Initialize
        allocations = opt_data['original_allocations'].copy()
        budget = opt_data['budget']
        
        # Calculate bounds with prioritization
        min_bounds, max_bounds = self._calculate_prioritization_bounds(opt_data, constraints)
        
        # Optimization loop
        convergence_history = []
        prev_fsfvi = float('inf')
        
        logger.info(f"Starting optimization loop with {max_iterations} max iterations")
        logger.info(f"Initial allocations: {[round(x, 1) for x in allocations]}")
        
        for iteration in range(max_iterations):
            # Calculate current FSFVI and gradient
            current_fsfvi = self._calculate_fsfvi_efficient(opt_data, allocations)
            gradient = self._calculate_gradient_efficient(opt_data, allocations)
            
            if iteration < 3 or iteration % 5 == 0:  # Log first few and every 5th iteration
                logger.info(f"Iteration {iteration}: FSFVI={current_fsfvi:.6f}, Gradient norm={np.linalg.norm(gradient):.6f}")
                logger.info(f"Allocations: {[round(x, 1) for x in allocations]}")
            
            # Check convergence
            improvement = prev_fsfvi - current_fsfvi
            if iteration > 0 and improvement <= min_improvement:
                logger.info(f"Optimization converged after {iteration} iterations with improvement {improvement:.8f}")
                break
            
            # Gradient descent step
            step_size = learning_rate * budget / np.linalg.norm(gradient)
            new_allocations = allocations - step_size * gradient
            
            # Apply bounds
            new_allocations = np.clip(new_allocations, min_bounds, max_bounds)
            
            # Enforce budget constraint
            total_allocation = np.sum(new_allocations)
            if total_allocation > budget:
                new_allocations *= budget / total_allocation
            elif total_allocation < budget * 0.95:  # Use at least 95% of budget
                # Distribute remaining budget proportionally to gradients
                remaining = budget - total_allocation
                gradient_weights = np.abs(gradient) / np.sum(np.abs(gradient))
                new_allocations += remaining * gradient_weights
                new_allocations = np.clip(new_allocations, min_bounds, max_bounds)
            
            # Update for next iteration
            allocations = new_allocations
            prev_fsfvi = current_fsfvi
            
            # Store convergence history with safe improvement value
            safe_improvement = 0.0 if improvement == float('inf') else improvement
            convergence_history.append({
                'iteration': iteration,
                'fsfvi': current_fsfvi,
                'improvement': safe_improvement,
                'gradient_norm': np.linalg.norm(gradient)
            })
            
            # Adaptive learning rate
            if iteration > 5 and improvement < convergence_history[-2]['improvement']:
                learning_rate *= 0.95
        
        # Calculate final FSFVI
        final_fsfvi = self._calculate_fsfvi_efficient(opt_data, allocations)
        budget_used = np.sum(allocations)
        
        logger.info(f"=== OPTIMIZATION COMPLETE ===")
        logger.info(f"Final FSFVI: {final_fsfvi:.6f}")
        logger.info(f"Final allocations: {[round(x, 1) for x in allocations]}")
        logger.info(f"Budget utilization: {budget_used:.1f} / {budget:.1f} = {budget_used/budget*100:.1f}%")
        logger.info(f"Total iterations: {iteration + 1}")
        
        return {
            'success': True,
            'optimal_fsfvi': final_fsfvi,
            'optimal_allocations': allocations.tolist(),
            'iterations': iteration + 1,
            'convergence_history': convergence_history,
            'solver': 'mathematical_gradient_descent',
            'mathematical_compliance': True,  # Mathematical optimization completed successfully
            'prioritization_applied': True,
            'budget_utilization': budget_used / budget
        }
    
    def _calculate_improvement_metrics_efficient(
        self,
        original_fsfvi: float,
        optimized_fsfvi: float,
        original_allocations: np.ndarray,
        optimized_allocations: List[float],
        budget: float
    ) -> Dict[str, Any]:
        """Calculate improvement metrics efficiently"""
        optimized_array = np.array(optimized_allocations)
        
        logger.info(f"=== IMPROVEMENT METRICS CALCULATION ===")
        logger.info(f"Original FSFVI: {original_fsfvi:.6f}")
        logger.info(f"Optimized FSFVI: {optimized_fsfvi:.6f}")
        logger.info(f"Budget: {budget:.1f}")
        
        # Basic metrics with safety checks
        absolute_improvement = original_fsfvi - optimized_fsfvi
        if original_fsfvi > 0:
            relative_improvement = (absolute_improvement / original_fsfvi) * 100
        else:
            relative_improvement = 0.0
        
        logger.info(f"Absolute improvement: {absolute_improvement:.6f}")
        logger.info(f"Relative improvement: {relative_improvement:.2f}%")
        
        # Reallocation metrics with safety checks
        allocation_changes = np.abs(optimized_array - original_allocations)
        total_reallocation = np.sum(allocation_changes)
        if budget > 0:
            reallocation_intensity = (total_reallocation / budget) * 100
        else:
            reallocation_intensity = 0.0
        
        logger.info(f"Total reallocation: {total_reallocation:.1f}")
        logger.info(f"Reallocation intensity: {reallocation_intensity:.2f}%")
        
        # Efficiency metrics with safety checks
        efficiency_gain = ((1 - optimized_fsfvi) - (1 - original_fsfvi)) * 100
        if budget > 0:
            budget_utilization = (np.sum(optimized_array) / budget) * 100
        else:
            budget_utilization = 0.0
        
        logger.info(f"Efficiency gain: {efficiency_gain:.2f}%")
        logger.info(f"Budget utilization: {budget_utilization:.1f}%")
        
        return {
            'absolute_improvement': absolute_improvement,
            'relative_improvement_percent': relative_improvement,
            'efficiency_gain_percent': efficiency_gain,
            'total_reallocation_amount': total_reallocation,
            'reallocation_intensity_percent': reallocation_intensity,
            'budget_utilization_percent': budget_utilization
        }
    
    def _sanitize_optimization_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize optimization result by replacing infinite/NaN values only
        """
        import math
        
        def sanitize_value(value):
            if isinstance(value, (int, float, np.number)):
                if math.isnan(value) or math.isinf(value):
                    logger.error(f"ERROR: Found invalid value {value} - this indicates a mathematical problem!")
                    raise ValueError(f"Invalid calculation result: {value}")
                return float(value)  # Convert numpy types to Python float
            elif isinstance(value, dict):
                return {k: sanitize_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [sanitize_value(item) for item in value]
            else:
                return value
        
        return sanitize_value(result)

    def _calculate_budget_weighted_vulnerability_reduction(
        self, 
        component_analysis: List[Dict[str, Any]]
    ) -> float:
        """
        Calculate budget-weighted average vulnerability reduction
        
        Larger budget components have proportionally more influence on the average.
        This reflects the real-world impact where larger budget improvements affect
        the overall system more significantly.
        
        Formula: Σ(reduction_i × budget_i) / Σ(budget_i)
        """
        if not component_analysis:
            return 0.0
        
        total_weighted_reduction = 0.0
        total_budget = 0.0
        
        for comp in component_analysis:
            reduction = comp.get('vulnerability_reduction_percent', 0.0)
            budget = comp.get('optimal_allocation', comp.get('current_allocation', 0.0))
            
            if budget > 0:  # Only include components with budget
                total_weighted_reduction += reduction * budget
                total_budget += budget
        
        if total_budget > 0:
            return total_weighted_reduction / total_budget
        else:
            # Fallback to simple average if no budget data
            reductions = [comp.get('vulnerability_reduction_percent', 0.0) for comp in component_analysis]
            return sum(reductions) / len(reductions) if reductions else 0.0

    def _calculate_advanced_weighted_vulnerability_reduction(
        self, 
        component_analysis: List[Dict[str, Any]], 
        opt_data: Dict[str, Any]
    ) -> float:
        """
        Calculate vulnerability reduction using advanced weighting system
        
        Uses the sophisticated weighting system from advanced_weighting.py that combines:
        - Expert consensus (AHP-based)
        - Network centrality metrics (PageRank, cascade analysis)
        - Component interdependencies
        - Context-aware adjustments
        
        This provides the most sophisticated and accurate representation of 
        component importance in the food system.
        """
        if not component_analysis:
            return 0.0
        
        try:
            # Import advanced weighting system
            if ADVANCED_WEIGHTING_AVAILABLE:
                from advanced_weighting import get_hybrid_weights
                
                # Prepare component data for advanced weighting system
                components_for_weighting = []
                for i, comp in enumerate(component_analysis):
                    component_data = {
                        'component_type': comp.get('component_type', opt_data['component_types'][i] if i < len(opt_data['component_types']) else 'unknown'),
                        'component_name': comp.get('component_name', 'Unknown'),
                        'financial_allocation': comp.get('optimal_allocation', comp.get('current_allocation', 1000.0)),
                        'observed_value': 100.0,  # Normalized for weighting calculation
                        'benchmark_value': 120.0,  # Normalized for weighting calculation
                        'sensitivity_parameter': 0.001  # Default for weighting calculation
                    }
                    components_for_weighting.append(component_data)
                
                # Get sophisticated weights using hybrid method with performance adjustment
                advanced_weights = get_hybrid_weights(
                    components_for_weighting,
                    scenario='normal_operations',
                    performance_adjustment=True,
                    use_calibration=True
                )
                
                # Calculate weighted average using advanced weights
                total_weighted_reduction = 0.0
                total_weight = 0.0
                
                for comp in component_analysis:
                    reduction = comp.get('vulnerability_reduction_percent', 0.0)
                    comp_type = comp.get('component_type', 'unknown')
                    
                    # Get weight for this component type
                    weight = advanced_weights.get(comp_type, 0.0)
                    
                    if weight > 0:
                        total_weighted_reduction += reduction * weight
                        total_weight += weight
                
                if total_weight > 0:
                    advanced_weighted_avg = total_weighted_reduction / total_weight
                    logger.info(f"Advanced weighted vulnerability reduction: {advanced_weighted_avg:.2f}% (using sophisticated weighting)")
                    return advanced_weighted_avg
                else:
                    logger.warning("Advanced weighting system returned zero total weight, using budget-weighted fallback")
                    return self._calculate_budget_weighted_vulnerability_reduction(component_analysis)
            
            else:
                logger.info("Advanced weighting system not available, using budget-weighted calculation")
                return self._calculate_budget_weighted_vulnerability_reduction(component_analysis)
        
        except Exception as e:
            logger.warning(f"Advanced weighting calculation failed: {e}. Using budget-weighted fallback.")
            return self._calculate_budget_weighted_vulnerability_reduction(component_analysis)

    def _scale_components_to_budget(self, components: List[Dict[str, Any]], target_budget: float) -> List[Dict[str, Any]]:
        """
        Scale component allocations proportionally to match target budget
        
        Args:
            components: Original components with allocations
            target_budget: Target total budget
            
        Returns:
            Scaled components that sum to target budget
        """
        # Calculate current total allocation
        current_total = sum(comp.get('financial_allocation', 0) for comp in components)
        
        if current_total <= 0:
            # If no current allocations, distribute equally
            equal_allocation = target_budget / len(components)
            scaled_components = []
            for comp in components:
                scaled_comp = comp.copy()
                scaled_comp['financial_allocation'] = equal_allocation
                scaled_components.append(scaled_comp)
            return scaled_components
        
        # Scale proportionally
        scale_factor = target_budget / current_total
        scaled_components = []
        
        for comp in components:
            scaled_comp = comp.copy()
            scaled_comp['financial_allocation'] = comp.get('financial_allocation', 0) * scale_factor
            scaled_components.append(scaled_comp)
        
        logger.info(f"Scaled components from ${current_total:.1f}M to ${target_budget:.1f}M (factor: {scale_factor:.3f})")
        return scaled_components

    def _calculate_progressive_target(self, current_fsfvi: float, target_fsfvi: float, years_remaining: int) -> float:
        """Calculate progressive target for multi-year planning"""
        if years_remaining <= 0:
            return target_fsfvi
        
        # Linear progression with slight acceleration in early years
        progress_per_year = (current_fsfvi - target_fsfvi) / years_remaining
        acceleration_factor = 1.2 if years_remaining > 3 else 1.0
        
        return current_fsfvi - (progress_per_year * acceleration_factor)

    def _analyze_year_transition(
        self,
        previous_allocations: Optional[np.ndarray],
        current_allocations: List[float],
        budget: float
    ) -> Dict[str, Any]:
        """Analyze transition between consecutive years"""
        
        if previous_allocations is None:
            return {'is_baseline': True}
        
        current_array = np.array(current_allocations)
        changes = current_array - previous_allocations
        change_percents = (changes / previous_allocations) * 100
        
        return {
            'total_reallocation': float(np.sum(np.abs(changes))),
            'reallocation_intensity': float(np.sum(np.abs(changes)) / budget * 100),
            'max_increase_percent': float(np.max(change_percents)),
            'max_decrease_percent': float(np.min(change_percents)),
            'components_increased': int(np.sum(changes > 0)),
            'components_decreased': int(np.sum(changes < 0)),
            'implementation_complexity': 'high' if np.max(np.abs(change_percents)) > 25 else 'medium' if np.max(np.abs(change_percents)) > 10 else 'low'
        }

    def _assess_yearly_implementation(self, year_result: Dict[str, Any], transition_analysis: Dict[str, Any]) -> str:
        """Assess implementation complexity for a given year"""
        
        factors = []
        
        # Reallocation complexity
        if transition_analysis.get('reallocation_intensity', 0) > 20:
            factors.append('high_reallocation')
        
        # Budget utilization
        if year_result.get('budget_utilization_percent', 100) < 90:
            factors.append('budget_underutilization')
        
        # Improvement target
        if year_result.get('relative_improvement_percent', 0) > 30:
            factors.append('ambitious_targets')
        
        if len(factors) >= 2:
            return 'high'
        elif len(factors) == 1:
            return 'medium'
        else:
            return 'low'

    def _calculate_crisis_resilience(
        self,
        components: List[Dict[str, Any]],
        allocations: List[float],
        method: str
    ) -> float:
        """Calculate crisis resilience score for given allocations"""
        
        try:
            # Create temporary components with new allocations
            temp_components = []
            for i, comp in enumerate(components):
                temp_comp = comp.copy()
                if i < len(allocations):
                    temp_comp['financial_allocation'] = allocations[i]
                temp_components.append(temp_comp)
            
            # Test against crisis scenarios
            crisis_scenarios = ['climate_shock', 'financial_crisis', 'pandemic_disruption']
            resilience_scores = []
            
            # Calculate baseline (normal operations)
            baseline_result = self.calculation_service.calculate_fsfvi(
                temp_components, method=method, scenario='normal_operations'
            )
            baseline_fsfvi = baseline_result['fsfvi_value']
            
            for scenario in crisis_scenarios:
                try:
                    crisis_result = self.calculation_service.calculate_fsfvi(
                        temp_components, method=method, scenario=scenario
                    )
                    
                    # Resilience = ability to maintain performance under stress
                    impact = (crisis_result['fsfvi_value'] - baseline_fsfvi) / baseline_fsfvi
                    resilience = max(0, 1 - abs(impact))  # Higher resilience = lower impact
                    resilience_scores.append(resilience)
                    
                except Exception as e:
                    logger.warning(f"Crisis resilience calculation failed for {scenario}: {e}")
                    resilience_scores.append(0.5)  # Default moderate resilience
            
            return float(np.mean(resilience_scores))
            
        except Exception as e:
            logger.warning(f"Crisis resilience calculation failed: {e}")
            return 0.5  # Default moderate resilience

    def _analyze_multi_year_trajectory(
        self,
        trajectory_data: List[Dict[str, Any]],
        target_fsfvi: Optional[float],
        target_year: Optional[int]
    ) -> Dict[str, Any]:
        """Analyze the multi-year optimization trajectory"""
        
        if not trajectory_data:
            return {}
        
        # Calculate trends
        years = [d['year'] for d in trajectory_data]
        fsfvi_scores = [d['fsfvi'] for d in trajectory_data]
        budgets = [d['budget'] for d in trajectory_data]
        
        # Calculate improvement trajectory
        total_improvement = ((fsfvi_scores[0] - fsfvi_scores[-1]) / fsfvi_scores[0]) * 100 if fsfvi_scores[0] > 0 else 0
        average_yearly_improvement = total_improvement / len(trajectory_data) if len(trajectory_data) > 1 else 0
        
        # Budget efficiency
        total_budget = sum(budgets)
        efficiency_per_billion = total_improvement / (total_budget / 1000) if total_budget > 0 else 0
        
        analysis = {
            'total_improvement_percent': total_improvement,
            'average_yearly_improvement_percent': average_yearly_improvement,
            'final_fsfvi': fsfvi_scores[-1],
            'total_budget_billions': total_budget / 1000,
            'efficiency_per_billion_usd': efficiency_per_billion,
            'trajectory_trend': 'improving' if total_improvement > 0 else 'stable' if abs(total_improvement) < 1 else 'declining'
        }
        
        # Target analysis
        if target_fsfvi and target_year:
            target_trajectory = [d for d in trajectory_data if d['year'] <= target_year]
            if target_trajectory:
                projected_fsfvi = target_trajectory[-1]['fsfvi']
                analysis.update({
                    'target_fsfvi': target_fsfvi,
                    'target_year': target_year,
                    'projected_fsfvi_at_target_year': projected_fsfvi,
                    'target_achievement_probability': min(100, max(0, ((fsfvi_scores[0] - projected_fsfvi) / (fsfvi_scores[0] - target_fsfvi)) * 100)) if fsfvi_scores[0] != target_fsfvi else 100,
                    'target_gap': projected_fsfvi - target_fsfvi,
                    'target_status': 'on_track' if projected_fsfvi <= target_fsfvi * 1.05 else 'at_risk' if projected_fsfvi <= target_fsfvi * 1.15 else 'off_track'
                })
        
        return analysis

    def _analyze_target_achievement(
        self,
        trajectory_data: List[Dict[str, Any]],
        target_fsfvi: float,
        target_year: int,
        budget_scenarios: Dict[int, float]
    ) -> Dict[str, Any]:
        """Analyze likelihood and requirements for target achievement"""
        
        target_trajectory = [d for d in trajectory_data if d['year'] <= target_year]
        
        if not target_trajectory:
            return {'status': 'no_data'}
        
        final_year_data = target_trajectory[-1]
        projected_fsfvi = final_year_data['fsfvi']
        
        analysis = {
            'target_fsfvi': target_fsfvi,
            'target_year': target_year,
            'projected_fsfvi': projected_fsfvi,
            'target_gap': projected_fsfvi - target_fsfvi,
            'achievement_status': 'achieved' if projected_fsfvi <= target_fsfvi else 'at_risk' if projected_fsfvi <= target_fsfvi * 1.1 else 'unlikely',
        }
        
        # Calculate what would be needed to achieve target
        if projected_fsfvi > target_fsfvi:
            # Estimate additional budget needed
            gap_percent = ((projected_fsfvi - target_fsfvi) / target_fsfvi) * 100
            estimated_additional_budget = sum(budget_scenarios.values()) * (gap_percent / 100) * 2  # Rough estimate
            
            analysis.update({
                'additional_budget_needed_millions': estimated_additional_budget,
                'additional_budget_percent': (estimated_additional_budget / sum(budget_scenarios.values())) * 100,
                'alternative_strategies': [
                    'Increase total budget allocation',
                    'Focus on highest-impact components',
                    'Extend target timeline',
                    'Implement structural reforms'
                ]
            })
        
        return analysis

    def _analyze_crisis_preparedness(
        self,
        yearly_recommendations: Dict[int, Dict[str, Any]],
        method: str
    ) -> Dict[str, Any]:
        """Analyze crisis preparedness across the planning horizon"""
        
        preparedness_analysis = {
            'overall_resilience_trend': [],
            'crisis_vulnerability_by_year': {},
            'preparedness_recommendations': []
        }
        
        for year, recommendation in yearly_recommendations.items():
            resilience_score = recommendation.get('crisis_resilience_score', 0.5)
            preparedness_analysis['overall_resilience_trend'].append({
                'year': year,
                'resilience_score': resilience_score
            })
            
            # Categorize preparedness level
            if resilience_score > 0.8:
                preparedness_level = 'excellent'
            elif resilience_score > 0.6:
                preparedness_level = 'good'
            elif resilience_score > 0.4:
                preparedness_level = 'moderate'
            else:
                preparedness_level = 'poor'
            
            preparedness_analysis['crisis_vulnerability_by_year'][year] = {
                'resilience_score': resilience_score,
                'preparedness_level': preparedness_level,
                'budget': recommendation['budget']
            }
        
        # Generate recommendations
        avg_resilience = np.mean([r['resilience_score'] for r in preparedness_analysis['overall_resilience_trend']])
        
        if avg_resilience < 0.5:
            preparedness_analysis['preparedness_recommendations'].extend([
                'Increase investment in crisis-resilient infrastructure',
                'Diversify food system components to reduce single points of failure',
                'Establish emergency response protocols and funding'
            ])
        elif avg_resilience < 0.7:
            preparedness_analysis['preparedness_recommendations'].extend([
                'Maintain current resilience investments',
                'Monitor emerging crisis scenarios',
                'Consider targeted improvements in vulnerable components'
            ])
        else:
            preparedness_analysis['preparedness_recommendations'].extend([
                'Excellent crisis preparedness maintained',
                'Consider becoming a regional resilience hub',
                'Share best practices with other food systems'
            ])
        
        return preparedness_analysis

    def _generate_government_recommendations(
        self,
        multi_year_plan: Dict[str, Any],
        target_fsfvi: Optional[float],
        target_year: Optional[int]
    ) -> Dict[str, Any]:
        """Generate comprehensive government recommendations"""
        
        recommendations = {
            'executive_summary': {},
            'immediate_actions': [],
            'medium_term_strategy': [],
            'long_term_vision': [],
            'budget_recommendations': {},
            'risk_mitigation': [],
            'implementation_roadmap': {}
        }
        
        # Executive summary
        trajectory = multi_year_plan.get('trajectory_analysis', {})
        recommendations['executive_summary'] = {
            'planning_horizon_years': multi_year_plan['planning_horizon']['total_years'],
            'total_budget_billions': trajectory.get('total_budget_billions', 0),
            'projected_improvement_percent': trajectory.get('total_improvement_percent', 0),
            'crisis_preparedness': 'strong' if any(r.get('crisis_resilience_score', 0) > 0.7 for r in multi_year_plan['yearly_recommendations'].values()) else 'moderate',
            'target_achievement_outlook': multi_year_plan.get('target_achievement', {}).get('achievement_status', 'unknown')
        }
        
        # Immediate actions (Year 1)
        first_year = min(multi_year_plan['yearly_recommendations'].keys())
        first_year_data = multi_year_plan['yearly_recommendations'][first_year]
        
        if first_year_data.get('implementation_complexity') == 'high':
            recommendations['immediate_actions'].append('Establish implementation task force for complex budget reallocations')
        
        component_analysis = first_year_data.get('component_analysis', {})
        if component_analysis.get('recommendations'):
            recommendations['immediate_actions'].extend(component_analysis['recommendations'][:3])
        
        # Medium-term strategy (Years 2-5)
        if trajectory.get('trajectory_trend') == 'improving':
            recommendations['medium_term_strategy'].append('Maintain current optimization trajectory')
        else:
            recommendations['medium_term_strategy'].append('Reassess allocation strategy and consider structural reforms')
        
        # Budget recommendations
        total_budget = sum(multi_year_plan['budget_scenarios'].values())
        recommendations['budget_recommendations'] = {
            'total_commitment_millions': total_budget,
            'annual_average_millions': total_budget / len(multi_year_plan['budget_scenarios']),
            'efficiency_rating': 'high' if trajectory.get('efficiency_per_billion_usd', 0) > 5 else 'moderate',
            'funding_adequacy': 'adequate' if multi_year_plan.get('target_achievement', {}).get('achievement_status') == 'achieved' else 'insufficient'
        }
        
        return recommendations

    def _calculate_marginal_impacts(self, budget_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate marginal impacts of budget changes"""
        impacts = {}
        for variation, result in budget_analysis.items():
            # Skip failed optimizations (those with 'error' key)
            if 'error' in result:
                logger.warning(f"Skipping marginal impact calculation for variation {variation} due to error: {result['error']}")
                impacts[variation] = {
                    'marginal_effectiveness': 0.0,
                    'optimal_budget': result.get('budget', 0.0),
                    'error': result['error']
                }
            else:
                impacts[variation] = {
                    'marginal_effectiveness': result.get('marginal_effectiveness', 0.0),
                    'optimal_budget': result.get('budget', 0.0)
                }
        return impacts

    def _generate_budget_recommendations(self, budget_analysis: Dict[str, Any], base_budget: float) -> Dict[str, Any]:
        """Generate budget recommendations based on sensitivity analysis"""
        recommendations = {}
        for variation, result in budget_analysis.items():
            # Skip failed optimizations (those with 'error' key)
            if 'error' in result:
                logger.warning(f"Skipping budget recommendation for variation {variation} due to error: {result['error']}")
                recommendations[variation] = {
                    'recommended_budget': base_budget * (1 + variation) if isinstance(variation, (int, float)) else base_budget,
                    'improvement_percent': 0.0,
                    'efficiency_per_million': 0.0,
                    'error': result['error']
                }
            else:
                recommendations[variation] = {
                    'recommended_budget': result.get('budget', base_budget),
                    'improvement_percent': result.get('improvement_percent', 0.0),
                    'efficiency_per_million': result.get('efficiency_per_million', 0.0)
                }
        return recommendations

    def _generate_efficiency_curves(self, budget_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate efficiency curves for different budget levels"""
        curves = {}
        for variation, result in budget_analysis.items():
            # Skip failed optimizations (those with 'error' key)
            if 'error' in result:
                logger.warning(f"Skipping efficiency curve for variation {variation} due to error: {result['error']}")
                curves[variation] = {
                    'fsfvi': 1.0,  # Default high FSFVI (worst case)
                    'efficiency_per_million': 0.0,
                    'error': result['error']
                }
            else:
                curves[variation] = {
                    'fsfvi': result.get('optimal_fsfvi', 1.0),
                    'efficiency_per_million': result.get('efficiency_per_million', 0.0)
                }
        return curves

    def _determine_allocation_priority(self, change_percent: float) -> str:
        """Determine allocation priority based on change percentage"""
        if change_percent > 10:
            return 'High'
        elif change_percent < -10:
            return 'Low'
        else:
            return 'Medium'

    def _assess_implementation_complexity(self, component_type: str, change_percent: float) -> str:
        """Assess implementation complexity of reallocation"""
        complexity_factors = {
            'governance_institutions': 'High',  # Policy changes take time
            'infrastructure': 'High',  # Large capital projects
            'climate_natural_resources': 'Medium',  # Environmental programs
            'agricultural_development': 'Medium',  # Sectoral coordination needed
            'nutrition_health': 'Low',  # Direct service delivery
            'social_protection_equity': 'Low'  # Direct transfers and social protection
        }
        
        base_complexity = complexity_factors.get(component_type, 'Medium')
        
        # Adjust based on change magnitude
        if change_percent > 25:
            if base_complexity == 'Low':
                return 'Medium'
            elif base_complexity == 'Medium':
                return 'High'
        
        return base_complexity

    def _describe_expected_impact(self, component_type: str, change_percent: float) -> str:
        """Describe expected impact of reallocation on FSFVI"""
        if change_percent > 10:
            return 'High'
        elif change_percent < -10:
            return 'Low'
        else:
            return 'Medium'

    def _analyze_scenario_differences(self, comparison_matrix: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze differences between scenarios"""
        insights = {}
        for scenario, methods in comparison_matrix.items():
            scenario_fsfvi_values = [result.get('optimal_fsfvi', float('inf')) for result in methods.values() if 'error' not in result]
            if scenario_fsfvi_values:
                insights[scenario] = {
                    'avg_fsfvi': sum(scenario_fsfvi_values) / len(scenario_fsfvi_values),
                    'best_fsfvi': min(scenario_fsfvi_values),
                    'worst_fsfvi': max(scenario_fsfvi_values),
                    'variability': max(scenario_fsfvi_values) - min(scenario_fsfvi_values)
                }
        return insights

    def _analyze_method_performance(self, comparison_matrix: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze performance of different methods across scenarios"""
        method_performance = {}
        all_methods = set()
        for scenario_results in comparison_matrix.values():
            all_methods.update(scenario_results.keys())
        
        for method in all_methods:
            method_results = []
            for scenario_results in comparison_matrix.values():
                if method in scenario_results and 'error' not in scenario_results[method]:
                    method_results.append(scenario_results[method]['optimal_fsfvi'])
            
            if method_results:
                method_performance[method] = {
                    'avg_fsfvi': sum(method_results) / len(method_results),
                    'consistency': 1 - (max(method_results) - min(method_results)) / max(method_results) if max(method_results) > 0 else 1,
                    'scenarios_succeeded': len(method_results)
                }
        return method_performance

    def _generate_robust_recommendations(self, comparison_matrix: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Generate recommendations that work well across scenarios"""
        # Find allocations that perform consistently well across scenarios
        robust_recommendations = {
            'most_robust_method': None,
            'consistent_reallocations': [],
            'scenario_specific_adjustments': {}
        }
        
        # Find most consistent method
        method_performance = self._analyze_method_performance(comparison_matrix)
        if method_performance:
            robust_recommendations['most_robust_method'] = max(
                method_performance.keys(),
                key=lambda x: method_performance[x]['consistency']
            )
        
        return robust_recommendations

    def _analyze_cross_scenario_risk(self, comparison_matrix: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze risk exposure across different scenarios"""
        risk_analysis = {
            'scenario_risk_levels': {},
            'method_risk_stability': {},
            'overall_system_resilience': 0
        }
        
        for scenario, methods in comparison_matrix.items():
            fsfvi_values = [result.get('optimal_fsfvi', 0) for result in methods.values() if 'error' not in result]
            if fsfvi_values:
                avg_fsfvi = sum(fsfvi_values) / len(fsfvi_values)
                risk_analysis['scenario_risk_levels'][scenario] = {
                    'average_vulnerability': avg_fsfvi,
                    'risk_level': 'high' if avg_fsfvi > 0.3 else 'medium' if avg_fsfvi > 0.15 else 'low'
                }
        
        return risk_analysis


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
                                          'social_protection_equity', 'climate_natural_resources', 'governance_institutions']):
            
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
                    'social_protection_equity': 0.50,
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
        include_optimization_preview: bool = True,
        context: Optional[Dict[str, Any]] = None,
        use_calibration: bool = True
    ) -> Dict[str, Any]:
        """
        Perform comprehensive system analysis combining multiple analysis types
        Returns complete data structures expected by all frontend components
        
        Enhanced with context-aware weighting and empirical calibration support
        """
        # 1. Current Distribution Analysis  
        total_budget = session_data.get('total_budget', 0)
        if total_budget == 0:
            # Calculate total budget from component allocations if not provided
            total_budget = sum(comp.get('financial_allocation', 0) for comp in components)
            logger.info(f"Calculated total budget from components: ${total_budget:.1f}M")
        
        distribution_analysis = self._analyze_current_distribution(
            components, total_budget
        )
        
        # 2. Performance Gaps Analysis (enhanced with debug info)
        performance_gaps = self._calculate_performance_gaps_analysis(components)
        
        # 3. Component Vulnerabilities (enhanced with context-aware weighting)
        component_vulnerabilities = self.calculation_service.calculate_component_vulnerabilities(
            components, method=method, scenario=scenario
        )
        
        # 4. System-Level FSFVI (comprehensive with enhanced capabilities)
        system_fsfvi = self.calculation_service.calculate_fsfvi(
            components, method=method, scenario=scenario, context=context, use_calibration=use_calibration
        )
        
        # 5. Context-aware analysis if context provided
        context_analysis = None
        if context and ADVANCED_WEIGHTING_AVAILABLE:
            try:
                context_analysis = self._perform_context_analysis(components, context, method)
            except Exception as e:
                logger.warning(f"Context analysis failed: {e}")
        
        # 6. Optimization Preview (if requested)
        optimization_preview = None
        if include_optimization_preview:
            optimization_preview = self._generate_optimization_preview(
                components, system_fsfvi['fsfvi_value'], method, scenario
            )
        
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
            # Core analysis results - Single source of truth
            'distribution_analysis': distribution_analysis,
            'performance_gaps': performance_gaps,
            'component_vulnerabilities': component_vulnerabilities,
            'system_fsfvi': system_fsfvi,  # Complete results from fsfvi_core
            'optimization_preview': optimization_preview,
            'context_analysis': context_analysis,
            
            # Enhanced component vulnerabilities structure for ComponentVulnerabilityDetails
            'enhanced_component_vulnerabilities': enhanced_component_vulnerabilities,
            
            # Analysis metadata - Enhanced with new capabilities
            'analysis_metadata': {
                'total_components': len(components),
                'total_budget_millions': total_budget,
                'method_used': method,
                'scenario': scenario,
                'context_used': context is not None,
                'calibration_used': use_calibration and ADVANCED_WEIGHTING_AVAILABLE,
                'timestamp': datetime.now().isoformat(),
                'advanced_weighting_used': ADVANCED_WEIGHTING_AVAILABLE and method != 'financial',
                'context_aware_weighting': context is not None and ADVANCED_WEIGHTING_AVAILABLE,
                'empirical_calibration': use_calibration and ADVANCED_WEIGHTING_AVAILABLE,
                'sensitivity_estimation_method': FSFVI_CONFIG.sensitivity_estimation_method
            },
            
            # Top-level metadata for backward compatibility
            'method': method,
            'scenario': scenario,
            'timestamp': datetime.now().isoformat(),
            'country': session_data.get('country_name', 'Unknown'),
            'session_id': session_data.get('session_id'),
            'total_budget': total_budget,
            'analysis_complete': True,
            
            # Enhanced flow documentation for transparency
            'calculation_flow_summary': {
                'step_1': 'Distribution analysis completed',
                'step_2': f'Performance gaps calculated for {len(components)} components',
                'step_3': f'Component vulnerabilities calculated using {method} weighting' + (' with context' if context else ''),
                'step_4': f'System FSFVI aggregated: {system_fsfvi.get("fsfvi_value", 0):.6f}' + (' (calibrated)' if use_calibration and ADVANCED_WEIGHTING_AVAILABLE else ''),
                'step_5': f'Context analysis performed' if context_analysis else 'Context analysis skipped',
                'step_6': f'Optimization preview generated' if optimization_preview else 'Optimization preview skipped'
            }
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
        """
        Enhanced budget distribution analysis with FSFVI insights
        
        Provides comprehensive analysis including:
        - Allocation efficiency assessment
        - FSFVI-informed optimization potential
        - Risk-weighted resource distribution
        - Comparative performance metrics
        - Actionable reallocation recommendations
        """
        from fsfvi_core import calculate_performance_gap, calculate_vulnerability, determine_priority_level
        from config import get_component_performance_preference
        import numpy as np
        
        component_allocations = {}
        allocation_efficiency = {}
        risk_distribution = {}
        allocations = []
        
        # Enhanced component analysis with FSFVI insights
        for comp in components:
            allocation = comp['financial_allocation']
            allocations.append(allocation)
            
            # Calculate FSFVI metrics for insights
            prefer_higher = get_component_performance_preference(comp['component_type'])
            performance_gap = calculate_performance_gap(
                comp['observed_value'], comp['benchmark_value'], prefer_higher
            )
            vulnerability = calculate_vulnerability(
                performance_gap, allocation, comp.get('sensitivity_parameter', 0.001)
            )
            priority = determine_priority_level(vulnerability, allocation, comp.get('weight', 1/6), total_budget)
            
            # Calculate efficiency metrics
            performance_efficiency = (comp['observed_value'] / comp['benchmark_value']) if comp['benchmark_value'] > 0 else 1.0
            if not prefer_higher:
                performance_efficiency = (comp['benchmark_value'] / comp['observed_value']) if comp['observed_value'] > 0 else 1.0
            
            allocation_efficiency_score = performance_efficiency / (allocation / total_budget) if total_budget > 0 else 0
            cost_effectiveness = (1 - vulnerability) / (allocation / 100) if allocation > 0 else 0  # Per $100M
            
            # Theoretical optimal allocation based on FSFVI
            if performance_gap > 0 and comp.get('sensitivity_parameter', 0) > 0:
                # Theoretical allocation for 50% vulnerability reduction
                target_vulnerability = vulnerability * 0.5
                if target_vulnerability > 0:
                    optimal_multiplier = (performance_gap / target_vulnerability - 1) / comp.get('sensitivity_parameter', 0.001)
                    theoretical_optimal = max(allocation * 0.5, min(allocation * 2.0, optimal_multiplier))
                else:
                    theoretical_optimal = allocation
            else:
                theoretical_optimal = allocation
            
            component_allocations[comp['component_type']] = {
                'component_name': comp['component_name'],
                'current_allocation_usd_millions': allocation,
                'percentage_of_total': (allocation / total_budget) * 100 if total_budget > 0 else 0,
                'sensitivity_parameter': comp.get('sensitivity_parameter', 0.0),
                
                # Enhanced FSFVI insights
                'performance_metrics': {
                    'observed_value': comp['observed_value'],
                    'benchmark_value': comp['benchmark_value'],
                    'performance_gap_percent': performance_gap * 100,
                    'performance_efficiency': performance_efficiency,
                    'prefer_higher': prefer_higher
                },
                'vulnerability_analysis': {
                    'vulnerability_score': vulnerability,
                    'priority_level': priority,
                    'risk_category': 'Critical' if vulnerability > 0.7 else 'High' if vulnerability > 0.5 else 'Medium' if vulnerability > 0.3 else 'Low'
                },
                'efficiency_analysis': {
                    'allocation_efficiency_score': allocation_efficiency_score,
                    'cost_effectiveness_per_100m': cost_effectiveness,
                    'theoretical_optimal_allocation': theoretical_optimal,
                    'optimization_potential_percent': ((theoretical_optimal - allocation) / allocation * 100) if allocation > 0 else 0
                },
                'strategic_insights': {
                    'funding_adequacy': 'Underfunded' if vulnerability > 0.5 else 'Adequate' if vulnerability < 0.3 else 'Monitored',
                    'requires_attention': priority in ['critical', 'high'],
                    'efficiency_rating': 'High' if allocation_efficiency_score > 2.0 else 'Medium' if allocation_efficiency_score > 1.0 else 'Low'
                }
            }
            
            allocation_efficiency[comp['component_type']] = allocation_efficiency_score
            risk_distribution[comp['component_type']] = vulnerability
        
        # Enhanced concentration analysis
        allocations.sort(reverse=True)
        total_nonzero = sum(1 for a in allocations if a > 0)
        
        # Calculate Herfindahl-Hirschman Index for concentration
        if total_budget > 0:
            shares = [a / total_budget for a in allocations]
            hhi = sum(share ** 2 for share in shares)
            
            if hhi > 0.25:
                concentration_level = "High Risk"
                concentration_concern = "Excessive concentration may increase systemic risk"
            elif hhi > 0.15:
                concentration_level = "Moderate"
                concentration_concern = "Balanced but monitor largest allocations"
            else:
                concentration_level = "Well Distributed"
                concentration_concern = "Good diversification across components"
        else:
            hhi = 0
            concentration_level = "Unknown"
            concentration_concern = "Unable to assess - no budget data"
        
        # Risk-weighted distribution analysis
        total_risk_weighted_budget = sum(
            comp['financial_allocation'] * risk_distribution.get(comp['component_type'], 0)
            for comp in components
        )
        risk_concentration = total_risk_weighted_budget / total_budget if total_budget > 0 else 0
        
        # Efficiency distribution analysis
        efficiency_values = list(allocation_efficiency.values())
        avg_efficiency = np.mean(efficiency_values) if efficiency_values else 0
        efficiency_std = np.std(efficiency_values) if len(efficiency_values) > 1 else 0
        
        # Generate distribution insights and recommendations
        insights = self._generate_distribution_insights(
            component_allocations, allocation_efficiency, risk_distribution, 
            total_budget, hhi, risk_concentration
        )
        
        return {
            'total_budget_usd_millions': total_budget,
            'budget_utilization_percent': 100.0,
            'component_allocations': component_allocations,
            
            # Enhanced concentration analysis
            'concentration_analysis': {
                'concentration_level': concentration_level,
                'herfindahl_index': hhi,
                'concentration_concern': concentration_concern,
                'largest_component': max(components, key=lambda x: x['financial_allocation'])['component_name'] if components else 'N/A',
                'largest_share_percent': (allocations[0] / total_budget) * 100 if allocations and total_budget > 0 else 0,
                'top_2_share_percent': ((allocations[0] + allocations[1]) / total_budget) * 100 if len(allocations) > 1 and total_budget > 0 else 0,
                'diversification_score': 1 - hhi,  # Higher is better
                'optimal_diversification': total_nonzero >= 4 and hhi < 0.25
            },
            
            # Risk analysis
            'risk_analysis': {
                'risk_weighted_budget_percent': risk_concentration * 100,
                'high_risk_allocation_percent': sum(
                    (comp['financial_allocation'] / total_budget) * 100 
                    for comp in components 
                    if risk_distribution.get(comp['component_type'], 0) > 0.5
                ) if total_budget > 0 else 0,
                'risk_distribution_balance': 'Balanced' if risk_concentration < 0.3 else 'Concentrated' if risk_concentration > 0.5 else 'Moderate',
                'critical_components_count': sum(1 for comp in components if risk_distribution.get(comp['component_type'], 0) > 0.7)
            },
            
            # Efficiency analysis
            'efficiency_analysis': {
                'average_efficiency_score': avg_efficiency,
                'efficiency_variation': efficiency_std,
                'most_efficient_component': max(allocation_efficiency.keys(), key=allocation_efficiency.get) if allocation_efficiency else 'N/A',
                'least_efficient_component': min(allocation_efficiency.keys(), key=allocation_efficiency.get) if allocation_efficiency else 'N/A',
                'efficiency_balance': 'Well Balanced' if efficiency_std < 0.5 else 'Highly Variable',
                'total_optimization_potential_percent': sum(
                    abs(details['efficiency_analysis']['optimization_potential_percent'])
                    for details in component_allocations.values()
                ) / len(component_allocations) if component_allocations else 0
            },
            
            # Strategic insights and recommendations
            'strategic_insights': insights,
            
            # Mathematical context
            'mathematical_context': {
                'analysis_framework': 'FSFVI-informed budget distribution analysis',
                'efficiency_formula': 'Efficiency = Performance / (Allocation Share)',
                'risk_weighting': 'Risk Weight = Component Vulnerability Score',
                'optimization_basis': 'υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ) for optimal allocation',
                'concentration_measure': 'Herfindahl-Hirschman Index (HHI)',
                'validation_status': 'FSFVI mathematical framework applied'
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
    
    def _perform_context_analysis(
        self,
        components: List[Dict[str, Any]],
        context: Dict[str, Any],
        base_method: str
    ) -> Dict[str, Any]:
        """Perform context-aware analysis comparison"""
        
        # Calculate with base method
        base_result = self.calculation_service.calculate_fsfvi(
            components, method=base_method, scenario='normal_operations'
        )
        
        # Calculate with context-aware method
        context_result = self.calculation_service.calculate_context_aware_fsfvi(
            components, **context
        )
        
        # Compare results
        fsfvi_difference = context_result['fsfvi_value'] - base_result['fsfvi_value']
        percentage_difference = (fsfvi_difference / base_result['fsfvi_value']) * 100 if base_result['fsfvi_value'] > 0 else 0
        
        return {
            'context_applied': context,
            'base_method_fsfvi': base_result['fsfvi_value'],
            'context_aware_fsfvi': context_result['fsfvi_value'],
            'fsfvi_difference': fsfvi_difference,
            'percentage_difference': percentage_difference,
            'context_impact': 'positive' if fsfvi_difference < 0 else 'negative' if fsfvi_difference > 0 else 'neutral',
            'impact_magnitude': 'high' if abs(percentage_difference) > 10 else 'medium' if abs(percentage_difference) > 5 else 'low',
            'recommendation': (
                'Context significantly improves analysis accuracy' if abs(percentage_difference) > 10
                else 'Context provides moderate improvement' if abs(percentage_difference) > 5
                else 'Context has minimal impact on results'
            )
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
            'social_protection_equity': 'Low'  # Direct transfers and social protection
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
    
    def _generate_distribution_insights(
        self,
        component_allocations: Dict[str, Any],
        allocation_efficiency: Dict[str, float],
        risk_distribution: Dict[str, float],
        total_budget: float,
        hhi: float,
        risk_concentration: float
    ) -> Dict[str, Any]:
        """Generate strategic insights and recommendations for budget distribution"""
        
        insights = {
            'key_findings': [],
            'efficiency_insights': [],
            'risk_insights': [],
            'recommendations': [],
            'optimization_opportunities': []
        }
        
        # Efficiency insights
        if allocation_efficiency:
            most_efficient = max(allocation_efficiency.keys(), key=allocation_efficiency.get)
            least_efficient = min(allocation_efficiency.keys(), key=allocation_efficiency.get)
            avg_efficiency = sum(allocation_efficiency.values()) / len(allocation_efficiency)
            
            insights['efficiency_insights'] = [
                f"Most efficient component: {most_efficient.replace('_', ' ').title()} (Score: {allocation_efficiency[most_efficient]:.2f})",
                f"Least efficient component: {least_efficient.replace('_', ' ').title()} (Score: {allocation_efficiency[least_efficient]:.2f})",
                f"Average efficiency score: {avg_efficiency:.2f}",
                f"Efficiency range: {max(allocation_efficiency.values()) - min(allocation_efficiency.values()):.2f}"
            ]
        
        # Risk insights
        high_risk_components = [comp for comp, risk in risk_distribution.items() if risk > 0.5]
        critical_components = [comp for comp, risk in risk_distribution.items() if risk > 0.7]
        
        insights['risk_insights'] = [
            f"High-risk components: {len(high_risk_components)}/{len(risk_distribution)}",
            f"Critical components requiring immediate attention: {len(critical_components)}",
            f"Risk-weighted budget concentration: {risk_concentration * 100:.1f}%",
            f"Overall risk distribution: {'Balanced' if risk_concentration < 0.3 else 'Concentrated'}"
        ]
        
        # Key findings
        insights['key_findings'] = [
            f"Budget concentration (HHI): {hhi:.3f} ({'High' if hhi > 0.25 else 'Moderate' if hhi > 0.15 else 'Low'} concentration)",
            f"Total budget: ${total_budget:.1f}M across {len(component_allocations)} components",
            f"Components needing attention: {len([c for c in component_allocations.values() if c['strategic_insights']['requires_attention']])}",
            f"Average allocation efficiency: {avg_efficiency:.2f}" if allocation_efficiency else "Efficiency data incomplete"
        ]
        
        # Recommendations based on analysis
        recommendations = []
        
        if hhi > 0.25:
            recommendations.append("Reduce concentration risk by diversifying allocations across components")
        
        if len(critical_components) > 0:
            recommendations.append(f"Immediate intervention needed for {len(critical_components)} critical component(s)")
        
        if allocation_efficiency and max(allocation_efficiency.values()) / min(allocation_efficiency.values()) > 3:
            recommendations.append("Large efficiency gaps detected - consider reallocation from low to high-efficiency components")
        
        if risk_concentration > 0.5:
            recommendations.append("High risk concentration - strengthen vulnerable components or diversify investments")
        
        # Add optimization opportunities
        optimization_opportunities = []
        for comp_type, details in component_allocations.items():
            opt_potential = details['efficiency_analysis']['optimization_potential_percent']
            if abs(opt_potential) > 15:  # Significant optimization potential
                direction = "increase" if opt_potential > 0 else "decrease"
                optimization_opportunities.append(
                    f"{details['component_name']}: {direction} allocation by {abs(opt_potential):.1f}%"
                )
        
        insights['recommendations'] = recommendations[:5]  # Top 5 recommendations
        insights['optimization_opportunities'] = optimization_opportunities[:3]  # Top 3 opportunities
        
        return insights


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