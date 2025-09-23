# FSFVI Migration Guide

## Overview
This guide helps you migrate from the old scattered architecture to the new streamlined layered architecture.

## Quick Start: Using the New Services

### Old Way (Don't do this anymore)
```python
# Old scattered approach
from .algorithms import FSFVICalculator, OptimizationEngine, Config
from .advanced_weighting import DynamicWeightingSystem, validate_weighting_system

config = Config()
calculator = FSFVICalculator(config)
optimizer = OptimizationEngine(calculator)

# Manual validation everywhere
validate_input(data)
validate_weighting_system()

# Manual calculations
result = calculator.calculate_fsfvi(components, method='hybrid')
```

### New Way (Recommended)
```python
# New clean service approach
from .fsfvi_service import create_fsfvi_services

# Single line service creation
calculation_service, optimization_service, analysis_service = create_fsfvi_services()

# Automatic validation and calculation
result = calculation_service.calculate_fsfvi(components, method='hybrid', scenario='normal_operations')
```

## Migration by Use Case

### 1. Basic FSFVI Calculation

#### Before
```python
from .algorithms import FSFVICalculator, Config

config = Config()
calculator = FSFVICalculator(config)

# Manual component preparation
weighted_components = calculator.apply_weights(components, method='hybrid')
result = calculator.calculate_fsfvi(weighted_components)
```

#### After
```python
from .fsfvi_service import FSFVICalculationService

calc_service = FSFVICalculationService()
result = calc_service.calculate_fsfvi(components, method='hybrid', scenario='normal_operations')
```

### 2. Optimization

#### Before
```python
from .algorithms import OptimizationEngine, FSFVICalculator

calculator = FSFVICalculator()
optimizer = OptimizationEngine(calculator)

# Complex optimization setup
constraints = OptimizationConstraints(total_budget=budget)
result = optimizer.optimize(region_data, constraints)
```

#### After
```python
from .fsfvi_service import FSFVIOptimizationService, FSFVICalculationService

calc_service = FSFVICalculationService()
opt_service = FSFVIOptimizationService(calc_service)

result = opt_service.optimize_allocation(components, budget, method='hybrid')
```

### 3. Comprehensive Analysis

#### Before
```python
# You had to manually coordinate multiple services
calculator = FSFVICalculator()
optimizer = OptimizationEngine(calculator)

# Run each analysis separately
fsfvi_result = calculator.calculate_fsfvi(components)
opt_result = optimizer.optimize(data, constraints)
# Manual comparison across methods...
```

#### After
```python
from .fsfvi_service import FSFVIAnalysisService

analysis_service = FSFVIAnalysisService()
result = analysis_service.comprehensive_analysis(
    components, 
    budget=budget,
    methods=['expert', 'network', 'hybrid'],
    include_optimization=True,
    include_sensitivity=True
)
```

### 4. Validation

#### Before
```python
# Validation scattered across files
from .algorithms import validate_input
from .advanced_weighting import validate_weighting_system

validate_input(region_data)
validation_report = validate_weighting_system()
```

#### After
```python
from .validators import validate_calculation_inputs, validate_system_health

# Centralized validation
components, method, scenario = validate_calculation_inputs(components, method, scenario)
health_report = validate_system_health()
```

## Configuration Migration

### Before
```python
from .algorithms import Config

config = Config()
config.precision = 6
config.tolerance = 1e-6
config.risk_thresholds = {'low': 0.15, 'medium': 0.30}
```

### After
```python
from .config import FSFVI_CONFIG, WEIGHTING_CONFIG, VALIDATION_CONFIG

# Configuration is centralized and accessible globally
precision = FSFVI_CONFIG.precision
tolerance = FSFVI_CONFIG.tolerance
risk_thresholds = FSFVI_CONFIG.risk_thresholds
```

## Error Handling Migration

### Before
```python
# Inconsistent error handling
try:
    result = calculator.calculate_fsfvi(components)
except ValueError as e:
    # Handle generic errors
    pass
except Exception as e:
    # Catch all
    pass
```

### After
```python
from .exceptions import FSFVIException, ValidationError, CalculationError

try:
    result = calc_service.calculate_fsfvi(components)
except ValidationError as e:
    # Handle validation specific errors
    print(f"Validation failed: {e.message}")
    print(f"Details: {e.details}")
except CalculationError as e:
    # Handle calculation specific errors
    pass
except FSFVIException as e:
    # Handle any FSFVI-related error
    pass
```

## FastAPI Endpoint Migration

### Before
```python
@app.post("/calculate_fsfvi")
async def calculate_fsfvi(request: FSFVIRequest):
    # 100+ lines of business logic mixed with API logic
    config = Config()
    calculator = FSFVICalculator(config)
    
    # Manual validation
    validate_input(request.components)
    
    # Manual calculation
    result = calculator.calculate_fsfvi(request.components)
    
    # Manual response building
    return FSFVIResponse(...)
```

### After
```python
from .fsfvi_service import create_fsfvi_services

calculation_service, _, _ = create_fsfvi_services()

@app.post("/calculate_fsfvi")
async def calculate_fsfvi(request: FSFVIRequest):
    try:
        components = [comp.dict() for comp in request.components]
        result = calculation_service.calculate_fsfvi(components)
        return _convert_to_response(result)
    except FSFVIException as e:
        raise HTTPException(status_code=400, detail=e.message)
```

## Import Changes

### Old Imports (Deprecated)
```python
# Don't use these anymore
from .algorithms import FSFVICalculator, OptimizationEngine, Config
from .advanced_weighting import DynamicWeightingSystem, validate_weighting_system
```

### New Imports (Recommended)
```python
# Use these instead
from .fsfvi_service import create_fsfvi_services, FSFVICalculationService
from .config import FSFVI_CONFIG, get_weighting_methods, get_scenarios
from .validators import validate_calculation_inputs, validate_system_health
from .exceptions import FSFVIException, ValidationError, CalculationError
from .fsfvi_core import calculate_performance_gap, calculate_vulnerability
```

## Testing Migration

### Before (Testing was difficult)
```python
def test_fsfvi_calculation():
    # Had to set up complex dependencies
    config = Config()
    calculator = FSFVICalculator(config)
    
    # Manual mocking of weighting system
    if ADVANCED_WEIGHTING_AVAILABLE:
        calculator.weighting_system = MockWeightingSystem()
```

### After (Easy to test)
```python
def test_fsfvi_calculation():
    # Easy service injection
    calc_service = FSFVICalculationService()
    
    # Or inject mocked weighting system
    mock_weighting = MockWeightingSystem()
    calc_service.weighting_system = mock_weighting
    
    result = calc_service.calculate_fsfvi(test_components)
    assert result['fsfvi_value'] > 0
```

## Breaking Changes

### None! 
The migration is **backward compatible**:

1. **All API endpoints work exactly the same**
2. **All public interfaces preserved**
3. **Same response formats**
4. **Graceful degradation** if advanced weighting unavailable

### Internal Changes Only
- File organization changed
- Internal function signatures improved
- Better error messages
- Enhanced validation

## Benefits After Migration

### 1. Simpler Code
```python
# Before: 10+ lines to calculate FSFVI
config = Config()
calculator = FSFVICalculator(config)
validate_input(data)
weighted_components = calculator.apply_weights(components)
result = calculator.calculate_fsfvi(weighted_components)

# After: 2 lines
calc_service = FSFVICalculationService()
result = calc_service.calculate_fsfvi(components, method='hybrid')
```

### 2. Better Error Messages
```python
# Before: Generic error
ValueError: Invalid input

# After: Specific error with details
ComponentError: Component comp_1 field 'observed_value': value -5.0 below minimum 0.0
```

### 3. Easier Testing
```python
# Before: Complex setup
def test_optimization():
    config = Config()
    calculator = FSFVICalculator(config)
    optimizer = OptimizationEngine(calculator)
    # ... lots of setup

# After: Simple service injection
def test_optimization():
    _, opt_service, _ = create_fsfvi_services()
    result = opt_service.optimize_allocation(components, budget)
```

## Rollback Plan

If you need to rollback (you shouldn't!), the old files are preserved:

1. **algorithms.py**: Still contains the old monolithic code
2. **Advanced weighting**: Still works with old patterns
3. **API contracts**: Unchanged, so client code unaffected

## Getting Help

### Check System Health
```python
from .validators import validate_system_health

health = validate_system_health()
if not health['overall_status']:
    print("Issues found:", health['errors'])
```

### Validate Your Migration
```python
from .fsfvi_service import create_fsfvi_services

# This will raise errors if something is wrong
services = create_fsfvi_services()
print("Migration successful!")
```

### Use New Validation
```python
from .validators import validate_calculation_inputs

try:
    components, method, scenario = validate_calculation_inputs(
        your_components, your_method, your_scenario
    )
    print("All inputs valid!")
except ValidationError as e:
    print(f"Fix this: {e.message}")
```

## Summary

The new architecture provides:
- ✅ **Simpler code**: Less boilerplate
- ✅ **Better errors**: Specific, actionable error messages  
- ✅ **Easier testing**: Clean service injection
- ✅ **Better performance**: No duplicate functions
- ✅ **Maintainability**: Clear separation of concerns

**Migration effort**: Minimal - mostly import changes and service creation patterns.
**Risk**: Very low - backward compatible with extensive testing. 