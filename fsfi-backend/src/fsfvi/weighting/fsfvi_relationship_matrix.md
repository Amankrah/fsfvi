# FSFVI Component Relationship Matrix
## Based on IPC Analytical Framework & FEWS NET Livelihoods Approach

---

## 1. Conceptual Foundation

### Mapping FSFVI Components to IPC/FEWS NET Constructs

| FSFVI Component | FEWS NET Pathway | IPC Outcome Linkage | Role in Cascade |
|-----------------|------------------|---------------------|-----------------|
| `agricultural_development` | **Production** pathway | Food availability → consumption | **Source** of food access |
| `infrastructure` | **Market access** (purchase pathway) | Physical access to markets | **Transmission** mechanism |
| `nutrition_health` | Outcome indicator | Food consumption, nutritional status | **Outcome** receiver |
| `climate_natural_resources` | **Hazard driver** | Triggers livelihood stress | **Shock origin** |
| `social_protection_equity` | **Transfers** pathway | Safety net adequacy | **Buffer/moderator** |
| `governance_institutions` | **Enabling environment** | Response capacity | **Amplifier/dampener** |

---

## 2. Baseline Relationship Matrix (Normal Operations)

This matrix represents **"if component X fails, how much does it directly affect component Y?"**

Values range from 0.0 (no direct effect) to 1.0 (complete dependence).

```
                          TARGET (affected by failure)
                    ┌────────────────────────────────────────────────────────────────────┐
                    │  agri   infra   nutri   climate   social   govern                  │
SOURCE        ┌─────┼────────────────────────────────────────────────────────────────────┤
(failure in)  │agri │  1.00    0.25    0.85     0.30     0.50     0.20                   │
              │infra│  0.70    1.00    0.55     0.15     0.40     0.15                   │
              │nutri│  0.20    0.10    1.00     0.10     0.35     0.10                   │
              │clim │  0.90    0.60    0.45     1.00     0.40     0.25                   │
              │soc  │  0.35    0.20    0.60     0.15     1.00     0.30                   │
              │gov  │  0.50    0.55    0.40     0.35     0.65     1.00                   │
              └─────┴────────────────────────────────────────────────────────────────────┘
```

### Rationale for Key Relationships (FEWS NET Logic)

**Agricultural Development → Nutrition/Health (0.85)**
- Direct: Production failure → reduced food availability → consumption gap
- IPC Reference: Primary driver of Phase 3+ classifications in agrarian areas
- FEWS NET: "Own production" is often 40-70% of food access in rural LICs

**Climate/Natural Resources → Agriculture (0.90)**
- Direct: Drought, flood, pest → crop failure, livestock mortality
- IPC Reference: Most common shock type triggering acute food insecurity
- FEWS NET: ~80% of food security emergencies have climate component

**Infrastructure → Agriculture (0.70)**
- Direct: Road damage → input delivery failure, output marketing collapse
- Post-harvest losses increase 20-40% without storage/transport
- Market integration failures isolate producers from price signals

**Governance → Social Protection (0.65)**
- Direct: Institutional capacity determines safety net delivery
- IPC Reference: "Humanitarian food assistance" is explicit IPC contributing factor
- FEWS NET: Response analysis explicitly models government/NGO capacity

**Social Protection → Nutrition (0.60)**
- Direct: Transfer adequacy affects food purchasing power
- Cash transfers typically cover 30-60% of minimum food basket
- In-kind food assistance directly affects dietary intake

---

## 3. Shock-Specific Relationship Matrices

### 3.1 Climate Shock (Drought/Flood)

```
                    │  agri   infra   nutri   climate   social   govern │
              ┌─────┼───────────────────────────────────────────────────┤
              │agri │  1.00    0.30    0.90     0.20     0.55     0.15  │  ← Ag more critical
              │infra│  0.75    1.00    0.50     0.10     0.35     0.10  │
              │nutri│  0.15    0.10    1.00     0.05     0.40     0.10  │
              │clim │  0.95    0.70    0.55     1.00     0.45     0.30  │  ← Climate amplified
              │soc  │  0.40    0.25    0.70     0.10     1.00     0.35  │  ← Safety net more critical
              │gov  │  0.55    0.50    0.45     0.30     0.70     1.00  │
              └─────┴───────────────────────────────────────────────────┘
```

**Key changes:**
- Climate → Agriculture: 0.90 → 0.95 (climate is primary shock vector)
- Agriculture → Nutrition: 0.85 → 0.90 (production pathway dominates)
- Social Protection → Nutrition: 0.60 → 0.70 (safety nets become critical)

### 3.2 Financial/Economic Crisis

```
                    │  agri   infra   nutri   climate   social   govern │
              ┌─────┼───────────────────────────────────────────────────┤
              │agri │  1.00    0.20    0.75     0.30     0.60     0.25  │
              │infra│  0.60    1.00    0.45     0.15     0.35     0.20  │
              │nutri│  0.25    0.15    1.00     0.10     0.45     0.15  │
              │clim │  0.80    0.50    0.35     1.00     0.35     0.20  │
              │soc  │  0.45    0.30    0.75     0.15     1.00     0.40  │  ← Transfers critical
              │gov  │  0.60    0.65    0.50     0.30     0.75     1.00  │  ← Fiscal capacity matters
              └─────┴───────────────────────────────────────────────────┘
```

**Key changes:**
- Agriculture → Nutrition: 0.85 → 0.75 (purchase pathway matters more)
- Social Protection → Nutrition: 0.60 → 0.75 (cash transfers critical)
- Governance → Social Protection: 0.65 → 0.75 (fiscal capacity constrains response)

### 3.3 Pandemic/Health Crisis

```
                    │  agri   infra   nutri   climate   social   govern │
              ┌─────┼───────────────────────────────────────────────────┤
              │agri │  1.00    0.20    0.80     0.30     0.45     0.15  │
              │infra│  0.80    1.00    0.70     0.15     0.50     0.20  │  ← Movement restrictions
              │nutri│  0.30    0.20    1.00     0.10     0.50     0.20  │  ← Health-nutrition nexus
              │clim │  0.85    0.55    0.40     1.00     0.35     0.20  │
              │soc  │  0.40    0.35    0.80     0.15     1.00     0.45  │  ← Social support critical
              │gov  │  0.55    0.70    0.65     0.30     0.80     1.00  │  ← Health system capacity
              └─────┴───────────────────────────────────────────────────┘
```

**Key changes:**
- Infrastructure → Nutrition: 0.55 → 0.70 (supply chain disruptions)
- Governance → Nutrition: 0.40 → 0.65 (health system response capacity)
- Nutrition → bidirectional effects amplified (comorbidities)

### 3.4 Conflict/Political Instability

```
                    │  agri   infra   nutri   climate   social   govern │
              ┌─────┼───────────────────────────────────────────────────┤
              │agri │  1.00    0.30    0.85     0.25     0.40     0.30  │
              │infra│  0.85    1.00    0.65     0.15     0.45     0.25  │  ← Physical destruction
              │nutri│  0.20    0.15    1.00     0.10     0.35     0.15  │
              │clim │  0.85    0.55    0.40     1.00     0.35     0.20  │
              │soc  │  0.35    0.25    0.55     0.15     1.00     0.40  │
              │gov  │  0.70    0.80    0.60     0.40     0.85     1.00  │  ← Governance is shock origin
              └─────┴───────────────────────────────────────────────────┘
```

**Key changes:**
- Governance → all components: significantly amplified (conflict origin)
- Infrastructure → Agriculture: 0.70 → 0.85 (destruction, displacement)
- Governance → Social Protection: 0.65 → 0.85 (service delivery collapse)

---

## 4. Temporal Decay Modifiers

Cascade effects don't hit instantly. FEWS NET scenario development explicitly considers timing.

| Cascade Type | Immediate (0-1 mo) | Short-term (1-3 mo) | Medium-term (3-6 mo) |
|--------------|-------------------|---------------------|----------------------|
| Climate → Agri | 0.30 | 0.80 | 0.95 |
| Agri → Nutrition | 0.40 | 0.75 | 0.85 |
| Infra → Markets | 0.85 | 0.70 | 0.50 |
| Social Prot → Nutrition | 0.70 | 0.60 | 0.55 |
| Gov → Response | 0.20 | 0.50 | 0.65 |

**Interpretation:**
- Infrastructure damage has **immediate** market impact (roads closed = markets inaccessible)
- Climate shocks take **time** to manifest in agricultural output
- Social protection effects depend on **program cycle timing**

---

## 5. IPC Phase-Specific Weighting Adjustments

As food security deteriorates, different components become more/less relevant.

| IPC Phase | Agriculture | Infrastructure | Nutrition | Climate | Social Prot | Governance |
|-----------|-------------|----------------|-----------|---------|-------------|------------|
| Phase 1-2 | 0.30 | 0.20 | 0.20 | 0.15 | 0.10 | 0.05 |
| Phase 3 | 0.25 | 0.18 | 0.25 | 0.12 | 0.15 | 0.05 |
| Phase 4 | 0.20 | 0.15 | 0.30 | 0.08 | 0.20 | 0.07 |
| Phase 5 | 0.15 | 0.12 | 0.35 | 0.05 | 0.25 | 0.08 |

**Rationale:**
- In severe crisis (Phase 4-5), **nutrition outcomes** and **safety nets** dominate
- Agriculture remains important but effect is already baked in
- Governance becomes slightly more important (humanitarian access, coordination)

---

## 6. Implementation Recommendations

### 6.1 Populate the `relationships` HashMap

The `relationships` field should store shock-specific matrices:

```rust
// Key: "{source_component}:{target_component}:{scenario}"
// Value: cascade weight

relationships: {
    "baseline": {
        "agricultural_development:nutrition_health": 0.85,
        "climate_natural_resources:agricultural_development": 0.90,
        // ... full matrix
    },
    "climate_shock": {
        "agricultural_development:nutrition_health": 0.90,
        "climate_natural_resources:agricultural_development": 0.95,
        // ... shock-specific overrides
    },
    // ... other scenarios
}
```

### 6.2 Modify `get_dependency_matrix()` to Accept Scenario

```rust
pub fn get_dependency_matrix(&self, scenario: Option<&str>) -> Vec<Vec<f64>> {
    let scenario_key = scenario.unwrap_or("baseline");
    
    // Use component-specific relationships if available
    if let Some(scenario_rels) = self.relationships.get(scenario_key) {
        // Build matrix from scenario_rels
    } else {
        // Fall back to baseline or current category heuristics
    }
}
```

### 6.3 Add Temporal Decay Function

```rust
pub fn apply_temporal_decay(
    &self,
    base_weight: f64,
    source: &str,
    target: &str,
    time_horizon_months: u8,
) -> f64 {
    // Apply decay curves based on cascade type
}
```

---

## 7. Validation Against Real-World Data

To validate these relationships, compare against:

1. **IPC Historical Classifications**
   - Extract contributing factors from IPC analysis reports
   - Compare predicted cascade patterns to actual phase transitions

2. **FEWS NET Scenario Accuracy**
   - Compare projected vs. actual food security outcomes
   - Identify where cascade weights over/under-predicted

3. **Sensitivity Analysis**
   - Vary relationship weights ±20%
   - Check if conclusions (risk rankings) remain stable

---

## 8. References

- IPC Technical Manual 3.1 (2021) - Reference Tables and Analytical Framework
- FEWS NET Guidance Documents - Livelihoods Analysis, Scenario Development
- Headey & Ecker (2013) - "Rethinking the measurement of food security"
- Maxwell & Caldwell (2008) - "The coping strategies index"
