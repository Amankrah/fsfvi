# Rwanda Backend Data Pipeline Guide

Full step-by-step guide to set up and run the Rwanda FSFSI backend from scratch.

---

## Prerequisites

- **Python 3.10+**
- **Rust toolchain** (for building the FSFSI engine)
- **Git** (project cloned)
- **Internet connection** (for World Bank API fetch in Step 3)

### Data Files Required

These Excel files should be in the project root (`/fsfvi/`):

| File | Purpose |
|------|---------|
| `budget_lines_to_food_system_indicators_mapping.xlsx` | Budget lines mapped to indicators (FY2018–FY2023), ~6,700 rows |
| `FSFSI_indicator_level_parameters.xlsx` | Indicator benchmarks, observed values, sensitivity (alpha), calibrated by IFPRI |

### Key Concepts

- **All monetary values are in local currency (RWF)**, stored as billions in the DB (`weighted_lcu_bn`)
- **Sensitivity parameter (alpha)** from the Excel is `alpha_per_bnLCU` — calibrated for allocations in billions LCU
- The **Excel parameters file is the source of truth** for benchmarks, observed values, and alpha
- The Rust engine computes stress as `v = δ · e^(-α·f)` where `f` = `weighted_lcu_bn` (billions) and `α` = `alpha_per_bnLCU`

---

## 1. Environment Setup

```bash
cd rwanda_backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install django==5.2 djangorestframework django-cors-headers django-filter openpyxl requests

# Build and install the Rust FSFSI engine (PyO3 module)
cd fsfi_engine
pip install maturin
maturin develop --release
cd ..
```

### Verify the Rust engine loads

```bash
python -c "import fsfi_engine; print('Rust engine OK')"
```

---

## 2. Database Setup

The project uses **SQLite** by default (no extra config needed for development).
For PostgreSQL, set these environment variables:

```bash
export DB_ENGINE=django.db.backends.postgresql
export DB_NAME=fsfvi_db
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_HOST=localhost
export DB_PORT=5432
```

### Run migrations

```bash
python manage.py migrate
```

---

## 3. Create Admin User

```bash
# Quick admin user
python manage.py register_user \
  --username admin \
  --email admin@minagri.gov.rw \
  --full-name "System Admin" \
  --role admin \
  --admin

# Or set a password for an existing user
python manage.py set_password --username admin --password your_password
```

---

## 4. Data Pipeline

Run these commands **in order**. Each step depends on the previous one.

### Step 1: Import Budget Mapping

Imports indicators and budget allocations from the Excel file.
Reads the **Mapping sheet** to aggregate budget data **per fiscal year** (FY2018–FY2023),
and the **Indicator_Summary sheet** to create indicator definitions.

```bash
python manage.py import_budget_mapping \
  ../budget_lines_to_food_system_indicators_mapping.xlsx
```

**What it does:**
- Creates `Indicator` records (33 indicators across 8 components)
- Creates `IndicatorData` records with budget allocations (`gross_lcu_bn`, `weighted_lcu_bn`) per indicator per year
- Creates `BudgetLineMapping` audit trail records (~6,700 rows)

**Expected output:**
```
Indicator_Summary: ...
Mapping sheet: 6772 BudgetLineMapping rows created
FY2018: 30 indicators (budget from Mapping sheet)
FY2019: 30 indicators (budget from Mapping sheet)
...
FY2023: 31 indicators (budget from Mapping sheet)
```

> **Single year only:** `python manage.py import_budget_mapping ../file.xlsx --fiscal-year 2024`

---

### Step 2: Import Indicator Parameters (Source of Truth)

Adds benchmark values, observed values, units, direction, and sensitivity parameters
(`alpha_per_bnLCU`) from the IFPRI parameters Excel file.

**This step is the authoritative source** for benchmarks and alpha — it overwrites
any values from Step 1 or `compute_benchmark_sample`. Always run this AFTER budget
mapping and AFTER any benchmark computation.

```bash
python manage.py import_indicator_parameters \
  ../FSFSI_indicator_level_parameters.xlsx \
  --default-fiscal-year 2024
```

**What it does:**
- Updates `Indicator` records: `unit`, `higher_is_better`, `default_sensitivity` (alpha)
- Updates `IndicatorData` for FY2024: `observed_value`, `benchmark_value`, `sensitivity_parameter`

**Expected output:**
```
Indicators updated: 33
IndicatorData updated: 33
```

---

### Step 3: Fetch Rwanda Observed Values (Intermediate Years)

Fetches actual country-level data from the **World Bank API** for indicators
with WB mappings. For indicators without WB data, uses **linear interpolation**
between FY2018 and FY2024 endpoint values.

Creates `IndicatorData` rows for intermediate years that don't exist yet.

```bash
python manage.py fetch_rwanda_observed \
  --fiscal-years 2019,2020,2021,2022,2023 \
  --apply
```

**Flags:**
- `--apply` — write to database (omit for preview)
- `--fiscal-years` — comma-separated years to populate (default: 2019–2023)
- `--start-year` — interpolation start (default: 2018)
- `--end-year` — interpolation end (default: 2024)

**Requires internet** for World Bank API calls (~20 indicators queried).

**Expected output:**
```
Fetching from World Bank API...
  IND-01 (Cereal yield): OK (2019=1.44, 2020=1.47, ...)
  IND-03 (Fertilizer use): OK (2019=25.04, ...)
  ...
Summary:
  World Bank data filled: 46
  Interpolated (FY2018->FY2024): 115
  New records created: 161
```

---

### Step 4: Propagate Alpha and Benchmarks to All Years

The parameters Excel only writes to FY2024. Intermediate years (FY2019–2023) and
FY2018 need the same alpha and benchmark values. This step fills NULL values from
the best available year (preferring FY2024).

```bash
python manage.py shell -c "
from apps.fsfvi_data.models import IndicatorData, Indicator
count = 0
for ind in Indicator.objects.all():
    alpha = ind.default_sensitivity
    ref = IndicatorData.objects.filter(
        indicator=ind, benchmark_value__isnull=False
    ).order_by('-fiscal_year').first()
    bench = ref.benchmark_value if ref else None
    for data in IndicatorData.objects.filter(indicator=ind):
        changed = False
        if data.sensitivity_parameter is None and alpha is not None:
            data.sensitivity_parameter = alpha
            changed = True
        if data.benchmark_value is None and bench is not None:
            data.benchmark_value = bench
            changed = True
        if changed:
            data.save(update_fields=['sensitivity_parameter', 'benchmark_value'])
            count += 1
print(f'Propagated alpha/benchmark to {count} rows')
"
```

---

### Step 5: Impute Missing Observed Values

Fills any remaining NULL observed values using fallback formulas:
1. If `observed_value` exists → keep it
2. If NULL but `benchmark_value` exists → use benchmark (neutral gap, δ = 0)
3. If both NULL → use `share_weighted_percent × 100` (synthetic)

```bash
for year in 2018 2019 2020 2021 2022 2023 2024; do
  python manage.py compute_observed_imputed --fiscal-year $year --apply
done
```

**Expected output (per year):**
```
No rows with NULL observed_value to update.
```
(If Steps 2–4 filled everything, this is a safety net.)

---

### Step 6: Run FSFSI Assessments

Runs the **Rust FSFSI engine** for each fiscal year. Computes system-level FSFSI scores,
component-level stress, optimal allocation, efficiency index, and stores results
for the dashboard.

The engine uses:
- `weighted_lcu_bn` as the financial allocation `f` (in billions LCU)
- `sensitivity_parameter` as `α` (from Excel `alpha_per_bnLCU`)
- `observed_value` and `benchmark_value` for the performance gap `δ`

```bash
python manage.py run_assessments_all_years \
  --years 2018,2019,2020,2021,2022,2023,2024
```

**Flags:**
- `--years` — comma-separated years (default: all years with IndicatorData)
- `--dry-run` — list years and indicator counts without running

**Expected output (with hybrid weighting):**
```
FY2018: saved assessment ... (FSFSI=0.4070)
FY2019: saved assessment ... (FSFSI=0.4296)
FY2020: saved assessment ... (FSFSI=0.4227)
FY2021: saved assessment ... (FSFSI=0.4214)
FY2022: saved assessment ... (FSFSI=0.4095)
FY2023: saved assessment ... (FSFSI=0.3953)
FY2024: saved assessment ... (FSFSI=0.2894)
Done. Saved 7 assessment(s).
```

The engine uses **hybrid weights** by default (expert AHP + network PageRank + financial).
Policymakers can choose from 5 weighting methods via the UI:

| Method | FY2024 FSFSI | Description |
|---|---|---|
| **Hybrid** (default) | 0.2894 | Balanced: expert + network + financial |
| Equal | 0.2895 | All indicators equally important |
| Expert (AHP) | 0.2881 | Nutrition & crop production priority |
| Financial | 0.2131 | Budget-proportional (favors funded sectors) |
| Network (PageRank) | 0.3018 | Systemic interdependencies |

> **Reference:** The Excel computes FSFSI = 0.3624 for FY2024 using equal weights (1/37).
> The difference from the engine's equal-weight result (0.2895) is due to some indicators
> having different observed/benchmark values from the imputation steps.

The assessment also computes **cumulative FSFSI** (asymmetric EMA accounting for
damage persistence). See the [Cumulative Stress Technical Note](CUMULATIVE_STRESS_TECHNICAL_NOTE.md).

### Step 7 (optional): Budget history analysis (financial view)

After **Step 1** (`import_budget_mapping`) has populated `IndicatorData`, you can **summarise
multi-year mapped spending** (totals, YoY volatility, CAGR, concentration, composition drift,
indicator movers, mapping quality) — independent of FSFSI assessments and Rust optimization.

```bash
python manage.py run_budget_analysis
python manage.py run_budget_analysis --start-year 2018 --end-year 2024 --json
```

**Flags:**
- `--start-year` / `--end-year` — optional bounds (defaults: min/max fiscal years in `IndicatorData` with **FY ≥ 2018**, consistent with assessments and the dashboard)
- `--json` — print the full API-shaped payload (same shape as `GET /api/budget-analysis/history/`)

**API (authenticated):**
- `GET /api/budget-analysis/history/?start_year=&end_year=&top_movers=` — multi-year financial analysis (only FY **≥ 2018**)
- `GET /api/budget-analysis/snapshot/?fiscal_year=` — single-year indicator + component breakdown (FY **≥ 2018** only)

**Allocation efficiency and reallocation** remain on **Optimization** (`/api/optimization/.../`)
and **Planning**; they are not part of budget analysis.

---

## 5. Start the Server

```bash
python manage.py runserver 0.0.0.0:8000
```

The API is now available at `http://localhost:8000/api/`.

Key endpoints:

**Assessment:**
- `POST /api/assessments/run-for-year/` — run assessment (accepts `weighting_method`, `scenario`)
- `GET /api/assessments/dashboard/?fiscal_year=2024` — dashboard summary (includes cumulative FSFSI)
- `GET /api/assessments/available-years/` — fiscal years with data
- `GET /api/assessments/history/` — trend data (includes cumulative)
- `GET /api/assessments/persistence-config/` — cumulative stress parameters
- `PUT /api/assessments/persistence-config/` — update parameters & recalculate

**Optimization (assessment-based, Rust closed-form optimum):**
- `GET /api/optimization/<assessment_id>/efficiency/` — allocation efficiency
- `GET /api/optimization/<assessment_id>/reallocation/` — reallocation plan
- `GET /api/optimization/<assessment_id>/roi/` — ROI analysis

**Budget analysis (mapped spending history — `IndicatorData` only):**
- `GET /api/budget-analysis/history/?start_year=&end_year=&top_movers=` — trends, composition, movers, insights
- `GET /api/budget-analysis/snapshot/?fiscal_year=` — one-year breakdown by indicator and component

**Planning (assessment-based):**
- `GET /api/planning/<assessment_id>/multi-year/` — multi-year plan (accepts `weighting_method`, `scenario`, `target_curve`)
- `GET /api/planning/<assessment_id>/mtef/` — 3-year MTEF
- `POST /api/planning/saved-plans/` — save a strategic plan
- `GET /api/planning/saved-plans/?fiscal_year=2024` — list saved plans for that year (summary rows, no embedded `plan_json`)
- `GET /api/planning/saved-plans/<plan_id>/` — full saved plan including `plan_json`
- `POST /api/planning/saved-plans/<plan_id>/activate/` — mark a plan active for its fiscal year (National Overview)
- `DELETE /api/planning/saved-plans/<plan_id>/` — permanently delete saved plan
- `PATCH /api/planning/saved-plans/<plan_id>/` — update name and/or parameters (regenerates stored plan when parameters change)
- `GET /api/planning/active-plan/?fiscal_year=2024` — active plan excerpt for dashboard

**Auth:**
- `GET /api/auth/verify/` — verify JWT token

---

## Quick Reference: Full Pipeline (Copy-Paste)

```bash
cd rwanda_backend
source venv/bin/activate

# Migrations
python manage.py migrate

# Step 1: Budget mapping (all years from Mapping sheet)
python manage.py import_budget_mapping \
  ../budget_lines_to_food_system_indicators_mapping.xlsx

# Step 2: Indicator parameters (source of truth for benchmarks + alpha)
python manage.py import_indicator_parameters \
  ../FSFSI_indicator_level_parameters.xlsx \
  --default-fiscal-year 2024

# Step 3: Fetch observed values for intermediate years (needs internet)
python manage.py fetch_rwanda_observed \
  --fiscal-years 2019,2020,2021,2022,2023 --apply

# Step 4: Propagate alpha and benchmarks to all years
python manage.py shell -c "
from apps.fsfvi_data.models import IndicatorData, Indicator
count = 0
for ind in Indicator.objects.all():
    alpha = ind.default_sensitivity
    ref = IndicatorData.objects.filter(indicator=ind, benchmark_value__isnull=False).order_by('-fiscal_year').first()
    bench = ref.benchmark_value if ref else None
    for data in IndicatorData.objects.filter(indicator=ind):
        changed = False
        if data.sensitivity_parameter is None and alpha is not None:
            data.sensitivity_parameter = alpha; changed = True
        if data.benchmark_value is None and bench is not None:
            data.benchmark_value = bench; changed = True
        if changed:
            data.save(update_fields=['sensitivity_parameter', 'benchmark_value']); count += 1
print(f'Propagated to {count} rows')
"

# Step 5: Impute any remaining missing observed values
for year in 2018 2019 2020 2021 2022 2023 2024; do
  python manage.py compute_observed_imputed --fiscal-year $year --apply
done

# Step 6: Run assessments
python manage.py run_assessments_all_years \
  --years 2018,2019,2020,2021,2022,2023,2024

# Start server
python manage.py runserver 0.0.0.0:8000
```

---

## Optional: Compute Benchmarks from Reference Distributions

Use this **only** when the parameters Excel is not available and you need to derive
benchmarks from global reference data. Do NOT run this after `import_indicator_parameters`
as it will overwrite the Excel's calibrated benchmarks.

```bash
python manage.py compute_benchmark_sample \
  --fiscal-year 2024 --apply --fill-missing
```

- Uses `apps/fsfvi_data/data/reference_distributions.json` (World Bank/FAOSTAT country-level data)
- For higher-is-better indicators → 90th percentile = benchmark
- For lower-is-better indicators → 10th percentile = benchmark

---

## FSFSI Stress Thresholds

The FSFSI is bounded on (0, 1). Classification thresholds (aligned with the Rust engine):

| Stress Level | FSFSI Range | Color |
|---|---|---|
| **Low** | ≤ 0.05 | Green |
| **Medium** | 0.05 – 0.15 | Yellow |
| **High** | 0.15 – 0.30 | Orange |
| **Critical** | > 0.30 | Red |

---

## Architecture: Single Source of Truth

```
Excel (FSFSI_indicator_level_parameters.xlsx)
  ↓ benchmarks, observed, alpha_per_bnLCU
  ↓
DB (IndicatorData)
  ↓ weighted_lcu_bn, observed_value, benchmark_value, sensitivity_parameter
  ↓
Assessment Engine (Rust: py_run_indicator_assessment)
  ↓ FSFSI score + hybrid weights (source of truth)
  ↓ weighting_method: hybrid | equal | expert | financial | network
  ↓ scenario: normal_operations | climate_shock | financial_crisis | pandemic | political
  ↓
Cumulative Stress Layer (Python: asymmetric EMA)
  ↓ cumulative_fsfsi = accumulated damage with slow recovery
  ↓ per-indicator, per-component, system-level
  ↓
AssessmentResult + ComponentResult + IndicatorResult (DB)
  ↓ stores both current and cumulative stress
  ↓
Optimization (Rust → Python stamp)
  ↓ uses assessment's FSFSI, computes optimal allocation
  ↓
Planning (Rust → Python stamp + cumulative EMA projection)
  ↓ multi-year trajectory with component recovery
  ↓ saved plans persisted to DB
  ↓
Dashboard (Frontend)
  ↓ National Overview: cumulative FSFSI (the real state)
  ↓ Assessment: current + cumulative, weighting/scenario selectors
  ↓ Optimization: current FSFSI (this year's allocation efficiency)
  ↓ Planning: cumulative baseline, recovery trajectory, saved plans
```

The assessment engine is the **single source of truth** for FSFSI scores.
The cumulative stress layer adds temporal persistence (damage accumulates fast,
recovery is slow). Optimization and planning consume the assessment and
never re-derive the FSFSI.

See [CUMULATIVE_STRESS_TECHNICAL_NOTE.md](CUMULATIVE_STRESS_TECHNICAL_NOTE.md) for the full technical specification.

---

## 8 Food System Components

| Component | Indicators | Alpha | Hybrid Weight | Description |
|---|---|---|---|---|
| Nutrition | 3 | 0.040 | 16.4% | Stunting, food insecurity, dietary diversity |
| Crop Production | 5 | 0.035 | 15.0% | Yields, irrigation, fertilizer, seeds, diversification |
| Markets | 4 | 0.020 | 14.9% | Market access, exports, price volatility, cooperatives |
| Finance | 2 | 0.030 | 13.1% | Credit access, insurance |
| Post-Harvest | 5 | 0.025 | 10.8% | Losses, storage, cold chain, processing, food quality |
| Animal Systems | 5 | 0.030 | 10.6% | Milk, meat, breeds, mortality, feed |
| Research | 4 | 0.015 | 10.3% | Extension, R&D spending, mechanization, technology |
| Environment | 5 | 0.020 | 9.0% | Soil erosion, CSA, protected areas, water, disasters |

Hybrid weights combine expert judgment (AHP, 35%), network centrality (PageRank, 30%),
cascade impact (25%), and financial proportionality (10%). Policymakers can switch
to any of the 5 weighting methods via the UI.

---

## Troubleshooting

### "No module named 'fsfi_engine'"
The Rust engine is not installed. Run:
```bash
cd fsfi_engine && pip install maturin && maturin develop --release && cd ..
```

### "No module named 'requests'"
```bash
pip install requests
```

### "No Assessment Data" on dashboard
Run Step 6 (`run_assessments_all_years`). The dashboard reads from `AssessmentResult`,
not from `IndicatorData`.

### Assessment FSFSI differs from Excel
The engine uses hybrid weights by default, while the Excel uses equal weights (1/37).
Select "Equal weights" in the weighting dropdown to match the Excel exactly.
The alpha and allocation units must match: both in billions LCU (`alpha_per_bnLCU` × `weighted_lcu_bn`).

### Assessment fails with "Budget constraint error: allocation=0.00"
That fiscal year has no budget data. Re-run Step 1 (`import_budget_mapping`)
without `--fiscal-year` to import all years from the Mapping sheet.

### Benchmarks/alpha missing for intermediate years
Run Step 4 (propagate alpha/benchmarks). The parameters Excel only writes to
FY2024 — intermediate years need values propagated.

### `compute_benchmark_sample` overwrote Excel benchmarks
Run `import_indicator_parameters` again (Step 2) — it is the last word on
benchmarks. Only use `compute_benchmark_sample` when the Excel is not available.

### All weighting methods give the same result
The Rust engine must be rebuilt after changing the weighting dispatch code.
Run `cd fsfi_engine && maturin develop --release && cd ..`.

### Optimization shows unrealistic reallocation (e.g., 4000% increase)
The FSFSI paper's closed-form solution assumes unconstrained reallocation.
Real-world budgets have constraints (max ±30% per year). The optimization shows
the theoretical optimum — the Strategic Planning page spreads changes over years.

### Cumulative FSFSI not updating after config change
After changing persistence parameters (rho_up/rho_down), click "Save & Recalculate"
in the Cumulative Stress Parameters panel. This clears and recomputes all historical
cumulative values in chronological order.

### DecimalField overflow on yoy_change_percent
Already fixed in migration `0003_widen_yoy_change_percent`. Run `python manage.py migrate`.
