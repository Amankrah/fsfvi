'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, TrendingUp, RefreshCw, Code, ExternalLink, BookOpen, Settings, Zap, Shield, Globe } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'api-docs' | 'integration'>('overview');

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
              <button
                onClick={() => setActiveTab('integration')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'integration' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Integration Guide
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
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="border-white/30 text-blue-600 hover:bg-white/10 backdrop-blur-sm"
                        onClick={() => setActiveTab('integration')}
                      >
                        <BookOpen className="w-5 h-5 mr-2" />
                        Integration Guide
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

            {/* Quick Actions for Latest Session */}
            {dashboardData?.component_distribution?.session_id && (
              <div className="mt-12">
                <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-teal-50">
                  <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center text-xl">
                      <Zap className="w-6 h-6 mr-3" />
                      Latest Analysis: {dashboardData.component_distribution.country_name}
                    </CardTitle>
                    <CardDescription className="text-emerald-100">
                      Quick access to your most recent FSFVI analysis with enhanced insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap gap-4">
                      <Button 
                        onClick={() => router.push(`/analysis/${dashboardData.component_distribution.session_id}/components-overview`)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        View Framework
                      </Button>
                      <Button 
                        onClick={() => router.push(`/analysis/${dashboardData.component_distribution.session_id}/performance-gaps`)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Performance Analysis
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          if (dashboardData?.component_distribution?.session_id) {
                            console.log('Re-running analysis for session:', dashboardData.component_distribution.session_id);
                          }
                        }}
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Re-run Analysis
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

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

            {/* Enhanced System Status */}
            <Card className="mt-12 border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
                <CardTitle className="flex items-center text-xl">
                  <Shield className="w-6 h-6 mr-3 text-green-600" />
                  System Health Status
                </CardTitle>
                <CardDescription>
                  Real-time monitoring of FSFVI analysis services and infrastructure
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <div>
                      <span className="text-sm font-semibold text-green-800">Django Backend</span>
                      <p className="text-xs text-green-600 mt-1">Data Management</p>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700">Connected</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                    <div>
                      <span className="text-sm font-semibold text-blue-800">FastAPI Service</span>
                      <p className="text-xs text-blue-600 mt-1">Analysis Engine</p>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                      <span className="text-sm font-medium text-blue-700">Available</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100">
                    <div>
                      <span className="text-sm font-semibold text-purple-800">Analysis Engine</span>
                      <p className="text-xs text-purple-600 mt-1">FSFVI Calculations</p>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-3 animate-pulse"></div>
                      <span className="text-sm font-medium text-purple-700">Ready</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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

            {/* API Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardTitle className="flex items-center text-blue-800">
                    <Code className="w-5 h-5 mr-2" />
                    RESTful API
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-600 mb-4">Complete REST API for FSFVI analysis integration</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Authentication & Authorization</li>
                    <li>• Data Upload & Processing</li>
                    <li>• Real-time Analysis</li>
                    <li>• Results & Reporting</li>
                  </ul>
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => window.open('http://localhost:8001/docs', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Interactive Docs
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="bg-gradient-to-br from-green-50 to-green-100">
                  <CardTitle className="flex items-center text-green-800">
                    <Settings className="w-5 h-5 mr-2" />
                    Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-600 mb-4">Flexible configuration options for different scenarios</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Weighting Methods</li>
                    <li>• Sensitivity Parameters</li>
                    <li>• Analysis Scenarios</li>
                    <li>• Custom Constraints</li>
                  </ul>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => window.open('http://localhost:8001/validate_system', '_blank')}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    System Validation
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="bg-gradient-to-br from-purple-50 to-purple-100">
                  <CardTitle className="flex items-center text-purple-800">
                    <Globe className="w-5 h-5 mr-2" />
                    Multi-Country
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-600 mb-4">Designed for multi-country implementations</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Country-specific Parameters</li>
                    <li>• Multi-currency Support</li>
                    <li>• Comparative Analysis</li>
                    <li>• Regional Benchmarks</li>
                  </ul>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => window.open('http://localhost:8001/explain_sensitivity_parameters', '_blank')}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* API Endpoints */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Core API Endpoints</CardTitle>
                <CardDescription>
                  Essential endpoints for integrating FSFVI analysis into your systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">Authentication</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-sm font-mono text-blue-600">POST /auth/login/</code>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Django</span>
                        </div>
                        <p className="text-sm text-gray-600">Authenticate and obtain access token</p>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900">Data Management</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-sm font-mono text-green-600">POST /upload_data</code>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">FastAPI</span>
                        </div>
                        <p className="text-sm text-gray-600">Upload CSV data for analysis</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">Analysis</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-sm font-mono text-purple-600">POST /analyze_system</code>
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">FastAPI</span>
                        </div>
                        <p className="text-sm text-gray-600">Complete system vulnerability analysis</p>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-sm font-mono text-orange-600">POST /optimize_allocation</code>
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">FastAPI</span>
                        </div>
                        <p className="text-sm text-gray-600">Optimize resource allocation</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Developer Resources */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-blue-50">
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  Developer Resources
                  <div className="ml-3 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-xs text-green-700 font-medium">Live</span>
                  </div>
                </CardTitle>
                <CardDescription>
                  Comprehensive guides and specifications for developers - all endpoints are currently available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200"
                    onClick={() => window.open('http://localhost:8001/api/developer/integration-guide', '_blank')}
                  >
                    <BookOpen className="w-6 h-6 text-indigo-600" />
                    <div className="text-center">
                      <div className="font-semibold text-sm">Integration Guide</div>
                      <div className="text-xs text-gray-600">Step-by-step setup</div>
                      <div className="text-xs text-indigo-600 mt-1 flex items-center">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        FastAPI Endpoint
                      </div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-green-50 hover:border-green-300 transition-all duration-200"
                    onClick={() => window.open('http://localhost:8001/api/developer/data-format', '_blank')}
                  >
                    <Code className="w-6 h-6 text-green-600" />
                    <div className="text-center">
                      <div className="font-semibold text-sm">Data Format</div>
                      <div className="text-xs text-gray-600">CSV specifications</div>
                      <div className="text-xs text-green-600 mt-1 flex items-center">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        FastAPI Endpoint
                      </div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200"
                    onClick={() => window.open('http://localhost:8001/api/developer/response-format', '_blank')}
                  >
                    <Settings className="w-6 h-6 text-purple-600" />
                    <div className="text-center">
                      <div className="font-semibold text-sm">Response Format</div>
                      <div className="text-xs text-gray-600">API responses</div>
                      <div className="text-xs text-purple-600 mt-1 flex items-center">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        FastAPI Endpoint
                      </div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200"
                    onClick={() => window.open('http://localhost:8001/docs', '_blank')}
                  >
                    <ExternalLink className="w-6 h-6 text-orange-600" />
                    <div className="text-center">
                      <div className="font-semibold text-sm">OpenAPI Docs</div>
                      <div className="text-xs text-gray-600">Interactive API</div>
                      <div className="text-xs text-orange-600 mt-1 flex items-center">
                        <Globe className="w-3 h-3 mr-1" />
                        Swagger UI
                      </div>
                    </div>
                  </Button>
                </div>
                
                {/* API Status Indicator */}
                <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-gray-700">API Status</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Django: <span className="text-green-600 font-medium">http://localhost:8000</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        FastAPI: <span className="text-blue-600 font-medium">http://localhost:8001</span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('http://localhost:8001/validate_system', '_blank')}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Test System
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'integration' && (
          <div className="space-y-8">
            {/* Integration Guide Header */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Integration Guide</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Step-by-step guide to integrate FSFVI analysis into your national food system infrastructure
              </p>
            </div>

            {/* Integration Steps */}
            <div className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                  <CardTitle className="flex items-center text-blue-800">
                    <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                    Authentication Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Register Your System</h4>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST http://localhost:8000/auth/register/ \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "your_country_system",
    "email": "admin@country.gov",
    "password": "secure_password",
    "first_name": "Country",
    "last_name": "Administrator"
  }'`}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Obtain Access Token</h4>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST http://localhost:8000/auth/login/ \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "your_country_system",
    "password": "secure_password"
  }'`}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
                  <CardTitle className="flex items-center text-green-800">
                    <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                    Data Upload & Processing
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Upload CSV Data</h4>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST http://localhost:8001/upload_data \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "file=@food_system_data.csv" \\
  -F "country_name=Your Country" \\
  -F "fiscal_year=2024" \\
  -F "currency=USD"`}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Expected CSV Format</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Required columns:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• <code>component_name</code> - Food system component</li>
                          <li>• <code>financial_allocation</code> - Budget allocation</li>
                          <li>• <code>observed_value</code> - Current performance</li>
                          <li>• <code>benchmark_value</code> - Target performance</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                  <CardTitle className="flex items-center text-purple-800">
                    <span className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                    Analysis & Optimization
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Run System Analysis</h4>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST http://localhost:8001/analyze_system \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "session_id=SESSION_ID" \\
  -F "method=hybrid" \\
  -F "scenario=normal_operations"`}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Optimize Allocation</h4>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST http://localhost:8001/optimize_allocation \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "session_id=SESSION_ID" \\
  -F "method=hybrid" \\
  -F "budget_change_percent=0"`}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                  <CardTitle className="flex items-center text-orange-800">
                    <span className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">4</span>
                    Integration Examples
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">Python Integration Example</h4>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`import requests

class FSFVIClient:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.token = None
    
    def authenticate(self, username, password):
        response = requests.post(
            "http://localhost:8000/auth/login/",
            json={"username": username, "password": password}
        )
        self.token = response.json()["token"]
    
    def upload_data(self, csv_file, country_name, fiscal_year=2024):
        headers = {"Authorization": f"Bearer {self.token}"}
        files = {"file": csv_file}
        data = {
            "country_name": country_name,
            "fiscal_year": fiscal_year
        }
        return requests.post(
            f"{self.base_url}/upload_data",
            headers=headers, files=files, data=data
        )
    
    def analyze_system(self, session_id, method="hybrid"):
        headers = {"Authorization": f"Bearer {self.token}"}
        data = {"session_id": session_id, "method": method}
        return requests.post(
            f"{self.base_url}/analyze_system",
            headers=headers, data=data
        )`}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Support Resources */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-purple-50">
              <CardHeader>
                <CardTitle className="text-xl">Support & Resources</CardTitle>
                <CardDescription>
                  Additional resources to help you integrate FSFVI into your systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div 
                    className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-100 hover:border-blue-300 hover:bg-blue-50"
                    onClick={() => window.open('http://localhost:8000/api-docs/', '_blank')}
                  >
                    <BookOpen className="w-8 h-8 text-blue-600" />
                    <div>
                      <h4 className="font-semibold text-blue-800">Technical Documentation</h4>
                      <p className="text-sm text-gray-600">Complete API reference</p>
                      <p className="text-xs text-blue-600 mt-1 flex items-center">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open Documentation
                      </p>
                    </div>
                  </div>
                  <div 
                    className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-100 hover:border-green-300 hover:bg-green-50"
                    onClick={() => window.open('http://localhost:8000/integration-examples/', '_blank')}
                  >
                    <Code className="w-8 h-8 text-green-600" />
                    <div>
                      <h4 className="font-semibold text-green-800">Code Examples</h4>
                      <p className="text-sm text-gray-600">Integration samples</p>
                      <p className="text-xs text-green-600 mt-1 flex items-center">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Examples
                      </p>
                    </div>
                  </div>
                  <div 
                    className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-100 hover:border-purple-300 hover:bg-purple-50"
                    onClick={() => window.open('http://localhost:8000/deployment-guide/', '_blank')}
                  >
                    <Settings className="w-8 h-8 text-purple-600" />
                    <div>
                      <h4 className="font-semibold text-purple-800">Configuration Guide</h4>
                      <p className="text-sm text-gray-600">Deployment options</p>
                      <p className="text-xs text-purple-600 mt-1 flex items-center">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Deployment Guide
                      </p>
                    </div>
                  </div>
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