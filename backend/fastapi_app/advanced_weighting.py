"""
Advanced Weighting Methodologies for FSFVI
===========================================

Streamlined weighting system focused on sophisticated weighting methods
that capture true component importance beyond financial allocation patterns.

This module implements:
1. Expert-driven weighting (AHP-based with scenario adaptation)
2. Network centrality metrics (PageRank, Eigenvector centrality)
3. Dependency matrix analysis for cascading failures
4. Dynamic weight integration with FSFVI vulnerability adjustment
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from scipy.linalg import eig
import logging

try:
    from .config import WEIGHTING_CONFIG, get_component_types, normalize_component_type
    from .exceptions import (
        WeightingError, AHPValidationError, NetworkAnalysisError, 
        DependencyMatrixError, handle_weighting_error
    )
    from .validators import validate_ahp_matrix, validate_dependency_matrix
except ImportError:
    # Fallback to absolute imports
    from config import WEIGHTING_CONFIG, get_component_types, normalize_component_type
    from exceptions import (
        WeightingError, AHPValidationError, NetworkAnalysisError, 
        DependencyMatrixError, handle_weighting_error
    )
    from validators import validate_ahp_matrix, validate_dependency_matrix

logger = logging.getLogger(__name__)


class ExpertWeightingSystem:
    """Expert-driven weighting with AHP and scenario adaptation"""
    
    def __init__(self):
        # Expert consensus weights based on 3FS framework
        self.expert_consensus_weights = {
            'agricultural_development': 0.25,
            'infrastructure': 0.20,
            'nutrition_health': 0.20,
            'climate_natural_resources': 0.20,
            'social_assistance': 0.10,
            'governance_institutions': 0.05
        }
        
        # AHP matrix with validated reciprocal property
        self.ahp_matrix = self._build_consistent_ahp_matrix()
        
        # Scenario-specific weights (normalized to sum to 1.0)
        self.scenario_weights = self._build_scenario_weights()
    
    def _build_consistent_ahp_matrix(self) -> np.ndarray:
        """Build AHP matrix ensuring reciprocal property"""
        n = 6  # Number of components
        matrix = np.ones((n, n))
        
        # Upper triangular values based on expert consensus
        upper_values = {
            (0, 1): 1.25, (0, 2): 1.5, (0, 3): 1.0, (0, 4): 2.5, (0, 5): 5.0,
            (1, 2): 1.2, (1, 3): 0.9, (1, 4): 2.0, (1, 5): 4.0,
            (2, 3): 0.8, (2, 4): 2.0, (2, 5): 4.0,
            (3, 4): 2.5, (3, 5): 4.0,
            (4, 5): 2.0
        }
        
        # Fill matrix ensuring reciprocal property
        for (i, j), value in upper_values.items():
            matrix[i, j] = value
            matrix[j, i] = 1.0 / value
        
        # Validate matrix
        validate_ahp_matrix(matrix)
        
        return matrix
    
    def _build_scenario_weights(self) -> Dict[str, Dict[str, float]]:
        """Build normalized scenario weights"""
        raw_scenarios = {
            'normal_operations': {
                'agricultural_development': 0.25, 'infrastructure': 0.18,
                'nutrition_health': 0.22, 'climate_natural_resources': 0.15,
                'social_assistance': 0.15, 'governance_institutions': 0.05
            },
            'climate_shock': {
                'agricultural_development': 0.20, 'infrastructure': 0.25,
                'nutrition_health': 0.15, 'climate_natural_resources': 0.30,
                'social_assistance': 0.08, 'governance_institutions': 0.02
            },
            'financial_crisis': {
                'agricultural_development': 0.30, 'infrastructure': 0.15,
                'nutrition_health': 0.25, 'climate_natural_resources': 0.10,
                'social_assistance': 0.18, 'governance_institutions': 0.02
            },
            'pandemic_disruption': {
                'agricultural_development': 0.28, 'infrastructure': 0.22,
                'nutrition_health': 0.30, 'climate_natural_resources': 0.08,
                'social_assistance': 0.10, 'governance_institutions': 0.02
            },
            'supply_chain_disruption': {
                'agricultural_development': 0.25, 'infrastructure': 0.35,
                'nutrition_health': 0.20, 'climate_natural_resources': 0.10,
                'social_assistance': 0.08, 'governance_institutions': 0.02
            },
            'cyber_threats': {
                'agricultural_development': 0.20, 'infrastructure': 0.30,
                'nutrition_health': 0.15, 'climate_natural_resources': 0.10,
                'social_assistance': 0.15, 'governance_institutions': 0.10
            },
            'political_instability': {
                'agricultural_development': 0.22, 'infrastructure': 0.20,
                'nutrition_health': 0.18, 'climate_natural_resources': 0.12,
                'social_assistance': 0.20, 'governance_institutions': 0.08
            }
        }
        
        # Normalize all scenarios
        normalized_scenarios = {}
        for scenario_name, weights in raw_scenarios.items():
            total = sum(weights.values())
            normalized_scenarios[scenario_name] = {
                component: weight / total for component, weight in weights.items()
            }
        
        return normalized_scenarios
    
    @handle_weighting_error
    def calculate_ahp_weights(self) -> Dict[str, float]:
        """Calculate weights using Analytic Hierarchy Process"""
        eigenvalues, eigenvectors = eig(self.ahp_matrix)
        
        # Get principal eigenvector
        max_eigenvalue_index = np.argmax(eigenvalues.real)
        principal_eigenvector = eigenvectors[:, max_eigenvalue_index].real
        
        # Normalize weights
        weights = np.abs(principal_eigenvector) / np.sum(np.abs(principal_eigenvector))
        
        component_types = get_component_types()
        ahp_weights = dict(zip(component_types, weights))
        
        # Ensure normalization
        total_weight = sum(ahp_weights.values())
        if not (0.999 <= total_weight <= 1.001):
            ahp_weights = {k: v/total_weight for k, v in ahp_weights.items()}
        
        return ahp_weights
            
    @handle_weighting_error
    def get_scenario_weights(
        self, 
        scenario: str = 'normal_operations',
        shock_probabilities: Optional[Dict[str, float]] = None
    ) -> Dict[str, float]:
        """Get weights for specific scenario or shock probability distribution"""
        
        if shock_probabilities is None:
            return self.scenario_weights.get(
                scenario, 
                self.scenario_weights['normal_operations']
            ).copy()
        
        # Weighted average based on shock probabilities
        total_prob = sum(shock_probabilities.values())
        if total_prob <= 0:
            return self.scenario_weights['normal_operations'].copy()
        
        normalized_probs = {k: v/total_prob for k, v in shock_probabilities.items()}
        
        weighted_weights = {}
        for component in get_component_types():
            weight = 0.0
            for scenario_name, probability in normalized_probs.items():
                scenario_weight = self.scenario_weights.get(scenario_name, {}).get(component, 0.0)
                weight += probability * scenario_weight
            weighted_weights[component] = weight
        
        # Normalize final weights
        total_weight = sum(weighted_weights.values())
        if total_weight > 0:
            weighted_weights = {k: v/total_weight for k, v in weighted_weights.items()}
        
        return weighted_weights


class NetworkCentralityAnalyzer:
    """Network analysis for component interdependencies"""
    
    def __init__(self):
        # Validated dependency matrix with uncertainty estimates
        self.dependency_matrix, self.uncertainty_matrix = self._build_dependency_matrices()
        self.component_types = get_component_types()
    
    def _build_dependency_matrices(self) -> Tuple[np.ndarray, np.ndarray]:
        """Build dependency and uncertainty matrices"""
        
        # Base dependency matrix (validated)
        base_matrix = np.array([
            [1.0, 0.8, 0.2, 0.7, 0.15, 0.3],  # Agricultural development
            [0.4, 1.0, 0.1, 0.6, 0.1,  0.5],  # Infrastructure
            [0.9, 0.7, 1.0, 0.3, 0.2,  0.2],  # Nutrition health
            [0.5, 0.4, 0.2, 1.0, 0.1,  0.4],  # Climate natural resources
            [0.6, 0.3, 0.8, 0.2, 1.0,  0.6],  # Social assistance
            [0.2, 0.3, 0.2, 0.3, 0.3,  1.0]   # Governance institutions
        ])
        
        # Uncertainty matrix
        uncertainty_matrix = np.array([
            [0.0, 0.2, 0.3, 0.2, 0.3, 0.4],
            [0.3, 0.0, 0.4, 0.2, 0.4, 0.3],
            [0.2, 0.2, 0.0, 0.3, 0.3, 0.4],
            [0.3, 0.3, 0.4, 0.0, 0.4, 0.3],
            [0.3, 0.3, 0.2, 0.4, 0.0, 0.2],
            [0.4, 0.4, 0.4, 0.3, 0.2, 0.0]
        ])
        
        # Validate matrices
        validate_dependency_matrix(base_matrix)
        
        return base_matrix, uncertainty_matrix
    
    @handle_weighting_error
    def calculate_pagerank_centrality(self, damping: Optional[float] = None) -> Dict[str, float]:
        """Calculate PageRank centrality with uncertainty consideration"""
        
        if damping is None:
            damping = WEIGHTING_CONFIG.pagerank_damping
        
        n = len(self.dependency_matrix)
        
        # Create transition matrix
        row_sums = self.dependency_matrix.sum(axis=1)
        transition_matrix = self.dependency_matrix / row_sums[:, np.newaxis]
        
        # PageRank calculation
        pagerank = np.ones(n) / n
        tolerance = WEIGHTING_CONFIG.pagerank_tolerance
        max_iterations = WEIGHTING_CONFIG.pagerank_max_iterations
        
        for iteration in range(max_iterations):
            new_pagerank = (1 - damping) / n + damping * transition_matrix.T @ pagerank
            
            if np.allclose(pagerank, new_pagerank, atol=tolerance):
                logger.info(f"PageRank converged after {iteration} iterations")
                break
                
            pagerank = new_pagerank
        
        # Normalize
        pagerank = pagerank / np.sum(pagerank)
        
        return dict(zip(self.component_types, pagerank))
            
    @handle_weighting_error
    def calculate_cascade_multipliers(self) -> Dict[str, float]:
        """Calculate cascade impact multipliers with uncertainty adjustment"""
        
        cascade_impacts = {}
        
        for i, component in enumerate(self.component_types):
            # Primary impact from dependencies
            primary_impact = np.sum(self.dependency_matrix[:, i]) - 1  # Exclude self
            
            # Secondary cascading effects
            secondary_impact = 0
            for j in range(len(self.component_types)):
                if j != i:
                    j_impact = self.dependency_matrix[j, i]
                    j_downstream = np.sum(self.dependency_matrix[:, j]) - 1
                    secondary_impact += j_impact * j_downstream * 0.5  # Damping
                
            # Adjust for uncertainty
            uncertainty_factor = np.mean(self.uncertainty_matrix[:, i])
            total_impact = (primary_impact + secondary_impact) * (1 - uncertainty_factor * 0.5)
            
            cascade_impacts[component] = max(0, total_impact)
    
        # Normalize
        max_impact = max(cascade_impacts.values()) if cascade_impacts.values() else 1.0
        if max_impact > 0:
            cascade_impacts = {k: v/max_impact for k, v in cascade_impacts.items()}
        
        return cascade_impacts
    
    def get_uncertainty_scores(self) -> Dict[str, float]:
        """Get uncertainty scores for network metrics"""
        return {
            component: np.mean(self.uncertainty_matrix[i, :])
            for i, component in enumerate(self.component_types)
        }


class DynamicWeightingSystem:
    """Integrated dynamic weighting system"""
    
    def __init__(self):
        self.expert_system = ExpertWeightingSystem()
        self.network_analyzer = NetworkCentralityAnalyzer()
        logger.info("Dynamic Weighting System initialized")
    
    @handle_weighting_error
    def calculate_integrated_weights(
        self,
        components: List[Dict],
        weighting_method: str = 'hybrid',
        scenario: str = 'normal_operations',
        shock_probabilities: Optional[Dict[str, float]] = None,
        performance_adjustment: bool = True
    ) -> Dict[str, float]:
        """
        Calculate integrated component weights using specified methodology
        
        Args:
            components: Component data list
            weighting_method: 'expert', 'network', 'hybrid', or 'financial'
            scenario: Analysis scenario
            shock_probabilities: Shock probability distribution (optional)
            performance_adjustment: Apply FSFVI performance adjustment
            
        Returns:
            Dictionary mapping component types to weights
        """
        
        # Get base weights from different sources
        expert_weights = self.expert_system.get_scenario_weights(scenario, shock_probabilities)
        pagerank_weights = self.network_analyzer.calculate_pagerank_centrality()
        cascade_weights = self.network_analyzer.calculate_cascade_multipliers()
        
        # Calculate financial weights
        financial_weights = self._calculate_financial_weights(components)
        
        # Integrate weights based on method
        if weighting_method == 'expert':
            base_weights = expert_weights
        elif weighting_method == 'network':
            base_weights = self._combine_network_weights(pagerank_weights, cascade_weights)
        elif weighting_method == 'hybrid':
            base_weights = self._combine_hybrid_weights(
                expert_weights, pagerank_weights, cascade_weights, financial_weights
            )
        elif weighting_method == 'financial':
            base_weights = financial_weights
        else:
            raise WeightingError(f"Unknown weighting method: {weighting_method}")
        
        # Apply FSFVI performance adjustment if requested
        if performance_adjustment:
            final_weights = self._apply_performance_adjustment(base_weights, components)
        else:
            final_weights = base_weights.copy()
        
        # Ensure normalization
        total_weight = sum(final_weights.values())
        if total_weight > 0:
            final_weights = {k: v/total_weight for k, v in final_weights.items()}
        
        return final_weights
    
    def _calculate_financial_weights(self, components: List[Dict]) -> Dict[str, float]:
        """Calculate normalized financial allocation weights"""
        
        total_allocation = sum(comp['financial_allocation'] for comp in components)
    
        if total_allocation > 0:
            financial_weights = {
                normalize_component_type(comp['component_type']): comp['financial_allocation'] / total_allocation
                for comp in components
            }
        else:
            # Equal weights if no allocation
            num_components = len(components)
            financial_weights = {
                normalize_component_type(comp['component_type']): 1.0 / num_components
                for comp in components
            }
            
        return financial_weights
    
    def _combine_network_weights(
        self, 
        pagerank_weights: Dict[str, float], 
        cascade_weights: Dict[str, float]
    ) -> Dict[str, float]:
        """Combine PageRank and cascade weights"""
        
        combined = {}
        for component in get_component_types():
            pagerank = pagerank_weights.get(component, 0.0)
            cascade = cascade_weights.get(component, 0.0)
            combined[component] = 0.7 * pagerank + 0.3 * cascade
        
        return combined
    
    def _combine_hybrid_weights(
        self,
        expert_weights: Dict[str, float],
        pagerank_weights: Dict[str, float],
        cascade_weights: Dict[str, float],
        financial_weights: Dict[str, float]
    ) -> Dict[str, float]:
        """Combine all weight sources using hybrid coefficients"""
        
        hybrid_weights = {}
        
        for component in get_component_types():
            expert = expert_weights.get(component, 0.0)
            pagerank = pagerank_weights.get(component, 0.0)
            cascade = cascade_weights.get(component, 0.0)
            financial = financial_weights.get(component, 0.0)
            
            # Weighted combination using config coefficients
            weight = (
                WEIGHTING_CONFIG.hybrid_expert_weight * expert +
                WEIGHTING_CONFIG.hybrid_pagerank_weight * pagerank +
                WEIGHTING_CONFIG.hybrid_cascade_weight * cascade +
                WEIGHTING_CONFIG.hybrid_financial_weight * financial
            )
            
            hybrid_weights[component] = weight
        
        return hybrid_weights
    
    def _apply_performance_adjustment(
        self, 
        base_weights: Dict[str, float], 
        components: List[Dict]
    ) -> Dict[str, float]:
        """Apply FSFVI vulnerability-based performance adjustment"""
        
        adjusted_weights = base_weights.copy()
        
        for comp in components:
            component_type = normalize_component_type(comp['component_type'])
            
            if component_type in adjusted_weights:
                # Calculate FSFVI vulnerability
                observed = comp['observed_value']
                benchmark = comp['benchmark_value']
                allocation = comp['financial_allocation']
                alpha_i = comp.get('sensitivity_parameter', 0.001)
                
                # Performance gap: δᵢ = |xᵢ - x̄ᵢ| / xᵢ
                if observed > 0:
                    delta_i = abs(observed - benchmark) / observed
                else:
                    delta_i = 1.0 if benchmark > 0 else 0.0
                
                # FSFVI vulnerability: υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
                vulnerability = delta_i * (1 / (1 + alpha_i * allocation))
                
                # Apply adjustment (higher vulnerability increases weight)
                adjustment_factor = 1.0 + vulnerability
                adjustment_factor = max(
                    WEIGHTING_CONFIG.adjustment_min_factor,
                    min(WEIGHTING_CONFIG.adjustment_max_factor, adjustment_factor)
                )
                
                adjusted_weights[component_type] *= adjustment_factor
        
        return adjusted_weights
    
    def analyze_weight_sensitivity(
        self,
        components: List[Dict],
        scenarios: Optional[List[str]] = None
    ) -> Dict[str, Dict[str, float]]:
        """Analyze weight sensitivity across scenarios"""
        
        if scenarios is None:
            scenarios = list(self.expert_system.scenario_weights.keys())
        
        sensitivity_analysis = {}
        
        for scenario in scenarios:
            scenario_weights = self.calculate_integrated_weights(
                components, 
                weighting_method='hybrid',
                scenario=scenario,
                performance_adjustment=True
            )
            
            # Map back to original component types
            mapped_weights = {}
            for comp in components:
                original_type = comp['component_type']
                normalized_type = normalize_component_type(original_type)
                mapped_weights[original_type] = scenario_weights.get(normalized_type, 0.0)
            
            sensitivity_analysis[scenario] = mapped_weights
            
        return sensitivity_analysis
            

# Convenience functions for integration
def get_expert_weights(components: List[Dict], scenario: str = 'normal_operations') -> Dict[str, float]:
    """Get expert-driven weights"""
    system = DynamicWeightingSystem()
    return system.calculate_integrated_weights(
        components, 
        weighting_method='expert',
        scenario=scenario,
        performance_adjustment=False
    )


def get_network_weights(components: List[Dict]) -> Dict[str, float]:
    """Get network centrality-based weights"""
    system = DynamicWeightingSystem()
    return system.calculate_integrated_weights(
        components,
        weighting_method='network',
        performance_adjustment=False
    )


def get_hybrid_weights(
    components: List[Dict], 
    scenario: str = 'normal_operations',
    shock_probabilities: Optional[Dict[str, float]] = None,
    performance_adjustment: bool = True
) -> Dict[str, float]:
    """Get hybrid weights combining all methodologies"""
    system = DynamicWeightingSystem()
    return system.calculate_integrated_weights(
        components,
        weighting_method='hybrid',
        scenario=scenario,
        shock_probabilities=shock_probabilities,
        performance_adjustment=performance_adjustment
    )


def validate_weighting_system() -> Dict[str, any]:
    """Validate the advanced weighting system"""
    try:
        from .validators import validate_system_health
    except ImportError:
        from validators import validate_system_health
    
    # Get system health validation
    health_report = validate_system_health()
    
    # Add weighting-specific validation
    try:
        system = DynamicWeightingSystem()
        
        # Test with sample data
        sample_components = [
            {
                'component_type': 'agricultural_development',
                'observed_value': 100.0,
                'benchmark_value': 120.0,
                'financial_allocation': 1000.0,
                'sensitivity_parameter': 0.001
            },
            {
                'component_type': 'infrastructure',
                'observed_value': 80.0,
                'benchmark_value': 100.0,
                'financial_allocation': 800.0,
                'sensitivity_parameter': 0.001
            }
        ]
        
        # Test all methods
        methods = ['expert', 'network', 'hybrid', 'financial']
        method_results = {}
        
        for method in methods:
            try:
                weights = system.calculate_integrated_weights(sample_components, method)
                total = sum(weights.values())
                method_results[method] = {
                    'success': True,
                    'weight_sum': total,
                    'normalized': 0.999 <= total <= 1.001
                }
            except Exception as e:
                method_results[method] = {
                    'success': False,
                    'error': str(e)
                }
        
        health_report.update({
            'weighting_validation': {
                'available_methods': methods,
                'available_scenarios': list(system.expert_system.scenario_weights.keys()),
                'method_tests': method_results,
                'ahp_matrix_shape': system.expert_system.ahp_matrix.shape,
                'dependency_matrix_shape': system.network_analyzer.dependency_matrix.shape
            }
        })
        
    except Exception as e:
        health_report['errors'].append(f"Weighting system validation failed: {str(e)}")
        health_report['overall_status'] = False
    
    return health_report 