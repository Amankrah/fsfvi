'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Play, Video } from 'lucide-react';
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
                <div className="w-12 h-12 relative">
                  <Image
                    src="/logo.png"
                    alt="FSFVI Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    FSFVI Dashboard
                  </h1>
                  <p className="text-sm text-gray-600 font-medium">Food System Financing Vulnerability Analysis</p>
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
              <Button variant="outline" onClick={handleLogout} className="border-gray-300">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Enhanced Welcome Section with Video Demo */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 rounded-2xl px-8 py-10 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
            }}></div>
            <div className="relative">
              {/* Welcome Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-3">
                  Welcome back, {user.first_name || user.username}! 👋
                </h2>
                <p className="text-blue-100 mb-6 text-lg max-w-3xl mx-auto leading-relaxed">
                  Analyze food system vulnerabilities with mathematical precision using our comprehensive 
                  FSFVI framework. Optimize new budget allocations with realistic government planning that 
                  preserves current commitments while maximizing impact.
                </p>
              </div>

              {/* Video Demo Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Left: Video Player */}
                <div className="order-2 lg:order-1">
                  <div className="relative bg-black/30 backdrop-blur-sm rounded-xl overflow-hidden border border-white/20">
                    {/* Video placeholder */}
                    <div className="aspect-video bg-gradient-to-br from-gray-800/80 to-gray-900/80 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm hover:bg-white/30 transition-colors cursor-pointer">
                          <Play className="h-8 w-8 text-white ml-1" />
                        </div>
                        <h4 className="text-lg font-semibold mb-1">Platform Tutorial</h4>
                        <p className="text-blue-200 text-sm">Learn FSFVI in 5 minutes</p>
                      </div>
                    </div>
                    
                    {/* Demo Video */}
                    <video 
                      className="w-full h-full absolute inset-0 rounded-xl object-cover"
                      controls
                      poster="/logo.png"
                      preload="metadata"
                    >
                      <source src="/video/demo_video.mp4" type="video/mp4" />
                      <p className="text-gray-600 p-4">
                        Your browser does not support the video tag. 
                        <a href="/video/demo_video.mp4" className="text-blue-600 hover:underline ml-1">
                          Download the video instead
                        </a>
                      </p>
                    </video>
                  </div>
                </div>

                {/* Right: Features & CTA */}
                <div className="order-1 lg:order-2">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">
                        What you&apos;ll learn:
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-blue-100">Complete analysis workflow</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                            <Video className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-blue-100">Budget optimization setup</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                            <Play className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-blue-100">Results interpretation</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <p className="text-blue-200 mb-4 text-sm">
                        Ready to start your analysis?
                      </p>
                      <Button 
                        onClick={() => setShowNewAnalysis(true)}
                        size="lg"
                        className="bg-white text-blue-600 hover:bg-blue-50 border-0 shadow-lg w-full lg:w-auto"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Start New Analysis
                      </Button>
                    </div>
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


      </main>

      {/* New Analysis Dialog */}
      <NewAnalysisDialog 
        isOpen={showNewAnalysis}
        onClose={() => setShowNewAnalysis(false)}
        onSuccess={handleNewAnalysisSuccess}
      />
    </div>
  );
}; 