# Dead Code Analysis - Food Security Vulnerability Index
## Government-Critical System Audit

**Date**: 2025-12-14
**Severity**: CRITICAL - Incomplete dependency cascade logic detected
**Context**: Government food security decision-making system affecting livelihoods

---

## Executive Summary

This analysis identifies **one CRITICAL incomplete implementation** and several unused features in the FSFVI Rust backend. The most serious issue is that the dependency cascade system—a core component for modeling how food system failures propagate—is running on generic category heuristics instead of component-specific relationships as originally designed.

---

## Critical Findings

### 🔴 CRITICAL: Incomplete Dependency Relationship System

**Location**: [models.rs:68](fsfi-backend/src/fsfvi/weighting/models.rs#L68)

**Issue**: The `relationships` field in `ComponentRegistry` is initialized but never populated with actual data:

```rust
pub struct ComponentRegistry {
    pub components: HashMap<String, ComponentMetadata>,
    pub relationships: HashMap<String, HashMap<String, f64>>,  // ❌ NEVER POPULATED
}
```

**Impact on Food Security Analysis**:

The current implementation treats all component relationships using generic category-based heuristics:

```rust
fn calculate_category_dependency(source_category: &str, target_category: &str) -> f64 {
    match (source_category, target_category) {
        ("economic", "social") => 0.7,        // All economic→social treated identically
        ("physical", "economic") => 0.7,
        ("environmental", "economic") => 0.8,
        // ... generic fallbacks
        _ => 0.3,
    }
}
```

**Why This Matters**:

1. **Agricultural Failure → Nutrition/Health** has different cascade effects than **Agricultural → Social Protection**
2. **Infrastructure failure during drought** propagates differently than during a **pandemic**
3. **Climate shocks** have different cascade patterns than **financial crises**
4. All these scenarios are currently using the same generic weights (e.g., "economic → social = 0.7")

**Related Issue**: `ComponentMetadata.dependencies` field ([models.rs:46](fsfi-backend/src/fsfvi/weighting/models.rs#L46)) is also always empty:

```rust
pub struct ComponentMetadata {
    pub dependencies: Vec<String>,  // ❌ NEVER POPULATED
    // ...
}
```

**Recommendation**:
- **Priority 1**: Audit with food security domain experts whether generic category heuristics are scientifically defensible
- **Priority 2**: If component-specific relationships are needed, implement proper relationship data structure
- **Priority 3**: Document the design decision either way in code comments

---

## High-Priority Unused Features

### 🟡 HIGH: Performance-Adjusted Weighting Not Integrated

**Location**: [hybrid.rs:111](fsfi-backend/src/fsfvi/weighting/hybrid.rs#L111)

**Function**: `calculate_hybrid_weights_with_performance`

**Purpose**: Adjusts component weights based on vulnerability scores to prioritize underperforming components

**Status**: ✅ **Complete implementation** but not exposed in API

**Evidence**:
- Fully implemented with proper bounds checking
- Has comprehensive unit tests ([hybrid.rs:279](fsfi-backend/src/fsfvi/weighting/hybrid.rs#L279))
- Zero references in handlers or public API

**Value for Government Decision-Making**:
This feature would allow governments to automatically prioritize components that are underperforming relative to benchmarks, which is valuable for resource allocation decisions.

**Recommendation**:
- Add API endpoint to expose this functionality
- Document use case for government planners
- Consider making this a configurable option in assessment requests

---

## Medium-Priority Issues

### 🟡 MEDIUM: Duplicate Sensitivity Analysis Logic

**Location**:
- [hybrid.rs:199](fsfi-backend/src/fsfvi/weighting/hybrid.rs#L199) - `analyze_weight_sensitivity`
- [hybrid.rs:215](fsfi-backend/src/fsfvi/weighting/hybrid.rs#L215) - `analyze_context_sensitivity`

**Issue**: These functions exist in the `hybrid` module but are NOT called by the actual `SensitivityAnalysisService`

**Evidence**:
The actual API handler ([handlers.rs:686](fsfi-backend/src/fsfvi_api/handlers.rs#L686)) calls `SensitivityAnalysisService.analyze_weight_sensitivity()`, which is a completely separate implementation in [sensitivity_analysis.rs:51](fsfi-backend/src/fsfvi/service/sensitivity_analysis.rs#L51).

**Implications**:
1. **Code Duplication**: Two implementations of sensitivity analysis
2. **Maintenance Risk**: If one implementation is updated, the other may diverge
3. **Confusion**: Unclear which is the "source of truth"

**Usage Analysis**:
- `hybrid.rs` functions: Only used in unit tests ([hybrid.rs:326](fsfi-backend/src/fsfvi/weighting/hybrid.rs#L326))
- `SensitivityAnalysisService` methods: Used in production API

**Recommendation**:
- **Option A**: Remove `hybrid.rs` functions if `SensitivityAnalysisService` is more comprehensive
- **Option B**: Refactor `SensitivityAnalysisService` to call `hybrid.rs` functions (DRY principle)
- **Option C**: Document that `hybrid.rs` functions are low-level utilities for specific use cases

---

## Low-Priority Items

### 🟢 LOW: Unnecessary Field Storage

**Location**: [network.rs:15](fsfi-backend/src/fsfvi/weighting/network.rs#L15)

**Field**: `component_registry` in `NetworkCentralityAnalyzer`

```rust
pub struct NetworkCentralityAnalyzer {
    component_registry: ComponentRegistry,  // Only used in new()
    dependency_matrix: Vec<Vec<f64>>,
    component_names: Vec<String>,
}
```

**Issue**: The registry is only used during initialization to extract the matrix and names, then never accessed again

**Impact**: Minor memory waste (6 component metadata objects)

**Recommendation**: Remove field, extract what you need in `new()` and don't store the registry

---

### 🟢 LOW: Alternative Centrality Algorithm

**Location**: [network.rs:239](fsfi-backend/src/fsfvi/weighting/network.rs#L239)

**Function**: `calculate_eigenvector_centrality`

**Status**: Complete implementation with tests ([network.rs:350](fsfi-backend/src/fsfvi/weighting/network.rs#L350))

**Purpose**: Alternative to PageRank for network centrality analysis

**Comparison**:
- **PageRank**: Models importance via random walk through dependency network
- **Eigenvector Centrality**: Components connected to important components are themselves important

**Current Usage**: Only called in tests

**Recommendation for Critical Government Systems**:
- **KEEP** - Having alternative algorithms for cross-validation is good practice
- Document as validation method: Compare PageRank vs Eigenvector results
- If results diverge significantly, it indicates sensitivity to algorithm choice
- For high-stakes decisions, running both algorithms provides confidence bounds

---

### 🟢 LOW: Utility Method

**Location**: [models.rs:332](fsfi-backend/src/fsfvi/weighting/models.rs#L332)

**Function**: `ScenarioWeights::get_scenarios()`

**Status**: Simple utility returning scenario names

**Usage**: Used in tests

**Recommendation**: Keep for API completeness (harmless)

---

## Summary of Actions Required

| Issue | Severity | Action | Timeline |
|-------|----------|--------|----------|
| `relationships` never populated | 🔴 **CRITICAL** | Audit with domain experts; implement or document | Immediate |
| `dependencies` never populated | 🔴 **CRITICAL** | Same as above (part of dependency system) | Immediate |
| `calculate_hybrid_weights_with_performance` unused | 🟡 HIGH | Integrate into API or document why not needed | Short-term |
| Duplicate sensitivity analysis | 🟡 MEDIUM | Consolidate or document separation | Short-term |
| `component_registry` field waste | 🟢 LOW | Remove unnecessary field | Nice-to-have |
| `calculate_eigenvector_centrality` unused | 🟢 LOW | Document as validation alternative | Nice-to-have |
| `get_scenarios()` unused | 🟢 LOW | Keep (no action needed) | N/A |

---

## Recommendations for Government Use

### Do NOT Suppress Warnings

**Do not** add `#[allow(dead_code)]` to silence these warnings. They are highlighting potentially incomplete system logic.

### Audit Dependency Cascade Logic

The **relationships** field strongly suggests the original design intended component-specific cascade weights. For a government food security system:

1. **Schedule expert review**: Do generic category weights (e.g., "economic→social = 0.7") adequately model food system cascades?
2. **Test with real scenarios**: Does the model correctly predict how droughts, pandemics, and financial crises propagate through the system?
3. **Compare with historical data**: If available, validate cascade predictions against past food security crises

### Consider Implementing Performance-Adjusted Weighting

The `calculate_hybrid_weights_with_performance` feature is complete and tested. It could help governments:
- Automatically prioritize underperforming food system components
- Allocate resources based on both structural importance and current performance
- Adjust strategies as component vulnerabilities change over time

### Use Eigenvector Centrality for Validation

For critical government decisions, run both PageRank and Eigenvector centrality:
- If results are similar → confidence in network-based weights
- If results diverge → indicates sensitivity to algorithm choice, requiring deeper analysis

---

## Technical Debt Assessment

**Overall Code Quality**: Good
- Well-structured modules
- Comprehensive testing
- Good documentation

**Critical Gap**: Dependency relationship modeling appears incomplete

**Recommendation**: Address the `relationships` field issue before deploying for high-stakes government decision-making. The system may be relying on oversimplified cascade assumptions.

---

## Next Steps

1. ✅ **Immediate**: Review this analysis with food security domain experts
2. ✅ **Week 1**: Audit whether generic category dependency weights are scientifically valid
3. ✅ **Week 2**: Either implement component-specific relationships or document why categories are sufficient
4. ✅ **Week 3**: Decide whether to integrate performance-adjusted weighting feature
5. ✅ **Week 4**: Consolidate or document sensitivity analysis approach

---

## Appendix: Code Location Reference

All file paths are relative to `fsfi-backend/src/fsfvi/`:

- **models.rs**: Component metadata and registry ([view](fsfi-backend/src/fsfvi/weighting/models.rs))
- **hybrid.rs**: Hybrid weighting system ([view](fsfi-backend/src/fsfvi/weighting/hybrid.rs))
- **network.rs**: Network centrality analysis ([view](fsfi-backend/src/fsfvi/weighting/network.rs))
- **sensitivity_analysis.rs**: Production sensitivity service ([view](fsfi-backend/src/fsfvi/service/sensitivity_analysis.rs))
- **handlers.rs**: API request handlers ([view](fsfi-backend/src/fsfvi_api/handlers.rs))
