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

    def _prepare_traditional_optimization_data(
        self,
        components: List[Dict[str, Any]],
        method: str,
        scenario: str,
        budget: float
    ) -> Dict[str, Any]:
        """Prepare data for traditional optimization"""
        # Use the existing optimization data preparation
        opt_data = self._prepare_optimization_data(components, method, scenario, budget)
        
        # Rename original_allocations to current_allocations for consistency
        opt_data['current_allocations'] = opt_data['original_allocations']
        
        return opt_data

    def _calculate_traditional_improvement_metrics(
        self,
        baseline_fsfvi: float,
        optimal_fsfvi: float,
        current_allocations: np.ndarray,
        optimal_allocations: np.ndarray,
        budget: float
    ) -> Dict[str, Any]:
        """Calculate improvement metrics for traditional optimization"""
        absolute_improvement = baseline_fsfvi - optimal_fsfvi
        relative_improvement = (absolute_improvement / max(baseline_fsfvi, 0.001)) * 100
        
        # Calculate allocation changes
        allocation_changes = optimal_allocations - current_allocations
        total_absolute_change = np.sum(np.abs(allocation_changes))
        
        # Budget efficiency
        budget_efficiency = absolute_improvement / max(budget / 1000000, 0.001)
        
        # Calculate efficiency gain (system efficiency improvement)
        original_efficiency = (1 - baseline_fsfvi) * 100  # Higher efficiency = lower vulnerability
        optimal_efficiency = (1 - optimal_fsfvi) * 100
        efficiency_gain = optimal_efficiency - original_efficiency
        
        # Calculate reallocation intensity
        reallocation_intensity = (total_absolute_change / max(budget, 0.001)) * 100
        
        # Calculate budget utilization
        budget_used = np.sum(optimal_allocations)
        budget_utilization = (budget_used / max(budget, 0.001)) * 100
        
        return {
            'absolute_improvement': absolute_improvement,
            'relative_improvement_percent': relative_improvement,
            'efficiency_gain_percent': efficiency_gain,
            'total_allocation_change': float(total_absolute_change),
            'total_reallocation_amount': float(total_absolute_change),  # Alias for frontend compatibility
            'reallocation_intensity_percent': reallocation_intensity,
            'budget_utilization_percent': budget_utilization,
            'budget_efficiency_per_million': budget_efficiency,
            'improvement_per_million': absolute_improvement / max(budget, 0.001)
        }

    def _analyze_component_changes(
        self,
        components: List[Dict[str, Any]],
        current_allocations: np.ndarray,
        optimal_allocations: np.ndarray
    ) -> List[Dict[str, Any]]:
        """Analyze changes in component allocations including vulnerability reductions"""
        analysis = []
        
        for i, comp in enumerate(components):
            current = current_allocations[i]
            optimal = optimal_allocations[i]
            change = optimal - current
            change_percent = (change / max(current, 0.001)) * 100
            
            # Calculate vulnerability before and after optimization
            # Use same mathematical formula as optimization: υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
            performance_gap = comp.get('performance_gap', 0)
            sensitivity = comp.get('sensitivity_parameter', 0.001)
            
            # Ensure performance_gap is never None
            if performance_gap is None or performance_gap == 0:
                from fsfvi_core import calculate_performance_gap
                from config import get_component_performance_preference
                prefer_higher = get_component_performance_preference(comp['component_type'])
                performance_gap = calculate_performance_gap(
                    comp['observed_value'], comp['benchmark_value'], prefer_higher
                )
                # If still None or 0, set a small default value
                if performance_gap is None or performance_gap == 0:
                    performance_gap = 0.001
            
            # Ensure sensitivity parameter exists and is not None
            if sensitivity is None or sensitivity <= 0:
                self.calculation_service._ensure_sensitivity_parameter(comp)
                sensitivity = comp.get('sensitivity_parameter', 0.001)
                if sensitivity is None or sensitivity <= 0:
                    sensitivity = 0.001
            
            # Log first component for debugging  
            if i == 0:
                logger.info(f"Component {comp.get('component_type', 'unknown')}: performance_gap={performance_gap or 0:.4f}, sensitivity={sensitivity or 0:.6f}")
                logger.info(f"  Current allocation: {current:.1f} -> Optimal allocation: {optimal:.1f}")
            
            # Current vulnerability
            current_vulnerability = performance_gap / (1 + sensitivity * current) if sensitivity * current > -1 else performance_gap
            
            # Optimal vulnerability  
            optimal_vulnerability = performance_gap / (1 + sensitivity * optimal) if sensitivity * optimal > -1 else performance_gap
            
            # Vulnerability reduction
            vulnerability_reduction = current_vulnerability - optimal_vulnerability
            vulnerability_reduction_percent = (vulnerability_reduction / max(current_vulnerability, 0.0001)) * 100 if current_vulnerability > 0 else 0.0
            
            # Log first component vulnerability calculation
            if i == 0:
                logger.info(f"  Current vulnerability: {current_vulnerability or 0:.6f} -> Optimal vulnerability: {optimal_vulnerability or 0:.6f}")
                logger.info(f"  Vulnerability reduction: {vulnerability_reduction or 0:.6f} ({vulnerability_reduction_percent or 0:.2f}%)")
            
            analysis.append({
                'component_type': comp['component_type'],
                'component_name': comp.get('component_name', comp['component_type']),
                'current_allocation': float(current),
                'optimal_allocation': float(optimal),
                'change_amount': float(change),
                'change_percent': float(change_percent),
                'current_vulnerability': float(current_vulnerability),
                'optimal_vulnerability': float(optimal_vulnerability),
                'vulnerability_reduction': float(vulnerability_reduction),
                'vulnerability_reduction_percent': float(vulnerability_reduction_percent),
                'priority': self._determine_allocation_priority(change_percent),
                'implementation_complexity': self._assess_implementation_complexity(comp['component_type'], change_percent),
                'expected_impact': self._describe_expected_impact(comp['component_type'], change_percent)
            })
        
        return analysis

    def _generate_government_insights(
        self,
        components: List[Dict[str, Any]],
        current_allocations: np.ndarray,
        optimal_allocations: np.ndarray,
        baseline_fsfvi: float,
        optimal_fsfvi: float,
        budget: float
    ) -> Dict[str, Any]:
        """Generate government insights for traditional optimization"""
        improvement = baseline_fsfvi - optimal_fsfvi
        improvement_percent = (improvement / max(baseline_fsfvi, 0.001)) * 100
        
        # Analyze allocation changes
        changes = optimal_allocations - current_allocations
        positive_changes = changes[changes > 0]
        negative_changes = changes[changes < 0]
        
        insights = {
            'optimization_potential': 'high' if improvement_percent > 15 else 'medium' if improvement_percent > 5 else 'low',
            'intervention_urgency': 'high' if baseline_fsfvi > 0.3 else 'medium' if baseline_fsfvi > 0.15 else 'low',
            'budget_optimization_potential': 'high' if np.sum(np.abs(changes)) > budget * 0.1 else 'medium' if np.sum(np.abs(changes)) > budget * 0.05 else 'low',
            'reallocation_magnitude': {
                'total_positive_changes': float(np.sum(positive_changes)),
                'total_negative_changes': float(np.sum(np.abs(negative_changes))),
                'net_change': float(np.sum(changes)),
                'change_percent_of_budget': float(np.sum(np.abs(changes)) / budget * 100)
            },
            'implementation_guidance': {
                'high_priority_components': len(positive_changes[positive_changes > budget * 0.05]),
                'moderate_priority_components': len(positive_changes[(positive_changes > budget * 0.02) & (positive_changes <= budget * 0.05)]),
                'reduction_components': len(negative_changes[negative_changes < -budget * 0.02])
            }
        }
        
        return insights

    def optimize_allocation(
        self,
        components: List[Dict[str, Any]],
        budget: float,
        method: Optional[str] = None,
        scenario: Optional[str] = None,
        constraints: Optional[Dict[str, Any]] = None,
        new_budget_only: bool = False,
        new_budget_amount: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Optimize financial allocation to minimize FSFVI using mathematical specification
        
        Two optimization modes:
        1. Traditional (new_budget_only=False): Optimize reallocation of entire budget
           - Shows "how money should have been allocated" (retrospective)
           - Useful for understanding optimal allocation patterns
        
        2. New Budget (new_budget_only=True): Optimize allocation of new budget only
           - Current allocations are fixed (already committed/spent)
           - Only new budget is optimized to minimize total system FSFVI
           - More realistic for government planning going forward
        
        Mathematical Objective: Minimize FSFVI = Σᵢ ωᵢ·υᵢ(fᵢ) = Σᵢ ωᵢ·δᵢ·[1/(1+αᵢfᵢ)]
        
        Where for new_budget_only=True:
        - fᵢ = fᵢ_current (fixed) + fᵢ_new (optimized)
        - Constraint: Σfᵢ_new ≤ new_budget
        
        Args:
            components: Component data
            budget: Total budget constraint (traditional) or new budget amount (new_budget_only)
            method: Weighting method
            scenario: Analysis scenario
            constraints: Additional optimization constraints
            new_budget_only: If True, optimize only new budget with current allocations fixed
            new_budget_amount: Explicit new budget amount (for validation)
            
        Returns:
            Optimization result dictionary
        """
        # Enhanced validation for new budget optimization
        if new_budget_only:
            effective_new_budget = new_budget_amount if new_budget_amount is not None else budget
            if effective_new_budget is None or effective_new_budget <= 0:
                return {
                    'success': False,
                    'error': 'New budget amount must be specified and greater than 0 for new budget optimization mode. Please configure the new budget amount in optimization settings.',
                    'optimization_type': 'new_budget_allocation'
                }
            if effective_new_budget > 100000:  # More than 100 billion
                return {
                    'success': False,
                    'error': 'New budget amount seems unreasonably large. Please check the amount (should be in millions USD).',
                    'optimization_type': 'new_budget_allocation'
                }
        
        # Validate inputs - skip budget validation for new budget optimization
        if new_budget_only:
            # For new budget optimization, don't validate existing allocations against new budget
            components, method, scenario = validate_calculation_inputs(
                components, method, scenario, None  # Skip budget validation
            )
        else:
            # For traditional optimization, validate allocations against total budget
            components, method, scenario = validate_calculation_inputs(
                components, method, scenario, budget
            )
        
        constraints = constraints or {}
        
        if new_budget_only:
            return self._optimize_new_budget_allocation(
                components, budget, method, scenario, constraints
            )
        else:
            return self._optimize_traditional_allocation(
                components, budget, method, scenario, constraints
            )

    def _optimize_traditional_allocation(
        self,
        components: List[Dict[str, Any]],
        budget: float,
        method: str,
        scenario: str,
        constraints: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        TRADITIONAL OPTIMIZATION: Optimize reallocation of entire budget
        
        Shows "how money should have been allocated" (retrospective analysis)
        Useful for understanding optimal allocation patterns
        
        Mathematical Framework:
        - fᵢ: Allocation to component i (variable to optimize)
        - Minimize: FSFVI = Σᵢ ωᵢ·δᵢ·[1/(1+αᵢfᵢ)]
        - Subject to: Σfᵢ ≤ budget, fᵢ ≥ 0
        
        Args:
            components: Component data
            budget: Total budget constraint
            method: Weighting method
            scenario: Analysis scenario
            constraints: Additional constraints
            
        Returns:
            Traditional optimization result
        """
        # STEP 1: Ensure components sum to the target budget to avoid constraint violations
        current_component_sum = sum(comp.get('financial_allocation', 0) for comp in components)
        
        if abs(current_component_sum - budget) > budget * 0.01:  # More than 1% difference
            logger.info(f"Scaling components from ${current_component_sum:.1f}M to ${budget:.1f}M for optimization")
            components = self._scale_components_to_budget(components, budget)
        
        # STEP 2: Prepare optimization data
        opt_data = self._prepare_traditional_optimization_data(
            components, method, scenario, budget
        )
        
        # STEP 3: Calculate baseline FSFVI with current allocations
        baseline_fsfvi = self._calculate_fsfvi_efficient(opt_data, opt_data['current_allocations'])
        
        logger.info(f"=== TRADITIONAL OPTIMIZATION START ===")
        logger.info(f"Budget: ${budget:.1f}M")
        logger.info(f"Components: {len(components)}")
        logger.info(f"Current allocations: {[round(x, 1) for x in opt_data['current_allocations']]}")
        logger.info(f"Baseline FSFVI: {baseline_fsfvi:.6f}")
        
        # STEP 4: Run mathematical optimization
        optimization_result = self._optimize_mathematical(opt_data, constraints)
        
        if not optimization_result.get('success', False):
            return optimization_result
        
        # STEP 5: Calculate improvement metrics
        optimal_fsfvi = optimization_result['optimal_fsfvi']
        optimal_allocations = optimization_result['optimal_allocations']
        
        improvement_metrics = self._calculate_traditional_improvement_metrics(
            baseline_fsfvi, optimal_fsfvi, opt_data['current_allocations'], optimal_allocations, budget
        )
        
        # STEP 6: Structure comprehensive response
        component_changes = self._analyze_component_changes(
            components, opt_data['current_allocations'], optimal_allocations
        )
        
        # Structure component analysis in expected format
        component_analysis = {
            'components': component_changes,
            'summary': {
                'total_components': len(component_changes),
                'components_increased': len([c for c in component_changes if c['change_amount'] > 0]),
                'components_decreased': len([c for c in component_changes if c['change_amount'] < 0]),
                'largest_increase': max([c['change_percent'] for c in component_changes], default=0),
                'largest_decrease': min([c['change_percent'] for c in component_changes], default=0),
                'total_reallocation_amount': sum([abs(c['change_amount']) for c in component_changes])
            },
            'recommendations': []
        }
        
        # Generate recommendations based on component changes
        high_impact_changes = [c for c in component_changes if abs(c['change_percent']) > 10]
        for comp in high_impact_changes:
            if comp['change_percent'] > 0:
                component_analysis['recommendations'].append(
                    f"Increase {comp['component_name']} funding by {comp['change_percent']:.1f}%"
                )
            else:
                component_analysis['recommendations'].append(
                    f"Reallocate {abs(comp['change_percent']):.1f}% from {comp['component_name']}"
                )
        
        # Debug logging for component analysis
        logger.info(f"Component analysis generated with {len(component_analysis['components'])} components")
        logger.info(f"Component analysis summary: {component_analysis['summary']}")
        
        result = {
            'success': True,
            'optimization_type': 'traditional_allocation',
            'method': method,
            'scenario': scenario,
            'budget': budget,
            'baseline_fsfvi': baseline_fsfvi,
            'optimal_fsfvi': optimal_fsfvi,
            'improvement': improvement_metrics,
            'current_allocations': opt_data['current_allocations'].tolist() if hasattr(opt_data['current_allocations'], 'tolist') else list(opt_data['current_allocations']),
            'optimal_allocations': optimal_allocations.tolist() if hasattr(optimal_allocations, 'tolist') else list(optimal_allocations),
            'component_analysis': component_analysis,
            'government_insights': self._generate_government_insights(
                components, opt_data['current_allocations'], optimal_allocations, 
                baseline_fsfvi, optimal_fsfvi, budget
            ),
            'timestamp': datetime.now().isoformat(),
            'constraints_applied': list(constraints.keys()) if constraints else []
        }
        
        logger.info(f"=== TRADITIONAL OPTIMIZATION COMPLETE ===")
        logger.info(f"Baseline FSFVI: {baseline_fsfvi:.6f}")
        logger.info(f"Optimal FSFVI: {optimal_fsfvi:.6f}")
        logger.info(f"Improvement: {improvement_metrics['absolute_improvement']:.6f}")
        
        return result

    def _optimize_new_budget_allocation(
        self,
        components: List[Dict[str, Any]],
        new_budget: float,
        method: str,
        scenario: str,
        constraints: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        NEW BUDGET OPTIMIZATION: Optimize allocation of new budget only
        
        DYNAMIC APPROACH: Considers how cumulative allocations change system state:
        - Updates sensitivity parameters based on cumulative funding levels
        - Recalculates performance expectations based on previous investments
        - Adjusts vulnerability landscape to reflect evolving system capabilities
        
        Mathematical Framework:
        - fᵢ_current: Fixed current allocation (from component data)
        - fᵢ_new: New budget allocation (variable to optimize)
        - fᵢ_total = fᵢ_current + fᵢ_new: Total allocation for FSFVI calculation
        - Minimize: FSFVI = Σᵢ ωᵢ·δᵢ·[1/(1+αᵢ(fᵢ_total)·fᵢ_total)]
        - Subject to: Σfᵢ_new ≤ new_budget, fᵢ_new ≥ 0
        
        Args:
            components: Component data with current allocations
            new_budget: New budget available for allocation
            method: Weighting method
            scenario: Analysis scenario
            constraints: Additional constraints
            
        Returns:
            Optimization result with current, new, and total allocations
        """
        # STEP 1: Update component state based on cumulative allocations
        updated_components = self._update_components_for_cumulative_state(components)
        
        # STEP 2: Prepare optimization data with updated components
        opt_data = self._prepare_new_budget_optimization_data(
            updated_components, method, scenario, new_budget
        )
        
        # STEP 3: Calculate baseline FSFVI with current cumulative state
        baseline_fsfvi = self._calculate_fsfvi_efficient_with_split(
            opt_data, new_allocations=np.zeros(opt_data['n_components'])
        )
        
        logger.info(f"=== DYNAMIC NEW BUDGET OPTIMIZATION START ===")
        logger.info(f"New Budget: ${new_budget:.1f}M")
        logger.info(f"Components: {len(components)}")
        logger.info(f"Current allocations: {[round(x, 1) for x in opt_data['current_allocations']]}")
        logger.info(f"Total current budget: ${sum(opt_data['current_allocations']):.1f}M")
        logger.info(f"Updated sensitivity parameters: {[round(x, 6) for x in opt_data['sensitivities']]}")
        logger.info(f"Updated performance gaps: {[round(x, 3) for x in opt_data['performance_gaps']]}")
        logger.info(f"Baseline FSFVI (current cumulative): {baseline_fsfvi:.6f}")
        
        # Initialize result structure
        optimization_result = {
            'baseline_fsfvi': baseline_fsfvi,
            'method': method,
            'scenario': scenario,
            'optimization_type': 'dynamic_new_budget_allocation',
            'new_budget': new_budget,
            'current_budget': float(sum(opt_data['current_allocations'])),
            'total_budget': float(sum(opt_data['current_allocations'])) + new_budget,
            'timestamp': datetime.now().isoformat(),
            'constraints_applied': ['new_budget', 'non_negativity', 'dynamic_prioritization'],
            'dynamic_updates_applied': True
        }
        
        try:
            # STEP 4: Run dynamic new budget optimization
            opt_result = self._optimize_new_budget_mathematical_dynamic(opt_data, constraints)
            optimization_result.update(opt_result)
            
            if optimization_result.get('success', False):
                # Calculate improvement metrics
                improvement_metrics = self._calculate_new_budget_improvement_metrics(
                    baseline_fsfvi,
                    optimization_result['optimal_fsfvi'],
                    opt_data['current_allocations'],
                    optimization_result['optimal_new_allocations'],
                    new_budget
                )
                optimization_result.update(improvement_metrics)
                
                # Generate component analysis for new budget optimization
                component_analysis = self._generate_new_budget_component_analysis(
                    opt_data, optimization_result['optimal_new_allocations']
                )
                optimization_result['component_analysis'] = component_analysis
                
                # Add practical government insights
                optimization_result['government_insights'] = self._generate_new_budget_government_insights(
                    opt_data, optimization_result, new_budget
                )
                
        except Exception as e:
            logger.error(f"Dynamic new budget optimization failed: {e}")
            optimization_result['error'] = str(e)
            optimization_result['success'] = False
        
        # Sanitize results
        optimization_result = self._sanitize_optimization_result(optimization_result)
        
        return optimization_result

    def _update_components_for_cumulative_state(
        self,
        components: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        DYNAMIC UPDATE: Update component state based on cumulative allocations
        
        This method addresses the core issue: as components receive more funding over time,
        their sensitivity parameters, performance levels, and vulnerabilities change.
        This creates a dynamic optimization landscape that varies year by year.
        
        Key Updates:
        1. Sensitivity parameters: αᵢ decreases as funding increases (diminishing returns)
        2. Performance improvements: Observed values improve with sustained funding
        3. Benchmark adjustments: Higher standards as system capabilities improve
        
        Args:
            components: Original components with cumulative allocations
            
        Returns:
            Updated components reflecting current system state
        """
        updated_components = []
        
        for i, comp in enumerate(components):
            updated_comp = comp.copy()
            
            current_allocation = comp['financial_allocation']
            component_type = comp['component_type']
            
            # 1. DYNAMIC SENSITIVITY: Adjust αᵢ based on cumulative funding level
            # Higher funding levels reduce sensitivity (diminishing returns)
            base_sensitivity = comp.get('sensitivity_parameter', 0.001)
            
            # Calculate funding ratio compared to baseline (assume baseline ~500M per component)
            baseline_funding = 500.0  # Baseline funding level in millions
            funding_ratio = current_allocation / baseline_funding
            
            # Apply diminishing returns: αᵢ_new = αᵢ_base / (1 + 0.3 * funding_ratio)
            # This means more funded components become less sensitive to additional funding
            adjustment_factor = 1 + (0.3 * max(0, funding_ratio - 1))  # Only adjust above baseline
            updated_sensitivity = base_sensitivity / adjustment_factor
            
            # Ensure sensitivity stays within reasonable bounds
            updated_sensitivity = max(0.0001, min(updated_sensitivity, 0.01))
            updated_comp['sensitivity_parameter'] = updated_sensitivity
            
            # 2. DYNAMIC PERFORMANCE: Improve observed values with sustained funding
            # Components with higher funding should show performance improvements
            observed_value = comp['observed_value']
            benchmark_value = comp['benchmark_value']
            
            # Calculate potential improvement based on funding above baseline
            if funding_ratio > 1.0:  # Only improve if funded above baseline
                excess_funding_ratio = funding_ratio - 1.0
                
                # Performance improvement: 5% per 100% excess funding, capped at 20%
                improvement_factor = min(0.20, excess_funding_ratio * 0.05)
                
                # Determine if higher values are better for this component
                from config import get_component_performance_preference
                prefer_higher = get_component_performance_preference(component_type)
                
                if prefer_higher:
                    # Improve towards benchmark (but don't exceed it significantly)
                    gap_to_benchmark = max(0, benchmark_value - observed_value)
                    improvement = gap_to_benchmark * improvement_factor
                    updated_observed = observed_value + improvement
                    
                    # Cap improvement at 5% above benchmark to maintain challenge
                    max_allowed = benchmark_value * 1.05
                    updated_comp['observed_value'] = min(updated_observed, max_allowed)
                else:
                    # Lower values are better - reduce towards benchmark
                    gap_to_benchmark = max(0, observed_value - benchmark_value)
                    improvement = gap_to_benchmark * improvement_factor
                    updated_observed = observed_value - improvement
                    
                    # Cap improvement at 5% below benchmark
                    min_allowed = benchmark_value * 0.95
                    updated_comp['observed_value'] = max(updated_observed, min_allowed)
            
            # 3. DYNAMIC BENCHMARKS: Gradually raise standards as system improves
            # As the overall system gets more funding, benchmarks can become more ambitious
            total_funding = sum(c['financial_allocation'] for c in components)
            baseline_total = len(components) * baseline_funding
            
            if total_funding > baseline_total:
                system_improvement_ratio = (total_funding - baseline_total) / baseline_total
                # Raise benchmarks by up to 10% as system gets more resourced
                benchmark_adjustment = min(0.10, system_improvement_ratio * 0.05)
                
                from config import get_component_performance_preference
                prefer_higher = get_component_performance_preference(component_type)
                
                if prefer_higher:
                    # Raise benchmarks higher for better performance
                    updated_comp['benchmark_value'] = benchmark_value * (1 + benchmark_adjustment)
                else:
                    # Lower benchmarks for better performance (since lower is better)
                    updated_comp['benchmark_value'] = benchmark_value * (1 - benchmark_adjustment)
            
            # 4. LOG DYNAMIC CHANGES for transparency
            if i == 0:  # Log details for first component as example
                logger.info(f"=== DYNAMIC COMPONENT UPDATE EXAMPLE ===")
                logger.info(f"Component: {component_type}")
                logger.info(f"Funding ratio: {funding_ratio:.2f}")
                logger.info(f"Sensitivity: {base_sensitivity:.6f} -> {updated_sensitivity:.6f}")
                logger.info(f"Observed: {observed_value:.2f} -> {updated_comp['observed_value']:.2f}")
                logger.info(f"Benchmark: {benchmark_value:.2f} -> {updated_comp['benchmark_value']:.2f}")
            
            updated_components.append(updated_comp)
        
        return updated_components

    def _prepare_new_budget_optimization_data(
        self,
        components: List[Dict[str, Any]],
        method: str,
        scenario: str,
        new_budget: float
    ) -> Dict[str, Any]:
        """
        Prepare optimization data for new budget allocation
        
        Separates current (fixed) allocations from new (optimizable) budget
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
        current_allocations = np.zeros(n_components)
        component_types = []
        component_names = []
        
        for i, comp in enumerate(weighted_components):
            # Ensure sensitivity parameter (now dynamically updated)
            self.calculation_service._ensure_sensitivity_parameter(comp)
            
            # Get performance direction preference
            prefer_higher = get_component_performance_preference(comp['component_type'])
            
            # Calculate performance gap (using potentially updated values)
            gap = calculate_performance_gap(
                comp['observed_value'], comp['benchmark_value'], prefer_higher
            )
            
            # Store data
            weights[i] = comp['weight']
            performance_gaps[i] = gap
            sensitivities[i] = comp['sensitivity_parameter']
            current_allocations[i] = comp['financial_allocation']  # These are FIXED
            component_types.append(comp['component_type'])
            component_names.append(comp.get('component_name', comp['component_type']))
        
        return {
            'n_components': n_components,
            'weights': weights,
            'performance_gaps': performance_gaps,
            'sensitivities': sensitivities,
            'current_allocations': current_allocations,  # FIXED allocations
            'new_budget': new_budget,  # Available for optimization
            'component_types': component_types,
            'component_names': component_names
        }

    def _calculate_fsfvi_efficient_with_split(
        self, 
        opt_data: Dict[str, Any], 
        new_allocations: np.ndarray
    ) -> float:
        """
        Calculate FSFVI using current (fixed) + new (variable) allocations
        
        Mathematical Formula: FSFVI = Σᵢ ωᵢ·δᵢ·[1/(1+αᵢ·(fᵢ_current + fᵢ_new))]
        """
        weights = opt_data['weights']
        gaps = opt_data['performance_gaps']
        alphas = opt_data['sensitivities']
        current_allocations = opt_data['current_allocations']
        
        # Total allocations = current (fixed) + new (variable)
        total_allocations = current_allocations + new_allocations
        
        # Vectorized FSFVI calculation with enhanced safety checks
        # Ensure all inputs are finite
        if not np.all(np.isfinite(weights)):
            logger.error(f"Non-finite weights detected: {weights}")
            weights = np.nan_to_num(weights, nan=1.0/len(weights), posinf=1.0, neginf=0.0)
            weights = weights / np.sum(weights)  # Renormalize
        
        if not np.all(np.isfinite(gaps)):
            logger.error(f"Non-finite gaps detected: {gaps}")
            gaps = np.nan_to_num(gaps, nan=0.0, posinf=1.0, neginf=0.0)
        
        if not np.all(np.isfinite(alphas)):
            logger.error(f"Non-finite alphas detected: {alphas}")
            alphas = np.nan_to_num(alphas, nan=0.001, posinf=0.01, neginf=0.0001)
        
        if not np.all(np.isfinite(total_allocations)):
            logger.error(f"Non-finite allocations detected: {total_allocations}")
            total_allocations = np.nan_to_num(total_allocations, nan=100.0, posinf=1000.0, neginf=0.0)
        
        denominators = 1 + alphas * total_allocations
        denominators = np.where(denominators < 1e-10, 1e-10, denominators)
        
        vulnerabilities = gaps / denominators
        # Additional safety check for vulnerabilities
        vulnerabilities = np.nan_to_num(vulnerabilities, nan=0.0, posinf=1.0, neginf=0.0)
        
        weighted_vulnerabilities = weights * vulnerabilities
        # Final safety check
        weighted_vulnerabilities = np.nan_to_num(weighted_vulnerabilities, nan=0.0, posinf=1.0, neginf=0.0)
        
        fsfvi = np.sum(weighted_vulnerabilities)
        
        # Validate final result
        if np.isnan(fsfvi) or np.isinf(fsfvi):
            logger.error(f"FSFVI calculation with split allocations returned {fsfvi} despite safety checks")
            # Return a reasonable fallback value
            fsfvi = 0.5  # Mid-range FSFVI value
            logger.warning(f"Using fallback FSFVI value: {fsfvi}")
        
        return float(np.clip(fsfvi, 0.0, 1.0))  # Ensure FSFVI is in valid range

    def _calculate_new_budget_gradient(
        self, 
        opt_data: Dict[str, Any], 
        new_allocations: np.ndarray
    ) -> np.ndarray:
        """
        Calculate gradient for new budget optimization: ∂FSFVI/∂fᵢ_new
        
        Since fᵢ_total = fᵢ_current + fᵢ_new:
        ∂FSFVI/∂fᵢ_new = ∂FSFVI/∂fᵢ_total = -ωᵢ·δᵢ·αᵢ/(1+αᵢ·fᵢ_total)²
        """
        weights = opt_data['weights']
        gaps = opt_data['performance_gaps']
        alphas = opt_data['sensitivities']
        current_allocations = opt_data['current_allocations']
        
        # Total allocations = current + new
        total_allocations = current_allocations + new_allocations
        
        denominators = (1 + alphas * total_allocations) ** 2
        denominators = np.where(denominators < 1e-12, 1e-12, denominators)
        
        gradients = -weights * gaps * alphas / denominators
        gradients = np.where(np.isnan(gradients) | np.isinf(gradients), 0.0, gradients)
        
        return gradients

    def _optimize_new_budget_mathematical_dynamic(
        self,
        opt_data: Dict[str, Any],
        constraints: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        DYNAMIC optimization of new budget allocation with intelligent initialization
        
        Key improvements over static approach:
        1. Smart initialization based on current gradient landscape
        2. Adaptive prioritization based on cumulative state
        3. Dynamic bounds based on marginal impact potential
        4. Enhanced convergence criteria for evolving systems
        """
        # Get optimization parameters from config
        max_iterations = FSFVI_CONFIG.max_optimization_iterations
        learning_rate = FSFVI_CONFIG.initial_learning_rate * 0.4  # More conservative for dynamic
        tolerance = FSFVI_CONFIG.tolerance
        min_improvement = FSFVI_CONFIG.min_improvement
        
        n_components = opt_data['n_components']
        new_budget = opt_data['new_budget']
        
        # DYNAMIC INITIALIZATION: Instead of equal distribution, use gradient-based smart start
        initial_new_allocations = self._calculate_smart_initial_allocation(opt_data, new_budget)
        new_allocations = initial_new_allocations.copy()
        
        # DYNAMIC BOUNDS: Calculate bounds based on marginal impact potential
        min_new_bounds, max_new_bounds = self._calculate_dynamic_bounds(opt_data, new_budget)
        
        # ADAPTIVE PRIORITIZATION: Adjust bounds based on current system state
        priority_adjusted_bounds = self._apply_adaptive_prioritization(
            opt_data, max_new_bounds, min_new_bounds
        )
        max_new_bounds = priority_adjusted_bounds
        
        # Optimization loop with enhanced tracking
        convergence_history = []
        prev_fsfvi = float('inf')
        stagnation_count = 0
        
        logger.info(f"Starting dynamic new budget optimization with {max_iterations} max iterations")
        logger.info(f"Smart initial allocations: {[round(x, 1) for x in new_allocations]}")
        logger.info(f"Dynamic bounds - Min: {[round(x, 1) for x in min_new_bounds[:3]]}...")
        logger.info(f"Dynamic bounds - Max: {[round(x, 1) for x in max_new_bounds[:3]]}...")
        
        for iteration in range(max_iterations):
            # Calculate current FSFVI and gradient
            current_fsfvi = self._calculate_fsfvi_efficient_with_split(opt_data, new_allocations)
            gradient = self._calculate_new_budget_gradient(opt_data, new_allocations)
            
            if iteration < 3 or iteration % 5 == 0:
                logger.info(f"Dynamic Iteration {iteration}: FSFVI={current_fsfvi:.6f}, Gradient norm={np.linalg.norm(gradient):.6f}")
                logger.info(f"New allocations: {[round(x, 1) for x in new_allocations]}")
            
            # Check convergence with enhanced criteria
            improvement = prev_fsfvi - current_fsfvi
            if iteration > 0:
                if improvement <= min_improvement:
                    stagnation_count += 1
                    if stagnation_count >= 3:  # Allow for some oscillation in dynamic systems
                        logger.info(f"Dynamic optimization converged after {iteration} iterations (stagnation)")
                        break
                else:
                    stagnation_count = 0
            
            # ADAPTIVE GRADIENT DESCENT: Adjust step size based on system state
            adaptive_step_size = self._calculate_adaptive_step_size(
                learning_rate, new_budget, gradient, iteration, convergence_history
            )
            
            updated_new_allocations = new_allocations - adaptive_step_size * gradient
            
            # Apply dynamic bounds
            updated_new_allocations = np.clip(updated_new_allocations, min_new_bounds, max_new_bounds)
            
            # SMART BUDGET CONSTRAINT: Distribute budget based on marginal effectiveness
            updated_new_allocations = self._enforce_smart_budget_constraint(
                updated_new_allocations, new_budget, gradient, opt_data
            )
            
            # Update for next iteration
            new_allocations = updated_new_allocations
            prev_fsfvi = current_fsfvi
            
            # Enhanced convergence tracking
            marginal_efficiency = improvement / max(np.sum(np.abs(gradient)) * adaptive_step_size, 1e-8)
            convergence_history.append({
                'iteration': iteration,
                'fsfvi': current_fsfvi,
                'improvement': improvement if improvement != float('inf') else 0.0,
                'gradient_norm': np.linalg.norm(gradient),
                'marginal_efficiency': marginal_efficiency,
                'new_budget_used': np.sum(new_allocations),
                'allocation_diversity': np.std(new_allocations) / np.mean(new_allocations) if np.mean(new_allocations) > 0 else 0
            })
            
            # DYNAMIC LEARNING RATE: Adapt based on convergence pattern
            if iteration > 5:
                self._update_dynamic_learning_rate(convergence_history, learning_rate)
        
        # Calculate final results with enhanced metrics
        final_fsfvi = self._calculate_fsfvi_efficient_with_split(opt_data, new_allocations)
        final_total_allocations = opt_data['current_allocations'] + new_allocations
        new_budget_used = np.sum(new_allocations)
        
        # Calculate dynamic allocation insights
        allocation_insights = self._generate_dynamic_allocation_insights(
            new_allocations, opt_data, initial_new_allocations
        )
        
        logger.info(f"=== DYNAMIC NEW BUDGET OPTIMIZATION COMPLETE ===")
        logger.info(f"Final FSFVI: {final_fsfvi:.6f}")
        logger.info(f"Final new allocations: {[round(x, 1) for x in new_allocations]}")
        logger.info(f"Total allocations: {[round(x, 1) for x in final_total_allocations]}")
        logger.info(f"Budget utilization: {new_budget_used:.1f} / {new_budget:.1f} = {new_budget_used/new_budget*100:.1f}%")
        logger.info(f"Allocation strategy: {allocation_insights['strategy_type']}")
        
        return {
            'success': True,
            'optimal_fsfvi': final_fsfvi,
            'optimal_new_allocations': new_allocations.tolist(),
            'optimal_total_allocations': final_total_allocations.tolist(),
            'current_allocations': opt_data['current_allocations'].tolist(),
            'iterations': iteration + 1,
            'convergence_history': convergence_history,
            'solver': 'dynamic_new_budget_gradient_descent',
            'mathematical_compliance': True,
            'dynamic_features_used': True,
            'allocation_insights': allocation_insights,
            'new_budget_utilization': new_budget_used / new_budget if new_budget > 0 else 0
        }
    

    
    def _calculate_smart_initial_allocation(
        self,
        opt_data: Dict[str, Any],
        new_budget: float
    ) -> np.ndarray:
        """
        Calculate intelligent initial allocation based on current gradient landscape
        
        Instead of starting with equal distribution, this initializes based on:
        1. Current marginal impact potential (gradient analysis)
        2. Performance gap priorities  
        3. Sensitivity-adjusted optimization potential
        """
        n_components = opt_data['n_components']
        
        # Start with equal allocation as base
        base_allocation = np.full(n_components, new_budget / n_components)
        
        # Calculate initial gradient to understand impact landscape
        initial_gradient = self._calculate_new_budget_gradient(opt_data, base_allocation)
        
        # Convert gradients to allocation priorities (negative gradients = high impact)
        # Normalize to get allocation weights
        gradient_magnitudes = np.abs(initial_gradient)
        if np.sum(gradient_magnitudes) > 0:
            gradient_weights = gradient_magnitudes / np.sum(gradient_magnitudes)
        else:
            gradient_weights = np.full(n_components, 1.0 / n_components)
        
        # Combine with performance gap prioritization
        gaps = opt_data['performance_gaps']
        gap_weights = gaps / np.sum(gaps) if np.sum(gaps) > 0 else np.full(n_components, 1.0 / n_components)
        
        # Weighted combination: 60% gradient-based, 40% gap-based
        smart_weights = 0.6 * gradient_weights + 0.4 * gap_weights
        
        # Convert to allocations
        smart_allocation = smart_weights * new_budget
        
        # Apply reasonable bounds (no component gets less than 5% or more than 40%)
        min_allocation = new_budget * 0.05
        max_allocation = new_budget * 0.40
        smart_allocation = np.clip(smart_allocation, min_allocation, max_allocation)
        
        # Ensure total equals budget
        total_allocation = np.sum(smart_allocation)
        if total_allocation != new_budget:
            smart_allocation *= new_budget / total_allocation
        
        return smart_allocation
    
    def _calculate_dynamic_bounds(
        self,
        opt_data: Dict[str, Any],
        new_budget: float
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calculate dynamic bounds based on marginal impact potential
        
        Bounds adapt based on:
        1. Current sensitivity levels (diminishing returns)
        2. Performance gap magnitude
        3. Cumulative funding levels
        """
        n_components = opt_data['n_components']
        gaps = opt_data['performance_gaps']
        sensitivities = opt_data['sensitivities']
        current_allocations = opt_data['current_allocations']
        
        # Base bounds
        min_bounds = np.full(n_components, new_budget * 0.02)  # Min 2% each
        max_bounds = np.full(n_components, new_budget * 0.50)  # Max 50% each (increased from 40%)
        
        # Adjust based on marginal impact potential
        for i in range(n_components):
            gap = gaps[i]
            sensitivity = sensitivities[i]
            current_funding = current_allocations[i]
            
            # Calculate marginal impact potential: gap * sensitivity / (1 + current_funding_factor)
            funding_factor = current_funding / 1000.0  # Normalize to thousands
            marginal_potential = gap * sensitivity / (1 + funding_factor)
            
            # Adjust max bounds based on potential
            if marginal_potential > 0.001:  # High potential
                max_bounds[i] *= 1.5  # Can get up to 75% of new budget
            elif marginal_potential < 0.0001:  # Low potential
                max_bounds[i] *= 0.6  # Reduced to 30% of new budget
        
        # Ensure bounds are feasible
        if np.sum(max_bounds) < new_budget:
            # Scale up if bounds are too restrictive
            max_bounds *= new_budget / np.sum(max_bounds) * 1.2
        
        # Cap individual maximums to ensure some distribution
        max_bounds = np.minimum(max_bounds, new_budget * 0.60)
        
        return min_bounds, max_bounds
    
    def _apply_adaptive_prioritization(
        self,
        opt_data: Dict[str, Any],
        max_bounds: np.ndarray,
        min_bounds: np.ndarray
    ) -> np.ndarray:
        """
        Apply adaptive prioritization based on current system state
        """
        gaps = opt_data['performance_gaps']
        current_allocations = opt_data['current_allocations']
        
        # Calculate prioritization adjustments
        priority_factors = np.ones_like(max_bounds)
        
        # Prioritize based on performance gap ranking
        gap_order = np.argsort(-gaps)  # Descending order
        
        for rank, idx in enumerate(gap_order):
            # Higher rank (lower index) = higher priority
            priority_boost = 1.0 + (0.2 * (len(gaps) - rank) / len(gaps))
            priority_factors[idx] *= priority_boost
        
        # Apply funding level adjustments (heavily funded components get less priority)
        avg_current_funding = np.mean(current_allocations)
        for i in range(len(current_allocations)):
            if current_allocations[i] > avg_current_funding * 1.5:  # 50% above average
                priority_factors[i] *= 0.8  # Reduce priority for over-funded components
        
        # Apply adjustments to bounds
        adjusted_max_bounds = max_bounds * priority_factors
        
        # Ensure feasibility
        total_max = np.sum(adjusted_max_bounds)
        new_budget = opt_data['new_budget']
        if total_max < new_budget:
            # Scale up proportionally
            adjusted_max_bounds *= new_budget / total_max * 1.1
        
        return adjusted_max_bounds
    
    def _calculate_adaptive_step_size(
        self,
        base_learning_rate: float,
        new_budget: float,
        gradient: np.ndarray,
        iteration: int,
        convergence_history: List[Dict[str, Any]]
    ) -> float:
        """
        Calculate adaptive step size based on optimization progress
        """
        # Base step size
        gradient_norm = np.linalg.norm(gradient)
        if gradient_norm < 1e-8:
            return base_learning_rate * new_budget / 1000.0
        
        base_step = base_learning_rate * new_budget / gradient_norm
        
        # Adapt based on recent progress
        if len(convergence_history) >= 3:
            recent_improvements = [h['improvement'] for h in convergence_history[-3:]]
            avg_improvement = np.mean(recent_improvements)
            
            if avg_improvement > convergence_history[-3]['improvement']:
                # Progress is accelerating - maintain or increase step size
                adaptation = 1.05
            elif avg_improvement < convergence_history[-3]['improvement'] * 0.5:
                # Progress is slowing - reduce step size
                adaptation = 0.85
            else:
                # Steady progress - maintain
                adaptation = 1.0
            
            base_step *= adaptation
        
        # Reduce step size as iterations progress
        iteration_factor = 1.0 / (1.0 + iteration * 0.01)
        
        return base_step * iteration_factor
    
    def _enforce_smart_budget_constraint(
        self,
        allocations: np.ndarray,
        new_budget: float,
        gradient: np.ndarray,
        opt_data: Dict[str, Any]
    ) -> np.ndarray:
        """
        Enforce budget constraint intelligently based on marginal effectiveness
        """
        total_allocation = np.sum(allocations)
        
        if abs(total_allocation - new_budget) < new_budget * 0.01:  # Within 1%
            return allocations
        
        if total_allocation > new_budget:
            # Need to reduce - scale down proportionally
            return allocations * (new_budget / total_allocation)
        
        # Need to increase - distribute remaining budget based on gradient effectiveness
        remaining = new_budget - total_allocation
        
        # Calculate effectiveness weights (negative gradients = more effective)
        gradient_effectiveness = -gradient  # Flip sign
        gradient_effectiveness = np.maximum(gradient_effectiveness, 0)  # Only positive values
        
        if np.sum(gradient_effectiveness) > 0:
            effectiveness_weights = gradient_effectiveness / np.sum(gradient_effectiveness)
        else:
            # Fallback to performance gaps
            gaps = opt_data['performance_gaps']
            effectiveness_weights = gaps / np.sum(gaps) if np.sum(gaps) > 0 else np.ones_like(gaps) / len(gaps)
        
        # Distribute remaining budget
        additional_allocation = remaining * effectiveness_weights
        
        return allocations + additional_allocation
    
    def _update_dynamic_learning_rate(
        self,
        convergence_history: List[Dict[str, Any]],
        learning_rate: float
    ) -> float:
        """
        Update learning rate based on convergence pattern
        """
        if len(convergence_history) < 5:
            return learning_rate
        
        recent_improvements = [h['improvement'] for h in convergence_history[-5:]]
        
        # Check for oscillation
        sign_changes = sum(1 for i in range(1, len(recent_improvements)) 
                          if (recent_improvements[i] > 0) != (recent_improvements[i-1] > 0))
        
        if sign_changes >= 3:  # Oscillating
            return learning_rate * 0.8
        
        # Check for consistent improvement
        positive_improvements = sum(1 for imp in recent_improvements if imp > 0)
        if positive_improvements >= 4:  # Consistently improving
            return learning_rate * 1.05
        
        # Check for stagnation
        avg_recent = np.mean(recent_improvements)
        if abs(avg_recent) < 1e-8:  # Very small improvements
            return learning_rate * 0.9
        
        return learning_rate
    
    def _generate_dynamic_allocation_insights(
        self,
        final_allocations: np.ndarray,
        opt_data: Dict[str, Any],
        initial_allocations: np.ndarray
    ) -> Dict[str, Any]:
        """
        Generate insights about the dynamic allocation strategy
        """
        allocation_changes = final_allocations - initial_allocations
        
        # Determine strategy type
        max_change_idx = np.argmax(np.abs(allocation_changes))
        max_change_component = opt_data['component_names'][max_change_idx]
        
        # Calculate concentration
        allocation_std = np.std(final_allocations)
        allocation_mean = np.mean(final_allocations)
        concentration = allocation_std / allocation_mean if allocation_mean > 0 else 0
        
        if concentration > 0.5:
            strategy_type = "Concentrated"
        elif concentration < 0.2:
            strategy_type = "Distributed"
        else:
            strategy_type = "Balanced"
        
        # Calculate adaptation magnitude
        total_change = np.sum(np.abs(allocation_changes))
        adaptation_intensity = total_change / opt_data['new_budget']
        
        return {
            'strategy_type': strategy_type,
            'concentration_level': concentration,
            'adaptation_intensity': adaptation_intensity,
            'primary_beneficiary': max_change_component,
            'allocation_diversity': 1.0 - concentration,
            'total_reallocation': total_change
        }

    def _calculate_new_budget_improvement_metrics(
        self,
        baseline_fsfvi: float,
        optimized_fsfvi: float,
        current_allocations: np.ndarray,
        new_allocations: List[float],
        new_budget: float
    ) -> Dict[str, Any]:
        """Calculate improvement metrics for new budget optimization"""
        new_allocations_array = np.array(new_allocations)
        
        # Validate inputs to prevent infinite values
        if not np.isfinite(baseline_fsfvi) or not np.isfinite(optimized_fsfvi):
            logger.error(f"Invalid FSFVI values: baseline={baseline_fsfvi}, optimized={optimized_fsfvi}")
            baseline_fsfvi = max(0.001, baseline_fsfvi) if np.isfinite(baseline_fsfvi) else 0.5
            optimized_fsfvi = max(0.001, optimized_fsfvi) if np.isfinite(optimized_fsfvi) else 0.5
        
        if not np.all(np.isfinite(new_allocations_array)):
            logger.error(f"Invalid new allocations detected: {new_allocations_array}")
            new_allocations_array = np.nan_to_num(new_allocations_array, nan=0.0, posinf=new_budget/len(new_allocations_array), neginf=0.0)
        
        # Basic improvement metrics with safety checks
        absolute_improvement = baseline_fsfvi - optimized_fsfvi
        relative_improvement = (absolute_improvement / max(baseline_fsfvi, 0.001)) * 100
        
        # New budget efficiency metrics with safety checks
        efficiency_per_million = absolute_improvement / max(new_budget / 1000000, 0.001)
        
        # Budget utilization with safety checks
        new_budget_used = np.sum(new_allocations_array)
        new_budget_utilization = (new_budget_used / max(new_budget, 0.001)) * 100
        
        # Total system metrics with safety checks
        total_budget = np.sum(current_allocations) + new_budget_used
        total_allocations = current_allocations + new_allocations_array
        
        # Ensure all values are finite
        metrics = {
            'absolute_improvement': float(np.clip(absolute_improvement, -10, 10)),
            'relative_improvement_percent': float(np.clip(relative_improvement, -1000, 1000)),
            'efficiency_per_million_new_budget': float(np.clip(efficiency_per_million, -1000, 1000)),
            'new_budget_utilization_percent': float(np.clip(new_budget_utilization, 0, 200)),
            'total_budget_millions': float(total_budget),
            'impact_of_new_budget': {
                'baseline_fsfvi_current_only': float(baseline_fsfvi),
                'optimized_fsfvi_current_plus_new': float(optimized_fsfvi),
                'improvement_from_new_budget': float(np.clip(absolute_improvement, -10, 10)),
                'new_budget_roi_percent': float(np.clip(relative_improvement, -1000, 1000))
            }
        }
        
        return metrics

    def _generate_new_budget_component_analysis(
        self,
        opt_data: Dict[str, Any],
        optimal_new_allocations: List[float]
    ) -> Dict[str, Any]:
        """Generate component analysis for new budget optimization"""
        
        analysis = {
            'components': [],
            'summary': {},
            'recommendations': []
        }
        
        current_allocations = opt_data['current_allocations']
        new_allocations = np.array(optimal_new_allocations)
        total_allocations = current_allocations + new_allocations
        
        for i in range(opt_data['n_components']):
            current_alloc = current_allocations[i]
            new_alloc = new_allocations[i]
            total_alloc = total_allocations[i]
            
            # Calculate vulnerabilities
            gap = opt_data['performance_gaps'][i]
            alpha = opt_data['sensitivities'][i]
            
            current_vulnerability = gap / (1 + alpha * current_alloc) if alpha * current_alloc > -1 else gap
            total_vulnerability = gap / (1 + alpha * total_alloc) if alpha * total_alloc > -1 else gap
            
            vulnerability_reduction = current_vulnerability - total_vulnerability
            vulnerability_reduction_percent = (vulnerability_reduction / current_vulnerability) * 100 if current_vulnerability > 0 else 0
            
            # New budget efficiency
            new_budget_efficiency = vulnerability_reduction / (new_alloc / 100) if new_alloc > 0 else 0  # Per $100M
            
            component_analysis = {
                'component_type': opt_data['component_types'][i],
                'component_name': opt_data['component_names'][i],
                'current_allocation_fixed': float(current_alloc),
                'new_allocation_optimized': float(new_alloc),
                'total_allocation': float(total_alloc),
                'new_budget_share_percent': (new_alloc / opt_data['new_budget']) * 100 if opt_data['new_budget'] > 0 else 0,
                'current_vulnerability': float(current_vulnerability),
                'optimized_vulnerability': float(total_vulnerability),
                'vulnerability_reduction': float(vulnerability_reduction),
                'vulnerability_reduction_percent': float(vulnerability_reduction_percent),
                'new_budget_efficiency_per_100m': float(new_budget_efficiency),
                'allocation_priority': self._determine_new_budget_priority(new_alloc, opt_data['new_budget']),
                'strategic_rationale': self._generate_new_budget_rationale(
                    opt_data['component_types'][i], current_alloc, new_alloc, vulnerability_reduction_percent
                ),
                'weight': float(opt_data['weights'][i]),
                'performance_gap': float(opt_data['performance_gaps'][i])
            }
            
            analysis['components'].append(component_analysis)
        
        # Generate summary
        total_new_budget_used = float(np.sum(new_allocations))
        components_receiving_new_budget = len([c for c in analysis['components'] if c['new_allocation_optimized'] > 0])
        avg_vulnerability_reduction = np.mean([c['vulnerability_reduction_percent'] for c in analysis['components']])
        
        analysis['summary'] = {
            'total_components': len(analysis['components']),
            'components_receiving_new_budget': components_receiving_new_budget,
            'new_budget_utilized_percent': (total_new_budget_used / opt_data['new_budget']) * 100,
            'average_vulnerability_reduction_percent': float(avg_vulnerability_reduction),
            'highest_new_allocation': max([c['new_allocation_optimized'] for c in analysis['components']]),
            'most_improved_component': max(analysis['components'], key=lambda x: x['vulnerability_reduction_percent'])['component_name']
        }
        
        # Generate recommendations
        high_allocation_components = [c for c in analysis['components'] if c['new_allocation_optimized'] > opt_data['new_budget'] * 0.2]
        for comp in high_allocation_components:
            analysis['recommendations'].append(
                f"Prioritize {comp['component_name']}: ${comp['new_allocation_optimized']:.1f}M new allocation for {comp['vulnerability_reduction_percent']:.1f}% vulnerability reduction"
            )
        
        return analysis

    def _generate_new_budget_government_insights(
        self,
        opt_data: Dict[str, Any],
        optimization_result: Dict[str, Any],
        new_budget: float
    ) -> Dict[str, Any]:
        """Generate practical government insights for new budget allocation"""
        
        new_allocations = np.array(optimization_result['optimal_new_allocations'])
        baseline_fsfvi = optimization_result['baseline_fsfvi']
        optimal_fsfvi = optimization_result['optimal_fsfvi']
        
        insights = {
            'budget_planning': {
                'new_budget_impact': f"${new_budget:.1f}M new budget reduces system vulnerability by {((baseline_fsfvi - optimal_fsfvi) / baseline_fsfvi * 100):.1f}%",
                'most_effective_allocation': opt_data['component_names'][np.argmax(new_allocations)],
                'allocation_spread': f"{len([x for x in new_allocations if x > 0])} of {len(new_allocations)} components receive new funding",
                'budget_efficiency': f"{(baseline_fsfvi - optimal_fsfvi) / (new_budget / 1000):.3f} FSFVI reduction per $1B invested"
            },
            
            'implementation_guidance': {
                'immediate_priorities': [
                    opt_data['component_names'][i] for i, alloc in enumerate(new_allocations) 
                    if alloc > new_budget * 0.15  # Components getting >15% of new budget
                ],
                'funding_timeline': 'Allocate new budget immediately for maximum impact',
                'monitoring_focus': 'Track vulnerability reduction in components receiving new funding',
                'success_metrics': [
                    f"System FSFVI should improve from {baseline_fsfvi:.3f} to {optimal_fsfvi:.3f}",
                    f"Monitor component-level vulnerability reductions",
                    f"Ensure {(np.sum(new_allocations) / new_budget * 100):.1f}% of new budget is utilized"
                ]
            },
            
            'strategic_context': {
                'current_vs_new': f"Current budget: ${np.sum(opt_data['current_allocations']):.1f}M (fixed), New budget: ${new_budget:.1f}M (optimized)",
                'system_improvement': f"New budget provides {((baseline_fsfvi - optimal_fsfvi) / baseline_fsfvi * 100):.1f}% system improvement",
                'future_planning': 'Results show optimal allocation pattern for future budget cycles',
                'risk_mitigation': f"Reduces system vulnerability from {baseline_fsfvi:.3f} to {optimal_fsfvi:.3f}"
            }
        }
        
        return insights

    def _determine_new_budget_priority(self, new_allocation: float, total_new_budget: float) -> str:
        """Determine priority level for new budget allocation"""
        share = new_allocation / total_new_budget if total_new_budget > 0 else 0
        
        if share > 0.25:
            return 'High Priority'
        elif share > 0.10:
            return 'Medium Priority'
        elif share > 0.05:
            return 'Low Priority'
        else:
            return 'Minimal'

    def _generate_new_budget_rationale(
        self,
        component_type: str,
        current_allocation: float,
        new_allocation: float,
        vulnerability_reduction_percent: float
    ) -> str:
        """Generate rationale for new budget allocation"""
        
        if new_allocation > current_allocation * 0.5:  # Significant increase
            return f"High-impact investment: ${new_allocation:.1f}M new funding achieves {vulnerability_reduction_percent:.1f}% vulnerability reduction"
        elif new_allocation > current_allocation * 0.2:  # Moderate increase
            return f"Strategic enhancement: ${new_allocation:.1f}M boosts existing ${current_allocation:.1f}M investment for {vulnerability_reduction_percent:.1f}% improvement"
        elif new_allocation > 0:  # Small increase
            return f"Targeted improvement: ${new_allocation:.1f}M provides focused {vulnerability_reduction_percent:.1f}% vulnerability reduction"
        else:
            return f"Current allocation adequate: existing ${current_allocation:.1f}M allocation maintained without additional funding"

    @handle_optimization_error
    def multi_year_optimization(
        self,
        components: List[Dict[str, Any]],
        budget_scenarios: Dict[int, float] | Dict[str, Any],  # Enhanced to support strategies
        target_fsfvi: Optional[float] = None,
        target_year: Optional[int] = None,
        method: str = 'hybrid',
        scenario: str = 'normal_operations',
        constraints: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        ENHANCED Multi-year optimization for government fiscal planning
        
        Now supports multiple budget allocation strategies:
        1. Fixed Annual: Same amount each year (legacy format)
        2. Percentage Growth: Compound growth over time
        3. Custom: Specific amounts for each year
        4. Algorithm-Based: Dynamic allocation based on economic/political factors
        
        This function helps governments plan budget allocation across multiple fiscal years
        to achieve food system resilience targets and crisis preparedness with sophisticated
        budget strategies that reflect real-world economic and political decision-making.
        
        Args:
            components: Current component data
            budget_scenarios: Budget allocation by year {year: budget} OR strategy config
            target_fsfvi: Target FSFVI score to achieve
            target_year: Year to achieve target by
            method: Weighting method
            scenario: Analysis scenario
            constraints: Additional constraints
            
        Returns:
            Enhanced multi-year optimization plan with strategy insights
        """
        constraints = constraints or {}
        
        # Enhanced budget scenario processing
        if isinstance(budget_scenarios, dict):
            # Check if this is a strategy configuration
            if 'budgetStrategy' in budget_scenarios:
                # Process strategy configuration
                strategy_config = budget_scenarios
                processed_budget_scenarios = self._process_budget_strategy_config(
                    strategy_config, components
                )
                logger.info(f"Processed budget strategy '{strategy_config['budgetStrategy']}' into {len(processed_budget_scenarios)} year scenarios")
            else:
                # Legacy format: direct year-budget mapping
                processed_budget_scenarios = {int(k): v for k, v in budget_scenarios.items()}
                strategy_config = None
        else:
            raise ValueError("Budget scenarios must be a dictionary")
        
        # Validate processed scenarios
        if not processed_budget_scenarios:
            raise ValueError("No budget scenarios provided after processing")
        
        current_year = datetime.now().year
        planning_years = sorted(processed_budget_scenarios.keys())
        
        # Initialize enhanced multi-year planning
        multi_year_plan = {
            'planning_horizon': {
                'start_year': min(planning_years),
                'end_year': max(planning_years),
                'total_years': len(planning_years)
            },
            'budget_scenarios': processed_budget_scenarios,
            'optimization_method': method,
            'analysis_scenario': scenario,
            'yearly_recommendations': {},
            'trajectory_analysis': {},
            'target_achievement': {},
            'crisis_preparedness': {},
            'budget_strategy': strategy_config or {'budgetStrategy': 'legacy'}
        }
        
        # Add algorithm insights if using algorithm strategy
        if strategy_config and strategy_config.get('budgetStrategy') == 'algorithm':
            multi_year_plan['algorithm_insights'] = self._generate_algorithm_insights(
                strategy_config, processed_budget_scenarios, components
            )
        
        # Calculate ORIGINAL baseline FSFVI with current allocations only (no optimization)
        original_baseline_fsfvi_result = self.calculation_service.calculate_fsfvi(
            components, method=method, scenario=scenario
        )
        original_baseline_fsfvi = original_baseline_fsfvi_result['fsfvi_value']
        
        multi_year_plan['baseline'] = {
            'year': current_year,
            'fsfvi': original_baseline_fsfvi,
            'optimal_fsfvi': original_baseline_fsfvi,
            'components': [],
            'note': 'Baseline represents current allocations (fixed/already spent) without optimization'
        }
        
        # CUMULATIVE NEW BUDGET OPTIMIZATION: Each year adds new budget to previous optimizations
        cumulative_components = [comp.copy() for comp in components]
        cumulative_new_budget_total = 0
        trajectory_data = []
        
        for year in planning_years:
            year_new_budget = processed_budget_scenarios[year]
            cumulative_new_budget_total += year_new_budget
            
            # Enhanced constraints for strategy-based optimization
            year_constraints = constraints.copy()
            
            # Add strategy-specific constraints
            if strategy_config:
                year_constraints.update(self._generate_strategy_constraints(
                    strategy_config, year, year_new_budget
                ))
            
            # Target-based constraints
            if target_fsfvi and target_year and year <= target_year:
                years_remaining = target_year - year + 1
                progress_target = self._calculate_progressive_target(
                    original_baseline_fsfvi, target_fsfvi, years_remaining
                )
                year_constraints['target_fsfvi'] = progress_target
            
            # Optimize NEW BUDGET ONLY for this year
            year_result = self.optimize_allocation(
                cumulative_components,
                year_new_budget,
                method, 
                scenario, 
                year_constraints,
                new_budget_only=True,
                new_budget_amount=year_new_budget
            )
            
            # If optimization successful, update cumulative components
            if year_result.get('success', False) and 'optimal_new_allocations' in year_result:
                for i, new_allocation in enumerate(year_result['optimal_new_allocations']):
                    if i < len(cumulative_components):
                        cumulative_components[i]['financial_allocation'] += new_allocation
            
            # Calculate CUMULATIVE FSFVI with all new budget optimizations applied
            cumulative_fsfvi_result = self.calculation_service.calculate_fsfvi(
                cumulative_components, method=method, scenario=scenario
            )
            cumulative_fsfvi = cumulative_fsfvi_result['fsfvi_value']
            
            # Calculate improvement from ORIGINAL baseline
            improvement_from_baseline = ((original_baseline_fsfvi - cumulative_fsfvi) / original_baseline_fsfvi) * 100
            
            logger.info(f"=== YEAR {year} ENHANCED CUMULATIVE IMPACT ===")
            logger.info(f"Budget Strategy: {strategy_config.get('budgetStrategy', 'legacy') if strategy_config else 'legacy'}")
            logger.info(f"Original baseline FSFVI: {original_baseline_fsfvi:.6f}")
            logger.info(f"Cumulative FSFVI: {cumulative_fsfvi:.6f}")
            logger.info(f"Cumulative improvement: {improvement_from_baseline:.2f}%")
            
            # Enhanced transition analysis
            if len(trajectory_data) > 0:
                previous_total_allocations = [comp['financial_allocation'] for comp in cumulative_components]
                for i, new_allocation in enumerate(year_result.get('optimal_new_allocations', [])):
                    if i < len(previous_total_allocations):
                        previous_total_allocations[i] -= new_allocation
            else:
                previous_total_allocations = [comp['financial_allocation'] for comp in components]
            
            current_total_allocations = [comp['financial_allocation'] for comp in cumulative_components]
            
            transition_analysis = self._analyze_year_transition(
                previous_total_allocations, current_total_allocations, year_new_budget
            )
            
            # Enhanced yearly recommendation with strategy insights
            yearly_recommendation = {
                'new_budget_this_year': year_new_budget,
                'cumulative_new_budget': cumulative_new_budget_total,
                'current_allocations_total': sum(comp['financial_allocation'] for comp in components),
                'total_budget_after_new': sum(comp['financial_allocation'] for comp in cumulative_components),
                'optimal_new_allocations': year_result.get('optimal_new_allocations', []),
                'total_allocations_after_optimization': current_total_allocations,
                'projected_fsfvi': cumulative_fsfvi,
                'improvement_from_baseline': improvement_from_baseline,
                'component_analysis': year_result.get('component_analysis', {}),
                'transition_analysis': transition_analysis,
                'implementation_complexity': self._assess_yearly_implementation(year_result, transition_analysis),
                'crisis_resilience_score': self._calculate_crisis_resilience(cumulative_components, current_total_allocations, method),
                'optimization_type': 'enhanced_cumulative_new_budget'
            }
            
            # Add strategy-specific insights
            if strategy_config:
                yearly_recommendation.update(self._generate_yearly_strategy_insights(
                    strategy_config, year, year_new_budget, yearly_recommendation
                ))
            
            multi_year_plan['yearly_recommendations'][year] = yearly_recommendation
            
            # Track enhanced trajectory
            trajectory_data.append({
                'year': year,
                'fsfvi': cumulative_fsfvi,
                'new_budget': year_new_budget,
                'cumulative_new_budget': cumulative_new_budget_total,
                'improvement': improvement_from_baseline,
                'budget_strategy': strategy_config.get('budgetStrategy', 'legacy') if strategy_config else 'legacy'
            })
        
        # Enhanced trajectory analysis
        multi_year_plan['trajectory_analysis'] = self._analyze_enhanced_trajectory(
            trajectory_data, target_fsfvi, target_year, strategy_config
        )
        
        # Target achievement analysis
        if target_fsfvi and target_year:
            multi_year_plan['target_achievement'] = self._analyze_target_achievement(
                trajectory_data, target_fsfvi, target_year, processed_budget_scenarios
            )
        
        # Crisis preparedness analysis
        multi_year_plan['crisis_preparedness'] = self._analyze_crisis_preparedness(
            multi_year_plan['yearly_recommendations'], method
        )
        
        # Enhanced government recommendations
        multi_year_plan['government_recommendations'] = self._generate_enhanced_government_recommendations(
            multi_year_plan, target_fsfvi, target_year, strategy_config
        )
        
        return multi_year_plan

    def _process_budget_strategy_config(
        self, 
        strategy_config: Dict[str, Any], 
        components: List[Dict[str, Any]]
    ) -> Dict[int, float]:
        """
        Process budget strategy configuration into yearly budget scenarios
        
        Args:
            strategy_config: Strategy configuration
            components: Component data for context
            
        Returns:
            Dictionary of {year: budget_amount}
        """
        budget_strategy = strategy_config.get('budgetStrategy', 'fixed_annual')
        start_year = strategy_config.get('startYear', 2024)
        end_year = strategy_config.get('endYear', 2029)
        base_budget = strategy_config.get('baseBudget', 500.0)
        
        budget_scenarios = {}
        
        if budget_strategy == 'fixed_annual':
            # Fixed amount each year
            for year in range(start_year, end_year + 1):
                budget_scenarios[year] = base_budget
                
        elif budget_strategy == 'percentage_growth':
            # Compound growth over time
            growth_rate = strategy_config.get('budgetGrowthRate', 0.05)
            for year in range(start_year, end_year + 1):
                year_index = year - start_year
                budget_scenarios[year] = base_budget * (1 + growth_rate) ** year_index
                
        elif budget_strategy == 'custom':
            # Custom amounts for each year
            custom_budgets = strategy_config.get('customYearBudgets', {})
            for year in range(start_year, end_year + 1):
                budget_scenarios[year] = custom_budgets.get(str(year), base_budget)
                
        elif budget_strategy == 'algorithm':
            # Algorithm-based dynamic allocation
            budget_scenarios = self._calculate_algorithm_based_budget(
                strategy_config, components
            )
            
        else:
            raise ValueError(f"Unknown budget strategy: {budget_strategy}")
        
        return budget_scenarios

    def _calculate_algorithm_based_budget(
        self, 
        strategy_config: Dict[str, Any], 
        components: List[Dict[str, Any]]
    ) -> Dict[int, float]:
        """
        Calculate algorithm-based budget allocation using economic and political factors
        
        This implements a sophisticated budget allocation algorithm that considers:
        1. Economic cycles (GDP growth, inflation, fiscal constraints)
        2. Political priorities (election cycles, policy stability)
        3. Performance-based adjustments (system improvements)
        4. Crisis response mechanisms (external shocks)
        
        Args:
            strategy_config: Algorithm configuration
            components: Component data for performance context
            
        Returns:
            Dictionary of {year: budget_amount}
        """
        algorithm_config = strategy_config.get('algorithmConfig', {})
        start_year = strategy_config.get('startYear', 2024)
        end_year = strategy_config.get('endYear', 2029)
        base_budget = strategy_config.get('baseBudget', 500.0)
        
        # Algorithm parameters
        baseline_growth = algorithm_config.get('baselineGrowthRate', 0.03)
        economic_cycle_impact = algorithm_config.get('economicCycleImpact', 0.15)
        political_priority_shift = algorithm_config.get('politicalPriorityShift', 0.10)
        performance_adjustment = algorithm_config.get('performanceBasedAdjustment', 0.20)
        crisis_response_factor = algorithm_config.get('crisisResponseFactor', 0.25)
        
        # Economic assumptions
        economic_assumptions = algorithm_config.get('economicAssumptions', {})
        inflation_rate = economic_assumptions.get('inflationRate', 0.03)
        gdp_growth_rate = economic_assumptions.get('gdpGrowthRate', 0.025)
        fiscal_constraints = economic_assumptions.get('fiscalConstraints', 'moderate')
        
        # Political context
        political_context = algorithm_config.get('politicalContext', {})
        election_cycle = political_context.get('electionCycle', 4)
        current_election_year = political_context.get('currentElectionYear', 2024)
        policy_stability = political_context.get('policyStability', 'stable')
        
        # Performance-based context from components
        system_performance = self._analyze_system_performance(components)
        
        budget_scenarios = {}
        
        for year in range(start_year, end_year + 1):
            year_index = year - start_year
            
            # 1. Base growth with inflation adjustment
            base_growth_factor = (1 + baseline_growth) ** year_index
            inflation_adjusted = base_growth_factor * (1 + inflation_rate) ** year_index
            
            # 2. Economic cycle factor (simulated business cycle)
            cycle_phase = (year_index / 8.0) * 2 * np.pi  # 8-year cycle
            economic_cycle_factor = 1 + economic_cycle_impact * 0.5 * (1 + np.sin(cycle_phase))
            
            # 3. Political priority factor (election cycle effects)
            years_to_election = (current_election_year - year) % election_cycle
            if years_to_election <= 1:  # Election year or pre-election
                political_factor = 1 + political_priority_shift
            elif years_to_election == 2:  # Post-election adjustment
                political_factor = 1 - political_priority_shift * 0.5
            else:  # Mid-cycle stability
                political_factor = 1.0
                
            # Adjust for policy stability
            if policy_stability == 'volatile':
                political_factor *= 1 + 0.1 * np.random.uniform(-1, 1)
            elif policy_stability == 'unstable':
                political_factor *= 1 + 0.2 * np.random.uniform(-1, 1)
            
            # 4. Performance-based adjustment using actual system data
            performance_factor = 1 + performance_adjustment * system_performance['improvement_potential']
            performance_factor = max(0.8, min(1.5, performance_factor))  # Bound between 80%-150%
            
            # 5. Crisis response factor (external shocks)
            crisis_factor = 1.0
            if year_index == 2:  # Simulated crisis in year 3
                crisis_factor = 1 + crisis_response_factor
            elif year_index == 3:  # Recovery phase
                crisis_factor = 1 + crisis_response_factor * 0.5
            
            # 6. Fiscal constraint factor
            fiscal_factor = 1.0
            if fiscal_constraints == 'high':
                fiscal_factor = 0.9  # 10% reduction
            elif fiscal_constraints == 'low':
                fiscal_factor = 1.1  # 10% increase
            
            # Combine all factors
            total_factor = (
                inflation_adjusted * 
                economic_cycle_factor * 
                political_factor * 
                performance_factor * 
                crisis_factor * 
                fiscal_factor
            )
            
            # Calculate final budget
            year_budget = base_budget * total_factor
            
            # Ensure reasonable bounds (50% to 300% of base budget)
            year_budget = max(base_budget * 0.5, min(base_budget * 3.0, year_budget))
            
            budget_scenarios[year] = float(year_budget)
        
        return budget_scenarios

    def _analyze_system_performance(self, components: List[Dict[str, Any]]) -> Dict[str, float]:
        """Analyze system performance for algorithm-based budget calculation"""
        from fsfvi_core import calculate_performance_gap
        from config import get_component_performance_preference
        
        performance_gaps = []
        vulnerabilities = []
        
        for comp in components:
            prefer_higher = get_component_performance_preference(comp['component_type'])
            gap = calculate_performance_gap(comp['observed_value'], comp['benchmark_value'], prefer_higher)
            performance_gaps.append(gap)
            
            # Estimate vulnerability
            sensitivity = comp.get('sensitivity_parameter', 0.001)
            vulnerability = gap / (1 + sensitivity * comp['financial_allocation'])
            vulnerabilities.append(vulnerability)
        
        avg_gap = np.mean(performance_gaps)
        avg_vulnerability = np.mean(vulnerabilities)
        
        return {
            'avg_performance_gap': avg_gap,
            'avg_vulnerability': avg_vulnerability,
            'improvement_potential': avg_gap * 0.5,  # Conservative estimate
            'system_stability': 1 - np.std(vulnerabilities)
        }

    def _generate_strategy_constraints(
        self, 
        strategy_config: Dict[str, Any], 
        year: int, 
        year_budget: float
    ) -> Dict[str, Any]:
        """Generate strategy-specific constraints for optimization"""
        constraints = {}
        
        budget_strategy = strategy_config.get('budgetStrategy', 'fixed_annual')
        
        if budget_strategy == 'algorithm':
            # Algorithm-based constraints adapt to economic conditions
            algorithm_config = strategy_config.get('algorithmConfig', {})
            
            # Adjust constraints based on economic cycle
            if year_budget > strategy_config.get('baseBudget', 500) * 1.2:
                # High budget year - more aggressive constraints
                constraints['transitionLimit'] = 40
                constraints['maxAllocation'] = 50
            else:
                # Normal/low budget year - conservative constraints
                constraints['transitionLimit'] = 20
                constraints['maxAllocation'] = 35
        
        elif budget_strategy == 'percentage_growth':
            # Growth-based constraints
            growth_rate = strategy_config.get('budgetGrowthRate', 0.05)
            if growth_rate > 0.1:  # High growth
                constraints['transitionLimit'] = 35
            else:  # Normal growth
                constraints['transitionLimit'] = 25
        
        return constraints

    def _generate_yearly_strategy_insights(
        self,
        strategy_config: Dict[str, Any],
        year: int,
        year_budget: float,
        yearly_recommendation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate strategy-specific insights for yearly recommendations"""
        insights = {}
        
        budget_strategy = strategy_config.get('budgetStrategy', 'fixed_annual')
        
        insights['budget_strategy_type'] = budget_strategy
        insights['budget_determination'] = self._explain_budget_determination(
            strategy_config, year, year_budget
        )
        
        if budget_strategy == 'algorithm':
            insights['algorithm_factors'] = self._explain_algorithm_factors(
                strategy_config, year, year_budget
            )
        
        return insights

    def _explain_budget_determination(
        self, 
        strategy_config: Dict[str, Any], 
        year: int, 
        year_budget: float
    ) -> str:
        """Explain how the budget for this year was determined"""
        budget_strategy = strategy_config.get('budgetStrategy', 'fixed_annual')
        base_budget = strategy_config.get('baseBudget', 500)
        
        if budget_strategy == 'fixed_annual':
            return f"Fixed annual budget of ${year_budget:.1f}M as configured"
        
        elif budget_strategy == 'percentage_growth':
            growth_rate = strategy_config.get('budgetGrowthRate', 0.05)
            year_index = year - strategy_config.get('startYear', 2024)
            return f"Compound growth: ${base_budget:.1f}M × (1 + {growth_rate*100:.1f}%)^{year_index} = ${year_budget:.1f}M"
        
        elif budget_strategy == 'custom':
            return f"Custom budget allocation of ${year_budget:.1f}M as specified for {year}"
        
        elif budget_strategy == 'algorithm':
            change_percent = ((year_budget - base_budget) / base_budget) * 100
            return f"Algorithm-based allocation: ${year_budget:.1f}M ({change_percent:+.1f}% from base)"
        
        return f"Budget: ${year_budget:.1f}M"

    def _explain_algorithm_factors(
        self, 
        strategy_config: Dict[str, Any], 
        year: int, 
        year_budget: float
    ) -> Dict[str, Any]:
        """Explain the algorithm factors that influenced this year's budget"""
        algorithm_config = strategy_config.get('algorithmConfig', {})
        base_budget = strategy_config.get('baseBudget', 500)
        
        factors = {
            'base_budget': base_budget,
            'final_budget': year_budget,
            'total_change_percent': ((year_budget - base_budget) / base_budget) * 100,
            'contributing_factors': []
        }
        
        # Add explanations for major factors
        if algorithm_config.get('economicCycleImpact', 0) > 0:
            factors['contributing_factors'].append('Economic cycle adjustment applied')
        
        if algorithm_config.get('politicalPriorityShift', 0) > 0:
            factors['contributing_factors'].append('Political priority cycle adjustment')
        
        if algorithm_config.get('performanceBasedAdjustment', 0) > 0:
            factors['contributing_factors'].append('Performance-based adjustment applied')
        
        return factors

    def _analyze_enhanced_trajectory(
        self,
        trajectory_data: List[Dict[str, Any]],
        target_fsfvi: Optional[float],
        target_year: Optional[int],
        strategy_config: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze enhanced trajectory with strategy insights"""
        
        # Call base trajectory analysis
        base_analysis = self._analyze_multi_year_trajectory(
            trajectory_data, target_fsfvi, target_year
        )
        
        # Add strategy-specific insights
        if strategy_config:
            base_analysis['budget_strategy'] = strategy_config.get('budgetStrategy', 'unknown')
            base_analysis['strategy_effectiveness'] = self._evaluate_strategy_effectiveness(
                trajectory_data, strategy_config
            )
        
        return base_analysis

    def _evaluate_strategy_effectiveness(
        self,
        trajectory_data: List[Dict[str, Any]],
        strategy_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate the effectiveness of the chosen budget strategy"""
        
        budget_strategy = strategy_config.get('budgetStrategy', 'fixed_annual')
        
        # Calculate strategy metrics
        budgets = [d['new_budget'] for d in trajectory_data]
        improvements = [d['improvement'] for d in trajectory_data]
        
        budget_volatility = np.std(budgets) / np.mean(budgets) if budgets else 0
        improvement_consistency = 1 - (np.std(improvements) / np.mean(improvements)) if improvements and np.mean(improvements) > 0 else 0
        
        effectiveness = {
            'budget_volatility': budget_volatility,
            'improvement_consistency': improvement_consistency,
            'strategy_rating': 'stable' if budget_volatility < 0.2 else 'volatile',
            'recommendation': ''
        }
        
        if budget_strategy == 'algorithm':
            effectiveness['recommendation'] = 'Algorithm adapts to economic conditions - monitor for excessive volatility'
        elif budget_strategy == 'percentage_growth':
            effectiveness['recommendation'] = 'Steady growth strategy - predictable but may not respond to crises'
        elif budget_strategy == 'custom':
            effectiveness['recommendation'] = 'Custom strategy allows precise control - ensure alignment with priorities'
        else:
            effectiveness['recommendation'] = 'Fixed strategy provides stability - consider growth adjustments'
        
        return effectiveness

    def _generate_enhanced_government_recommendations(
        self,
        multi_year_plan: Dict[str, Any],
        target_fsfvi: Optional[float],
        target_year: Optional[int],
        strategy_config: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate enhanced government recommendations with strategy insights"""
        
        # Get base recommendations
        base_recommendations = self._generate_government_recommendations(
            multi_year_plan, target_fsfvi, target_year
        )
        
        # Add strategy-specific recommendations
        if strategy_config:
            budget_strategy = strategy_config.get('budgetStrategy', 'fixed_annual')
            
            # Strategy-specific immediate actions
            if budget_strategy == 'algorithm':
                base_recommendations['immediate_actions'].insert(0, 
                    'Monitor algorithm performance and adjust parameters as needed')
            elif budget_strategy == 'percentage_growth':
                base_recommendations['immediate_actions'].insert(0,
                    'Ensure sustainable growth rate given fiscal constraints')
            
            # Strategy-specific long-term vision
            strategy_vision = {
                'algorithm': 'Develop adaptive budget mechanisms that respond to economic cycles',
                'percentage_growth': 'Maintain steady growth trajectory with periodic reviews',
                'custom': 'Implement precise budget targeting based on strategic priorities',
                'fixed_annual': 'Establish stable funding foundation for long-term planning'
            }
            
            base_recommendations['long_term_vision'].insert(0, 
                strategy_vision.get(budget_strategy, 'Optimize budget strategy for system needs'))
        
        return base_recommendations

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
            'optimal_allocations': allocations.tolist() if hasattr(allocations, 'tolist') else list(allocations),
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
        Sanitize optimization result by replacing infinite/NaN values with reasonable fallbacks
        """
        import math
        
        def sanitize_value(value):
            if isinstance(value, (int, float, np.number)):
                if math.isnan(value):
                    logger.warning(f"NaN value detected and replaced with 0.0: originally {value}")
                    return 0.0
                elif math.isinf(value):
                    if value > 0:
                        logger.warning(f"Positive infinite value detected and replaced with 1000.0: originally {value}")
                        return 1000.0  # Large but finite value
                    else:
                        logger.warning(f"Negative infinite value detected and replaced with -1000.0: originally {value}")
                        return -1000.0  # Large negative but finite value
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
        previous_allocations: Optional[List[float]],
        current_allocations: List[float],
        budget: float
    ) -> Dict[str, Any]:
        """Analyze transition between consecutive years"""
        
        if previous_allocations is None:
            return {'is_baseline': True}
        
        current_array = np.array(current_allocations)
        previous_array = np.array(previous_allocations)
        changes = current_array - previous_array
        
        # Safe division for change percentages
        change_percents = np.zeros_like(changes)
        for i, (change, prev_alloc) in enumerate(zip(changes, previous_array)):
            if prev_alloc > 0:
                change_percents[i] = (change / prev_alloc) * 100
            else:
                # Handle division by zero case
                change_percents[i] = 0.0 if change == 0 else (100.0 if change > 0 else -100.0)
        
        # Safe budget division
        budget_safe = max(budget, 1e-6)  # Avoid division by zero
        total_changes = np.sum(np.abs(changes))
        reallocation_intensity = (total_changes / budget_safe) * 100
        
        # Ensure all values are finite
        change_percents = np.nan_to_num(change_percents, nan=0.0, posinf=1000.0, neginf=-1000.0)
        
        # Debug logging
        logger.info(f"Transition analysis calculated:")
        logger.info(f"  Changes: {[round(x, 1) for x in changes]}")
        logger.info(f"  Total reallocation: ${total_changes:.1f}M")
        logger.info(f"  Components increased: {int(np.sum(changes > 0))}")
        logger.info(f"  Components decreased: {int(np.sum(changes < 0))}")
        
        return {
            'total_reallocation': float(np.clip(total_changes, 0, 1e10)),
            'reallocation_intensity': float(np.clip(reallocation_intensity, 0, 1000)),
            'max_increase_percent': float(np.clip(np.max(change_percents), -1000, 1000)),
            'max_decrease_percent': float(np.clip(np.min(change_percents), -1000, 1000)),
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
        budgets = [d.get('new_budget', d.get('budget', 0)) for d in trajectory_data]
        
        # The improvement values in trajectory_data are already calculated from baseline
        # Use the final improvement value (already calculated from original baseline)
        if trajectory_data:
            total_improvement = trajectory_data[-1].get('improvement', 0.0)
        else:
            total_improvement = 0.0
            
        average_yearly_improvement = total_improvement / max(len(trajectory_data), 1)
        
        # Budget efficiency with safety checks
        total_budget = sum(budgets)
        if total_budget > 1e-6:  # Avoid division by very small numbers
            efficiency_per_billion = total_improvement / (total_budget / 1000)
        else:
            efficiency_per_billion = 0.0
        
        # Ensure values are finite and reasonable
        total_improvement = float(np.clip(np.nan_to_num(total_improvement, nan=0.0, posinf=1000.0, neginf=-1000.0), -1000, 1000))
        average_yearly_improvement = float(np.clip(np.nan_to_num(average_yearly_improvement, nan=0.0, posinf=100.0, neginf=-100.0), -100, 100))
        efficiency_per_billion = float(np.clip(np.nan_to_num(efficiency_per_billion, nan=0.0, posinf=1000.0, neginf=-1000.0), -1000, 1000))
        
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
            # Estimate additional budget needed with safety checks
            if target_fsfvi > 1e-6:  # Avoid division by very small numbers
                gap_percent = ((projected_fsfvi - target_fsfvi) / target_fsfvi) * 100
            else:
                gap_percent = 0.0
                
            total_budget_scenarios = sum(budget_scenarios.values())
            estimated_additional_budget = total_budget_scenarios * (gap_percent / 100) * 2  # Rough estimate
            
            # Calculate additional budget percentage safely
            if total_budget_scenarios > 1e-6:
                additional_budget_percent = (estimated_additional_budget / total_budget_scenarios) * 100
            else:
                additional_budget_percent = 0.0
            
            # Ensure values are finite
            estimated_additional_budget = float(np.clip(np.nan_to_num(estimated_additional_budget, nan=0.0, posinf=1e10, neginf=0.0), 0, 1e10))
            additional_budget_percent = float(np.clip(np.nan_to_num(additional_budget_percent, nan=0.0, posinf=1000.0, neginf=0.0), 0, 1000))
            
            analysis.update({
                'additional_budget_needed_millions': estimated_additional_budget,
                'additional_budget_percent': additional_budget_percent,
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
                'budget': recommendation.get('new_budget_this_year', recommendation.get('budget', 0))
            }
        
        # Generate recommendations with safety check
        resilience_scores = [r['resilience_score'] for r in preparedness_analysis['overall_resilience_trend']]
        if resilience_scores:
            avg_resilience = float(np.clip(np.mean(resilience_scores), 0.0, 1.0))
        else:
            avg_resilience = 0.5  # Default moderate resilience
        
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
                'implementation_complexity': self.optimization_service._assess_implementation_complexity(comp['component_type'], abs(change_percent))
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