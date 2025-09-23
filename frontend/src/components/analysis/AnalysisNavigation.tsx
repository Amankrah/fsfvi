'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  TrendingDown,
  Shield,
  Target,
  BarChart3,
  Home,
  BookOpen,
  Zap
} from 'lucide-react';

interface AnalysisNavigationProps {
  sessionId: string;
  currentPage: 'components-overview' | 'budget-distribution' | 'performance-gaps' | 'component-vulnerabilities' | 'system-vulnerability' | 'allocation-optimization';
  sessionInfo?: {
    country?: string;
    fiscal_year?: number;
    total_budget?: number;
    currency?: string;
  };
}

export const AnalysisNavigation: React.FC<AnalysisNavigationProps> = ({
  sessionId,
  currentPage,
  sessionInfo
}) => {
  const router = useRouter();

  const navigationItems = [
    {
      id: 'components-overview',
      title: 'Framework Components',
      icon: <BookOpen className="w-4 h-4" />,
      path: `/analysis/${sessionId}/components-overview`,
      description: 'Understand the 6 validated food system components'
    },
    {
      id: 'budget-distribution',
      title: 'Budget Distribution',
      icon: <BarChart3 className="w-4 h-4" />,
      path: `/analysis/${sessionId}/budget-distribution`,
      description: 'Analyze budget allocation patterns and concentration'
    },
    {
      id: 'performance-gaps',
      title: 'Performance Gaps',
      icon: <TrendingDown className="w-4 h-4" />,
      path: `/analysis/${sessionId}/performance-gaps`,
      description: 'Identify gaps between current and benchmark performance'
    },
    {
      id: 'component-vulnerabilities',
      title: 'Component Vulnerabilities',
      icon: <Shield className="w-4 h-4" />,
      path: `/analysis/${sessionId}/component-vulnerabilities`,
      description: 'Calculate FSFVI vulnerability scores for each component'
    },
    {
      id: 'system-vulnerability',
      title: 'System FSFVI',
      icon: <Target className="w-4 h-4" />,
      path: `/analysis/${sessionId}/system-vulnerability`,
      description: 'Overall system vulnerability index and recommendations'
    },
    {
      id: 'allocation-optimization',
      title: 'Allocation Optimization',
      icon: <Zap className="w-4 h-4" />,
      path: `/analysis/${sessionId}/allocation-optimization`,
      description: 'Optimize budget allocation to minimize system vulnerability'
    }
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const getCurrentPageTitle = () => {
    const current = navigationItems.find(item => item.id === currentPage);
    return current?.title || 'Analysis';
  };

  return (
    <div>
      {/* Header with Back Button and Title */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {navigationItems.find(item => item.id === currentPage)?.icon}
                    <h1 className="text-2xl font-bold text-gray-900">
                      {getCurrentPageTitle()}
                    </h1>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    FSFVI Analysis
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {sessionInfo ? (
                    <>
                      {sessionInfo.country} • FY {sessionInfo.fiscal_year || new Date().getFullYear()} • 
                      {sessionInfo.total_budget && sessionInfo.currency ? 
                        ` $${sessionInfo.total_budget.toFixed(1)}M ${sessionInfo.currency}` : 
                        ` Session: ${sessionId.substring(0, 8)}...`
                      }
                    </>
                  ) : (
                    `Session: ${sessionId.substring(0, 8)}...`
                  )}
                </p>
              </div>
            </div>
            
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto" aria-label="Analysis Navigation">
            {navigationItems.map((item) => {
              const isActive = item.id === currentPage;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Breadcrumb Context */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <p className="text-xs text-gray-600">
            {navigationItems.find(item => item.id === currentPage)?.description}
          </p>
        </div>
      </div>
    </div>
  );
}; 