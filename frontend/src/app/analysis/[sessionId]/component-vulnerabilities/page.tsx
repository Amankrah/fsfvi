'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle,
  Activity,
  AlertOctagon,
  Download,
  Share2,
  Shield,
  Users
} from 'lucide-react';
import { ComponentVulnerabilityDetails } from '@/components/dashboard/ComponentVulnerabilityDetails';
import { AnalysisNavigation } from '@/components/analysis/AnalysisNavigation';

export default function ComponentVulnerabilitiesPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.sessionId as string;
  
  const [insights, setInsights] = useState<{
    totalComponents: number;
    criticalCount: number;
    highRiskCount: number;
    avgVulnerability: number;
    riskLevel: string;
  } | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null);

  const handleDataLoad = useCallback((dataAvailable: boolean, dataInsights?: typeof insights) => {
    setHasData(dataAvailable);
    if (dataInsights) {
      setInsights(dataInsights);
    }
  }, []);

  const downloadReport = () => {
    alert('Export functionality will be available once data is loaded');
  };

  const shareAnalysis = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Analysis link copied to clipboard!');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="bg-red-100 p-4 rounded-full w-fit mx-auto mb-4">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-600">
                Authentication Required
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">Please log in to access the vulnerability analysis.</p>
              <Button onClick={() => router.push('/auth/login')} className="bg-red-600 hover:bg-red-700">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="bg-red-100 p-4 rounded-full w-fit mx-auto mb-4">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-600">
                Invalid Session
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">No valid session ID found.</p>
              <Button onClick={() => router.push('/dashboard')} variant="outline">
                Back to Dashboard
              </Button>
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
        currentPage="component-vulnerabilities"
      />

      {/* Header Section */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-xl text-white shadow-lg">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Component Vulnerabilities</h1>
                <p className="text-gray-600 mt-1">
                  Risk assessment and vulnerability analysis for food system components
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {insights && (
                <Badge className={`px-4 py-2 text-sm font-medium ${
                  insights.riskLevel === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                  insights.riskLevel === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                  insights.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  'bg-green-100 text-green-800 border-green-200'
                }`}>
                  <Shield className="w-4 h-4 mr-2" />
                  {insights.riskLevel.toUpperCase()} RISK SYSTEM
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      {insights && (
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 text-sm">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-900">{insights.totalComponents}</span>
                  <span className="text-gray-600">components</span>
                </div>
                
                {insights.criticalCount > 0 && (
                  <div className="flex items-center space-x-2 text-sm">
                    <AlertOctagon className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-red-900">{insights.criticalCount}</span>
                    <span className="text-red-700">critical</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2 text-sm">
                  <Activity className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-gray-900">{insights.avgVulnerability.toFixed(1)}%</span>
                  <span className="text-gray-600">avg vulnerability</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {hasData && (
                  <>
                    <Button variant="outline" size="sm" onClick={downloadReport}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={shareAnalysis}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Alert */}
      {insights && insights.criticalCount > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-start space-x-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertOctagon className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-900 text-lg mb-1">Critical System Alert</h3>
                <p className="text-red-800">
                  {insights.criticalCount} component{insights.criticalCount > 1 ? 's' : ''} 
                  {insights.criticalCount === 1 ? ' shows' : ' show'} critical vulnerability requiring immediate intervention.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <ComponentVulnerabilityDetails 
          sessionId={sessionId}
          onDataLoad={handleDataLoad}
        />
      </main>
    </div>
  );
} 