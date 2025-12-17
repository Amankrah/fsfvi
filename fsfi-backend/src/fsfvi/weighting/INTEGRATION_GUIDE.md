# FSFVI Component Relationship Implementation Guide

## Summary of Changes

This implementation addresses the critical finding that `ComponentRegistry.relationships` and `ComponentMetadata.dependencies` were never populated. The system was running on crude category heuristics instead of food security-grounded relationships.

---

## What Was Changed

### 1. `models.rs` - Major Updates

**New Structures:**
- `CascadeMatrix` - Stores scenario-specific component-to-component cascade weights with metadata (description, source documentation)

**`ComponentMetadata` Additions:**
- `fewsnet_pathway: Option<String>` - Maps to FEWS NET food access pathways (production, purchase, transfer, etc.)
- `ipc_dimension: Option<String>` - Maps to IPC food security dimensions (availability, access, utilization, stability)
- `dependencies: Vec<String>` - Now properly populated with upstream dependencies

**`ComponentRegistry` Updates:**
- `relationships: HashMap<String, CascadeMatrix>` - Now populated with 5 scenario-specific matrices
- `initialize_cascade_relationships()` - New method that populates IPC/FEWS NET-grounded relationships
- `get_dependency_matrix(scenario: Option<&str>)` - Now accepts scenario parameter
- `get_available_scenarios()` - Returns list of available scenario matrices
- `get_scenario_metadata()` - Returns description and source for a scenario

**Scenarios Implemented:**
| Scenario Key | Description |
|--------------|-------------|
| `baseline` / `normal_operations` | Standard food system interdependencies |
| `climate_shock` | Drought, flood, extreme weather |
| `financial_crisis` | Price shocks, currency collapse, recession |
| `pandemic_disruption` | Disease outbreak, health system stress |
| `political_instability` / `conflict` | Armed conflict, civil unrest |

### 2. `network.rs` - Updates

**`NetworkCentralityAnalyzer` Changes:**
- Removed `component_registry` field (was stored but never used after initialization)
- Added `current_scenario: String` field to track active scenario
- `new()` → Creates analyzer with baseline scenario
- `with_scenario(scenario: Option<&str>)` → Creates analyzer for specific scenario
- `set_scenario(&mut self, scenario: &str)` → Updates analyzer to different scenario
- `current_scenario(&self)` → Returns current scenario name

**New Functions:**
- `calculate_relationship_sensitivity()` - Identifies which relationships most affect PageRank results
- `compare_centrality_methods()` - Compares PageRank vs Eigenvector for robustness validation
- `CentralityComparison` struct - Holds comparison results

---

## Key Relationship Values (Baseline)

These are grounded in IPC/FEWS NET frameworks:

| Source → Target | Weight | Rationale |
|-----------------|--------|-----------|
| Climate → Agriculture | 0.90 | ~80% of food emergencies have climate component |
| Agriculture → Nutrition | 0.85 | Direct caloric impact via production pathway |
| Infrastructure → Agriculture | 0.70 | Input delivery, output marketing, post-harvest |
| Governance → Social Protection | 0.65 | Program delivery capacity |
| Social Protection → Nutrition | 0.60 | Transfer pathway (cash/food assistance) |

---

## Integration Steps

### Step 1: Replace Files

```bash
# Back up originals
cp src/fsfvi/weighting/models.rs src/fsfvi/weighting/models.rs.bak
cp src/fsfvi/weighting/network.rs src/fsfvi/weighting/network.rs.bak

# Copy updated files
cp models_updated.rs src/fsfvi/weighting/models.rs
cp network_updated.rs src/fsfvi/weighting/network.rs
```

### Step 2: Update Hybrid Weighting System

In `hybrid.rs`, update `NetworkCentralityAnalyzer` usage to support scenarios:

```rust
impl HybridWeightingSystem {
    /// Create with specific scenario
    pub fn with_scenario(scenario: Option<&str>) -> Self {
        Self {
            expert_system: ExpertWeightingSystem::new(),
            network_analyzer: NetworkCentralityAnalyzer::with_scenario(scenario),
        }
    }

    /// Update scenario for network analysis
    pub fn set_scenario(&mut self, scenario: &str) {
        self.network_analyzer.set_scenario(scenario);
    }
}
```

### Step 3: Update API/Service Layer

Ensure scenario is passed through to weighting calculations:

```rust
// Example: In your FSFVI calculation service
pub fn calculate_fsfvi(
    components: &[Component],
    scenario: Option<&str>,  // Add this parameter
    context: Option<&WeightingContext>,
) -> FsfviResult<FsfviScore> {
    let weighting = HybridWeightingSystem::with_scenario(scenario);
    // ... rest of calculation
}
```

### Step 4: Run Tests

```bash
cargo test --package fsfvi -- weighting
```

All existing tests should pass, plus new tests for:
- `test_relationships_populated`
- `test_cascade_matrix_weights`
- `test_scenario_specific_matrix`
- `test_dependencies_populated`
- `test_fewsnet_pathway_mapping`
- `test_scenario_specific_pagerank`
- `test_centrality_comparison`

---

## Validation Recommendations

### 1. Expert Review
Have domain experts review the relationship weights in `initialize_cascade_relationships()`. The current values are based on IPC/FEWS NET literature but should be validated for your specific context.

### 2. Sensitivity Analysis
Use the new `calculate_relationship_sensitivity()` function to identify which relationships have the most impact on results:

```rust
let analyzer = NetworkCentralityAnalyzer::with_scenario(Some("climate_shock"));
let sensitivities = analyzer.calculate_relationship_sensitivity(0.05)?;

// Sort by sensitivity
let mut sorted: Vec<_> = sensitivities.iter().collect();
sorted.sort_by(|a, b| b.1.partial_cmp(a.1).unwrap());

for ((source, target), sensitivity) in sorted.iter().take(10) {
    println!("{} → {}: {:.4}", source, target, sensitivity);
}
```

### 3. Cross-Validation
Use `compare_centrality_methods()` to check if conclusions are robust to algorithm choice:

```rust
let comparison = compare_centrality_methods(&analyzer)?;
println!("PageRank/Eigenvector correlation: {:.3}", comparison.correlation);
println!("Max divergence: {:.4} ({})", 
    comparison.max_divergence, 
    comparison.max_divergence_component);
```

A correlation > 0.8 suggests robust results.

### 4. Historical Validation
Compare predicted cascade patterns against:
- IPC historical classifications (contributing factors in analysis reports)
- FEWS NET scenario accuracy (projected vs actual outcomes)

---

## Configuration Options

If you need to adjust weights without code changes, consider externalizing the relationship matrices to a configuration file (TOML/JSON):

```toml
# fsfvi_relationships.toml

[baseline]
agricultural_development.nutrition_health = 0.85
agricultural_development.infrastructure = 0.25
climate_natural_resources.agricultural_development = 0.90
# ... etc

[climate_shock]
agricultural_development.nutrition_health = 0.90
climate_natural_resources.agricultural_development = 0.95
# ... etc
```

Then load in `initialize_cascade_relationships()`:
```rust
fn initialize_cascade_relationships(&mut self) {
    if let Ok(config) = load_relationship_config("fsfvi_relationships.toml") {
        self.relationships = config;
    } else {
        // Fall back to hardcoded defaults
        self.initialize_default_relationships();
    }
}
```

---

## Questions?

The key design decisions were:
1. **Component-specific over category-generic**: Agriculture → Nutrition is different from Infrastructure → Nutrition
2. **Scenario-aware**: Climate shocks propagate differently than financial crises
3. **IPC/FEWS NET grounded**: Weights based on established food security frameworks
4. **Fallback safety**: System gracefully degrades to category heuristics if scenario not found

If you need to adjust any weights or add new scenarios, modify `initialize_cascade_relationships()` in `models.rs`.
