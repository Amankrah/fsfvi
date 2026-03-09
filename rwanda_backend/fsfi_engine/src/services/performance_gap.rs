//! Performance Gap Analysis + Peer Comparison Service
//!
//! Analyzes performance gaps, compares Rwanda against peer countries,
//! tracks gap closure trends, and generates target recommendations.

use crate::core::calculations::{
    calculate_performance_gap, calculate_stress, round_to_precision, safe_divide,
};
use crate::errors::FsfiResult;
use crate::services::assessment::{get_default_sensitivity, ComponentInput};
use pyo3::prelude::*;
use serde::{Deserialize, Serialize};
use std::time::Instant;

// ---------------------------------------------------------------------------
// Data Structures
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GapAnalysisResult {
    pub component_gaps: Vec<ComponentGap>,
    pub average_gap: f64,
    pub worst_gap_component: String,
    pub best_gap_component: String,
    pub gap_distribution: GapDistribution,
    pub computing_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentGap {
    pub component_type: String,
    pub observed_value: f64,
    pub benchmark_value: f64,
    pub gap: f64,
    pub gap_pct: f64,
    pub stress: f64,
    pub rank: usize,
    pub status: String, // "on_track", "behind", "critical"
    pub recommendation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GapDistribution {
    pub on_track: usize,   // gap < 0.10
    pub behind: usize,     // 0.10 <= gap < 0.30
    pub critical: usize,   // gap >= 0.30
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerComparisonInput {
    pub country_code: String,
    pub country_name: String,
    pub component_type: String,
    pub observed_value: f64,
    pub benchmark_value: f64,
    pub financial_allocation_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerComparisonResult {
    pub rwanda_rank: usize,
    pub total_countries: usize,
    pub peer_scores: Vec<PeerScore>,
    pub component_rankings: Vec<ComponentRanking>,
    pub computing_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerScore {
    pub country_code: String,
    pub country_name: String,
    pub average_gap: f64,
    pub rank: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentRanking {
    pub component_type: String,
    pub rwanda_value: f64,
    pub rwanda_gap: f64,
    pub peer_average: f64,
    pub rwanda_rank: usize,
    pub total_peers: usize,
    pub position: String, // "above_average", "average", "below_average"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetRecommendation {
    pub component_type: String,
    pub current_value: f64,
    pub benchmark_value: f64,
    pub recommended_target: f64,
    pub current_gap: f64,
    pub target_gap: f64,
    pub annual_improvement_needed: f64,
    pub priority: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetRecommendationsResult {
    pub recommendations: Vec<TargetRecommendation>,
    pub target_year: i32,
    pub years_to_target: i32,
    pub computing_time_ms: u64,
}

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

pub fn analyze_gaps(components: &[ComponentInput]) -> FsfiResult<GapAnalysisResult> {
    let start = Instant::now();
    let n = components.len();

    let mut component_gaps = Vec::with_capacity(n);
    let mut total_gap = 0.0;

    for comp in components {
        let gap = calculate_performance_gap(comp.observed_value, comp.benchmark_value)?;
        let sensitivity = if comp.sensitivity_parameter > 0.0 {
            comp.sensitivity_parameter
        } else {
            get_default_sensitivity(&comp.component_type)
        };
        let alloc_m = comp.financial_allocation_usd / 1_000_000.0;
        let stress = calculate_stress(gap, alloc_m, sensitivity)?;

        let status = if gap < 0.10 {
            "on_track"
        } else if gap < 0.30 {
            "behind"
        } else {
            "critical"
        };

        let recommendation = match status {
            "critical" => format!(
                "Urgent: {} has a {:.0}% gap. Increase funding and prioritize structural reforms.",
                comp.component_type.replace('_', " "),
                gap * 100.0
            ),
            "behind" => format!(
                "Attention: {} gap is {:.0}%. Target incremental improvements.",
                comp.component_type.replace('_', " "),
                gap * 100.0
            ),
            _ => format!(
                "{} is on track with only {:.0}% gap. Maintain current trajectory.",
                comp.component_type.replace('_', " "),
                gap * 100.0
            ),
        };

        total_gap += gap;

        component_gaps.push(ComponentGap {
            component_type: comp.component_type.clone(),
            observed_value: comp.observed_value,
            benchmark_value: comp.benchmark_value,
            gap: round_to_precision(gap, Some(4)),
            gap_pct: round_to_precision(gap * 100.0, Some(1)),
            stress: round_to_precision(stress, Some(4)),
            rank: 0,
            status: status.to_string(),
            recommendation,
        });
    }

    // Sort by gap descending and assign ranks
    component_gaps.sort_by(|a, b| b.gap.partial_cmp(&a.gap).unwrap());
    for (i, cg) in component_gaps.iter_mut().enumerate() {
        cg.rank = i + 1;
    }

    let on_track = component_gaps.iter().filter(|c| c.status == "on_track").count();
    let behind = component_gaps.iter().filter(|c| c.status == "behind").count();
    let critical = component_gaps.iter().filter(|c| c.status == "critical").count();

    let worst = component_gaps.first().map(|c| c.component_type.clone()).unwrap_or_default();
    let best = component_gaps.last().map(|c| c.component_type.clone()).unwrap_or_default();

    Ok(GapAnalysisResult {
        component_gaps,
        average_gap: round_to_precision(safe_divide(total_gap, n as f64, 0.0), Some(4)),
        worst_gap_component: worst,
        best_gap_component: best,
        gap_distribution: GapDistribution { on_track, behind, critical },
        computing_time_ms: start.elapsed().as_millis() as u64,
    })
}

pub fn compare_peers(
    rwanda_components: &[ComponentInput],
    peer_data: &[PeerComparisonInput],
) -> FsfiResult<PeerComparisonResult> {
    let start = Instant::now();

    // Calculate Rwanda's average gap
    let mut rwanda_gaps: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
    let mut rwanda_total_gap = 0.0;

    for comp in rwanda_components {
        let gap = calculate_performance_gap(comp.observed_value, comp.benchmark_value)?;
        rwanda_gaps.insert(comp.component_type.clone(), gap);
        rwanda_total_gap += gap;
    }
    let rwanda_avg = safe_divide(rwanda_total_gap, rwanda_components.len() as f64, 0.0);

    // Group peer data by country
    let mut country_gaps: std::collections::HashMap<String, (String, Vec<f64>)> =
        std::collections::HashMap::new();

    for peer in peer_data {
        let gap = calculate_performance_gap(peer.observed_value, peer.benchmark_value)?;
        country_gaps
            .entry(peer.country_code.clone())
            .or_insert_with(|| (peer.country_name.clone(), Vec::new()))
            .1
            .push(gap);
    }

    // Score each country
    let mut peer_scores: Vec<PeerScore> = country_gaps
        .iter()
        .map(|(code, (name, gaps))| {
            let avg = safe_divide(gaps.iter().sum::<f64>(), gaps.len() as f64, 0.0);
            PeerScore {
                country_code: code.clone(),
                country_name: name.clone(),
                average_gap: round_to_precision(avg, Some(4)),
                rank: 0,
            }
        })
        .collect();

    // Add Rwanda
    peer_scores.push(PeerScore {
        country_code: "RW".to_string(),
        country_name: "Rwanda".to_string(),
        average_gap: round_to_precision(rwanda_avg, Some(4)),
        rank: 0,
    });

    // Sort by gap ascending (lower gap = better)
    peer_scores.sort_by(|a, b| a.average_gap.partial_cmp(&b.average_gap).unwrap());
    for (i, ps) in peer_scores.iter_mut().enumerate() {
        ps.rank = i + 1;
    }

    let rwanda_rank = peer_scores
        .iter()
        .find(|p| p.country_code == "RW")
        .map(|p| p.rank)
        .unwrap_or(0);

    // Component-level rankings
    let mut component_rankings = Vec::new();
    for comp in rwanda_components {
        let rw_gap = rwanda_gaps.get(&comp.component_type).copied().unwrap_or(0.0);

        let peer_gaps: Vec<f64> = peer_data
            .iter()
            .filter(|p| p.component_type == comp.component_type)
            .map(|p| calculate_performance_gap(p.observed_value, p.benchmark_value).unwrap_or(0.0))
            .collect();

        let peer_avg = safe_divide(peer_gaps.iter().sum::<f64>(), peer_gaps.len() as f64, 0.0);
        let better_count = peer_gaps.iter().filter(|&&g| g < rw_gap).count();
        let total = peer_gaps.len() + 1;
        let rw_rank = better_count + 1;

        let position = if rw_gap < peer_avg * 0.9 {
            "above_average"
        } else if rw_gap > peer_avg * 1.1 {
            "below_average"
        } else {
            "average"
        };

        component_rankings.push(ComponentRanking {
            component_type: comp.component_type.clone(),
            rwanda_value: comp.observed_value,
            rwanda_gap: round_to_precision(rw_gap, Some(4)),
            peer_average: round_to_precision(peer_avg, Some(4)),
            rwanda_rank: rw_rank,
            total_peers: total,
            position: position.to_string(),
        });
    }

    Ok(PeerComparisonResult {
        rwanda_rank,
        total_countries: peer_scores.len(),
        peer_scores,
        component_rankings,
        computing_time_ms: start.elapsed().as_millis() as u64,
    })
}

pub fn recommend_targets(
    components: &[ComponentInput],
    target_year: i32,
    current_year: i32,
) -> FsfiResult<TargetRecommendationsResult> {
    let start = Instant::now();
    let years = (target_year - current_year).max(1);

    let mut recommendations = Vec::with_capacity(components.len());

    for comp in components {
        let gap = calculate_performance_gap(comp.observed_value, comp.benchmark_value)?;

        // Target: close 70% of the gap by target year
        let target_gap = gap * 0.3;
        let improvement_needed = comp.benchmark_value - comp.observed_value;
        let target_value = comp.observed_value + improvement_needed * 0.7;
        let annual_improvement = safe_divide(improvement_needed * 0.7, years as f64, 0.0);

        let priority = if gap >= 0.30 {
            "high"
        } else if gap >= 0.15 {
            "medium"
        } else {
            "low"
        };

        recommendations.push(TargetRecommendation {
            component_type: comp.component_type.clone(),
            current_value: comp.observed_value,
            benchmark_value: comp.benchmark_value,
            recommended_target: round_to_precision(target_value, Some(1)),
            current_gap: round_to_precision(gap, Some(4)),
            target_gap: round_to_precision(target_gap, Some(4)),
            annual_improvement_needed: round_to_precision(annual_improvement, Some(2)),
            priority: priority.to_string(),
        });
    }

    // Sort by priority (high first)
    recommendations.sort_by(|a, b| {
        let order = |p: &str| match p { "high" => 0, "medium" => 1, _ => 2 };
        order(&a.priority).cmp(&order(&b.priority))
    });

    Ok(TargetRecommendationsResult {
        recommendations,
        target_year,
        years_to_target: years,
        computing_time_ms: start.elapsed().as_millis() as u64,
    })
}

// ---------------------------------------------------------------------------
// PyO3 Functions
// ---------------------------------------------------------------------------

#[pyfunction]
pub fn py_analyze_performance_gaps(components_json: &str) -> PyResult<String> {
    let components: Vec<ComponentInput> = serde_json::from_str(components_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid JSON: {}", e)))?;

    let result = analyze_gaps(&components)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

#[pyfunction]
pub fn py_compare_peers(
    rwanda_json: &str,
    peer_json: &str,
) -> PyResult<String> {
    let rwanda: Vec<ComponentInput> = serde_json::from_str(rwanda_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid Rwanda JSON: {}", e)))?;
    let peers: Vec<PeerComparisonInput> = serde_json::from_str(peer_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid peer JSON: {}", e)))?;

    let result = compare_peers(&rwanda, &peers)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

#[pyfunction]
#[pyo3(signature = (components_json, target_year=2029, current_year=2025))]
pub fn py_recommend_targets(
    components_json: &str,
    target_year: i32,
    current_year: i32,
) -> PyResult<String> {
    let components: Vec<ComponentInput> = serde_json::from_str(components_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid JSON: {}", e)))?;

    let result = recommend_targets(&components, target_year, current_year)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

pub fn register_functions(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(py_analyze_performance_gaps, m)?)?;
    m.add_function(wrap_pyfunction!(py_compare_peers, m)?)?;
    m.add_function(wrap_pyfunction!(py_recommend_targets, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Vec<ComponentInput> {
        vec![
            ComponentInput {
                component_type: "agricultural_development".into(),
                observed_value: 75.0, benchmark_value: 90.0,
                financial_allocation_usd: 125_000_000.0,
                sensitivity_parameter: 0.0015, weight: Some(0.35), name: None,
            },
            ComponentInput {
                component_type: "infrastructure".into(),
                observed_value: 60.0, benchmark_value: 85.0,
                financial_allocation_usd: 95_000_000.0,
                sensitivity_parameter: 0.0018, weight: Some(0.30), name: None,
            },
            ComponentInput {
                component_type: "climate_natural_resources".into(),
                observed_value: 50.0, benchmark_value: 75.0,
                financial_allocation_usd: 60_000_000.0,
                sensitivity_parameter: 0.0008, weight: Some(0.20), name: None,
            },
            ComponentInput {
                component_type: "governance_institutions".into(),
                observed_value: 80.0, benchmark_value: 85.0,
                financial_allocation_usd: 50_000_000.0,
                sensitivity_parameter: 0.0006, weight: Some(0.15), name: None,
            },
        ]
    }

    #[test]
    fn test_gap_analysis() {
        let result = analyze_gaps(&sample()).unwrap();
        assert_eq!(result.component_gaps.len(), 4);
        assert!(result.average_gap > 0.0);
        // Ranked by gap descending — first should have highest gap
        assert!(result.component_gaps[0].gap >= result.component_gaps[3].gap);
    }

    #[test]
    fn test_gap_distribution() {
        let result = analyze_gaps(&sample()).unwrap();
        let total = result.gap_distribution.on_track
            + result.gap_distribution.behind
            + result.gap_distribution.critical;
        assert_eq!(total, 4);
    }

    #[test]
    fn test_peer_comparison() {
        let rwanda = sample();
        let peers = vec![
            PeerComparisonInput {
                country_code: "UG".into(), country_name: "Uganda".into(),
                component_type: "agricultural_development".into(),
                observed_value: 70.0, benchmark_value: 90.0,
                financial_allocation_usd: 100_000_000.0,
            },
            PeerComparisonInput {
                country_code: "KE".into(), country_name: "Kenya".into(),
                component_type: "agricultural_development".into(),
                observed_value: 80.0, benchmark_value: 90.0,
                financial_allocation_usd: 150_000_000.0,
            },
        ];

        let result = compare_peers(&rwanda, &peers).unwrap();
        assert_eq!(result.total_countries, 3); // RW + UG + KE
        assert!(result.rwanda_rank >= 1 && result.rwanda_rank <= 3);
    }

    #[test]
    fn test_target_recommendations() {
        let result = recommend_targets(&sample(), 2029, 2025).unwrap();
        assert_eq!(result.recommendations.len(), 4);
        assert_eq!(result.years_to_target, 4);
        for rec in &result.recommendations {
            assert!(rec.recommended_target >= rec.current_value);
            assert!(rec.recommended_target <= rec.benchmark_value);
        }
    }
}
