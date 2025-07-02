'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, TrendingUp, Code, ExternalLink } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'api-docs'>('overview');

  // Redirect if not authenticated
  useEffect(() => {
    console.log('🏁 Dashboard: Auth state check - isLoading:', isLoading, 'user:', !!user);
    if (!isLoading && !user) {
      console.log('🔄 Dashboard: Redirecting to login - no authenticated user');
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
    console.log('Analysis started with session ID:', sessionId);
  };

  const handleSessionDeleted = (sessionId: string) => {
    // Reload dashboard data after session deletion
    if (user) {
      dataAPI.getDashboard().then(setDashboardData).catch(console.error);
    }
    console.log('Session deleted:', sessionId);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 text-lg">Loading your FSFVI dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    FSFVI Dashboard
                  </h1>
                  <p className="text-sm text-gray-600 font-medium">Food System Financing Vulnerability Analysis</p>
                </div>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="hidden md:flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'overview' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('api-docs')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'api-docs' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                API Documentation
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user.first_name || user.username}
                </p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <Button variant="outline" onClick={handleLogout} className="border-gray-300">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <>
            {/* Enhanced Welcome Section */}
            <div className="mb-8">
              <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 rounded-2xl px-8 py-10 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
                }}></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-3">
                      Welcome back, {user.first_name || user.username}! 👋
                    </h2>
                    <p className="text-blue-100 mb-6 text-lg max-w-2xl leading-relaxed">
                      Analyze food system vulnerabilities with mathematical precision using our comprehensive 
                      FSFVI framework. Build resilient food systems through data-driven insights.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Button 
                        onClick={() => setShowNewAnalysis(true)}
                        size="lg"
                        className="bg-white text-blue-600 hover:bg-blue-50 border-0 shadow-lg"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Start New Analysis
                      </Button>
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="border-white/30 text-blue-600 hover:bg-white/10 backdrop-blur-sm"
                        onClick={() => setActiveTab('api-docs')}
                      >
                        <Code className="w-5 h-5 mr-2" />
                        API Documentation
                      </Button>

                    </div>
                  </div>
                  <div className="hidden xl:block">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <TrendingUp className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-sm text-blue-100 font-medium">FSFVI Analysis</div>
                        <div className="text-xs text-blue-200">Ready for Deployment</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Dashboard Stats */}
            <DashboardStats data={dashboardData} />

            {/* Enhanced Analysis Workflow */}
            <div className="mt-12">
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



            {/* Enhanced Sessions List */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Analysis History</h3>
                  <p className="text-gray-600 mt-1">
                    Manage your FSFVI analysis sessions and track progress over time
                  </p>
                </div>
                <Button 
                  onClick={() => setShowNewAnalysis(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Analysis
                </Button>
              </div>
              
              <SessionsList 
                sessions={dashboardData?.recent_sessions || []} 
                onSessionDeleted={handleSessionDeleted}
              />
            </div>


          </>
        )}

        {activeTab === 'api-docs' && (
          <div className="space-y-8">
            {/* API Documentation Header */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">FSFVI API Documentation</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Integrate FSFVI analysis capabilities into your national food system management platforms
              </p>
            </div>

            {/* Coming Soon Message */}
            <Card className="border-0 shadow-xl">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Code className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">API Documentation Coming Soon</h3>
                <p className="text-gray-600 text-lg mb-6 max-w-2xl mx-auto">
                  We&apos;re preparing comprehensive API documentation and developer resources. 
                  Check back soon for detailed integration guides and endpoint specifications.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button 
                    variant="outline"
                    onClick={() => window.open('http://localhost:8001/docs', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Interactive API Docs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}


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