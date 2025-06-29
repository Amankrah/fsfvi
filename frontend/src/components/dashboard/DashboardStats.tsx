'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  CheckCircle, 
  Globe,
  DollarSign,
  TrendingUp,
  Target,
  Activity,
  BarChart3,
  Users
} from 'lucide-react';

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

interface DashboardStatsProps {
  data: DashboardData | null;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ data }) => {
  const stats = data?.statistics;

  if (!stats) {
    return (
      <div className="space-y-8">
        {/* Loading State */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-6 w-6 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Additional Loading Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(1)].map((_, i) => (
            <Card key={i} className="animate-pulse border-0 shadow-lg">
              <CardHeader className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate additional metrics for user-specific data
  const completionRate = stats.total_sessions > 0 ? (stats.completed_sessions / stats.total_sessions * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Main Statistics Grid - Enhanced */}
      <div>
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Your Analysis Overview</h3>
          <p className="text-gray-600 mt-1">Your personal FSFVI analysis sessions and statistics</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Sessions */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Your Sessions</CardTitle>
              <div className="p-2 bg-blue-200 rounded-lg">
                <FileText className="h-5 w-5 text-blue-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-800">{stats.total_sessions}</div>
              <div className="flex items-center mt-2 space-x-4">
                <div className="flex items-center space-x-1">
                  <Activity className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">{stats.active_sessions} active</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">{stats.completed_sessions} completed</span>
                </div>
              </div>
              <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-600 mt-1 font-medium">
                {completionRate.toFixed(1)}% completion rate
              </p>
            </CardContent>
          </Card>

          {/* Total Analyses */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-green-700 uppercase tracking-wide">Analyses Complete</CardTitle>
              <div className="p-2 bg-green-200 rounded-lg">
                <Target className="h-5 w-5 text-green-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-800">{stats.total_analyses}</div>
              <p className="text-sm text-green-600 mt-2">
                Vulnerability assessments completed
              </p>
              <div className="flex items-center mt-3 space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Analysis dashboard ready
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Budget Analyzed */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Budget Analyzed</CardTitle>
              <div className="p-2 bg-purple-200 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-800">
                ${stats.total_budget_analyzed ? stats.total_budget_analyzed.toFixed(1) : '0'}M
              </div>
              <p className="text-sm text-purple-600 mt-2">
                Total budget under analysis
              </p>
              <div className="flex items-center mt-3 space-x-2">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">
                  Multi-session analysis
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Countries Analyzed */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Countries</CardTitle>
              <div className="p-2 bg-orange-200 rounded-lg">
                <Globe className="h-5 w-5 text-orange-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-800">{stats.total_countries}</div>
              <p className="text-sm text-orange-600 mt-2">
                Countries with your analysis
              </p>
              <div className="flex items-center mt-3 space-x-2">
                <Users className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">
                  Multi-country insights
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>


    </div>
  );
}; 