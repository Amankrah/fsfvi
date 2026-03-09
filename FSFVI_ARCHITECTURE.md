# FSFVI Platform Architecture
## Food System Financial Vulnerability Index — Country Deployment Guide

> **Version**: 1.0  
> **Audience**: Government Technical Teams, System Architects, Security Officers  
> **Use Case**: Deploying the FSFVI platform for a sovereign nation (e.g., Rwanda)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Sovereignty Model — Why Countries Own Their Data](#3-sovereignty-model--why-countries-own-their-data)
4. [The Two-Backend Architecture](#4-the-two-backend-architecture)
5. [The 9 API Scopes — Food System Relevance](#5-the-9-api-scopes--food-system-relevance)
6. [Core Mathematical Engine](#6-core-mathematical-engine)
7. [Security Architecture — Bank-Level Implementation](#7-security-architecture--bank-level-implementation)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Data Flow — End to End](#10-data-flow--end-to-end)
11. [Technology Stack](#11-technology-stack)

---

## 1. Executive Summary

The FSFVI (Food System Financial Vulnerability Index) platform is a sovereign, government-grade analytical system that enables nations to assess, plan, and optimize their food system financial resilience. The platform computes a single composite vulnerability index across 9 food system components, providing evidence-based policy recommendations, multi-year budget plans, and crisis response frameworks.

**The core principle**: A country like Rwanda connects to the FSFVI API to access world-class analytical capabilities, but **all raw national data stays within the country's own infrastructure**. The FSFVI API receives only processed component values — never raw agricultural census data, financial records, or sensitive national statistics.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     COUNTRY SOVEREIGN ZONE                         │
│                     (Rwanda's Infrastructure)                       │
│                                                                     │
│  ┌──────────────┐     ┌───────────────────────┐     ┌───────────┐  │
│  │   Frontend    │────▶│  Government Backend   │────▶│ Country   │  │
│  │  (Next.js)   │◀────│  (Auth + Data Layer)  │◀────│ Database  │  │
│  └──────────────┘     └──────────┬────────────┘     └───────────┘  │
│                                  │                                  │
│                          Processed component                        │
│                          values only (no raw data)                   │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ HTTPS / TLS 1.3
                           ▼
              ┌────────────────────────────┐
              │      FSFVI API Backend     │
              │    (Computation Engine)    │
              │                            │
              │  • Vulnerability Assessment│
              │  • Budget Optimization     │
              │  • Strategic Planning      │
              │  • Scenario Simulation     │
              │  • Sensitivity Analysis    │
              │  • Decision Support        │
              │  • Performance Gap Analysis│
              │  • Matrix Generation       │
              │  • Weighting Analysis      │
              └────────────────────────────┘
```

---

## 2. System Architecture Overview

The platform consists of four interconnected components:

| Component | Role | Technology | Location |
|-----------|------|------------|----------|
| **FSFVI API Backend** | Core computation engine — receives component values, returns analytics | Rust / Actix-Web / PostgreSQL | FSFVI Cloud (or country-hosted) |
| **Government Backend** | Country authentication, data sovereignty, raw data processing | Rust / Actix-Web / SQLite or PostgreSQL | Country sovereign infrastructure |
| **Frontend** | Dashboard, visualization, policy tools | Next.js 15 / React 19 / TypeScript | Country sovereign infrastructure |
| **Admin Application** | System management, user admin, audit logs | Tauri (Rust + React) | FSFVI operations |

### Architectural Principles

1. **Data Sovereignty** — Raw national data never leaves the country's infrastructure
2. **Compute Delegation** — Mathematical computation is delegated to the FSFVI API
3. **Defense in Depth** — Multiple security layers at every boundary
4. **Transparency** — All calculations are explainable and auditable
5. **Offline Capability** — Country backends can cache results for resilience

---

## 3. Sovereignty Model — Why Countries Own Their Data

### The Problem

Food system data is among a nation's most sensitive information. Agricultural production volumes, import dependencies, food reserve levels, and government budget allocations are national security concerns. Sharing this raw data with an external platform is unacceptable.

### The Solution — Processed Component Values Only

The FSFVI platform solves this through a clear separation:

```
WHAT STAYS IN-COUNTRY (Rwanda's Database)          WHAT GOES TO FSFVI API
─────────────────────────────────────────          ─────────────────────────
✓ Raw agricultural census data                     ✗ Never sent
✓ Food import/export records                       ✗ Never sent
✓ Government budget spreadsheets                   ✗ Never sent
✓ Population nutrition surveys                     ✗ Never sent
✓ Financial institution records                    ✗ Never sent
                                                   
✓ Processed in Government Backend →                ✓ Component: "Agricultural Productivity"
                                                       Observed: 0.65, Benchmark: 0.85
                                                       Allocation: $45M USD
                                                   
                                                   ✓ Component: "Food Safety & Quality"
                                                       Observed: 0.55, Benchmark: 0.80
                                                       Allocation: $12M USD
```

The Government Backend transforms thousands of raw data points into **9 normalized component values** (observed score, benchmark score, financial allocation). Only these processed, dimensionless values are sent to the FSFVI API for computation.

### Rwanda Example — Data Flow

```
Rwanda Ministry of Agriculture Database
    │
    ├── Crop yield data (tons/ha by district)
    ├── Fertilizer usage statistics
    ├── Irrigation coverage (%)
    ├── Extension service reach
    │
    ▼ [Government Backend Processing]
    
    Component: Agricultural Productivity
    ├── observed_value: 0.62 (normalized composite)
    ├── benchmark_value: 0.85 (regional best practice)
    └── financial_allocation: $38,000,000 USD
    
    ──── Only this goes to FSFVI API ────▶
```

---

## 4. The Two-Backend Architecture

### 4.1 FSFVI API Backend (Core Computation Engine)

The main backend is a Rust-based high-performance computation engine. It has **no knowledge of raw country data** — it only receives processed component values and returns analytical results.

**Directory Structure:**

```
fsfi-backend/
├── src/
│   ├── main.rs                    # Application entry point
│   ├── fsfvi/                     # Core FSFVI engine
│   │   ├── fsfvi_core/
│   │   │   ├── calculations.rs    # Core FSFVI formula
│   │   │   ├── metrics.rs         # System metrics & aggregation
│   │   │   └── sensitivity.rs     # Sensitivity parameter estimation
│   │   ├── service/               # 9 analytical services
│   │   │   ├── vulnerability_assessment.rs
│   │   │   ├── budget_optimization.rs
│   │   │   ├── strategic_planning.rs
│   │   │   ├── scenario_simulation.rs
│   │   │   ├── sensitivity_analysis.rs
│   │   │   ├── performance_gap_analysis.rs
│   │   │   ├── decision_support.rs
│   │   │   ├── matrix_generation.rs
│   │   │   └── weighting_analysis.rs
│   │   ├── config.rs              # FSFVI configuration
│   │   └── validators.rs          # Input validation
│   ├── fsfvi_api/                 # REST API layer
│   │   ├── assessment.rs          # /assessments endpoints
│   │   ├── budget_optimization.rs # /optimization/budget endpoints
│   │   ├── strategic_planning.rs  # /strategic-planning endpoints
│   │   ├── scenario_simulation.rs # /scenarios endpoints
│   │   ├── sensitivity_analysis.rs# /sensitivity endpoints
│   │   ├── performance_gap.rs     # /performance-gaps endpoints
│   │   ├── decision_support.rs    # /decision-support endpoints
│   │   ├── matrix_generation.rs   # /matrices endpoints
│   │   ├── weighting_analysis.rs  # /analysis/weights endpoints
│   │   ├── auth_extract.rs        # Unified auth context
│   │   ├── permissions.rs         # Permission system
│   │   └── models.rs              # API models
│   ├── middleware/                 # Security middleware
│   │   ├── auth.rs                # JWT auth middleware
│   │   ├── api_key_auth.rs        # API key auth middleware
│   │   └── security_headers.rs    # HTTP security headers
│   ├── services/                  # Core services
│   │   ├── jwt.rs                 # JWT token management
│   │   ├── encryption.rs          # AES-256-GCM encryption
│   │   ├── password.rs            # Argon2 password hashing
│   │   ├── api_key.rs             # API key management
│   │   └── mfa.rs                 # Multi-factor authentication
│   └── handlers/                  # HTTP request handlers
├── migrations/                    # PostgreSQL migrations
├── Dockerfile                     # Multi-stage Docker build
└── docker-compose.yml             # Full stack deployment
```

### 4.2 Government Backend (Country Authentication & Data Layer)

Each country deploys its own Government Backend. This is the **trust boundary** — it handles authentication of government users, processes raw national data into FSFVI component values, and proxies computation requests to the FSFVI API.

**Directory Structure (Demo — Kenya/Rwanda):**

```
demo_gov_backend/
├── src/
│   ├── main.rs                    # Entry point
│   ├── handlers/                  # Auth handlers
│   ├── services/
│   │   ├── auth_service.rs        # User authentication
│   │   ├── password_service.rs    # Password management
│   │   ├── token_service.rs       # Token management
│   │   ├── two_factor_service.rs  # 2FA (TOTP)
│   │   └── fsfvi_service/         # FSFVI API client
│   │       ├── client.rs          # HTTP client to FSFVI API
│   │       └── models.rs          # Request/response models
│   ├── models/                    # User, auth models
│   └── middleware/                # Security middleware
├── migrations/                    # 9 SQLite migrations
│   ├── 001_auth_tables.sql
│   ├── 002_raw_data.sql           # Raw country data tables
│   ├── 003_fsfvi_data.sql         # Processed FSFVI data
│   ├── 004_fsfvi_results.sql      # Cached API results
│   ├── 005_security_events.sql    # Audit trail
│   └── ...
└── tests/                         # Integration tests
```

**Key Responsibility: Data Transformation**

The Government Backend transforms raw country data into the 9 FSFVI component values:

```rust
// Example: Raw data → FSFVI Component
// This happens INSIDE the country's infrastructure

fn compute_agricultural_productivity(raw_data: &CountryAgData) -> ComponentInput {
    let observed = normalize(
        raw_data.crop_yield_per_hectare,
        raw_data.irrigation_coverage,
        raw_data.fertilizer_usage,
        raw_data.extension_service_reach,
    );
    
    ComponentInput {
        component_type: "AgriculturalProductivity",
        observed_value: observed,          // 0.0 - 1.0
        benchmark_value: 0.85,             // Regional benchmark
        financial_allocation: 38_000_000,  // USD
        sensitivity_parameter: None,       // Let API estimate
    }
}
```

---

## 5. The 9 API Scopes — Food System Relevance

The FSFVI API is organized into 9 analytical scopes. Each scope addresses a critical dimension of food system governance. Together, they provide a government with a complete toolkit for understanding, planning, and improving their food system financial resilience.

### Scope 1: Vulnerability Assessment (`/assessments`)

**What it does**: Computes the core FSFVI score — a single number (0.0–1.0) representing how financially vulnerable a country's food system is. Higher = more vulnerable.

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/assessments` | Full vulnerability assessment with detailed analysis |
| `POST` | `/assessments/quick` | Rapid vulnerability check |

**Food System Relevance for Rwanda:**
This is the foundational scope. Rwanda's Ministry of Agriculture can submit their 9 food system component values and receive:
- An overall FSFVI score (e.g., 0.42 — moderate vulnerability)
- Component-by-component vulnerability breakdown
- Risk classification (Critical / High / Moderate / Low)
- Identification of which components (e.g., Food Safety, Market Access) are dragging the score up
- Recommendations for priority interventions

**Example**: Rwanda submits data showing strong Agricultural Productivity (0.72) but weak Food Safety & Quality (0.38). The assessment highlights Food Safety as the highest-vulnerability component and recommends targeted investment.

**Permissions Required:** `RunAssessment`

---

### Scope 2: Strategic Planning (`/strategic-planning`)

**What it does**: Generates multi-year budget plans, Medium-Term Expenditure Frameworks (MTEF), investment sequencing strategies, and resource mobilization plans.

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/strategic-planning/multi-year` | Generate 1–20 year strategic plan |
| `POST` | `/strategic-planning/mtef` | Generate 3-year MTEF budget framework |
| `POST` | `/strategic-planning/investment-sequencing` | Optimal order of investments |
| `POST` | `/strategic-planning/resource-mobilization` | Domestic vs. external financing plan |

**Food System Relevance for Rwanda:**
Rwanda's Vision 2050 includes food security as a pillar. This scope enables:
- **Multi-Year Plans**: "How should we allocate $200M over 5 years to reduce FSFVI from 0.42 to 0.25?"
- **MTEF Generation**: Directly integrates with Rwanda's existing MTEF budget process, producing 3-year rolling budgets for food system investment
- **Investment Sequencing**: Identifies dependencies — e.g., "Invest in Agricultural Productivity first because it enables Food Processing improvements"
- **Resource Mobilization**: Determines what Rwanda can fund domestically vs. what requires development partner support

**Key Feature**: Budget conservation enforcement ensures total allocations exactly match available budgets — no phantom money.

**Permissions Required:** `GenerateStrategicPlan`, `GenerateMTEF`

---

### Scope 3: Budget Optimization (`/optimization/budget`)

**What it does**: Uses Sequential Convex Programming (SCP) to find the mathematically optimal allocation of limited funds across the 9 food system components to minimize overall vulnerability.

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/optimization/budget/analyze-efficiency` | Analyze current allocation efficiency |
| `POST` | `/optimization/budget/generate-plan` | Generate reallocation plan |
| `POST` | `/optimization/budget/calculate-roi` | Calculate ROI for different scenarios |
| `POST` | `/optimization/budget/optimize` | Run mathematical optimization |

**Food System Relevance for Rwanda:**
Budget optimization answers the critical question: **"Is Rwanda getting the maximum food security improvement per dollar spent?"**

- **Efficiency Analysis**: Reveals whether current allocations are optimal. Uses the Herfindahl-Hirschman Index (HHI) to measure allocation concentration — is Rwanda over-investing in one component at the expense of others?
- **Reallocation Plans**: Provides phased implementation — "Move $5M from Component A to Component B in Phase 1, yielding 12% FSFVI improvement"
- **ROI Analysis**: Compares multiple budget scenarios — "What if we increase food safety spending by 20%?"
- **LP Optimization**: Finds the globally optimal allocation given constraints

**Safety Guardrail**: Rejects any component allocation below $5M USD to prevent numerical instability and impractical micro-allocations.

**Permissions Required:** Admin or Developer role

---

### Scope 4: Weighting Analysis (`/analysis/weights`)

**What it does**: Provides full transparency into how the 9 components are weighted in the FSFVI calculation. Supports multiple weighting methodologies and validates their consistency.

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/analysis/weights/scenario-sensitivity/hybrid` | Hybrid weight sensitivity |
| `POST` | `/analysis/weights/scenario-sensitivity/expert` | Expert weight sensitivity |
| `POST` | `/analysis/weights/financial` | Financial weight analysis |
| `POST` | `/analysis/weights/network-comparison` | PageRank vs. Eigenvector comparison |
| `POST` | `/analysis/weights/context-sensitivity` | Country context sensitivity |
| `POST` | `/analysis/weights/expert-validation` | AHP consistency validation |
| `POST` | `/analysis/weights/expert-validation/compare-scenarios` | Cross-scenario weight comparison |
| `GET`  | `/analysis/weights/available-scenarios` | List available scenarios |

**Food System Relevance for Rwanda:**
Weighting determines *how important* each component is. This scope ensures:
- **Methodological Transparency**: Rwanda can see exactly how weights are derived — Financial (budget-based), Expert (AHP pairwise comparison), Network (inter-component dependencies via PageRank), or Hybrid (combined)
- **AHP Consistency**: Validates expert judgments using the Consistency Ratio (CR < 0.10 threshold) — ensures expert weight assignments are logically coherent
- **Scenario Sensitivity**: Shows how weights change under different scenarios (drought, pandemic, financial crisis) — critical for Rwanda's climate vulnerability
- **Network Analysis**: Reveals hidden dependencies between components — e.g., "Agricultural Productivity" and "Market Access" are tightly coupled

**Why it matters**: If a government disagrees with the weights, this scope provides the evidence base for adjustment. Full transparency builds trust.

**Permissions Required:** Admin or Developer role

---

### Scope 5: Performance Gap Analysis (`/performance-gaps`)

**What it does**: Identifies gaps between Rwanda's current performance and benchmarks, compares against peer countries, and tracks closure progress over time.

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/performance-gaps/analyze` | Analyze gaps vs. benchmarks |
| `POST` | `/performance-gaps/peer-comparison` | Compare with peer countries |
| `POST` | `/performance-gaps/track-closure` | Track gap closure over time |
| `POST` | `/performance-gaps/recommend-targets` | Generate improvement targets |

**Food System Relevance for Rwanda:**
- **Benchmark Comparison**: Where does Rwanda stand relative to best practice? If the benchmark for Food Safety is 0.80 and Rwanda scores 0.38, that is a 52.5% gap
- **Peer Comparison**: How does Rwanda compare against similar East African nations (Kenya, Tanzania, Uganda)? Identifies competitive advantages and areas of concern
- **Progress Tracking**: Tracks improvement quarter-by-quarter — "Food Safety gap closed from 52% to 41% over 6 months"
- **Target Setting**: Generates realistic improvement targets based on current trajectory and resource constraints

**Permissions Required:** `RunPerformanceGapAnalysis`

---

### Scope 6: Sensitivity Analysis (`/sensitivity`)

**What it does**: Tests how robust the FSFVI results are under uncertainty. If small changes in inputs cause large changes in output, the results are fragile.

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/sensitivity/analyze` | Run sensitivity analysis |

**Analysis Types:**
| Type | What it Tests |
|------|---------------|
| **Weight Sensitivity** | How do FSFVI results change if component weights shift by ±5%, ±10%, ±20%? |
| **Parameter Sensitivity** | How sensitive is the result to the diminishing-returns parameter (α)? |
| **Benchmark Sensitivity** | What if benchmarks are set ±5%, ±10%, ±15% differently? |
| **Scenario Robustness** | Is the FSFVI stable across different scenarios (drought, pandemic, etc.)? |
| **Monte Carlo** | 1,000+ simulations with random parameter perturbation — what is the distribution of possible FSFVI scores? |

**Food System Relevance for Rwanda:**
Rwanda's data may have measurement uncertainty. Sensitivity analysis tells policymakers: **"Even with data uncertainty, the conclusion that Food Safety is the highest priority remains robust."** This is essential for building confidence in policy recommendations and defending budget allocations to Parliament.

**Permissions Required:** `RunSensitivityAnalysis`

---

### Scope 7: Matrix Generation (`/matrices`)

**What it does**: Generates and exports the mathematical matrices underlying the FSFVI weighting system — specifically the AHP pairwise comparison matrix and the network dependency matrix.

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/matrices/ahp` | Generate AHP pairwise comparison matrix |
| `GET`  | `/matrices/network` | Generate network dependency matrix |
| `POST` | `/matrices/ahp/customize` | Customize AHP with government expert judgments |
| `GET`  | `/matrices/export` | Export matrices to CSV |

**Food System Relevance for Rwanda:**
- **AHP Matrix**: Shows the expert pairwise comparison — "Agricultural Productivity is 3x more important than Food Processing" — with full traceability
- **Network Matrix**: Reveals component interdependencies — Rwanda can see that investing in Market Access also improves Food Distribution outcomes
- **Government Customization**: Rwanda's own food security experts can override default weights with their judgments (validated for AHP consistency). Pairwise values range from 1/9 (far less important) to 9 (far more important)
- **CSV Export**: Full transparency — matrices can be shared with Parliament, development partners, or academic reviewers

**Permissions Required:** `ViewMatrices`, `CustomizeMatrices`

---

### Scope 8: Scenario Simulation (`/scenarios`)

**What it does**: What-if analysis and crisis planning. Simulates the impact of crises, budget changes, and policy interventions on the FSFVI.

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/scenarios/compare` | Compare multiple scenarios side-by-side |
| `POST` | `/scenarios/crisis` | Simulate specific crisis impact |
| `POST` | `/scenarios/budget-change` | Simulate budget reallocation impact |
| `POST` | `/scenarios/intervention` | Simulate policy intervention effects |

**Supported Crisis Scenarios:**
- `NormalOperations` — Baseline
- `ClimateShock` — Drought, flood, climate event
- `PandemicDisruption` — Disease outbreak affecting food systems
- `FinancialCrisis` — Currency shock, commodity price spike
- `PoliticalInstability` — Governance disruption

**Food System Relevance for Rwanda:**
Rwanda is highly vulnerable to climate variability. This scope enables:
- **Crisis Preparedness**: "What happens to our FSFVI if a drought hits and reduces Agricultural Productivity by 30%?"
- **Budget Impact Modeling**: "What if the Ministry of Finance cuts our food safety budget by 15%?"
- **Intervention Planning**: "If we invest $10M in irrigation infrastructure, what is the expected FSFVI improvement?"
- **Scenario Comparison**: Side-by-side comparison of multiple futures to inform contingency planning

**Permissions Required:** `RunScenarioSimulation`

---

### Scope 9: Decision Support (`/decision-support`)

**What it does**: The synthesis layer. Takes analytical outputs and converts them into actionable policy recommendations, crisis response plans, progress reports, and stakeholder communication materials.

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/decision-support/policy-recommendations` | Generate evidence-based policy recommendations |
| `POST` | `/decision-support/crisis-response` | Generate emergency response plan |
| `POST` | `/decision-support/track-progress` | Track progress over time |
| `POST` | `/decision-support/stakeholder-brief` | Generate audience-specific briefs |

**Audience Types for Stakeholder Briefs:**
- **Ministers** — Executive summary with budget implications
- **Parliament** — Oversight-focused with accountability metrics
- **Development Partners** — Technical with investment opportunities
- **Public** — Simplified with impact stories

**Food System Relevance for Rwanda:**
This is where analysis becomes action:
- **Policy Recommendations**: "Based on the assessment, the top 3 priorities are: (1) Increase Food Safety budget by $8M, (2) Establish cold chain infrastructure, (3) Strengthen food inspection capacity"
- **Crisis Response**: Given a drought scenario + available emergency budget of $50M → immediate action plan with phase-by-phase deployment
- **Progress Tracking**: Baseline vs. current comparison — "FSFVI improved from 0.42 to 0.35 over 12 months"
- **Stakeholder Communication**: Auto-generated briefs for different audiences — the Minister gets a 2-page executive summary, Parliament gets accountability metrics, donors get investment opportunity analysis

**Permissions Required:** `GeneratePolicyRecommendations`, `GenerateCrisisResponse`, `ViewProgressTracking`, `GenerateStakeholderBrief`

---

## 6. Core Mathematical Engine

### The FSFVI Formula

The Food System Financial Vulnerability Index is computed as:

```
FSFVI = Σᵢ ωᵢ · υᵢ(fᵢ)
```

Where:
```
υᵢ(fᵢ) = δᵢ · [1 / (1 + αᵢ · fᵢ)]
```

| Symbol | Meaning | Range |
|--------|---------|-------|
| `FSFVI` | Overall vulnerability score | 0.0 (resilient) – 1.0 (critical) |
| `ωᵢ` | Weight of component i (importance) | 0.0 – 1.0, Σωᵢ = 1 |
| `υᵢ` | Vulnerability of component i | 0.0 – 1.0 |
| `δᵢ` | Performance gap (normalized) | 0.0 – 1.0 |
| `αᵢ` | Sensitivity parameter (diminishing returns) | 0.0005 – 0.005 |
| `fᵢ` | Financial allocation (millions USD) | ≥ $5M |

### Key Properties

- **Diminishing Returns**: The `1/(1 + αf)` term ensures that doubling a budget does not double the improvement. Early investments yield the highest returns.
- **Performance Gap**: `δ = max(0, (benchmark - observed) / benchmark)` for "higher is better" components. A country at benchmark has zero gap.
- **Weight Methods**: Financial (budget-proportional), Expert (AHP with consistency validation), Network (PageRank on dependency graph), or Hybrid (combined).

### The 9 Food System Components

| # | Component | What it Measures |
|---|-----------|-----------------|
| 1 | **Agricultural Productivity** | Crop yields, land use efficiency, input availability |
| 2 | **Food Safety & Quality** | Inspection capacity, standards compliance, contamination rates |
| 3 | **Market Access & Trade** | Export/import infrastructure, trade agreements, market integration |
| 4 | **Nutritional Outcomes** | Malnutrition rates, dietary diversity, micronutrient adequacy |
| 5 | **Food Distribution** | Supply chain efficiency, storage capacity, last-mile delivery |
| 6 | **Food Processing** | Value-addition capacity, processing infrastructure, technology |
| 7 | **Natural Resource Management** | Soil health, water management, biodiversity, sustainability |
| 8 | **Food Governance & Policy** | Institutional capacity, policy coherence, regulatory framework |
| 9 | **Social Protection** | Safety nets, school feeding, emergency food assistance coverage |

---

## 7. Security Architecture — Bank-Level Implementation

The FSFVI platform implements **bank-grade security** because it handles sovereign national data and influences government budget decisions worth hundreds of millions of dollars. A breach could compromise national food security planning.

### 7.1 Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Layer 1: Transport Security                             │   │
│  │  • TLS 1.3 (all connections)                             │   │
│  │  • HSTS (HTTP Strict Transport Security)                 │   │
│  │  • Certificate pinning                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Layer 2: Authentication                                  │   │
│  │  • JWT (HS256, 15-min access tokens)                     │   │
│  │  • API Keys (SHA-256 hashed, scoped, IP-whitelisted)     │   │
│  │  • Multi-Factor Authentication (TOTP)                    │   │
│  │  • Account lockout (5 failures → 30-min lock)            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Layer 3: Authorization                                   │   │
│  │  • Role-Based Access Control (RBAC)                      │   │
│  │  • Granular permission system (18+ permissions)          │   │
│  │  • Scope-based API key access                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Layer 4: Data Protection                                 │   │
│  │  • AES-256-GCM encryption at rest                        │   │
│  │  • Argon2 password hashing                               │   │
│  │  • SHA-256 API key hashing                               │   │
│  │  • Random 96-bit nonces                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Layer 5: Network & Application Security                  │   │
│  │  • Rate limiting (10 req/s, burst 20)                    │   │
│  │  • IP whitelisting per API key                           │   │
│  │  • Security headers (CSP, X-Frame-Options, etc.)         │   │
│  │  • CORS whitelist                                        │   │
│  │  • Input validation (all endpoints)                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Layer 6: Audit & Monitoring                              │   │
│  │  • Full operation audit trail (database)                 │   │
│  │  • Security event logging                                │   │
│  │  • Failed authentication tracking                        │   │
│  │  • API key usage monitoring                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Authentication — Dual-Mode System

The platform supports two authentication methods, both enforced on every API request:

#### JWT Authentication (User Sessions)

```
Algorithm:    HS256 (HMAC-SHA256)
Access Token: 15 minutes (900 seconds)
Refresh Token: 30 days (2,592,000 seconds)
Header:       Authorization: Bearer <token>
```

- Short-lived access tokens minimize the window of exposure if a token is compromised
- Refresh tokens enable seamless session extension without re-authentication
- Token payload includes user ID, role, government ID, and permissions

#### API Key Authentication (System-to-System)

```
Format:       fsfi_live_<32 random characters> (42 chars total)
Storage:      SHA-256 hashed (only hash stored in database)
Header:       X-API-Key: fsfi_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Features:     Scoped permissions, IP whitelist, expiration, revocation
```

**Security Controls per API Key:**
| Control | Description |
|---------|-------------|
| **IP Whitelist** | Only requests from specified IP addresses are accepted |
| **Scoped Permissions** | Each key has a JSON array of permitted operations |
| **Expiration** | Automatic expiry after configurable days |
| **Mandatory Rotation** | Force key rotation every N days |
| **Max Active Keys** | Limit concurrent active keys per government |
| **Immediate Revocation** | Keys can be revoked instantly |
| **Prefix Identification** | First 8 characters stored for key identification without exposing the full key |

### 7.3 Encryption — Data at Rest

#### AES-256-GCM (Authenticated Encryption)

```
Algorithm:    AES-256-GCM
Key Derivation: SHA-256 of ENCRYPTION_KEY environment variable
Nonce:        Random 96-bit (12 bytes) per encryption
Format:       Base64(nonce || ciphertext)
Min Key Length: 32 characters
```

Used for:
- MFA secrets (TOTP seeds) encrypted at rest
- Sensitive configuration data
- Any reversible encryption needs

**Why AES-256-GCM**: GCM mode provides both confidentiality (encryption) and integrity (authentication tag). If ciphertext is tampered with, decryption fails. This is the same standard used by banks, military systems, and classified government communications.

#### Argon2 (Password Hashing)

```
Algorithm:    Argon2id
Salt:         Random per password (via OS CSPRNG)
Storage:      Full Argon2 hash string (includes salt + parameters)
```

**Why Argon2**: Winner of the Password Hashing Competition (PHC). Resistant to GPU attacks, ASIC attacks, and side-channel attacks. Configurable memory and time costs make brute-force economically infeasible.

#### SHA-256 (API Key Hashing)

```
Algorithm:    SHA-256
Storage:      Hex-encoded hash
Prefix:       First 8 characters stored separately for identification
```

### 7.4 Multi-Factor Authentication (MFA)

```
Algorithm:    TOTP (Time-based One-Time Password)
Library:      totp-lite 2.0
Secret Storage: AES-256-GCM encrypted
Backup Codes: Hashed and stored for recovery
```

Government users can enable MFA for an additional security factor. MFA secrets are encrypted at rest — even a database breach does not expose TOTP seeds.

### 7.5 Authorization — Granular Permission System

```rust
// 18+ granular permissions organized by function
enum FsfviPermission {
    // Read Operations
    ViewAssessments,
    ViewMatrices,
    ViewReports,
    ViewProgressTracking,
    
    // Analysis Operations
    RunAssessment,
    RunScenarioSimulation,
    RunSensitivityAnalysis,
    RunPerformanceGapAnalysis,
    
    // Planning Operations
    GenerateStrategicPlan,
    OptimizeBudget,
    GenerateMTEF,
    
    // Decision Support
    GeneratePolicyRecommendations,
    GenerateCrisisResponse,
    GenerateStakeholderBrief,
    
    // Administration
    CustomizeMatrices,
    ManageBenchmarks,
    ExportData,
}
```

**Role Hierarchy:**
| Role | Access Level |
|------|-------------|
| **Admin** | All permissions — full system control |
| **Developer** | All FSFVI API permissions — government analytical access |

Every API endpoint enforces permissions via the `require_permission!` macro, ensuring compile-time safety — it is impossible to forget a permission check.

### 7.6 Security Headers

Every HTTP response includes:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

These prevent:
- **Clickjacking** (X-Frame-Options)
- **MIME-type confusion attacks** (X-Content-Type-Options)
- **Cross-site scripting** (CSP, X-XSS-Protection)
- **Information leakage** (Referrer-Policy)
- **Protocol downgrade attacks** (HSTS)

### 7.7 Rate Limiting

```
Default:      10 requests/second
Burst:        20 requests
Scope:        Per API key / per IP
Library:      actix-governor
```

Prevents brute-force attacks, credential stuffing, and denial-of-service attempts. Government-specific quotas can be configured for higher throughput.

### 7.8 Account Security

| Feature | Implementation |
|---------|---------------|
| **Password Requirements** | 12+ characters, uppercase, lowercase, numbers, symbols |
| **Account Lockout** | 5 failed attempts → 30-minute lockout |
| **Progressive Delays** | Increasing wait times between failed attempts |
| **Security Event Logging** | All auth events logged with IP, timestamp, outcome |
| **Session Management** | Short-lived tokens, refresh rotation |

### 7.9 Infrastructure Security (Docker Deployment)

```yaml
# docker-compose.yml security hardening
services:
  backend:
    read_only: true          # Immutable filesystem
    user: "1000:1000"        # Non-root user
    security_opt:
      - no-new-privileges    # Prevent privilege escalation
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
```

### 7.10 SQL Injection Prevention

All database queries use parameterized queries via SQLx:

```rust
// SAFE — parameterized query
sqlx::query("SELECT * FROM users WHERE id = $1")
    .bind(user_id)
    .fetch_one(&pool)
    .await?;
```

SQLx validates queries **at compile time** against the actual database schema — SQL injection is architecturally impossible.

### 7.11 Security Comparison — Bank Level

| Security Feature | Banking Standard | FSFVI Implementation |
|-----------------|-----------------|---------------------|
| Encryption at Rest | AES-256 | AES-256-GCM (authenticated) |
| Password Hashing | BCrypt/Argon2 | Argon2id (PHC winner) |
| Token Expiry | 15–30 min | 15 min access, 30 day refresh |
| MFA | TOTP/SMS | TOTP with encrypted secrets |
| Rate Limiting | Per-user/IP | Per-key/IP with burst control |
| Audit Trail | Full logging | Full operation audit to database |
| Key Rotation | Mandatory | Configurable mandatory rotation |
| IP Restrictions | Whitelist | Per-API-key whitelist |
| Transport Security | TLS 1.2+ | TLS 1.3 + HSTS |
| Input Validation | Server-side | Compile-time + runtime validation |

---

## 8. Frontend Architecture

The frontend is a Next.js 15 application with React 19, designed for government officials who may not be technical. The UI prioritizes clarity, accessibility, and actionable insights.

### Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 15 | App Router, SSR, API routes |
| React | 19 | Component framework |
| TypeScript | - | Type safety |
| Tailwind CSS | 4 | Utility-first styling |
| Radix UI | - | Accessible component primitives |
| React Hook Form + Zod | - | Form handling + validation |
| Axios | - | HTTP client with interceptors |
| Recharts | - | Data visualization |

### Component Structure

```
fsfvi-frontend/
├── app/                         # Next.js App Router
│   ├── demo/                    # Public demo dashboard
│   ├── developer/               # Developer portal
│   └── page.tsx                 # Landing page
├── components/
│   ├── assessment/              # Vulnerability assessment dashboards
│   ├── budget-optimization/     # Budget allocation tools
│   ├── strategic-planning/      # Multi-year planning UI
│   ├── performance-gap/         # Gap analysis visualizations
│   ├── demo/                    # Demo-specific components
│   │   ├── DemoDashboardContent.tsx
│   │   └── DemoDashboardLayout.tsx
│   └── ui/                      # Reusable primitives (Button, Badge, etc.)
├── hooks/                       # Custom React hooks
└── lib/                         # API client, utilities
```

### Key Pages

1. **Landing Page** (`/`) — Platform introduction and value proposition
2. **Demo Dashboard** (`/demo`) — Interactive demo with sample country data
3. **Assessment Dashboard** — Full vulnerability assessment with visualizations
4. **Budget Optimization** — Interactive budget allocation tools
5. **Strategic Planning** — Multi-year plan generator with MTEF output
6. **Developer Portal** (`/developer/*`) — API documentation and key management

---

## 9. Deployment Architecture

### Rwanda Deployment Model

```
┌─────────────────────────────────────────────────────────┐
│              RWANDA GOVERNMENT DATA CENTER               │
│              (e.g., RURA-certified facility)             │
│                                                          │
│  ┌────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │   Nginx    │───▶│  Government  │───▶│  PostgreSQL  │  │
│  │  Reverse   │    │   Backend    │    │  / SQLite    │  │
│  │  Proxy     │    │  (Rust)      │    │  Database    │  │
│  │  + TLS     │    └──────┬───────┘    └─────────────┘  │
│  └─────┬──────┘           │                              │
│        │            ┌─────▼──────┐                       │
│        │            │  Frontend  │                       │
│        │            │  (Next.js) │                       │
│  ┌─────▼──────┐     └────────────┘                       │
│  │  Ministry   │                                         │
│  │  Users      │                                         │
│  └────────────┘                                          │
└─────────────────────────┬────────────────────────────────┘
                          │
                    TLS 1.3 + API Key
                    (processed values only)
                          │
                          ▼
              ┌────────────────────────┐
              │    FSFVI API Cloud     │
              │   (Computation Only)   │
              │                        │
              │  PostgreSQL (metadata) │
              │  No raw country data   │
              └────────────────────────┘
```

### Docker Compose (Production)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: fsfvi
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]

  backend:
    build: .
    read_only: true
    user: "1000:1000"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgres://...
      - JWT_SECRET=<secure-random>
      - ENCRYPTION_KEY=<32+-char-key>

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
```

---

## 10. Data Flow — End to End

### Complete Request Lifecycle (Rwanda → FSFVI API → Response)

```
Step 1: Government Analyst logs into Rwanda Frontend
        └── Credentials → Government Backend → Argon2 verify → JWT issued

Step 2: Analyst requests vulnerability assessment
        └── Frontend sends JWT to Government Backend

Step 3: Government Backend processes raw data
        └── Queries Rwanda database → Aggregates raw data → 
            Produces 9 ComponentInput values (observed, benchmark, allocation)

Step 4: Government Backend calls FSFVI API
        └── HTTPS POST to /assessments
            Header: X-API-Key: fsfi_live_xxxx...
            Body: { country: "Rwanda", components: [...9 processed values...] }

Step 5: FSFVI API processes request
        ├── API Key middleware: Verify hash, check IP whitelist, check scopes
        ├── Permission check: require_permission!(RunAssessment)
        ├── Validate inputs
        ├── Calculate FSFVI = Σ ωᵢ · δᵢ · [1/(1+αᵢfᵢ)]
        ├── Generate insights, recommendations
        ├── Log operation to audit trail
        └── Return ApiResponse<AssessmentResult>

Step 6: Government Backend receives results
        └── Caches results in local database (fsfvi_results table)

Step 7: Frontend renders dashboard
        └── FSFVI score, component breakdown, risk heatmap,
            priority interventions, trend charts
```

### What the FSFVI API Never Sees

| Data Type | Stays in Rwanda | Sent to FSFVI API |
|-----------|:-:|:-:|
| Raw agricultural statistics | Yes | No |
| Individual farm records | Yes | No |
| Government budget spreadsheets | Yes | No |
| Trade partner details | Yes | No |
| Population nutrition surveys | Yes | No |
| Processed component scores (0-1) | Yes (copy) | Yes |
| Dollar allocations (aggregated) | Yes (copy) | Yes |
| Country name | Yes | Yes |

---

## 11. Technology Stack

### Complete Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Language** | Rust | 2021 Edition | Memory-safe, high-performance backend |
| **Web Framework** | Actix-Web | 4.5 | Async HTTP server |
| **Database** | PostgreSQL | 16 | Primary data store |
| **ORM/Query** | SQLx | - | Compile-time verified SQL |
| **Authentication** | jsonwebtoken | 9.2 | JWT token management |
| **Password Hashing** | Argon2 | 0.5 | PHC-winning password hash |
| **Encryption** | aes-gcm | 0.10 | AES-256-GCM authenticated encryption |
| **Hashing** | sha2 | 0.10 | SHA-256 for API keys |
| **MFA** | totp-lite | 2.0 | Time-based one-time passwords |
| **Rate Limiting** | actix-governor | 0.5 | Request throttling |
| **API Docs** | utoipa | - | OpenAPI/Swagger generation |
| **Frontend** | Next.js | 15 | React framework with SSR |
| **UI** | React | 19 | Component framework |
| **Styling** | Tailwind CSS | 4 | Utility-first CSS |
| **Components** | Radix UI | - | Accessible primitives |
| **Desktop Admin** | Tauri | - | Rust + Web desktop app |
| **Containerization** | Docker | - | Deployment packaging |
| **Reverse Proxy** | Nginx | Alpine | TLS termination, load balancing |

### Why Rust?

The choice of Rust for both backends is deliberate:

1. **Memory Safety Without Garbage Collection** — No buffer overflows, use-after-free, or data races. These are the vulnerability classes that cause most security breaches in C/C++ systems.
2. **Compile-Time Guarantees** — Permission checks, SQL queries, and type safety are all verified at compile time. If the code compiles, entire categories of bugs are impossible.
3. **Performance** — FSFVI calculations (especially Monte Carlo simulations with 1,000+ iterations) run at native speed. No JVM warm-up, no GC pauses.
4. **Fearless Concurrency** — Actix-Web handles thousands of concurrent government requests without data races.
5. **Small Binary Size** — Docker images are minimal (multi-stage build), reducing attack surface.

---

## Appendix: API Quick Reference

| Scope | Base Path | Endpoints | Key Permission |
|-------|-----------|-----------|---------------|
| Assessment | `/assessments` | 2 | `RunAssessment` |
| Strategic Planning | `/strategic-planning` | 4 | `GenerateStrategicPlan` |
| Budget Optimization | `/optimization/budget` | 4 | Admin/Developer |
| Weighting Analysis | `/analysis/weights` | 8 | Admin/Developer |
| Performance Gap | `/performance-gaps` | 4 | `RunPerformanceGapAnalysis` |
| Sensitivity | `/sensitivity` | 1 | `RunSensitivityAnalysis` |
| Matrices | `/matrices` | 4 | `ViewMatrices` |
| Scenarios | `/scenarios` | 4 | `RunScenarioSimulation` |
| Decision Support | `/decision-support` | 4 | `GeneratePolicyRecommendations` |
| **Total** | | **35 endpoints** | |

---

*This document describes the FSFVI platform architecture as of February 2026. For API integration guides, see the Developer Portal. For security incident procedures, see SECURITY.md.*
