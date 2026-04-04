# Rwanda FSFI Dashboard — User Guide

**Food Systems Financial Intelligence (FSFI) | Republic of Rwanda**  
*Ministry of Agriculture & Animal Resources (MINAGRI)*  
*FSFSI = Food System Financing Stress Index*

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Understanding the FSFSI Score](#2-understanding-the-fsfsi-score)
3. [The Eight Food System Components](#3-the-eight-food-system-components)
4. [National Overview Dashboard](#4-national-overview-dashboard)
5. [Budget Analysis](#5-budget-analysis)
6. [Assessment](#6-assessment)
7. [Optimization](#7-optimization)
8. [Strategic Planning](#8-strategic-planning)
9. [PSTA-5 Alignment Tracker](#9-psta-5-alignment-tracker)
10. [Data Entry](#10-data-entry)
11. [Glossary of Key Terms](#11-glossary-of-key-terms)

---

## 1. Getting Started

### Logging In

Navigate to **https://rwanda.fsfvi.ai** and enter your government credentials.

| Field | Description |
|-------|-------------|
| **Username** | Your assigned government username (e.g. `admin`) |
| **Password** | Your secure password |

If Two-Factor Authentication (2FA) is enabled on your account, you will be prompted for a one-time code after your password.

> **Forgot your password?** Contact your system administrator to use the `set_password` management command.

### Changing Your Password

After first login, go to **Profile → Change Password**. You will be required to enter your current password and confirm the new one. Passwords are stored with strong hashing — they are never stored in plain text.

### Roles & Access

| Role | Access Level |
|------|-------------|
| **admin** | Full access to all sections, data entry, and user management |
| **analyst** | Read access to all sections; can run assessments and planning |
| **viewer** | Read-only access to overview and reports |

---

## 2. Understanding the FSFSI Score

The **Food System Financing Stress Index (FSFSI)** is the central metric of this dashboard. It measures how much financing-related stress Rwanda's food system is experiencing across all 8 components and 37 indicators.

### What the Score Means

> **Higher FSFSI = More financing stress = Worse outcome**  
> **Lower FSFSI = Less financing stress = Better outcome**

The score is calculated using the following logic for each indicator:

```
Stress (υ) = Performance Gap (δ) × e^(−sensitivity × budget_allocation)
```

In plain language:
- **Performance Gap (δ)**: How far the current indicator value is from its benchmark (international or national reference). A gap of 0 means the indicator is at benchmark; a gap of 1 means it is maximally underperforming.
- **Budget Allocation (f)**: The financial investment directed at that indicator (in billions RWF). More investment reduces stress exponentially.
- **Sensitivity (α)**: How responsive a given indicator is to additional funding. High-sensitivity indicators improve quickly with investment; low-sensitivity ones require sustained, long-term commitment.

The system-level FSFSI is the weighted sum of all indicator stresses:

```
FSFSI = Σ (weight × stress) for all 37 indicators
```

### Stress Levels

| Level | FSFSI Range | Interpretation |
|-------|-------------|----------------|
| 🟢 **Low** | 0.00 – 0.05 | Food system is well-funded; indicators near benchmark |
| 🟡 **Medium** | 0.05 – 0.15 | Moderate gaps; targeted investment can close deficits |
| 🟠 **High** | 0.15 – 0.30 | Significant underinvestment; intervention needed |
| 🔴 **Critical** | > 0.30 | Severe financing stress; urgent reallocation required |

### Point-in-Time vs. Cumulative FSFSI

The dashboard shows **two versions** of the FSFSI score:

| Version | Description |
|---------|-------------|
| **Overall FSFSI** | The score for a single fiscal year calculated from that year's data alone |
| **Cumulative FSFSI** | A memory-adjusted score that accounts for historical stress — stress builds up over time if not resolved |

The **Cumulative FSFSI** is the headline number shown on the National Overview. It is more realistic because food system stress does not disappear in a single year — past underinvestment leaves lasting gaps.

The cumulative score uses **asymmetric persistence**:
- **Stress worsening** (ρ_up): new stress is added quickly (high persistence)
- **Stress recovering** (ρ_down): recovery is slower, reflecting real-world lag in food system improvement

---

## 3. The Eight Food System Components

Rwanda's food system is divided into **8 components**, each grouping related indicators. Budget allocations are tracked and scored at this component level.

---

### 3.1 Crop Production

**What it covers:** Climate-resilient farming, irrigation infrastructure, soil health, improved seeds, food self-sufficiency.

**Key indicators include:**
- Crop productivity (MT/ha)
- Irrigated land area (ha)
- Farmers using improved seeds (%)
- Soil health improvement coverage (%)
- Food self-sufficiency ratio (%)

**Why it matters:** Crop production is the backbone of Rwanda's agricultural GDP. Underinvestment here directly increases stress in post-harvest and markets downstream.

**PSTA-5 linkage:** Maps primarily to **Priority Area 1 (PA1): Modernization of Agriculture & Animal Resources** (40% contribution weight).

---

### 3.2 Animal Systems

**What it covers:** Livestock productivity, veterinary services, dairy and meat value chains.

**Key indicators include:**
- Livestock productivity index
- Dairy production growth

**Why it matters:** Animal systems contribute to food security and rural incomes. Stress here reflects underinvestment in veterinary infrastructure and livestock inputs.

**PSTA-5 linkage:** Maps to **PA1** (30% contribution weight).

---

### 3.3 Post-Harvest Management

**What it covers:** Storage infrastructure, processing facilities, loss reduction technologies.

**Key indicators include:**
- Post-harvest losses (%) — *lower is better*
- Processed agricultural products (%)

**Why it matters:** Rwanda loses a significant proportion of harvests to spoilage each year. Each percentage-point reduction in post-harvest losses is equivalent to increasing production without additional land.

**PSTA-5 linkage:** Maps to **Priority Area 2 (PA2): Inclusive Markets & Post-Harvest Management** (50% contribution weight).

---

### 3.4 Markets

**What it covers:** Market access for smallholders, cooperative membership, export performance, value chains.

**Key indicators include:**
- Agricultural exports (USD millions)
- Farmers linked to formal markets (%)
- Farmers in cooperatives (%)

**Why it matters:** Without functional market linkages, production gains cannot translate into income. High market stress means farmers are price-takers or face access barriers.

**PSTA-5 linkage:** Maps to **PA2** (50% contribution weight).

---

### 3.5 Nutrition

**What it covers:** Nutritional status outcomes, dietary diversity, nutrition-sensitive agriculture.

**Key indicators include:**
- Stunting prevalence in children under 5 (%) — *lower is better*
- Dietary diversity scores

**Why it matters:** Rwanda's food system serves not just economic but human development goals. Nutrition stress signals a disconnect between food production and population dietary needs.

**PSTA-5 linkage:** Maps to **Priority Area 3 (PA3): Systems Enablers** (30% contribution weight).

---

### 3.6 Finance

**What it covers:** Agricultural credit access, financial inclusion for farmers, insurance products.

**Key indicators include:**
- Farmers with access to finance (%)
- Agricultural loan volumes

**Why it matters:** Without finance, farmers cannot invest in inputs, technology, or risk management. Finance stress acts as a multiplier — it constrains progress in every other component.

**PSTA-5 linkage:** Maps to **PA3** (35% contribution weight).

---

### 3.7 Research & Extension

**What it covers:** Agricultural R&D investment, technology adoption, extension agent coverage, digital agriculture.

**Key indicators include:**
- Research outputs adopted (%)
- Extension agent to farmer ratio — *lower is better* (fewer farmers per agent)
- Digital agriculture users (farmer mobile penetration %)
- Youth employed in agribusiness

**Why it matters:** Research and extension create the knowledge pipeline that drives productivity. Underinvestment here creates a lag of 5–10 years in adoption of better practices.

**PSTA-5 linkage:** Maps to **PA3** (35% contribution weight).

---

### 3.8 Environment

**What it covers:** Land degradation, water resource management, climate adaptation, ecosystem services.

**Key indicators include:**
- Climate-resilient farming adoption (%)
- Soil health coverage (%)
- Water resource management index

**Why it matters:** Environmental degradation is irreversible on short timescales. Stress here compounds future stress in crop production and animal systems through reduced natural capital.

**PSTA-5 linkage:** Maps to **PA1** (30% contribution weight).

---

## 4. National Overview Dashboard

**URL:** `/dashboard`

The National Overview is your starting point. It provides a **national-level snapshot** of food system financing health for the selected fiscal year.

### Key Metrics Row

| Metric | What it shows |
|--------|---------------|
| **FSFSI Score** | The headline cumulative stress score for the national food system. Accompanied by the single-year (point-in-time) score in smaller text. |
| **Risk Level** | Color-coded badge (Low / Medium / High / Critical) derived from the cumulative FSFSI. |
| **Year-on-Year Change** | Percentage change in FSFSI vs. the previous fiscal year. A **negative** change means **improving** (stress is falling). |
| **Critical Components** | Count of the 8 components with cumulative stress **> 0.30** (Critical level). |
| **Total Budget** | Total national food system budget mapped to indicators for the selected fiscal year, in RWF. |

> **Reading the YoY change:** A value of **−8.3%** means the FSFSI score fell by 8.3% compared to last year — the food system is **less stressed**. A value of **+5.1%** means stress **increased**.

### Historical Trend Charts

Below the key metrics, three chart views are available:

**1. FSFSI Trend**  
Shows the system-level FSFSI score across all available fiscal years. Use this to identify whether Rwanda's food system stress is on a long-term improving or worsening trajectory.

**2. Component Stress Trends**  
Shows each of the 8 components' stress scores over time as separate lines. Use this to identify which components are improving, stagnating, or deteriorating.

**3. Stress Heatmap**  
A grid view: rows = fiscal years, columns = components, color intensity = stress level. This is the fastest way to spot persistent stress concentrations (dark cells that span multiple years).

### Fiscal Year Selector

Use the **Fiscal Year** dropdown (top-right area) to change the year context for all dashboard sections. The default is the most recent year with assessment data.

### Active Strategic Plan Panel

If a strategic plan has been saved and set as active (see [Section 8](#8-strategic-planning)), a summary card appears here showing:
- **Baseline FSFSI** (at plan creation)
- **Projected final FSFSI** (at plan horizon)
- **Target reduction %**
- **Total additional investment needed** (RWF billions)

---

## 5. Budget Analysis

**URL:** `/dashboard/budget`

The Budget Analysis section provides a **purely financial view** of how Rwanda's food system budget has been allocated and how it has evolved — independent of stress scores.

> **Note:** Budget Analysis does not use the FSFSI engine. It analyzes the raw allocation data from `IndicatorData` records.

### What You See

| View | Description |
|------|-------------|
| **Budget Composition** | How total food system budget is split across the 8 components for the selected year (pie/bar chart) |
| **Multi-Year Budget History** | Total and component-level budget trends across all available fiscal years |
| **Budget Share Evolution** | How each component's **share** of total budget has changed — useful for spotting structural shifts in priorities |
| **Per-Component Details** | Absolute allocation in RWF billions and % share for each component |

### How to Read Budget Allocations

All monetary values are in **RWF (Rwandan Francs) billions** unless labelled otherwise.

- **Gross allocation**: Total funds formally assigned to a budget line
- **Weighted allocation**: Budget adjusted for cross-cutting indicators that serve multiple components (avoids double-counting)

The dashboard uses **weighted allocation** for FSFSI scoring but shows both for transparency.

### Key Questions Budget Analysis Answers

1. Are we allocating enough to the components with the highest stress?
2. Has our budget composition changed relative to PSTA-5 priority area targets?
3. Which components have seen the largest real-terms budget changes year-on-year?

---

## 6. Assessment

**URL:** `/dashboard/assessment`

The Assessment section is where the **FSFSI scoring engine** runs. Each assessment computes stress scores for all 37 indicators and 8 components for a given fiscal year and weighting configuration.

### Running a New Assessment

1. Select a **Fiscal Year** from the dropdown.
2. Choose a **Weighting Method** (see table below).
3. Optionally select a **Scenario** (baseline / optimistic / pessimistic).
4. Click **Run Assessment**.

The Rust engine (`fsfi_engine`) processes all indicator data and returns scores within seconds.

### Weighting Methods

The weighting method determines how much influence each component and indicator has on the overall FSFSI score.

| Method | Description | Best used when |
|--------|-------------|----------------|
| **Equal** | All 8 components weighted equally (12.5% each) | Exploratory analysis; no prior knowledge of priorities |
| **Expert (AHP)** | Weights derived from expert judgment using Analytic Hierarchy Process | Policy decisions informed by domain expertise |
| **Financial** | Weights proportional to actual budget allocations | Budget-tracking; aligns stress importance with spending reality |
| **Network** | PageRank-style weights based on component interdependencies | Understanding systemic leverage points |
| **Hybrid** | Blends expert, financial, and network weights | Balanced policy analysis; recommended for official reporting |

### Assessment Results

After running an assessment, the results panel shows:

**Summary Metrics**
| Metric | Description |
|--------|-------------|
| **Overall FSFSI** | Point-in-time system score for this fiscal year |
| **Cumulative FSFSI** | Memory-adjusted score incorporating historical stress |
| **Optimal FSFSI** | The minimum achievable score if budget were optimally allocated |
| **Efficiency Index** | `Optimal FSFSI ÷ Actual FSFSI` — ranges 0 to 1; closer to 1 = more efficient |
| **Gap Ratio** | `(Actual − Optimal) ÷ Actual` — proportion of stress that is addressable by reallocation |

**Component Breakdown Table**

For each of the 8 components:

| Column | Description |
|--------|-------------|
| **Component** | Name of the food system component |
| **Budget (bn RWF)** | Weighted allocation for this fiscal year |
| **Stress Score** | Point-in-time stress for this component (0 = no stress, 1 = maximum stress) |
| **Cumulative Stress** | Memory-adjusted stress (headline for policy) |
| **Stress Level** | Low / Medium / High / Critical badge |
| **Budget Share %** | This component's share of total food system budget |

**Indicator Detail View**

Click on any component to expand its indicator-level detail:

| Column | Description |
|--------|-------------|
| **Indicator** | Specific metric (e.g. "Crop productivity MT/ha") |
| **Observed Value** | Latest actual value for Rwanda |
| **Benchmark Value** | Reference value (international or national target) |
| **Performance Gap (δ)** | Normalized gap: 0 = at benchmark, 1 = maximum gap |
| **Stress (υ)** | Combined stress from gap and current funding level |
| **Sensitivity (α)** | How responsive this indicator is to additional funding |
| **Budget Allocation** | Current funding in bn RWF |

### Scenario Analysis

Scenarios modify how observed and benchmark values are interpreted:

| Scenario | Effect |
|----------|--------|
| **Baseline** | Uses actual observed values and standard benchmarks |
| **Optimistic** | Assumes favorable external conditions (higher observed values) |
| **Pessimistic** | Stress-tests with lower observed values and tighter benchmarks |

---

## 7. Optimization

**URL:** `/dashboard/optimization`

The Optimization section uses the results of the **most recent assessment** for a fiscal year to recommend how Rwanda's food system budget should be reallocated to minimize FSFSI stress.

### Three Analysis Tabs

#### 7.1 Efficiency Analysis

Shows how efficiently current budget reduces stress across components.

| Metric | Description |
|--------|-------------|
| **Marginal Stress Reduction** | How much FSFSI would improve with one additional billion RWF in this component |
| **Stress per Billion** | Current stress level relative to allocation — high values mean underfunded components |
| **Efficiency Rank** | Ranking of components by marginal return on investment |

> **Key insight:** A component with high stress and low allocation has the greatest marginal return. Invest here first.

#### 7.2 Reallocation Plan

The engine calculates the **optimal redistribution** of the existing total budget across components to minimize FSFSI.

The table shows:
- **Current allocation** vs **Recommended allocation** (bn RWF)
- **Change** (+ increase, − decrease)
- **Projected stress after reallocation**
- **Net FSFSI improvement** from the reallocation

> **Important:** The reallocation plan does **not** increase total budget. It shows how the same total can be distributed more effectively.

#### 7.3 ROI Analysis

Shows the **return on investment** for additional budget across components — useful for budget expansion decisions.

| Metric | Description |
|--------|-------------|
| **FSFSI Reduction per bn RWF** | How much the headline score drops for each billion invested |
| **Break-even Investment** | Minimum additional investment needed to move a component out of its current stress level |
| **5-Year ROI Projection** | Projected cumulative stress reduction from a sustained investment increase |

---

## 8. Strategic Planning

**URL:** `/dashboard/planning`

The Planning section allows policy makers to create, simulate, and save **multi-year strategic investment plans** that project how FSFSI will evolve under different budget growth scenarios.

### Creating a Plan

Configure the following parameters:

| Parameter | Description |
|-----------|-------------|
| **Planning Horizon** | Number of years to project (typically 3–6 years, aligned to PSTA-5 2024–2029) |
| **Target FSFSI Reduction (%)** | How much you want to reduce the headline stress score by end of horizon |
| **Annual Budget Growth Rate (%)** | Expected year-on-year increase in total food system budget |
| **Weighting Method** | Must match the assessment used as baseline |
| **Target Curve** | How aggressively to front-load or back-load reductions (linear / accelerated / gradual) |

### Reading the Plan Output

#### Trajectory Chart

Shows the projected FSFSI score year by year from baseline to the plan horizon, compared against:
- The **target reduction path** (what you're aiming for)
- **Historical actuals** (where you came from)

#### Yearly Plan Table

For each planning year:

| Column | Description |
|--------|-------------|
| **Projected FSFSI** | Expected system score if the plan is followed |
| **Total Budget** | Total recommended food system budget (bn RWF) |
| **Component Allocations** | Recommended budget for each of the 8 components |
| **On Track** | Whether the year's projection is on course to meet the final target |
| **Key Interventions** | Priority actions for that year per component |
| **Milestones** | Specific measurable targets for the year |

#### Component Projections

For each component, the plan shows:
- **Cumulative stress trajectory** over the planning horizon
- **Point-in-time stress** per year
- **Investment recommendation** per year

#### MTEF Summary (3-Year)

The **Medium-Term Expenditure Framework (MTEF)** view condenses the plan into a 3-year forward budget commitment, matching Rwanda's government budget cycle:

| Field | Description |
|-------|-------------|
| **Year 1 / 2 / 3 Budget** | Total recommended allocation per MTEF year |
| **Component breakdown** | Bn RWF per component per year |
| **Fiscal implications** | Net additional investment required above baseline trajectory |

### Plan vs. Actual Tracking

Once a plan is saved and activated, actual budget data entered in subsequent years can be compared against plan targets. The **Plan vs Actual Card** shows:
- **Planned allocation** vs **actual allocation** per component
- **FSFSI deviation** — how much the actual score diverges from the plan's projection
- **On-track status** per year

### Saving & Activating a Plan

- Click **Save Plan** to store the current configuration and projections.
- The **active plan** is the one referenced on the National Overview and in PSTA-5 alignment calculations.
- Only one plan can be active at a time.

---

## 9. PSTA-5 Alignment Tracker

**URL:** `/dashboard/psta5`

The PSTA-5 Tracker measures how well Rwanda's food system budget and strategic plans align with the **Fifth Strategic Plan for Agriculture Transformation (PSTA-5)** (2024–2029), as defined by MINAGRI.

### PSTA-5 Priority Areas

PSTA-5 structures Rwanda's agricultural investment into **three Priority Areas (PAs)** with official budget allocation targets:

| Code | Priority Area | Budget Target |
|------|--------------|---------------|
| **PA1** | Modernization of Agriculture & Animal Resources | **58%** of budget |
| **PA2** | Inclusive Markets & Post-Harvest Management | **17%** of budget |
| **PA3** | Systems Enablers (research, finance, nutrition, digital) | **24%** of budget |

> These percentages reflect official MINAGRI PSTA-5 documentation.

### Budget Alignment Score

The **Alignment Score (0–100)** measures how closely the actual budget distribution matches the PSTA-5 targets.

```
Alignment Score = 100 − 2 × (average absolute deviation in percentage points)
```

**Examples:**
- If PA1 receives 58% (target), PA2 receives 17% (target), PA3 receives 24% (target) → **Score = 100** (perfect alignment)
- If PA1 receives 50% (−8pp), PA2 receives 20% (+3pp), PA3 receives 28% (+4pp) → average deviation = 5pp → **Score = 90**
- A score below **70** indicates significant misalignment with PSTA-5 strategic priorities

### KPI Progress Tracker

The tracker shows progress on all **19 official PSTA-5 KPIs** grouped by priority area.

For each KPI:

| Field | Description |
|-------|-------------|
| **Baseline** | Value at start of PSTA-5 (2023) |
| **Annual Target** | Linear interpolation target for the selected fiscal year |
| **Actual** | Reported actual value for the fiscal year |
| **Progress (%)** | How far along the 2023→2029 journey this KPI has traveled |
| **Status** | On track / Behind / Ahead |

#### PA1 KPIs (Modernization of Agriculture)

| KPI | Baseline | 2029 Target |
|-----|----------|-------------|
| Crop productivity (MT/ha) | 2.1 | 3.5 |
| Irrigated land area (ha) | 60,000 | 102,000 |
| Climate-resilient farming adoption (%) | 15% | 45% |
| Livestock productivity index | 100 | 140 |
| Farmers using improved seeds (%) | 25% | 55% |
| Soil health improvement coverage (%) | 30% | 60% |
| Food self-sufficiency ratio (%) | 79% | 100% |

#### PA2 KPIs (Markets & Post-Harvest)

| KPI | Baseline | 2029 Target |
|-----|----------|-------------|
| Post-harvest losses (%) | 30% | 15% *(lower is better)* |
| Agricultural exports (USD M) | 700 | 1,500 |
| Farmers linked to markets (%) | 35% | 65% |
| Processed agricultural products (%) | 20% | 45% |
| Farmers in cooperatives (%) | 45% | 75% |

#### PA3 KPIs (Systems Enablers)

| KPI | Baseline | 2029 Target |
|-----|----------|-------------|
| Stunting prevalence under 5 (%) | 32% | 15% *(lower is better)* |
| Farmers with access to finance (%) | 18% | 45% |
| Youth employed in agribusiness | 150,000 | 400,000 |
| Digital agriculture users (%) | 40% | 85% |
| Research outputs adopted (%) | 30% | 60% |
| Extension agent to farmer ratio | 1:2,500 | 1:1,200 *(lower is better)* |
| Agricultural GDP growth rate (%) | 4.5% | 6.0% |

### Projected Indicator Improvement

When an active strategic plan exists, the tracker also shows **projected improvements** per KPI based on the plan's component allocations. This answers: *"If we follow the strategic plan, which PSTA-5 KPIs will benefit most?"*

The projection uses **KPI-to-component mappings** — for example, PA1.1 (crop productivity) is driven 100% by the `crop_production` component, while PA1.2 (irrigated land) is 60% `crop_production` + 40% `environment`.

---

## 10. Data Entry

**URL:** `/dashboard/data-entry`

The Data Entry section allows authorized users to input new indicator data and budget allocations directly into the system.

### Indicator Data Form

Enter or update values for individual indicators:

| Field | Description |
|-------|-------------|
| **Fiscal Year** | Year the data applies to |
| **Indicator** | Select from the 37 system indicators |
| **Observed Value** | The actual measured value for Rwanda |
| **Budget Allocation (bn RWF)** | Gross allocation to this indicator |
| **Benchmark Value** | Reference/target value (can be updated if new evidence) |
| **Sensitivity (α)** | Responsiveness parameter (usually set from Excel import) |

> **Best practice:** Use the Excel import tools (`import_budget_mapping` and `import_indicator_parameters` management commands) for bulk data updates. Manual entry is suitable for single-indicator corrections.

### Bulk Import

The Bulk Import tab accepts Excel files in the IFPRI format:

| File | Purpose |
|------|---------|
| `budget_lines_to_food_system_indicators_mapping.xlsx` | Maps budget line items to the 37 indicators with LCU values |
| `FSFSI_indicator_level_parameters.xlsx` | Sets benchmark values, observed values, and alpha parameters |

After import, **re-run an assessment** to regenerate FSFSI scores with the new data.

### Budget Allocation Entry

The Budget Allocation sub-tab allows direct entry of component-level budget figures when indicator-level data is not yet available. This provides a faster update pathway for budget cycle submissions.

---

## 11. Glossary of Key Terms

| Term | Definition |
|------|-----------|
| **FSFSI** | Food System Financing Stress Index — the headline composite metric. Higher = more stressed. |
| **Cumulative FSFSI** | Memory-adjusted FSFSI that carries forward historical stress. The dashboard's primary headline. |
| **Overall FSFSI** | Point-in-time FSFSI for a single fiscal year, without memory effects. |
| **Performance Gap (δ)** | Normalized distance between an indicator's observed value and its benchmark. 0 = at benchmark; 1 = maximum gap. |
| **Stress (υ)** | Indicator-level financing stress = δ × e^(−α × f). Combines gap and investment level. |
| **Sensitivity (α)** | How responsive an indicator is to financial investment. Expressed as stress reduction per billion RWF. |
| **Budget Allocation (f)** | Weighted financial investment assigned to an indicator, in billions RWF. |
| **Efficiency Index** | Optimal FSFSI ÷ Actual FSFSI. Ranges 0–1; 1 = perfectly efficient budget allocation. |
| **Gap Ratio** | (Actual − Optimal) ÷ Actual. Share of current stress that could be eliminated by reallocation alone. |
| **Weighting Method** | How component importance is determined: Equal, Expert (AHP), Financial, Network, or Hybrid. |
| **Persistence (ρ)** | Rate at which cumulative stress updates when new information arrives. ρ_up > ρ_down (stress builds faster than it heals). |
| **LCU** | Local Currency Unit — Rwandan Francs (RWF). All budget values are in billions LCU unless stated. |
| **PSTA-5** | Fifth Strategic Plan for Agriculture Transformation (2024–2029), Rwanda's official agricultural sector strategy. |
| **Priority Area (PA)** | PSTA-5 strategic pillar. PA1 = Modernization (58%); PA2 = Markets & Post-Harvest (17%); PA3 = Systems Enablers (24%). |
| **Alignment Score** | 0–100 score measuring how well the food system budget distribution matches PSTA-5 priority area targets. |
| **MTEF** | Medium-Term Expenditure Framework — 3-year forward budget projection aligned to Rwanda's government budget cycle. |
| **Benchmark** | Reference value for an indicator, derived from World Bank global data or national targets. |
| **Observed Value** | The actual measured value for Rwanda for a given indicator and fiscal year. |
| **Component** | One of the 8 food system groupings: Crop Production, Animal Systems, Post-Harvest, Markets, Nutrition, Finance, Research, Environment. |
| **Optimal FSFSI** | The minimum achievable FSFSI score given current total budget, if reallocated optimally. |
| **Scenario** | Baseline / Optimistic / Pessimistic — modifies how observed and benchmark values are interpreted in an assessment. |
| **Active Plan** | The saved strategic plan currently used as the reference in the National Overview and PSTA-5 alignment calculations. |

---

*Document version: 1.0 | Last updated: March 2026*  
*Rwanda FSFI Platform — Ministry of Agriculture & Animal Resources (MINAGRI)*  
*For technical support, contact your system administrator.*
