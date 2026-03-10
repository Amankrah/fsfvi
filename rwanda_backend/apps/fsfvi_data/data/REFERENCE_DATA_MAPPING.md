# Reference data mapping: FSFVI indicators vs World Bank / FAO

This document records which indicators have **real** country-level reference data (World Bank API or other official source) and which do not. No claims are made beyond what is verified.

**Data file:** `reference_distributions.json` holds real distributions where available.  
**Fallback:** `compute_benchmark_sample.py` uses `_FALLBACK_DISTRIBUTIONS` for indicators with no real data (illustrative value lists only).

---

## Indicators with real World Bank data (in reference_distributions.json)

| Code   | Indicator name (short)                    | WB indicator      | Notes |
|--------|-------------------------------------------|-------------------|--------|
| IND-01 | Cereal yield (t/ha)                       | AG.YLD.CREL.KG    | Cereal yield, kg/ha; 223 countries, 2022. |
| IND-02 | Irrigated land (% of agricultural land)   | AG.LND.IRIG.AG.ZS | Agricultural irrigated land %; 55 countries, 2022. |
| IND-03 | Fertilizer use (kg/ha arable)              | AG.CON.FERT.ZS    | Fertilizer consumption kg/ha; 236 countries, 2022. |
| IND-20 | Stunting, height for age (% under 5)       | SH.STA.STNT.ZS    | Prevalence of stunting; 32 countries, 2022. |
| IND-21 | Food insecurity, moderate or severe (%)   | SN.ITK.MSFI.ZS    | FIES-based; 105 countries, 2021. |

---

## Indicators with NO suitable World Bank / FAO API series found

Below, “NOT FOUND” means no comparable country-level time series was identified in the World Bank API (WDI) or in publicly documented FAO APIs that we could use programmatically. This is an honest assessment; some concepts exist in reports or one-off datasets but not as a standard WB/FAO indicator code.

| Code   | Indicator name (short)              | Status    | Notes |
|--------|-------------------------------------|----------|--------|
| IND-04 | Improved seed adoption (%)          | NOT FOUND | WB has no “seed adoption” or “improved varieties” indicator. Research/FAO mention adoption but not as a single WDI series. |
| IND-05 | Crop diversification index          | NOT FOUND | WB has crop production index (AG.PRD.CROP.XD), not a diversification index. Other indices (e.g. DiverIMPACTS) are not in WB API. |
| IND-06 | Milk yield per cow                  | NOT FOUND | FAO has milk per animal in Livestock Primary; not integrated here. WB has livestock production index only (aggregate). |
| IND-07 | Meat productivity (kg/head)           | NOT FOUND | WB has livestock production index (AG.PRD.LVSK.XD), not kg per head. FAO has per-animal data but not wired in this pipeline. |
| IND-08 | Improved breed share (%)            | NOT FOUND | No WB or standard FAO indicator for “improved breed share”. |
| IND-09 | Animal mortality rate (%)           | NOT FOUND | No direct WB/FAO indicator for livestock mortality rate. |
| IND-10 | Protein availability (g/day)       | NOT FOUND | FAO SUA has protein supply g/capita/day; not fetched via WB. CC.PRO.ANI (WB) returned no data in our checks. |
| IND-11 | Post-harvest loss (%)               | NOT FOUND | FAO has Food Loss Index (SDG 12.3.1); country-level % not integrated here. |
| IND-12 | Storage capacity (MT)               | NOT FOUND | No WB indicator for storage capacity. |
| IND-13 | Cold chain coverage (%)            | NOT FOUND | No WB/FAO indicator for cold chain coverage. |
| IND-14 | Share processed exports (%)        | NOT FOUND | WB has food/agriculture export values (e.g. BX.GSR.AGRI.CD), not “share processed”. |
| IND-15 | Food safety certification (%)      | NOT FOUND | No WB indicator for certification share. |
| IND-16 | Share of production marketed (%)   | NOT FOUND | No WB indicator for “share marketed”. |
| IND-17 | Export revenue (USD)               | NOT FOUND | WB has total/cereal/food exports in current USD (e.g. BX.GSR.AGRI.CD); not mapped as “indicator revenue” series here. |
| IND-18 | Price volatility index             | NOT FOUND | No WB indicator for agricultural price volatility index. |
| IND-19 | Cooperative participation (%)      | NOT FOUND | No WB indicator for cooperative membership/participation. |
| IND-22 | Dietary diversity score            | NOT FOUND | FAO has MDD-W etc.; not a single WB time series. |
| IND-25 | Farmers with credit (%)            | NOT FOUND | WB has financial inclusion indicators, not “farmers with credit %”. |
| IND-27 | Insured farmers (%)                 | NOT FOUND | No WB indicator for agricultural insurance coverage. |
| IND-29 | Farmers receiving extension (%)     | NOT FOUND | No WB indicator for extension coverage. |
| IND-30 | R&D spending (% ag GDP)            | NOT FOUND | No WB series specifically for agricultural R&D share of ag GDP. |
| IND-31 | Mechanization rate (%)             | NOT FOUND | WB has AG.LND.TRAC.ZS (tractors per 100 sq km arable); in our test (2020) the API returned no data. Not added. |
| IND-32 | CSA adoption (%)                   | NOT FOUND | No WB indicator for climate-smart agriculture adoption. |
| IND-33 | Land under conservation (%)        | NOT FOUND | WB has forest area, land use; no direct “agricultural land under conservation” series. |
| IND-34 | Soil erosion risk (%)              | NOT FOUND | No WB indicator for soil erosion risk. |
| IND-35 | GHG intensity                      | NOT FOUND | No WB indicator for agricultural GHG intensity (kg CO2eq/kg product). |
| IND-36 | Irrigation water efficiency (%)    | NOT FOUND | No WB indicator for irrigation water efficiency. |
| IND-37 | Disaster-affected land (ha)       | NOT FOUND | WB has disaster-related indicators (e.g. CC.*); no direct “disaster-affected agricultural land” series used here. |

---

## Critical analysis: fallback vs engine null benchmark

When `benchmark_value` is **NULL** in the DB, the FSFI engine does not leave it as “no benchmark”. It substitutes a value so the gap formula can run:

- **Engine (Rust) when `benchmark_value` is null:**  
  `benchmark = 100.0 / n * 100.0` → **10000/n** (with n = number of indicators, e.g. 33 → ~303).  
  When `observed_value` is also null it uses `observed = share_weighted_percent * 100.0` (budget share × 100).

- **Fallback (Django command):**  
  We compute a 10th or 90th percentile from either real data (JSON) or an illustrative value list and **write** that into `benchmark_value`. The engine then receives a non-null benchmark in the indicator’s real unit (e.g. % for stunting, t/ha for yield).

**Which is more reflective and realistic for the country?**

| Aspect | Engine null handling | Fallback (illustrative or real) |
|--------|----------------------|----------------------------------|
| **What the benchmark is** | Same number for every indicator (~303 for n=33). Not tied to any real-world metric. | Per-indicator, in the same unit as the indicator (e.g. % stunting, t/ha yield). |
| **Interpretation** | “Gap” is between budget share (or observed) and 303. Not interpretable as “Rwanda vs countries” or “Rwanda vs target”. | “Gap” is between Rwanda’s value and a plausible 10th/90th percentile in that indicator’s unit. Interpretable as “above/below this target”. |
| **Units** | 303 has no meaning in “% stunting” or “t/ha”. Mixing scales if observed is in real units. | Benchmark and observed are in the same unit (when observed is present). |
| **Country realism** | Does not reflect Rwanda’s position relative to other countries or to any real benchmark. | Real data (WB): reflects international distribution. Illustrative: not real data, but at least a plausible range in the right unit. |

**Conclusion:** The **fallback (and thus populating `benchmark_value` via the command)** is more reflective and realistic than leaving benchmarks null and letting the engine substitute 10000/n:

1. The engine’s null benchmark is **not indicator-specific** and **not in a real-world unit**, so the resulting gap does not reflect how Rwanda performs on that indicator relative to a meaningful target or to other countries.
2. The fallback gives a benchmark in the **indicator’s unit** and a **plausible** 10th/90th percentile (or real WB distribution when available), so the gap is at least interpretable and, for the five indicators with real data, reflects international comparison.
3. When **observed_value** is null, the engine uses budget share × 100 as “observed”; then both engine null and fallback benchmark mix “budget share” with “indicator scale” if the benchmark is in %. So neither is fully realistic in that case—but the fallback still keeps the **benchmark** in a real-world scale for when observed is later filled, and avoids the arbitrary 303.

**Recommendation:** Keep using the benchmark command (with real data where possible and illustrative fallback otherwise) so that the engine receives non-null benchmarks. Prefer that over relying on the engine’s null handling for any indicator that is meant to be compared to a real-world or plausible target.

---

## Observed value: is the engine logic robust?

When `observed_value` is **NULL**, the engine (and in one code path the Django view) substitutes:

- **observed = share_weighted_percent × 100**

So “observed performance” is set to **budget share (in %) × 100**. For example, if an indicator has 5% of the weighted budget, observed = 500 (assuming share is stored as 5.0). That value is then used in the same gap formula as real observed data (e.g. stunting 33%, yield 1.2 t/ha).

**Where it breaks**

| Issue | Why it’s not robust |
|-------|----------------------|
| **Different scale** | Budget share is in “% of total budget” (e.g. 5 → 500 after ×100). Real benchmarks are in indicator units (e.g. 9.4% stunting, 6.5 t/ha). Comparing 500 to 9.4 gives gap ≈ \|500−9.4\|/500 ≈ 0.98 — almost always near maximum gap when observed is null and benchmark is real. |
| **Wrong meaning** | Budget share is a **policy input** (how much we allocate), not an **outcome** (how well we perform). High share can mean “we invest a lot because the sector is weak.” Using it as a performance proxy can invert the intended interpretation. |
| **No unit check** | The engine does not check that observed and benchmark are in the same unit. It accepts any two non‑negative numbers. So null observed + real benchmark mixes “budget-share scale” with “indicator scale” and produces an uninterpretable gap. |
| **Double default in views** | In `assessments/views.py` (quick check), the Python side also does `observed_value = ind.get("observed_value") or ind["share_weighted_percent"] * 100` and `benchmark_value = ind.get("benchmark_value") or 100.0`. So the same fragile substitution can happen before the payload reaches the engine. |

**Conclusion:** The current observed-value logic is **not robust** when:

- `observed_value` is null and  
- `benchmark_value` is non-null and in real units (from our benchmark command).

In that case the gap is dominated by scale mismatch, not by actual performance. When **both** observed and benchmark are null, engine and fallback use the same synthetic scale (share×100 vs 10000/n), so the gap is at least internally consistent but still not meaningful for “Rwanda vs world/target.”

**Recommendations for robustness**

1. **Prefer real observed data**  
   Populate `observed_value` from surveys, admin data, or WB/FAO where possible so the engine compares like-with-like (observed and benchmark in the same unit).

2. **When observed is missing, avoid mixing scales**  
   Options the codebase could adopt:  
   - **Option A:** If `observed_value` is null, do **not** substitute budget share; treat the indicator as “no performance data” and either exclude it from the gap aggregate or use a neutral gap (e.g. 0) so it does not distort the overall score.  
   - **Option B:** If `observed_value` is null, require `benchmark_value` to also be null for that indicator and use the engine’s synthetic pair (share×100, 10000/n) only for that indicator, and document that the resulting score is “budget-only, no outcome data.”  
   - **Option C:** In the API/UI, mark indicators with null observed as “missing data” and report stress/gap only for indicators that have both observed and benchmark in real units.

3. **Optional: same-unit guard**  
   Add a check (in Django or in the engine) that when both observed and benchmark are present, they lie in plausible ranges for the indicator’s unit (e.g. stunting 0–100%, yield positive and in t/ha range). Reject or flag when they are clearly on different scales (e.g. observed 500 vs benchmark 9.4).

**Implementation (Option A applied):**

- **Engine** (`fsfi_engine/src/services/assessment.rs`): When `observed_value` is null and `benchmark_value` is set, the engine now uses `observed = benchmark` so that the performance gap is 0 (neutral). Indicators with missing outcome data no longer distort the aggregate. When both are null, the previous synthetic pair (share×100, 10000/n) is still used for backward compatibility.
- **Django** (`apps/assessments/views.py`, quick check): When building the component payload, if `observed_value` is missing we set `observed_value = benchmark_value` instead of `share_weighted_percent * 100`, so the same neutral-gap behavior applies.

---

## Summary

- **With real data (5):** IND-01, IND-02, IND-03, IND-20, IND-21.  
- **Without real data (28):** IND-04–IND-19, IND-22, IND-25, IND-27, IND-29–IND-37.  

For indicators without real data, benchmarks are computed from the **illustrative fallback** lists in `compute_benchmark_sample.py` so that every indicator can still receive a 10th/90th percentile benchmark when you run the command.

To add more real data later: (1) identify a WB/FAO indicator code and API that returns country-level values in the same unit as the FSFVI indicator, (2) fetch and add an entry to `reference_distributions.json`, (3) update this mapping and optionally remove the code from `_FALLBACK_DISTRIBUTIONS` if it is no longer needed.

---

## Manually computing observed_value from the table

`observed_value` is not derived from other columns by a business formula; it is normally filled from external data (e.g. Excel **Obs_value** via `import_indicator_parameters`). When it is **NULL**, the FSFI engine uses an **imputation** so the gap can still be computed. You can apply that same imputation to the table:

**Formulas (same as engine):**

| Condition | Imputed observed_value |
|-----------|------------------------|
| `observed_value` is not NULL | Use actual value (no formula). |
| `observed_value` is NULL and `benchmark_value` is not NULL | **imputed = benchmark_value** (neutral gap). |
| Both NULL | **imputed = share_weighted_percent × 100** (synthetic scale). |

**Command to compute and optionally fill:**

```bash
python manage.py compute_observed_imputed --fiscal-year 2018
python manage.py compute_observed_imputed --fiscal-year 2018 --limit 0   # print all rows
python manage.py compute_observed_imputed --fiscal-year 2018 --apply    # write to DB
```

This prints a sample table with `share_w`, `benchmark`, `observed(DB)`, `imputed`, and which formula was used (`actual` / `benchmark (neutral gap)` / `share_weighted_percent * 100`).
