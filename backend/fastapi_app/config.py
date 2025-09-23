"""
FSFVI System Configuration
==========================

Centralized configuration for the FSFVI system to provide consistent configuration across all modules.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WeightingMethod(Enum):
    """Available weighting methods"""
    FINANCIAL = "financial"
    EXPERT = "expert" 
    NETWORK = "network"
    HYBRID = "hybrid"


class Scenario(Enum):
    """Available scenarios for analysis"""
    NORMAL_OPERATIONS = "normal_operations"
    CLIMATE_SHOCK = "climate_shock"
    FINANCIAL_CRISIS = "financial_crisis"
    PANDEMIC_DISRUPTION = "pandemic_disruption"
    SUPPLY_CHAIN_DISRUPTION = "supply_chain_disruption"
    CYBER_THREATS = "cyber_threats"
    POLITICAL_INSTABILITY = "political_instability"
    #ARMED_CONFLICT = "armed_conflict" - (FIND THE DATABASE THAT TRACKS THIS)


class ComponentType(Enum):
    """
    Standard component types based on validated food systems frameworks
    
    Framework Validation:
    - Strong alignment with 3FS (Tracking Financial Flows to Food Systems) methodology
    - Incorporates FSCI (Food Systems Countdown Initiative) governance insights
    - Addresses critical gaps in existing frameworks
    - Balances analytical utility with practical implementation
    """
    AGRICULTURAL_DEVELOPMENT = "agricultural_development"
    INFRASTRUCTURE = "infrastructure" 
    NUTRITION_HEALTH = "nutrition_health"
    CLIMATE_NATURAL_RESOURCES = "climate_natural_resources"
    SOCIAL_PROTECTION_EQUITY = "social_protection_equity" 
    GOVERNANCE_INSTITUTIONS = "governance_institutions"


@dataclass
class FSFVIConfig:
    """
    Core FSFVI calculation configuration
    
    Mathematical Context:
    The FSFVI system calculates vulnerability using the formula:
    FSFVI = Σᵢ ωᵢ · υᵢ(fᵢ) = Σᵢ ωᵢ · δᵢ · [1/(1 + αᵢfᵢ)]
    
    Where:
    - ωᵢ: Component weights (dimensionless, Σωᵢ = 1)
    - δᵢ: Performance gaps (dimensionless, [0,1])
    - αᵢ: Sensitivity parameters (1/financial_units)
    - fᵢ: Financial allocations (financial_units)
    """
    precision: int = 6
    tolerance: float = 1e-6
    max_iterations: int = 1000
    default_weighting: WeightingMethod = WeightingMethod.HYBRID
    default_scenario: Scenario = Scenario.NORMAL_OPERATIONS
    
    # Sensitivity parameter estimation configuration
    sensitivity_estimation_method: str = "empirical"  # Primary estimation method
    sensitivity_estimation_fallback: str = "hardcoded"  # Fallback when primary method fails
    
    """
    Sensitivity Parameter Estimation Methods:
    
    1. "hardcoded": Base component-specific values with performance adjustments
       - Uses empirically-derived base values by component type
       - Applies adjustments for scale economies, complexity, performance gaps
       - Range: [0.0005, 0.005] for allocations in millions USD
       - Fast, reliable, but not adaptive
    
    2. "empirical": Historical effectiveness analysis with country context
       - Analyzes historical allocation-performance relationships
       - Incorporates country-specific factors (GDP, governance, capacity)
       - Uses cross-sectional estimation when historical data unavailable
       - More accurate but requires quality historical data
    
    3. "ml": Machine learning prediction from training data
       - Gradient boosting models trained on allocation-effectiveness patterns
       - Features: component type, performance gaps, allocation levels, country context
       - Highly accurate with sufficient training data
       - Requires sklearn and substantial historical dataset
    
    4. "bayesian": Probabilistic estimation with uncertainty quantification
       - Combines prior beliefs with observed likelihood
       - Provides confidence intervals and uncertainty measures
       - Updates estimates as new evidence becomes available
       - Good for decision-making under uncertainty
    
    5. "adaptive": Self-learning from performance history
       - Exponential smoothing of historical sensitivity estimates
       - Adjusts based on recent performance trends and effectiveness
       - Improves over time with system usage
       - Ideal for long-term system deployment
    
    Mathematical Foundation:
    All methods estimate αᵢ such that the vulnerability function υᵢ(fᵢ) = δᵢ/(1 + αᵢfᵢ)
    produces realistic vulnerability values that:
    - Reflect actual responsiveness to funding
    - Satisfy mathematical bounds [0.0005, 0.005] for millions USD
    - Ensure dimensionless αᵢfᵢ factor
    - Enable meaningful optimization and comparison
    """
    
    # Risk thresholds - Updated based on mathematical analysis
    # FSFVI is dimensionless, ranging [0,1] with real-world values typically 0.01-0.10
    risk_thresholds: Dict[str, float] = None
    
    # Alternative threshold sets for different contexts
    alternative_thresholds: Dict[str, Dict[str, float]] = None
    
    # Weight validation tolerances
    weight_tolerance: float = 1e-3
    weight_sum_tolerance: float = 1e-3
    
    # Optimization parameters
    initial_learning_rate: float = 0.1
    min_improvement: float = 1e-6
    max_optimization_iterations: int = 200
    
    def __post_init__(self):
        if self.risk_thresholds is None:
            # MATHEMATICALLY-GROUNDED THRESHOLDS (Option 1: Percentile-Based)
            # Based on empirical analysis of Kenya's $2.9B portfolio showing FSFVI ≈ 0.02-0.03
            # These thresholds reflect actual vulnerability percentages in real food systems
            self.risk_thresholds = { #TODO: CHANGE THIS TO THE NEW THRESHOLDS (TRANSPOSE INTERPLETATION)
                'low': 0.050,        # < 5% vulnerability (excellent-good systems)
                'medium': 0.150,     # 5-15% vulnerability (moderate issues) 
                'high': 0.300,       # 15-30% vulnerability (significant problems)
                'critical': 0.500    # > 30% vulnerability (crisis levels)
            }
        
        if self.alternative_thresholds is None:
            self.alternative_thresholds = {
                # Original thresholds (too high for real data)
                'original': {
                    'low': 0.15, 'medium': 0.30, 'high': 0.50, 'critical': 0.70
                },
                
                # Fine-grained for high-performing systems
                'fine_grained': {
                    'low': 0.010, 'medium': 0.025, 'high': 0.075, 'critical': 0.200
                },
                
                # Logarithmic scale for wide range discrimination
                'logarithmic': {
                    'low': 0.005, 'medium': 0.025, 'high': 0.100, 'critical': 0.400
                },
                
                # Crisis-oriented for emergency contexts
                'crisis_mode': {
                    'low': 0.100, 'medium': 0.250, 'high': 0.500, 'critical': 0.750
                }
            }
    
    def get_threshold_set(self, context: str = 'default') -> Dict[str, float]:
        """
        Get appropriate threshold set for different contexts
        
        Args:
            context: 'default', 'original', 'fine_grained', 'logarithmic', or 'crisis_mode'
            
        Returns:
            Dictionary of risk thresholds
        """
        if context == 'default':
            return self.risk_thresholds.copy()
        elif context in self.alternative_thresholds:
            return self.alternative_thresholds[context].copy()
        else:
            logger.warning(f"Unknown threshold context '{context}', using default")
            return self.risk_thresholds.copy()
    
    def get_vulnerability_interpretation(self, fsfvi_score: float) -> Dict[str, any]:
        """
        Get comprehensive interpretation of FSFVI score
        
        Args:
            fsfvi_score: FSFVI vulnerability score (dimensionless, [0,1])
            
        Returns:
            Dictionary with interpretation details
        """
        # Determine risk level
        risk_level = self._determine_risk_level(fsfvi_score)
        
        # Convert to percentage for intuitive understanding
        vulnerability_percent = fsfvi_score * 100
        
        # Generate interpretation
        interpretations = {
            'low': {
                'description': 'Low vulnerability - System is resilient with good financing effectiveness',
                'action_needed': 'Monitor and maintain current performance',
                'urgency': 'Low',
                'color_code': 'green'
            },
            'medium': {
                'description': 'Medium vulnerability - Some components need attention', 
                'action_needed': 'Strategic improvements and reallocation recommended',
                'urgency': 'Medium',
                'color_code': 'yellow'
            },
            'high': {
                'description': 'High vulnerability - Significant financing inefficiencies detected',
                'action_needed': 'Immediate intervention and resource optimization required',
                'urgency': 'High', 
                'color_code': 'orange'
            },
            'critical': {
                'description': 'Critical vulnerability - System at risk of financing failure',
                'action_needed': 'Emergency response and comprehensive restructuring needed',
                'urgency': 'Critical',
                'color_code': 'red'
            }
        }
        
        return {
            'fsfvi_score': fsfvi_score,
            'vulnerability_percent': vulnerability_percent,
            'risk_level': risk_level,
            'unit': 'dimensionless_ratio',
            'scale': '[0,1] theoretical, [0,0.5] typical',
            'interpretation': interpretations.get(risk_level, interpretations['medium']),
            'mathematical_note': 'FSFVI = Σ ωᵢ·δᵢ·[1/(1+αᵢfᵢ)] where all terms are dimensionless'
        }
    
    def _determine_risk_level(self, fsfvi_score: float) -> str:
        """Determine risk level based on current thresholds"""
        if fsfvi_score <= self.risk_thresholds['low']:
            return 'low'
        elif fsfvi_score <= self.risk_thresholds['medium']:
            return 'medium'
        elif fsfvi_score <= self.risk_thresholds['high']:
            return 'high'
        else:
            return 'critical'


@dataclass
class WeightingConfig:
    """Advanced weighting system configuration"""
    # AHP configuration
    ahp_consistency_threshold: float = 0.1
    
    # Network analysis configuration
    pagerank_damping: float = 0.85
    pagerank_tolerance: float = 1e-8
    pagerank_max_iterations: int = 1000
    
    # Hybrid weighting coefficients
    hybrid_expert_weight: float = 0.35
    hybrid_pagerank_weight: float = 0.30
    hybrid_cascade_weight: float = 0.25
    hybrid_financial_weight: float = 0.10
    
    # Performance adjustment bounds
    adjustment_min_factor: float = 0.5
    adjustment_max_factor: float = 2.0


@dataclass
class ValidationConfig:
    """Validation configuration"""
    # Component validation
    min_observed_value: float = 0.0
    min_benchmark_value: float = 0.0
    min_financial_allocation: float = 0.0
    min_sensitivity_parameter: float = 0.0005
    
    # Weight validation
    max_weight_concentration: float = 0.7
    
    # Dependency matrix validation
    dependency_min_value: float = 0.0
    dependency_max_value: float = 1.0
    dependency_asymmetry_threshold: float = 10.0


# Global configuration instances
FSFVI_CONFIG = FSFVIConfig()
WEIGHTING_CONFIG = WeightingConfig()
VALIDATION_CONFIG = ValidationConfig()

# Performance direction preferences for each component type
# True = higher values are better, False = lower values are better
COMPONENT_PERFORMANCE_PREFERENCES = {
    ComponentType.AGRICULTURAL_DEVELOPMENT: True,      # Higher production/productivity is better
    ComponentType.INFRASTRUCTURE: True,               # Higher capacity/coverage is better  
    ComponentType.NUTRITION_HEALTH: True,            # Better health outcomes (higher is better)
    ComponentType.CLIMATE_NATURAL_RESOURCES: True,   # Better environmental performance (higher is better)
    ComponentType.SOCIAL_PROTECTION_EQUITY: True,    # Higher coverage/effectiveness is better
    ComponentType.GOVERNANCE_INSTITUTIONS: True      # Better governance metrics (higher is better)
}

# Component type mappings for normalization based on validated frameworks
COMPONENT_TYPE_MAPPINGS = { #TODO: DISAGREGATE TO SUB COMPONENTS for each component type - Align with the food systen countdown initiative
    ComponentType.AGRICULTURAL_DEVELOPMENT: [
        # Core agricultural production (3FS Framework alignment)
        'agriculture', 'agri', 'farming', 'crop', 'livestock', 'fisheries', 'aquaculture',
        'production systems', 'input supply', 'agricultural research', 'extension services',
        'value chain', 'value chain strengthening', 'productivity enhancement',
        # Food production and availability
        'food production', 'farming systems', 'food availability', 'agricultural yields',
        'rural development', 'agricultural development', 'smallholder', 'farmer support'
    ],
    ComponentType.INFRASTRUCTURE: [
        # Physical infrastructure (3FS Infrastructure for Food Systems)
        'transport', 'logistics', 'roads', 'rural roads', 'storage', 'storage facilities',
        'distribution', 'irrigation', 'irrigation systems', 'warehouse', 'post-harvest',
        'supply chain', 'market infrastructure', 'cold chain', 'processing facilities',
        # Digital and energy infrastructure
        'connectivity', 'telecommunications', 'digital connectivity', 'energy',
        'processing and packaging', 'processing', 'packaging', 'storage and distribution'
    ],
    ComponentType.NUTRITION_HEALTH: [
        # Nutrition-specific interventions (3FS & FSCI alignment)
        'nutrition', 'health', 'medical', 'healthcare', 'nutritional', 'feeding',
        'malnutrition', 'dietary', 'micronutrient', 'vitamin', 'mineral', 'supplementation',
        'nutrition education', 'fortification', 'food safety', 'safety',
        # Nutrition programs and health outcomes
        'school feeding', 'maternal nutrition', 'child nutrition', 'public health',
        'food environments', 'food security', 'diet quality', 'nutrition-specific'
    ],
    ComponentType.CLIMATE_NATURAL_RESOURCES: [
        # Climate-smart agriculture and adaptation (3FS & FSCI Environment theme)
        'climate', 'climate-smart agriculture', 'climate change', 'adaptation', 'mitigation',
        'resilience', 'climate resilience', 'disaster risk', 'early warning',
        # Natural resource management (FSCI Environmental indicators)
        'environment', 'environmental', 'water', 'water resources', 'natural_resources',
        'natural resource management', 'forestry', 'biodiversity', 'ecosystem',
        'ecosystem restoration', 'sustainability', 'conservation', 'renewable energy',
        # Environmental outcomes
        'emissions', 'greenhouse gas', 'land use', 'pollution', 'biosphere integrity'
    ],
    ComponentType.SOCIAL_PROTECTION_EQUITY: [
        # Enhanced social protection (FSCI Livelihoods, Poverty, and Equity theme)
        'social protection', 'social', 'safety_nets', 'assistance', 'welfare', 'protection',
        'cash transfer', 'social safety', 'emergency food assistance', 'school feeding',
        # Equity and rights dimensions (FSCI enhancement)
        'poverty reduction', 'poverty', 'equity', 'livelihoods', 'rights', 'human rights',
        'income', 'employment', 'gender', 'gender equity', 'youth', 'women empowerment',
        'social inclusion', 'vulnerable populations', 'marginalized communities',
        # Demographics and migration
        'population', 'migration', 'population growth and migration', 'demographic',
        'livelihoods, poverty, and equity'
    ],
    ComponentType.GOVERNANCE_INSTITUTIONS: [
        # Policy and regulatory frameworks (FSCI Governance theme)
        'governance', 'institutions', 'policy', 'regulation', 'regulatory frameworks',
        'institutional', 'legal', 'policy frameworks', 'food environment policies',
        'right to food', 'legal recognition', 'regulatory standards',
        # Institutional capacity and coordination (3FS gap addressed)
        'coordination', 'cross-sectoral coordination', 'management', 'administration',
        'institutional capacity', 'implementation capacity', 'administrative resources',
        'multi-stakeholder platforms', 'inter-sectoral coordination',
        # Democratic participation and accountability (FSCI indicators)
        'monitoring', 'evaluation', 'transparency', 'accountability', 'civil society',
        'participation', 'multi-stakeholder governance', 'access to information',
        # Market and economic governance
        'retail', 'marketing', 'retail and marketing', 'market', 'trade', 'economic',
        'financial services', 'credit', 'insurance', 'market development',
        'corporate concentration', 'power dynamics', 'political stability'
    ]
}

def get_component_types() -> List[str]:
    """Get all available component types as strings"""
    return [ct.value for ct in ComponentType]

def normalize_component_type(component_type: str) -> str:
    """
    Normalize component type to standard categories based on validated frameworks
    
    Handles legacy mappings and provides enhanced categorization based on:
    - 3FS (Tracking Financial Flows to Food Systems) methodology
    - FSCI (Food Systems Countdown Initiative) governance insights
    - Academic literature on food systems frameworks
    """
    if not component_type:
        return ComponentType.AGRICULTURAL_DEVELOPMENT.value
    
    component_type = component_type.lower().strip()
    
    # Handle legacy social_assistance mapping to social_protection_equity
    if component_type in ['social_assistance', 'social assistance']:
        return ComponentType.SOCIAL_PROTECTION_EQUITY.value
    
    # Direct match
    try:
        return ComponentType(component_type).value
    except ValueError:
        pass
    
    # Fuzzy match using enhanced mappings
    for standard_type, aliases in COMPONENT_TYPE_MAPPINGS.items():
        if component_type in aliases or any(alias in component_type for alias in aliases):
            return standard_type.value
    
    logger.warning(f"Unknown component type '{component_type}', using 'agricultural_development'")
    return ComponentType.AGRICULTURAL_DEVELOPMENT.value

def get_weighting_methods() -> List[str]:
    """Get all available weighting methods"""
    return [wm.value for wm in WeightingMethod]

def get_scenarios() -> List[str]:
    """Get all available scenarios"""
    return [s.value for s in Scenario]

def get_component_performance_preference(component_type: str) -> bool:
    """
    Get performance direction preference for a component type
    
    Args:
        component_type: Component type as string
        
    Returns:
        True if higher values are better, False if lower values are better
    """
    try:
        comp_enum = ComponentType(component_type)
        return COMPONENT_PERFORMANCE_PREFERENCES.get(comp_enum, True)  # Default to higher is better
    except ValueError:
        logger.warning(f"Unknown component type '{component_type}', defaulting to prefer_higher=True")
        return True 