# FSFVI Algorithm - Rust Implementation

## Overview

This module contains the Rust implementation of the FSFVI (Food System Financial Vulnerability Index) algorithm, transformed from the Python backend implementation.

## Structure

```
fsfvi/
├── config.rs              # System configuration (enums, constants, thresholds)
├── errors.rs              # Centralized error handling
├── validators.rs          # Input validation and normalization
├── fsfvi_core/           # Core mathematical calculations
│   ├── calculations.rs   # Performance gaps, vulnerability calculations
│   ├── sensitivity.rs    # Sensitivity parameter estimation
│   ├── metrics.rs        # System-level metrics and aggregation
│   └── mod.rs           # Core module exports
├── weighting/            # Advanced weighting algorithms (separate from core)
│   ├── models.rs        # Data structures (ComponentRegistry, Context, etc.)
│   ├── expert.rs        # AHP-based expert weighting
│   ├── network.rs       # PageRank and network centrality (TODO)
│   ├── hybrid.rs        # Combined weighting methods (TODO)
│   └── mod.rs          # Weighting module exports (TODO)
├── service/             # Business logic layer for government users
│   ├── calculation.rs   # FSFVI calculation orchestration (TODO)
│   ├── government_api.rs # Government-specific interfaces (TODO)
│   └── mod.rs          # Service module exports (TODO)
└── mod.rs              # Main FSFVI module exports (TODO)
```

## Architectural Principles

### 1. Separation of Concerns
- **Core (`fsfvi_core`)**: Pure mathematical calculations, no business logic
- **Weighting**: Advanced weighting algorithms independent of core calculations
- **Service**: Government-facing business logic and orchestration

### 2. No Legacy Code
- All hardcoded values moved to `config.rs`
- No fallback magic numbers - uses configuration constants
- Errors properly typed and informative

### 3. Mathematical Integrity
The FSFVI formula is implemented exactly as specified:

```
FSFVI = Σᵢ ωᵢ · υᵢ(fᵢ) = Σᵢ ωᵢ · δᵢ · [1/(1 + αᵢfᵢ)]
```

Where:
- `ωᵢ`: Component weight (from weighting module)
- `δᵢ`: Performance gap (from calculations.rs)
- `αᵢ`: Sensitivity parameter (from sensitivity.rs)
- `fᵢ`: Financial allocation (user input)
- `υᵢ(fᵢ)`: Component vulnerability (from calculations.rs)

## Modules Completed

### ✅ Config Module (`config.rs`)
- Enums: `WeightingMethod`, `Scenario`, `ComponentType`
- Structs: `FsfviConfig`, `WeightingConfig`, `ValidationConfig`
- Component type normalization
- Risk threshold management

### ✅ Errors Module (`errors.rs`)
- Custom error types for all FSFVI operations
- Detailed error messages with context
- Type-safe error handling

### ✅ Validators Module (`validators.rs`)
- Component data validation
- Weight validation and normalization
- AHP matrix validation
- Dependency matrix validation
- Budget constraint validation

### ✅ Core Calculations (`fsfvi_core/calculations.rs`)
- Performance gap calculation
- Vulnerability calculation with diminishing returns
- Weighted vulnerability
- Efficiency index
- Priority level determination
- Utility functions (round, clamp, normalize)

### ✅ Sensitivity Module (`fsfvi_core/sensitivity.rs`)
- Hardcoded estimation (base values with adjustments)
- Empirical estimation (with country context)
- Theoretical bounds calculation
- Configurable estimation methods

### ✅ Metrics Module (`fsfvi_core/metrics.rs`)
- System-level FSFVI aggregation
- Component contribution analysis
- Resilience indicators
- Efficiency metrics
- Government insights
- Action priorities generation

### ✅ Weighting Models (`weighting/models.rs`)
- `WeightingContext` for context-aware weighting
- `ComponentMetadata` with context-specific adjustments
- `ComponentRegistry` with default food system components
- `ScenarioWeights` for scenario-specific configurations

### ✅ Expert Weighting (`weighting/expert.rs`)
- AHP matrix construction
- Principal eigenvector calculation
- Scenario-based weights
- Context-aware weights

## TODO: Remaining Components

### 1. Network Weighting (`weighting/network.rs`)
- PageRank centrality calculation
- Cascade multiplier analysis
- Dependency matrix handling

### 2. Hybrid Weighting (`weighting/hybrid.rs`)
- Combine expert, network, and financial methods
- Performance-based adjustments
- Weight integration logic

### 3. Service Layer (`service/`)
- `calculation.rs`: Orchestrate FSFVI calculations
- `government_api.rs`: Government-specific API interfaces
- Integration with existing auth and API key management

### 4. Dependencies (`Cargo.toml`)
Required additions:
```toml
lazy_static = "1.4"  # For global config instances
```

## Design Decisions

### 1. No Hardcoded Values
All configuration values are in `config.rs` and accessible via the global `FSFVI_CONFIG`, `WEIGHTING_CONFIG`, and `VALIDATION_CONFIG` instances.

### 2. Weighting Separated from Core
The weighting algorithms are in a separate module to:
- Keep core calculations pure and focused
- Allow independent evolution of weighting methods
- Support multiple weighting strategies

### 3. Government-Centric Service Layer
The service layer will provide:
- High-level APIs for government users
- Policy-relevant insights and recommendations
- Integration with existing backend infrastructure

## Integration Plan

1. **Complete remaining modules** (network, hybrid, service)
2. **Add to Cargo.toml** dependencies
3. **Create main mod.rs** to export public API
4. **Integrate with existing backend**:
   - Connect to existing auth system
   - Use existing API key management
   - Leverage existing database connections
5. **Create API endpoints** for government users
6. **Add comprehensive tests**

## Testing Strategy

- Unit tests for each calculation function
- Integration tests for end-to-end FSFVI calculation
- Property-based tests for mathematical invariants
- Benchmark tests for performance

## Usage Example (Planned)

```rust
use crate::fsfvi::service::FsfviCalculationService;

let service = FsfviCalculationService::new();

let components = vec![/* ... */];
let result = service.calculate_fsfvi(
    components,
    WeightingMethod::Hybrid,
    Scenario::ClimateShock,
    None, // shock probabilities
    Some(context), // country context
).await?;

println!("FSFVI: {}", result.fsfvi_value);
println!("Risk Level: {}", result.risk_level);
println!("Critical Components: {:?}", result.critical_components);
```

## Next Steps

1. Complete `weighting/network.rs` for PageRank calculations
2. Complete `weighting/hybrid.rs` for combined methods
3. Create `service/` layer for government-facing APIs
4. Update `Cargo.toml` with dependencies
5. Create integration tests
6. Connect to existing backend infrastructure
