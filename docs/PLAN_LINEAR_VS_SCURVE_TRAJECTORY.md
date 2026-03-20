# Plan: Resolve Linear vs S-Curve Yearly Targets

## Honest assessment

**Current state**
- The Python planning layer stamps **linear** yearly targets: `year_target = baseline - (total_reduction * year / N)`. Same reduction each year.
- The **projected trajectory** (blue line) already follows a natural curve because the cumulative EMA dampens early recovery. What's linear is only the **year milestones** (dashed target line).
- The Rust engine computes allocation trajectories but its year targets are overridden by Python (since we scale to cumulative FSFSI range).

**Why it matters**
- In practice, recovery follows an **S-curve**: slow start (setup, procurement, capacity building), acceleration (programs at scale), then plateau (diminishing returns near target).
- Linear milestones can set unrealistic expectations for early years — policymakers see "off track" in Year 1 even when progress is normal for the setup phase.
- Rwanda's PSTA-5 (2024-2029) explicitly has a "foundation phase" (years 1-2) and "scale-up phase" (years 3-5).

**Tradeoffs**
- **Keep linear only**: No code risk; limitation stays documented. Honest but year 1 "off track" signals are misleading.
- **Add curve options**: One extra parameter; default changes to smoothstep for realism. Linear kept as fallback. Small, contained change in Python only.
- **S-curve default**: Matches Rwanda planning practice and cumulative recovery dynamics. Recommended.

**Recommendation**
- Add a `yearly_target_curve` parameter with three options:
  - `"linear"`: current behavior (equal reduction each year)
  - `"smoothstep"`: slow start, fast middle, slow end — matches institutional buildup reality
  - `"frontloaded"`: fast start, slow end — matches political push scenarios
- **Default**: `"smoothstep"` — most realistic for recovery planning
- Implement in **Python only** (display layer). Rust is not involved since we override targets.

---

## Curves Explained

### Linear: `progress = t`
```
Year 1: 20% | Year 2: 40% | Year 3: 60% | Year 4: 80% | Year 5: 100%
```
Equal reduction each year. Unrealistic for recovery — assumes immediate capacity.

### Smoothstep: `progress = t²(3 - 2t)`
```
Year 1:  6% | Year 2: 26% | Year 3: 50% | Year 4: 74% | Year 5: 94%
```
Slow start (capacity building), acceleration (programs at scale), gradual plateau (diminishing returns near target). Most realistic for institutional recovery.

### Frontloaded: `progress = 1 - (1-t)²`
```
Year 1: 36% | Year 2: 64% | Year 3: 84% | Year 4: 96% | Year 5: 100%
```
Aggressive early action (political mandate, donor push), then maintenance. Useful for crisis response scenarios.

### Comparison (5-year plan, baseline 0.72, target 0.43)

| Year | Linear Target | Smoothstep Target | Frontloaded Target |
|------|-------------|------------------|-------------------|
| 1 | 0.662 | 0.703 | 0.615 |
| 2 | 0.604 | 0.645 | 0.533 |
| 3 | 0.546 | 0.577 | 0.476 |
| 4 | 0.488 | 0.509 | 0.442 |
| 5 | 0.430 | 0.447 | 0.430 |

Smoothstep gives more time in year 1 (0.703 vs 0.662) — realistic for the "foundation phase".

---

## Implementation plan

### 1. Python helper (`apps/planning/services.py`)

Add a progress fraction function:

```python
def _progress_fraction(year: int, total_years: int, curve: str = "smoothstep") -> float:
    t = year / total_years
    if curve == "smoothstep":
        return t * t * (3 - 2 * t)
    elif curve == "frontloaded":
        return 1 - (1 - t) ** 2
    else:  # linear
        return t
```

Replace the current linear stamping:
```python
# Before:
year_target = round(cumulative - (cumulative - target_fsfvi) * (year_num / planning_years), 4)

# After:
progress = _progress_fraction(year_num, planning_years, yearly_target_curve)
year_target = round(cumulative - (cumulative - target_fsfvi) * progress, 4)
```

### 2. Service function signature

Update `plan_for_assessment`:
```python
def plan_for_assessment(
    assessment_id: str,
    planning_years: int = 5,
    target_fsfvi: float = 0.30,
    yearly_budget_growth_rate: float = 0.05,
    yearly_target_curve: str = "smoothstep",  # NEW
) -> dict:
```

### 3. API endpoint

Update `AssessmentMultiYearPlanView`:
```python
curve = request.query_params.get("target_curve", "smoothstep")
```

Pass through to `plan_for_assessment(..., yearly_target_curve=curve)`.

### 4. Frontend

Add a dropdown to the planning parameters:
```
Milestone curve:  [Smoothstep (realistic)] | [Linear (equal)] | [Frontloaded (aggressive)]
```

Pass as query param: `planningAPI.planForAssessment(id, years, target, growth, curve)`.

### 5. Technical note

Update CUMULATIVE_STRESS_TECHNICAL_NOTE.md limitation #3:
> ~~Linear year targets~~ **Resolved**: yearly milestones support three trajectory curves: smoothstep (default, realistic recovery pacing), linear (equal reduction), and frontloaded (aggressive early action). Smoothstep matches Rwanda's PSTA-5 phasing (foundation → scale-up → consolidation).

---

## Summary

| Layer | Change |
|---|---|
| Python | `_progress_fraction()` helper; use in year target stamping |
| API | Optional `target_curve` query param (default `"smoothstep"`) |
| Frontend | Dropdown for curve selection in planning parameters |
| Technical note | Update limitation #3 to resolved |
| Rust | No change needed — Python controls target display |

**Risks**
- Low: new parameter is optional; smoothstep default is more realistic than linear.
- No Rust rebuild required.

**Status**: Ready to implement.
