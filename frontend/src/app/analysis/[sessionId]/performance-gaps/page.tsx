'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  RefreshCw,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { analysisAPI } from '@/lib/api';
import { PerformanceGapAnalysis } from '@/components/dashboard/PerformanceGapAnalysis';

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
    loadData();
  }, [sessionId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading performance gaps analysis...</p>
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
                  Performance Gaps Analysis
                </h1>
                <p className="text-sm text-gray-600">
                  {data ? (
                    <>
                      {data.country} • FY {data.fiscal_year || 2024} • Session: {sessionId}
                    </>
                  ) : (
                    `Session: ${sessionId}`
                  )}
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