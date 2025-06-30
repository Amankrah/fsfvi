'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw,
  AlertTriangle,
  Loader2,
  Target,
  TrendingDown,
  Activity
} from 'lucide-react';
import { analysisAPI } from '@/lib/api';
import { PerformanceGapAnalysis } from '@/components/dashboard/PerformanceGapAnalysis';
import { AnalysisNavigation } from '@/components/analysis/AnalysisNavigation';

interface PerformanceGapResults {
  gaps: { [key: string]: {
    component_name: string;
    gap_percent: number;
    actual_gap_percent?: number;
    normalized_gap: number;
    priority_level: string;
    debug_observed?: number;
    debug_benchmark?: number;
    performance_status?: string;
    prefer_higher?: boolean;
  }};
  summary: {
    total_components: number;
    components_with_significant_gaps: number;
    average_gap_percent: number;
    worst_performer: string;
    largest_gap_percent: number;
    worst_actual_gap_percent?: number;
    largest_actual_gap_percent?: number;
    ranking_note?: string;
  };
  priority_actions: string[];
  mathematical_context: {
    formula_used: string;
    formula_description: string;
    variables: { [key: string]: string };
    calculation_method: string;
    validation_status: string;
  };
}

interface PerformanceGapData extends PerformanceGapResults {
  session_id: string;
  country: string;
  analysis_type: string;
  timestamp: string;
  fiscal_year?: number;
  currency?: string;
}

export default function PerformanceGapsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.sessionId as string;
  
  const [data, setData] = useState<PerformanceGapData | null>(null);
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
      const result = await analysisAPI.calculatePerformanceGaps(sessionId, token);
      setData(result);
    } catch (error) {
      console.error('Failed to load performance gaps data:', error);
      setError('Failed to load performance gaps data. Please try again.');
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
    const fetchData = async () => {
      if (!sessionId || !user) return;

      setLoading(true);
      setError(null);

      try {
        const token = getToken();
        const result = await analysisAPI.calculatePerformanceGaps(sessionId, token);
        setData(result);
      } catch (error) {
        console.error('Failed to load performance gaps data:', error);
        setError('Failed to load performance gaps data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <AnalysisNavigation 
          sessionId={sessionId}
          currentPage="performance-gaps"
          sessionInfo={{
            country: 'Loading...',
            fiscal_year: new Date().getFullYear()
          }}
        />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="bg-blue-100 p-4 rounded-full w-fit mx-auto mb-6">
                <Activity className="h-12 w-12 text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Analyzing Performance Gaps
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Calculating component-level performance gaps against international benchmarks...
              </p>
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-blue-600 font-medium">Processing analysis</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <AnalysisNavigation 
          sessionId={sessionId}
          currentPage="performance-gaps"
          sessionInfo={{
            country: 'Error',
            fiscal_year: new Date().getFullYear()
          }}
        />
        
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="bg-red-100 p-4 rounded-full w-fit mx-auto mb-4">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-600">
                Analysis Error
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={loadData} className="bg-red-600 hover:bg-red-700">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <AnalysisNavigation 
        sessionId={sessionId}
        currentPage="performance-gaps"
        sessionInfo={{
          country: data?.country,
          fiscal_year: data?.fiscal_year,
          currency: data?.currency
        }}
      />

      {/* Header Section */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-xl text-white shadow-lg">
                <TrendingDown className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Performance Gap Analysis</h1>
                <p className="text-gray-600 mt-1">
                  Component-level performance gaps for {data?.country || 'your country'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge className="bg-blue-100 text-blue-800">
                <Target className="w-4 h-4 mr-2" />
                Analysis Complete
              </Badge>
              <Button 
                onClick={refreshData} 
                disabled={refreshing} 
                variant="outline"
                className="shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Analysis
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <PerformanceGapAnalysis 
          results={data || null}
          isLoading={loading}
          countryName={data?.country}
          onRecalculate={refreshData}
        />
      </main>
    </div>
  );
} 