# Rwanda Backend — Developer Guide

**Project:** Food Systems Financial Vulnerability Intelligence (FSFVI)
**Target:** Republic of Rwanda — MINAGRI Backend
**Architecture:** Rust (PyO3) + Django Hybrid
**Date:** March 2026
**Status:** Planning Phase

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Why Rust + Django Hybrid](#2-why-rust--django-hybrid)
3. [Responsibility Split: Rust vs Django](#3-responsibility-split-rust-vs-django)
4. [Existing Code to Rewrite vs Reuse](#4-existing-code-to-rewrite-vs-reuse)
5. [Rust Crate: `fsfvi_engine`](#5-rust-crate-fsfvi_engine)
6. [Django Application Architecture](#6-django-application-architecture)
7. [PyO3 Bridge Layer](#7-pyo3-bridge-layer)
8. [Database Design (PostgreSQL)](#8-database-design-postgresql)
9. [API Endpoint Specification](#9-api-endpoint-specification)
10. [Authentication System (Rust)](#10-authentication-system-rust)
11. [FSFVI Core Mathematics (Rust Rewrite)](#11-fsfvi-core-mathematics-rust-rewrite)
12. [Rwanda-Specific Data Structures](#12-rwanda-specific-data-structures)
13. [Project Structure](#13-project-structure)
14. [Implementation Phases](#14-implementation-phases)
15. [Testing Strategy](#15-testing-strategy)
16. [Deployment Architecture](#16-deployment-architecture)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Next.js Frontend (Rwanda Government Dashboard)                     │
│  Port 3000                                                          │
└─────────────────────┬───────────────────────────────────────────────┘
                      │ HTTPS (JWT Bearer)
┌─────────────────────▼───────────────────────────────────────────────┐
│  Django REST Framework                                              │
│  Port 8000                                                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Django Layer (Python)                                       │   │
│  │  • URL routing & request/response lifecycle                  │   │
│  │  • DRF serializers & viewsets                                │   │
│  │  • ORM models & migrations (PostgreSQL)                      │   │
│  │  • Django Admin panel for data management                    │   │
│  │  • File uploads (reports, data imports)                      │   │
│  │  • Caching (Redis)                                           │   │
│  │  • Celery tasks (report generation, data sync)               │   │
│  └──────────┬───────────────────────────────────────────────────┘   │
│             │ Native Python function calls (zero overhead)          │
│  ┌──────────▼───────────────────────────────────────────────────┐   │
│  │  fsfvi_engine (Rust via PyO3)                                │   │
│  │  • FSFVI core calculations (vulnerability, gap, FSFVI score) │   │
│  │  • Budget optimization (SCP / water-filling)                 │   │
│  │  • Weighting systems (AHP, PageRank, Financial, Hybrid)      │   │
│  │  • Sensitivity & scenario analysis                           │   │
│  │  • Strategic planning (multi-year)                           │   │
│  │  • Decision support (policy recommendations)                 │   │
│  │  • JWT token generation & verification                       │   │
│  │  • Password hashing (Argon2) & verification                  │   │
│  │  • TOTP 2FA (generate, verify, backup codes)                 │   │
│  │  • Rate limiting logic                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL                                                  │   │
│  │  Managed by Django ORM (migrations, queries)                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**Key principle:** Django is the HTTP server. Rust is a compiled Python extension. No HTTP calls between them — Rust functions are imported and called like native Python functions.

---

## 2. Why Rust + Django Hybrid

### Why not pure Rust (like existing backends)?

| Concern | Pure Rust (current) | Rust + Django |
|---|---|---|
| Data model changes | Recompile entire backend | Django migration (1 command) |
| Admin data panel | Must build from scratch | Django Admin (free) |
| ORM & migrations | sqlx (manual SQL) | Django ORM (auto-migrations) |
| REST API scaffolding | Manual handler code | DRF serializers (auto) |
| Developer availability | Rust devs are rare | Python/Django devs are abundant |
| Rapid iteration | Slow compile cycles | Hot reload (Django) + Rust lib |
| Data import/export | Manual implementation | Django management commands |
| Background tasks | Manual with Tokio | Celery (mature ecosystem) |
| Computation speed | Native | Native (via PyO3 — same speed) |
| Auth security | Native | Native (Rust handles crypto) |

### Why not pure Django?

The FSFVI calculations are CPU-intensive (matrix operations, iterative optimization, PageRank convergence). Python is ~50-100x slower for these numerical workloads. The Rust engine via PyO3 runs at native speed with zero serialization overhead for numeric arrays.

### The sweet spot

- **Django** does what it's best at: data management, REST API, admin, ORM, background jobs
- **Rust** does what it's best at: cryptography, numerical computation, security-critical auth
- **PyO3** makes them feel like one system — no HTTP overhead, no serialization penalty for numeric types

---

## 3. Responsibility Split: Rust vs Django

### Rust (`fsfvi_engine` crate) Owns:

| Domain | Functions |
|---|---|
| **FSFVI Core Math** | `calculate_performance_gap()`, `calculate_vulnerability()`, `calculate_fsfvi()`, `calculate_efficiency()`, `determine_priority()` |
| **Sensitivity Estimation** | `estimate_sensitivity_parameter()` with country context |
| **Weighting** | `calculate_expert_weights()` (AHP eigenvector), `calculate_financial_weights()`, `calculate_network_weights()` (PageRank), `calculate_hybrid_weights()` |
| **Budget Optimization** | `optimize_allocation()` (SCP + water-filling), `analyze_efficiency()`, `calculate_roi()` |
| **Scenario Simulation** | `simulate_crisis()`, `compare_scenarios()`, `simulate_budget_change()`, `simulate_intervention()` |
| **Sensitivity Analysis** | `analyze_weight_sensitivity()`, `analyze_benchmark_sensitivity()`, `analyze_scenario_robustness()` |
| **Strategic Planning** | `generate_multi_year_plan()`, `generate_mtef()` |
| **Decision Support** | `generate_policy_recommendations()`, `generate_crisis_response()`, `identify_quick_wins()` |
| **Matrix Operations** | `generate_ahp_matrix()`, `generate_dependency_matrix()`, `calculate_eigenvector()`, `calculate_pagerank()` |
| **Auth: JWT** | `create_token()`, `verify_token()`, `decode_claims()` |
| **Auth: Password** | `hash_password()`, `verify_password()`, `validate_password_strength()`, `generate_secure_password()` |
| **Auth: 2FA** | `generate_totp_secret()`, `generate_qr_code()`, `verify_totp()`, `generate_backup_codes()`, `verify_backup_code()` |
| **Auth: Rate Limit** | `check_rate_limit()`, `increment_counter()` (in-memory with sliding window) |

### Django Owns:

| Domain | Implementation |
|---|---|
| **HTTP Layer** | URL routing, middleware chain, CORS, request parsing, response formatting |
| **Data Models** | All ORM models, migrations, relationships, constraints |
| **REST API** | DRF viewsets, serializers, pagination, filtering |
| **Admin Panel** | Django Admin for data CRUD (provinces, districts, components, users) |
| **User Management** | User CRUD, role assignment, government assignment (calls Rust for password ops) |
| **Data Entry** | District data submission workflow (draft → submitted → reviewed → validated) |
| **Report Generation** | PDF/Excel generation via Celery tasks |
| **File Management** | Data imports (CSV/Excel), document storage |
| **Caching** | Redis cache for assessment results, geographic aggregations |
| **Background Jobs** | Celery: report generation, data validation, alert checking |
| **Audit Logging** | Django middleware logs all requests; calls Rust for security events |
| **Session State** | Django session middleware (backed by Redis) |
| **Geographic Data** | Province/district/sector CRUD and aggregation queries |
| **Alert System** | Threshold checking, notification dispatch |

### Shared (Django calls Rust):

```python
# Example: Django view calls Rust for FSFVI calculation
from fsfvi_engine import calculate_fsfvi, verify_token

class AssessmentView(APIView):
    def get(self, request):
        # Django: fetch data from DB
        components = Component.objects.filter(
            government_id=request.user.government_id,
            fiscal_year=request.query_params.get('fiscal_year')
        )

        # Convert to Rust-compatible format
        component_data = [comp.to_engine_input() for comp in components]

        # Rust: run FSFVI calculation (native speed)
        result = calculate_fsfvi(
            components=component_data,
            weighting_method="hybrid",
            scenario="normal_operations"
        )

        # Django: serialize and return
        return Response(AssessmentSerializer(result).data)
```

---

## 4. Existing Code to Rewrite vs Reuse

### 4.1 Must Rewrite in Rust (PyO3 crate)

All computation code from `fsfi-backend/src/fsfvi/` must be rewritten as a PyO3 crate. This is approximately **~8,000 lines of Rust** that currently live inside Actix-web handlers. They need to be extracted into a pure computation library with Python bindings.

| Source File | Lines (approx) | Rewrite As |
|---|---|---|
| `fsfvi_core/calculations.rs` | ~300 | `engine/core/calculations.rs` |
| `fsfvi_core/sensitivity.rs` | ~400 | `engine/core/sensitivity.rs` ✓ (wired: base lookup + `estimate_sensitivity_parameter`, used in index via assessment/optimization/gap) |
| `fsfvi_core/metrics.rs` | ~500 | `engine/core/metrics.rs` |
| `weighting/models.rs` | ~200 | `engine/weighting/models.rs` |
| `weighting/expert.rs` | ~400 | `engine/weighting/expert.rs` |
| `weighting/financial.rs` | ~350 | `engine/weighting/financial.rs` |
| `weighting/network.rs` | ~350 | `engine/weighting/network.rs` |
| `weighting/hybrid.rs` | ~300 | `engine/weighting/hybrid.rs` |
| `service/vulnerability_assessment.rs` | ~600 | `engine/services/assessment.rs` |
| `service/budget_optimization.rs` | ~800 | `engine/services/optimization.rs` |
| `service/performance_gap_analysis.rs` | ~500 | `engine/services/performance_gap.rs` |
| `service/scenario_simulation.rs` | ~600 | `engine/services/scenarios.rs` |
| `service/sensitivity_analysis.rs` | ~400 | `engine/services/sensitivity.rs` |
| `service/strategic_planning.rs` | ~700 | `engine/services/planning.rs` |
| `service/decision_support.rs` | ~600 | `engine/services/decision_support.rs` |
| `service/weighting_analysis.rs` | ~300 | `engine/services/weighting_analysis.rs` |
| `service/matrix_generation.rs` | ~200 | `engine/services/matrices.rs` |
| `config.rs` + `errors.rs` + `validators.rs` | ~400 | `engine/config.rs`, `engine/errors.rs` |

### 4.2 Must Rewrite: Auth (from both backends)

Combine the best of both auth systems into the Rust crate:

| Feature | Source | Take From |
|---|---|---|
| Password hashing (Argon2) | Both | fsfi-backend (cleaner) |
| Password validation (12+ chars, entropy) | demo_gov_backend | Keep full policy |
| JWT (access + refresh tokens) | fsfi-backend | Dual token pattern |
| JWT claims structure | Both | Merge (add government_id + username) |
| TOTP 2FA | demo_gov_backend | Keep full implementation |
| Backup codes | fsfi-backend | Hashed codes in separate table |
| MFA secret encryption (AES-256-GCM) | fsfi-backend | Keep encryption at rest |
| Rate limiting (sliding window) | demo_gov_backend | Adapt to per-user + per-IP |

### 4.3 Django Replaces (no Rust needed)

These are currently in Actix-web handlers/services but are better handled by Django:

| Current Rust Code | Django Replacement |
|---|---|
| `handlers/auth_handler.rs` HTTP endpoints | DRF auth views |
| `handlers/fsfvi_handler.rs` HTTP endpoints | DRF viewsets |
| `services/fsfvi_service/data_fetcher.rs` | Django ORM queries |
| `services/fsfvi_service/client.rs` | Not needed (direct Rust calls) |
| `services/fsfvi_service/models.rs` response types | DRF serializers |
| `middleware/security.rs` headers | Django SecurityMiddleware |
| `services/audit_service.rs` logging | Django audit middleware |
| SQLite migrations | Django PostgreSQL migrations |
| `bin/create_user.rs` etc. | Django management commands |

---

## 5. Rust Crate: `fsfvi_engine`

### 5.1 Crate Structure

```
rwanda_backend/
├── fsfvi_engine/                        ← Rust crate (PyO3 + Maturin)
│   ├── Cargo.toml
│   ├── pyproject.toml                   ← Maturin build config
│   ├── src/
│   │   ├── lib.rs                       ← PyO3 module definition (#[pymodule])
│   │   │
│   │   ├── core/                        ← Pure math (no PyO3 annotations)
│   │   │   ├── mod.rs
│   │   │   ├── calculations.rs          ← Gap, vulnerability, FSFVI, efficiency
│   │   │   ├── sensitivity.rs           ← αᵢ estimation (empirical + hardcoded)
│   │   │   └── metrics.rs              ← System aggregation, resilience indicators
│   │   │
│   │   ├── weighting/                   ← Weight calculation systems
│   │   │   ├── mod.rs
│   │   │   ├── models.rs               ← Component registry, matrices, contexts
│   │   │   ├── expert.rs               ← AHP eigenvector + consistency check
│   │   │   ├── financial.rs            ← Budget-based weights + cost-effectiveness
│   │   │   ├── network.rs             ← PageRank + cascade multipliers
│   │   │   └── hybrid.rs              ← Combined weighting
│   │   │
│   │   ├── services/                    ← High-level analysis services
│   │   │   ├── mod.rs
│   │   │   ├── assessment.rs           ← Full FSFVI assessment
│   │   │   ├── optimization.rs         ← Budget optimization (SCP)
│   │   │   ├── performance_gap.rs      ← Gap analysis, peer comparison
│   │   │   ├── scenarios.rs            ← Crisis simulation, scenario comparison
│   │   │   ├── sensitivity.rs          ← Weight/benchmark/scenario sensitivity
│   │   │   ├── planning.rs             ← Multi-year plan, MTEF
│   │   │   ├── decision_support.rs     ← Policy recommendations
│   │   │   ├── weighting_analysis.rs   ← Methodology validation
│   │   │   └── matrices.rs             ← AHP/network matrix generation
│   │   │
│   │   ├── auth/                        ← Security (all crypto in Rust)
│   │   │   ├── mod.rs
│   │   │   ├── jwt.rs                  ← Token creation, verification, claims
│   │   │   ├── password.rs             ← Argon2 hash/verify, policy validation
│   │   │   ├── totp.rs                 ← TOTP generation, verification, QR codes
│   │   │   ├── backup_codes.rs         ← Generate, hash, verify backup codes
│   │   │   ├── encryption.rs           ← AES-256-GCM for MFA secrets
│   │   │   └── rate_limit.rs           ← Sliding window rate limiter
│   │   │
│   │   ├── types.rs                     ← Shared structs (Component, AssessmentResult, etc.)
│   │   ├── config.rs                    ← Constants, thresholds, defaults
│   │   ├── errors.rs                    ← Error types
│   │   └── validators.rs               ← Input validation
│   │
│   └── tests/                           ← Rust unit tests
│       ├── test_calculations.rs
│       ├── test_weighting.rs
│       ├── test_optimization.rs
│       ├── test_auth.rs
│       └── test_scenarios.rs
```

### 5.2 Cargo.toml

```toml
[package]
name = "fsfvi_engine"
version = "0.1.0"
edition = "2021"

[lib]
name = "fsfvi_engine"
crate-type = ["cdylib"]  # Required for PyO3

[dependencies]
# PyO3 bridge
pyo3 = { version = "0.22", features = ["extension-module"] }

# Cryptography
argon2 = "0.5"
jsonwebtoken = "9.2"
sha2 = "0.10"
aes-gcm = "0.10"
rand = "0.8"
base64 = "0.22"
base32 = "0.5"
totp-lite = "2.0"
uuid = { version = "1.7", features = ["v4", "serde"] }

# Serialization (for complex return types)
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Date/time
chrono = { version = "0.4", features = ["serde"] }

# Error handling
thiserror = "1.0"

# QR code generation
qrcode = "0.14"
image = "0.25"
urlencoding = "2.1"

[build-dependencies]
pyo3-build-config = "0.22"
```

### 5.3 pyproject.toml (Maturin)

```toml
[build-system]
requires = ["maturin>=1.7,<2.0"]
build-backend = "maturin"

[project]
name = "fsfvi_engine"
version = "0.1.0"
requires-python = ">=3.11"

[tool.maturin]
features = ["pyo3/extension-module"]
python-source = "python"
module-name = "fsfvi_engine"
```

### 5.4 PyO3 Module Definition (`lib.rs`)

```rust
use pyo3::prelude::*;

mod core;
mod weighting;
mod services;
mod auth;
mod types;
mod config;
mod errors;
mod validators;

/// FSFVI Engine — Rust-powered computation for Rwanda food system analysis
#[pymodule]
fn fsfvi_engine(m: &Bound<'_, PyModule>) -> PyResult<()> {
    // Core calculations
    m.add_function(wrap_pyfunction!(core::calculate_performance_gap, m)?)?;
    m.add_function(wrap_pyfunction!(core::calculate_vulnerability, m)?)?;
    m.add_function(wrap_pyfunction!(core::calculate_fsfvi, m)?)?;
    m.add_function(wrap_pyfunction!(core::calculate_efficiency_index, m)?)?;
    m.add_function(wrap_pyfunction!(core::estimate_sensitivity, m)?)?;

    // Assessment
    m.add_function(wrap_pyfunction!(services::run_assessment, m)?)?;
    m.add_function(wrap_pyfunction!(services::quick_check, m)?)?;

    // Weighting
    m.add_function(wrap_pyfunction!(weighting::calculate_expert_weights, m)?)?;
    m.add_function(wrap_pyfunction!(weighting::calculate_financial_weights, m)?)?;
    m.add_function(wrap_pyfunction!(weighting::calculate_network_weights, m)?)?;
    m.add_function(wrap_pyfunction!(weighting::calculate_hybrid_weights, m)?)?;

    // Budget optimization
    m.add_function(wrap_pyfunction!(services::optimize_allocation, m)?)?;
    m.add_function(wrap_pyfunction!(services::analyze_efficiency, m)?)?;
    m.add_function(wrap_pyfunction!(services::generate_reallocation_plan, m)?)?;

    // Scenarios
    m.add_function(wrap_pyfunction!(services::compare_scenarios, m)?)?;
    m.add_function(wrap_pyfunction!(services::simulate_crisis, m)?)?;
    m.add_function(wrap_pyfunction!(services::simulate_budget_change, m)?)?;
    m.add_function(wrap_pyfunction!(services::simulate_intervention, m)?)?;

    // Performance gap
    m.add_function(wrap_pyfunction!(services::analyze_performance_gaps, m)?)?;
    m.add_function(wrap_pyfunction!(services::compare_peers, m)?)?;
    m.add_function(wrap_pyfunction!(services::track_gap_closure, m)?)?;
    m.add_function(wrap_pyfunction!(services::recommend_targets, m)?)?;

    // Sensitivity analysis
    m.add_function(wrap_pyfunction!(services::analyze_weight_sensitivity, m)?)?;
    m.add_function(wrap_pyfunction!(services::analyze_scenario_robustness, m)?)?;

    // Strategic planning
    m.add_function(wrap_pyfunction!(services::generate_multi_year_plan, m)?)?;
    m.add_function(wrap_pyfunction!(services::generate_mtef, m)?)?;

    // Decision support
    m.add_function(wrap_pyfunction!(services::generate_policy_recommendations, m)?)?;
    m.add_function(wrap_pyfunction!(services::generate_crisis_response, m)?)?;
    m.add_function(wrap_pyfunction!(services::generate_stakeholder_brief, m)?)?;

    // Matrices
    m.add_function(wrap_pyfunction!(services::generate_ahp_matrix, m)?)?;
    m.add_function(wrap_pyfunction!(services::generate_network_matrix, m)?)?;

    // Auth: JWT
    m.add_function(wrap_pyfunction!(auth::create_access_token, m)?)?;
    m.add_function(wrap_pyfunction!(auth::create_refresh_token, m)?)?;
    m.add_function(wrap_pyfunction!(auth::verify_token, m)?)?;
    m.add_function(wrap_pyfunction!(auth::decode_claims, m)?)?;

    // Auth: Password
    m.add_function(wrap_pyfunction!(auth::hash_password, m)?)?;
    m.add_function(wrap_pyfunction!(auth::verify_password, m)?)?;
    m.add_function(wrap_pyfunction!(auth::validate_password_strength, m)?)?;
    m.add_function(wrap_pyfunction!(auth::generate_secure_password, m)?)?;

    // Auth: 2FA
    m.add_function(wrap_pyfunction!(auth::generate_totp_secret, m)?)?;
    m.add_function(wrap_pyfunction!(auth::generate_totp_qr_code, m)?)?;
    m.add_function(wrap_pyfunction!(auth::verify_totp_code, m)?)?;
    m.add_function(wrap_pyfunction!(auth::generate_backup_codes, m)?)?;
    m.add_function(wrap_pyfunction!(auth::verify_backup_code, m)?)?;

    // Auth: Encryption
    m.add_function(wrap_pyfunction!(auth::encrypt_secret, m)?)?;
    m.add_function(wrap_pyfunction!(auth::decrypt_secret, m)?)?;

    Ok(())
}
```

### 5.5 PyO3 Function Signature Examples

```rust
/// Calculate FSFVI for a set of components
#[pyfunction]
#[pyo3(signature = (components, weighting_method="hybrid", scenario="normal_operations", country_context=None))]
fn run_assessment(
    components: Vec<HashMap<String, PyObject>>,
    weighting_method: &str,
    scenario: &str,
    country_context: Option<HashMap<String, String>>,
    py: Python<'_>,
) -> PyResult<PyObject> {
    // Convert Python dicts to Rust structs
    let rust_components = parse_components(components, py)?;
    let method = parse_weighting_method(weighting_method)?;
    let scen = parse_scenario(scenario)?;
    let context = country_context.map(|c| parse_country_context(c));

    // Run assessment (pure Rust computation)
    let result = services::assessment::assess_food_system(
        rust_components, method, scen, context
    ).map_err(|e| PyErr::new::<pyo3::exceptions::PyValueError, _>(e.to_string()))?;

    // Convert Rust result to Python dict
    Ok(result_to_pyobject(result, py))
}

/// Hash a password using Argon2
#[pyfunction]
fn hash_password(password: &str) -> PyResult<String> {
    auth::password::hash_password(password)
        .map_err(|e| PyErr::new::<pyo3::exceptions::PyRuntimeError, _>(e.to_string()))
}

/// Verify a TOTP code
#[pyfunction]
fn verify_totp_code(
    encrypted_secret: &str,
    code: &str,
    encryption_key: &str,
) -> PyResult<bool> {
    auth::totp::verify_code(encrypted_secret, code, encryption_key)
        .map_err(|e| PyErr::new::<pyo3::exceptions::PyRuntimeError, _>(e.to_string()))
}
```

---

## 6. Django Application Architecture

### 6.1 Django Apps

```
rwanda_backend/
├── manage.py
├── config/                              ← Django project settings
│   ├── settings/
│   │   ├── base.py                      ← Common settings
│   │   ├── development.py               ← Dev overrides
│   │   └── production.py                ← Production overrides
│   ├── urls.py                          ← Root URL configuration
│   ├── wsgi.py
│   └── asgi.py
│
├── apps/
│   ├── authentication/                  ← Auth app (uses Rust engine)
│   │   ├── models.py                    ← User, Government, Session, AuditLog
│   │   ├── serializers.py               ← Login, Token, User serializers
│   │   ├── views.py                     ← Login, logout, 2FA, password views
│   │   ├── middleware.py                ← JWT auth middleware (calls Rust)
│   │   ├── permissions.py               ← Role-based permissions
│   │   ├── backends.py                  ← Custom auth backend (Rust password verify)
│   │   └── management/commands/
│   │       ├── create_government.py
│   │       └── create_user.py
│   │
│   ├── geography/                       ← Rwanda geographic data
│   │   ├── models.py                    ← Province, District, Sector, Cell
│   │   ├── serializers.py
│   │   ├── views.py                     ← Geographic endpoints
│   │   ├── admin.py                     ← Django Admin for geographic data
│   │   └── management/commands/
│   │       └── load_rwanda_geography.py ← Seed 5 provinces, 30 districts, 416 sectors
│   │
│   ├── fsfvi_data/                      ← Component data management
│   │   ├── models.py                    ← ComponentData, ComponentMetadata, DataSubmission
│   │   ├── serializers.py
│   │   ├── views.py                     ← Data entry, validation, history
│   │   ├── admin.py                     ← Admin for data management
│   │   ├── validators.py                ← Business rule validation
│   │   └── management/commands/
│   │       ├── import_fsfvi_data.py     ← CSV/Excel import
│   │       └── seed_rwanda_data.py      ← Initial Rwanda dataset
│   │
│   ├── assessments/                     ← FSFVI assessment orchestration
│   │   ├── models.py                    ← AssessmentResult (cached), AssessmentHistory
│   │   ├── serializers.py
│   │   ├── views.py                     ← Assessment, quick check, trend endpoints
│   │   └── services.py                  ← Orchestrates: DB fetch → Rust engine → cache
│   │
│   ├── optimization/                    ← Budget optimization orchestration
│   │   ├── models.py                    ← OptimizationResult, ReallocationPlan
│   │   ├── serializers.py
│   │   ├── views.py                     ← Optimization, efficiency, ROI endpoints
│   │   └── services.py                  ← Orchestrates: DB fetch → Rust engine → response
│   │
│   ├── analysis/                        ← Performance gap, scenarios, sensitivity
│   │   ├── models.py                    ← AnalysisResult (cached)
│   │   ├── serializers.py
│   │   ├── views.py                     ← Gap, peer, scenario, sensitivity endpoints
│   │   └── services.py
│   │
│   ├── planning/                        ← Strategic planning & decision support
│   │   ├── models.py                    ← StrategicPlan, PSTA5Alignment
│   │   ├── serializers.py
│   │   ├── views.py                     ← Multi-year plan, MTEF, PSTA5 endpoints
│   │   └── services.py
│   │
│   ├── reports/                         ← Report generation
│   │   ├── models.py                    ← Report, ReportTemplate
│   │   ├── serializers.py
│   │   ├── views.py                     ← Generate, download, history
│   │   ├── tasks.py                     ← Celery tasks for PDF/Excel generation
│   │   └── templates/                   ← Report HTML templates
│   │       ├── ministerial_brief.html
│   │       ├── district_report.html
│   │       └── budget_submission.html
│   │
│   ├── alerts/                          ← Notification system
│   │   ├── models.py                    ← Alert, AlertThreshold, AlertHistory
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── tasks.py                     ← Celery tasks for threshold checking
│   │
│   └── audit/                           ← Audit trail
│       ├── models.py                    ← AuditLog (partitioned by month)
│       ├── middleware.py                ← Auto-log all requests
│       ├── serializers.py
│       └── views.py                     ← Audit log viewing (admin only)
```

### 6.2 Django Service Layer Pattern

Every Django app that calls Rust follows the same pattern:

```python
# apps/assessments/services.py

from fsfvi_engine import run_assessment, quick_check
from apps.fsfvi_data.models import ComponentData
from apps.assessments.models import AssessmentResult
from django.core.cache import cache

class AssessmentService:
    """Orchestrates: Django ORM → Rust Engine → Cache/DB"""

    @staticmethod
    def run_full_assessment(
        government_id: str,
        fiscal_year: int,
        weighting_method: str = "hybrid",
        scenario: str = "normal_operations",
    ) -> dict:
        # 1. Django: Fetch data from PostgreSQL
        components = ComponentData.objects.filter(
            government_id=government_id,
            fiscal_year=fiscal_year,
            status="validated",
        ).values(
            "component_type", "observed_value", "benchmark_value",
            "financial_allocation_usd", "weight", "sensitivity_parameter",
        )

        if not components:
            raise ValueError(f"No validated data for FY {fiscal_year}")

        # 2. Convert to list of dicts for Rust
        component_list = list(components)

        # 3. Rust: Run FSFVI calculation (native speed)
        result = run_assessment(
            components=component_list,
            weighting_method=weighting_method,
            scenario=scenario,
            country_context={"country": "Rwanda", "income_level": "LIC"},
        )

        # 4. Django: Cache the result
        cache_key = f"assessment:{government_id}:{fiscal_year}:{weighting_method}:{scenario}"
        cache.set(cache_key, result, timeout=3600)  # 1 hour

        # 5. Django: Persist to history
        AssessmentResult.objects.create(
            government_id=government_id,
            fiscal_year=fiscal_year,
            weighting_method=weighting_method,
            scenario=scenario,
            result_json=result,
        )

        return result
```

---

## 7. PyO3 Bridge Layer

### 7.1 Data Marshalling Strategy

**Minimize Python↔Rust boundary crossings.** Do as much work as possible in a single Rust call.

| Data Type | Python → Rust | Rust → Python |
|---|---|---|
| Numbers (f64, i32) | Direct (zero-copy) | Direct (zero-copy) |
| Strings | `&str` (borrowed) | `String` |
| Lists of numbers | `Vec<f64>` (one copy) | `Vec<f64>` (one copy) |
| Dicts | `HashMap<String, PyObject>` | `PyDict` or JSON string |
| Complex results | N/A | Serialize as JSON string, deserialize in Python |

**Rule:** For complex return types (AssessmentReport, etc.), serialize to JSON in Rust and deserialize in Python. This is simpler than mapping every nested struct to PyO3 classes and the performance cost is negligible (~1ms for a typical assessment result).

```rust
#[pyfunction]
fn run_assessment(components: Vec<HashMap<String, PyObject>>, ...) -> PyResult<String> {
    // ... compute ...
    let result_json = serde_json::to_string(&result)
        .map_err(|e| PyErr::new::<pyo3::exceptions::PyRuntimeError, _>(e.to_string()))?;
    Ok(result_json)  // Return JSON string
}
```

```python
# In Django
import json
from fsfvi_engine import run_assessment

result_json = run_assessment(components=component_list, ...)
result = json.loads(result_json)
```

### 7.2 Error Handling Across Boundary

```rust
// Rust side: map all errors to Python exceptions
use pyo3::exceptions::{PyValueError, PyRuntimeError};

#[pyfunction]
fn calculate_fsfvi(...) -> PyResult<String> {
    match internal_calculate(...) {
        Ok(result) => Ok(serde_json::to_string(&result).unwrap()),
        Err(FsfviError::Validation { message, .. }) => {
            Err(PyValueError::new_err(message))
        }
        Err(FsfviError::Calculation { message }) => {
            Err(PyRuntimeError::new_err(message))
        }
        Err(e) => Err(PyRuntimeError::new_err(e.to_string())),
    }
}
```

```python
# Django side: catch Rust exceptions as Python exceptions
from fsfvi_engine import run_assessment

try:
    result = run_assessment(components=data)
except ValueError as e:
    # Validation error from Rust
    return Response({"error": str(e)}, status=400)
except RuntimeError as e:
    # Calculation error from Rust
    return Response({"error": str(e)}, status=500)
```

### 7.3 Build & Development Workflow

```bash
# Development: build Rust and install into Django virtualenv
cd fsfvi_engine/
maturin develop --release

# Now Django can import it:
python -c "import fsfvi_engine; print(fsfvi_engine.hash_password('test'))"

# Production: build wheel for deployment
maturin build --release
pip install target/wheels/fsfvi_engine-0.1.0-*.whl
```

---

## 8. Database Design (PostgreSQL)

### 8.1 Authentication Tables

```sql
-- Users (managed by Django ORM)
CREATE TABLE auth_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    government_id UUID NOT NULL REFERENCES governments(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,         -- Argon2 (hashed by Rust)
    full_name VARCHAR(255) NOT NULL,
    title VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'analyst',  -- admin, analyst, district_officer, viewer
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive, locked
    is_temporary_password BOOLEAN DEFAULT TRUE,
    -- 2FA
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),                      -- AES-256-GCM encrypted (by Rust)
    mfa_enabled_at TIMESTAMPTZ,
    -- Security tracking
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    last_password_change TIMESTAMPTZ,
    -- Django timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Rwanda-specific
    province_id UUID REFERENCES provinces(id),    -- Geographic assignment
    district_id UUID REFERENCES districts(id),
    preferred_language VARCHAR(5) DEFAULT 'en',   -- en, rw, fr
    CONSTRAINT valid_role CHECK (role IN ('admin', 'analyst', 'district_officer', 'viewer'))
);

-- MFA Backup Codes (hashed by Rust)
CREATE TABLE mfa_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,               -- SHA-256 hash
    code_number INTEGER NOT NULL,
    used_at TIMESTAMPTZ,                          -- NULL = unused
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, code_number)
);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Governments
CREATE TABLE governments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(2) NOT NULL DEFAULT 'RW',
    country_name VARCHAR(100) NOT NULL DEFAULT 'Rwanda',
    government_name VARCHAR(255) NOT NULL,
    government_type VARCHAR(20) NOT NULL,          -- federal, ministry, agency, district
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    contact_email VARCHAR(255),
    api_quota_daily INTEGER DEFAULT 10000,
    api_quota_monthly INTEGER DEFAULT 300000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.2 Geographic Tables (Rwanda-specific)

```sql
CREATE TABLE provinces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_rw VARCHAR(100) NOT NULL,                -- Kinyarwanda name
    code VARCHAR(10) UNIQUE NOT NULL,             -- EAST, NORTH, SOUTH, WEST, KIGALI
    population INTEGER,
    area_sq_km NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    province_id UUID NOT NULL REFERENCES provinces(id),
    name VARCHAR(100) NOT NULL,
    name_rw VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,             -- BUGESERA, GATSIBO, etc.
    population INTEGER,
    arable_land_ha NUMERIC(12,2),
    irrigated_land_ha NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID NOT NULL REFERENCES districts(id),
    name VARCHAR(100) NOT NULL,
    name_rw VARCHAR(100) NOT NULL,
    code VARCHAR(30) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-computed FSFVI by geographic level (refreshed by Celery)
CREATE TABLE geographic_fsfvi_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(20) NOT NULL,                   -- national, province, district
    entity_id UUID,                               -- NULL for national, province/district ID otherwise
    fiscal_year INTEGER NOT NULL,
    season VARCHAR(10),                           -- season_a, season_b, season_c
    fsfvi_score NUMERIC(6,4),
    risk_level VARCHAR(20),
    component_scores JSONB,                       -- Per-component breakdown
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(level, entity_id, fiscal_year, season)
);
```

### 8.3 FSFVI Data Tables

```sql
-- Component data (the core input for all calculations)
CREATE TABLE component_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Context
    government_id UUID NOT NULL REFERENCES governments(id),
    district_id UUID REFERENCES districts(id),    -- NULL = national level
    fiscal_year INTEGER NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
    reporting_period VARCHAR(20),                  -- YYYY-Q1, YYYY-Annual, YYYY-SeasonA
    season VARCHAR(10),                           -- season_a, season_b, season_c
    -- Component data
    component_type VARCHAR(50) NOT NULL,
    observed_value NUMERIC(15,4) NOT NULL CHECK (observed_value >= 0),
    benchmark_value NUMERIC(15,4) NOT NULL CHECK (benchmark_value >= 0),
    financial_allocation_usd NUMERIC(18,2) NOT NULL CHECK (financial_allocation_usd >= 0),
    weight NUMERIC(6,4) CHECK (weight BETWEEN 0 AND 1),
    sensitivity_parameter NUMERIC(10,6) CHECK (sensitivity_parameter >= 0.0005),
    -- Data quality
    data_source VARCHAR(255),
    data_quality_rating VARCHAR(10) CHECK (data_quality_rating IN ('high', 'medium', 'low')),
    collection_method VARCHAR(100),
    notes TEXT,
    -- Workflow
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, submitted, under_review, validated, rejected
    submitted_by UUID REFERENCES auth_user(id),
    reviewed_by UUID REFERENCES auth_user(id),
    validated_at TIMESTAMPTZ,
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth_user(id),
    version INTEGER DEFAULT 1,
    -- Constraints
    CONSTRAINT valid_component_type CHECK (component_type IN (
        'agricultural_development', 'infrastructure', 'nutrition_health',
        'climate_natural_resources', 'social_protection_equity', 'governance_institutions'
    )),
    UNIQUE(government_id, district_id, component_type, fiscal_year, reporting_period)
);

-- Assessment result cache
CREATE TABLE assessment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    government_id UUID NOT NULL REFERENCES governments(id),
    district_id UUID REFERENCES districts(id),
    fiscal_year INTEGER NOT NULL,
    weighting_method VARCHAR(20) NOT NULL,
    scenario VARCHAR(30) NOT NULL,
    fsfvi_score NUMERIC(6,4) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    result_json JSONB NOT NULL,                   -- Full assessment result
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    computing_time_ms INTEGER
);

-- Peer country data (for comparison)
CREATE TABLE peer_country_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(2) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    component_type VARCHAR(50) NOT NULL,
    observed_value NUMERIC(15,4) NOT NULL,
    benchmark_value NUMERIC(15,4) NOT NULL,
    financial_allocation_usd NUMERIC(18,2) NOT NULL,
    data_source VARCHAR(255),
    UNIQUE(country_code, fiscal_year, component_type)
);

-- Historical trend data
CREATE TABLE historical_fsfvi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    government_id UUID NOT NULL REFERENCES governments(id),
    district_id UUID REFERENCES districts(id),
    fiscal_year INTEGER NOT NULL,
    fsfvi_score NUMERIC(6,4),
    component_scores JSONB,
    total_budget_usd NUMERIC(18,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.4 Audit & Alerts Tables

```sql
-- Audit log (partitioned by month for performance)
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES auth_user(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path VARCHAR(500),
    response_status INTEGER,
    response_time_ms INTEGER,
    metadata JSONB,
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Alert thresholds
CREATE TABLE alert_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    metric VARCHAR(50) NOT NULL,                  -- fsfvi_score, component_vulnerability, etc.
    level VARCHAR(20) NOT NULL,                   -- warning, critical
    threshold_value NUMERIC(6,4) NOT NULL,
    scope VARCHAR(20) NOT NULL DEFAULT 'national', -- national, province, district
    entity_id UUID,                               -- Specific province/district, or NULL for all
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth_user(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert history
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    threshold_id UUID NOT NULL REFERENCES alert_thresholds(id),
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_value NUMERIC(6,4) NOT NULL,
    entity_type VARCHAR(20),
    entity_id UUID,
    entity_name VARCHAR(255),
    acknowledged_by UUID REFERENCES auth_user(id),
    acknowledged_at TIMESTAMPTZ,
    notes TEXT
);
```

---

## 9. API Endpoint Specification

### 9.1 Authentication Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | None | Login (Rust: verify password, create JWT) |
| POST | `/api/v1/auth/refresh` | Refresh token | Refresh access token (Rust: verify + create) |
| POST | `/api/v1/auth/logout` | JWT | Revoke refresh token |
| POST | `/api/v1/auth/change-password` | JWT | Change password (Rust: validate + hash) |
| POST | `/api/v1/auth/password-strength` | None | Check strength (Rust: validate) |
| GET | `/api/v1/auth/2fa/prepare` | JWT | Get QR code (Rust: generate TOTP) |
| POST | `/api/v1/auth/2fa/setup` | JWT | Enable 2FA (Rust: verify first code) |
| POST | `/api/v1/auth/2fa/verify` | Temp token | Complete 2FA login (Rust: verify TOTP) |
| POST | `/api/v1/auth/2fa/disable` | JWT | Disable 2FA |
| GET | `/api/v1/auth/session` | JWT | Get session info |
| GET | `/api/v1/auth/audit-logs` | JWT (admin) | Security audit logs |

### 9.2 FSFVI Assessment Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/assessments/run` | JWT | Full FSFVI assessment |
| GET | `/api/v1/assessments/quick-check` | JWT | Quick FSFVI check |
| GET | `/api/v1/assessments/compare-weighting-methods` | JWT | Compare all 4 methods |
| POST | `/api/v1/assessments/compare-scenarios` | JWT | Compare scenarios |
| POST | `/api/v1/assessments/trend-analysis` | JWT | Multi-year trend |

### 9.3 Geographic Endpoints (New for Rwanda)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/rwanda/provinces` | JWT | All provinces with FSFVI |
| GET | `/api/v1/rwanda/provinces/{id}` | JWT | Province detail + districts |
| GET | `/api/v1/rwanda/districts` | JWT | All 30 districts with FSFVI |
| GET | `/api/v1/rwanda/districts/{id}` | JWT | District detail + sectors |
| GET | `/api/v1/rwanda/map-data` | JWT | All district FSFVI for map |
| GET | `/api/v1/rwanda/national-overview` | JWT | National aggregate |

### 9.4 Budget Optimization Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/optimization/analyze-efficiency` | JWT | Allocation efficiency |
| POST | `/api/v1/optimization/generate-plan` | JWT | Reallocation plan |
| POST | `/api/v1/optimization/calculate-roi` | JWT | ROI analysis |
| POST | `/api/v1/optimization/optimize` | JWT | LP optimization |

### 9.5 Analysis Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/analysis/performance-gaps` | JWT | Gap analysis |
| POST | `/api/v1/analysis/peer-comparison` | JWT | Peer country comparison |
| POST | `/api/v1/analysis/gap-closure` | JWT | Track gap closure |
| POST | `/api/v1/analysis/recommend-targets` | JWT | Target recommendations |
| POST | `/api/v1/analysis/sensitivity` | JWT | Sensitivity analysis |
| POST | `/api/v1/scenarios/compare` | JWT | Scenario comparison |
| POST | `/api/v1/scenarios/crisis` | JWT | Crisis simulation |
| POST | `/api/v1/scenarios/budget-change` | JWT | Budget change simulation |
| POST | `/api/v1/scenarios/intervention` | JWT | Intervention simulation |

### 9.6 Planning & Decision Support Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/planning/multi-year` | JWT | Multi-year strategic plan |
| POST | `/api/v1/planning/mtef` | JWT | Medium-term expenditure framework |
| GET | `/api/v1/planning/psta5-alignment` | JWT | PSTA 5 alignment tracker |
| POST | `/api/v1/decision-support/policy-recommendations` | JWT | Policy recommendations |
| POST | `/api/v1/decision-support/crisis-response` | JWT | Crisis response guidance |
| POST | `/api/v1/decision-support/stakeholder-brief` | JWT | Stakeholder brief |

### 9.7 Data Management Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/data/components` | JWT | List component data (filtered) |
| POST | `/api/v1/data/components` | JWT (district_officer+) | Submit new data |
| PATCH | `/api/v1/data/components/{id}` | JWT (analyst+) | Update data |
| POST | `/api/v1/data/components/{id}/submit` | JWT (district_officer) | Submit for review |
| POST | `/api/v1/data/components/{id}/validate` | JWT (analyst+) | Validate data |
| POST | `/api/v1/data/components/{id}/reject` | JWT (analyst+) | Reject with reason |
| POST | `/api/v1/data/import` | JWT (admin) | Bulk CSV/Excel import |

### 9.8 Reports & Alerts

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/reports/generate` | JWT | Generate report (async via Celery) |
| GET | `/api/v1/reports` | JWT | List generated reports |
| GET | `/api/v1/reports/{id}/download` | JWT | Download report file |
| GET | `/api/v1/alerts` | JWT | List active alerts |
| GET | `/api/v1/alerts/thresholds` | JWT (admin) | List alert thresholds |
| POST | `/api/v1/alerts/thresholds` | JWT (admin) | Create threshold |

---

## 10. Authentication System (Rust)

### 10.1 JWT Token Structure

**Access Token** (15 minutes):
```json
{
  "sub": "user-uuid",
  "government_id": "gov-uuid",
  "username": "rwanda_analyst",
  "email": "analyst@minagri.gov.rw",
  "role": "analyst",
  "province_id": "province-uuid-or-null",
  "district_id": "district-uuid-or-null",
  "exp": 1711234567,
  "iat": 1711233667,
  "iss": "fsfvi-rwanda-backend",
  "aud": "fsfvi-rwanda-frontend",
  "jti": "unique-token-id"
}
```

**Refresh Token** (30 days):
```json
{
  "sub": "user-uuid",
  "token_type": "refresh",
  "exp": 1713825667,
  "iat": 1711233667,
  "jti": "unique-refresh-id"
}
```

### 10.2 Password Policy (Rwanda Government)

```rust
// Rust: auth/password.rs
pub struct PasswordPolicy {
    pub min_length: usize,              // 12
    pub require_uppercase: bool,        // true
    pub require_lowercase: bool,        // true
    pub require_numbers: bool,          // true
    pub require_special_chars: bool,    // true
    pub max_repeating_chars: usize,     // 3
    pub min_entropy_bits: f64,          // 40.0
    pub forbidden_patterns: Vec<String>, // "123", "abc", "password", "rwanda", "minagri"
}
```

### 10.3 Role-Based Access Control

| Role | Scope | Can Do |
|---|---|---|
| `admin` | National | All operations, user management, alert configuration |
| `analyst` | National or Provincial | Assessments, analysis, data validation, reports |
| `district_officer` | Assigned district only | Data entry, submit data, view own district |
| `viewer` | Assigned scope | Read-only access to dashboards |

### 10.4 Django Auth Middleware

```python
# apps/authentication/middleware.py

from fsfvi_engine import verify_token, decode_claims
from django.conf import settings

class RustJWTAuthenticationMiddleware:
    """Verifies JWT using Rust engine, injects user into request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            try:
                is_valid = verify_token(token, settings.JWT_SECRET)
                if is_valid:
                    claims = decode_claims(token, settings.JWT_SECRET)
                    request.jwt_claims = claims
                    request.jwt_user_id = claims['sub']
                    request.jwt_role = claims['role']
                    request.jwt_government_id = claims['government_id']
            except (ValueError, RuntimeError):
                pass  # Will be caught by permission classes

        return self.get_response(request)
```

---

## 11. FSFVI Core Mathematics (Rust Rewrite)

### 11.1 Formulas to Implement (Exact Specification)

All formulas below must produce **identical results** to the existing `fsfi-backend` implementation. Test with the same inputs to verify mathematical equivalence.

#### Performance Gap
```
δᵢ = max(0, (benchmark - observed) / observed)   if observed < benchmark
δᵢ = 0                                            otherwise
Bounds: [0, 1]
```

#### Vulnerability
```
υᵢ = δᵢ / (1 + αᵢ · fᵢ)
Where fᵢ is in MILLIONS USD (convert from raw USD on input)
```

#### System FSFVI
```
FSFVI = Σᵢ ωᵢ · υᵢ
Where Σᵢ ωᵢ = 1.0 (±0.001 tolerance)
```

#### Efficiency Index
```
Efficiency = (1 - υᵢ) / fᵢ × 100
Units: % per $1M
```

#### Priority Level
```
composite_risk = υᵢ × (1 + 0.3 × √(alloc_share) + 0.2 × ω^0.3)
Critical: ≥ 0.6  |  High: ≥ 0.4  |  Medium: ≥ 0.25  |  Low: < 0.25
```

### 11.2 Sensitivity Parameter Estimation

**Base values by component:**
```
agricultural_development:    0.0015
infrastructure:              0.0018
nutrition_health:            0.0020
climate_natural_resources:   0.0008
social_protection_equity:    0.0025
governance_institutions:     0.0006
```

**Adjustments:**
- Performance bonus: +0.0005 × (normalized_expenditure) if allocation > $100M
- Structural penalty: -0.0003 × min(gap, 1.0) if gap > 0.5
- Complexity penalty: -0.0002 × min(complexity_factor, 0.2) if allocation > $500M
- Final bounds: [component_min, 0.005]

### 11.3 AHP Eigenvector (Power Method)

```
1. v = [1/6, 1/6, 1/6, 1/6, 1/6, 1/6]
2. For i in 0..1000:
     v_new = A × v
     λ_max = Σ(v_new[i] / v[i]) / 6
     v_new = v_new / ||v_new||₁
     if ||v_new - v|| < 1e-8: break
3. CI = (λ_max - 6) / 5
4. CR = CI / 1.24       (RI for n=6)
5. Pass if CR < 0.10
```

### 11.4 PageRank

```
d = 0.85, N = 6, tolerance = 1e-8, max_iter = 1000
1. PR[i] = 1/N for all i
2. For each iteration:
     new_PR[i] = (1-d)/N + d × Σⱼ(transition[j][i] × PR[j])
     if Σ|new_PR - PR| < tolerance: break
3. Normalize PR to sum to 1.0
```

### 11.5 Hybrid Weighting

```
ω_hybrid = 0.35 × ω_expert + 0.30 × ω_pagerank + 0.25 × ω_cascade + 0.10 × ω_financial
Normalize to sum to 1.0
```

### 11.6 Budget Optimization (SCP + Water-Filling)

```
Objective: minimize FSFVI = Σᵢ ωᵢ · δᵢ · [1/(1 + αᵢ · fᵢ)]
Subject to: Σᵢ fᵢ ≤ B,  f_min ≤ fᵢ ≤ f_max

Algorithm:
1. Linearize at current point (first-order Taylor)
2. Sort by marginal sensitivity (∂FSFVI/∂fᵢ)
3. Greedily allocate to most sensitive components
4. Trust region: max 30% change per iteration
5. Iterate until convergence (tolerance 1e-6, max 200 iterations)
```

---

## 12. Rwanda-Specific Data Structures

### 12.1 Fiscal Year (July-June)

```python
# Rwanda fiscal year runs July to June
# FY 2025/2026 = July 1, 2025 → June 30, 2026
FISCAL_YEAR_START_MONTH = 7  # July
```

### 12.2 Agricultural Seasons

```python
RWANDA_SEASONS = {
    "season_a": {"months": "Sep-Feb", "label": "Season A", "label_rw": "Igihembwe A"},
    "season_b": {"months": "Mar-Jun", "label": "Season B", "label_rw": "Igihembwe B"},
    "season_c": {"months": "Jul-Aug", "label": "Season C", "label_rw": "Igihembwe C"},
}
```

### 12.3 Currency

```python
# All financial data stored in USD internally
# Display in RWF using configurable exchange rate
EXCHANGE_RATE_RWF_PER_USD = 1350  # Configurable in settings
```

### 12.4 PSTA 5 Strategic Priorities

```python
PSTA5_PRIORITIES = [
    {"id": "productivity", "title": "Agricultural Productivity & Resilience",
     "mapped_components": ["agricultural_development", "climate_natural_resources"]},
    {"id": "irrigation", "title": "Irrigation Expansion (74K→132K ha)",
     "mapped_components": ["infrastructure"]},
    {"id": "post_harvest", "title": "Post-Harvest Loss Reduction",
     "mapped_components": ["infrastructure", "agricultural_development"]},
    {"id": "market_access", "title": "Market Access Improvement",
     "mapped_components": ["infrastructure", "governance_institutions"]},
    {"id": "financing", "title": "Agriculture Financing Expansion",
     "mapped_components": ["social_protection_equity", "governance_institutions"]},
    {"id": "nutrition", "title": "Nutrition-Sensitive Agriculture",
     "mapped_components": ["nutrition_health", "agricultural_development"]},
    {"id": "climate_smart", "title": "Climate-Smart Agriculture",
     "mapped_components": ["climate_natural_resources", "agricultural_development"]},
]
```

---

## 13. Project Structure

```
rwanda_backend/
├── fsfvi_engine/                        ← Rust crate (PyO3)
│   ├── Cargo.toml
│   ├── pyproject.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── core/
│   │   ├── weighting/
│   │   ├── services/
│   │   ├── auth/
│   │   ├── types.rs
│   │   ├── config.rs
│   │   ├── errors.rs
│   │   └── validators.rs
│   └── tests/
│
├── manage.py
├── requirements.txt
├── pyproject.toml                       ← Python project config
│
├── config/                              ← Django project config
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   ├── wsgi.py
│   ├── asgi.py
│   └── celery.py                        ← Celery configuration
│
├── apps/
│   ├── authentication/
│   ├── geography/
│   ├── fsfvi_data/
│   ├── assessments/
│   ├── optimization/
│   ├── analysis/
│   ├── planning/
│   ├── reports/
│   ├── alerts/
│   └── audit/
│
├── translations/                        ← i18n files
│   ├── en/
│   ├── rw/                              ← Kinyarwanda
│   └── fr/
│
├── fixtures/                            ← Initial data
│   ├── provinces.json
│   ├── districts.json
│   ├── sectors.json
│   ├── peer_countries.json
│   └── psta5_priorities.json
│
├── docker-compose.yml                   ← PostgreSQL + Redis + Celery + Django
├── Dockerfile
├── .env.example
└── Makefile                             ← Common commands
```

---

## 14. Implementation Phases

### Phase 1: Foundation (Week 1-3)

| # | Task | Component |
|---|---|---|
| 1.1 | Initialize Rust crate with PyO3 + Maturin skeleton | `fsfvi_engine/` |
| 1.2 | Port core calculations (gap, vulnerability, FSFVI, efficiency) | `engine/core/` |
| 1.3 | Port sensitivity parameter estimation | `engine/core/sensitivity.rs` |
| 1.4 | Port system metrics aggregation | `engine/core/metrics.rs` |
| 1.5 | Write Rust unit tests for core math (verify equivalence with existing) | `engine/tests/` |
| 1.6 | Set up Django project with apps skeleton | `config/`, `apps/` |
| 1.7 | Create PostgreSQL models + migrations (auth, geography, fsfvi_data) | All `models.py` |
| 1.8 | Seed Rwanda geographic data (5 provinces, 30 districts, 416 sectors) | `fixtures/` |
| 1.9 | Build Rust engine, verify Python import works | `maturin develop` |

### Phase 2: Auth + Weighting (Week 4-5)

| # | Task | Component |
|---|---|---|
| 2.1 | Port auth: Argon2 password, JWT, TOTP, backup codes, AES encryption | `engine/auth/` |
| 2.2 | Port all 4 weighting systems (AHP, Financial, Network, Hybrid) | `engine/weighting/` |
| 2.3 | Build Django auth views (login, logout, 2FA, password change) | `apps/authentication/` |
| 2.4 | Build JWT middleware (calls Rust for verification) | `apps/authentication/middleware.py` |
| 2.5 | Build role-based permissions | `apps/authentication/permissions.py` |
| 2.6 | Test auth end-to-end (login → JWT → protected endpoint) | Integration tests |

### Phase 3: Assessment + Optimization Services (Week 6-7)

| # | Task | Component |
|---|---|---|
| 3.1 | Port vulnerability assessment service | `engine/services/assessment.rs` |
| 3.2 | Port budget optimization (SCP + water-filling) | `engine/services/optimization.rs` |
| 3.3 | Port performance gap analysis + peer comparison | `engine/services/performance_gap.rs` |
| 3.4 | Build Django assessment views + serializers | `apps/assessments/` |
| 3.5 | Build Django optimization views + serializers | `apps/optimization/` |
| 3.6 | Build Django analysis views + serializers | `apps/analysis/` |
| 3.7 | Seed Rwanda FSFVI data (initial dataset) | `fixtures/` |
| 3.8 | Test: submit data → run assessment → get result | Integration tests |

### Phase 4: Scenarios + Planning + Decision Support (Week 8-9)

| # | Task | Component |
|---|---|---|
| 4.1 | Port scenario simulation service | `engine/services/scenarios.rs` |
| 4.2 | Port sensitivity analysis service | `engine/services/sensitivity.rs` |
| 4.3 | Port strategic planning (multi-year, MTEF) | `engine/services/planning.rs` |
| 4.4 | Port decision support (policy recommendations, crisis response) | `engine/services/decision_support.rs` |
| 4.5 | Port matrix generation (AHP, network) | `engine/services/matrices.rs` |
| 4.6 | Build Django views for all above | `apps/planning/`, `apps/analysis/` |

### Phase 5: Rwanda-Specific Features (Week 10-11)

| # | Task | Component |
|---|---|---|
| 5.1 | Build geographic endpoints (provinces, districts, map data) | `apps/geography/` |
| 5.2 | Build PSTA 5 alignment tracker | `apps/planning/` |
| 5.3 | Build data entry workflow (submit → review → validate) | `apps/fsfvi_data/` |
| 5.4 | Build Django Admin for all data models | All `admin.py` |
| 5.5 | Build alert system (thresholds, checking, history) | `apps/alerts/` |
| 5.6 | Build report generation (Celery tasks, PDF templates) | `apps/reports/` |
| 5.7 | Build audit middleware and views | `apps/audit/` |

### Phase 6: Integration + Polish (Week 12)

| # | Task | Component |
|---|---|---|
| 6.1 | Connect frontend to new backend (update API URLs) | Frontend config |
| 6.2 | End-to-end testing (login → assessment → report) | All |
| 6.3 | Performance testing (1000 concurrent requests) | Load tests |
| 6.4 | Security audit (auth, injection, CORS) | All |
| 6.5 | Django management commands (create_user, import_data, etc.) | Management commands |
| 6.6 | Docker Compose setup (PostgreSQL + Redis + Django + Celery) | DevOps |

---

## 15. Testing Strategy

### 15.1 Rust Unit Tests

```bash
cd fsfvi_engine/
cargo test
```

**Critical test cases:**
- Mathematical equivalence with existing fsfi-backend (same inputs → same outputs)
- Edge cases: zero allocation, zero gap, all components equal
- AHP consistency check (valid and invalid matrices)
- PageRank convergence
- Budget optimization with tight constraints
- Password hashing round-trip
- JWT create → verify → decode
- TOTP generation → verification

### 15.2 Django Tests

```bash
python manage.py test
```

**Test layers:**
- Model validation (constraints, unique together)
- Serializer validation (field types, required fields)
- View tests (permissions, response format)
- Service tests (DB → Rust → response)
- Middleware tests (JWT auth, audit logging)

### 15.3 Integration Tests

```bash
pytest tests/integration/
```

- Login flow with 2FA
- Data entry workflow (draft → submit → validate → assess)
- Assessment with real data → verify FSFVI score
- Geographic aggregation (district → province → national)
- Report generation end-to-end

### 15.4 Mathematical Equivalence Tests

Create a test suite that runs identical inputs through both the existing `fsfi-backend` and the new `fsfvi_engine` crate, comparing outputs to 6 decimal places.

```python
# tests/test_math_equivalence.py
def test_fsfvi_equivalence():
    """Verify new Rust engine matches existing fsfi-backend exactly."""
    components = REFERENCE_COMPONENTS  # Same test data

    # New engine
    new_result = json.loads(fsfvi_engine.run_assessment(components, "hybrid", "normal_operations"))

    # Reference (from existing backend via HTTP)
    ref_result = requests.post("http://localhost:8080/api/v1/fsfvi/assessments", ...).json()

    assert abs(new_result["fsfvi_score"] - ref_result["fsfvi_score"]) < 1e-6
```

---

## 16. Deployment Architecture

### 16.1 Docker Compose (Development)

```yaml
version: "3.9"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: fsfvi_rwanda
      POSTGRES_USER: fsfvi
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    environment:
      - DATABASE_URL=postgresql://fsfvi:${DB_PASSWORD}@db:5432/fsfvi_rwanda
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis

  celery:
    build: .
    command: celery -A config worker -l info
    environment:
      - DATABASE_URL=postgresql://fsfvi:${DB_PASSWORD}@db:5432/fsfvi_rwanda
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  celery-beat:
    build: .
    command: celery -A config beat -l info
    environment:
      - DATABASE_URL=postgresql://fsfvi:${DB_PASSWORD}@db:5432/fsfvi_rwanda
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
```

### 16.2 Dockerfile

```dockerfile
FROM python:3.12-slim

# Install Rust toolchain for building fsfvi_engine
RUN apt-get update && apt-get install -y curl build-essential libpq-dev && \
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install maturin
RUN pip install maturin

WORKDIR /app

# Build Rust engine first (cached layer)
COPY fsfvi_engine/ /app/fsfvi_engine/
RUN cd fsfvi_engine && maturin build --release && \
    pip install target/wheels/fsfvi_engine-*.whl

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy Django project
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

### 16.3 Production Recommendations

| Aspect | Recommendation |
|---|---|
| **WSGI server** | Gunicorn with 4 workers (CPU-bound Rust calls release GIL) |
| **Database** | PostgreSQL 16 on AWS RDS (Africa region) |
| **Cache** | Redis 7 (ElastiCache) for assessment results + sessions |
| **Task queue** | Celery with Redis broker for reports + alerts |
| **Hosting region** | AWS Africa (Cape Town) or Azure South Africa |
| **SSL** | Required — HTTPS only, HSTS enabled |
| **Domain** | `api.fsfvi.minagri.gov.rw` |
| **Monitoring** | Sentry for errors, Prometheus + Grafana for metrics |
| **Backup** | Daily PostgreSQL snapshots, 90-day retention |

---

## Summary

This backend architecture delivers:

1. **Native-speed computation** — All FSFVI math, optimization, and crypto runs in compiled Rust
2. **Rapid Django development** — ORM, admin panel, REST API, background jobs, migrations
3. **Zero HTTP overhead** — Rust functions called as Python imports (PyO3), not HTTP requests
4. **Single deployable** — One Docker image containing both Django and the Rust engine
5. **Government-grade security** — Rust-powered auth (Argon2, JWT, AES-256-GCM, TOTP)
6. **Rwanda-specific** — Geographic hierarchy, PSTA 5 alignment, seasonal data, RWF currency, Kinyarwanda support
7. **Auditable** — Complete audit trail, versioned data, workflow states

**Estimated effort:** 12 weeks with 1 Rust developer (engine) + 1 Django developer (API/data) working in parallel, converging at Phase 3.

---

*This guide should be reviewed by the project technical lead before implementation begins.*
