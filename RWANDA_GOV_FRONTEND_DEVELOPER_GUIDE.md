# Rwanda Government-Facing Frontend — Developer Guide

**Project:** Food Systems Financial Vulnerability Intelligence (FSFVI)
**Target:** Republic of Rwanda — Ministry of Agriculture and Animal Resources (MINAGRI)
**Date:** March 2026
**Status:** Planning Phase

---

## Table of Contents

1. [Rwanda Country Context](#1-rwanda-country-context)
2. [Current System Architecture Review](#2-current-system-architecture-review)
3. [What Exists vs. What Must Be Built](#3-what-exists-vs-what-must-be-built)
4. [Rwanda Frontend Architecture Plan](#4-rwanda-frontend-architecture-plan)
5. [Page-by-Page Build Specification](#5-page-by-page-build-specification)
6. [Design System: Rwanda Government Compliance](#6-design-system-rwanda-government-compliance)
7. [Localization & Accessibility](#7-localization--accessibility)
8. [Data Model: Rwanda-Specific Structures](#8-data-model-rwanda-specific-structures)
9. [API Integration Map](#9-api-integration-map)
10. [File & Folder Structure](#10-file--folder-structure)
11. [Implementation Phases & Task Breakdown](#11-implementation-phases--task-breakdown)
12. [Testing Strategy](#12-testing-strategy)
13. [Deployment Considerations](#13-deployment-considerations)

---

## 1. Rwanda Country Context

### 1.1 Why Rwanda

Rwanda is an ideal first deployment for the FSFVI government-facing platform:

- **PSTA 5 (2024–2029):** Rwanda launched its Fifth Strategic Plan for Agriculture Transformation — the country's first food-systems and climate-resilient strategy. Total budget: RWF 6,622.6 billion (USD 5.1B) over five years.
- **Digital maturity:** Rwanda's Irembo e-government portal already serves 90+ services to citizens. The country has published website guidelines through RISA (Rwanda Information Society Authority) and has standardized branding, accessibility, and design patterns.
- **Administrative clarity:** 5 provinces → 30 districts → 416 sectors → 2,148 cells → 14,837 villages. This hierarchy maps directly to FSFVI's component-level drill-down.
- **Food security urgency:** 31.4% undernourishment prevalence, 33% stunting rate (target: 19%). The government needs actionable financial intelligence to allocate the RWF 225B ($170M) agriculture budget for FY 2025/2026 effectively.
- **Existing monitoring systems:** MINAGRI's MIS (Management Information System), Smart Nkunganire (input subsidies), ALIS (Agricultural Land Information System), and the Rwanda National Crop Monitor provide data sources that FSFVI can integrate with.

### 1.2 Key Government Stakeholders

| Stakeholder | Role in FSFVI | Data Needs |
|---|---|---|
| **MINAGRI** (Ministry of Agriculture) | Primary user — policy & budget decisions | FSFVI scores, budget optimization, vulnerability by component |
| **MINECOFIN** (Ministry of Finance) | Budget approval & fiscal oversight | Budget projections, debt ratios, growth rates, allocation efficiency |
| **RAB** (Rwanda Agriculture Board) | Implementation & monitoring | Performance gaps, peer comparison across districts, target recommendations |
| **NISR** (National Institute of Statistics) | Data provider & validation | Assessment methodology, data quality metrics, trend analysis |
| **District Mayors** | Local-level decision making | District-level FSFVI, sector breakdowns, local action priorities |
| **RDB** (Rwanda Development Board) | Investment & private sector | Investment efficiency, scenario analysis, opportunity identification |

### 1.3 Rwanda's Administrative Data Hierarchy

```
Rwanda (National)
├── Kigali City
│   ├── Gasabo District
│   ├── Kicukiro District
│   └── Nyarugenge District
├── Eastern Province
│   ├── Bugesera, Gatsibo, Kayonza, Kirehe, Ngoma, Nyagatare, Rwamagana
├── Northern Province
│   ├── Burera, Gakenke, Gicumbi, Musanze, Rulindo
├── Southern Province
│   ├── Gisagara, Huye, Kamonyi, Muhanga, Nyamagabe, Nyanza, Nyaruguru, Ruhango
└── Western Province
    ├── Karongi, Ngororero, Nyabihu, Nyamasheke, Rubavu, Rusizi, Rutsiro
```

Each district has 10–18 sectors. FSFVI data must be displayable at national, provincial, and district levels.

### 1.4 Rwanda's Food System Components (Mapped to FSFVI)

The FSFVI backend tracks these component types, which map to Rwanda's agriculture landscape:

| FSFVI Component | Rwanda Context |
|---|---|
| **Agricultural Development** | Crop Intensification Programme (CIP), land consolidation, irrigation expansion (74K→132K hectares) |
| **Infrastructure** | Post-harvest storage, rural roads, irrigation systems, cold chain |
| **Market Access** | East African Community trade, cross-border commerce, commodity exchanges |
| **Nutrition & Food Safety** | Stunting reduction (33%→19% target), school feeding, fortification |
| **Climate Resilience** | Climate Smart Agriculture plan ($335M private investment target), terracing, agroforestry |
| **Financial Services** | Agricultural insurance (subsidized), SACCO networks, input credit |
| **Governance & Policy** | PSTA 5 implementation, sector coordination, M&E frameworks |
| **Research & Innovation** | RAB research stations, digital agriculture services, soil information system |

---

## 2. Current System Architecture Review

### 2.1 Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: Frontends                                             │
│                                                                 │
│  fsfvi-frontend/        Next.js 16 + React 19 + Tailwind v4    │
│  ├── /demo/*            Government demo portal (current)        │
│  ├── /developer/*       Developer portal for API consumers      │
│  └── /rwanda/*          ← NEW: Rwanda government frontend       │
│                                                                 │
│  fsfvi-admin/           React 19 + Tauri v2 desktop app         │
│  └── FSFI admin dashboard (manage governments, keys, users)     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: Government Backend (Proxy + Auth)                     │
│                                                                 │
│  demo_gov_backend/      Rust/Actix-web, SQLite                  │
│  ├── /api/auth/*        JWT auth, 2FA, session management       │
│  ├── /api/government/fsfvi/*  Proxied FSFVI API calls           │
│  └── Port 8081                                                  │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: FSFVI Core Backend (Calculations)                     │
│                                                                 │
│  fsfi-backend/          Rust/Actix-web, PostgreSQL              │
│  ├── /api/v1/budget/*        Budget calculation endpoints       │
│  ├── /api/v1/assessments/*   FSFVI scoring & analysis           │
│  ├── /api/v1/admin/*         Admin management endpoints         │
│  └── Port 8080                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Existing Demo Government Portal Features

The current `fsfvi-frontend/app/demo/` portal serves as a generic government demo. It has:

| Feature | Component | Status |
|---|---|---|
| Login + 2FA | `components/demo/LoginForm.tsx` | Done |
| Password management | `components/demo/PasswordChangeForm.tsx` | Done |
| Profile section | `components/demo/ProfileSection.tsx` | Done |
| Security settings | `components/demo/SecuritySection.tsx` | Done |
| FSFVI Assessment | `components/assessment/AssessmentDashboard.tsx` | Done |
| Performance Gap Analysis | `components/performance-gap/PerformanceGapDashboard.tsx` | Done |
| Budget Optimization | `components/budget-optimization/BudgetOptimizationDashboard.tsx` | Done |
| Sidebar layout + mobile nav | `components/demo/DemoDashboardLayout.tsx` | Done |

### 2.3 Existing API Surface

**Authentication (demo_gov_backend → port 8081):**
- `POST /api/auth/login` — JWT login
- `GET /api/auth/verify` — Token verification
- `POST /api/auth/logout` — Secure logout
- `POST /api/auth/change-password` — Password change
- `POST /api/auth/2fa/*` — 2FA lifecycle

**FSFVI Assessment (proxied through demo_gov_backend):**
- `GET /api/government/fsfvi/assessments/run` — Full assessment with weighting & scenario
- `GET /api/government/fsfvi/assessments/quick-check` — Lightweight check
- `GET /api/government/fsfvi/assessments/compare-weighting-methods` — Method comparison
- `POST /api/government/fsfvi/assessments/compare-scenarios` — Scenario comparison
- `POST /api/government/fsfvi/assessments/trend-analysis` — Multi-year trend

**Budget (fsfi-backend → port 8080):**
- `POST /api/v1/budget/calculate` — Optimal allocation
- `POST /api/v1/budget/growth-rate` — Growth rate
- `POST /api/v1/budget/debt-ratio` — Debt health
- `POST /api/v1/budget/projection` — Future projection

### 2.4 Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 16 (App Router) |
| UI library | React 19 |
| Styling | Tailwind CSS v4 |
| Component library | shadcn/ui (Radix primitives) |
| Icons | Lucide React |
| Forms | React Hook Form + Zod |
| HTTP client | Axios |
| State management | React hooks (useState, useEffect) — no Redux/Zustand |
| Auth hook | `useDemoAuth.ts` (custom) |
| Type safety | TypeScript strict mode |

---

## 3. What Exists vs. What Must Be Built

### 3.1 Reusable As-Is

These components can be used directly in the Rwanda frontend:

- **Auth system** — Login, 2FA, password change, session management (`useDemoAuth` hook, all `components/demo/` auth components)
- **Assessment engine** — `AssessmentDashboard`, `AssessmentOverview`, `ComponentInsights`, `ActionPriorities`
- **Performance gap analysis** — `PerformanceGapDashboard`, `PerformanceGapAnalysis`, `GapClosureTracking`, `PeerComparison`, `TargetRecommendations`
- **Budget optimization** — `BudgetOptimizationDashboard`, `OptimizationResults`, `ReallocationPlan`, `AllocationEfficiency`
- **UI primitives** — All `components/ui/*` (button, card, alert, select, tabs, toast, label, input)
- **API clients** — Assessment API, budget API, auth API
- **Type definitions** — All TypeScript types matching backend structs

### 3.2 Must Adapt (Reskin/Extend)

- **DemoDashboardLayout** → `RwandaDashboardLayout` — Rwanda branding, government seal, Kinyarwanda labels, additional navigation items
- **DemoDashboardContent** → `RwandaDashboardContent` — Extended navigation with Rwanda-specific pages
- **ProfileSection** → `RwandaProfileSection` — Government role/ministry info, district assignment

### 3.3 Must Build New

| Component | Purpose |
|---|---|
| **Rwanda Landing/Overview** | National dashboard with map, headline FSFVI score, province breakdown |
| **Geographic Drill-Down** | Province → District → Sector hierarchy with FSFVI at each level |
| **Rwanda Map Visualization** | Interactive SVG/Canvas map of Rwanda showing FSFVI by district |
| **District Comparison** | Side-by-side comparison of any 2-5 districts |
| **PSTA 5 Alignment Tracker** | Map FSFVI metrics to PSTA 5 strategic priorities |
| **Seasonal Dashboard** | Season A (Sep-Feb) / Season B (Mar-Jun) / Season C (Jul-Aug) crop calendar integration |
| **Report Generator** | PDF export for ministerial briefings, with Rwanda government header/footer |
| **Alert & Notification System** | Critical FSFVI threshold alerts per district |
| **Data Entry Portal** | For district officers to submit food system financial data |
| **Multi-language Toggle** | English ↔ Kinyarwanda ↔ French language switching |
| **Offline Mode Indicator** | For district officers with intermittent connectivity |

---

## 4. Rwanda Frontend Architecture Plan

### 4.1 Route Structure

```
/rwanda/                          → Redirect: authenticated → /rwanda/dashboard, else → /rwanda/login
/rwanda/login                     → Rwanda government login (branded)
/rwanda/change-password           → First-login password change
/rwanda/dashboard                 → National overview (default landing after login)
/rwanda/dashboard/assessment      → Full FSFVI assessment (reuse existing)
/rwanda/dashboard/provinces       → Province-level breakdown
/rwanda/dashboard/provinces/[id]  → Single province detail
/rwanda/dashboard/districts       → District comparison & ranking
/rwanda/dashboard/districts/[id]  → Single district detail with sector breakdown
/rwanda/dashboard/performance     → Performance gap analysis (reuse existing)
/rwanda/dashboard/budget          → Budget optimization (reuse existing)
/rwanda/dashboard/psta5           → PSTA 5 alignment tracker
/rwanda/dashboard/seasonal        → Season A/B/C dashboard
/rwanda/dashboard/reports         → Report generation & history
/rwanda/dashboard/alerts          → Notification center
/rwanda/dashboard/data-entry      → District data submission (role-gated)
/rwanda/profile                   → User profile + government role
/rwanda/security                  → 2FA + password management
```

### 4.2 Component Architecture

```
components/rwanda/
├── layout/
│   ├── RwandaDashboardLayout.tsx     — Main layout (sidebar, topbar, Rwanda branding)
│   ├── RwandaDashboardContent.tsx    — Navigation router
│   ├── RwandaTopBar.tsx              — Government header with seal + language toggle
│   ├── RwandaSidebar.tsx             — Extended navigation
│   └── RwandaFooter.tsx              — Government footer with legal links
│
├── overview/
│   ├── NationalOverview.tsx          — Headline FSFVI + key stats
│   ├── ProvinceCards.tsx             — 5-card grid (4 provinces + Kigali)
│   ├── RwandaMap.tsx                 — Interactive district-level choropleth
│   ├── TrendSummary.tsx              — Multi-year FSFVI trend sparklines
│   └── AlertBanner.tsx               — Critical district alerts
│
├── geographic/
│   ├── ProvinceDetail.tsx            — Province view with district breakdown
│   ├── DistrictDetail.tsx            — District view with sector breakdown
│   ├── DistrictComparison.tsx        — Multi-district side-by-side
│   ├── DistrictRanking.tsx           — All 30 districts ranked by FSFVI
│   └── GeographicBreadcrumb.tsx      — Rwanda > Province > District > Sector
│
├── psta5/
│   ├── PSTA5Dashboard.tsx            — Alignment tracker main view
│   ├── StrategicPriorityCard.tsx     — PSTA 5 priority → FSFVI mapping
│   └── TargetProgressBar.tsx         — Progress toward PSTA 5 targets
│
├── seasonal/
│   ├── SeasonalDashboard.tsx         — Season A/B/C crop calendar
│   ├── SeasonSelector.tsx            — Season picker
│   └── CropPerformanceGrid.tsx       — Per-crop performance by district
│
├── reports/
│   ├── ReportGenerator.tsx           — PDF report builder
│   ├── ReportTemplateSelector.tsx    — Ministerial brief, district report, etc.
│   └── ReportHistory.tsx             — Previously generated reports
│
├── data-entry/
│   ├── DataEntryForm.tsx             — District data submission form
│   ├── DataValidationSummary.tsx     — Validation errors/warnings
│   └── SubmissionHistory.tsx         — Past submissions with status
│
├── alerts/
│   ├── AlertCenter.tsx               — All notifications
│   ├── AlertCard.tsx                 — Individual alert display
│   └── ThresholdConfig.tsx           — Alert threshold settings (admin)
│
├── shared/
│   ├── RwandaLogo.tsx                — Government of Rwanda emblem
│   ├── LanguageToggle.tsx            — EN / RW / FR switcher
│   ├── FiscalYearSelector.tsx        — Rwanda fiscal year (Jul-Jun)
│   ├── CurrencyDisplay.tsx           — RWF formatting
│   ├── ConnectivityIndicator.tsx     — Online/offline status
│   └── RwandaColorScale.tsx          — FSFVI color scale using national palette
│
└── auth/
    ├── RwandaLoginForm.tsx           — Rwanda-branded login
    └── RwandaProtectedRoute.tsx      — Auth wrapper with role checks
```

### 4.3 State Management Approach

Keep the existing pattern — **React hooks + context**. No need for Redux/Zustand at this scale.

**New contexts to add:**

| Context | Purpose |
|---|---|
| `RwandaGeographyContext` | Currently selected province/district/sector |
| `LanguageContext` | Current locale (en/rw/fr) with translation function |
| `FiscalYearContext` | Selected fiscal year (shared across all dashboard pages) |
| `AlertContext` | Unread alert count, notification state |

---

## 5. Page-by-Page Build Specification

### 5.1 National Overview (Landing Page)

**Route:** `/rwanda/dashboard`
**Purpose:** First thing a MINAGRI official sees after login. Must answer: "How is Rwanda's food system doing right now?"

**Layout:**
```
┌────────────────────────────────────────────────────────────────┐
│  [Rwanda Seal] Government of Rwanda — FSFVI Dashboard    [EN▾] │
├─────────┬──────────────────────────────────────────────────────┤
│         │  ┌──────────────────────────────────────────────┐   │
│  Sidebar│  │  Rwanda Food System Vulnerability Index       │   │
│         │  │  FY 2025/2026 — Season B                      │   │
│ Overview│  ├──────────────────────────────────────────────┤   │
│ Assess. │  │  [FSFVI: 0.42] [Risk: Moderate] [▲ 3.2%]   │   │
│ Perform.│  │  [Critical: 2]  [Budget: RWF 225B]           │   │
│ Budget  │  ├──────────────────────────────────────────────┤   │
│ PSTA 5  │  │                                              │   │
│ Seasonal│  │    ┌─────────────────────────────────┐       │   │
│ Province│  │    │      RWANDA MAP (Choropleth)    │       │   │
│ District│  │    │      Color by district FSFVI    │       │   │
│ Reports │  │    │      Click → drill down         │       │   │
│ Alerts  │  │    └─────────────────────────────────┘       │   │
│ Data    │  │                                              │   │
│ ─────── │  │  [Province Cards: Kigali | East | North |   │   │
│ Profile │  │   South | West — each with FSFVI + trend]    │   │
│ Security│  ├──────────────────────────────────────────────┤   │
│         │  │  Alert Banner: "Bugesera district FSFVI      │   │
│         │  │  crossed critical threshold (0.71)"          │   │
│         │  └──────────────────────────────────────────────┘   │
└─────────┴──────────────────────────────────────────────────────┘
```

**Data sources:**
- `govAssessmentAPI.runAssessment()` → national FSFVI score
- `govAssessmentAPI.quickCheck()` → province-level quick scores (5 calls)
- Internal alert state → critical threshold crossings

**Key metrics to display:**
- National FSFVI score with risk level badge
- Year-over-year change percentage
- Number of critical components
- Total agriculture budget (RWF)
- 5 province mini-cards with sparkline trends
- Interactive map with district-level coloring

### 5.2 Geographic Drill-Down (Province & District)

**Route:** `/rwanda/dashboard/provinces/[id]` and `/rwanda/dashboard/districts/[id]`

**Province view shows:**
- Province FSFVI score + trend
- All districts within province, ranked by vulnerability
- Component breakdown for the province
- Resource allocation efficiency for the province
- Action priorities specific to this province

**District view shows:**
- District FSFVI score + trend
- Sector-level breakdown (if data available)
- All FSFVI components with vulnerability bars
- Performance gap vs. national average
- Budget allocation for this district
- Specific recommendations

**Breadcrumb navigation:**
`Rwanda > Eastern Province > Bugesera District > [Sector]`

### 5.3 PSTA 5 Alignment Tracker

**Route:** `/rwanda/dashboard/psta5`
**Purpose:** Show how FSFVI metrics align with Rwanda's PSTA 5 strategic priorities.

**PSTA 5 Priority Areas to track:**
1. Increasing agricultural productivity and resilience
2. Expanding irrigated land (74K → 132K ha)
3. Post-harvest loss reduction
4. Market access improvement
5. Agriculture financing expansion
6. Nutrition-sensitive agriculture
7. Climate-smart agriculture adoption

**For each priority:**
- Mapped FSFVI component(s)
- Current vulnerability score
- Progress toward PSTA 5 target
- Budget allocation vs. needed
- Recommended actions

### 5.4 Seasonal Dashboard

**Route:** `/rwanda/dashboard/seasonal`

Rwanda has three agricultural seasons:
- **Season A** (September – February): Main rainy season, largest harvest
- **Season B** (March – June): Second rainy season
- **Season C** (July – August): Dry season, irrigated crops

**Display:**
- Current season indicator with date range
- Season-specific FSFVI (vulnerability varies by season)
- Crop calendar timeline visualization
- Season-over-season comparison
- Pre-season planning recommendations (budget, inputs needed)

### 5.5 Report Generator

**Route:** `/rwanda/dashboard/reports`

**Report templates:**
1. **Ministerial Brief** — 2-page executive summary for MINAGRI Minister
2. **District Report** — Detailed single-district analysis
3. **Budget Submission** — Budget justification document for MINECOFIN
4. **PSTA 5 Progress** — Quarterly alignment report
5. **Alert Summary** — Critical threshold breaches for the period

**Export formats:** PDF (primary), Excel (data tables)

**Rwanda government header format:**
```
Republic of Rwanda
Ministry of Agriculture and Animal Resources
[Report Title]
[Date] — [Fiscal Year]
Classification: [Official / Restricted]
```

### 5.6 Data Entry Portal

**Route:** `/rwanda/dashboard/data-entry`
**Access:** District-level users only (role-gated)

**Purpose:** District agricultural officers submit food system financial data quarterly.

**Form sections:**
1. District identification (auto-filled from user profile)
2. Reporting period (fiscal year + quarter + season)
3. Budget data per FSFVI component
4. Performance indicators (production, coverage, etc.)
5. Narrative notes (challenges, context)

**Workflow:**
```
Draft → Submitted → Under Review → Validated → Published
```

**Validation rules:**
- Budget totals must reconcile
- Values within expected ranges (with override justification)
- Required fields enforced
- Auto-save every 30 seconds

---

## 6. Design System: Rwanda Government Compliance

### 6.1 Color Palette

Based on the Government of Rwanda branding guidelines and the national flag:

```
Primary Colors (Rwanda Flag):
  --rw-blue:     #00A1DE   — Primary actions, links, active states
  --rw-green:    #20603D   — Success, positive indicators, growth
  --rw-yellow:   #FAD201   — Warnings, attention, highlights

Government UI Colors:
  --rw-dark:     #1A1A2E   — Top navigation bar, headings
  --rw-gray-900: #111827   — Primary text
  --rw-gray-600: #4B5563   — Secondary text
  --rw-gray-100: #F3F4F6   — Page backgrounds
  --rw-white:    #FFFFFF   — Cards, content areas

FSFVI Risk Scale:
  --risk-low:      #10B981  (green-500)   — FSFVI 0.00–0.30
  --risk-moderate: #F59E0B  (amber-500)   — FSFVI 0.31–0.50
  --risk-high:     #F97316  (orange-500)  — FSFVI 0.51–0.70
  --risk-critical: #EF4444  (red-500)     — FSFVI 0.71–1.00
```

### 6.2 Typography

- **Headings:** System font stack (Inter if available) — matches Irembo portal
- **Body:** 16px base, 1.5 line-height for readability
- **Data values:** Tabular figures (monospace numerals for alignment)
- **Kinyarwanda text:** Same fonts — Kinyarwanda uses Latin script, no special font needed

### 6.3 Government Header Pattern

Every page must display:
1. Rwanda coat of arms / government seal (top-left)
2. "Republic of Rwanda" / "Repubulika y'u Rwanda" text
3. Ministry name: "Ministry of Agriculture and Animal Resources"
4. System name: "Food Systems Financial Vulnerability Intelligence"
5. Language toggle (top-right): EN | RW | FR

### 6.4 Responsive Breakpoints

| Breakpoint | Target Device | Layout |
|---|---|---|
| < 640px | Mobile (district officers in field) | Single column, stacked cards |
| 640-1024px | Tablet (sector meetings) | Collapsed sidebar, 2-column grid |
| 1024-1280px | Laptop (district offices) | Full sidebar + 2-column content |
| > 1280px | Desktop (MINAGRI offices) | Full sidebar + 3-column content |

### 6.5 Adaptation from Current Design System

The existing demo portal uses `blue-600` as the primary color with `indigo → purple → pink` gradients. For Rwanda:

**Replace:**
- `from-blue-600` → `from-[#00A1DE]` (Rwanda blue)
- `from-indigo-600 via-purple-600 to-pink-700` → `from-[#00A1DE] via-[#20603D] to-[#1A1A2E]` (Rwanda gradient)
- Generic "Demo Government Portal" → "Republic of Rwanda — FSFVI Dashboard"
- `Shield` icon in header → Rwanda coat of arms SVG

---

## 7. Localization & Accessibility

### 7.1 Language Support

**Required languages:**
1. **English** — Primary (international stakeholders, development partners)
2. **Kinyarwanda** — Essential (field officers, district staff, ministers who prefer local language)
3. **French** — Secondary (regional cooperation, some government documents)

**Implementation approach:**

Create a `translations/` directory with JSON files:
```
translations/
├── en.json    — English (default)
├── rw.json    — Kinyarwanda
└── fr.json    — French
```

**Key terms in Kinyarwanda:**
| English | Kinyarwanda |
|---|---|
| Dashboard | Ikibaho |
| Assessment | Isuzuma |
| Budget | Ingengo y'imari |
| Agriculture | Ubuhinzi |
| District | Akarere |
| Province | Intara |
| Vulnerability | Ubushobozi buke |
| Food Security | Umutekano w'ibiribwa |
| Report | Raporo |
| Alert | Imenyesha |

**Implementation:** Use React Context + a `useTranslation()` hook. No heavy i18n library needed for 3 languages — a simple key-value lookup with fallback to English is sufficient.

### 7.2 Accessibility Requirements

Following Rwanda's Irembo portal patterns and WCAG 2.1 AA:

- **Keyboard navigation:** All interactive elements reachable via Tab, activated via Enter/Space
- **Screen readers:** ARIA labels on all charts, maps, and dynamic content
- **Color contrast:** 4.5:1 minimum for text (already handled by the proposed palette)
- **Focus indicators:** Visible focus rings on all interactive elements
- **Large touch targets:** 44x44px minimum for mobile (field officer usage)
- **Offline indicator:** Clear banner when network is unavailable
- **Loading states:** Skeleton screens, not just spinners (better perceived performance)
- **Error messages:** Descriptive, actionable, in current language

---

## 8. Data Model: Rwanda-Specific Structures

### 8.1 Geographic Types

```typescript
interface RwandaProvince {
  id: string;
  name: string;
  name_rw: string;
  code: string;         // e.g., "EAST", "NORTH", "SOUTH", "WEST", "KIGALI"
  districts: RwandaDistrict[];
  fsfvi_score?: number;
  population?: number;
}

interface RwandaDistrict {
  id: string;
  name: string;
  name_rw: string;
  province_id: string;
  code: string;           // e.g., "BUGESERA", "GATSIBO"
  sectors: RwandaSector[];
  fsfvi_score?: number;
  population?: number;
  arable_land_ha?: number;
  irrigated_land_ha?: number;
}

interface RwandaSector {
  id: string;
  name: string;
  name_rw: string;
  district_id: string;
}
```

### 8.2 Rwanda Fiscal & Seasonal Types

```typescript
// Rwanda fiscal year runs July to June
interface RwandaFiscalYear {
  label: string;        // e.g., "FY 2025/2026"
  start_year: number;   // 2025
  end_year: number;     // 2026
  start_date: string;   // "2025-07-01"
  end_date: string;     // "2026-06-30"
}

type RwandaSeason = 'season_a' | 'season_b' | 'season_c';

interface SeasonInfo {
  id: RwandaSeason;
  label: string;
  label_rw: string;
  months: string;
  description: string;
}

const RWANDA_SEASONS: SeasonInfo[] = [
  { id: 'season_a', label: 'Season A', label_rw: 'Igihembwe A', months: 'Sep – Feb', description: 'Main rainy season' },
  { id: 'season_b', label: 'Season B', label_rw: 'Igihembwe B', months: 'Mar – Jun', description: 'Second rainy season' },
  { id: 'season_c', label: 'Season C', label_rw: 'Igihembwe C', months: 'Jul – Aug', description: 'Dry season (irrigated)' },
];
```

### 8.3 PSTA 5 Alignment Types

```typescript
interface PSTA5Priority {
  id: string;
  title: string;
  title_rw: string;
  description: string;
  target_2029: string;             // PSTA 5 target
  current_value: string;           // Latest measured value
  mapped_fsfvi_components: string[]; // Which FSFVI components map here
  budget_allocated_rwf: number;
  budget_needed_rwf: number;
}
```

### 8.4 Currency & Formatting

```typescript
// All monetary values in RWF (Rwandan Franc)
// 1 USD ≈ 1,350 RWF (approximate, should be configurable)

function formatRWF(amount: number): string {
  return new Intl.NumberFormat('rw-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// For large amounts: "RWF 225B" or "FRw 225 miliyari"
function formatRWFCompact(amount: number): string {
  if (amount >= 1_000_000_000) return `RWF ${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `RWF ${(amount / 1_000_000).toFixed(1)}M`;
  return formatRWF(amount);
}
```

---

## 9. API Integration Map

### 9.1 Reuse Existing Endpoints

| Frontend Feature | Existing API | Notes |
|---|---|---|
| FSFVI Assessment | `govAssessmentAPI.runAssessment()` | Pass Rwanda-specific fiscal year |
| Quick Check | `govAssessmentAPI.quickCheck()` | Call per-province or per-district |
| Weighting Comparison | `govAssessmentAPI.compareWeightingMethods()` | Direct reuse |
| Scenario Analysis | `govAssessmentAPI.compareScenarios()` | Add Rwanda scenarios (drought, locust) |
| Trend Analysis | `govAssessmentAPI.analyzeTrend()` | Direct reuse with Rwanda fiscal years |
| Budget Allocation | `POST /api/v1/budget/calculate` | Map to Rwanda departments |
| Growth Rate | `POST /api/v1/budget/growth-rate` | Direct reuse |
| Debt Ratio | `POST /api/v1/budget/debt-ratio` | Direct reuse |
| Budget Projection | `POST /api/v1/budget/projection` | Use Rwanda growth assumptions |

### 9.2 New Endpoints Needed (Backend Work)

These require **backend modifications** in `demo_gov_backend` or `fsfi-backend`:

| Endpoint | Purpose | Priority |
|---|---|---|
| `GET /api/government/rwanda/provinces` | List provinces with FSFVI | High |
| `GET /api/government/rwanda/districts` | List/filter districts with FSFVI | High |
| `GET /api/government/rwanda/districts/:id` | Single district detail | High |
| `GET /api/government/rwanda/map-data` | Aggregated FSFVI for all 30 districts (map) | High |
| `POST /api/government/rwanda/data-entry` | Submit district data | Medium |
| `GET /api/government/rwanda/data-entry/status` | Submission workflow status | Medium |
| `GET /api/government/rwanda/psta5/alignment` | PSTA 5 priority tracking | Medium |
| `GET /api/government/rwanda/alerts` | Threshold-based alerts | Medium |
| `POST /api/government/rwanda/reports/generate` | PDF report generation | Low |

### 9.3 API Client Architecture

Create a new API module alongside the existing ones:

```typescript
// lib/fsfviApi/rwandaApi.ts

import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_DEMO_API_URL || 'http://localhost:8081';

class RwandaAPI {
  private getHeaders() {
    const token = localStorage.getItem('demo_auth_token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getProvinces(): Promise<RwandaProvince[]> { /* ... */ }
  async getDistricts(provinceId?: string): Promise<RwandaDistrict[]> { /* ... */ }
  async getDistrictDetail(districtId: string): Promise<RwandaDistrictDetail> { /* ... */ }
  async getMapData(fiscalYear: number): Promise<DistrictFSFVIMap> { /* ... */ }
  async submitData(data: DataEntryPayload): Promise<SubmissionResult> { /* ... */ }
  async getAlerts(): Promise<Alert[]> { /* ... */ }
  async getPSTA5Alignment(fiscalYear: number): Promise<PSTA5Priority[]> { /* ... */ }
  async generateReport(template: ReportTemplate, params: ReportParams): Promise<Blob> { /* ... */ }
}

export const rwandaAPI = new RwandaAPI();
```

---

## 10. File & Folder Structure

```
fsfvi-frontend/
├── app/
│   ├── rwanda/                              ← NEW: All Rwanda routes
│   │   ├── page.tsx                         — Redirect logic
│   │   ├── login/
│   │   │   └── page.tsx                     — Rwanda login
│   │   ├── change-password/
│   │   │   └── page.tsx                     — Password change
│   │   └── dashboard/
│   │       ├── page.tsx                     — National overview
│   │       ├── layout.tsx                   — Dashboard layout wrapper
│   │       ├── assessment/
│   │       │   └── page.tsx                 — FSFVI assessment (reuses component)
│   │       ├── provinces/
│   │       │   ├── page.tsx                 — All provinces
│   │       │   └── [id]/
│   │       │       └── page.tsx             — Single province
│   │       ├── districts/
│   │       │   ├── page.tsx                 — District ranking & comparison
│   │       │   └── [id]/
│   │       │       └── page.tsx             — Single district
│   │       ├── performance/
│   │       │   └── page.tsx                 — Performance gap (reuses component)
│   │       ├── budget/
│   │       │   └── page.tsx                 — Budget optimization (reuses component)
│   │       ├── psta5/
│   │       │   └── page.tsx                 — PSTA 5 tracker
│   │       ├── seasonal/
│   │       │   └── page.tsx                 — Seasonal dashboard
│   │       ├── reports/
│   │       │   └── page.tsx                 — Report generator
│   │       ├── alerts/
│   │       │   └── page.tsx                 — Alert center
│   │       └── data-entry/
│   │           └── page.tsx                 — Data submission
│   │
│   ├── demo/                                — Existing demo (keep intact)
│   └── developer/                           — Existing developer portal (keep intact)
│
├── components/
│   ├── rwanda/                              ← NEW: All Rwanda components
│   │   ├── layout/                          — Layout components
│   │   ├── overview/                        — National overview
│   │   ├── geographic/                      — Province/district views
│   │   ├── psta5/                           — PSTA 5 alignment
│   │   ├── seasonal/                        — Seasonal dashboard
│   │   ├── reports/                         — Report generation
│   │   ├── data-entry/                      — Data submission
│   │   ├── alerts/                          — Notifications
│   │   ├── shared/                          — Shared Rwanda utilities
│   │   └── auth/                            — Rwanda-branded auth
│   │
│   ├── assessment/                          — Existing (reuse)
│   ├── performance-gap/                     — Existing (reuse)
│   ├── budget-optimization/                 — Existing (reuse)
│   ├── demo/                                — Existing (keep)
│   └── ui/                                  — Existing (reuse)
│
├── contexts/
│   ├── RwandaGeographyContext.tsx            ← NEW
│   ├── LanguageContext.tsx                   ← NEW
│   ├── FiscalYearContext.tsx                 ← NEW
│   └── AlertContext.tsx                      ← NEW
│
├── hooks/
│   ├── useDemoAuth.ts                       — Existing (reuse for auth)
│   ├── useRwandaGeography.ts                ← NEW
│   ├── useTranslation.ts                    ← NEW
│   └── useAlerts.ts                         ← NEW
│
├── lib/
│   ├── fsfviApi/
│   │   ├── assessmentApi.ts                 — Existing
│   │   └── rwandaApi.ts                     ← NEW
│   ├── types/
│   │   ├── assessment.ts                    — Existing
│   │   └── rwanda.ts                        ← NEW
│   ├── constants/
│   │   └── rwanda.ts                        ← NEW (provinces, districts, seasons)
│   └── utils/
│       └── rwandaFormatters.ts              ← NEW (RWF formatting, dates)
│
├── translations/
│   ├── en.json                              ← NEW
│   ├── rw.json                              ← NEW
│   └── fr.json                              ← NEW
│
└── public/
    └── rwanda/
        ├── coat-of-arms.svg                 ← NEW
        ├── map-districts.svg                ← NEW (base SVG map)
        └── minagri-logo.svg                 ← NEW
```

---

## 11. Implementation Phases & Task Breakdown

### Phase 1: Foundation (Week 1-2)

**Goal:** Rwanda-branded shell with authentication, navigation, and national overview.

| # | Task | Files | Depends On |
|---|---|---|---|
| 1.1 | Create `/app/rwanda/` route structure (all pages as stubs) | `app/rwanda/**` | — |
| 1.2 | Build `RwandaDashboardLayout` (sidebar + topbar + Rwanda branding) | `components/rwanda/layout/*` | — |
| 1.3 | Build `RwandaLoginForm` (Rwanda-branded, reuse auth logic) | `components/rwanda/auth/*` | — |
| 1.4 | Create Rwanda constants file (provinces, districts, seasons) | `lib/constants/rwanda.ts` | — |
| 1.5 | Create Rwanda TypeScript types | `lib/types/rwanda.ts` | — |
| 1.6 | Create RWF formatting utilities | `lib/utils/rwandaFormatters.ts` | — |
| 1.7 | Set up `LanguageContext` + `useTranslation` hook | `contexts/`, `hooks/` | — |
| 1.8 | Create English translation file (baseline) | `translations/en.json` | — |
| 1.9 | Build `NationalOverview` page (headline FSFVI + province cards) | `components/rwanda/overview/*` | 1.4, 1.5 |
| 1.10 | Wire up auth flow (`/rwanda/login` → `/rwanda/dashboard`) | `app/rwanda/login/`, `app/rwanda/page.tsx` | 1.3 |

### Phase 2: Geographic Intelligence (Week 3-4)

**Goal:** Province and district drill-down with interactive map.

| # | Task | Files | Depends On |
|---|---|---|---|
| 2.1 | Build `RwandaMap` component (SVG choropleth by district) | `components/rwanda/overview/RwandaMap.tsx` | 1.4 |
| 2.2 | Build `ProvinceDetail` page | `components/rwanda/geographic/ProvinceDetail.tsx` | 1.4 |
| 2.3 | Build `DistrictDetail` page | `components/rwanda/geographic/DistrictDetail.tsx` | 1.4 |
| 2.4 | Build `DistrictRanking` (all 30 districts sorted by FSFVI) | `components/rwanda/geographic/DistrictRanking.tsx` | 1.4 |
| 2.5 | Build `DistrictComparison` (side-by-side) | `components/rwanda/geographic/DistrictComparison.tsx` | 1.4 |
| 2.6 | Build `GeographicBreadcrumb` | `components/rwanda/geographic/GeographicBreadcrumb.tsx` | 1.4 |
| 2.7 | Set up `RwandaGeographyContext` | `contexts/RwandaGeographyContext.tsx` | 1.4 |
| 2.8 | Create `rwandaApi.ts` client (getProvinces, getDistricts, getMapData) | `lib/fsfviApi/rwandaApi.ts` | — |
| 2.9 | **BACKEND:** Add Rwanda geographic endpoints to demo_gov_backend | `demo_gov_backend/src/handlers/` | — |

### Phase 3: Reuse Integration (Week 5)

**Goal:** Wire existing assessment, performance, and budget components into Rwanda routes.

| # | Task | Files | Depends On |
|---|---|---|---|
| 3.1 | Wire `AssessmentDashboard` into `/rwanda/dashboard/assessment` | `app/rwanda/dashboard/assessment/page.tsx` | Phase 1 |
| 3.2 | Wire `PerformanceGapDashboard` into `/rwanda/dashboard/performance` | `app/rwanda/dashboard/performance/page.tsx` | Phase 1 |
| 3.3 | Wire `BudgetOptimizationDashboard` into `/rwanda/dashboard/budget` | `app/rwanda/dashboard/budget/page.tsx` | Phase 1 |
| 3.4 | Adapt fiscal year selectors to Rwanda FY (Jul-Jun) | Shared components | 1.5 |
| 3.5 | Adapt currency displays to RWF | Shared components | 1.6 |

### Phase 4: Rwanda-Specific Features (Week 6-7)

**Goal:** PSTA 5 tracker, seasonal dashboard, and alerts.

| # | Task | Files | Depends On |
|---|---|---|---|
| 4.1 | Build `PSTA5Dashboard` with priority cards | `components/rwanda/psta5/*` | Phase 1 |
| 4.2 | Build `SeasonalDashboard` with season selector | `components/rwanda/seasonal/*` | 1.4 |
| 4.3 | Build `AlertCenter` + `AlertCard` | `components/rwanda/alerts/*` | Phase 1 |
| 4.4 | Set up `AlertContext` with threshold checking | `contexts/AlertContext.tsx` | 4.3 |
| 4.5 | Add alert badge to sidebar navigation | Layout components | 4.4 |
| 4.6 | **BACKEND:** Add PSTA 5 alignment endpoint | Backend | — |
| 4.7 | **BACKEND:** Add alert/threshold endpoint | Backend | — |

### Phase 5: Data Entry & Reports (Week 8-9)

**Goal:** District data submission and report generation.

| # | Task | Files | Depends On |
|---|---|---|---|
| 5.1 | Build `DataEntryForm` with validation | `components/rwanda/data-entry/*` | Phase 1 |
| 5.2 | Build `SubmissionHistory` with status workflow | `components/rwanda/data-entry/*` | 5.1 |
| 5.3 | Build `ReportGenerator` with template selection | `components/rwanda/reports/*` | Phase 1 |
| 5.4 | Implement PDF generation (client-side or backend) | Reports module | 5.3 |
| 5.5 | **BACKEND:** Add data entry endpoints | Backend | — |
| 5.6 | **BACKEND:** Add report generation endpoint | Backend | — |

### Phase 6: Localization & Polish (Week 10)

**Goal:** Kinyarwanda translation, French translation, accessibility audit.

| # | Task | Files | Depends On |
|---|---|---|---|
| 6.1 | Complete Kinyarwanda translation file | `translations/rw.json` | All phases |
| 6.2 | Complete French translation file | `translations/fr.json` | All phases |
| 6.3 | Build `LanguageToggle` component | `components/rwanda/shared/LanguageToggle.tsx` | 1.7 |
| 6.4 | Accessibility audit (keyboard nav, ARIA, contrast) | All components | All phases |
| 6.5 | Mobile responsiveness testing & fixes | All components | All phases |
| 6.6 | Offline mode indicator | `components/rwanda/shared/ConnectivityIndicator.tsx` | — |
| 6.7 | Loading skeleton screens for all data pages | All components | All phases |
| 6.8 | Error boundary for graceful failure | Layout wrapper | — |

---

## 12. Testing Strategy

### 12.1 Component Testing

Use **Vitest + React Testing Library** (add to devDependencies):

```
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Priority components to test:**
- `RwandaMap` — click events map to correct district
- `NationalOverview` — renders with mock assessment data
- `DataEntryForm` — validation rules, submit flow
- `LanguageToggle` — switches locale, all text updates
- `FiscalYearSelector` — Rwanda FY logic (Jul-Jun)
- `CurrencyDisplay` — RWF formatting edge cases

### 12.2 Integration Testing

- Auth flow: `/rwanda/login` → 2FA → `/rwanda/dashboard`
- Geographic drill-down: overview → province → district
- Data entry: form → submit → status tracking
- Language switching mid-session (no data loss)

### 12.3 API Mock Strategy

Create a `__mocks__/` directory with:
- Mock Rwanda provinces/districts data
- Mock FSFVI assessment responses
- Mock PSTA 5 alignment data

Use **MSW (Mock Service Worker)** for realistic API mocking during development.

### 12.4 Visual Regression

Use **Playwright** for screenshot comparison:
- National overview at each breakpoint (mobile, tablet, desktop)
- Rwanda map with different FSFVI scenarios
- Report preview before PDF generation

---

## 13. Deployment Considerations

### 13.1 Rwanda-Specific Infrastructure

| Concern | Recommendation |
|---|---|
| **Hosting region** | AWS Africa (Cape Town) or Azure South Africa — lowest latency to Kigali |
| **CDN** | Cloudflare with Kigali PoP for static assets |
| **Database** | PostgreSQL (already used by fsfi-backend) — migrate from SQLite for gov backend |
| **Domain** | `fsfvi.minagri.gov.rw` or `fsfvi.gov.rw` (coordinate with RISA) |
| **SSL** | Mandatory — Government of Rwanda requires HTTPS |
| **Backup** | Daily automated backups with 90-day retention |

### 13.2 Performance Targets

| Metric | Target | Rationale |
|---|---|---|
| First Contentful Paint | < 2s | District offices may have 3G connections |
| Time to Interactive | < 4s | Must be usable quickly for briefings |
| Largest Contentful Paint | < 3s | Map + data should load fast |
| API response time | < 500ms | Assessment calculations are CPU-intensive |
| Bundle size (initial) | < 200KB gzipped | Bandwidth constraints in rural areas |

### 13.3 Offline Considerations

District agricultural officers may have intermittent connectivity. Consider:
- **Service Worker** for caching the app shell + recently viewed data
- **Offline indicator** banner (already planned)
- **Queue data entry submissions** when offline, sync when back online
- **Static fallback map** — pre-rendered SVG that works without API

### 13.4 Security Compliance

The existing auth system is already government-grade (JWT + 2FA + audit logging). For Rwanda deployment:
- Enable **mandatory 2FA** for all government users
- Configure **IP whitelisting** for MINAGRI office networks
- Set **session timeout to 15 minutes** (stricter than current 30)
- Enable **audit log export** for Rwanda's compliance requirements
- Coordinate with **NCSA** (National Cyber Security Authority) for security review

---

## Summary

The Rwanda government-facing frontend builds on a solid existing foundation. The core FSFVI assessment, performance gap, and budget optimization engines are fully functional and can be reused directly. The primary development effort is:

1. **Rwanda branding & layout** — Government seal, national color scheme, multi-language support
2. **Geographic intelligence** — Province/district drill-down with interactive map
3. **Rwanda-specific features** — PSTA 5 alignment, seasonal dashboard, data entry portal
4. **Localization** — Kinyarwanda and French translations
5. **Backend extensions** — Geographic aggregation endpoints, data entry workflow, report generation

**Estimated effort:** 10 weeks for a senior frontend developer, with backend support for new endpoints in parallel.

**Key principle:** Build within the existing Next.js 16 + React 19 + Tailwind v4 + shadcn/ui stack. Do not introduce new frameworks. Reuse every existing component possible. Make Rwanda-specific adaptations through composition, not duplication.

---

*This guide should be reviewed by the project technical lead and Rwanda stakeholders before implementation begins.*
