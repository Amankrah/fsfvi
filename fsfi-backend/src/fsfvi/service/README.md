# FSFVI Service Layer for Government Decision Making

## Architecture

The service layer is modularized into specialized components for different government use cases:

```
service/
├── vulnerability_assessment.rs   # Core FSFVI calculations and assessments
├── scenario_simulation.rs        # What-if analysis across scenarios
├── budget_optimization.rs        # Budget reallocation recommendations
├── matrix_generation.rs          # Generate and export AHP/network matrices
├── sensitivity_analysis.rs       # Weight and parameter sensitivity
├── decision_support.rs           # Policy recommendations and insights
└── mod.rs                        # Service layer exports
```

## Government Use Cases

### 1. Vulnerability Assessment
**Purpose**: Understand current food system vulnerability
**Endpoints**:
- `assess_food_system()` - Full FSFVI assessment
- `assess_with_context()` - Context-aware assessment (country, crisis type)
- `compare_components()` - Component-by-component comparison

### 2. Scenario Simulation
**Purpose**: Strategic planning through what-if analysis
**Endpoints**:
- `simulate_scenarios()` - Compare multiple scenarios
- `simulate_crisis_impacts()` - Model specific crisis scenarios
- `simulate_budget_changes()` - Model budget reallocation impacts

### 3. Budget Optimization
**Purpose**: Data-driven budget allocation recommendations
**Endpoints**:
- `analyze_allocation_efficiency()` - Current vs optimal allocation
- `generate_reallocation_plan()` - Step-by-step reallocation recommendations
- `optimize_budget()` - Find optimal allocation for target FSFVI

### 4. Matrix Generation
**Purpose**: Transparency and customization of weighting
**Endpoints**:
- `generate_ahp_matrix()` - View/export AHP comparison matrix
- `generate_network_matrix()` - View/export dependency matrix
- `customize_ahp_matrix()` - Allow custom expert judgments
- `validate_matrix()` - Check matrix consistency

### 5. Sensitivity Analysis
**Purpose**: Understand uncertainty and robustness
**Endpoints**:
- `analyze_weight_sensitivity()` - How weights affect FSFVI
- `analyze_parameter_sensitivity()` - Impact of sensitivity parameters
- `analyze_scenario_sensitivity()` - Scenario robustness

### 6. Decision Support
**Purpose**: Actionable policy recommendations
**Endpoints**:
- `get_policy_recommendations()` - Prioritized policy actions
- `get_intervention_priorities()` - Component-specific interventions
- `generate_executive_report()` - Government-ready summary

## Design Principles

1. **Modular**: Each module handles one business concern
2. **Government-First**: APIs designed for policy makers, not developers
3. **Transparent**: All calculations explainable and auditable
4. **Actionable**: Every output includes concrete next steps
5. **Robust**: Graceful error handling with informative messages
