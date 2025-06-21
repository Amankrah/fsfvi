'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  BarChart3, 
  RefreshCw,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { analysisAPI } from '@/lib/api';

interface ComponentAllocation {
  component_name: string;
  current_allocation_usd_millions: number;
  percentage_of_total: number;
  sensitivity_parameter: number;
}

interface ConcentrationAnalysis {
  concentration_level: string;
  largest_component: string;
  largest_share_percent: number;
  top_2_share_percent: number;
}

interface DistributionData {
  distribution_analysis: {
    total_budget_usd_millions: number;
    budget_utilization_percent: number;
    component_allocations: { [key: string]: ComponentAllocation };
    concentration_analysis?: ConcentrationAnalysis;
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Budget Distribution Analysis
                </h1>
                <p className="text-sm text-gray-600">
                  {data.country} • FY {data.fiscal_year || 2024} • 
                  ${(data.distribution_analysis?.total_budget_usd_millions || 0).toFixed(1)}M {data.currency || 'USD'}
                </p>
              </div>
            </div>
            
            <Button onClick={refreshData} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Analysis
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Budget</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${(data.distribution_analysis?.total_budget_usd_millions || 0).toFixed(1)}M
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
                    <p className="text-sm font-medium text-gray-600">Budget Utilization</p>
                    <p className="text-2xl font-bold text-green-600">
                      {(data.distribution_analysis?.budget_utilization_percent || 0).toFixed(1)}%
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
                    <p className="text-sm font-medium text-gray-600">Components</p>
                    <p className="text-2xl font-bold text-purple-600">{components.length}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-500" />
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
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

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

          {/* Component Allocations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Component Budget Allocations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedComponents.map(([componentType, allocation]) => (
                  <div key={componentType} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{allocation.component_name}</h3>
                        <p className="text-sm text-gray-600">{componentType}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                          ${(allocation.current_allocation_usd_millions || 0).toFixed(1)}M
                        </div>
                        <div className="text-sm text-gray-600">
                          {(allocation.percentage_of_total || 0).toFixed(1)}% of total
                        </div>
                      </div>
                    </div>

                    {/* Allocation Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Budget Share</span>
                        <span>{(allocation.percentage_of_total || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${allocation.percentage_of_total || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Additional Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Sensitivity Parameter:</span>
                        <span className="ml-2 font-medium font-mono">
                          {(allocation.sensitivity_parameter || 0).toFixed(3)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Priority Ranking:</span>
                        <span className="ml-2 font-medium">
                          #{sortedComponents.findIndex(([type]) => type === componentType) + 1}
                        </span>
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