# Cumulative Stress Extension for the FSFSI

**Technical Note — Rwanda Food System Financial Intelligence Platform**

---

## 1. The Problem

The FSFSI (Food System Financing Stress Index) as defined in the IFPRI technical paper (Ulimwengu, 2026) computes a **point-in-time snapshot** each year:

```
FSFSI(t) = Σᵢ ωᵢ · δᵢ(t) · e^(-αᵢ · fᵢ(t))
```

Each year is computed independently. Last year's stress doesn't carry forward. This creates a critical problem for a national decision-making tool:

**If Rwanda underfunds nutrition for 5 years then doubles the budget in Year 6, the model shows immediate recovery.** In reality:
- Stunted children don't un-stunt
- Degraded soil takes years to restore
- Lost research capacity takes a decade to rebuild
- Cold chain infrastructure takes 3-5 years to construct

A policymaker seeing only the point-in-time FSFSI might conclude "we're improving" when the system is actually carrying years of unresolved structural damage.

### Concrete Example from Rwanda Data

| Fiscal Year | Budget (bn LCU) | Point-in-time FSFSI |
|---|---|---|
| FY2023 | 1,144 | 0.5417 |
| FY2024 | 2,240 | 0.4491 |

The budget nearly doubled and the FSFSI dropped 17%. A minister would celebrate. But the reality is that 6 years of accumulated damage (FY2018-2023) hasn't healed — it's just that this year's funding is temporarily adequate.

---

## 2. The Solution: Asymmetric Exponential Moving Average

We implemented a **cumulative stress model** that sits on top of the existing FSFSI engine. The key insight: **damage accumulates quickly, but recovery is slow.**

### 2.1 The Formula

For each indicator `i` at time `t`:

```
CS_i(t) = CS_i(t-1) + ρ · (v_i(t) - CS_i(t-1))
```

Where:
- `v_i(t)` = current year point-in-time stress (from the Rust FSFSI engine)
- `CS_i(t-1)` = previous year's cumulative stress
- `ρ = ρ_up` if `v_i(t) > CS_i(t-1)` — stress is **worsening** (damage absorbed quickly)
- `ρ = ρ_down` if `v_i(t) ≤ CS_i(t-1)` — stress is **improving** (recovery is slow)

The asymmetry (`ρ_up > ρ_down`) encodes the empirical observation that food systems degrade faster than they recover.

For the first year (no history): `CS_i(0) = v_i(0)` (bootstrap from current stress).

### 2.2 System-Level Aggregation

```
Cumulative FSFSI(t) = FSFSI(t) × (Σ CS_i / Σ v_i)
```

The system-level cumulative FSFSI is derived by scaling the Rust engine's authoritative point-in-time FSFSI by the ratio of cumulative to current stress across all indicators. This preserves the Rust engine as the single source of truth for the base computation while adding the temporal persistence layer.

### 2.3 Component-Specific Persistence Parameters

Different sectors have different recovery dynamics. The persistence parameters are grounded in empirical observations about Rwanda's food system:

| Component | ρ_up (damage speed) | ρ_down (recovery speed) | Rationale |
|---|---|---|---|
| **Markets** | 0.50 | 0.20 | Price shocks propagate fast; recovery depends on supply normalization |
| **Crop Production** | 0.35 | 0.12 | Crop failures hit in one season; soil/seed recovery takes multiple cycles |
| **Nutrition** | 0.30 | 0.10 | Malnutrition damage is fast; stunting in children is largely irreversible |
| **Research** | 0.20 | 0.08 | Institutional degradation is gradual; rebuilding research capacity takes years |
| **Post-Harvest** | 0.40 | 0.15 | Infrastructure damage is fast; rebuilding storage/logistics is moderate |
| **Environment** | 0.25 | 0.06 | Damage is cumulative; ecosystem recovery is the slowest of all sectors |
| **Animal Systems** | 0.35 | 0.12 | Disease/herd loss is rapid; restocking takes multiple breeding cycles |
| **Finance** | 0.45 | 0.25 | Financial stress propagates quickly; recovery is relatively fast with policy |

These parameters are stored in a `ComponentPersistenceConfig` database table and can be tuned by domain experts through the admin interface without code changes.

### 2.4 Properties of the Model

1. **Bounded [0, 1]** — cumulative stress never exceeds the theoretical maximum
2. **Reduces to current model** when `ρ_up = ρ_down = 1.0` (no memory)
3. **Computed at indicator level** (33 indicators) — preserves granularity
4. **Aggregated to component and system level** — for dashboard display
5. **Sequential dependency** — year T depends on year T-1, so assessments must be run in chronological order

---

## 3. Architecture

### 3.1 Single Source of Truth

```
Excel Parameters (IFPRI)
  ↓ benchmarks, observed, alpha_per_bnLCU
  ↓
Indicator Database (Django)
  ↓ weighted_lcu_bn, observed_value, benchmark_value, sensitivity_parameter
  ↓
Assessment Engine (Rust via PyO3)
  ↓ FSFSI score — authoritative point-in-time computation
  ↓
Cumulative Stress Layer (Python/Django)
  ↓ applies asymmetric EMA at indicator level, scales to system level
  ↓
AssessmentResult + ComponentResult + IndicatorResult (Django models)
  ↓ stores both current and cumulative stress
  ↓
Optimization / Planning APIs
  ↓ consumes assessment results — never re-derives FSFSI
  ↓
Dashboard (Next.js frontend)
```

### 3.2 Key Design Decisions

**Assessment engine (Rust) is never modified for cumulative stress.** The Rust engine computes point-in-time FSFSI exactly as the paper defines. The cumulative layer is a Python post-processing step that runs after each assessment. This ensures:
- The paper's methodology is preserved exactly
- The cumulative extension can be tuned or disabled without affecting the core engine
- Both current and cumulative scores are always available

**Optimization uses the assessment's FSFSI, not its own re-computation.** The optimization and planning APIs accept an `assessment_id` and load the stored scores. They never re-derive the FSFSI from component inputs. This eliminates the category of bugs where different engines produce different scores for the same data.

**Strategic planning uses cumulative stress as baseline.** When projecting recovery trajectories, the planning engine starts from the cumulative FSFSI (the real damage state) and simulates forward using the asymmetric EMA. This gives realistic recovery timelines that account for institutional inertia.

### 3.3 Data Flow for Cumulative Computation

```python
def _compute_cumulative_stress(assessment):
    # 1. Load previous year's indicator-level cumulative stresses
    prev = find_most_recent_assessment_with_cumulative()

    # 2. For each of the 33 indicators:
    for indicator in assessment.indicator_results:
        v = indicator.stress_value                    # current (from Rust)
        cs_prev = prev[indicator.code] or v           # previous cumulative (or bootstrap)
        rho = rho_up if v > cs_prev else rho_down     # asymmetric
        cs_new = cs_prev + rho * (v - cs_prev)        # EMA step
        indicator.cumulative_stress = cs_new

    # 3. Scale system FSFSI by the cumulative/current ratio
    ratio = sum(cs_new for all) / sum(v for all)
    cumulative_fsfsi = fsfsi_score * ratio             # preserves Rust's weighting
```

---

## 4. What We Fixed Along the Way

### 4.1 Sensitivity Parameter Mismatch

**Problem:** The Excel provides `alpha_per_bnLCU` (e.g., 0.035 for crop production) calibrated for allocations in billions of LCU. The Rust engine had hardcoded defaults (e.g., 0.0015) calibrated for millions of USD — a 23x difference.

**Fix:** Added `sensitivity_parameter` field to the Rust `IndicatorInput` struct. The Python service layer now passes the Excel's alpha to the Rust engine. When provided, it overrides the hardcoded default.

### 4.2 Currency Unit Consistency

**Problem:** The system mixed USD and LCU units across the Rust engine, Python backend, and frontend. Field names like `financial_allocation_usd` were misleading when the data was actually in LCU.

**Fix:** Renamed all `_usd` fields to `_lcu` across Rust structs, Python serializers, TypeScript types, and React components. All monetary values are now consistently in Rwandan Francs (LCU), stored as billions in the database.

### 4.3 Zero-Stress Fallback

**Problem:** When observed data was missing, the system imputed `observed = benchmark`, giving gap = 0 and stress = 0. This made data-poor components (Finance, Post-Harvest) appear perfectly healthy — dangerous for a policy tool.

**Fix:** Missing observed values are now imputed at 50% of benchmark (for higher-is-better indicators) or 150% (for lower-is-better). This gives a moderate gap (~0.33) that signals "we don't know the exact situation, but we shouldn't assume it's perfect."

### 4.4 Inconsistent Stress Classification

**Problem:** The overall FSFSI used tight thresholds (0.05/0.15/0.30) from the Rust config, while component priority levels used a different composite formula with wider thresholds (0.25/0.40/0.60). A component showing stress of 0.45 could be classified as "low" while the system score of 0.15 was "high."

**Fix:** Component `priority_level` is now classified using the same thresholds as the system FSFSI, applied to the value actually displayed on the dashboard (`average_performance_gap`).

### 4.5 Optimization/Planning Score Mismatch

**Problem:** The optimization and planning engines re-derived FSFSI internally from 8 aggregated components, producing different scores than the indicator-level assessment (33 indicators). The optimization page showed "Current FSFSI: 0.5008" while the assessment showed 0.7011 for the same year.

**Fix:** Optimization and planning APIs now accept `assessment_id`, load the stored assessment, and stamp the assessment's authoritative FSFSI as the "current" score. The Rust optimizer still computes allocation recommendations, but the headline numbers come from the assessment.

---

## 5. Results

### 5.1 Cumulative Stress Trajectory (Rwanda FY2018-2024)

| Year | Current FSFSI | Cumulative FSFSI | Damage Lag |
|---|---|---|---|
| FY2018 | 0.4918 | 0.4918 | 0.000 (bootstrap) |
| FY2019 | 0.4965 | 0.5021 | +0.006 |
| FY2020 | 0.5031 | 0.5377 | +0.035 |
| FY2021 | 0.5157 | 0.5616 | +0.046 |
| FY2022 | 0.5274 | 0.5908 | +0.063 |
| FY2023 | 0.5417 | 0.6060 | +0.064 |
| FY2024 | 0.4491 | 0.7241 | **+0.275** |

**FY2024 tells the whole story:** The current FSFSI dropped to 0.4491 (budget doubled), but the cumulative FSFSI is 0.7241 — the highest ever. The +0.275 damage lag represents 6 years of accumulated underinvestment that hasn't recovered despite the budget increase.

### 5.2 Component-Level Cumulative Stress (FY2024)

| Component | Current Stress | Cumulative Stress | Lag | Recovery Rate |
|---|---|---|---|---|
| Finance | 0.717 | 0.685 | -0.03 | Fast (ρ↓=0.25) |
| Nutrition | 0.603 | 0.612 | +0.01 | Very slow (ρ↓=0.10) |
| Post-Harvest | 0.588 | 0.550 | -0.04 | Moderate (ρ↓=0.15) |
| Animal Systems | 0.471 | 0.576 | +0.10 | Slow (ρ↓=0.12) |
| Crop Production | 0.468 | 0.639 | +0.17 | Slow (ρ↓=0.12) |
| Markets | 0.435 | 0.387 | -0.05 | Moderate (ρ↓=0.20) |
| Research | 0.419 | 0.471 | +0.05 | Very slow (ρ↓=0.08) |
| Environment | 0.342 | 0.504 | +0.16 | Slowest (ρ↓=0.06) |

**Crop Production and Environment carry the deepest damage** — their cumulative stress is 17% and 16% above current levels. These sectors have slow recovery rates, meaning even with increased funding, it takes years to reverse the accumulated damage.

**Finance and Markets show slight recovery** — these sectors respond faster to policy changes (higher ρ_down), so the improved FY2024 budget is already having an effect.

### 5.3 Strategic Planning with Cumulative Baseline

With the cumulative model driving strategic planning:

**Scenario: 40% stress reduction over 5 years (PSTA-5), 8% annual budget growth**

| Year | Projected | Target | Budget (bn) | On Track |
|---|---|---|---|---|
| Baseline | 0.7241 | — | 2,240 | — |
| Year 1 | 0.6521 | 0.6662 | 2,419 | Yes |
| Year 2 | 0.5862 | 0.6083 | 2,612 | Yes |
| Year 3 | 0.5259 | 0.5503 | 2,821 | Yes |
| Year 4 | 0.4707 | 0.4924 | 3,047 | Yes |
| Year 5 | 0.4202 | 0.4345 | 3,291 | Yes |

The plan is feasible but requires **sustained commitment** — 8% annual budget growth for 5 consecutive years, totaling RWF 1.1T in additional investment. A single year of budget cuts would set recovery back 2-3 years due to damage persistence.

---

## 6. What the Dashboard Now Shows

### National Overview
- **Headline FSFSI:** cumulative (0.5529), not the misleading current snapshot (0.4491)
- **Component cards:** cumulative stress with "This year: X.XX" as subtitle
- **Trend chart:** two lines — blue (current) and red dashed (cumulative) with policy explanation

### FSFI Assessment
- Current stress per component with classification aligned to system thresholds
- Component sensitivities from the calibrated Excel (not hardcoded defaults)

### Budget Optimization
- Uses assessment's authoritative FSFSI (not re-derived)
- Allocation recommendations in RWF (not USD)
- Efficiency index from the assessment's own optimal allocation computation

### Strategic Planning
- **Baseline is cumulative FSFSI** (0.7241) — the real starting point
- Parameters in policy language: "40% stress reduction" not "target FSFSI 0.4345"
- Planning horizon aligned to Rwanda cycles (PSTA-5, NST-2, Vision 2035)
- Budget growth in % (8%) not decimal (0.08), with Rwanda context
- Data-driven expected outcomes, implementation risks, and success factors
- Trajectory accounts for slow cumulative recovery (asymmetric EMA forward projection)

### MTEF (3-Year)
- Baseline from cumulative FSFSI
- Projected values through cumulative EMA simulation
- Budgets in real LCU

---

## 7. Limitations and Future Work

### Current Limitations

1. **Persistence parameters are expert estimates** — the ρ_up and ρ_down values are based on sectoral knowledge, not econometric estimation. Future work should calibrate these from Rwanda's historical expenditure-outcome data.

2. **Component-level aggregation** — the optimization and planning engines work with 8 aggregated components, not 33 indicators. The alpha calibration at component level uses per-indicator averages, which is an approximation.

3. **Linear year targets** — the planning trajectory uses linear interpolation for yearly milestones. In practice, recovery may follow an S-curve (slow start, acceleration, plateau).

4. **No shock modeling in cumulative** — the cumulative model doesn't account for exogenous shocks (climate, pandemic) that could spike stress in a single year. The Rust engine supports shock scenarios, but these aren't yet integrated with the cumulative layer.

5. **Re-running middle years** — if you re-run FY2021 only, FY2022-2024 still reference their original prior-year cumulative values. A cascade recalculation mechanism is needed.

### Proposed Extensions

1. **Econometric calibration of ρ** — use Rwanda's historical data (FY2018-2024) to estimate component-specific persistence rates through panel regression.

2. **Shock integration** — when a shock scenario is selected, temporarily increase ρ_up for affected components (e.g., climate shock → crop_production ρ_up = 0.90).

3. **Provincial cumulative stress** — extend the model to district/province level once subnational data is available.

4. **Confidence intervals** — add uncertainty bands to the planning trajectory based on historical variance in budget execution and outcome delivery.

---

## 8. Database Schema (New Tables and Fields)

### New Model: `ComponentPersistenceConfig`
```
component_persistence_config
├── component (CharField, unique, choices=IndicatorComponent)
├── rho_up (DecimalField, default=0.40)
└── rho_down (DecimalField, default=0.15)
```

### New Fields on `AssessmentResult`
```
assessment_results
├── cumulative_fsfsi (DecimalField, nullable)
└── cumulative_stress_level (CharField, nullable)
```

### New Fields on `ComponentResult`
```
component_results
├── cumulative_stress (DecimalField, nullable)
└── cumulative_weighted_stress (DecimalField, nullable)
```

### New Fields on `IndicatorResult`
```
indicator_results
└── cumulative_stress (DecimalField, nullable)
```

### New Fields on `AssessmentHistory`
```
assessment_history
├── cumulative_fsfsi (DecimalField, nullable)
└── cumulative_component_scores (JSONField)
```

All fields are nullable for backward compatibility. Existing assessments without cumulative data continue to work — the dashboard falls back to current stress when cumulative is not available.
