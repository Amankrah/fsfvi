/// Performance Gap Analysis Service
/// =================================
///
/// Analyzes the gap between current performance and benchmarks across food system components.
/// Critical for governments to understand WHERE they're falling short and BY HOW MUCH.
///
/// PERFORMANCE GAP (δ):
/// δ = (benchmark - observed) / benchmark  [for "higher is better" metrics]
/// δ = (observed - benchmark) / benchmark  [for "lower is better" metrics]
///
/// WHY THIS MATTERS:
/// - Identifies specific areas needing improvement
/// - Quantifies the magnitude of underperformance
/// - Tracks progress toward national/international benchmarks
/// - Supports evidence-based target setting
/// - Enables peer comparison with similar countries
///
/// USE CASES:
/// 1. Baseline Assessment: Where do we stand today?
/// 2. Progress Monitoring: Are we closing the gaps?
/// 3. Peer Comparison: How do we compare to neighbors/region?
/// 4. Target Setting: What are realistic improvement goals?
/// 5. Resource Prioritization: Which gaps to address first?

use crate::fsfvi::config::normalize_component_type;
use crate::fsfvi::errors::{FsfviError, FsfviResult};
use crate::fsfvi::validators::Component;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Performance gap analysis service
pub struct PerformanceGapAnalysisService {
    // Service is stateless - no fields needed
}

impl Default for PerformanceGapAnalysisService {
    fn default() -> Self {
        Self::new()
    }
}

impl PerformanceGapAnalysisService {
    pub fn new() -> Self {
        Self {}
    }

    /// Comprehensive performance gap analysis
    ///
    /// Analyzes gaps across all components with detailed insights.
    pub fn analyze_performance_gaps(
        &self,
        components: Vec<Component>,
    ) -> FsfviResult<PerformanceGapReport> {
        tracing::info!(
            "Analyzing performance gaps for {} components",
            components.len()
        );

        if components.is_empty() {
            return Err(FsfviError::Validation {
                message: "Cannot analyze performance gaps: no components provided".to_string(),
                details: HashMap::new(),
            });
        }

        let mut component_gaps = Vec::new();
        let mut total_gap = 0.0;
        let mut critical_gaps = Vec::new();

        for comp in &components {
            let comp_type = normalize_component_type(&comp.component_type);
            let prefer_higher = comp_type.prefer_higher();

            // Calculate performance gap
            let gap = if prefer_higher {
                // Higher is better: gap = (benchmark - observed) / benchmark
                if comp.benchmark_value > 0.0 {
                    (comp.benchmark_value - comp.observed_value) / comp.benchmark_value
                } else {
                    0.0
                }
            } else {
                // Lower is better: gap = (observed - benchmark) / benchmark
                if comp.benchmark_value > 0.0 {
                    (comp.observed_value - comp.benchmark_value) / comp.benchmark_value
                } else {
                    0.0
                }
            };

            // Ensure gap is non-negative (underperformance)
            let performance_gap = gap.max(0.0);

            // Calculate achievement rate (0-100%)
            let achievement_rate = if prefer_higher {
                if comp.benchmark_value > 0.0 {
                    (comp.observed_value / comp.benchmark_value * 100.0).min(100.0)
                } else {
                    100.0
                }
            } else {
                if comp.observed_value > 0.0 {
                    (comp.benchmark_value / comp.observed_value * 100.0).min(100.0)
                } else {
                    100.0
                }
            };

            // Determine severity
            let severity = if performance_gap > 0.5 {
                "critical"
            } else if performance_gap > 0.3 {
                "high"
            } else if performance_gap > 0.15 {
                "medium"
            } else {
                "low"
            }
            .to_string();

            // Calculate absolute gap
            let absolute_gap = if prefer_higher {
                (comp.benchmark_value - comp.observed_value).max(0.0)
            } else {
                (comp.observed_value - comp.benchmark_value).max(0.0)
            };

            let component_gap = ComponentPerformanceGap {
                component_type: comp.component_type.clone(),
                observed_value: comp.observed_value,
                benchmark_value: comp.benchmark_value,
                performance_gap,
                absolute_gap,
                achievement_rate,
                severity: severity.clone(),
                prefer_higher,
                improvement_needed: self.calculate_improvement_needed(
                    comp.observed_value,
                    comp.benchmark_value,
                    prefer_higher,
                ),
                recommendations: self.generate_gap_recommendations(
                    &comp.component_type,
                    performance_gap,
                    &severity,
                ),
            };

            total_gap += performance_gap;

            if severity == "critical" || severity == "high" {
                critical_gaps.push(component_gap.clone());
            }

            component_gaps.push(component_gap);
        }

        // Sort by performance gap (worst first)
        component_gaps.sort_by(|a, b| {
            b.performance_gap
                .partial_cmp(&a.performance_gap)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        let average_gap = total_gap / components.len() as f64;

        // Overall assessment
        let overall_status = if average_gap > 0.4 {
            "critical"
        } else if average_gap > 0.25 {
            "needs_significant_improvement"
        } else if average_gap > 0.15 {
            "needs_improvement"
        } else {
            "on_track"
        }
        .to_string();

        Ok(PerformanceGapReport {
            overall_status,
            average_gap,
            total_components: components.len(),
            critical_gaps: critical_gaps.len(),
            top_priorities: self.identify_top_priorities(&component_gaps),
            quick_wins: self.identify_gap_quick_wins(&component_gaps),
            key_insights: self.generate_gap_insights(&component_gaps, average_gap),
            component_gaps,
        })
    }

    /// Compare performance against peer countries/regions
    ///
    /// Shows how country performs relative to peers with similar characteristics.
    pub fn peer_comparison(
        &self,
        components: Vec<Component>,
        peer_data: Vec<PeerCountryData>,
    ) -> FsfviResult<PeerComparisonReport> {
        tracing::info!(
            "Comparing performance against {} peer countries",
            peer_data.len()
        );

        if peer_data.is_empty() {
            return Err(FsfviError::Validation {
                message: "Cannot perform peer comparison: no peer data provided".to_string(),
                details: HashMap::new(),
            });
        }

        let mut comparisons = Vec::new();

        for comp in &components {
            // Find peer average for this component
            let peer_values: Vec<f64> = peer_data
                .iter()
                .filter_map(|p| p.component_values.get(&comp.component_type).copied())
                .collect();

            if peer_values.is_empty() {
                continue;
            }

            let peer_average = peer_values.iter().sum::<f64>() / peer_values.len() as f64;
            let peer_max = peer_values
                .iter()
                .cloned()
                .fold(f64::NEG_INFINITY, f64::max);
            let peer_min = peer_values
                .iter()
                .cloned()
                .fold(f64::INFINITY, f64::min);

            let comp_type = normalize_component_type(&comp.component_type);
            let prefer_higher = comp_type.prefer_higher();

            // Calculate relative performance
            let relative_to_peers = if prefer_higher {
                if peer_average > 0.0 {
                    ((comp.observed_value - peer_average) / peer_average) * 100.0
                } else {
                    0.0
                }
            } else {
                if peer_average > 0.0 {
                    ((peer_average - comp.observed_value) / peer_average) * 100.0
                } else {
                    0.0
                }
            };

            let performance_level = if relative_to_peers > 10.0 {
                "above_peers"
            } else if relative_to_peers > -10.0 {
                "at_peer_level"
            } else if relative_to_peers > -30.0 {
                "below_peers"
            } else {
                "significantly_below_peers"
            }
            .to_string();

            comparisons.push(ComponentPeerComparison {
                component_type: comp.component_type.clone(),
                current_value: comp.observed_value,
                peer_average,
                peer_best: peer_max,
                peer_worst: peer_min,
                difference_from_peers_percent: relative_to_peers,
                performance_level,
                quartile: self.calculate_quartile(comp.observed_value, &peer_values, prefer_higher),
            });
        }

        // Rank comparisons by performance gap
        comparisons.sort_by(|a, b| {
            a.difference_from_peers_percent
                .partial_cmp(&b.difference_from_peers_percent)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        let areas_above_peers = comparisons
            .iter()
            .filter(|c| c.performance_level == "above_peers")
            .count();
        let areas_below_peers = comparisons
            .iter()
            .filter(|c| {
                c.performance_level == "below_peers"
                    || c.performance_level == "significantly_below_peers"
            })
            .count();

        let competitive_advantages = self.identify_competitive_advantages(&comparisons);
        let learning_opportunities = self.identify_learning_opportunities(&comparisons);

        Ok(PeerComparisonReport {
            peer_countries: peer_data.iter().map(|p| p.country_name.clone()).collect(),
            component_comparisons: comparisons,
            areas_above_peers,
            areas_below_peers,
            competitive_advantages,
            learning_opportunities,
        })
    }

    /// Track progress in closing performance gaps over time
    ///
    /// Compares baseline and current state to measure improvement.
    pub fn track_gap_closure(
        &self,
        baseline_components: Vec<Component>,
        current_components: Vec<Component>,
        time_period_months: usize,
    ) -> FsfviResult<GapClosureReport> {
        tracing::info!(
            "Tracking gap closure over {} months",
            time_period_months
        );

        if baseline_components.len() != current_components.len() {
            return Err(FsfviError::Validation {
                message: "Baseline and current components must have same length".to_string(),
                details: [
                    ("baseline_count".to_string(), baseline_components.len().to_string()),
                    ("current_count".to_string(), current_components.len().to_string()),
                ]
                .iter()
                .cloned()
                .collect(),
            });
        }

        let mut progress_items = Vec::new();

        for (baseline, current) in baseline_components.iter().zip(current_components.iter()) {
            if baseline.component_type != current.component_type {
                return Err(FsfviError::Validation {
                    message: "Component types must match between baseline and current".to_string(),
                    details: [
                        ("baseline_type".to_string(), baseline.component_type.clone()),
                        ("current_type".to_string(), current.component_type.clone()),
                    ]
                    .iter()
                    .cloned()
                    .collect(),
                });
            }

            let comp_type = normalize_component_type(&baseline.component_type);
            let prefer_higher = comp_type.prefer_higher();

            // Calculate baseline gap
            let baseline_gap = if prefer_higher {
                if baseline.benchmark_value > 0.0 {
                    ((baseline.benchmark_value - baseline.observed_value) / baseline.benchmark_value).max(0.0)
                } else {
                    0.0
                }
            } else {
                if baseline.benchmark_value > 0.0 {
                    ((baseline.observed_value - baseline.benchmark_value) / baseline.benchmark_value).max(0.0)
                } else {
                    0.0
                }
            };

            // Calculate current gap
            let current_gap = if prefer_higher {
                if current.benchmark_value > 0.0 {
                    ((current.benchmark_value - current.observed_value) / current.benchmark_value).max(0.0)
                } else {
                    0.0
                }
            } else {
                if current.benchmark_value > 0.0 {
                    ((current.observed_value - current.benchmark_value) / current.benchmark_value).max(0.0)
                } else {
                    0.0
                }
            };

            let gap_change = current_gap - baseline_gap;
            let gap_closure_percent = if baseline_gap > 0.0 {
                (baseline_gap - current_gap) / baseline_gap * 100.0
            } else {
                0.0
            };

            let progress_status = if gap_closure_percent > 50.0 {
                "excellent"
            } else if gap_closure_percent > 25.0 {
                "good"
            } else if gap_closure_percent > 0.0 {
                "moderate"
            } else if gap_closure_percent > -10.0 {
                "stagnant"
            } else {
                "declining"
            }
            .to_string();

            progress_items.push(ComponentGapProgress {
                component_type: baseline.component_type.clone(),
                baseline_gap,
                current_gap,
                gap_change,
                gap_closure_percent,
                progress_status,
                baseline_value: baseline.observed_value,
                current_value: current.observed_value,
                value_change: current.observed_value - baseline.observed_value,
            });
        }

        let avg_closure = progress_items
            .iter()
            .map(|p| p.gap_closure_percent)
            .sum::<f64>()
            / progress_items.len() as f64;

        let improving_components = progress_items
            .iter()
            .filter(|p| p.progress_status == "excellent" || p.progress_status == "good")
            .count();

        let declining_components = progress_items
            .iter()
            .filter(|p| p.progress_status == "declining")
            .count();

        let success_stories = self.identify_success_stories(&progress_items);
        let areas_needing_attention = self.identify_declining_areas(&progress_items);

        Ok(GapClosureReport {
            time_period_months,
            average_gap_closure_percent: avg_closure,
            improving_components,
            declining_components,
            success_stories,
            areas_needing_attention,
            component_progress: progress_items,
        })
    }

    /// Set realistic targets for gap closure
    ///
    /// Helps governments set achievable targets based on current gaps and peer performance.
    pub fn recommend_targets(
        &self,
        components: Vec<Component>,
        target_timeline_months: usize,
        peer_data: Option<Vec<PeerCountryData>>,
    ) -> FsfviResult<TargetRecommendationReport> {
        tracing::info!(
            "Recommending targets for {} month timeline",
            target_timeline_months
        );

        let mut target_recommendations = Vec::new();

        for comp in &components {
            let comp_type = normalize_component_type(&comp.component_type);
            let prefer_higher = comp_type.prefer_higher();

            // Calculate current gap
            let current_gap = if prefer_higher {
                if comp.benchmark_value > 0.0 {
                    ((comp.benchmark_value - comp.observed_value) / comp.benchmark_value).max(0.0)
                } else {
                    0.0
                }
            } else {
                if comp.benchmark_value > 0.0 {
                    ((comp.observed_value - comp.benchmark_value) / comp.benchmark_value).max(0.0)
                } else {
                    0.0
                }
            };

            // Determine realistic closure rate based on timeline
            let realistic_closure_rate = if target_timeline_months <= 12 {
                0.20 // 20% closure in 1 year
            } else if target_timeline_months <= 24 {
                0.40 // 40% closure in 2 years
            } else if target_timeline_months <= 36 {
                0.60 // 60% closure in 3 years
            } else {
                0.80 // 80% closure in 4+ years
            };

            let target_gap = current_gap * (1.0 - realistic_closure_rate);

            // Calculate target value
            let target_value = if prefer_higher {
                comp.benchmark_value * (1.0 - target_gap)
            } else {
                comp.benchmark_value * (1.0 + target_gap)
            };

            // Check peer benchmarks if available
            let peer_informed_target = if let Some(ref peers) = peer_data {
                self.calculate_peer_informed_target(comp, peers, prefer_higher)
            } else {
                None
            };

            target_recommendations.push(ComponentTargetRecommendation {
                component_type: comp.component_type.clone(),
                current_value: comp.observed_value,
                current_gap,
                recommended_target: target_value,
                peer_informed_target,
                realistic_closure_percent: realistic_closure_rate * 100.0,
                rationale: self.generate_target_rationale(
                    current_gap,
                    realistic_closure_rate,
                    target_timeline_months,
                ),
            });
        }

        Ok(TargetRecommendationReport {
            target_timeline_months,
            component_targets: target_recommendations,
            overall_guidance: self.generate_target_guidance(target_timeline_months),
        })
    }

    // Helper methods

    fn calculate_improvement_needed(&self, observed: f64, benchmark: f64, prefer_higher: bool) -> f64 {
        if prefer_higher {
            (benchmark - observed).max(0.0)
        } else {
            (observed - benchmark).max(0.0)
        }
    }

    fn generate_gap_recommendations(&self, component_type: &str, gap: f64, severity: &str) -> Vec<String> {
        let mut recommendations = Vec::new();

        if severity == "critical" {
            recommendations.push("URGENT: Immediate intervention required".to_string());
        }

        match component_type {
            "agricultural_development" => {
                if gap > 0.3 {
                    recommendations.push("Increase investment in agricultural extension services".to_string());
                    recommendations.push("Improve access to quality seeds and fertilizers".to_string());
                }
            }
            "infrastructure" => {
                if gap > 0.3 {
                    recommendations.push("Upgrade rural road networks and market access".to_string());
                    recommendations.push("Invest in storage and cold chain infrastructure".to_string());
                }
            }
            "nutrition_health" => {
                if gap > 0.3 {
                    recommendations.push("Expand nutrition education and food fortification programs".to_string());
                }
            }
            _ => {
                recommendations.push("Develop targeted improvement strategy".to_string());
            }
        }

        recommendations
    }

    fn identify_top_priorities(&self, gaps: &[ComponentPerformanceGap]) -> Vec<String> {
        gaps.iter()
            .filter(|g| g.severity == "critical" || g.severity == "high")
            .take(5)
            .map(|g| format!("{}: {:.1}% gap", g.component_type, g.performance_gap * 100.0))
            .collect()
    }

    fn identify_gap_quick_wins(&self, gaps: &[ComponentPerformanceGap]) -> Vec<String> {
        gaps.iter()
            .filter(|g| g.performance_gap > 0.1 && g.performance_gap < 0.25)
            .take(3)
            .map(|g| format!("{}: Moderate gap ({:.1}%) achievable to close", g.component_type, g.performance_gap * 100.0))
            .collect()
    }

    fn generate_gap_insights(&self, gaps: &[ComponentPerformanceGap], avg_gap: f64) -> Vec<String> {
        let mut insights = Vec::new();

        insights.push(format!(
            "Average performance gap: {:.1}%",
            avg_gap * 100.0
        ));

        let critical_count = gaps.iter().filter(|g| g.severity == "critical").count();
        if critical_count > 0 {
            insights.push(format!(
                "{} component(s) with critical gaps requiring immediate attention",
                critical_count
            ));
        }

        let on_track = gaps.iter().filter(|g| g.severity == "low").count();
        if on_track > 0 {
            insights.push(format!(
                "{} component(s) performing well (low gaps)",
                on_track
            ));
        }

        insights
    }

    fn calculate_quartile(&self, value: f64, peer_values: &[f64], prefer_higher: bool) -> String {
        let mut sorted = peer_values.to_vec();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());

        let len = sorted.len();
        let q1 = sorted[len / 4];
        let q2 = sorted[len / 2];
        let q3 = sorted[(3 * len) / 4];

        if prefer_higher {
            if value >= q3 {
                "top_quartile".to_string()
            } else if value >= q2 {
                "second_quartile".to_string()
            } else if value >= q1 {
                "third_quartile".to_string()
            } else {
                "bottom_quartile".to_string()
            }
        } else {
            if value <= q1 {
                "top_quartile".to_string()
            } else if value <= q2 {
                "second_quartile".to_string()
            } else if value <= q3 {
                "third_quartile".to_string()
            } else {
                "bottom_quartile".to_string()
            }
        }
    }

    fn identify_competitive_advantages(&self, comparisons: &[ComponentPeerComparison]) -> Vec<String> {
        comparisons
            .iter()
            .filter(|c| c.performance_level == "above_peers")
            .take(3)
            .map(|c| format!("{}: {:.1}% above peer average", c.component_type, c.difference_from_peers_percent))
            .collect()
    }

    fn identify_learning_opportunities(&self, comparisons: &[ComponentPeerComparison]) -> Vec<String> {
        comparisons
            .iter()
            .filter(|c| c.performance_level == "significantly_below_peers" || c.performance_level == "below_peers")
            .take(3)
            .map(|c| format!("{}: Learn from peers ({:.1}% gap)", c.component_type, c.difference_from_peers_percent.abs()))
            .collect()
    }

    fn identify_success_stories(&self, progress: &[ComponentGapProgress]) -> Vec<String> {
        progress
            .iter()
            .filter(|p| p.progress_status == "excellent")
            .map(|p| format!("{}: {:.1}% gap closure", p.component_type, p.gap_closure_percent))
            .collect()
    }

    fn identify_declining_areas(&self, progress: &[ComponentGapProgress]) -> Vec<String> {
        progress
            .iter()
            .filter(|p| p.progress_status == "declining")
            .map(|p| format!("{}: Gap widening by {:.1}%", p.component_type, p.gap_change.abs() * 100.0))
            .collect()
    }

    fn calculate_peer_informed_target(&self, comp: &Component, peers: &[PeerCountryData], prefer_higher: bool) -> Option<f64> {
        let peer_values: Vec<f64> = peers
            .iter()
            .filter_map(|p| p.component_values.get(&comp.component_type).copied())
            .collect();

        if peer_values.is_empty() {
            return None;
        }

        let peer_average = peer_values.iter().sum::<f64>() / peer_values.len() as f64;

        // Target depends on whether higher or lower is better
        if prefer_higher {
            // For metrics where higher is better (e.g., food production, nutrition access)
            // Target should be higher than current, towards peer average
            Some(peer_average.max(comp.observed_value))
        } else {
            // For metrics where lower is better (e.g., malnutrition rate, food waste)
            // Target should be lower than current, towards peer average
            Some(peer_average.min(comp.observed_value))
        }
    }

    fn generate_target_rationale(&self, current_gap: f64, closure_rate: f64, months: usize) -> String {
        format!(
            "Based on {:.1}% current gap, realistic to close {:.0}% over {} months with sustained effort",
            current_gap * 100.0,
            closure_rate * 100.0,
            months
        )
    }

    fn generate_target_guidance(&self, months: usize) -> Vec<String> {
        let mut guidance = Vec::new();

        guidance.push(format!(
            "Targets set for {}-month timeline with realistic closure rates",
            months
        ));

        guidance.push("Focus resources on components with largest gaps and highest impact".to_string());

        if months >= 24 {
            guidance.push("Long timeline allows for structural reforms and capacity building".to_string());
        } else {
            guidance.push("Short timeline requires focus on quick wins and high-impact interventions".to_string());
        }

        guidance
    }
}

// Request/Response Types

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceGapReport {
    pub overall_status: String, // "critical", "needs_significant_improvement", etc.
    pub average_gap: f64,
    pub total_components: usize,
    pub critical_gaps: usize,
    pub component_gaps: Vec<ComponentPerformanceGap>,
    pub top_priorities: Vec<String>,
    pub quick_wins: Vec<String>,
    pub key_insights: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentPerformanceGap {
    pub component_type: String,
    pub observed_value: f64,
    pub benchmark_value: f64,
    pub performance_gap: f64,        // Normalized gap (0-1)
    pub absolute_gap: f64,            // Absolute difference
    pub achievement_rate: f64,        // % of benchmark achieved
    pub severity: String,             // "critical", "high", "medium", "low"
    pub prefer_higher: bool,
    pub improvement_needed: f64,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerComparisonReport {
    pub peer_countries: Vec<String>,
    pub component_comparisons: Vec<ComponentPeerComparison>,
    pub areas_above_peers: usize,
    pub areas_below_peers: usize,
    pub competitive_advantages: Vec<String>,
    pub learning_opportunities: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentPeerComparison {
    pub component_type: String,
    pub current_value: f64,
    pub peer_average: f64,
    pub peer_best: f64,
    pub peer_worst: f64,
    pub difference_from_peers_percent: f64,
    pub performance_level: String, // "above_peers", "at_peer_level", etc.
    pub quartile: String,          // "top_quartile", "second_quartile", etc.
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerCountryData {
    pub country_name: String,
    pub component_values: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GapClosureReport {
    pub time_period_months: usize,
    pub average_gap_closure_percent: f64,
    pub improving_components: usize,
    pub declining_components: usize,
    pub component_progress: Vec<ComponentGapProgress>,
    pub success_stories: Vec<String>,
    pub areas_needing_attention: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentGapProgress {
    pub component_type: String,
    pub baseline_gap: f64,
    pub current_gap: f64,
    pub gap_change: f64,
    pub gap_closure_percent: f64,
    pub progress_status: String, // "excellent", "good", "moderate", "stagnant", "declining"
    pub baseline_value: f64,
    pub current_value: f64,
    pub value_change: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetRecommendationReport {
    pub target_timeline_months: usize,
    pub component_targets: Vec<ComponentTargetRecommendation>,
    pub overall_guidance: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentTargetRecommendation {
    pub component_type: String,
    pub current_value: f64,
    pub current_gap: f64,
    pub recommended_target: f64,
    pub peer_informed_target: Option<f64>,
    pub realistic_closure_percent: f64,
    pub rationale: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_components() -> Vec<Component> {
        vec![
            Component {
                component_id: Some("test_1".to_string()),
                component_type: "agricultural_development".to_string(),
                observed_value: 100.0,
                benchmark_value: 150.0, // 33% gap
                financial_allocation: 1000.0,
                weight: Some(0.4),
                sensitivity_parameter: Some(0.001),
            },
            Component {
                component_id: Some("test_2".to_string()),
                component_type: "infrastructure".to_string(),
                observed_value: 80.0,
                benchmark_value: 100.0, // 20% gap
                financial_allocation: 500.0,
                weight: Some(0.6),
                sensitivity_parameter: Some(0.0015),
            },
        ]
    }

    #[test]
    fn test_performance_gap_analysis() {
        let service = PerformanceGapAnalysisService::new();
        let report = service
            .analyze_performance_gaps(create_test_components())
            .unwrap();

        assert_eq!(report.total_components, 2);
        assert!(report.average_gap > 0.0);
        assert!(!report.component_gaps.is_empty());
    }

    #[test]
    fn test_gap_calculation() {
        let service = PerformanceGapAnalysisService::new();
        let components = create_test_components();

        let report = service.analyze_performance_gaps(components).unwrap();

        // First component: (150-100)/150 = 0.33
        let agri_gap = report
            .component_gaps
            .iter()
            .find(|g| g.component_type == "agricultural_development")
            .unwrap();

        assert!((agri_gap.performance_gap - 0.33).abs() < 0.01);
    }
}
