"""
FSFVI System Configuration
==========================

Centralized configuration for the FSFVI system to eliminate scattered settings
and provide consistent configuration across all modules.
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


class ComponentType(Enum):
    """Standard component types based on 3FS methodology"""
    AGRICULTURAL_DEVELOPMENT = "agricultural_development"
    INFRASTRUCTURE = "infrastructure"
    NUTRITION_HEALTH = "nutrition_health"
    CLIMATE_NATURAL_RESOURCES = "climate_natural_resources"
    SOCIAL_ASSISTANCE = "social_assistance"
    GOVERNANCE_INSTITUTIONS = "governance_institutions"


@dataclass
class FSFVIConfig:
    """Core FSFVI calculation configuration"""
    precision: int = 6
    tolerance: float = 1e-6
    max_iterations: int = 1000
    default_weighting: WeightingMethod = WeightingMethod.HYBRID
    default_scenario: Scenario = Scenario.NORMAL_OPERATIONS
    
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
            self.risk_thresholds = {
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
    min_sensitivity_parameter: float = 0.0
    
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

# Component type mappings for normalization
COMPONENT_TYPE_MAPPINGS = {
    ComponentType.AGRICULTURAL_DEVELOPMENT: [
        # Core agricultural terms
        'agriculture', 'agri', 'farming', 'crop', 'livestock', 'fisheries', 'production systems',
        'input supply', 'production systems and input supply', 'food production', 'farming systems',
        # Food system terms that relate to agricultural development
        'food availability', 'food security', 'food systems', 'rural development'
    ],
    ComponentType.INFRASTRUCTURE: [
        # Physical infrastructure
        'transport', 'logistics', 'roads', 'storage', 'distribution', 'irrigation', 'warehouse',
        'post-harvest', 'supply chain', 'connectivity', 'telecommunications', 'energy',
        # Food system infrastructure
        'storage and distribution', 'processing and packaging', 'processing', 'packaging',
        'market infrastructure', 'cold chain'
    ],
    ComponentType.NUTRITION_HEALTH: [
        # Health and nutrition
        'nutrition', 'health', 'medical', 'healthcare', 'nutritional', 'feeding', 'malnutrition',
        'dietary', 'micronutrient', 'vitamin', 'mineral', 'food safety', 'safety',
        # Nutrition programs
        'school feeding', 'maternal nutrition', 'child nutrition', 'public health'
    ],
    ComponentType.CLIMATE_NATURAL_RESOURCES: [
        # Climate and environment
        'climate', 'environment', 'water', 'natural_resources', 'environmental', 'forestry',
        'biodiversity', 'ecosystem', 'sustainability', 'conservation', 'renewable',
        # Climate adaptation/resilience
        'resilience', 'adaptation', 'mitigation', 'disaster risk', 'early warning',
        'climate change', 'natural resource management'
    ],
    ComponentType.SOCIAL_ASSISTANCE: [
        # Social protection
        'social', 'safety_nets', 'assistance', 'welfare', 'protection', 'transfer',
        'cash transfer', 'social safety', 'poverty reduction', 'vulnerability',
        # Livelihood and equity
        'livelihoods', 'poverty', 'equity', 'livelihoods, poverty, and equity',
        'income', 'employment', 'gender', 'youth', 'women empowerment',
        # Demographics
        'population', 'migration', 'population growth and migration', 'demographic'
    ],
    ComponentType.GOVERNANCE_INSTITUTIONS: [
        # Governance and institutions
        'governance', 'institutions', 'policy', 'regulation', 'institutional', 'legal',
        'coordination', 'management', 'administration', 'monitoring', 'evaluation',
        # Market and economic governance
        'retail', 'marketing', 'retail and marketing', 'market', 'trade', 'economic',
        'financial services', 'credit', 'insurance', 'market development'
    ]
}

def get_component_types() -> List[str]:
    """Get all available component types as strings"""
    return [ct.value for ct in ComponentType]

def normalize_component_type(component_type: str) -> str:
    """Normalize component type to standard categories"""
    if not component_type:
        return ComponentType.AGRICULTURAL_DEVELOPMENT.value
    
    component_type = component_type.lower().strip()
    
    # Direct match
    try:
        return ComponentType(component_type).value
    except ValueError:
        pass
    
    # Fuzzy match using mappings
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