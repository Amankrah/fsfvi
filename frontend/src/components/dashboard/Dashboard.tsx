'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, TrendingUp, AlertCircle, BarChart3, RefreshCw } from 'lucide-react';
import { DashboardStats } from './DashboardStats';
import { SessionsList } from './SessionsList';
import { NewAnalysisDialog } from './NewAnalysisDialog';
import { AnalysisWorkflow } from './AnalysisWorkflow';
import { dataAPI } from '@/lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface Session {
  id: string;
  country_name: string;
  fiscal_year: number;
  status: string;
  created_at: string;
  total_budget: number;
}

interface Component {
  component_type: string;
  component_name: string;
  allocation: number;
  percentage: number;
  vulnerability?: number | null;
  priority_level: string;
}

interface ComponentDistribution {
  session_id: string | null;
  country_name: string | null;
  total_budget: number;
  components: Component[];
}

interface DashboardData {
  user: User;
  statistics: {
    total_sessions: number;
    active_sessions: number;
    completed_sessions: number;
    average_fsfvi: number;
    total_analyses: number;
    total_countries: number;
    total_budget_analyzed: number;
    risk_distribution: Array<{ risk_level: string; count: number }>;
  };
  recent_sessions: Session[];
  component_distribution: ComponentDistribution;
}

export const Dashboard: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewAnalysis, setShowNewAnalysis] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      
      try {
        const data = await dataAPI.getDashboard();
        setDashboardData(data);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNewAnalysisSuccess = (sessionId: string) => {
    setShowNewAnalysis(false);
    // Reload dashboard data
    if (user) {
      dataAPI.getDashboard().then(setDashboardData).catch(console.error);
    }
    // Navigate to analysis page (to be implemented later)
    // router.push(`/analysis/${sessionId}`);
    console.log('Analysis started with session ID:', sessionId);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">FSFVI Dashboard</h1>
                  <p className="text-sm text-gray-600">Food System Financing Vulnerability Index</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user.first_name || user.username}
                </p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-6 py-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Welcome back, {user.first_name || user.username}!
                </h2>
                <p className="text-blue-100 mb-4">
                  Analyze food system vulnerabilities with mathematical precision using δᵢ = |xᵢ - x̄ᵢ| / xᵢ performance gap analysis.
                </p>
                <div className="flex space-x-4">
                  <Button 
                    onClick={() => setShowNewAnalysis(true)}
                    className="bg-white text-blue-600 hover:bg-gray-100"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Analysis
                  </Button>
                  <Button variant="outline" className="border-white text-blue-600 hover:bg-white hover:text-blue-600">
                    <FileText className="w-4 h-4 mr-2" />
                    Performance Gaps Guide
                  </Button>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="bg-blue-500 bg-opacity-30 rounded-lg p-4">
                  <TrendingUp className="h-16 w-16 text-blue-200 mb-2" />
                  <div className="text-xs text-blue-200 text-center">Performance Gap<br/>Analysis Ready</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <DashboardStats data={dashboardData} />

        {/* Analysis Workflow */}
        <div className="mt-8">
          <AnalysisWorkflow 
            sessionId={dashboardData?.component_distribution?.session_id || null}
            countryName={dashboardData?.component_distribution?.country_name || null}
            onAnalysisComplete={() => {
              // Reload dashboard data after analysis
              if (user) {
                dataAPI.getDashboard().then(setDashboardData).catch(console.error);
              }
            }}
          />
        </div>

        {/* Quick Actions for Latest Session */}
        {dashboardData?.component_distribution?.session_id && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Latest Analysis: {dashboardData.component_distribution.country_name}
                </CardTitle>
                <CardDescription>
                  Quick access to your most recent FSFVI analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <Button 
                    onClick={() => router.push(`/analysis/${dashboardData.component_distribution.session_id}`)}
                    className="flex items-center"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Detailed Analysis
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Re-run analysis for this session
                      if (dashboardData?.component_distribution?.session_id) {
                        // This could trigger a re-run of the analysis workflow
                        console.log('Re-running analysis for session:', dashboardData.component_distribution.session_id);
                      }
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-run Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sessions List */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Analyses</h3>
              <p className="text-sm text-gray-600">
                Manage your FSFVI analysis sessions and view results
              </p>
            </div>
            <Button onClick={() => setShowNewAnalysis(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
          </div>
          
          <SessionsList sessions={dashboardData?.recent_sessions || []} />
        </div>

        {/* System Status */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              System Status
            </CardTitle>
            <CardDescription>
              Monitor the health of FSFVI analysis services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-800">Django Backend</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">Connected</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-800">FastAPI Service</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm text-blue-600">Available</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-yellow-800">Analysis Engine</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-sm text-yellow-600">Ready</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* New Analysis Dialog */}
      <NewAnalysisDialog 
        open={showNewAnalysis}
        onOpenChange={setShowNewAnalysis}
        onSuccess={handleNewAnalysisSuccess}
      />
    </div>
  );
}; 