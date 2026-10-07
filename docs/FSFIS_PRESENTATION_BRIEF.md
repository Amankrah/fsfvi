# FSFIS Live Demonstration Brief

**Food Systems Financing Intelligence System (FSFIS) | Rwanda pilot**
Prepared from a page-by-page walkthrough of the live platform on 7 October 2026, the technical note, the user guide and the current database.

This brief does three things. It answers the four guiding questions with the actual figures the platform shows today. It gives you a page-by-page demo script with what to click, what to say and what each number means. It lists what to clean up before you go live and the hard questions you should expect.

---

## Contents

1. [Naming, in one paragraph](#1-naming-in-one-paragraph)
2. [The pitch in sixty seconds](#2-the-pitch-in-sixty-seconds)
3. [Guiding question 1: What is FSFIS and what questions does it answer?](#3-guiding-question-1-what-is-fsfis-and-what-analytical-questions-does-it-answer)
4. [Guiding question 2: What does the Rwanda pilot demonstrate?](#4-guiding-question-2-what-does-the-rwanda-pilot-demonstrate)
5. [Guiding question 3: Who are the users and which decisions does it inform?](#5-guiding-question-3-who-are-the-intended-users-and-what-decisions-could-the-tool-inform)
6. [Guiding question 4: What remains to be validated, and what to consider before expanding?](#6-guiding-question-4-what-remains-to-be-validated-or-finalised-and-what-to-consider-before-expanding-beyond-rwanda)
7. [Live demo script, page by page](#7-live-demo-script-page-by-page)
8. [Key numbers cheat sheet](#8-key-numbers-cheat-sheet)
9. [Hard questions and suggested answers](#9-hard-questions-and-suggested-answers)
10. [Pre-demo checklist](#10-pre-demo-checklist)
11. [Glossary](#11-glossary)

---

## 1. Naming, in one paragraph

Three names appear and they are easy to mix up on stage. **FSFIS** (Food Systems Financing Intelligence System) is the platform as a whole, the thing you are demonstrating. On screen the brand reads **FSFI** (Food Systems Financing Intelligence), the same thing without "System". **FSFSI** (Food System Financing Stress Index) is the headline number the platform computes, scale 0 to 1, higher is worse. A simple way to say it: "FSFIS is the system; the FSFSI is the score it produces."

---

## 2. The pitch in sixty seconds

Governments know how much they spend on agriculture and food. They rarely know which part of the system is left under-financed relative to its goals, and whether moving money would help. FSFIS answers that. It takes the national budget, maps every line to 37 indicators in 8 components of the food system, compares each indicator with a benchmark, and asks one question for every line: how much of the shortfall is left unfinanced? The result is a single index for the country, a score for every component, and a set of tools that use the same engine to test reallocation, build a multi-year plan, check alignment with PSTA 5, and show a development partner what their programme adds. In Rwanda it has been run on seven fiscal years of real budget data, FY2018 to FY2024.

---

## 3. Guiding question 1: What is FSFIS and what analytical questions is it designed to answer?

### What it is

FSFIS is a decision-support platform for public and partner finance in the food system. It has four layers:

| Layer | What it does | Where it lives |
|---|---|---|
| Data | 37 indicators in 8 components. For each indicator and fiscal year: the budget mapped to it (gross and weighted, bn RWF), the observed value, a benchmark, and a sensitivity parameter | Django database, Excel import pipeline, Data Entry page |
| Engine | Computes the index, the optimal allocation, multi-year projections and investment scenarios | Rust engine (`fsfi_engine`), called from Python |
| Interpretation | Classifies stress into Low / Medium / High / Critical using cut-points calibrated from Rwanda's own record, and separates "money problem" from "results problem" | Python classification module, API |
| Interface | Eight dashboard pages, in English, French and Kinyarwanda, behind government login with two-factor authentication | Next.js frontend |

### The core idea in one formula

For every indicator *i*:

    stress_i = gap_i × e^(−α_i × budget_i)

- **gap** is the normalised distance from the benchmark (0 at benchmark, 1 at maximum shortfall).
- **budget** is the weighted financing mapped to that indicator, in billions of RWF.
- **α (alpha)** is how responsive the indicator is to money. The exponential means diminishing returns: the first billion does more than the tenth.

Stress is therefore not "how bad is the outcome" but "how much of the shortfall is left unfinanced". A large gap that is well funded produces little stress. The same gap with no money behind it produces stress close to the gap itself.

The component score is the average of its indicators. The national FSFSI is the weighted average of the components (weights from a hybrid of expert judgement, network influence, cascade effects and budget share).

### The headline number carries memory

The dashboard headline is **cumulative** stress, not just this year's. Past under-financing leaves damage that does not clear in one budget cycle, so the model carries stress forward with asymmetric persistence: stress builds quickly, recovers slowly. On the overview you will see two numbers: 0.3913 (cumulative, what the system is actually carrying) and 0.2894 (this fiscal year alone). The gap between them is the structural lag.

### The analytical questions it is built to answer

| Question | Page that answers it |
|---|---|
| How much financing stress is the food system under, and is it getting better or worse? | National Overview |
| Which components and indicators are most under-financed? | National Overview heatmap, FSFI Assessment |
| Is a stressed component a money problem or a delivery problem? | "Why" diagnosis on Overview and Assessment |
| Where has the budget actually gone over the last seven years, and how has the mix shifted? | Budget Analysis |
| If we kept the same total envelope, how should it be split to minimise stress? | Optimization |
| What multi-year path gets us to a target, and what does the MTEF need to look like? | Strategic Planning |
| If a partner adds RWF X to these indicators, how much further does stress fall beyond the national plan? | Investment strategy |
| Does the budget mix match PSTA 5 priority areas, and which KPIs are at risk? | PSTA 5 Tracker |

---

## 4. Guiding question 2: What does the Rwanda pilot demonstrate?

### The data behind the pilot

- 7 fiscal years of mapped national budget, FY2018 to FY2024, from the MINAGRI budget-line mapping (Excel pipeline, IFPRI format).
- 33 of the 37 framework indicators populated for Rwanda (IND-23, 24, 26 and 28 have no data; see section 6).
- Between 933 and 6,772 budget lines mapped per year. In FY2024, 63.5% of lines are directly mapped to a programme; the rest use a fallback estimate.
- Weighted mapped total: RWF 280.6 bn (FY2018) rising to RWF 2,239.8 bn (FY2024). Gross FY2024 is RWF 4,805 bn; weighting removes double counting for cross-cutting lines.
- One saved national strategic plan (PSTA 5 Aligned, hybrid weights, 5 years, 40% reduction target) set as active.

### What the pilot shows, in six findings

**1. Rwanda's point-in-time stress has fallen; the cumulative burden has not.**
Point-in-time FSFSI fell from 0.380 (FY2018) to 0.289 (FY2024). Cumulative FSFSI stayed close to 0.39 across the whole period. Reading: budgets have improved, but the system is still carrying damage from earlier under-financing. This is the single most important chart to show. It is why a one-year snapshot misleads.

**2. Two components are critical and they are the smallest budget lines.**
Finance (cumulative 0.548) and Animal Systems (0.502) are the only components rated Critical. Finance receives 0.2% of the mapped budget (RWF 4.0 bn), Animal Systems 1.6% (RWF 35.8 bn). Finance is diagnosed as an **unfunded gap**: only 6% of its benchmark gap is absorbed by current money. Farmers with credit are at 12% against a 40% benchmark on a weighted budget of RWF 0.16 bn.

**3. The diagnosis layer separates money from results.**
Nutrition has a component stress of 0.0045 (Low) with 19.2% of the budget, yet stunting is at 30% against a 10% benchmark. The platform labels this **funded gap, outcome lag**: 99% of the gap is covered by financing, but the outcome has not responded. The answer there is delivery, timing and absorption, not more budget. Crop Production is the same pattern at 62% coverage. Without this layer, a Low label on Nutrition would have been misread as "nothing to do".

**4. The same envelope could be split much better.**
For FY2024 the engine's optimal split of the same RWF 2.2 trillion would bring point-in-time FSFSI from 0.289 to about 0.071. The modelled shift is from Markets (−RWF 592 bn), Nutrition (−223 bn) and Research (−89 bn) toward Animal Systems (+270 bn), Post-Harvest (+261 bn), Finance (+159 bn), Environment (+159 bn) and Crop Production (+55 bn). Say clearly on stage: these are rebalancing signals, not appropriation instructions, and the FY2024 numbers are affected by the mapping expansion described in section 6.

**5. A credible multi-year path exists and it is slow by design.**
The active plan shows that 8% annual budget growth with optimal allocation takes cumulative FSFSI from 0.391 to 0.231 over five years (FY2025 to FY2029), with the envelope growing from RWF 2,419 bn to RWF 3,291 bn. Finance recovers fastest (−76% cumulative stress), Environment slowest (−18%), which matches the persistence assumptions: environmental damage is the most persistent. The platform also warns that the current-year snapshot understates the real position by 0.102 index points.

**6. Partner money can be priced in stress terms.**
A worked example run live on the platform: a programme of RWF 80 bn over four years on the two Finance indicators (credit access and insurance) moves national FSFSI from 0.2894 to 0.2274, a 21% reduction, and lowers Finance component stress by 0.47. The platform also shows that this programme would sit entirely in PSTA 5 Priority Area 3, and flags that PA1 (58% national target) receives none of it. That is the conversation a ministry wants to have with a partner before the agreement is signed.

### What the pilot demonstrates about the method itself

- **Cut-points are derived from the data, not chosen.** The Low / Medium / High / Critical bands are Fisher-Jenks natural breaks on 112 component-year observations (goodness-of-variance fit 0.897) and 436 indicator-year observations (0.924). Under the engine's original fixed cut-points, 67% of indicator-years were "critical", which is not a useful signal. Under the calibrated set, Critical means "in the worst natural grouping of Rwanda's own record".
- **Cut-points are frozen between calibrations**, so a change of level always reflects a change in data, never a moving goalpost.
- **Everything is traceable.** Every assessment is saved with its weighting, scenario and timestamp. The budget history shows mapped versus fallback lines per year. The optimization page states which saved run it used.
- **It runs fast.** The three optimisation steps for 33 indicators complete in about 50 ms. Nothing on the demo waits on computation.

---

## 5. Guiding question 3: Who are the intended users and what decisions could the tool inform?

| User | Pages they would live on | Decisions FSFIS can inform |
|---|---|---|
| **MINAGRI planning and budget directorate** | Overview, Budget Analysis, Optimization, Strategic Planning | Which components to protect or grow in the next MTEF; where the mapped budget has drifted from PSTA 5 shares; how to phrase the ministerial budget narrative |
| **MINECOFIN budget and fiscal policy** | Budget Analysis, Optimization, Strategic Planning (MTEF tab) | Ceiling setting; which reallocations within the agriculture envelope reduce system risk at no extra cost; how volatile the mapped total has been and what buffer is prudent |
| **Sector programme managers (RAB, NAEB, districts)** | Assessment, Data Entry | Which indicators under their programme are most stressed; whether their line is an unfunded gap or an outcome lag; entering observed values and budget data each year |
| **Development partners and IFIs** (IFAD, World Bank, AfDB, bilateral donors) | Investment strategy, PSTA 5 Tracker | Where an envelope reduces national stress the most; whether a proposed programme is additional to the national plan; how it maps onto PSTA 5 priority areas before negotiation |
| **Cabinet, Parliament committees, Office of the Prime Minister** | Overview, PSTA 5 Tracker | Whether the food system is on track; which PSTA 5 KPIs are at risk; how much of the budget is traceable to programmes |
| **Research and M&E units** (IFPRI, AKADEMIYA2063, McGill, NISR) | Assessment, Budget Analysis reference tables | Method validation, benchmark updates, sensitivity re-estimation, recalibration of thresholds |

### The decision the tool is best at

Allocation within a fixed envelope. The optimisation and planning tools do not assume new money. They show how the same total, or a realistic growth path, could be split to reduce stress fastest. That is the decision ministries face every budget cycle, and it is the one most difficult to argue with evidence today.

### The decision the tool should not be used for alone

Approving or cutting a specific programme. The engine works at indicator and component level and knows nothing about contracts, staffing, legal appropriation or absorptive capacity. The platform says this itself on the Optimization page: "Results are indicative rebalancing signals, not appropriation instructions."

---

## 6. Guiding question 4: What remains to be validated or finalised, and what to consider before expanding beyond Rwanda?

Be candid here. The audience will trust the rest of the demonstration more if this section is specific.

### 6.1 Data issues to validate in the Rwanda pilot

| Item | What you will see | Why it matters | Status |
|---|---|---|---|
| **FY2024 mapping expansion** | Weighted total jumps +309% from FY2023 (RWF 547 bn to RWF 2,240 bn). Mapped lines go from 1,363 to 6,772 | This is almost certainly a change in mapping coverage, not a four-fold rise in spending. It drives the efficiency index down to 24.5% in FY2024 and inflates the "optimal" reallocation figures | The platform flags it on Budget Analysis ("Largest step in this window"). Needs reconciliation with MINAGRI and MINECOFIN before any FY2024 figure is quoted as a spending outcome |
| **Fallback mapping share** | 36.5% of FY2024 lines mapped by fallback estimate | Weakens traceability to programmes and the credibility of indicator-level figures | Target to reduce; requires programme-to-indicator coding work in the ministry |
| **Four indicators without data** | IND-23, 24, 26, 28 absent; platform runs on 33 of 37 | Framework coverage is incomplete; the finance component in particular has only 2 indicators | Decide whether to source data or formally drop them for Rwanda |
| **Benchmarks** | Mix of World Bank global distributions and national targets (for example stunting benchmark 10%, irrigated land 15%) | Benchmark choice drives the gap, which drives everything | Need a documented, agreed benchmark per indicator, signed off by MINAGRI and NISR |
| **Sensitivity parameters (α)** | Set from an expert parameter sheet, not estimated from Rwandan data | α sets how fast money reduces stress, and therefore the whole optimal allocation | Econometric or expert-panel validation is the most important methodological step outstanding |
| **Persistence rates (ρ)** | Per-component defaults (for example environment recovers at 0.06 per year, finance at 0.20) | These determine how long cumulative stress lingers and therefore the plan horizon | Currently assumptions; need literature review or expert elicitation |
| **Weights** | Hybrid blend: 35% expert AHP, 30% PageRank, 25% cascade, 10% budget share | The AHP matrix is a Rwanda-specific expert input | Re-elicit with a MINAGRI panel and record the consistency ratio |
| **FY2024 gap ratio** | The saved FY2024 assessment stores a gap ratio of 3.08 (should be between 0 and 1) | Indicates an edge case in the efficiency calculation when the optimum is far below actual | Engineering follow-up; does not affect the headline FSFSI |

### 6.2 Platform items not yet finished

- **Reports page** is a placeholder ("PDF report generation coming soon").
- **Province and district views, alerts and performance pages** are listed as planned for later phases; the landing page mentions them "where data exist".
- **Plan versus actual tracking** has the interface but no actual-year records yet (0 rows). The first real test is entering FY2025 actuals against the active plan.
- **Kinyarwanda copy** was translated by the development team and needs native-speaker review before official use.
- **Threshold calibration** currently uses the component scale for the national index because there are fewer than 30 national observations. It will get its own breaks once more years and runs exist.
- **Only one saved plan exists** (PSTA 5 Aligned, Hybrid, regenerated on 7 October 2026 from the full FY2018 to FY2024 rerun). Alternative plans (other growth rates, scenarios or weightings) have not yet been saved for comparison.

### 6.3 Before expanding to another country

| Consideration | What has to change | Effort |
|---|---|---|
| **Indicator framework and benchmarks** | The 37 indicators and 8 components are a food-system framework, so they transfer. Benchmarks and observed values must be sourced per country | Medium: data collection, NSO engagement |
| **Budget-line mapping** | This is the heaviest task. Each budget line in the national chart of accounts must be coded to an indicator, with weights for cross-cutting lines. Rwanda took several iterations and still has 36% fallback | High: months of ministry analyst time per country |
| **National strategy module** | PSTA 5, its three priority areas, 19 KPIs and 58/17/24 targets are hard-coded as Rwanda's strategy. Another country needs its own strategy object (for example a NAIP or CAADP compact) with its own pillars, KPIs and targets | Medium: data model is generic enough, content is not |
| **Sensitivity and persistence parameters** | Must be re-estimated or re-elicited; copying Rwanda's would be indefensible | Medium to high: depends on data availability |
| **Expert weights** | New AHP panel per country | Low to medium |
| **Threshold calibration** | Needs several years of saved assessments before natural breaks are meaningful. A new country starts on engine defaults and must say so | Built in; time dependent |
| **Currency, fiscal year, units** | Platform assumes billions of local currency and a July-to-June fiscal year label. Both are configurable but need checking | Low |
| **Language** | EN / FR / RW exist. Portuguese, Swahili, Amharic and others would need full translation passes | Low to medium per language |
| **Hosting and data sovereignty** | Budget data is sensitive. Each country will want in-country or regional hosting, its own identity provider, audit logs and backup regime | Medium: deployment guide exists |
| **Institutional ownership** | Someone must own the yearly cycle: import budget, enter observed values, run assessment, recalibrate once per strategy cycle. Without a named unit the data goes stale | Governance, not software |
| **Validation and peer review** | The method (exponential stress function, Lagrangian optimisation, asymmetric EMA, Jenks classification) should be published and reviewed before being used for cross-country comparison | Research partners |
| **Comparability** | Because thresholds are calibrated per country, Critical in Rwanda is not the same as Critical elsewhere. Cross-country comparison would need a shared reference scale or a deliberate decision not to compare | Design decision |

A fair summary line: "The engine and interface are country-agnostic. The data pipeline, the parameters and the national strategy content are not, and they are where the real work of expansion lies."

---

## 7. Live demo script, page by page

Suggested order and timing for a 25 to 30 minute demonstration. Each entry gives: what to click, what to say, what the numbers mean, and what to watch out for.

### 7.0 Landing page and About (2 minutes)

**URL:** `/` then `/about`

What is on screen: a photo hero ("Know where to invest. Build a more resilient food system."), four capability blocks, the eight components, the partner block (IFPRI, McGill, AKADEMIYA2063, IFAD grant), and the sign-in call to action. The About page states the challenge, what FSFI provides and how government and partners use it.

Say: "This is the public face. Everything behind the sign-in is restricted to authorised officials, with two-factor authentication. The platform was developed by IFPRI and McGill University under an IFAD grant through AKADEMIYA2063, with the Ministry of Agriculture and Animal Resources as the owner."

Switch the language toggle to FR or RW for two seconds to show localisation, then switch back.

### 7.1 Sign in (30 seconds)

**URL:** `/login`

Split layout, photo on the left, credentials on the right. Use the demo account prepared in the checklist. Do not demonstrate 2FA setup live; mention it is available on the Security page.

### 7.2 National Overview (6 minutes)

**URL:** `/dashboard`

Walk down the page in order.

**Fiscal year selector (top right).** Leave on FY 2024/2025. Mention that every page follows this selector.

**National financing stress (headline card).**
- Big number **0.3913**, badge **High risk**. Below it: "This fiscal year (point-in-time): 0.2894". Latest run: hybrid, normal operations.
- Say: "The headline is cumulative stress: this year plus what the system still carries from earlier years. This year alone is 0.29, which is Medium. The system as a whole is High. The difference is damage that has not cleared."
- The colour bar underneath shows where 0.39 sits between the calibrated cut-points: Low up to 0.202, Medium up to 0.342, High up to 0.461, Critical above.
- Point at the small print: "Cut-points are natural breaks in Rwanda's FY2018 to 2024 record (112 observations)." Say: "These bands come from the data, not from us."

**How to read the stress index (explainer card).** Expand it only if the audience is technical. It has four parts: what the number measures, how the four levels are set (with the cut-point table for component and indicator scale), headline versus this fiscal year, and why a component is stressed (the three coverage bands: under 17%, 17 to 55%, over 55%). This is your safety net if someone asks "what does 0.39 mean".

**KPI tiles.**
- Year-on-year change **+5.7%**: point-in-time stress rose from 0.274 to 0.289. Say: "Up slightly this year, driven by Finance."
- Critical components **2 of 8**: Finance, Animal Systems. Say: "Both are the smallest budget lines in the system."
- Agriculture budget **RWF 2.2T**: the weighted mapped total. Say: "Weighted, so cross-cutting lines are not double counted. Gross is 4.8 trillion."

**Historical trend card.** Three tabs.
- *FSFSI trend*: red dashed line is cumulative, blue is point-in-time, orange dashed line is the High threshold at 0.461. Say: "Blue has come down from 0.38 to 0.29. Red has barely moved. That gap is the whole argument for multi-year planning."
- *Components*: eight lines over time. Nutrition falls from 0.27 to 0.00; Finance jumps from 0.29 to 0.67 in FY2024.
- *Heatmap*: fastest way to see persistence. Point at Finance (0.50 for five years, then 0.67) and Animal Systems (0.44 to 0.54 across the period). Then at Nutrition going green.

**Budget Analysis card (summary).** Three tabs: Total, Components, Insights. The Insights tab lists eight plain-English findings generated by the engine from the budget history. Read finding 1 and 3 aloud; they are written for a ministerial brief.

**Active plan card.** "PSTA 5 Aligned, Hybrid. 0.39 to 0.23, 5 years, −40% target, RWF 1.1T." Say: "That is the national plan the rest of the dashboard compares against."

**Plan versus actual card.** Five plan years, FY2025 to FY2029, each with planned budget and target FSFSI; actuals blank. Say: "This is where next year's actual allocations get entered and tracked."

Watch out: if you present from a development server there is a small red "1 Issue" badge bottom left (Next.js developer tooling). Use a production build (checklist) so it does not appear.

### 7.3 Budget Analysis (4 minutes)

**URL:** `/dashboard/budget`

Say first: "Nothing on this page uses the stress index. It is the financial record on its own."

**Range selector.** Leave as full range FY2018 to 2024.

**KPI tiles.**
- Data confidence **63.5% directly mapped**. Say: "Our traceability number. The rest of the lines are fallback estimates."
- CAGR **+41.4%**, Volatility **120.6 pp**, HHI **2919 to 2553**.

**National mapped total chart.** The bar for FY2024 towers over the rest. Under it: "Largest step in this window: +309.4% from FY2023 to FY2024. Sharp jumps can reflect real spending growth, programme reclassification or changes in mapping method. Validate before reading them as a policy outcome."
- Say this plainly: "The platform is telling us not to trust that jump at face value. Mapped lines went from 1,363 to 6,772 in the same year. This is a coverage change we still need to reconcile." Then move on. Owning this is better than being asked about it.

**Largest components, share of national total.** Markets 41.6%, Nutrition 19.3%, Research 16.1%, Crop Production 12.3%, Post-Harvest 5.3%.

**Key findings.** Same eight statements as the Overview card.

**Reference tables.** Scroll briefly past Composition drift (Nutrition +7.4 pp, Markets −6.7 pp), Indicator dynamics (starred extreme CAGRs with a footnote on small bases), Mapping quality (mapped versus fallback per year) and Single-year composition (the FY2024 indicator list). Say: "Audit detail for analysts; every number on the dashboard can be traced here."

### 7.4 FSFI Assessment (4 minutes)

**URL:** `/dashboard/assessment`

**KPI row.** Cumulative FSFSI 0.3913 (High), point-in-time 0.2894. Efficiency index **0.2450**. Total budget RWF 2.2T. Last updated date.

**Component breakdown and performance gaps.** Eight cards. Each shows component stress, indicator count, budget share and the diagnosis with coverage percentage.
- Finance **0.6749**, 2 indicators, 0.18% budget, **Unfunded gap, 6%**.
- Nutrition **0.0045**, 3 indicators, 19.25% budget, **Funded gap, outcome lag, 99%**.
- Crop Production **0.1776**, 12.32% budget, **Funded gap, outcome lag, 62%**.
- Say: "Finance and Nutrition are opposites. Finance is a money problem. Nutrition is a results problem. One stress score could not tell you that; the coverage figure can."

**Top priorities.** Five indicator-level actions ranked by stress with a budget implication and a timeline.
- #1 IND-13 Cold chain coverage, stress 0.729, increase by RWF 79.6 bn. #2 IND-25 Farmers with credit, 0.697, +RWF 108 bn. #3 IND-27 Insured farmers, 0.653, +RWF 106 bn.
- Say: "These are the five lines the engine would move money to first, with the amount needed to reach the optimal mix."

**Run new assessment.** Show the weighting dropdown (Hybrid, Equal, Expert AHP, Budget proportional, Network PageRank) and the scenario dropdown (Normal operations, Climate shock, Financial crisis, Pandemic, Political instability). Do **not** click Run during the demo unless you have rehearsed it; it adds another saved run to the list.

**Saved assessments list.** Click one FY2024 run to open the detail panel: point-in-time 0.2894, cumulative 0.3913, weighting, scenario, 33 indicators, 8 components, and the component list. Say: "Every run is saved with its settings, so a figure quoted in a briefing can always be traced back."

### 7.5 Optimization (4 minutes)

**URL:** `/dashboard/optimization`

Read the sentence under the fiscal year selector aloud: "For this assessment, point-in-time FSFSI of 0.2894 could fall to about 0.0709 with an optimal mix." Then the disclaimer: "Results are indicative rebalancing signals, not appropriation instructions."

**Efficiency tab.**
- Current FSFSI 0.2894, Optimal 0.0709, Total budget RWF 2.2T. Efficiency index 24.5%.
- The "Reading the results" paragraph names the shortfalls (Animal Systems 270 bn, Post-Harvest 261 bn, Finance 159 bn) and the surpluses (Markets 592 bn, Nutrition 223 bn).
- The table shows Current, Optimal, Gap and Status per component, with the total row showing the envelope is balanced (net zero).
- Say: "Same total. Different split. This is the cheapest improvement available to any ministry: no new money."
- Watch out: percentage gaps are extreme where the current line is tiny (Finance +3,966%). The page says so. Pre-empt it: "A 4,000% increase on a RWF 4 bn line is RWF 160 bn. Read the amount, not the percentage."

**Reallocation tab.** Same information as a ranked list of eight moves. Impact column reads "Increase funding to reduce stress" or "Reallocate surplus to higher-need areas".

**ROI analysis tab.** Ranks components by stress reduction per billion. Finance #1, Markets #8. Show the bar chart, skip the table. The footer under the rankings confirms the same RWF 2.2T mapped total as the other tabs.

### 7.6 Strategic Planning (5 minutes)

**URL:** `/dashboard/planning`

**Saved strategic plans table.** One row: PSTA 5 Aligned, Hybrid, Active, 5 yr, 40%, 0.3913 to 0.2313. Click **Open**.

**Planning parameters.** Show the controls without changing them: horizon options (3 years MTEF, 5 years PSTA 5, 7 years NST 2, 10 years Vision 2035), stress reduction target, milestone pacing (build-up first, uniform, early wins), annual budget growth (Rwanda average 8 to 10%), MTEF 3-year target, weighting, scenario. Say: "A planner sets the ambition and the fiscal envelope; the engine finds the allocation path."

**Five output tabs.**
- *Trajectory and budgets*: projected FSFSI (engine) against yearly milestone targets, with the horizon goal at 0.23. Below it the budget evolution (RWF 2.4T to 3.3T) and the allocation share by component each year.
- *Component recovery*: table of cumulative stress by component by year. Finance 0.548 to 0.132 (−76%), Environment 0.314 to 0.257 (−18%). Say: "Environment recovers slowest because environmental damage is the most persistent. That is a modelling assumption, and it is one we want validated."
- *Budget alignment*: a planner types proposed component budgets for a year and sees how far their mix is from the plan and what FSFSI it projects. Show the empty table; do not type values live unless rehearsed.
- *MTEF (3 years)*: the three-year rolling view for MINECOFIN. Year 1 0.3488 and Year 2 0.3487 are on the policy track; Year 3 0.3484 misses the 0.3326 MTEF target, and the page lists the options (raise growth, revisit the improvement percentage, change pacing, shift more to high-stress components). Say: "The MTEF is deliberately stricter than the five-year plan. The engine tells us that three years at 8% is not enough on its own."
- *Outcomes and risks*: expected outcomes, implementation risks (damage persistence: snapshot 0.2894 understates the real 0.3913, lag 0.102; budget commitment: five years of 8% growth) and success factors. Read the damage persistence risk aloud; it is the strongest single sentence on the page.

### 7.7 Investment strategy (4 minutes)

**URL:** `/dashboard/investment`

This is the page for the partner audience. Rehearse the example below so the numbers match this brief.

**Set-up.**
- "You are using this as": choose **Development partner** (labels change; the model does not).
- Strategic plan: PSTA 5 Aligned (active), trajectory baseline FSFSI 0.3913.
- Implementation schedule: enter **20** in FY2025, FY2026, FY2027 and FY2028 (RWF 20 bn a year; total RWF 80 bn).
- Programme name: "Rural Credit and Insurance Expansion".
- Component filter: **Finance**; tick **IND-25 Farmers with credit** and **IND-27 Insured farmers**.
- Weighting Hybrid, scenario Normal operations. Click **Estimate stress reduction**.

**What appears.**
- Baseline FSFSI 0.2894 (Medium) → With-envelope FSFSI **0.2274** (Medium). Δ FSFSI **0.0620**.
- Stepped panel for **FY2028** (the last year with spending in the schedule): assessment baseline 0.2894, plan trajectory 0.2583 (milestone 0.2511), with your envelope 0.2274. Extra reduction against the plan trajectory +0.0309; position against the milestone +0.0237.
- Average stress change by component: Finance −0.4716, all others 0.
- Indicators covered: IND-25 Δ stress 0.487, IND-27 0.456.
- PSTA 5 mix of the envelope: PA3 100%, PA1 0%, PA2 0%, alignment score 0 / 100 with the warning "Expect questions if a priority area with a high national target receives none of the modelled envelope."

Say: "Eighty billion into the two most under-financed lines in the system lowers the national index by a fifth. It also tells the partner, before the agreement is signed, that the programme sits entirely in one priority area. Both facts are useful in a negotiation."

Read the disclaimer once: "This is an illustrative financing-stress scenario under the FSFSI model, not a forecast of development outcomes."

### 7.8 PSTA 5 Tracker (4 minutes)

**URL:** `/dashboard/psta5`

Say first: "Everything here uses the active strategic plan's modelled allocations, not audited outturn. The page says so at the top."

**Summary card.** Weighted budget fit **61%**. Projected indicator improvement **41%**. 3 areas, 19 KPIs, **7 at risk**.

**Projected indicator improvement by priority area.** Horizontal bars for PA1 (35%), PA2 (53%), PA3 (47%) against the 40% at-risk line. PA1 Modernization is below the line.

**Strategic plan budget mix check.** Mean-gap mix score 68%. Budget flow: PA1 actual 34.3% against 58% target (−23.7 pp); PA2 28.6% against 17% (+11.6 pp); PA3 37.1% against 24% (+13.1 pp). Mapped total RWF 3,290.97 bn, equal to the full FY2029 plan envelope; nothing is unmapped.
- Say: "The optimal mix under-weights Modernization and over-weights Markets, Post-Harvest and the Systems Enablers relative to the official PSTA 5 shares. The engine chases stress; PSTA 5 chases a political balance. That gap is a conversation for MINAGRI, not a verdict."
- If asked how the bridge works: each FSFSI component is attributed to the one priority area it serves (Crop Production, Animal Systems and Environment to PA1; Markets and Post-Harvest to PA2; Finance, Research and Nutrition to PA3).

**Year-by-year improvement and plan envelope.** FY2025 10% improvement on RWF 2,419 bn, rising to FY2029 40% on RWF 3,291 bn.

**Priority areas requiring attention.** PA1 at 35%, with its seven KPIs listed and the driving components (Crop Production, Environment, Animal Systems, Research).

**Projected KPI impact table.** All 19 KPIs with baseline (2023), target (2029), projected improvement and drivers. Good rows to point at: PA3.2 Farmers with access to finance 18% to 45%, projected 76% (because Finance recovers fastest in the plan); PA3.5 Research outputs adopted, 26% (at risk); PA2.1 Post-harvest losses, lower is better, 45%.

**Component to priority area mapping.** The bridge: Crop Production 40%, Animal Systems 30%, Environment 30% into PA1; Markets 50%, Post-Harvest 50% into PA2; Finance 35%, Nutrition 30%, Research 35% into PA3.

### 7.9 Data Entry (2 minutes)

**URL:** `/dashboard/data-entry`

**Indicator Data tab.** The full FY2024 table by component: gross and weighted budget, observed value and benchmark for all 33 indicators. Point at Finance: IND-25 observed 12 against benchmark 40, weighted budget RWF 0.16 bn; IND-27 observed 8 against 30, RWF 3.86 bn. Say: "This is where the pilot's raw inputs live, and where next year's values are entered."

**Bulk Import tab.** CSV or Excel with indicator_code, gross_lcu_bn, weighted_lcu_bn, observed_value, benchmark_value; template download; target fiscal year. Say: "Annual update is a file upload followed by Run Assessment."

Do not click Save All Data or Run Assessment live.

### 7.10 Reports, Profile, Security (1 minute, optional)

- **Reports**: placeholder. Say: "PDF export is the next build item." Better to mention it than to have someone click it.
- **Profile**: account details, role, 2FA status, last sign-in.
- **Security**: 2FA set-up with an authenticator app (TOTP, secrets stored encrypted), password change (Argon2id hashing). Mention; do not demonstrate.

### Suggested closing line

"Every figure you have seen today traces back to a budget line, an observed value and a benchmark that MINAGRI can audit. The method is explicit, the cut-points come from Rwanda's own record, and the same engine answers the allocation question for a ministry, a planner and a partner. What remains is validation of the parameters and the FY2024 mapping, and that is work we would do with you."

---

## 8. Key numbers cheat sheet

Keep this open on a second screen.

### Headline, FY2024/25
| | |
|---|---|
| Cumulative FSFSI | **0.3913** (High) |
| Point-in-time FSFSI | **0.2894** (Medium) |
| Year-on-year (point-in-time) | +5.7% (0.2737 → 0.2894) |
| Critical components | 2: Finance (0.548), Animal Systems (0.502) |
| Weighted mapped budget | RWF 2,239.78 bn (gross 4,805 bn) |
| Efficiency index | 0.245 (optimal 0.0709 ÷ actual 0.2894) |
| Indicators / components | 33 of 37 / 8 |
| Weighting / scenario | Hybrid / normal operations |

### Trend FY2018 to FY2024 (point-in-time → cumulative)
| FY | Point | Cumulative | Budget bn | Efficiency |
|---|---|---|---|---|
| 2018 | 0.380 | 0.380 | 280.6 | 0.83 |
| 2019 | 0.363 | 0.392 | 296.9 | 0.77 |
| 2020 | 0.355 | 0.386 | 314.7 | 0.76 |
| 2021 | 0.352 | 0.387 | 353.8 | 0.76 |
| 2022 | 0.345 | 0.393 | 446.8 | 0.74 |
| 2023 | 0.274 | 0.350 | 547.1 | 0.72 |
| 2024 | 0.289 | 0.391 | 2,239.8 | 0.25 |

### Components FY2024 (point stress / cumulative / budget share / diagnosis, coverage)
| Component | Point | Cum. | Share | Diagnosis |
|---|---|---|---|---|
| Finance | 0.675 | 0.548 | 0.2% | Unfunded gap, 6% |
| Post-Harvest | 0.442 | 0.461 | 5.3% | Partly funded, 25% |
| Animal Systems | 0.383 | 0.502 | 1.6% | Partly funded, 19% |
| Markets | 0.285 | 0.370 | 41.6% | Partly funded, 35% |
| Environment | 0.247 | 0.306 | 3.7% | Partly funded, 28% |
| Research | 0.200 | 0.371 | 16.1% | Partly funded, 52% |
| Crop Production | 0.178 | 0.372 | 12.3% | Funded gap, outcome lag, 62% |
| Nutrition | 0.005 | 0.202 | 19.2% | Funded gap, outcome lag, 99% |

### Calibrated cut-points (Jenks, FY2018 to 2024)
| Scale | Low ≤ | Medium ≤ | High ≤ | Critical > | n | GVF |
|---|---|---|---|---|---|---|
| National and component | 0.202 | 0.342 | 0.461 | 0.461 | 112 | 0.897 |
| Indicator | 0.176 | 0.399 | 0.653 | 0.653 | 436 | 0.924 |
| Financing coverage | 17% | 55% | | | 196 | 0.927 |

### Optimization FY2024 (same envelope RWF 2.2T)
| Component | Current bn | Optimal bn | Change |
|---|---|---|---|
| Markets | 931.1 | 338.8 | −592.3 |
| Nutrition | 431.1 | 208.4 | −222.7 |
| Research | 360.4 | 271.4 | −89.0 |
| Crop Production | 276.0 | 330.6 | +54.6 |
| Environment | 83.7 | 242.7 | +159.1 |
| Finance | 4.0 | 163.5 | +159.4 |
| Post-Harvest | 117.6 | 378.7 | +261.1 |
| Animal Systems | 35.8 | 305.6 | +269.7 |

### Active plan: PSTA 5 Aligned, Hybrid
| | |
|---|---|
| Horizon / growth / target | 5 years (FY2025 to 2029) / 8% a year / −40% |
| Cumulative FSFSI | 0.3913 → 0.2313 |
| Envelope | RWF 2,419 bn → 3,291 bn |
| Fastest / slowest recovery | Finance −76% / Environment −18% |
| Damage lag | 0.102 (snapshot 0.2894 understates 0.3913) |
| MTEF (3 yr) | 0.3488 / 0.3487 / 0.3484 against a Year 3 target of 0.3326 (off track) |

### Investment example (RWF 80 bn, IND-25 + IND-27, FY2025 to FY2028)
| | |
|---|---|
| Baseline → with envelope | 0.2894 → 0.2274 (Δ 0.062, −21%) |
| FY2028 plan → with envelope | 0.2583 → 0.2274 (+0.0309; +0.0237 against the 0.2511 milestone) |
| Finance component stress change | −0.47 |
| PSTA 5 mix | 100% PA3; PA1 and PA2 receive 0% |

### PSTA 5 Tracker
| | |
|---|---|
| Weighted budget fit / mean-gap score | 61% / 68% |
| Budget shares vs target | PA1 34.3% vs 58; PA2 28.6% vs 17; PA3 37.1% vs 24 |
| Mapped envelope | RWF 3,291 bn (FY2029), fully attributed |
| Projected indicator improvement | 41% overall; PA1 35%, PA2 53%, PA3 47% |
| KPIs at risk (<40%) | 7 of 19 |

---

## 9. Hard questions and suggested answers

**"Why did the budget quadruple in one year?"**
It did not, as far as we know. Mapped lines went from 1,363 to 6,772 between FY2023 and FY2024, so most of the increase is coverage of the mapping, not spending. The platform flags this on the Budget Analysis page and the budget-insights engine tells readers to check the mapping method before treating the jump as real. Reconciling it with MINECOFIN is the first validation item.

**"If Nutrition stress is near zero, why is stunting at 30%?"**
Because stress measures unfinanced shortfall, not outcome. Nutrition receives 19% of the budget and 99% of its benchmark gap is covered by financing. The outcome has not yet responded. The platform labels this "funded gap, outcome lag" and points to delivery and timing rather than budget size. It is a strength of the method that it can say this.

**"Are you telling us to cut Markets by RWF 590 bn?"**
No. The optimisation shows the direction and size of imbalance against a modelled optimum for the same total. It knows nothing about contracts, staffing or legal appropriation. It is a rebalancing signal for the MTEF discussion. The page says so explicitly.

**"Where do the thresholds come from? Who decided 0.461 is critical?"**
Nobody decided. They are natural breaks (Fisher-Jenks) in Rwanda's own record of 112 component-year scores. Critical means "in the worst natural grouping of Rwanda's recorded stress at that level". They are frozen until a calibration is deliberately re-run, so progress shows as fewer critical items, not a moving target.

**"How were the sensitivity parameters set?"**
From an expert parameter sheet per indicator. They have not yet been estimated econometrically from Rwandan data, and that is the most important methodological step outstanding. Everything in the optimisation depends on them.

**"Why 8% growth in the plan?"**
It is Rwanda's recent average for agriculture. It is a parameter: the planner can set 5% or 12% and regenerate.

**"Can we compare Rwanda with Kenya on this index?"**
Not directly. Thresholds are calibrated per country and benchmarks differ. The raw index could be compared once both use the same benchmarks and parameters, but that is a design decision for an expansion phase, not something the pilot claims.

**"Who maintains this after the project ends?"**
The yearly cycle is: import the budget mapping, enter observed values, run the assessment, and recalibrate once per strategy cycle. It needs a named unit in MINAGRI with analyst time. The deployment guide and management commands exist; ownership is an institutional decision.

**"Is the data secure?"**
Government login with Argon2id password hashing, TOTP two-factor authentication, encrypted secrets, session audit log, and the option to host in-country. Budget data never leaves the deployment.

**"What is the engine written in and is it open?"**
Rust for computation, Python/Django for data and API, Next.js for the interface. Code is in a private repository today; openness is a decision for the partners.

---

## 10. Pre-demo checklist

Do these in the order given, ideally the day before and again an hour before.

### Data hygiene
Done on 7 October 2026 on both the local database and the live server at rwanda.fsfvi.ai (backups kept: `/var/backups/fsfvi-20261008-0117.sqlite3` on the server): the stray FY2015 rows were removed, so every dropdown and the trend chart run FY2018 to FY2024; the full FY2018 to FY2024 chain was rerun in order, so the cumulative figures are consistent; saved assessments were reduced to one per fiscal year; thresholds were recalibrated (unchanged cut-points); active plans were re-pointed to the new FY2024 run and regenerated.
- [ ] **Live server plans.** The live database holds two plans named `test2` (active) and `Test Plan 1` (inactive), not the "PSTA 5 Aligned - Hybrid" plan this brief describes. Before presenting from rwanda.fsfvi.ai, either rename `test2` and set its parameters to the brief (5 years, 40% reduction, 8% growth, build-up pacing, Hybrid, Normal operations) and click Update plan, or create the plan fresh and make it active. Then re-check the figures in sections 7.6 to 7.8.
- [ ] Optional: enter FY2025 actuals for one or two components in Budget alignment and "Save as actual" so the Plan versus actual card on the Overview is not empty.

### Known display points
- [ ] Landing and About pages say "37 indicators"; the Rwanda dataset has 33 populated. Say "37 in the framework, 33 populated for Rwanda" if asked.
- [ ] Optimization → ROI tab: the "stress reduction per bn LCU" values (Finance 2,657, Markets 12) are engine-internal units. Use them as a ranking, not as a rate; do not read the numbers aloud.
- [ ] The FY2024 saved assessment stores a gap ratio of 3.08 (should be 0 to 1). Not shown on the dashboard; do not open the raw API in front of the audience.

### Environment
- [ ] Present from a **production build**, not the dev server: `npm run build && npm start` in `rwanda-frontend`. This removes the red "1 Issue" badge and loads pages instantly.
- [ ] Backend: `python manage.py runserver 8000` (or the production service). Confirm `/api/assessments/stress-thresholds/` returns the four calibrated rows.
- [ ] Create a **demo account** with a non-temporary password and a presentable name (for example `demo.minagri`, full name "Demo Analyst", role analyst). Delete it afterwards.
- [ ] Hard-refresh the browser once before starting so the current `globals.css` is loaded (the header should be navy, not pale).
- [ ] Set browser zoom so the overview headline card and KPI tiles fit on one screen (110% at 1920×1080 works well).
- [ ] Close the fiscal-year dropdowns after use; they are long.
- [ ] Have this brief, the Technical Note (`docs/TECHNICAL_NOTE.md`) and the User Guide (`docs/USER_GUIDE.md`) open on a second screen.

### Rehearsal
- [ ] Run the Investment example once (section 7.7) and confirm you get 0.2894 → 0.2274, with the FY2028 stepped panel showing 0.2583 → 0.2274.
- [ ] Time the full walk-through. Target 25 to 30 minutes with 10 for questions.

---

## 11. Glossary

| Term | Meaning |
|---|---|
| FSFIS / FSFI | The platform: Food Systems Financing Intelligence (System) |
| FSFSI | Food System Financing Stress Index, 0 to 1, higher is worse |
| Point-in-time FSFSI | Stress computed from this fiscal year's data alone |
| Cumulative FSFSI | Stress including what is carried over from earlier years; the headline |
| Performance gap (δ) | Normalised distance from benchmark, 0 to 1 |
| Sensitivity (α) | How quickly money reduces stress for an indicator, per bn RWF |
| Financing coverage | Share of the gap absorbed by current financing, 1 − e^(−αf) |
| Diagnosis | At benchmark / Unfunded gap / Partly funded gap / Funded gap, outcome lag |
| Persistence (ρ) | How fast cumulative stress updates; builds fast (ρ up), recovers slowly (ρ down) |
| Efficiency index | Optimal FSFSI ÷ actual FSFSI; 1.0 means already optimal |
| Weighting | Equal, Expert (AHP), Financial, Network (PageRank), Hybrid |
| Jenks natural breaks | Statistical method that places class boundaries where the data clusters; used for Low / Medium / High / Critical |
| GVF | Goodness-of-variance fit of a Jenks partition; 1.0 is perfect separation |
| Weighted budget | Mapped budget adjusted so cross-cutting lines are not double counted |
| Fallback mapping | Budget lines assigned to indicators by estimate rather than direct programme link |
| MTEF | Medium-Term Expenditure Framework, Rwanda's 3-year rolling budget |
| PSTA 5 | Fifth Strategic Plan for Agriculture Transformation, 2024 to 2029 |
| PA1 / PA2 / PA3 | PSTA 5 priority areas: Modernization (58%), Markets and Post-Harvest (17%), Systems Enablers (24%) |
| Active plan | The saved strategic plan used by the Overview, Investment and PSTA 5 pages |
| LCU | Local currency unit, here Rwandan francs; budgets in billions |

---

*Prepared 7 October 2026 from the live platform at FY2024/25, database state as of that date. Figures will change when the FY2024 mapping is reconciled, parameters are validated or thresholds are recalibrated.*
