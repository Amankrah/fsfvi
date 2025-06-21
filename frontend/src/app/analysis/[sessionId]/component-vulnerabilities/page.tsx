'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  AlertTriangle,
  Shield,
  Activity,
  AlertOctagon,
  Info,
  Download,
  Share2
} from 'lucide-react';
import { ComponentVulnerabilityDetails } from '@/components/dashboard/ComponentVulnerabilityDetails';

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

  const handleDataLoad = (dataAvailable: boolean, dataInsights?: typeof insights) => {
    setHasData(dataAvailable);
    if (dataInsights) {
      setInsights(dataInsights);
    }
  };

  const downloadReport = () => {
    // This would need to be implemented if the component exposes the data
    // For now, just show a message
    alert('Export functionality will be available once data is loaded');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Please log in to access the analysis.</p>
            <Button onClick={() => router.push('/auth/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Invalid Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">No valid session ID found.</p>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-6 h-6 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">
                    Component Vulnerabilities Analysis
                  </h1>
                  {insights && (
                    <Badge className={
                      insights.riskLevel === 'critical' ? 'bg-red-100 text-red-800' :
                      insights.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                      insights.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {insights.riskLevel.toUpperCase()} RISK SYSTEM
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-4 mt-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Session:</span> {sessionId}
                  </p>
                  {insights && (
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Activity className="w-3 h-3 mr-1" />
                        {insights.totalComponents} components
                      </span>
                      {insights.criticalCount > 0 && (
                        <span className="flex items-center text-red-600">
                          <AlertOctagon className="w-3 h-3 mr-1" />
                          {insights.criticalCount} critical
                        </span>
                      )}
                      <span>
                        {insights.avgVulnerability.toFixed(1)}% avg vulnerability
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {hasData && (
                <>
                  <Button variant="outline" size="sm" onClick={downloadReport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Analysis link copied to clipboard!');
                  }}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* System Status Alert */}
      {insights && insights.criticalCount > 0 && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center">
              <AlertOctagon className="w-5 h-5 text-red-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm text-red-800">
                  <strong>Critical System Alert:</strong> {insights.criticalCount} component{insights.criticalCount > 1 ? 's' : ''} 
                  {insights.criticalCount === 1 ? ' shows' : ' show'} critical vulnerability requiring immediate intervention.
                </p>
              </div>
              <Info className="w-4 h-4 text-red-600" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <ComponentVulnerabilityDetails 
          sessionId={sessionId}
          onDataLoad={handleDataLoad}
        />
      </main>

      {/* Footer Information */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>FSFVI Component Vulnerability Analysis</span>
              <span>•</span>
              <span>Mathematical Framework: υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                mathematically_compliant
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 