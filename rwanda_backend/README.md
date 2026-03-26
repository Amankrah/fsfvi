# Rwanda FSFI Backend

Django REST API and data layer for the **Food Systems Financial Intelligence (FSFI)** Rwanda government dashboard. Heavy numerical work (FSFSI stress, JWT/MFA helpers) runs in the **Rust** extension `fsfi_engine` (PyO3), imported as a normal Python module after you build it.

For a **longer step-by-step data pipeline** (Excel paths, assessment details, weighting notes), see the repo root guide: **`RWANDA_BACKEND_PIPELINE_GUIDE.md`**.

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Python 3.10+** | Same range as `fsfi_engine` |
| **Rust toolchain** | `rustup` stable; needed to compile PyO3 extension |
| **maturin** | `pip install "maturin>=1,<2"` (build tool) |
| **Internet** | For `fetch_rwanda_observed` (World Bank API) |

Optional for production: **PostgreSQL** (see environment variables below). Default dev DB is **SQLite** (`db.sqlite3` in this folder).

---

## Quick start

From the **`rwanda_backend`** directory:

```bash
# 1) Virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# 2) Python dependencies
pip install -r requirements.txt

# 3) Build and install the Rust engine (PyO3 — not on PyPI)
cd fsfi_engine
maturin develop --release
cd ..

# 4) Sanity check
python -c "import fsfi_engine; print('fsfi_engine OK')"

# 5) Environment (minimal)
copy .env.example .env   # if you maintain one; or set vars manually — see below

# 6) Database
python manage.py migrate

# 7) Run server
python manage.py runserver
```

### Important environment variables

Create a `.env` in `rwanda_backend` (loaded by `python-dotenv` in `rwanda_project/settings.py`) or export in the shell:

| Variable | Purpose |
|----------|---------|
| `DJANGO_SECRET_KEY` | Production: long random string |
| `DJANGO_DEBUG` | `False` in production |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hosts |
| `FSFI_JWT_SECRET` | Must match what the engine uses for tokens (min ~32 chars) |
| `FSFI_ENCRYPTION_KEY` | 32-character key for crypto helpers in Rust |
| `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Use `django.db.backends.postgresql` + credentials in production |
| `CORS_ALLOWED_ORIGINS` | e.g. `http://localhost:3001` for the Next.js app |

---

## First user

```bash
python manage.py register_user --username admin --email admin@example.gov.rw --full-name "Admin" --role admin --admin
python manage.py set_password --username admin --password "your-secure-password"
```

---

## World Bank JSON files in this folder (`wb_new_data.json`, `wb_additional_data.json`)

These two files sit at **`rwanda_backend/wb_new_data.json`** and **`rwanda_backend/wb_additional_data.json`**. They are **reference exports** of World Bank–style data (indicator metadata + numeric arrays). Merge them into the app’s reference file with:

```bash
python manage.py merge_wb_reference_exports --apply
```

That updates **`apps/fsfvi_data/data/reference_distributions.json`** (a `.json.bak` backup is written first). Use before `compute_benchmark_sample` if you want those pools in percentile benchmarks; **`import_indicator_parameters` still overwrites benchmarks** when you run it afterward (see pipeline guide).

| File | Shape (summary) | Typical use |
|------|-----------------|-------------|
| **`wb_new_data.json`** | Keys are **FSFI codes** (`IND-01`, `IND-06`, …). Each entry has `name`, `unit`, `wb_indicator`, and a long **`values`** array (one series per indicator). | Offline snapshot or analysis; aligns with **indicator-level** thinking used in `reference_distributions.json`. |
| **`wb_additional_data.json`** | Keys are **raw World Bank series codes** (e.g. `SH.ANM.ALLW.ZS`). Each entry has `name`, `count`, `min`, `max`, and **`values`** (pooled sample across countries/years). | Building or auditing **global reference pools** for percentile benchmarks. |

### How this relates to the running app

1. **`fetch_rwanda_observed`** does **not** load these JSON files. It calls the **live [World Bank API](https://api.worldbank.org/)** for Rwanda (`RWA`) using the mapping in `apps/fsfvi_data/management/commands/fetch_rwanda_observed.py` (`WB_INDICATOR_MAP`: `IND-xx` → WB code). It fills `IndicatorData.observed_value` for chosen fiscal years and interpolates between anchor years when WB has gaps.

2. **Benchmark percentiles (global reference)** for `compute_benchmark_sample` come from **`apps/fsfvi_data/data/reference_distributions.json`**, documented in **`apps/fsfvi_data/data/REFERENCE_DATA_MAPPING.md`**. That JSON uses FSFI codes under `indicators` with `values` arrays. You can think of `wb_new_data.json` / `wb_additional_data.json` as **sibling or source material** when regenerating or validating `reference_distributions.json`, but the pipeline **as shipped** reads **`reference_distributions.json`**, not the `wb_*.json` root files.

3. **`merge_wb_reference_exports`** (above) loads both JSON files into `reference_distributions.json`. They do **not** replace `fetch_rwanda_observed` (Rwanda year series still comes from the World Bank API or interpolation).

---

## Data pipeline (recommended order)

Place the IFPRI Excel files where the commands can see them (paths below assume repo layout with `fsfvi` as parent of `rwanda_backend`):

| Step | Command | Notes |
|------|---------|--------|
| 0 (optional) | `python manage.py seed_indicators` | Creates all **37** indicator definitions if you start without Excel |
| 1 | `python manage.py import_budget_mapping ../budget_lines_to_food_system_indicators_mapping.xlsx` | Budget lines → indicators; `IndicatorData` with LCU billions |
| 2 | `python manage.py import_indicator_parameters ../FSFSI_indicator_level_parameters.xlsx --default-fiscal-year 2024` | Benchmarks, observed, alpha; **source of truth** for parameters sheet |
| 3 | `python manage.py fetch_rwanda_observed --fiscal-years 2019,2020,2021,2022,2023 --apply` | Live WB API + interpolation; requires network |
| 4 | Propagate alpha/benchmarks to all years | See **`RWANDA_BACKEND_PIPELINE_GUIDE.md`** (shell snippet) |
| 5 | `python manage.py compute_observed_imputed --fiscal-year YYYY --apply` | Per year; fills remaining NULL observed values |
| 6 | `python manage.py run_assessments_all_years --years 2018,2019,2020,2021,2022,2023,2024` | Runs Rust FSFSI engine; stores assessments |

**Optional:**

- `python manage.py compute_benchmark_sample` — uses `reference_distributions.json` (+ fallbacks) to set sample benchmarks; run **before** `import_indicator_parameters` if you use it at all (Excel import overwrites authoritative fields when run after).
- `python manage.py run_budget_analysis` — multi-year **budget** analytics (separate from FSFSI scores).
- `python manage.py seed_psta5` — PSTA 5 alignment seed data (planning app).

---

## Management commands (reference)

| App | Command | Purpose |
|-----|---------|-----------|
| **fsfvi_data** | `import_budget_mapping <xlsx>` | Budget mapping Excel → DB |
| | `import_indicator_parameters <xlsx>` | IFPRI parameters Excel → indicators + `IndicatorData` |
| | `fetch_rwanda_observed` | World Bank API → observed values + interpolation |
| | `compute_observed_imputed` | Impute missing observed values |
| | `merge_wb_reference_exports` | Merge `wb_new_data.json` + `wb_additional_data.json` into `reference_distributions.json` |
| | `compute_benchmark_sample` | 10th/90th benchmarks from `reference_distributions.json` |
| | `seed_indicators` | Seed 37 indicators without Excel |
| **assessments** | `run_assessments_all_years` | Run FSFSI assessments via Rust |
| **budget_analysis** | `run_budget_analysis` | Budget history metrics / JSON export |
| **planning** | `seed_psta5` | PSTA 5 reference data |
| **authentication** | `register_user` | Create government users |
| | `set_password` | Set password for a user |

Run `python manage.py help` or `python manage.py <command> --help` for flags.

---

## Production notes

- Serve with **gunicorn** (see `requirements.txt`), e.g. `gunicorn rwanda_project.wsgi:application --bind 0.0.0.0:8000`.
- Use **`rwanda_project.settings_production`** (`DJANGO_SETTINGS_MODULE`) and env vars; **SQLite** on a single host is fine (`DB_NAME` path), or use **PostgreSQL** with `DB_*`.
- Set `DJANGO_DEBUG=False`, strong `DJANGO_SECRET_KEY`, and restrict `ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS`.
- Build the engine in release mode for deployment: `maturin build --release` and install the wheel into the same venv as Django.
- **Schema** `migrations/*.py` files stay in Git for every environment; **`db.sqlite3`** is local/server-only (see `../docs/domain-and-environments.md`).

---

## Project layout (short)

```
rwanda_backend/
  manage.py
  requirements.txt
  rwanda_project/          # Django settings, urls, wsgi
  fsfi_engine/             # Rust + PyO3 (maturin)
  apps/
    authentication/
    fsfvi_data/            # indicators, IndicatorData, WB fetch command, data/reference_distributions.json
    assessments/
    optimization/
    budget_analysis/
    planning/
    ...
  wb_new_data.json         # Reference export (not auto-loaded)
  wb_additional_data.json  # Reference export (not auto-loaded)
```

For API routes, see `rwanda_project/urls.py` and each app’s `urls.py`.
