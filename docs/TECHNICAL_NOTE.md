# Rwanda FSFI — Technical Computation Note

**Food Systems Financial Intelligence (FSFI) | Technical Reference**  
*Computation Architecture, Mathematical Formulations, and Implementation Details*

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Data Model and Input Variables](#2-data-model-and-input-variables)
3. [Performance Gap Computation](#3-performance-gap-computation)
4. [Indicator-Level Financial Stress](#4-indicator-level-financial-stress)
5. [Weighting Methods](#5-weighting-methods)
6. [System-Level FSFSI Score](#6-system-level-fsfsi-score)
7. [Optimal Budget Allocation (Lagrangian Optimization)](#7-optimal-budget-allocation-lagrangian-optimization)
8. [Efficiency Index and Gap Ratio](#8-efficiency-index-and-gap-ratio)
9. [Cumulative Stress — Asymmetric EMA](#9-cumulative-stress--asymmetric-ema)
10. [Multi-Year Strategic Planning Computation](#10-multi-year-strategic-planning-computation)
11. [MTEF Projection](#11-mtef-projection)
12. [Optimization Analysis](#12-optimization-analysis)
13. [Budget Analysis Metrics](#13-budget-analysis-metrics)
14. [PSTA-5 Alignment Computation](#14-psta-5-alignment-computation)
15. [Component Sensitivity Parameters](#15-component-sensitivity-parameters)
16. [Constants, Thresholds, and Defaults](#16-constants-thresholds-and-defaults)
17. [Implementation Notes and Known Approximations](#17-implementation-notes-and-known-approximations)

---

## 1. System Architecture Overview

The computation stack has two layers:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  RUST ENGINE  (fsfi_engine / PyO3)                                       │
│  ─ Point-in-time FSFSI scoring               (core/calculations.rs)      │
│  ─ Optimal allocation via Lagrangian          (core/calculations.rs)      │
│  ─ Multi-year planning projections            (services/planning.rs)      │
│  ─ MTEF generation                            (services/planning.rs)      │
│  ─ Reallocation / ROI optimization            (services/optimization.rs)  │
│  ─ Weighting: Expert/AHP, PageRank, Hybrid    (weighting/*.rs)            │
│  ─ JWT / MFA auth                             (auth/*.rs)                 │
└──────────────────────────────────────────────────────────────────────────┘
           ↕ PyO3 FFI calls (py_* functions)
┌──────────────────────────────────────────────────────────────────────────┐
│  DJANGO LAYER  (Python)                                                   │
│  ─ Cumulative stress EMA (post-Rust)          (assessments/services.py)   │
│  ─ Hybrid weight post-processing              (assessments/services.py)   │
│  ─ Planning projection overlay                (planning/services.py)      │
│  ─ PSTA-5 budget alignment                    (planning/services.py)      │
│  ─ Budget analysis (no FSFSI)                 (budget_analysis/services.py)│
│  ─ ORM models, API serialization, auth        (all apps)                  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Critical design point:** The Rust engine computes **point-in-time FSFSI** for a given fiscal year. The **cumulative (memory-adjusted) FSFSI** — the headline dashboard metric — is computed entirely in Python after the Rust call, using an asymmetric exponential moving average over the time-ordered sequence of assessments.

---

## 2. Data Model and Input Variables

All assessments operate on **37 indicators** grouped into **8 components**. Every indicator-year record (`IndicatorData`) carries:

| Symbol | Django field | Description | Unit |
|--------|-------------|-------------|------|
| \(f_i\) | `weighted_lcu_bn` | Budget allocation (weighted for cross-cutting) | **Billions RWF** |
| \(x_i\) | `observed_value` | Rwanda's actual measured value for indicator \(i\) | Indicator-specific |
| \(\bar{x}_i\) | `benchmark_value` | Reference benchmark (World Bank global distribution or national target) | Indicator-specific |
| \(\alpha_i\) | `sensitivity_parameter` / `default_sensitivity` | Stress–investment sensitivity parameter | Per-billion-RWF |
| \(\omega_i\) | Computed by weighting method | Indicator weight in FSFSI sum | [0, 1], sums to 1 |

**Monetary unit precision:** The engine expects `f` in **billions RWF**. The sensitivity parameter `α` is calibrated as `alpha_per_bnLCU` — i.e. the stress reduction per additional billion RWF invested. Using LCU millions instead of billions (a common confusion) would change effective α by a factor of 1,000.

---

## 3. Performance Gap Computation

### 3.1 Symmetric (Rust default)

The normalized performance gap for indicator \(i\) is:

$$\delta_i = \frac{|x_i - \bar{x}_i|}{\max(x_i,\, \bar{x}_i)}$$

This gives \(\delta_i \in [0, 1]\) where:
- \(\delta_i = 0\) → Rwanda is at benchmark (no gap)
- \(\delta_i \to 1\) → Rwanda is maximally far from benchmark

### 3.2 Directional Variants (Rust assessment path)

The symmetric formula is applied for most indicators. For indicators where **direction matters** (higher-is-better vs lower-is-better), the Rust engine uses a directional clamp that ensures the gap is always non-negative and represents underperformance:

- **Higher is better** (e.g. crop yield): if \(x_i \ge \bar{x}_i\), the indicator is at or above benchmark → \(\delta_i = 0\)
- **Lower is better** (e.g. post-harvest loss %): if \(x_i \le \bar{x}_i\), \(\delta_i = 0\)

In all cases \(\delta_i\) is clamped to \([0, 1]\).

### 3.3 Missing Data Handling

When observed or benchmark values are absent, the Rust engine applies fallbacks:

| Situation | Fallback |
|-----------|----------|
| Benchmark known, observed missing | \(x_i = 0.5 \bar{x}_i\) (higher-is-better) or \(x_i = 1.5 \bar{x}_i\) (lower-is-better) |
| Neither known | \(\delta_i = \text{share\_weighted\_percent} \times 0.01\) (normalized budget share proxy) |

---

## 4. Indicator-Level Financial Stress

The stress function for indicator \(i\) is:

$$\upsilon_i(f_i) = \delta_i \cdot e^{-\alpha_i f_i}$$

**Properties:**
- When \(f_i = 0\): \(\upsilon_i = \delta_i\) — stress equals the full performance gap (no investment)
- As \(f_i \to \infty\): \(\upsilon_i \to 0\) — stress asymptotically eliminated
- The decay is **exponential**: each additional billion RWF gives diminishing marginal returns
- \(\alpha_i\) controls the curvature: high \(\alpha\) → steep initial decay → indicator is highly responsive to investment

**Marginal stress reduction** (first derivative):

$$\frac{\partial \upsilon_i}{\partial f_i} = -\alpha_i \delta_i e^{-\alpha_i f_i} = -\alpha_i \upsilon_i$$

This is the formula used by the optimization engine to compute **ROI per billion RWF invested**.

---

## 5. Weighting Methods

Weights \(\{\omega_i\}\) determine each indicator's contribution to the system FSFSI. They are computed at the **component level** first, then **split equally** among all indicators within that component, and finally renormalized to sum to 1.

### 5.1 Equal Weighting

All 8 components receive equal weight \(\omega_c = 1/8 = 0.125\). Within each component, all indicators share equally. This is the simplest baseline.

### 5.2 Expert / AHP Weighting

Analytic Hierarchy Process (AHP) pairwise comparison matrix over the 8 components. The principal eigenvector of the matrix gives component weights. Consistency ratio (CR) must satisfy:

$$CR = \frac{CI}{RI} \leq 0.1$$

where \(CI = (\lambda_{\max} - n) / (n-1)\) and \(RI\) is the random index for \(n=8\). If consistency fails, the engine falls back to equal weights and logs a warning.

### 5.3 Financial (Budget-Proportional) Weighting

Component weight is proportional to its share of total mapped budget:

$$\omega_c^{fin} = \frac{\sum_{i \in c} f_i}{\sum_{j=1}^{37} f_j}$$

This ties analytical weight to actual spending priorities.

### 5.4 Network (PageRank) Weighting

Models inter-component dependencies as a directed graph. PageRank iteration with **damping factor \(d = 0.85\)**:

$$\omega_c^{PR}(t+1) = \frac{1-d}{N} + d \sum_{c' \to c} \frac{\omega_{c'}^{PR}(t)}{\text{out-degree}(c')}$$

Converges to a stationary distribution reflecting systemic influence. Components that many other components depend on receive higher weight.

### 5.5 Hybrid (Recommended)

A fixed linear blend of four weight vectors:

$$\omega^{hybrid} = 0.35\,\omega^{exp} + 0.30\,\omega^{PR} + 0.25\,\omega^{cascade} + 0.10\,\omega^{fin}$$

Where \(\omega^{cascade}\) is a cascade/connectivity-based weight (related to downstream dependency chains). The result is renormalized to sum to 1.

**Optional performance adjustment:** In the hybrid method, component weights can be multiplied by a performance factor:

$$\omega_c^{adj} = \omega_c^{hybrid} \cdot \text{clamp}(1 + s_c,\; 0.5,\; 2.0)$$

where \(s_c\) is the component's current stress level. Higher-stress components get upweighted, shifting analytical focus to underperforming areas.

---

## 6. System-Level FSFSI Score

The overall FSFSI is the **weighted sum of all indicator stresses**:

$$\text{FSFSI} = \sum_{i=1}^{37} \omega_i \cdot \delta_i \cdot e^{-\alpha_i f_i}$$

Since weights \(\omega_i\) are assigned at component level and split equally within components, this is equivalent to:

$$\text{FSFSI} = \sum_{c=1}^{8} \omega_c \cdot \left(\frac{1}{n_c} \sum_{i \in c} \delta_i \cdot e^{-\alpha_i f_i}\right)$$

where \(n_c\) is the number of indicators in component \(c\).

**Interpretation:**
- \(\text{FSFSI} = 0\): No financial stress — all indicators at benchmark, regardless of investment
- Higher FSFSI → more financial stress → worse food system health
- The score has no hard upper bound but is effectively bounded by \(\max(\delta_i) \le 1\)

---

## 7. Optimal Budget Allocation (Lagrangian Optimization)

Given a total budget constraint \(F = \sum_i f_i\), the Rust engine minimizes FSFSI by solving:

$$\min_{\{f_i\}} \sum_{i=1}^{37} \omega_i \delta_i e^{-\alpha_i f_i} \quad \text{subject to} \quad \sum_{i=1}^{37} f_i = F,\quad f_i \ge 0$$

### 7.1 First-Order Conditions (KKT)

At the optimum, for all active constraints (\(f_i^* > 0\)):

$$\frac{\partial \mathcal{L}}{\partial f_i} = -\omega_i \delta_i \alpha_i e^{-\alpha_i f_i^*} + \lambda = 0$$

$$\Rightarrow \quad f_i^* = \frac{1}{\alpha_i} \ln\!\left(\frac{\omega_i \delta_i \alpha_i}{\lambda}\right)$$

where \(\lambda > 0\) is the Lagrange multiplier (shadow price of the budget constraint).

### 7.2 Bisection on \(\lambda\)

The multiplier \(\lambda\) is found by bisection on the budget constraint:

$$G(\lambda) = \sum_{i: f_i^*(\lambda)>0} f_i^*(\lambda) - F = 0$$

\(G(\lambda)\) is monotone decreasing in \(\lambda\), so bisection converges to machine precision in ~50 iterations.

**Edge cases:**
- If \(\omega_i \delta_i \alpha_i = 0\) for indicator \(i\): \(f_i^* = 0\) (no investment needed or no sensitivity)
- If total budget is very large (all stress near 0): allocations become proportional to \(\omega_i \delta_i \alpha_i\)

### 7.3 FSFSI at Optimal Allocation

$$\text{FSFSI}^* = \sum_i \omega_i \delta_i e^{-\alpha_i f_i^*}$$

This is the **minimum achievable FSFSI** given the current total budget and performance gap structure. It is always \(\le\) the actual FSFSI (since actual allocation is generally suboptimal).

---

## 8. Efficiency Index and Gap Ratio

$$\text{Efficiency Index} = \min\!\left(1,\; \frac{\text{FSFSI}^*}{\text{FSFSI}_{actual}}\right)$$

- Range: \([0, 1]\)
- Value of 1 → budget is already optimally allocated
- Value of 0.7 → 30% of current stress could be eliminated by reallocation alone (no new money needed)

$$\text{Gap Ratio} = \frac{\text{FSFSI}_{actual} - \text{FSFSI}^*}{\text{FSFSI}_{actual}}$$

- Equivalent to \(1 - \text{Efficiency Index}\) when the min-clamp does not bind
- Expresses the **addressable fraction** of current stress

**Note:** Both metrics use the **point-in-time FSFSI** (Rust output), not the cumulative FSFSI. They measure allocation efficiency at a given point in time.

---

## 9. Cumulative Stress — Asymmetric EMA

The cumulative stress model accounts for **memory effects** in food system dynamics: stress builds quickly (infrastructure degradation is rapid) but recovers slowly (rebuilding takes years).

### 9.1 Indicator-Level Asymmetric EMA

For each indicator \(i\), the cumulative stress \(CS_i(t)\) is updated at each new fiscal year \(t\):

$$CS_i(t) = CS_i(t-1) + \rho_i(t) \cdot \left[\upsilon_i(t) - CS_i(t-1)\right]$$

where the persistence rate \(\rho_i(t)\) is **asymmetric**:

$$\rho_i(t) = \begin{cases} \rho_{\uparrow,c(i)} & \text{if } \upsilon_i(t) > CS_i(t-1) \quad \text{(stress worsening)} \\ \rho_{\downarrow,c(i)} & \text{if } \upsilon_i(t) \le CS_i(t-1) \quad \text{(stress recovering)} \end{cases}$$

**Bootstrap condition:** If no prior assessment exists with a computed cumulative value, the initial condition is \(CS_i(t_0) = \upsilon_i(t_0)\) — the first year's cumulative equals its point-in-time stress.

**EMA interpretation:**
- \(\rho_{\uparrow}\) close to 1: new stress is immediately absorbed into cumulative → rapid deterioration
- \(\rho_{\downarrow}\) close to 0: recovery is very slow → past stress lingers

### 9.2 Persistence Rates by Component

Default values (from `ComponentPersistenceConfig.DEFAULTS`):

| Component | \(\rho_{\uparrow}\) | \(\rho_{\downarrow}\) | Interpretation |
|-----------|-------------------|-----------------------|----------------|
| markets | 0.50 | 0.20 | Market systems respond quickly; recover moderately |
| crop_production | 0.45 | 0.15 | Crop damage fast; soil recovery slow |
| nutrition | 0.40 | 0.10 | Nutritional damage fast; improving nutrition very slow |
| research | 0.35 | 0.12 | Research capacity erodes steadily; rebuilds slowly |
| post_harvest | 0.45 | 0.18 | Storage/processing damage fast; moderate recovery |
| environment | 0.25 | 0.06 | Environmental degradation slow but very persistent |
| animal_systems | 0.40 | 0.15 | Livestock losses fast; herd rebuilding slow |
| finance | 0.50 | 0.20 | Credit markets volatile; financial inclusion rebuilds moderately |
| **Default (fallback)** | **0.40** | **0.15** | Applied when component not in DB config |

### 9.3 Component Cumulative Stress

After computing \(CS_i(t)\) for all indicators in component \(c\):

$$CS_c(t) = \frac{1}{n_c} \sum_{i \in c} CS_i(t) \qquad \text{(unweighted average)}$$

The **component cumulative weighted stress** (stored for API use):

$$CS_c^{weighted}(t) = \omega_c \cdot CS_c(t)$$

### 9.4 System Cumulative FSFSI

The system-level `cumulative_fsfsi` is **not** computed as \(\sum_c \omega_c CS_c\). Instead, it scales the authoritative Rust point-in-time FSFSI by the ratio of total cumulative to total point-in-time stress:

$$\text{CumFSFSI}(t) = \text{FSFSI}_{Rust}(t) \cdot \frac{\sum_{i=1}^{37} CS_i(t)}{\sum_{i=1}^{37} \upsilon_i(t)}$$

**Rationale:** This ensures the system cumulative remains anchored to the Rust-computed weighted FSFSI while incorporating the memory effect captured by indicator-level EMAs. When \(\sum CS_i > \sum \upsilon_i\) (residual historical stress), CumFSFSI exceeds the point-in-time FSFSI — indicating that past damage has not fully resolved.

---

## 10. Multi-Year Strategic Planning Computation

### 10.1 Component Inputs for Planning

Planning operates on **component-level** aggregates rather than individual indicators. For each component \(c\) in a base assessment, the planning engine builds a synthetic single-indicator payload:

- **Observed:** \(x_c = \max(0,\; 1 - CS_c)\), where \(CS_c\) is the component's `cumulative_stress` (or `component_stress` fallback)
- **Benchmark:** \(\bar{x}_c = 1.0\)
- **Resulting gap:** \(\delta_c = |x_c - 1| / \max(x_c, 1) = CS_c\) (exactly the cumulative stress, since \(x_c < 1\))
- **Allocation:** \(f_c = (B_c / n_c) \times 10^6\) LCU, where \(B_c\) is component budget in bn RWF and \(n_c\) is indicator count — so Rust receives per-indicator average allocation in LCU millions
- **Alpha:** \(\bar{\alpha}_c\) = mean of `Indicator.default_sensitivity` for component \(c\)

This encoding allows reuse of the standard Rust stress function \(\delta e^{-\alpha f}\) on component-level summaries.

### 10.2 Target Scaling

The user sets a target cumulative FSFSI (\(\text{target}_{cum}\)). The Rust engine works in point-in-time space, so the target must be scaled:

1. One-year probe run → get `rust_baseline` (Rust FSFSI with current cumulative-encoded components)
2. Scale target: \(\text{rust\_target} = \text{target}_{cum} \times \left(\text{rust\_baseline} / \text{CumFSFSI}_{base}\right)\)
3. Rust plans toward `rust_target` over the horizon

### 10.3 Yearly Budget Trajectory

For planning year \(y\) in a \(T\)-year horizon with annual growth rate \(g\):

$$B_{total}(y) = B_{total}(0) \times (1 + g)^y$$

Component allocations at year \(y\) come from Rust optimal allocation given \(B_{total}(y)\) and updated gaps.

### 10.4 Progress Fractions (Target Curves)

The **on-track target** for year \(y\) uses one of three progress curves:

| Curve | Formula | Meaning |
|-------|---------|---------|
| **Linear** | \(p(y) = y/T\) | Equal progress each year |
| **Smooth-step** | \(p(y) = t^2(3-2t),\; t=y/T\) | S-curve, slow start and end |
| **Front-loaded** | \(p(y) = 1-(1-t)^2,\; t=y/T\) | Most progress in early years |

Year-\(y\) target FSFSI:

$$\text{target}(y) = \text{CumFSFSI}_{base} - \left(\text{CumFSFSI}_{base} - \text{target}_{cum}\right) \times p(y)$$

**On-track condition (Rust):** `projected_fsfsi ≤ target(y) + 0.02` (2pp tolerance for rounding/volatility).

### 10.5 Planning Cumulative FSFSI Overlay (Django)

After Rust returns yearly `projected_fsfvi` values, Django replaces them with a cumulative-consistent chain:

For year \(y\):

$$\text{rust\_remaining}(y) = \frac{\text{rust\_point}(y)}{\text{rust\_baseline}}$$

$$\text{point\_in\_time}(y) = \text{CumFSFSI}_{base} \times \text{rust\_remaining}(y)$$

$$\text{CumFSFSI}(y) = \text{CumFSFSI}(y-1) + \bar{\rho}_{\downarrow} \cdot \left[\text{point\_in\_time}(y) - \text{CumFSFSI}(y-1)\right]$$

where \(\bar{\rho}_{\downarrow}\) is the **mean of all component** \(\rho_{\downarrow}\) values from the DB (defaulting to 0.15).

**Logic:** The planning path represents an improving scenario (recovery), so only the downward persistence rate is applied. CumFSFSI decays toward the point-in-time projection, but with a lag determined by how slowly food systems recover.

### 10.6 Per-Component Cumulative Projection

For each component \(c\) at planning year \(y\):

$$f_c^*(y) = \frac{\text{optimal\_allocation}(y)_c}{B_{total}(y)} \times B_{total}(y) / n_c \quad \text{(per-indicator bn)}$$

$$\upsilon_c(y) = \delta_c \cdot e^{-\bar{\alpha}_c \cdot f_c^*(y)}$$

$$CS_c(y) = CS_c(y-1) + \rho_{\downarrow,c} \cdot \left[\upsilon_c(y) - CS_c(y-1)\right]$$

**Narrative thresholds** applied to component projections:
- \(CS_c(y) - \text{FSFSI}_{point}(y) > 0.10\) → "damage lag risk" warning
- YoY change \(< -0.05\) → "recovering"
- YoY change \(> +0.05\) → "worsening"
- Critical: \(CS_c > 0.30\)

---

## 11. MTEF Projection

The MTEF (Medium-Term Expenditure Framework) generates a **3-year budget commitment** aligned to Rwanda's fiscal cycle.

**Target FSFSI for MTEF:**

$$\text{FSFSI}^{MTEF}_{target} = \text{CumFSFSI}_{base} \times \left(1 - \frac{\text{improvement\%}}{100}\right)$$

**Yearly MTEF targets** (linear interpolation):

$$\text{target}(y) = \text{CumFSFSI}_{base} \times \left(1 - \frac{\text{improvement\%}}{100} \cdot \frac{y}{3}\right), \quad y \in \{1,2,3\}$$

**Per-component stress projection** (same as planning):

$$\upsilon_c^{MTEF}(y) = \delta_c \cdot e^{-\bar{\alpha}_c \cdot f_c^{*}(y)}$$

**System cumulative in MTEF loop:**

The system point-in-time for the EMA step is the **unweighted mean** of component stresses:

$$\bar{\upsilon}_{sys}(y) = \frac{1}{8} \sum_{c=1}^{8} \upsilon_c^{MTEF}(y)$$

$$\text{CumFSFSI}^{MTEF}(y) = \text{CumFSFSI}^{MTEF}(y-1) + \bar{\rho}_{\downarrow} \cdot \left[\bar{\upsilon}_{sys}(y) - \text{CumFSFSI}^{MTEF}(y-1)\right]$$

**Display value:**

$$\text{projected\_fsfvi}(y) = \text{CumFSFSI}_{base} \cdot \frac{\text{CumFSFSI}^{MTEF}(y)}{\text{CumFSFSI}^{MTEF}(y-1)}$$

> **Note:** The MTEF uses the unweighted mean for the system point-in-time term (not the weighted Rust FSFSI). This is a deliberate simplification for 3-year quick computation but will underweight components with large \(\omega_c\) relative to the full FSFSI calculation.

---

## 12. Optimization Analysis

### 12.1 Reallocation Plan

The optimization engine calls the Rust `py_generate_reallocation_plan` function, which:

1. Takes the current allocation vector \(\{f_i\}\) and total budget \(F\)
2. Solves the Lagrangian problem (Section 7) to get \(\{f_i^*\}\)
3. Returns for each component: current allocation, recommended allocation, delta, and projected stress reduction

**Important:** The Django layer encodes component aggregates using the same gap trick as planning (`observed = 1 - gap, benchmark = 1.0`) and scales allocations by `1000 × n_c` to convert from per-indicator-average billions to total component LCU before passing to Rust.

### 12.2 Marginal ROI

The marginal stress reduction per unit investment for indicator \(i\) at current allocation \(f_i\):

$$\text{MR}_i = \frac{\partial \upsilon_i}{\partial f_i}\bigg|_{f_i} = \alpha_i \delta_i e^{-\alpha_i f_i} = \alpha_i \upsilon_i(f_i)$$

**ROI per million RWF invested in component \(c\):**

$$\text{ROI}_c = \sum_{i \in c} \omega_i \cdot \alpha_i \cdot \upsilon_i \times 10^6$$

(The factor \(10^6\) converts from per-billion-RWF to per-million-RWF — so the ROI is expressed as stress reduction per 1 million RWF.)

### 12.3 Efficiency Analysis

The efficiency analysis (`py_analyze_efficiency`) returns for each component:
- **Stress at current allocation:** \(\upsilon_c(f_c)\)
- **Stress at optimal allocation:** \(\upsilon_c(f_c^*)\)
- **Stress per billion:** \(\upsilon_c / f_c\) — normalized measure of under-funding
- **Marginal return:** \(\alpha_c \upsilon_c\) — additional stress reduction per bn RWF

---

## 13. Budget Analysis Metrics

Budget analysis is **independent of the FSFSI engine**. It reads `IndicatorData.weighted_lcu_bn` directly and computes financial composition statistics.

### 13.1 Component Shares

$$s_c(t) = \frac{\sum_{i \in c} f_i(t)}{\sum_{j=1}^{37} f_j(t)} \times 100\%$$

### 13.2 Year-on-Year Growth Rate

$$g_c(t) = \frac{B_c(t) - B_c(t-1)}{B_c(t-1)} \times 100\%$$

**Volatility** (sample standard deviation of YoY growth rates over all available years):

$$\sigma_c = \sqrt{\frac{1}{n-1} \sum_{t=2}^{n} \left(g_c(t) - \bar{g}_c\right)^2}$$

Threshold: \(\sigma_c > 8\%\) triggers a volatility insight flag.

### 13.3 Compound Annual Growth Rate (CAGR)

$$\text{CAGR}_c = \left(\frac{B_c(t_n)}{B_c(t_0)}\right)^{1/n} - 1$$

where \(n = t_n - t_0\) is the number of years. Only computed when both endpoints are positive.

### 13.4 Herfindahl-Hirschman Index (HHI)

Measures budget concentration across components:

$$\text{HHI} = \sum_{c=1}^{8} \left(\frac{s_c}{100}\right)^2 \times 10{,}000$$

- \(\text{HHI} = 10{,}000\): entire budget in one component (maximum concentration)
- \(\text{HHI} = 1{,}250\): equal split across 8 components (\(100^2/8 = 1{,}250\))

**Insight trigger:** \(|\Delta\text{HHI}| > 300\) between years flags a significant composition shift.

### 13.5 Composition Drift

If a component's share changes by \(|\Delta s_c| \ge 1\) percentage point, it is flagged as a composition shift.

**Fallback dominance flag:** If a "fallback" or residual category's share rises by \(> 3\) percentage points, a structural reallocation warning is issued.

---

## 14. PSTA-5 Alignment Computation

### 14.1 Budget Mapping to Priority Areas

Each FSFSI component \(c\) maps to one or more PSTA-5 Priority Areas (PAs) with a contribution weight \(w_{c \to p}\):

$$\text{PA\_flow}(p) = \sum_{c: c \to p} B_c \cdot w_{c \to p}$$

**Mapped total:**

$$B_{mapped} = \sum_{p} \text{PA\_flow}(p)$$

**Actual PA share:**

$$s_p^{actual} = \frac{\text{PA\_flow}(p)}{B_{mapped}} \times 100\%$$

> Note: The denominator is only mapped budget (components linked to a PA). Unlinked components are excluded from the alignment computation.

**Target PA share:** \(s_p^{target} = w_p^{PSTA5} \times 100\%\) (e.g. PA1=58%, PA2=17%, PA3=24%).

### 14.2 Alignment Score

$$\text{AlignmentScore} = \max\!\left(0,\; 100 - 2 \times \frac{1}{|\mathcal{P}|}\sum_{p \in \mathcal{P}} \left|s_p^{actual} - s_p^{target}\right|\right)$$

where \(|\mathcal{P}| = 3\) (three priority areas). The factor of 2 means each percentage-point deviation costs 2 alignment points.

**Score interpretation:**
- 100: Perfect budget alignment with PSTA-5 targets
- 90: Average deviation of 5pp (e.g. +5pp on PA1, −5pp on PA2)
- 70: Average deviation of 15pp — significant misalignment
- \(\le 50\): Critically misaligned

### 14.3 Projected Indicator Improvement

For each component \(c\), the projected improvement is derived from the active strategic plan:

$$\text{Improvement}_c = \max\!\left(0,\; \frac{CS_c^{baseline} - CS_c^{final}}{CS_c^{baseline}} \times 100\right)$$

where \(CS_c^{baseline}\) is the component cumulative stress at plan creation and \(CS_c^{final}\) is the projected cumulative stress at the end of the plan horizon.

**PA-level improvement** (weighted average of component improvements):

$$\text{Improvement}_p = \frac{\sum_{c: c \to p} w_{c \to p} \cdot \text{Improvement}_c}{\sum_{c: c \to p} w_{c \to p}}$$

**KPI-level improvement** (uses KPI→component mappings):

$$\text{Improvement}_{kpi} = \sum_{c: c \to kpi} w_{c \to kpi} \cdot \text{Improvement}_c$$

**Fallback:** if no KPI→component mapping is found, the KPI's parent PA improvement is used.

**KPIs at risk:** KPIs where \(\text{Improvement}_{kpi} < 40\%\) of baseline-to-target distance are flagged.

### 14.4 Per-PA Budget Score

$$\text{BudgetScore}_p = \max\!\left(0,\; 100 - 2 \times \left|s_p^{actual} - s_p^{target}\right|\right)$$

**Overall alignment score** (weighted sum by PA budget weight):

$$\text{OverallScore} = \sum_{p \in \mathcal{P}} w_p^{PSTA5} \cdot \text{BudgetScore}_p$$

---

## 15. Component Sensitivity Parameters

The sensitivity \(\alpha_c\) (per billion RWF) represents how quickly investing in a component reduces its stress. Higher \(\alpha\) means the stress–investment relationship is steeper; lower means chronic underinvestment patterns persist.

Default base \(\alpha\) values used by the Rust sensitivity estimation layer:

| Component | Base \(\alpha\) (per bn RWF) | Interpretation |
|-----------|--------------------------|----------------|
| nutrition | 0.040 | Highest sensitivity: nutrition interventions yield fast measurable results |
| crop_production | 0.035 | High sensitivity: inputs and infrastructure yield quickly |
| markets | 0.030 | Moderate-high: market systems can improve with targeted spend |
| post_harvest | 0.028 | Moderate: storage requires capital but returns are visible |
| animal_systems | 0.025 | Moderate: livestock herd improvements take time |
| finance | 0.022 | Moderate-low: financial inclusion requires systemic change |
| research | 0.018 | Low: R&D yields materialize over years |
| environment | 0.015 | Lowest: environmental restoration is slow and capital-intensive |

**Estimation adjustments (Rust `core/sensitivity.rs`):**
- If \(\delta_c > 0.5\) (large gap): \(\alpha\) is slightly **reduced** (the indicator is structurally constrained, not just underfunded)
- If \(f_c > 100\) bn RWF (very large allocation): \(\alpha\) is slightly **increased** (additional spending at scale is more efficient)
- Final \(\alpha\) is clamped to \([\alpha_{min},\; 0.10]\)

The **authoritative** \(\alpha\) values for each indicator come from the Excel parameter sheet (`import_indicator_parameters`) and are stored in `Indicator.default_sensitivity` / `IndicatorData.sensitivity_parameter`. The base table above is a fallback.

---

## 16. Constants, Thresholds, and Defaults

### Stress Level Classification

| Level | Condition | Policy implication |
|-------|-----------|-------------------|
| Low | \(\text{FSFSI} \le 0.05\) | Well-funded; monitor |
| Medium | \(0.05 < \text{FSFSI} \le 0.15\) | Targeted investment advised |
| High | \(0.15 < \text{FSFSI} \le 0.30\) | Reallocation intervention needed |
| Critical | \(\text{FSFSI} > 0.30\) | Urgent action; systemic risk |

### Weighting Blend (Hybrid)

| Component | Weight |
|-----------|--------|
| Expert (AHP) | 35% |
| PageRank (network) | 30% |
| Cascade (connectivity) | 25% |
| Financial (budget) | 10% |

### Planning Engine

| Parameter | Value | Description |
|-----------|-------|-------------|
| On-track tolerance | ±0.02 FSFSI | Yearly on-track check tolerance |
| Damage lag threshold | 0.10 | If \(CS - \text{point} > 0.10\), "damage lag risk" |
| Critical stress threshold | 0.30 | Component flagged as critical |
| Share match tolerance | 0.5 pp | For simulation plan matching |
| Total budget match tolerance | 0.05% | Relative tolerance for plan match |

### Budget Analysis

| Parameter | Value |
|-----------|-------|
| Minimum fiscal year | 2018 |
| Volatility flag threshold | σ > 8% YoY std dev |
| Composition drift threshold | ΔShare ≥ 1 pp |
| HHI shift threshold | ΔHHI > 300 |
| Fallback share rise threshold | Δ > 3 pp |

### PSTA-5

| Priority Area | Budget Target | Code |
|---------------|--------------|------|
| Modernization of Agriculture | 58% | PA1 |
| Inclusive Markets & Post-Harvest | 17% | PA2 |
| Systems Enablers | 24% | PA3 |
| KPI-at-risk threshold | <40% improvement | — |

### AHP / PageRank

| Parameter | Value |
|-----------|-------|
| AHP consistency ratio threshold | ≤ 0.10 |
| PageRank damping factor | 0.85 |
| Performance adjustment clamp | [0.5, 2.0] |

---

## 17. Implementation Notes and Known Approximations

### 17.1 Two Distinct Cumulative FSFSI Definitions

The code contains two related but distinct cumulative computations:

1. **Indicator/component level** (`_compute_cumulative_stress`): True asymmetric EMA per indicator, then averaged to component level.
2. **System level** (`cumulative_fsfsi` on `AssessmentResult`): A **scaled Rust FSFSI**, not \(\sum \omega_c CS_c\). The ratio \(\sum CS_i / \sum \upsilon_i\) scales the Rust-weighted FSFSI by the aggregate memory effect.

Consequence: the system `cumulative_fsfsi` is anchored to Rust weights but modulated by the Python EMA. In the degenerate case where \(CS_i = \upsilon_i\) for all \(i\) (first year), both definitions agree.

### 17.2 Planning vs. Assessment Gap Encoding

In assessment, the Rust engine uses **actual observed and benchmark values** with the directional gap formula. In planning and optimization, Django encodes component-level aggregates as `observed = 1 - CS_c, benchmark = 1.0` so the **symmetric** Rust gap exactly equals \(CS_c\). This is deliberate: the planning engine uses cumulative stress (not raw observed data) as the starting point for forward projections.

### 17.3 MTEF System Stress Approximation

The MTEF loop uses the **unweighted mean** of component stresses as its system point-in-time term, not the Rust-weighted FSFSI. This means the MTEF CumFSFSI may differ from what the full Rust engine would compute if run at each MTEF year. The divergence is small when component weights are close to equal (1/8 each) but can be non-trivial under expert or network weighting.

### 17.4 Per-Indicator Average Allocation in Planning/Optimization

When building Rust payloads for planning or optimization, the component budget \(B_c\) is divided by the number of indicators \(n_c\) to create a per-indicator-average allocation. This treats all indicators within a component as equally funded. In reality, the original assessment uses actual per-indicator allocations from `IndicatorData.weighted_lcu_bn`. The per-component averaging introduces a mild approximation: indicators that are individually over/under-funded within a component appear equally funded in planning projections.

### 17.5 Missing `CUMULATIVE_STRESS_TECHNICAL_NOTE.md`

The pipeline guide references a `CUMULATIVE_STRESS_TECHNICAL_NOTE.md` file. This file is **not present** in the repository. The complete specification for the cumulative stress model is the combination of:
- `assessments/services.py` (`_compute_cumulative_stress`)
- `assessments/models.py` (`ComponentPersistenceConfig.DEFAULTS` and docstrings)
- `planning/services.py` (`_system_cumulative_ema_from_rust_relative`, per-component EMA loops)
- This technical note (Section 9)

### 17.6 Rust FSFSI vs. Django Cumulative FSFSI — Which to Use

| Use case | Recommended metric |
|----------|-------------------|
| Single-year academic research | `overall_fsfsi` (Rust point-in-time) |
| Policy dashboard headline | `cumulative_fsfsi` (Django EMA-adjusted) |
| Optimal allocation / ROI calculation | `overall_fsfsi` + `fsfsi_optimal` |
| Year-on-year trend analysis | `cumulative_fsfsi` (smoothed trend) |
| PSTA-5 alignment | Component cumulative stress projected from planning |
| First fiscal year with data | Both equal (EMA bootstrap: \(CS = \upsilon\)) |

---

*Document version: 1.0 | Last updated: March 2026*  
*Rwanda FSFI Platform — Food Systems Financial Intelligence Technical Reference*  
*Engine: `fsfi_engine` (Rust/PyO3) + Django REST Framework*
