# Demo Government Backend - Compilation Fixes

## Issue Summary
The demo_gov_backend is calling FSFVI service methods with incorrect signatures that don't match the actual FSFVI backend API.

## Root Causes

### 1. **Database Tables Missing** ✅ FIXED
- SQLx compile-time checks failing because tables don't exist
- **Solution**: Migrations run automatically in main.rs (lines 78-81)
- Tables will be created on first run

### 2. **Missing extract_user_from_token Function** ✅ FIXED
- Added to middleware/security.rs with JWT validation

### 3. **Incorrect Service Method Signatures** ❌ TO FIX
All handler calls need to match the actual FSFVI backend API signatures:

#### peer_comparison
- **Current**: `peer_comparison(components, Vec<String>)`
- **Required**: `peer_comparison(components, Vec<PeerCountryData>)`
- **Fix**: Convert Vec<String> to Vec<PeerCountryData> with HashMap<String, f64>

#### track_gap_closure
- **Current**: `track_gap_closure(components, target_period_months)`
- **Required**: `track_gap_closure(baseline_components, current_components, time_period_months)`
- **Fix**: Use same components for both baseline and current (single period snapshot)

#### recommend_targets
- **Current**: `recommend_targets(components)`
- **Required**: `recommend_targets(components, target_timeline_months, peer_countries)`
- **Fix**: Add default timeline (24 months) and None for peer_countries

#### run_assessment
- **Current**: `run_assessment(components)`
- **Required**: `run_assessment(components, country_name, weighting_method, scenario)`
- **Fix**: Add None for all optional parameters

#### generate_multi_year_plan
- **Current**: `generate_multi_year_plan(components, planning_years, target_fsfvi, total_budget_ceiling)`
- **Required**: `generate_multi_year_plan(components, country_name, planning_years, target_fsfvi, yearly_budget_constraints)`
- **Fix**: Add country_name as 2nd parameter, convert budget ceiling to yearly_budget_constraints

#### generate_mtef
- **Current**: `generate_mtef(components, annual_budget_growth_percent)`
- **Required**: `generate_mtef(components, target_improvement_percent, yearly_budget_growth_rate)`
- **Fix**: Add default target_improvement_percent (20.0)

### 4. **FsfviClient API Key Type Mismatch** ❌ TO FIX
- **Current**: `FsfviClient::new(api_url, Option<String>)`
- **Required**: `FsfviClient::new(api_url, String)`
- **Fix**: Unwrap the Option with a default value for non-API-key mode

## Implementation Plan

1. Fix FsfviClient::new to handle Option<String> properly
2. Fix all handler method calls to match exact FSFVI backend signatures
3. Test compilation
4. Verify runtime behavior

## Production Considerations

- All peer country data should come from a database, not empty HashMaps
- track_gap_closure needs actual baseline vs current data from database
- Budget constraints should be configurable per year
- API key should be required in production (not optional)
