# CRITICAL BUG: MTEF Budget Conservation Violation

**Date Identified**: 2025-12-23
**Severity**: CRITICAL
**Impact**: Government MTEF submissions show inflated resource needs
**Status**: IDENTIFIED - FIX REQUIRED

## Problem Summary

The MTEF generation algorithm in `fsfi-backend/src/fsfvi/service/strategic_planning.rs` violates budget conservation constraints, causing component allocations to exceed the stated budget for each year.

## Evidence from Integration Tests

Integration test output (`demo_gov_backend/tests/strategic_planning_integration_tests.rs`):

```
Year 1: Perfect conservation
- Total Budget: $1260M
- Component Allocations Sum: $1260M
- Error: 0% ✓

Year 2: Budget violation
- Total Budget: $1323M
- Component Allocations Sum: $1389M
- Error: +5.0% ❌

Year 3: CRITICAL budget violation
- Total Budget: $1389M
- Component Allocations Sum: $1608M
- Error: +15.76% ❌ UNACCEPTABLE
```

## Root Cause Analysis

### Location
`fsfi-backend/src/fsfvi/service/strategic_planning.rs`, lines 217-253

### The Bug

```rust
for year in 1..=3 {
    let year_budget = baseline_budget * (1.0 + yearly_budget_growth_rate).powi(year as i32);
    let year_target = baseline_fsfvi - ((baseline_fsfvi - target_fsfvi) * (year as f64 / 3.0));

    // BUG STEP 1: Scale up budgets
    let budget_scale = year_budget / baseline_budget;
    for comp in current_state.iter_mut() {
        comp.financial_allocation *= budget_scale;  // ❌ Modifies current_state
    }

    // STEP 2: Optimize
    let optimized = self.optimization_service.optimize_allocation(
        current_state.clone(),
        OptimizationObjective::MinimizeFsfvi,
        // ...
    )?;

    // BUG STEP 3: Update state for next year with optimized allocations
    for comp in current_state.iter_mut() {
        if let Some(&new_alloc) = optimized.optimal_allocations.get(&comp.component_type) {
            comp.financial_allocation = new_alloc;  // ❌ Stores optimized values
        }
    }

    // BUG: Next iteration (Year 2) will scale these OPTIMIZED allocations again!
}
```

### Why This Causes Compounding

**Year 1**:
- Baseline: $1200M
- Scale factor: 1260/1200 = 1.05
- After scaling: $1260M
- After optimization: $1260M ✓
- `current_state` now contains optimized allocations

**Year 2**:
- Should be: $1323M (baseline * 1.05²)
- **BUG**: Scales Year 1's optimized allocations ($1260M) by 1.05² = 1.1025
- After scaling: $1260M * 1.1025 = $1389M (already over budget!)
- After optimization: $1389M (optimizer works with these inflated values)
- Error: +5%

**Year 3**:
- Should be: $1389M (baseline * 1.05³)
- **BUG**: Scales Year 2's inflated allocations ($1389M) by 1.05³ = 1.1576
- After scaling: $1200M * 1.1576 = $1608M
- Error: +15.76% ❌ CRITICAL

## Impact Assessment

### Government Accountability
1. **Ministry of Finance**: MTEF shows inflated budgets, undermining fiscal credibility
2. **Parliament**: Budget requests appear unrealistic, damaging trust
3. **Donors**: Resource requirements overstated, reducing donor confidence
4. **Public**: Government appears fiscally irresponsible

### Real-World Consequences
- MTEF submissions rejected by MoF
- Donor funding commitments reduced
- Political embarrassment for government officials
- Undermined confidence in FSFVI system

## Required Fix

### Strategy
**DO NOT** modify `current_state` with scaled budgets. Instead:
1. Calculate the correct budget for each year
2. Create a **fresh copy** of baseline components for each year
3. Scale the fresh copy to the year's budget
4. Optimize the scaled copy
5. Use optimization results ONLY for the MTEF plan (not for next iteration)

### Implementation

```rust
pub fn generate_mtef(
    &self,
    current_components: Vec<Component>,
    target_fsfvi_improvement_percent: f64,
    yearly_budget_growth_rate: f64,
) -> FsfviResult<MtefPlan> {
    // Calculate baseline
    let baseline = self.assessment_service.assess_food_system(AssessmentRequest {
        components: current_components.clone(),
        // ...
    })?;

    let baseline_fsfvi = baseline.system_result.fsfvi_value;
    let target_fsfvi = baseline_fsfvi * (1.0 - target_fsfvi_improvement_percent / 100.0);
    let baseline_budget: f64 = current_components.iter().map(|c| c.financial_allocation).sum();

    let mut year_plans = Vec::new();

    // FIX: Keep baseline_components immutable
    let baseline_components = current_components.clone();

    for year in 1..=3 {
        let year_budget = baseline_budget * (1.0 + yearly_budget_growth_rate).powi(year as i32);
        let year_target = baseline_fsfvi - ((baseline_fsfvi - target_fsfvi) * (year as f64 / 3.0));

        // FIX: Create fresh scaled copy for THIS year only
        let mut year_components = baseline_components.clone();
        let budget_scale = year_budget / baseline_budget;
        for comp in year_components.iter_mut() {
            comp.financial_allocation *= budget_scale;
        }

        // Optimize with year-specific scaled components
        let optimized = self.optimization_service.optimize_allocation(
            year_components.clone(),
            OptimizationObjective::MinimizeFsfvi,
            OptimizationConstraints {
                min_allocation_per_component: 0.0,
                max_change_percent: Some(25.0),
                implementation_months: 12,
            },
        )?;

        // CRITICAL FIX: Normalize allocations to exact budget
        let optimized_total: f64 = optimized.optimal_allocations.values().sum();
        let normalization_factor = year_budget / optimized_total;

        let mut normalized_allocations = HashMap::new();
        for (comp_type, alloc) in optimized.optimal_allocations {
            normalized_allocations.insert(comp_type, alloc * normalization_factor);
        }

        // Verify budget conservation
        let final_total: f64 = normalized_allocations.values().sum();
        let conservation_error = ((final_total - year_budget) / year_budget).abs();
        assert!(
            conservation_error < 0.0001, // 0.01% tolerance
            "Budget conservation violated: Year {}, Expected: {}, Got: {}, Error: {:.4}%",
            year, year_budget, final_total, conservation_error * 100.0
        );

        year_plans.push(MtefYearPlan {
            year,
            total_budget: year_budget,
            target_fsfvi: year_target,
            projected_fsfvi: optimized.optimized_fsfvi,
            component_allocations: normalized_allocations,
            key_interventions: self.identify_key_interventions(&year_components, year),
        });
    }

    Ok(MtefPlan {
        baseline_year: 0,
        baseline_fsfvi,
        target_fsfvi_year_3: target_fsfvi,
        baseline_budget,
        year_1_plan: year_plans[0].clone(),
        year_2_plan: year_plans[1].clone(),
        year_3_plan: year_plans[2].clone(),
        fiscal_implications: self.generate_fiscal_implications(&year_plans, baseline_budget),
    })
}
```

## Verification

After fix, integration tests should show:

```
Year 1: $1260M budget, $1260M allocations (0% error) ✓
Year 2: $1323M budget, $1323M allocations (0% error) ✓
Year 3: $1389M budget, $1389M allocations (0% error) ✓
```

## Testing Plan

1. **Unit Tests**: Add budget conservation assertions to backend
2. **Integration Tests**: Verify all 3 MTEF tests pass
3. **Regression Tests**: Ensure multi-year planning still works
4. **Manual Testing**: Generate MTEF for real government data

## Priority

**BLOCKER** - This bug MUST be fixed before ANY government uses MTEF functionality.

---

**Assigned To**: Backend Team
**Estimated Fix Time**: 30 minutes
**Testing Time**: 1 hour
**Total**: 1.5 hours to production
