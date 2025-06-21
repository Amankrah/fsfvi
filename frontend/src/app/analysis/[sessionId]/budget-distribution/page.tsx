'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  RefreshCw,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Loader2,
  Target
} from 'lucide-react';
import { analysisAPI } from '@/lib/api';
import { AnalysisNavigation } from '@/components/analysis/AnalysisNavigation';

interface ComponentAllocation {
  component_name: string;
  current_allocation_usd_millions: number;
  percentage_of_total: number;
  sensitivity_parameter: number;
  performance_metrics?: {
    observed_value: number;
    benchmark_value: number;
    performance_gap_percent: number;
    performance_efficiency: number;
    prefer_higher: boolean;
  };
  vulnerability_analysis?: {
    vulnerability_score: number;
    priority_level: string;
    risk_category: string;
  };
  efficiency_analysis?: {
    allocation_efficiency_score: number;
    cost_effectiveness_per_100m: number;
    theoretical_optimal_allocation: number;
    optimization_potential_percent: number;
  };
  strategic_insights?: {
    funding_adequacy: string;
    requires_attention: boolean;
    efficiency_rating: string;
  };
}

interface ConcentrationAnalysis {
  concentration_level: string;
  herfindahl_index: number;
  concentration_concern: string;
  largest_component: string;
  largest_share_percent: number;
  top_2_share_percent: number;
  diversification_score: number;
  optimal_diversification: boolean;
}

interface RiskAnalysis {
  risk_weighted_budget_percent: number;
  high_risk_allocation_percent: number;
  risk_distribution_balance: string;
  critical_components_count: number;
}

interface EfficiencyAnalysis {
  average_efficiency_score: number;
  efficiency_variation: number;
  most_efficient_component: string;
  least_efficient_component: string;
  efficiency_balance: string;
  total_optimization_potential_percent: number;
}

interface StrategicInsights {
  key_findings: string[];
  efficiency_insights: string[];
  risk_insights: string[];
  recommendations: string[];
  optimization_opportunities: string[];
}

interface DistributionData {
  distribution_analysis: {
    total_budget_usd_millions: number;
    budget_utilization_percent: number;
    component_allocations: { [key: string]: ComponentAllocation };
    concentration_analysis?: ConcentrationAnalysis;
    risk_analysis?: RiskAnalysis;
    efficiency_analysis?: EfficiencyAnalysis;
    strategic_insights?: StrategicInsights;
    mathematical_context?: {
      analysis_framework: string;
      efficiency_formula: string;
      risk_weighting: string;
      optimization_basis: string;
      concentration_measure: string;
      validation_status: string;
    };
  };
  country: string;
  fiscal_year?: number;
  currency?: string;
}

export default function BudgetDistributionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.sessionId as string;
  
  const [data, setData] = useState<DistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const getToken = () => localStorage.getItem('auth_token') || '';

  const loadData = async () => {
    if (!sessionId || !user) return;

    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const result = await analysisAPI.analyzeCurrentDistribution(sessionId, token);
      setData(result);
    } catch (error) {
      console.error('Failed to load budget distribution data:', error);
      setError('Failed to load budget distribution data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [sessionId, user]);

  const getConcentrationColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      case 'unknown': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading budget distribution analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Analysis Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex space-x-2">
              <Button onClick={loadData}>Try Again</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || !data.distribution_analysis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Budget distribution data is not available for this session.</p>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const components = Object.entries(data.distribution_analysis?.component_allocations || {});
  const sortedComponents = components.sort((a, b) => (b[1].current_allocation_usd_millions || 0) - (a[1].current_allocation_usd_millions || 0));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <AnalysisNavigation 
        sessionId={sessionId}
        currentPage="budget-distribution"
        sessionInfo={{
          country: data?.country,
          fiscal_year: data?.fiscal_year,
          total_budget: data?.distribution_analysis?.total_budget_usd_millions ? data.distribution_analysis.total_budget_usd_millions * 1e6 : undefined,
          currency: data?.currency
        }}
      />

      {/* Action Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-end">
            <Button onClick={refreshData} disabled={refreshing} size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Analysis
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Enhanced Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Budget</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${(data.distribution_analysis?.total_budget_usd_millions || 0).toFixed(1)}M
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Across {components.length} component{components.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Efficiency Score</p>
                    <p className="text-2xl font-bold text-green-600">
                      {(data.distribution_analysis?.efficiency_analysis?.average_efficiency_score || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.distribution_analysis?.efficiency_analysis?.efficiency_balance || 'Unknown'}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Risk Level</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {(data.distribution_analysis?.risk_analysis?.risk_weighted_budget_percent || 0).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.distribution_analysis?.risk_analysis?.risk_distribution_balance || 'Unknown'}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Concentration</p>
                    <Badge className={getConcentrationColor(data.distribution_analysis.concentration_analysis?.concentration_level || 'unknown')}>
                      {data.distribution_analysis.concentration_analysis?.concentration_level || 'Unknown'}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      HHI: {(data.distribution_analysis.concentration_analysis?.herfindahl_index || 0).toFixed(3)}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strategic Insights */}
          {data.distribution_analysis?.strategic_insights && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Key Findings & Efficiency Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Key Findings</h4>
                      <ul className="space-y-1">
                        {data.distribution_analysis.strategic_insights.key_findings?.map((finding, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {data.distribution_analysis.strategic_insights.efficiency_insights?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Efficiency Analysis</h4>
                        <ul className="space-y-1">
                          {data.distribution_analysis.strategic_insights.efficiency_insights.map((insight, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start">
                              <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Risk Analysis & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Risk Insights</h4>
                      <ul className="space-y-1">
                        {data.distribution_analysis.strategic_insights.risk_insights?.map((insight, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {data.distribution_analysis.strategic_insights.recommendations?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                        <ul className="space-y-1">
                          {data.distribution_analysis.strategic_insights.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm text-blue-700 flex items-start">
                              <span className="w-2 h-2 bg-blue-700 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Concentration Analysis */}
          {data.distribution_analysis.concentration_analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Concentration Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {(data.distribution_analysis.concentration_analysis?.largest_share_percent || 0).toFixed(1)}%
                    </div>
                    <div className="text-sm text-blue-700">Largest Component Share</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {data.distribution_analysis.concentration_analysis?.largest_component || 'N/A'}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {(data.distribution_analysis.concentration_analysis?.top_2_share_percent || 0).toFixed(1)}%
                    </div>
                    <div className="text-sm text-yellow-700">Top 2 Components Share</div>
                    <div className="text-xs text-gray-600 mt-1">Combined allocation</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <Badge className={`${getConcentrationColor(data.distribution_analysis.concentration_analysis.concentration_level)} text-lg py-2 px-4`}>
                      {data.distribution_analysis.concentration_analysis.concentration_level} Concentration
                    </Badge>
                    <div className="text-xs text-gray-600 mt-2">Risk Assessment</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Component Allocations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Component Budget Allocations with FSFVI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sortedComponents.map(([componentType, allocation]) => (
                  <div key={componentType} className="border rounded-lg p-6 bg-gray-50">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{allocation.component_name}</h3>
                        <p className="text-sm text-gray-600">{componentType.replace('_', ' ').toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          ${(allocation.current_allocation_usd_millions || 0).toFixed(1)}M
                        </div>
                        <div className="text-sm text-gray-600">
                          {(allocation.percentage_of_total || 0).toFixed(1)}% of total budget
                        </div>
                      </div>
                    </div>

                    {/* Allocation Bar with Risk Color */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Budget Share</span>
                        <span>{(allocation.percentage_of_total || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            allocation.vulnerability_analysis?.risk_category === 'Critical' ? 'bg-red-500' :
                            allocation.vulnerability_analysis?.risk_category === 'High' ? 'bg-orange-500' :
                            allocation.vulnerability_analysis?.risk_category === 'Medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${allocation.percentage_of_total || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Enhanced Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      {/* Performance Metrics */}
                      <div className="bg-white p-3 rounded border">
                        <h4 className="text-xs font-medium text-gray-700 mb-2">PERFORMANCE</h4>
                        {allocation.performance_metrics ? (
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-gray-600">Gap:</span>
                              <span className="ml-1 font-medium text-orange-600">
                                {allocation.performance_metrics.performance_gap_percent.toFixed(1)}%
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">Efficiency:</span>
                              <span className="ml-1 font-medium text-green-600">
                                {(allocation.performance_metrics.performance_efficiency * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">No performance data</div>
                        )}
                      </div>

                      {/* Vulnerability Analysis */}
                      <div className="bg-white p-3 rounded border">
                        <h4 className="text-xs font-medium text-gray-700 mb-2">VULNERABILITY</h4>
                        {allocation.vulnerability_analysis ? (
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-gray-600">Score:</span>
                              <span className="ml-1 font-medium text-red-600">
                                {(allocation.vulnerability_analysis.vulnerability_score * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <Badge className={`text-xs ${
                                allocation.vulnerability_analysis.risk_category === 'Critical' ? 'bg-red-100 text-red-800' :
                                allocation.vulnerability_analysis.risk_category === 'High' ? 'bg-orange-100 text-orange-800' :
                                allocation.vulnerability_analysis.risk_category === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {allocation.vulnerability_analysis.risk_category}
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">No vulnerability data</div>
                        )}
                      </div>

                      {/* Efficiency Analysis */}
                      <div className="bg-white p-3 rounded border">
                        <h4 className="text-xs font-medium text-gray-700 mb-2">EFFICIENCY</h4>
                        {allocation.efficiency_analysis ? (
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-gray-600">Score:</span>
                              <span className="ml-1 font-medium text-blue-600">
                                {allocation.efficiency_analysis.allocation_efficiency_score.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">Cost Eff:</span>
                              <span className="ml-1 font-medium text-purple-600">
                                {allocation.efficiency_analysis.cost_effectiveness_per_100m.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">No efficiency data</div>
                        )}
                      </div>

                      {/* Strategic Assessment */}
                      <div className="bg-white p-3 rounded border">
                        <h4 className="text-xs font-medium text-gray-700 mb-2">STRATEGIC</h4>
                        {allocation.strategic_insights ? (
                          <div className="space-y-1">
                            <div className="text-xs">
                              <Badge className={`${
                                allocation.strategic_insights.funding_adequacy === 'Underfunded' ? 'bg-red-100 text-red-800' :
                                allocation.strategic_insights.funding_adequacy === 'Adequate' ? 'bg-green-100 text-green-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {allocation.strategic_insights.funding_adequacy}
                              </Badge>
                            </div>
                            <div className="text-xs">
                              <Badge className={`${
                                allocation.strategic_insights.efficiency_rating === 'High' ? 'bg-green-100 text-green-800' :
                                allocation.strategic_insights.efficiency_rating === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {allocation.strategic_insights.efficiency_rating} Efficiency
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">No strategic data</div>
                        )}
                      </div>
                    </div>

                    {/* Optimization Potential */}
                    {allocation.efficiency_analysis?.optimization_potential_percent && Math.abs(allocation.efficiency_analysis.optimization_potential_percent) > 5 && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-900">
                            Optimization Potential: 
                            <span className={`ml-1 font-bold ${allocation.efficiency_analysis.optimization_potential_percent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {allocation.efficiency_analysis.optimization_potential_percent > 0 ? '+' : ''}
                              {allocation.efficiency_analysis.optimization_potential_percent.toFixed(1)}%
                            </span>
                          </span>
                          <span className="text-xs text-blue-700">
                            Theoretical optimal: ${allocation.efficiency_analysis.theoretical_optimal_allocation.toFixed(1)}M
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Technical Details */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Sensitivity (α):</span>
                          <span className="ml-2 font-mono text-xs bg-gray-100 px-1 rounded">
                            {(allocation.sensitivity_parameter || 0).toFixed(4)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Priority Rank:</span>
                          <span className="ml-2 font-medium">
                            #{sortedComponents.findIndex(([type]) => type === componentType) + 1}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Requires Attention:</span>
                          <span className={`ml-2 font-medium ${allocation.strategic_insights?.requires_attention ? 'text-red-600' : 'text-green-600'}`}>
                            {allocation.strategic_insights?.requires_attention ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Priority Level:</span>
                          <span className="ml-2 font-medium text-purple-600">
                            {allocation.vulnerability_analysis?.priority_level || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Optimization Opportunities */}
          {data.distribution_analysis?.strategic_insights?.optimization_opportunities && data.distribution_analysis.strategic_insights.optimization_opportunities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Optimization Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.distribution_analysis.strategic_insights.optimization_opportunities.map((opportunity, index) => (
                    <div key={index} className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-blue-900">{opportunity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mathematical Context */}
          {data.distribution_analysis?.mathematical_context && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Mathematical Framework & Context
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Analysis Framework</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Framework:</span>
                        <span className="ml-2 text-gray-600">{data.distribution_analysis.mathematical_context.analysis_framework}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Efficiency Formula:</span>
                        <span className="ml-2 font-mono text-xs bg-gray-100 px-1 rounded">{data.distribution_analysis.mathematical_context.efficiency_formula}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Risk Weighting:</span>
                        <span className="ml-2 text-gray-600">{data.distribution_analysis.mathematical_context.risk_weighting}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Optimization Basis</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Core Formula:</span>
                        <span className="ml-2 font-mono text-xs bg-gray-100 px-1 rounded">{data.distribution_analysis.mathematical_context.optimization_basis}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Concentration Measure:</span>
                        <span className="ml-2 text-gray-600">{data.distribution_analysis.mathematical_context.concentration_measure}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Validation:</span>
                        <Badge className="ml-2 bg-green-100 text-green-800">{data.distribution_analysis.mathematical_context.validation_status}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
} 