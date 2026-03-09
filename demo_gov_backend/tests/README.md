# Demo Government Backend - Integration Tests

## Overview

This directory contains **comprehensive integration test suites** for the Demo Government FSFVI platform, which is a **critical government decision-making system where livelihoods depend on accurate calculations**.

### What These Tests Do

- ✅ Connect to real SQLite database with Demo Government FY 2025 data
- ✅ Make actual HTTP calls to the FSFVI API backend (fsfi-backend)
- ✅ Validate real responses against expected business logic
- ✅ Test critical government workflows end-to-end
- ✅ Verify data integrity and calculation accuracy

### Test Data Source

**Database:** `demo_gov_backend.db`
**Migration:** `migrations/006_demo_fsfvi_data.sql`
**Government:** Demo Republic
**Fiscal Year:** 2025
**Total Budget:** $1.2 billion USD
**Components:** 6 (all food system component types)

## Prerequisites

### 1. Environment Setup

Ensure you have a `.env` file with:

```env
DATABASE_URL=sqlite:./demo_gov_backend.db
FSFVI_API_URL=http://localhost:8080
FSFVI_API_KEY=fsfi_live_8Smv8OP90QFEJXhYwifC6BfmWhzonjnk
```

### 2. Database Setup

Run migrations to populate demo data:

```bash
# From demo_gov_backend directory
sqlx database create
sqlx migrate run
```

Verify data exists:

```bash
sqlite3 demo_gov_backend.db "SELECT component_type, observed_value, benchmark_value, ROUND(financial_allocation_usd/1000000, 0) AS budget_millions FROM fsfvi_data WHERE government_id = 'demo_government' AND fiscal_year = 2025;"
```

Expected output (6 components):

```
agricultural_development|6.8|10.0|420
infrastructure|58.2|75.0|280
nutrition_health|68.5|65.0|185
climate_natural_resources|42.8|55.0|155
social_protection_equity|71.2|65.0|120
governance_institutions|54.5|70.0|40
```

### 3. FSFVI API Backend

**CRITICAL:** The actual FSFVI API backend must be running before tests can execute.

#### Option A: Run Local FSFVI Backend

```bash
# Clone and run the main FSFVI backend
cd /path/to/fsfi-backend
cargo run --release
```

The backend should be available at: `http://localhost:8080`

#### Option B: Point to Remote API

Update `.env`:

```env
FSFVI_API_URL=https://api.fsfvi.ai
FSFVI_API_KEY=your_production_api_key
```

### 4. Verify API Connectivity

Test API health:

```bash
curl http://localhost:8080/health
```

Should return: `{"status": "ok"}`

## Running the Tests

### Run All Integration Tests

```bash
cargo test --test performance_gap_integration_tests -- --nocapture
```

The `--nocapture` flag shows detailed output including:
- Component data loaded from database
- API call details
- Response validation results
- Business logic verification

### Run Specific Test

```bash
# Test API connectivity
cargo test --test performance_gap_integration_tests test_fsfvi_api_health_check -- --nocapture

# Test performance gap analysis with real data
cargo test --test performance_gap_integration_tests test_analyze_performance_gaps_with_real_data -- --nocapture

# Test peer comparison
cargo test --test performance_gap_integration_tests test_peer_comparison_with_real_data -- --nocapture

# Test gap closure tracking
cargo test --test performance_gap_integration_tests test_track_gap_closure_12_months -- --nocapture

# Test target recommendations
cargo test --test performance_gap_integration_tests test_recommend_targets_5_year_plan -- --nocapture
```

### Run Tests with Logging

```bash
RUST_LOG=debug cargo test --test performance_gap_integration_tests -- --nocapture
```

## Test Suites

### 1. Assessment Integration Tests (`assessment_integration_tests.rs`)

**Coverage:** FSFVI vulnerability assessment, quick checks, multiple weighting methods, scenario analysis

**Key Tests:**
- `test_run_assessment_with_real_data` - Full FSFVI assessment
- `test_run_assessment_with_hybrid_weighting` - Hybrid weighting method
- `test_assessment_climate_shock_scenario` - Crisis scenario testing
- `test_quick_check_with_real_data` - Quick vulnerability check

**20+ tests covering all assessment functionality**

### 2. Budget Optimization Integration Tests (`budget_optimization_integration_tests.rs`)

**Coverage:** Budget allocation efficiency, reallocation planning, ROI analysis, SCP optimization

**Key Tests:**
- `test_analyze_allocation_efficiency_with_real_data` - Efficiency analysis
- `test_generate_reallocation_plan_with_real_data` - Budget reallocation
- `test_optimize_allocation_minimize_fsfvi` - Sequential Convex Programming
- `test_calculate_roi_with_multiple_scenarios` - ROI comparison

**25+ tests covering all optimization functionality**

### 3. Strategic Planning Integration Tests (`strategic_planning_integration_tests.rs`)

**Coverage:** Multi-year planning, MTEF generation, historical trends, SDG achievement

**Key Tests:**
- `test_generate_multi_year_plan_with_real_data` - 5-year strategic plans
- `test_generate_mtef_with_real_data` - Standard 3-year MTEF
- `test_fetch_historical_trends_multi_year` - Historical trend analysis
- `test_strategic_planning_for_sdg_achievement` - SDG 2 planning
- `test_budget_realism_check` - Fiscal feasibility validation

**18+ tests covering all strategic planning functionality**

### 4. Performance Gap Analysis Tests (Legacy)

### 4.1 API Connectivity Tests
- `test_fsfvi_api_health_check` - Verify API is responding
- `test_database_connectivity` - Verify database connection
- `test_demo_data_integrity` - Verify demo data is correctly loaded

### 2. Performance Gap Analysis Tests
- `test_analyze_performance_gaps_with_real_data` - Full analysis with all 6 components
- `test_analyze_single_component_gap` - Single component analysis

**What's Validated:**
- Overall gap calculation
- Component-level gaps (absolute and percentage)
- Priority level assignment (high/medium/low)
- Cost estimates for closing gaps
- Actionable recommendations

**Known Expected Results (from demo data):**
- Agricultural Development: ~-32% gap (underperforming vs CAADP 10% target)
- Infrastructure: ~-22% gap (underperforming)
- Nutrition & Health: ~+5% gap (outperforming - above WHO target)
- Social Protection: ~+10% gap (outperforming)

### 3. Peer Comparison Tests
- `test_peer_comparison_with_real_data` - Compare against Rwanda, Ghana, Kenya

**What's Validated:**
- FSFVI score calculation
- Peer averages computed correctly
- Rankings across components
- Relative position assessment
- Best practices identified from peers

### 4. Gap Closure Tracking Tests
- `test_track_gap_closure_12_months` - 1-year progress tracking
- `test_track_gap_closure_36_months` - 3-year progress tracking

**What's Validated:**
- Baseline vs current FSFVI comparison
- FSFVI change detection
- Monthly improvement rate calculation
- Component-level progress tracking
- On-track vs behind status

### 5. Target Recommendation Tests
- `test_recommend_targets_5_year_plan` - 5-year national plan
- `test_recommend_targets_10_year_plan` - 10-year strategic plan

**What's Validated:**
- Realistic target setting for each component
- Achievability assessment
- Budget requirement estimates
- Improvement required calculations

### 6. Critical Business Logic Tests
- `test_budget_efficiency_vs_performance` - Verify low-budget/high-gap flagging
- `test_cross_component_dependencies` - Verify governance priority flagging

**CRITICAL:** These tests validate that the system:
- Flags underfunded components with high gaps as HIGH priority
- Recognizes cross-component dependencies (e.g., weak governance affects all)
- Provides appropriate recommendations

### 7. Error Handling Tests
- `test_invalid_timeline_validation` - Reject invalid timelines
- `test_empty_components_validation` - Reject empty inputs

## Expected Test Output

### Successful Test Run

```
running 15 tests

=== Testing Performance Gap Analysis ===
Components loaded: 6
  - agricultural_development: observed=6.8, benchmark=10.0, allocation=$420M
  - infrastructure: observed=58.2, benchmark=75.0, allocation=$280M
  ...

✓ API call successful
Processing time: 145ms

=== Performance Gap Analysis Results ===
Overall Gap: -18.5%
Estimated Cost to Close: $850M

Priority Areas:
  - agricultural_development
  - governance_institutions
  - climate_natural_resources

Top Recommendations:
  1. Increase agricultural budget to meet CAADP 10% target
  2. Strengthen institutional capacity for governance
  3. Accelerate climate adaptation investments

test test_analyze_performance_gaps_with_real_data ... ok
...

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

### Failed Test (API Not Running)

```
test test_fsfvi_api_health_check ... FAILED

failures:

---- test_fsfvi_api_health_check stdout ----
thread 'test_fsfvi_api_health_check' panicked at 'FSFVI API is not responding.
Ensure the backend is running at http://localhost:8080'
```

**Solution:** Start the FSFVI API backend before running tests.

### Failed Test (Database Missing)

```
test test_database_connectivity ... FAILED

failures:

---- test_database_connectivity stdout ----
thread 'test_database_connectivity' panicked at 'Failed to connect to test database'
```

**Solution:** Run `sqlx migrate run` to create and populate the database.

## Troubleshooting

### Problem: API Connection Refused

```
Error: NetworkError("Failed to send request to /api/v1/fsfvi/performance-gaps/analyze:
error sending request for url (http://localhost:8080/api/v1/fsfvi/performance-gaps/analyze):
error trying to connect: tcp connect error: Connection refused")
```

**Solution:**
1. Start the FSFVI API backend: `cd fsfi-backend && cargo run`
2. Verify it's listening: `curl http://localhost:8080/health`

### Problem: Database Not Found

```
Error: Failed to connect to test database
```

**Solution:**
```bash
sqlx database create
sqlx migrate run
```

### Problem: No Demo Data

```
assertion failed: count == 6, Expected 6 components for Demo Government FY 2025
```

**Solution:**
```bash
# Re-run migrations to populate demo data
sqlx migrate run
```

### Problem: Invalid API Key

```
Error: ApiError { status: 401, message: "Unauthorized" }
```

**Solution:**
1. Check `.env` file has correct `FSFVI_API_KEY`
2. Verify API key is valid in FSFVI backend

### Problem: Calculation Mismatches

If calculations don't match expected results, this could indicate:

1. **Bug in FSFVI algorithm** - Critical! Review algorithm implementation
2. **Demo data changed** - Verify database matches `migrations/006_demo_fsfvi_data.sql`
3. **Test expectations outdated** - Update test expectations if demo data changed

**Action:** Review test output carefully and investigate discrepancies.

## Test Maintenance

### When Demo Data Changes

If you update `migrations/006_demo_fsfvi_data.sql`:

1. Update test expectations in `performance_gap_integration_tests.rs`
2. Update "Expected Results" in this README
3. Re-run all tests to verify

### When API Changes

If FSFVI API endpoints or response structures change:

1. Update `models.rs` to match new API structure
2. Update test assertions
3. Verify backward compatibility

### Adding New Tests

When adding new tests:

1. Follow existing test naming conventions (`test_<functionality>_<scenario>`)
2. Include detailed `println!` statements for debugging
3. Validate both success and error cases
4. Update this README with new test descriptions

## Performance Benchmarks

Expected test execution times (with warm API):

| Test | Expected Time |
|------|--------------|
| API connectivity | < 100ms |
| Database queries | < 50ms |
| Performance gap analysis | 100-300ms |
| Peer comparison | 150-400ms |
| Gap closure tracking | 200-500ms |
| Target recommendations | 150-400ms |

If tests are significantly slower, investigate:
- API backend performance
- Database query optimization
- Network latency

## Security Considerations

### API Keys

**NEVER commit `.env` files** with production API keys.

For testing:
- Use dedicated test API keys
- Rotate keys regularly
- Use separate keys for dev/staging/production

### Database

Tests use **read-only queries** on demo data.

If you add tests that modify data:
- Use transactions with rollback
- Use separate test database
- Document data mutation clearly

## Critical Success Criteria

For this government-level system, tests **MUST** verify:

1. ✅ **Data Integrity:** All calculations use correct source data
2. ✅ **Calculation Accuracy:** Results match expected mathematical operations
3. ✅ **Business Logic:** Priority flagging aligns with policy needs
4. ✅ **Error Handling:** Invalid inputs are rejected gracefully
5. ✅ **Recommendations:** Actionable advice is provided
6. ✅ **Audit Trail:** All operations are logged

**If any test fails, do NOT deploy to production.**

## Support

For issues with:
- **Tests:** Review test output and this README
- **API:** Check FSFVI backend logs
- **Database:** Verify migrations completed
- **Business Logic:** Consult FSFVI algorithm specification

## License

Government use only. See main project LICENSE.
