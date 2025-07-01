'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Loader2
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

  const loadData = useCallback(async () => {
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
  }, [sessionId, user]);

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Budget</p>
                    <p className="text-3xl font-bold text-blue-800 mt-2">
                      ${(data.distribution_analysis?.total_budget_usd_millions || 0).toFixed(1)}M
                    </p>
                    <p className="text-sm text-blue-600 mt-2 font-medium">
                      {components.length} Component{components.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="bg-blue-200 p-3 rounded-full">
                    <DollarSign className="w-8 h-8 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Efficiency Score</p>
                    <p className="text-3xl font-bold text-green-800 mt-2">
                      {(data.distribution_analysis?.efficiency_analysis?.average_efficiency_score || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-green-600 mt-2 font-medium">
                      {data.distribution_analysis?.efficiency_analysis?.efficiency_balance || 'Unknown'}
                    </p>
                  </div>
                  <div className="bg-green-200 p-3 rounded-full">
                    <TrendingUp className="w-8 h-8 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Risk Level</p>
                    <p className="text-3xl font-bold text-orange-800 mt-2">
                      {(data.distribution_analysis?.risk_analysis?.risk_weighted_budget_percent || 0).toFixed(1)}%
                    </p>
                    <p className="text-sm text-orange-600 mt-2 font-medium">
                      {data.distribution_analysis?.risk_analysis?.risk_distribution_balance || 'Unknown'}
                    </p>
                  </div>
                  <div className="bg-orange-200 p-3 rounded-full">
                    <AlertTriangle className="w-8 h-8 text-orange-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Concentration</p>
                    <div className="mt-2">
                      <Badge className={`${getConcentrationColor(data.distribution_analysis.concentration_analysis?.concentration_level || 'unknown')} text-base px-3 py-1`}>
                        {data.distribution_analysis.concentration_analysis?.concentration_level || 'Unknown'}
                      </Badge>
                    </div>
                    <p className="text-sm text-purple-600 mt-2 font-medium">
                      HHI: {(data.distribution_analysis.concentration_analysis?.herfindahl_index || 0).toFixed(3)}
                    </p>
                  </div>
                  <div className="bg-purple-200 p-3 rounded-full">
                    <BarChart3 className="w-8 h-8 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strategic Insights */}
          {data.distribution_analysis?.strategic_insights && (
            <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl text-gray-800">
                  <TrendingUp className="w-6 h-6 mr-3 text-blue-600" />
                  Key Findings & Efficiency Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 text-lg">Key Findings</h4>
                    <div className="space-y-2">
                      {data.distribution_analysis.strategic_insights.key_findings?.map((finding, index) => (
                        <div key={index} className="flex items-start p-3 bg-white rounded-lg border border-blue-100 shadow-sm">
                          <span className="w-3 h-3 bg-blue-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                          <p className="text-sm text-gray-700 leading-relaxed">{finding}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {data.distribution_analysis.strategic_insights.efficiency_insights?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 text-lg">Efficiency Analysis</h4>
                      <div className="space-y-2">
                        {data.distribution_analysis.strategic_insights.efficiency_insights.map((insight, index) => (
                          <div key={index} className="flex items-start p-3 bg-white rounded-lg border border-green-100 shadow-sm">
                            <span className="w-3 h-3 bg-green-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                            <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Concentration Analysis */}
          {data.distribution_analysis.concentration_analysis && (
            <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl text-gray-800">
                  <BarChart3 className="w-6 h-6 mr-3 text-purple-600" />
                  Portfolio Concentration Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-white rounded-xl shadow-md border border-blue-100 hover:shadow-lg transition-shadow duration-200">
                    <div className="text-3xl font-bold text-blue-700 mb-2">
                      {(data.distribution_analysis.concentration_analysis?.largest_share_percent || 0).toFixed(1)}%
                    </div>
                    <div className="text-sm font-semibold text-blue-800 uppercase tracking-wide mb-1">
                      Largest Component
                    </div>
                    <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
                      {data.distribution_analysis.concentration_analysis?.largest_component || 'N/A'}
                    </div>
                  </div>
                  <div className="text-center p-6 bg-white rounded-xl shadow-md border border-yellow-100 hover:shadow-lg transition-shadow duration-200">
                    <div className="text-3xl font-bold text-yellow-700 mb-2">
                      {(data.distribution_analysis.concentration_analysis?.top_2_share_percent || 0).toFixed(1)}%
                    </div>
                    <div className="text-sm font-semibold text-yellow-800 uppercase tracking-wide mb-1">
                      Top 2 Components
                    </div>
                    <div className="text-sm text-gray-600 bg-yellow-50 px-3 py-1 rounded-full">
                      Combined Share
                    </div>
                  </div>
                  <div className="text-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200">
                    <div className="mb-3">
                      <Badge className={`${getConcentrationColor(data.distribution_analysis.concentration_analysis.concentration_level)} text-lg py-2 px-4 font-semibold`}>
                        {data.distribution_analysis.concentration_analysis.concentration_level}
                      </Badge>
                    </div>
                    <div className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-1">
                      Risk Level
                    </div>
                    <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                      Portfolio Balance
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Component Allocations */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 rounded-t-lg">
              <CardTitle className="flex items-center text-xl text-gray-800">
                <BarChart3 className="w-6 h-6 mr-3 text-slate-600" />
                Component Budget Allocations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {sortedComponents.map(([componentType, allocation], index) => (
                  <div key={componentType} className={`border-b border-gray-100 p-6 hover:bg-gray-50 transition-colors duration-200 ${index === 0 ? 'bg-blue-50/30' : ''}`}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-blue-600' : 
                          index === 1 ? 'bg-green-600' : 
                          index === 2 ? 'bg-purple-600' : 
                          'bg-gray-600'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{allocation.component_name}</h3>
                          <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">
                            {componentType.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900">
                          ${(allocation.current_allocation_usd_millions || 0).toFixed(1)}M
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
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



                    {/* Technical Details */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm">
                        <div>
                          <span className="text-gray-600">Requires Attention:</span>
                          <span className={`ml-2 font-medium ${allocation.strategic_insights?.requires_attention ? 'text-red-600' : 'text-green-600'}`}>
                            {allocation.strategic_insights?.requires_attention ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>


        </div>
      </main>
    </div>
  );
} 