# Reference Data Mapping: FSFVI Indicators

This document records which indicators have **real** country-level reference data (World Bank API or other official source) and which use research-based distributions.

**Data file:** `reference_distributions.json` holds all distributions.
**Command:** `python manage.py compute_benchmark_sample` computes 10th/90th percentile benchmarks.

**Last updated:** 2024-03-13

---

## Summary

| Category | Count | Description |
|----------|-------|-------------|
| World Bank API (real data) | 20 | Direct country-level data from WDI |
| Research-based distributions | 17 | Based on FAO reports, IFPRI, AU/NEPAD |
| **Total** | **37** | All FSFVI indicators covered |

---

## Indicators with World Bank API Data (20)

| Code | Indicator | WB Indicator | Countries | Notes |
|------|-----------|--------------|-----------|-------|
| IND-01 | Cereal yield (t/ha) | AG.YLD.CREL.KG | 223 | Primary WB indicator |
| IND-02 | Irrigated land (%) | AG.LND.IRIG.AG.ZS | 55 | Primary WB indicator |
| IND-03 | Fertilizer use (kg/ha) | AG.CON.FERT.ZS | 236 | Primary WB indicator |
| IND-06 | Livestock production index | AG.PRD.LVSK.XD | 174 | Index (2014-16=100) |
| IND-10 | Depth of hunger | SN.ITK.DPTH | 50 | kcal/person/day deficit |
| IND-17 | Exports (% of GDP) | NE.EXP.GNFS.ZS | 431 | Proxy for export revenue |
| IND-19 | Rural population (%) | SP.RUR.TOTL.ZS | 471 | Proxy for cooperative reach |
| IND-20 | Stunting rate (%) | SH.STA.STNT.ZS | 32 | Primary WB indicator |
| IND-21 | Food insecurity (%) | SN.ITK.MSFI.ZS | 105 | FIES-based measure |
| IND-22 | Undernourishment (%) | SN.ITK.DEFC.ZS | 510 | Prevalence of undernourishment |
| IND-23 | Anemia prevalence (%) | SH.ANM.ALLW.ZS | 410 | Proxy for protein adequacy |
| IND-24 | Food production index | AG.PRD.FOOD.XD | 1017 | Index (2014-16=100) |
| IND-25 | Account ownership (%) | FX.OWN.TOTL.ZS | 83 | Financial inclusion proxy |
| IND-26 | Bank branches/100k | FB.CBK.BRCH.P5 | 391 | Agricultural credit access |
| IND-27 | Poverty headcount (%) | SI.POV.NAHC | 52 | Proxy for insurance need |
| IND-28 | Mobile subscriptions | IT.CEL.SETS.P2 | 457 | Per 100 people |
| IND-29 | Employment in agriculture (%) | SL.AGR.EMPL.ZS | 447 | Extension reach proxy |
| IND-30 | R&D expenditure (% GDP) | GB.XPD.RSDV.GD.ZS | 679 | Overall R&D spending |
| IND-33 | Protected areas (%) | ER.LND.PTLD.ZS | 551 | Terrestrial protected areas |
| IND-36 | Access to electricity (%) | EG.ELC.ACCS.ZS | 331 | Rural infrastructure proxy |

---

## Indicators with Research-Based Distributions (17)

These indicators use distributions based on research reports from FAO, IFPRI, CGIAR, AU/NEPAD, and other authoritative sources.

| Code | Indicator | Source | Range |
|------|-----------|--------|-------|
| IND-04 | Improved seed adoption (%) | IFPRI/FAO seed surveys | 5-95% |
| IND-05 | Crop diversification index | DiverIMPACTS/FAO | 0.15-0.90 |
| IND-07 | Meat productivity (kg/head) | FAO Livestock Primary | 25-320 kg |
| IND-08 | Improved breed share (%) | FAO/ILRI livestock surveys | 5-90% |
| IND-09 | Animal mortality rate (%) | FAO/OIE livestock health | 2-30% |
| IND-11 | Post-harvest loss (%) | FAO Food Loss Index | 3-35% |
| IND-12 | Storage capacity (kg/capita) | WFP/FAO assessments | 5-350 kg |
| IND-13 | Cold chain coverage (%) | Global Cold Chain Alliance | 1-80% |
| IND-14 | Share processed exports (%) | UNCTAD/FAO trade data | 5-85% |
| IND-15 | Food safety certification (%) | ISO/GFSI certification | 1-70% |
| IND-16 | Share of production marketed (%) | FAO/WB commercialization | 15-95% |
| IND-18 | Price volatility index | FAO Food Price Index | 5-55 |
| IND-31 | Mechanization rate (%) | FAO/CIMMYT surveys | 2-80% |
| IND-32 | CSA adoption (%) | CGIAR/FAO CSA surveys | 2-70% |
| IND-34 | Soil erosion risk (%) | FAO/ISRIC Global Soil | 5-70% |
| IND-35 | GHG intensity (kg CO2eq/kg) | FAO GLEAM/IPCC | 0.5-25 |
| IND-37 | Disaster-affected land (%) | FAO/UNDRR disaster data | 0.5-35% |

---

## Benchmark Computation Logic

**For `higher_is_better` indicators (e.g., yield, adoption rates):**
- Benchmark = **90th percentile** of reference distribution
- Gap = shortfall when observed < benchmark

**For `lower_is_better` indicators (e.g., stunting, mortality, losses):**
- Benchmark = **10th percentile** of reference distribution
- Gap = excess when observed > benchmark

---

## Usage

```bash
# Preview benchmarks for FY2024
python manage.py compute_benchmark_sample --fiscal-year=2024 --any-year

# Apply benchmarks to database
python manage.py compute_benchmark_sample --fiscal-year=2024 --any-year --apply --fill-missing

# Fill benchmarks for historical years
python manage.py compute_benchmark_sample --fiscal-year=2018 --any-year --apply --fill-missing
```

---

## Data Sources

1. **World Bank WDI API** - Primary source for 20 indicators
   - https://data.worldbank.org/indicator
   - API: https://api.worldbank.org/v2

2. **FAO FAOSTAT** - Agricultural statistics
   - https://www.fao.org/faostat/

3. **IFPRI** - Agricultural research
   - https://www.ifpri.org/

4. **AU/NEPAD** - African development targets
   - CAADP framework targets

5. **CGIAR/CIMMYT** - Climate-smart agriculture
   - https://www.cgiar.org/

---

## Notes

- World Bank data is fetched for years 2017-2022 to maximize country coverage
- Research-based distributions represent plausible global ranges based on literature
- Benchmarks should be reviewed periodically as new data becomes available
- Rwanda-specific observed values come from NISR, MINAGRI, and other national sources
