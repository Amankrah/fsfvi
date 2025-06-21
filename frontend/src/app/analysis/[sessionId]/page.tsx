'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  TrendingDown, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Target,
  RefreshCw
} from 'lucide-react';
import { analysisAPI } from '@/lib/api';
import { PerformanceGapAnalysis } from '@/components/dashboard/PerformanceGapAnalysis';
import { ComponentVulnerabilityDetails } from '@/components/dashboard/ComponentVulnerabilityDetails';
import { SystemVulnerabilityOverview } from '@/components/dashboard/SystemVulnerabilityOverview';

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

interface AnalysisData {
  performanceGaps?: {
    performance_gaps: PerformanceGapResults;
    country: string;
  };
  componentVulnerabilities?: Record<string, unknown>;
  systemVulnerability?: Record<string, unknown>;
  distributionAnalysis?: {
    distribution_analysis: {
      total_budget_usd_millions: number;
      component_allocations: { [key: string]: {
        component_name: string;
        current_allocation_usd_millions: number;
        percentage_of_total: number;
        sensitivity_parameter: number;
      }};
      concentration_analysis: {
        concentration_level: string;
        largest_component: string;
        largest_share_percent: number;
      };
    };
    country: string;
  };
  sessionInfo?: {
    country: string;
    fiscal_year: number;
    total_budget: number;
    currency: string;
  };
}

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.sessionId as string;
  
  const [analysisData, setAnalysisData] = useState<AnalysisData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gaps' | 'vulnerabilities' | 'system'>('gaps');
  const [refreshing, setRefreshing] = useState(false);

  const getToken = () => localStorage.getItem('auth_token') || '';

  const loadAnalysisData = async () => {
    if (!sessionId || !user) return;

    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const promises = [];

      // Load distribution analysis
      promises.push(
        analysisAPI.analyzeCurrentDistribution(sessionId, token)
          .then(data => ({ type: 'distributionAnalysis', data }))
          .catch(error => ({ type: 'distributionAnalysis', error: error.message }))
      );

      // Load performance gaps
      promises.push(
        analysisAPI.calculatePerformanceGaps(sessionId, token)
          .then(data => ({ type: 'performanceGaps', data }))
          .catch(error => ({ type: 'performanceGaps', error: error.message }))
      );

      // Load component vulnerabilities
      promises.push(
        analysisAPI.calculateComponentVulnerabilities(sessionId, token)
          .then(data => ({ type: 'componentVulnerabilities', data }))
          .catch(error => ({ type: 'componentVulnerabilities', error: error.message }))
      );

      // Load system vulnerability
      promises.push(
        analysisAPI.calculateSystemVulnerability(sessionId, token)
          .then(data => ({ type: 'systemVulnerability', data }))
          .catch(error => ({ type: 'systemVulnerability', error: error.message }))
      );

      const results = await Promise.all(promises);
      const newData: AnalysisData = {};

      results.forEach(result => {
        if ('data' in result) {
          newData[result.type as keyof AnalysisData] = result.data;
          
          // Extract session info from the first successful response
          if (!newData.sessionInfo && result.data.country) {
            newData.sessionInfo = {
              country: result.data.country,
              fiscal_year: result.data.fiscal_year || 2024,
              total_budget: result.data.total_budget || 0,
              currency: result.data.currency || 'USD'
            };
          }
        } else {
          console.error(`Failed to load ${result.type}:`, result.error);
        }
      });

      setAnalysisData(newData);
    } catch (error) {
      console.error('Failed to load analysis data:', error);
      setError('Failed to load analysis data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalysis = async () => {
    setRefreshing(true);
    await loadAnalysisData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadAnalysisData();
  }, [sessionId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analysis data...</p>
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
              <Button onClick={loadAnalysisData}>Try Again</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getTabStatus = (tab: 'gaps' | 'vulnerabilities' | 'system') => {
    const dataKey = tab === 'gaps' ? 'performanceGaps' : 
                   tab === 'vulnerabilities' ? 'componentVulnerabilities' : 'systemVulnerability';
    return analysisData[dataKey] ? 'completed' : 'pending';
  };

  const getTabIcon = (tab: 'gaps' | 'vulnerabilities' | 'system', status: string) => {
    const iconClass = status === 'completed' ? 'text-green-600' : 'text-gray-400';
    
    switch (tab) {
      case 'gaps':
        return <TrendingDown className={`w-4 h-4 ${iconClass}`} />;
      case 'vulnerabilities':
        return <Shield className={`w-4 h-4 ${iconClass}`} />;
      case 'system':
        return <Target className={`w-4 h-4 ${iconClass}`} />;
    }
  };

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
                  FSFVI Analysis Details
                </h1>
                <p className="text-sm text-gray-600">
                  {analysisData.distributionAnalysis ? (
                    <>
                      {analysisData.distributionAnalysis.country} • FY {analysisData.sessionInfo?.fiscal_year || 2024} • 
                      ${analysisData.distributionAnalysis.distribution_analysis.total_budget_usd_millions.toFixed(1)}M USD
                    </>
                  ) : analysisData.sessionInfo ? (
                    <>
                      {analysisData.sessionInfo.country} • FY {analysisData.sessionInfo.fiscal_year} • 
                      ${(analysisData.sessionInfo.total_budget / 1e6).toFixed(1)}M {analysisData.sessionInfo.currency}
                    </>
                  ) : (
                    `Session: ${sessionId}`
                  )}
                </p>
              </div>
            </div>
            
            <Button onClick={refreshAnalysis} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Analysis
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('gaps')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'gaps'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {getTabIcon('gaps', getTabStatus('gaps'))}
              <span>Performance Gaps</span>
              {getTabStatus('gaps') === 'completed' && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('vulnerabilities')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'vulnerabilities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {getTabIcon('vulnerabilities', getTabStatus('vulnerabilities'))}
              <span>Component Vulnerabilities</span>
              {getTabStatus('vulnerabilities') === 'completed' && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('system')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'system'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {getTabIcon('system', getTabStatus('system'))}
              <span>System FSFVI</span>
              {getTabStatus('system') === 'completed' && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </button>
          </nav>
        </div>
      </div>



      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'gaps' && (
          <PerformanceGapAnalysis 
            results={analysisData.performanceGaps?.performance_gaps || null}
            countryName={analysisData.performanceGaps?.country || analysisData.sessionInfo?.country}
            onRecalculate={refreshAnalysis}
          />
        )}
        
        {activeTab === 'vulnerabilities' && (
          <ComponentVulnerabilityDetails 
            data={analysisData.componentVulnerabilities || null}
            distributionData={analysisData.distributionAnalysis}
            onRefresh={refreshAnalysis}
          />
        )}
        
        {activeTab === 'system' && (
          <SystemVulnerabilityOverview 
            data={analysisData.systemVulnerability || null}
            onRefresh={refreshAnalysis}
          />
        )}
      </main>
    </div>
  );
} 