'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  CheckCircle, 
  Globe,
  PieChart,
  DollarSign,
  ChevronDown,
  ChevronUp
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
  const [isComponentDistributionExpanded, setIsComponentDistributionExpanded] = useState(false);

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_sessions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_sessions} active, {stats.completed_sessions} completed
            </p>
          </CardContent>
        </Card>

        {/* Total Analyses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analyses Complete</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_analyses}</div>
            <p className="text-xs text-muted-foreground">
              Vulnerability assessments completed
            </p>
          </CardContent>
        </Card>

        {/* Total Budget Analyzed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Analyzed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.total_budget_analyzed ? stats.total_budget_analyzed.toFixed(1) : '0'}M
            </div>
            <p className="text-xs text-muted-foreground">
              Average budget per analysis
            </p>
          </CardContent>
        </Card>

        {/* Countries Analyzed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_countries}</div>
            <p className="text-xs text-muted-foreground">
              Unique countries analyzed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Component Distribution */}
      {data.component_distribution && data.component_distribution.components && data.component_distribution.components.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  Component Distribution
                </CardTitle>
                <CardDescription>
                  Budget allocation across food system components for {data.component_distribution.country_name}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsComponentDistributionExpanded(!isComponentDistributionExpanded)}
              >
                {isComponentDistributionExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {isComponentDistributionExpanded && (
            <CardContent>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">Total Budget</span>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-blue-600 mr-1" />
                    <span className="text-lg font-bold text-blue-900">
                      ${data.component_distribution.total_budget.toFixed(1)}M
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {data.component_distribution.components.map((component) => (
                  <div key={component.component_type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="mb-1">
                        <span className="font-medium text-gray-900">
                          {component.component_name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          ${component.allocation.toFixed(1)}M ({component.percentage}%)
                        </span>
                        {component.vulnerability && (
                          <span className="text-xs text-gray-500">
                            Vulnerability: {(component.vulnerability * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${component.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      
    </div>
  );
}; 