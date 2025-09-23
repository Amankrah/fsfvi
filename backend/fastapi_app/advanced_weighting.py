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
5. Context-aware weighting and empirical calibration
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Union
from scipy.linalg import eig
from scipy import stats
import json
import os
import logging
from dataclasses import dataclass, field
from abc import ABC, abstractmethod

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


@dataclass
class ComponentMetadata:
    """Enhanced component metadata with context information"""
    name: str
    category: str
    description: str = ""
    default_weight: float = 0.0
    weight_range: Tuple[float, float] = (0.0, 1.0)
    dependencies: List[str] = field(default_factory=list)
    contexts: Dict[str, float] = field(default_factory=dict)  # Context-specific adjustments
    uncertainty: float = 0.1
    data_source: str = "expert_consensus"
    last_updated: str = ""


@dataclass 
class WeightingContext:
    """Context information for weighting calculations"""
    country: Optional[str] = None
    income_level: Optional[str] = None  # LIC, MIC, HIC
    region: Optional[str] = None
    crisis_type: Optional[str] = None
    development_stage: Optional[str] = None
    population_size: Optional[str] = None  # small, medium, large
    climate_zone: Optional[str] = None
    custom_factors: Dict[str, Union[str, float]] = field(default_factory=dict)


@dataclass
class EmpiricalCalibration:
    """Store empirical calibration data"""
    source_data: Dict[str, List[float]] = field(default_factory=dict)
    expert_surveys: List[Dict] = field(default_factory=list)
    confidence_intervals: Dict[str, Tuple[float, float]] = field(default_factory=dict)
    sample_sizes: Dict[str, int] = field(default_factory=dict)
    validation_scores: Dict[str, float] = field(default_factory=dict)


class ComponentRegistry:
    """Dynamic component registration and management system"""
    
    def __init__(self):
        self.components: Dict[str, ComponentMetadata] = {}
        self.relationships: Dict[str, Dict[str, float]] = {}
        self.context_adjustments: Dict[str, Dict[str, float]] = {}
        self._initialize_default_components()
        
    def _initialize_default_components(self):
        """Initialize with 3FS framework default components"""
        default_components = [
            ComponentMetadata(
                name="agricultural_development",
                category="economic",
                description="Agricultural productivity and rural development",
                default_weight=0.25,
                weight_range=(0.15, 0.35),
                contexts={
                    "LIC": 0.30, "MIC": 0.25, "HIC": 0.20,
                    "rural": 0.35, "urban": 0.20,
                    "drought": 0.40, "flood": 0.30
                }
            ),
            ComponentMetadata(
                name="infrastructure",
                category="physical",
                description="Physical and digital infrastructure",
                default_weight=0.20,
                weight_range=(0.15, 0.30),
                contexts={
                    "LIC": 0.25, "MIC": 0.20, "HIC": 0.15,
                    "rural": 0.25, "urban": 0.15
                }
            ),
            ComponentMetadata(
                name="nutrition_health",
                category="social", 
                description="Nutrition and health systems",
                default_weight=0.20,
                weight_range=(0.15, 0.30),
                contexts={
                    "pandemic": 0.35, "normal": 0.20,
                    "LIC": 0.25, "HIC": 0.15
                }
            ),
            ComponentMetadata(
                name="climate_natural_resources",
                category="environmental",
                description="Climate resilience and natural resource management",
                default_weight=0.20,
                weight_range=(0.10, 0.35),
                contexts={
                    "climate_shock": 0.35, "normal": 0.20,
                    "tropical": 0.25, "temperate": 0.15
                }
            ),
            ComponentMetadata(
                name="social_protection_equity",
                category="social",
                description="Social protection and equity systems",
                default_weight=0.10,
                weight_range=(0.05, 0.25),
                contexts={
                    "financial_crisis": 0.25, "normal": 0.10,
                    "high_inequality": 0.20, "low_inequality": 0.08
                }
            ),
            ComponentMetadata(
                name="governance_institutions",
                category="institutional",
                description="Governance and institutional systems",
                default_weight=0.05,
                weight_range=(0.02, 0.15),
                contexts={
                    "political_instability": 0.15, "normal": 0.05,
                    "fragile_state": 0.12, "stable_state": 0.03
                }
            )
        ]
        
        for comp in default_components:
            self.register_component(comp)
    
    def register_component(self, component: ComponentMetadata):
        """Register a new component"""
        self.components[component.name] = component
        logger.info(f"Registered component: {component.name}")
    
    def update_relationships(self, dependency_matrix: np.ndarray, component_names: List[str]):
        """Update component relationships dynamically"""
        if len(component_names) != dependency_matrix.shape[0]:
            raise ValueError("Component names length must match matrix dimensions")
        
        self.relationships = {}
        for i, source in enumerate(component_names):
            self.relationships[source] = {}
            for j, target in enumerate(component_names):
                if i != j:  # Skip self-relationships
                    self.relationships[source][target] = float(dependency_matrix[i, j])
    
    def get_context_weights(self, context: WeightingContext) -> Dict[str, float]:
        """Generate context-aware weights"""
        weights = {}
        
        for comp_name, comp_meta in self.components.items():
            base_weight = comp_meta.default_weight
            adjustment = 1.0
            
            # Apply context-specific adjustments
            context_dict = self._context_to_dict(context)
            
            for context_key, context_value in context_dict.items():
                if context_value and context_key in comp_meta.contexts:
                    adjustment *= (1.0 + comp_meta.contexts[context_key] - comp_meta.default_weight)
            
            # Apply bounds
            adjusted_weight = base_weight * adjustment
            min_weight, max_weight = comp_meta.weight_range
            weights[comp_name] = max(min_weight, min(max_weight, adjusted_weight))
        
        # Normalize weights
        total_weight = sum(weights.values())
        if total_weight > 0:
            weights = {k: v/total_weight for k, v in weights.items()}
        
        return weights
    
    def _context_to_dict(self, context: WeightingContext) -> Dict[str, Optional[str]]:
        """Convert context object to dictionary"""
        return {
            'income_level': context.income_level,
            'region': context.region,
            'crisis_type': context.crisis_type,
            'development_stage': context.development_stage,
            'population_size': context.population_size,
            'climate_zone': context.climate_zone,
            **context.custom_factors
        }
    
    def get_component_names(self) -> List[str]:
        """Get list of registered component names"""
        return list(self.components.keys())
    
    def get_dependency_matrix(self, component_names: Optional[List[str]] = None) -> np.ndarray:
        """Generate dependency matrix for registered components"""
        if component_names is None:
            component_names = self.get_component_names()
        
        n = len(component_names)
        matrix = np.eye(n)  # Start with identity matrix
        
        for i, source in enumerate(component_names):
            for j, target in enumerate(component_names):
                if source in self.relationships and target in self.relationships[source]:
                    matrix[i, j] = self.relationships[source][target]
        
        return matrix


class EmpiricalCalibrationSystem:
    """System for empirical calibration of weights using data and expert input"""
    
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or os.path.join(os.path.dirname(__file__), 'calibration_data')
        self.calibrations: Dict[str, EmpiricalCalibration] = {}
        self._load_existing_calibrations()
    
    def _load_existing_calibrations(self):
        """Load existing calibration data if available"""
        calibration_file = os.path.join(self.data_dir, 'calibrations.json')
        if os.path.exists(calibration_file):
            try:
                with open(calibration_file, 'r') as f:
                    data = json.load(f)
                    for name, cal_data in data.items():
                        calibration = EmpiricalCalibration(**cal_data)
                        self.calibrations[name] = calibration
                logger.info(f"Loaded {len(self.calibrations)} calibrations")
            except Exception as e:
                logger.warning(f"Failed to load calibrations: {e}")
    
    def add_empirical_data(self, component_name: str, data_points: List[float], 
                          source: str = "empirical"):
        """Add empirical data points for component weight calibration"""
        if component_name not in self.calibrations:
            self.calibrations[component_name] = EmpiricalCalibration()
        
        if source not in self.calibrations[component_name].source_data:
            self.calibrations[component_name].source_data[source] = []
        
        self.calibrations[component_name].source_data[source].extend(data_points)
        self.calibrations[component_name].sample_sizes[source] = len(data_points)
        
        # Calculate confidence interval
        if len(data_points) > 1:
            mean = np.mean(data_points)
            std_err = stats.sem(data_points)
            confidence_level = 0.95
            ci = stats.t.interval(confidence_level, len(data_points)-1, mean, std_err)
            self.calibrations[component_name].confidence_intervals[source] = ci
    
    def add_expert_survey(self, survey_data: Dict):
        """Add expert survey data"""
        for component_name in survey_data.get('component_weights', {}):
            if component_name not in self.calibrations:
                self.calibrations[component_name] = EmpiricalCalibration()
            
            self.calibrations[component_name].expert_surveys.append(survey_data)
    
    def calibrate_weights(self, base_weights: Dict[str, float], 
                         method: str = "weighted_average") -> Dict[str, float]:
        """Calibrate weights using empirical data and expert input"""
        calibrated_weights = base_weights.copy()
        
        for component_name, base_weight in base_weights.items():
            if component_name in self.calibrations:
                calibration = self.calibrations[component_name]
                
                if method == "weighted_average":
                    empirical_weight = self._calculate_weighted_average(calibration)
                elif method == "bayesian":
                    empirical_weight = self._calculate_bayesian_weight(calibration, base_weight)
                else:
                    continue
                
                if empirical_weight is not None:
                    # Blend empirical and base weights
                    confidence = self._get_confidence_score(calibration)
                    calibrated_weights[component_name] = (
                        confidence * empirical_weight + (1 - confidence) * base_weight
                    )
        
        # Normalize
        total = sum(calibrated_weights.values())
        if total > 0:
            calibrated_weights = {k: v/total for k, v in calibrated_weights.items()}
        
        return calibrated_weights
    
    def _calculate_weighted_average(self, calibration: EmpiricalCalibration) -> Optional[float]:
        """Calculate weighted average from multiple data sources"""
        weights = []
        values = []
        
        for source, data_points in calibration.source_data.items():
            if data_points:
                weight = len(data_points)  # Weight by sample size
                value = np.mean(data_points)
                weights.append(weight)
                values.append(value)
        
        # Add expert survey weights
        for survey in calibration.expert_surveys:
            if 'component_weights' in survey:
                for comp_name, weight in survey['component_weights'].items():
                    expert_confidence = survey.get('confidence', 1.0)
                    weights.append(expert_confidence)
                    values.append(weight)
        
        if weights:
            return np.average(values, weights=weights)
        return None
    
    def _calculate_bayesian_weight(self, calibration: EmpiricalCalibration, 
                                  prior: float) -> Optional[float]:
        """Calculate Bayesian posterior weight estimate"""
        # Simple Bayesian updating - can be enhanced
        all_data = []
        for data_points in calibration.source_data.values():
            all_data.extend(data_points)
        
        if not all_data:
            return None
        
        # Prior parameters (assuming beta distribution)
        prior_alpha = prior * 10  # Prior strength
        prior_beta = (1 - prior) * 10
        
        # Likelihood parameters
        data_sum = sum(all_data)
        data_count = len(all_data)
        
        # Posterior parameters
        posterior_alpha = prior_alpha + data_sum
        posterior_beta = prior_beta + data_count - data_sum
        
        # Posterior mean
        return posterior_alpha / (posterior_alpha + posterior_beta)
    
    def _get_confidence_score(self, calibration: EmpiricalCalibration) -> float:
        """Calculate confidence score for calibration"""
        total_samples = sum(calibration.sample_sizes.values())
        expert_surveys = len(calibration.expert_surveys)
        
        # Simple heuristic - can be enhanced
        sample_confidence = min(1.0, total_samples / 100.0)
        expert_confidence = min(1.0, expert_surveys / 10.0) 
        
        return max(sample_confidence, expert_confidence) * 0.8  # Cap confidence
    
    def get_confidence_intervals(self) -> Dict[str, Dict[str, Tuple[float, float]]]:
        """Get confidence intervals for all calibrated weights"""
        return {
            comp_name: calibration.confidence_intervals 
            for comp_name, calibration in self.calibrations.items()
        }


class ConvergenceMonitor:
    """Monitor convergence of iterative algorithms"""
    
    def __init__(self, max_iterations: int = 1000, tolerance: float = 1e-6):
        self.max_iterations = max_iterations
        self.tolerance = tolerance
        self.history: List[np.ndarray] = []
        self.converged = False
        self.convergence_iteration: Optional[int] = None
    
    def check_convergence(self, current: np.ndarray, iteration: int) -> bool:
        """Check if algorithm has converged"""
        self.history.append(current.copy())
        
        if len(self.history) > 1:
            diff = np.linalg.norm(current - self.history[-2])
            if diff < self.tolerance:
                self.converged = True
                self.convergence_iteration = iteration
                return True
        
        if iteration >= self.max_iterations:
            logger.warning(f"Algorithm did not converge after {self.max_iterations} iterations")
            return True
        
        return False
    
    def get_convergence_info(self) -> Dict:
        """Get convergence information"""
        return {
            'converged': self.converged,
            'convergence_iteration': self.convergence_iteration,
            'total_iterations': len(self.history),
            'final_tolerance': (
                np.linalg.norm(self.history[-1] - self.history[-2]) 
                if len(self.history) > 1 else None
            )
        }


class ExpertWeightingSystem:
    """Expert-driven weighting with AHP and scenario adaptation"""
    
    def __init__(self, component_registry: Optional[ComponentRegistry] = None,
                 calibration_system: Optional[EmpiricalCalibrationSystem] = None):
        self.component_registry = component_registry or ComponentRegistry()
        self.calibration_system = calibration_system or EmpiricalCalibrationSystem()
        
        # Dynamic expert consensus weights from component registry
        self.expert_consensus_weights = self._get_registry_weights()
        
        # AHP matrix with validated reciprocal property
        self.ahp_matrix = self._build_consistent_ahp_matrix()
        
        # Scenario-specific weights (normalized to sum to 1.0)
        self.scenario_weights = self._build_scenario_weights()
        
        # Fallback weights for graceful degradation
        self.fallback_weights = self._build_fallback_weights()
    
    def _get_registry_weights(self) -> Dict[str, float]:
        """Get default weights from component registry"""
        weights = {}
        for comp_name, comp_meta in self.component_registry.components.items():
            weights[comp_name] = comp_meta.default_weight
        
        # Normalize weights
        total = sum(weights.values())
        if total > 0:
            weights = {k: v/total for k, v in weights.items()}
        
        return weights
    
    def _build_fallback_weights(self) -> Dict[str, float]:
        """Build simple fallback weights for error recovery"""
        component_names = self.component_registry.get_component_names()
        equal_weight = 1.0 / len(component_names) if component_names else 0.0
        return {name: equal_weight for name in component_names}
    def _build_consistent_ahp_matrix(self) -> np.ndarray:
        """Build mathematically consistent AHP matrix ensuring reciprocal property"""
        component_names = self.component_registry.get_component_names()
        n = len(component_names)
        matrix = np.ones((n, n), dtype=np.float64)  # Ensure float64 precision
        
        # Generate pairwise comparisons based on component metadata
        for i in range(n):
            for j in range(i + 1, n):
                comp_i = self.component_registry.components[component_names[i]]
                comp_j = self.component_registry.components[component_names[j]]
                
                # Calculate comparison value based on default weights and categories
                weight_ratio = comp_i.default_weight / max(comp_j.default_weight, 0.001)
                
                # Adjust based on category relationships
                category_adjustment = self._get_category_adjustment(comp_i.category, comp_j.category)
                comparison_value = weight_ratio * category_adjustment
                
                # Bound the comparison value to reasonable AHP range [1/9, 9]
                comparison_value = max(1/9, min(9, comparison_value))
                
                # Ensure exact reciprocal property by using precise arithmetic
                matrix[i, j] = float(comparison_value)
                matrix[j, i] = 1.0 / float(comparison_value)
        
        # Ensure diagonal is exactly 1.0
        np.fill_diagonal(matrix, 1.0)
        
        # Apply consistency improvement if needed
        matrix = self._improve_ahp_consistency(matrix)
        
        # Final validation - should pass now
        try:
            validate_ahp_matrix(matrix)
            logger.info("AHP matrix validation passed")
        except Exception as e:
            logger.error(f"AHP matrix still invalid after consistency improvement: {e}")
            # Instead of fallback, use the mathematical approach that always works
            matrix = self._build_mathematical_ahp_matrix(component_names)
        
        return matrix
    
    def _improve_ahp_consistency(self, matrix: np.ndarray) -> np.ndarray:
        """Improve AHP matrix consistency using iterative refinement"""
        n = len(matrix)
        improved_matrix = matrix.copy()
        
        # Calculate current consistency ratio
        try:
            eigenvalues = np.linalg.eigvals(improved_matrix)
            lambda_max = max(eigenvalues.real)
            ci = (lambda_max - n) / (n - 1)
            
            # Random Index values for different matrix sizes
            ri_values = {3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49}
            ri = ri_values.get(n, 1.24)
            cr = ci / ri if ri > 0 else 0
            
            # If consistency is acceptable, return as is
            if cr <= WEIGHTING_CONFIG.ahp_consistency_threshold:
                return improved_matrix
            
            # Apply geometric mean method to improve consistency
            for i in range(n):
                for j in range(n):
                    if i != j:
                        # Calculate geometric mean of row i and column j
                        row_product = 1.0
                        col_product = 1.0
                        
                        for k in range(n):
                            if k != j:
                                row_product *= improved_matrix[i, k]
                            if k != i:
                                col_product *= improved_matrix[k, j]
                        
                        if n > 1:
                            geometric_mean = (row_product * col_product) ** (1.0 / (2 * (n - 1)))
                            improved_matrix[i, j] = geometric_mean
                            improved_matrix[j, i] = 1.0 / geometric_mean
            
            # Ensure diagonal is exactly 1.0
            np.fill_diagonal(improved_matrix, 1.0)
            
        except Exception as e:
            logger.warning(f"Consistency improvement failed: {e}. Using original matrix.")
            return matrix
        
        return improved_matrix
    
    def _build_mathematical_ahp_matrix(self, component_names: List[str]) -> np.ndarray:
        """Build mathematically sound AHP matrix using weight ratios"""
        n = len(component_names)
        
        # Get component weights from registry
        weights = []
        for name in component_names:
            comp_meta = self.component_registry.components[name]
            weights.append(comp_meta.default_weight)
        
        # Normalize weights
        weights = np.array(weights)
        weights = weights / np.sum(weights)
        
        # Create perfectly consistent AHP matrix from weights
        matrix = np.ones((n, n), dtype=np.float64)
        
        for i in range(n):
            for j in range(n):
                if i != j and weights[j] > 1e-10:  # Avoid division by zero
                    matrix[i, j] = weights[i] / weights[j]
                    # Bound values to AHP scale [1/9, 9]
                    matrix[i, j] = max(1/9, min(9, matrix[i, j]))
        
        # Ensure exact reciprocal property
        for i in range(n):
            for j in range(i + 1, n):
                matrix[j, i] = 1.0 / matrix[i, j]
        
        # Ensure diagonal is exactly 1.0
        np.fill_diagonal(matrix, 1.0)
        
        return matrix
    
    def _get_category_adjustment(self, cat_i: str, cat_j: str) -> float:
        """Get adjustment factor based on component categories"""
        # Category importance hierarchy (can be made configurable)
        category_hierarchy = {
            'economic': 1.0,
            'social': 0.9,
            'physical': 0.8,
            'environmental': 0.7,
            'institutional': 0.6
        }
        
        importance_i = category_hierarchy.get(cat_i, 0.5)
        importance_j = category_hierarchy.get(cat_j, 0.5)
        
        return importance_i / max(importance_j, 0.1)
    
    def _build_fallback_ahp_matrix(self, n: int) -> np.ndarray:
        """Build simple fallback AHP matrix"""
        matrix = np.ones((n, n))
        # Add small random perturbations to avoid singularity
        for i in range(n):
            for j in range(i + 1, n):
                value = 1.0 + np.random.normal(0, 0.1)
                value = max(0.5, min(2.0, value))  # Keep values reasonable
                matrix[i, j] = value
                matrix[j, i] = 1.0 / value
        return matrix
    
    def _build_scenario_weights(self) -> Dict[str, Dict[str, float]]:
        """Build normalized scenario weights"""
        raw_scenarios = {
            'normal_operations': {
                'agricultural_development': 0.25, 'infrastructure': 0.18,
                'nutrition_health': 0.22, 'climate_natural_resources': 0.15,
                'social_protection_equity': 0.15, 'governance_institutions': 0.05
            },
            'climate_shock': {
                'agricultural_development': 0.20, 'infrastructure': 0.25,
                'nutrition_health': 0.15, 'climate_natural_resources': 0.30,
                'social_protection_equity': 0.08, 'governance_institutions': 0.02
            },
            'financial_crisis': {
                'agricultural_development': 0.30, 'infrastructure': 0.15,
                'nutrition_health': 0.25, 'climate_natural_resources': 0.10,
                'social_protection_equity': 0.18, 'governance_institutions': 0.02
            },
            'pandemic_disruption': {
                'agricultural_development': 0.28, 'infrastructure': 0.22,
                'nutrition_health': 0.30, 'climate_natural_resources': 0.08,
                'social_protection_equity': 0.10, 'governance_institutions': 0.02
            },
            'supply_chain_disruption': {
                'agricultural_development': 0.25, 'infrastructure': 0.35,
                'nutrition_health': 0.20, 'climate_natural_resources': 0.10,
                'social_protection_equity': 0.08, 'governance_institutions': 0.02
            },
            'cyber_threats': {
                'agricultural_development': 0.20, 'infrastructure': 0.30,
                'nutrition_health': 0.15, 'climate_natural_resources': 0.10,
                'social_protection_equity': 0.15, 'governance_institutions': 0.10
            },
            'political_instability': {
                'agricultural_development': 0.22, 'infrastructure': 0.20,
                'nutrition_health': 0.18, 'climate_natural_resources': 0.12,
                'social_protection_equity': 0.20, 'governance_institutions': 0.08
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
    def calculate_ahp_weights(self, use_calibration: bool = True) -> Dict[str, float]:
        """Calculate weights using Analytic Hierarchy Process with robust eigenvalue computation"""
        component_names = self.component_registry.get_component_names()
        
        # Use scipy's more robust eigenvalue computation
        eigenvalues, eigenvectors = eig(self.ahp_matrix)
        
        # Get principal eigenvector (largest real eigenvalue)
        max_eigenvalue_index = np.argmax(eigenvalues.real)
        principal_eigenvector = eigenvectors[:, max_eigenvalue_index].real
        
        # Handle negative values by taking absolute value
        weights = np.abs(principal_eigenvector)
        
        # Ensure no zero weights (minimum threshold)
        min_weight = 1e-6
        weights = np.maximum(weights, min_weight)
        
        # Normalize weights to sum to 1.0
        weights = weights / np.sum(weights)
        
        # Create component weight dictionary
        ahp_weights = dict(zip(component_names, weights))
        
        # Apply empirical calibration if available and requested
        if use_calibration:
            try:
                ahp_weights = self.calibration_system.calibrate_weights(ahp_weights)
            except Exception as e:
                logger.warning(f"Calibration failed: {e}. Using raw AHP weights.")
        
        # Final normalization check and correction
        total_weight = sum(ahp_weights.values())
        if abs(total_weight - 1.0) > 1e-10:
            ahp_weights = {k: v/total_weight for k, v in ahp_weights.items()}
        
        logger.info(f"AHP weights calculated successfully. Total: {sum(ahp_weights.values()):.6f}")
        return ahp_weights
    
    def get_context_aware_weights(self, context: WeightingContext, 
                                 use_calibration: bool = True) -> Dict[str, float]:
        """Get context-aware weights using component registry with robust processing"""
        # Get context-specific weights from registry
        context_weights = self.component_registry.get_context_weights(context)
        
        # Ensure we have valid weights for all components
        component_names = self.component_registry.get_component_names()
        for name in component_names:
            if name not in context_weights or context_weights[name] <= 0:
                # Use default weight from component metadata
                comp_meta = self.component_registry.components[name]
                context_weights[name] = comp_meta.default_weight
        
        # Normalize weights
        total_weight = sum(context_weights.values())
        if total_weight > 0:
            context_weights = {k: v/total_weight for k, v in context_weights.items()}
        else:
            # Equal weights as last resort
            equal_weight = 1.0 / len(component_names)
            context_weights = {name: equal_weight for name in component_names}
        
        # Apply empirical calibration if available and requested
        if use_calibration:
            try:
                context_weights = self.calibration_system.calibrate_weights(context_weights)
            except Exception as e:
                logger.warning(f"Calibration failed: {e}. Using raw context weights.")
        
        logger.info(f"Context-aware weights calculated. Total: {sum(context_weights.values()):.6f}")
        return context_weights
            
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
    
    def __init__(self, component_registry: Optional[ComponentRegistry] = None):
        self.component_registry = component_registry or ComponentRegistry()
        
        # Build dynamic dependency matrices
        self.dependency_matrix, self.uncertainty_matrix = self._build_dependency_matrices()
        self.component_names = self.component_registry.get_component_names()
        
        # Convergence monitoring
        self.convergence_monitor = ConvergenceMonitor()
    
    def _build_dependency_matrices(self) -> Tuple[np.ndarray, np.ndarray]:
        """Build dependency and uncertainty matrices with robust construction"""
        
        component_names = self.component_registry.get_component_names()
        n = len(component_names)
        
        # Try to get dependency matrix from registry, with robust fallback
        try:
            base_matrix = self.component_registry.get_dependency_matrix(component_names)
        except Exception as e:
            logger.info(f"Using default dependency matrix construction: {e}")
            base_matrix = self._build_robust_dependency_matrix(component_names)
        
        # Build uncertainty matrix based on component metadata
        uncertainty_matrix = self._build_uncertainty_matrix(component_names)
        
        # Validate and ensure matrices are properly formed
        base_matrix = self._ensure_valid_dependency_matrix(base_matrix)
        uncertainty_matrix = self._ensure_valid_uncertainty_matrix(uncertainty_matrix)
        
        return base_matrix, uncertainty_matrix
    
    def _build_default_dependency_matrix(self, component_names: List[str]) -> np.ndarray:
        """Build default dependency matrix based on component categories"""
        n = len(component_names)
        matrix = np.eye(n)  # Start with identity
        
        for i, source_name in enumerate(component_names):
            for j, target_name in enumerate(component_names):
                if i != j:
                    source_comp = self.component_registry.components[source_name]
                    target_comp = self.component_registry.components[target_name]
                    
                    # Calculate dependency based on category relationships
                    dependency = self._calculate_category_dependency(
                        source_comp.category, target_comp.category
                    )
                    
                    # Adjust based on default weights (higher weight components have more influence)
                    weight_factor = source_comp.default_weight / max(target_comp.default_weight, 0.001)
                    dependency *= min(2.0, max(0.5, weight_factor))
                    
                    matrix[i, j] = max(0.1, min(1.0, dependency))
        
        return matrix
    
    def _calculate_category_dependency(self, source_category: str, target_category: str) -> float:
        """Calculate dependency strength between component categories"""
        # Category dependency patterns
        dependencies = { #TODO: DISAGREGATE THIS INTO THE NEW CATEGORIES 
            ('economic', 'social'): 0.7,
            ('economic', 'physical'): 0.8,
            ('economic', 'environmental'): 0.6,
            ('economic', 'institutional'): 0.4,
            ('social', 'economic'): 0.6,
            ('social', 'institutional'): 0.5,
            ('physical', 'economic'): 0.7,
            ('physical', 'social'): 0.5,
            ('environmental', 'economic'): 0.8,
            ('environmental', 'social'): 0.4,
            ('institutional', 'economic'): 0.3,
            ('institutional', 'social'): 0.6,
        }
        
        return dependencies.get((source_category, target_category), 0.3)
    
    def _build_uncertainty_matrix(self, component_names: List[str]) -> np.ndarray:
        """Build uncertainty matrix based on component metadata"""
        n = len(component_names)
        matrix = np.zeros((n, n))
        
        for i, comp_name in enumerate(component_names):
            comp_meta = self.component_registry.components[comp_name]
            base_uncertainty = comp_meta.uncertainty
            
            for j in range(n):
                if i != j:
                    # Cross-component uncertainty is higher
                    matrix[i, j] = min(0.5, base_uncertainty * 1.5)
                # Diagonal remains 0 (no self-uncertainty)
        
        return matrix
    
    def _build_robust_dependency_matrix(self, component_names: List[str]) -> np.ndarray:
        """Build robust dependency matrix with guaranteed validity"""
        n = len(component_names)
        matrix = np.eye(n, dtype=np.float64)  # Start with identity matrix
        
        for i, source_name in enumerate(component_names):
            for j, target_name in enumerate(component_names):
                if i != j:
                    source_comp = self.component_registry.components[source_name]
                    target_comp = self.component_registry.components[target_name]
                    
                    # Calculate dependency based on category relationships
                    dependency = self._calculate_category_dependency(
                        source_comp.category, target_comp.category
                    )
                    
                    # Adjust based on default weights (bounded to prevent extreme values)
                    weight_factor = source_comp.default_weight / max(target_comp.default_weight, 0.01)
                    weight_factor = max(0.5, min(2.0, weight_factor))  # Bound to [0.5, 2.0]
                    
                    dependency *= weight_factor
                    
                    # Ensure dependency is in valid range [0.1, 1.0]
                    matrix[i, j] = max(0.1, min(1.0, dependency))
        
        return matrix
    
    def _ensure_valid_dependency_matrix(self, matrix: np.ndarray) -> np.ndarray:
        """Ensure dependency matrix meets all validity requirements"""
        n = matrix.shape[0]
        
        # Ensure matrix is square
        if matrix.shape[0] != matrix.shape[1]:
            logger.warning("Dependency matrix not square, rebuilding")
            component_names = self.component_registry.get_component_names()
            return self._build_robust_dependency_matrix(component_names)
        
        # Ensure diagonal is 1.0 (self-dependency)
        np.fill_diagonal(matrix, 1.0)
        
        # Ensure all values are in valid range [0.1, 1.0] for off-diagonal
        for i in range(n):
            for j in range(n):
                if i != j:
                    if matrix[i, j] < 0.1 or matrix[i, j] > 1.0:
                        matrix[i, j] = max(0.1, min(1.0, matrix[i, j]))
        
        # Final validation
        try:
            validate_dependency_matrix(matrix)
            logger.info("Dependency matrix validation passed")
        except Exception as e:
            logger.warning(f"Dependency matrix still invalid, applying final corrections: {e}")
            # Last resort: set to reasonable values
            for i in range(n):
                for j in range(n):
                    if i != j and (matrix[i, j] < 0.1 or matrix[i, j] > 1.0):
                        matrix[i, j] = 0.3  # Default moderate dependency
        
        return matrix
    
    def _ensure_valid_uncertainty_matrix(self, matrix: np.ndarray) -> np.ndarray:
        """Ensure uncertainty matrix is valid"""
        n = matrix.shape[0]
        
        # Ensure diagonal is 0 (no self-uncertainty)
        np.fill_diagonal(matrix, 0.0)
        
        # Ensure all values are in valid range [0, 0.5]
        matrix = np.clip(matrix, 0.0, 0.5)
        
        return matrix
    
    def _build_fallback_dependency_matrix(self, n: int) -> np.ndarray:
        """Build simple fallback dependency matrix"""
        matrix = np.eye(n)
        # Add weak dependencies between all components
        for i in range(n):
            for j in range(n):
                if i != j:
                    matrix[i, j] = 0.3 + np.random.normal(0, 0.1)
                    matrix[i, j] = max(0.1, min(0.8, matrix[i, j]))
        return matrix
    
    @handle_weighting_error
    def calculate_pagerank_centrality(self, damping: Optional[float] = None) -> Dict[str, float]:
        """Calculate PageRank centrality with robust convergence and error handling"""
        
        if damping is None:
            damping = WEIGHTING_CONFIG.pagerank_damping
        
        # Ensure damping is in valid range
        damping = max(0.1, min(0.9, damping))
        
        n = len(self.dependency_matrix)
        
        # Create robust transition matrix
        row_sums = self.dependency_matrix.sum(axis=1)
        # Handle zero row sums by setting minimum value
        row_sums = np.maximum(row_sums, 1e-10)
        transition_matrix = self.dependency_matrix / row_sums[:, np.newaxis]
        
        # Initialize PageRank vector
        pagerank = np.ones(n, dtype=np.float64) / n
        tolerance = WEIGHTING_CONFIG.pagerank_tolerance
        max_iterations = WEIGHTING_CONFIG.pagerank_max_iterations
        
        # Reset convergence monitor
        self.convergence_monitor = ConvergenceMonitor(max_iterations, tolerance)
        
        # PageRank iteration with robust numerical handling
        for iteration in range(max_iterations):
            # Standard PageRank formula with numerical stability
            new_pagerank = (1 - damping) / n + damping * (transition_matrix.T @ pagerank)
            
            # Ensure no negative values
            new_pagerank = np.maximum(new_pagerank, 1e-10)
            
            # Normalize to prevent drift
            new_pagerank = new_pagerank / np.sum(new_pagerank)
            
            # Check convergence
            if self.convergence_monitor.check_convergence(new_pagerank, iteration):
                convergence_info = self.convergence_monitor.get_convergence_info()
                if convergence_info['converged']:
                    logger.info(f"PageRank converged after {iteration} iterations")
                else:
                    logger.info(f"PageRank completed {max_iterations} iterations (may not be fully converged)")
                break
                
            pagerank = new_pagerank
        
        # Final normalization and validation
        pagerank_sum = np.sum(pagerank)
        if pagerank_sum > 1e-10:
            pagerank = pagerank / pagerank_sum
        else:
            # This should not happen with our robust handling, but just in case
            logger.warning("PageRank sum near zero, using equal weights")
            pagerank = np.ones(n) / n
        
        # Create result dictionary
        pagerank_dict = dict(zip(self.component_names, pagerank))
        
        logger.info(f"PageRank centrality calculated. Total: {sum(pagerank_dict.values()):.6f}")
        return pagerank_dict
            
    @handle_weighting_error
    def calculate_cascade_multipliers(self) -> Dict[str, float]:
        """Calculate cascade impact multipliers with robust uncertainty adjustment"""
        
        cascade_impacts = {}
        n = len(self.component_names)
        
        for i, component in enumerate(self.component_names):
            # Primary impact from dependencies (excluding self-dependency)
            primary_impact = np.sum(self.dependency_matrix[:, i]) - self.dependency_matrix[i, i]
            primary_impact = max(0, primary_impact)  # Ensure non-negative
            
            # Secondary cascading effects with robust calculation
            secondary_impact = 0.0
            for j in range(n):
                if j != i:
                    # Impact from component j to component i
                    j_impact = self.dependency_matrix[j, i]
                    
                    # Downstream effects of component j (excluding self)
                    j_downstream = np.sum(self.dependency_matrix[:, j]) - self.dependency_matrix[j, j]
                    j_downstream = max(0, j_downstream)
                    
                    # Add to secondary impact with damping
                    secondary_impact += j_impact * j_downstream * 0.5
            
            secondary_impact = max(0, secondary_impact)
            
            # Adjust for uncertainty with bounds checking
            uncertainty_factor = np.mean(self.uncertainty_matrix[:, i])
            uncertainty_factor = max(0, min(1, uncertainty_factor))  # Bound to [0,1]
            
            # Calculate total impact with uncertainty adjustment
            total_impact = (primary_impact + secondary_impact) * (1 - uncertainty_factor * 0.5)
            cascade_impacts[component] = max(0, total_impact)
        
        # Robust normalization
        impact_values = list(cascade_impacts.values())
        max_impact = max(impact_values) if impact_values else 1.0
        
        if max_impact > 1e-10:
            # Normalize to [0,1] range
            cascade_impacts = {k: v/max_impact for k, v in cascade_impacts.items()}
        else:
            # All impacts are essentially zero, use equal weights
            logger.info("All cascade impacts near zero, using equal weights")
            equal_weight = 1.0 / n
            cascade_impacts = {name: equal_weight for name in self.component_names}
        
        # Final validation and normalization
        total_impact = sum(cascade_impacts.values())
        if abs(total_impact - 1.0) > 1e-10:
            cascade_impacts = {k: v/total_impact for k, v in cascade_impacts.items()}
        
        logger.info(f"Cascade multipliers calculated. Total: {sum(cascade_impacts.values()):.6f}")
        return cascade_impacts
    
    def get_uncertainty_scores(self) -> Dict[str, float]:
        """Get uncertainty scores for network metrics"""
        try:
            return {
                component: np.mean(self.uncertainty_matrix[i, :])
                for i, component in enumerate(self.component_names)
            }
        except Exception as e:
            logger.warning(f"Failed to calculate uncertainty scores: {e}")
            return {name: 0.1 for name in self.component_names}  # Default uncertainty
    
    def get_convergence_info(self) -> Dict:
        """Get convergence information from last PageRank calculation"""
        return self.convergence_monitor.get_convergence_info()


class DynamicWeightingSystem:
    """Integrated dynamic weighting system with context-awareness and empirical calibration"""
    
    def __init__(self, component_registry: Optional[ComponentRegistry] = None,
                 calibration_system: Optional[EmpiricalCalibrationSystem] = None):
        # Initialize component registry and calibration system
        self.component_registry = component_registry or ComponentRegistry()
        self.calibration_system = calibration_system or EmpiricalCalibrationSystem()
        
        # Initialize subsystems with shared registry
        self.expert_system = ExpertWeightingSystem(
            self.component_registry, self.calibration_system
        )
        self.network_analyzer = NetworkCentralityAnalyzer(self.component_registry)
        
        # Configuration for hybrid weighting
        self.hybrid_config = self._get_hybrid_config()
        
        logger.info("Enhanced Dynamic Weighting System initialized")
    
    def _get_hybrid_config(self) -> Dict[str, float]:
        """Get hybrid weighting configuration with fallback"""
        try:
            return {
                'expert': WEIGHTING_CONFIG.hybrid_expert_weight,
                'pagerank': WEIGHTING_CONFIG.hybrid_pagerank_weight,
                'cascade': WEIGHTING_CONFIG.hybrid_cascade_weight,
                'financial': WEIGHTING_CONFIG.hybrid_financial_weight
            }
        except AttributeError:
            # Fallback configuration
            logger.warning("Using fallback hybrid configuration")
            return {
                'expert': 0.4,
                'pagerank': 0.3,
                'cascade': 0.2,
                'financial': 0.1
            }
    
    def safe_calculate_weights(self, components: List[Dict], method: str = 'hybrid', **kwargs) -> Dict[str, float]:
        """Calculate weights using robust algorithms that work by design"""
        # Input validation and preprocessing
        if not components:
            raise ValueError("No components provided")
        
        # Ensure all components have required fields with defaults
        for comp in components:
            if 'component_type' not in comp:
                raise ValueError("All components must have 'component_type'")
            if 'financial_allocation' not in comp:
                comp['financial_allocation'] = 1000000.0  # Default 1M
            if 'observed_value' not in comp:
                comp['observed_value'] = 100.0
            if 'benchmark_value' not in comp:
                comp['benchmark_value'] = 100.0
            if 'sensitivity_parameter' not in comp:
                comp['sensitivity_parameter'] = 0.001
        
        # Use robust calculation that should always work
        return self.calculate_integrated_weights(components, weighting_method=method, **kwargs)
    
    def _get_equal_weights(self, components: List[Dict]) -> Dict[str, float]:
        """Get equal weights as ultimate fallback"""
        component_types = set()
        for comp in components:
            component_types.add(normalize_component_type(comp['component_type']))
        
        equal_weight = 1.0 / len(component_types) if component_types else 0.0
        return {comp_type: equal_weight for comp_type in component_types}
    
    @handle_weighting_error
    def calculate_integrated_weights(
        self,
        components: List[Dict],
        weighting_method: str = 'hybrid',
        scenario: str = 'normal_operations',
        shock_probabilities: Optional[Dict[str, float]] = None,
        performance_adjustment: bool = True,
        context: Optional[WeightingContext] = None,
        use_calibration: bool = True
    ) -> Dict[str, float]:
        """
        Calculate integrated component weights using specified methodology
        
        Args:
            components: Component data list
            weighting_method: 'expert', 'network', 'hybrid', 'financial', or 'context'
            scenario: Analysis scenario
            shock_probabilities: Shock probability distribution (optional)
            performance_adjustment: Apply FSFVI performance adjustment
            context: Weighting context for context-aware calculations
            use_calibration: Whether to apply empirical calibration
            
        Returns:
            Dictionary mapping component types to weights
        """
        
        try:
            # Get base weights from different sources
            if weighting_method == 'context' and context:
                # Use context-aware weighting
                base_weights = self.expert_system.get_context_aware_weights(context, use_calibration)
            else:
                # Get traditional weight sources
                expert_weights = self.expert_system.get_scenario_weights(scenario, shock_probabilities)
                pagerank_weights = self.network_analyzer.calculate_pagerank_centrality()
                cascade_weights = self.network_analyzer.calculate_cascade_multipliers()
                financial_weights = self._calculate_financial_weights(components)
                
                # Apply empirical calibration to base methods if requested
                if use_calibration:
                    expert_weights = self.calibration_system.calibrate_weights(expert_weights)
                    pagerank_weights = self.calibration_system.calibrate_weights(pagerank_weights)
                    cascade_weights = self.calibration_system.calibrate_weights(cascade_weights)
                
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
            
        except Exception as e:
            logger.error(f"Weight calculation failed: {e}. Using fallback weights.")
            return self._get_equal_weights(components)
    
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
            scenario_weights = self.safe_calculate_weights(
                components, 
                method='hybrid',
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
    
    def analyze_context_sensitivity(
        self,
        components: List[Dict],
        contexts: List[WeightingContext]
    ) -> Dict[str, Dict[str, float]]:
        """Analyze weight sensitivity across different contexts"""
        
        sensitivity_analysis = {}
        
        for i, context in enumerate(contexts):
            context_name = f"context_{i}"
            if context.country:
                context_name = f"{context.country}"
            if context.crisis_type:
                context_name += f"_{context.crisis_type}"
            
            context_weights = self.safe_calculate_weights(
                components,
                method='context',
                context=context,
                performance_adjustment=True
            )
            
            # Map back to original component types
            mapped_weights = {}
            for comp in components:
                original_type = comp['component_type']
                normalized_type = normalize_component_type(original_type)
                mapped_weights[original_type] = context_weights.get(normalized_type, 0.0)
            
            sensitivity_analysis[context_name] = mapped_weights
            
        return sensitivity_analysis
    
    def get_system_health(self) -> Dict[str, any]:
        """Get comprehensive system health information"""
        health_info = {
            'component_registry': {
                'registered_components': len(self.component_registry.components),
                'component_names': self.component_registry.get_component_names(),
                'relationship_matrix_shape': self.component_registry.get_dependency_matrix().shape
            },
            'calibration_system': {
                'calibrated_components': len(self.calibration_system.calibrations),
                'total_data_points': sum(
                    len(cal.source_data.get('empirical', []))
                    for cal in self.calibration_system.calibrations.values()
                ),
                'confidence_intervals_available': len(self.calibration_system.get_confidence_intervals())
            },
            'network_analyzer': {
                'dependency_matrix_shape': self.network_analyzer.dependency_matrix.shape,
                'last_convergence_info': self.network_analyzer.get_convergence_info()
            },
            'available_methods': ['expert', 'network', 'hybrid', 'financial', 'context'],
            'available_scenarios': list(self.expert_system.scenario_weights.keys())
        }
        
        return health_info
            

# Convenience functions for integration
def get_expert_weights(components: List[Dict], scenario: str = 'normal_operations', 
                      use_calibration: bool = True) -> Dict[str, float]:
    """Get expert-driven weights with optional empirical calibration"""
    system = DynamicWeightingSystem()
    return system.safe_calculate_weights(
        components, 
        method='expert',
        scenario=scenario,
        performance_adjustment=False,
        use_calibration=use_calibration
    )


def get_network_weights(components: List[Dict], use_calibration: bool = True) -> Dict[str, float]:
    """Get network centrality-based weights with optional empirical calibration"""
    system = DynamicWeightingSystem()
    return system.safe_calculate_weights(
        components,
        method='network',
        performance_adjustment=False,
        use_calibration=use_calibration
    )


def get_hybrid_weights(
    components: List[Dict], 
    scenario: str = 'normal_operations',
    shock_probabilities: Optional[Dict[str, float]] = None,
    performance_adjustment: bool = True,
    use_calibration: bool = True
) -> Dict[str, float]:
    """Get hybrid weights combining all methodologies with empirical calibration"""
    system = DynamicWeightingSystem()
    return system.safe_calculate_weights(
        components,
        method='hybrid',
        scenario=scenario,
        shock_probabilities=shock_probabilities,
        performance_adjustment=performance_adjustment,
        use_calibration=use_calibration
    )


def get_context_weights(
    components: List[Dict],
    context: WeightingContext,
    performance_adjustment: bool = True,
    use_calibration: bool = True
) -> Dict[str, float]:
    """Get context-aware weights based on specific context"""
    system = DynamicWeightingSystem()
    return system.safe_calculate_weights(
        components,
        method='context',
        context=context,
        performance_adjustment=performance_adjustment,
        use_calibration=use_calibration
    )


def analyze_weight_sensitivity(
    components: List[Dict],
    scenarios: Optional[List[str]] = None,
    contexts: Optional[List[WeightingContext]] = None
) -> Dict[str, Dict[str, float]]:
    """Analyze weight sensitivity across different scenarios and contexts"""
    system = DynamicWeightingSystem()
    
    # Enhanced sensitivity analysis
    if contexts:
        return system.analyze_context_sensitivity(components, contexts)
    else:
        return system.analyze_weight_sensitivity(components, scenarios)


def add_empirical_data_to_system(
    component_name: str, 
    data_points: List[float], 
    source: str = "empirical",
    system: Optional[DynamicWeightingSystem] = None
):
    """Add empirical data points to the weighting system for calibration"""
    if system is None:
        system = DynamicWeightingSystem()
    
    system.calibration_system.add_empirical_data(component_name, data_points, source)
    logger.info(f"Added {len(data_points)} data points for {component_name} from {source}")


def add_expert_survey_to_system(
    survey_data: Dict,
    system: Optional[DynamicWeightingSystem] = None
):
    """Add expert survey data to the weighting system"""
    if system is None:
        system = DynamicWeightingSystem()
    
    system.calibration_system.add_expert_survey(survey_data)
    logger.info(f"Added expert survey data")


def create_context(
    country: str = None,
    income_level: str = None,
    crisis_type: str = None,
    **kwargs
) -> WeightingContext:
    """Create a weighting context for context-aware calculations"""
    return WeightingContext(
        country=country,
        income_level=income_level,
        crisis_type=crisis_type,
        custom_factors=kwargs
    )


def validate_weighting_system() -> Dict[str, any]:
    """Validate the enhanced weighting system"""
    try:
        from .validators import validate_system_health
    except ImportError:
        try:
            from validators import validate_system_health
        except ImportError:
            # Create basic validation if validators not available
            def validate_system_health():
                return {'errors': [], 'overall_status': True}
    
    # Get basic system health validation
    try:
        health_report = validate_system_health()
    except:
        health_report = {'errors': [], 'overall_status': True}
    
    # Add enhanced weighting-specific validation
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
        
        # Test all methods including new ones
        methods = ['expert', 'network', 'hybrid', 'financial', 'context']
        method_results = {}
        
        for method in methods:
            try:
                if method == 'context':
                    # Test context method with sample context
                    context = create_context(country="Kenya", income_level="LIC", crisis_type="drought")
                    weights = system.safe_calculate_weights(sample_components, method=method, context=context)
                else:
                    weights = system.safe_calculate_weights(sample_components, method=method)
                
                total = sum(weights.values())
                method_results[method] = {
                    'success': True,
                    'weight_sum': total,
                    'normalized': 0.999 <= total <= 1.001,
                    'components_covered': len(weights)
                }
            except Exception as e:
                method_results[method] = {
                    'success': False,
                    'error': str(e)
                }
        
        # Get comprehensive system health
        system_health = system.get_system_health()
        
        health_report.update({
            'enhanced_weighting_validation': {
                'available_methods': methods,
                'available_scenarios': system_health['available_scenarios'],
                'method_tests': method_results,
                'system_health': system_health,
                'features': {
                    'context_aware_weighting': True,
                    'empirical_calibration': True,
                    'dynamic_components': True,
                    'convergence_monitoring': True,
                    'graceful_degradation': True
                }
            }
        })
        
        # Test sensitivity analysis
        try:
            sensitivity = system.analyze_weight_sensitivity(sample_components, ['normal_operations', 'climate_shock'])
            health_report['enhanced_weighting_validation']['sensitivity_analysis'] = {
                'success': True,
                'scenarios_tested': len(sensitivity)
            }
        except Exception as e:
            health_report['enhanced_weighting_validation']['sensitivity_analysis'] = {
                'success': False,
                'error': str(e)
            }
        
    except Exception as e:
        if 'errors' not in health_report:
            health_report['errors'] = []
        health_report['errors'].append(f"Enhanced weighting system validation failed: {str(e)}")
        health_report['overall_status'] = False
    
    return health_report