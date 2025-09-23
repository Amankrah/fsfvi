import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Target, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Info,
  Lightbulb
} from 'lucide-react';

interface SessionInfo {
  country: string;
  fiscal_year: number;
  total_budget: number;
  currency: string;
}

interface OptimizationConfig {
  method: string;
  scenario: string;
  budgetChange: number;
  constraints: {
    minAllocation: number;
    maxAllocation: number;
    transitionLimit: number;
  };
  optimizationMode: 'traditional' | 'new_budget';
  newBudgetAmount?: number;
}

interface OptimizationHeaderProps {
  sessionInfo: SessionInfo | null;
  optimizationConfig: OptimizationConfig;
  isConfigured: boolean;
  onConfigure: () => void;
}

export default function OptimizationHeader({
  sessionInfo,
  optimizationConfig,
  isConfigured,
  onConfigure
}: OptimizationHeaderProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount * 1000000);
  };

  const getOptimizationModeInfo = () => {
    if (optimizationConfig.optimizationMode === 'new_budget') {
      return {
        title: 'New Budget Optimization',
        description: 'Optimizes allocation of new budget while keeping current allocations fixed',
        icon: <Target className="w-5 h-5 text-green-600" />,
        color: 'green',
        details: [
          `Current budget: ${formatCurrency(sessionInfo?.total_budget || 2900)} (Fixed)`,
          `New budget: ${formatCurrency(optimizationConfig.newBudgetAmount || 0)} (Optimized)`,
          `Total budget: ${formatCurrency((sessionInfo?.total_budget || 2900) + (optimizationConfig.newBudgetAmount || 0))}`,
          'Realistic for government planning'
        ]
      };
    } else {
      return {
        title: 'Traditional Reallocation',
        description: 'Optimizes reallocation of entire current budget',
        icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
        color: 'blue',
        details: [
          `Total budget: ${formatCurrency(sessionInfo?.total_budget || 2900)}`,
          `Budget change: ${optimizationConfig.budgetChange || 0}%`,
          'Shows "how money should have been allocated"',
          'Useful for understanding optimal patterns'
        ]
      };
    }
  };

  const modeInfo = getOptimizationModeInfo();

  return (
    <div className="space-y-6">
      {/* Main Header */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="w-6 h-6 text-blue-600" />
              <span>Allocation Optimization</span>
            </div>
            <div className="flex items-center space-x-2">
              {isConfigured ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="destructive" className="bg-red-100 text-red-800">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not Configured
                </Badge>
              )}
              <button
                onClick={onConfigure}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Configure
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Session Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Session Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Country:</span>
                  <span className="font-medium">{sessionInfo?.country || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fiscal Year:</span>
                  <span className="font-medium">{sessionInfo?.fiscal_year || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Budget:</span>
                  <span className="font-medium">{formatCurrency(sessionInfo?.total_budget || 2900)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Currency:</span>
                  <span className="font-medium">{sessionInfo?.currency || 'USD'}</span>
                </div>
              </div>
            </div>

            {/* Optimization Configuration */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Optimization Settings</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="font-medium capitalize">{optimizationConfig.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Scenario:</span>
                  <span className="font-medium capitalize">{optimizationConfig.scenario}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Min Allocation:</span>
                  <span className="font-medium">{optimizationConfig.constraints.minAllocation}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Allocation:</span>
                  <span className="font-medium">{optimizationConfig.constraints.maxAllocation}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Mode Information */}
      <Card className={`border-0 shadow-lg border-l-4 ${
        modeInfo.color === 'green' ? 'border-l-green-500 bg-green-50' : 'border-l-blue-500 bg-blue-50'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-lg ${
              modeInfo.color === 'green' ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {modeInfo.icon}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold text-lg ${
                modeInfo.color === 'green' ? 'text-green-900' : 'text-blue-900'
              }`}>
                {modeInfo.title}
              </h3>
              <p className={`text-sm mt-1 ${
                modeInfo.color === 'green' ? 'text-green-700' : 'text-blue-700'
              }`}>
                {modeInfo.description}
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {modeInfo.details.map((detail, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      modeInfo.color === 'green' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <span className={`text-sm ${
                      modeInfo.color === 'green' ? 'text-green-800' : 'text-blue-800'
                    }`}>
                      {detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mode-specific Information */}
      {optimizationConfig.optimizationMode === 'new_budget' && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              <div>
                <h4 className="font-semibold text-amber-900">New Budget Optimization Benefits</h4>
                <p className="text-sm text-amber-700 mt-1">
                  This mode is more realistic for government budgeting as it treats existing allocations as 
                  committed/spent and only optimizes new budget allocation for maximum impact.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {optimizationConfig.optimizationMode === 'traditional' && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-violet-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Info className="w-5 h-5 text-purple-600" />
              <div>
                <h4 className="font-semibold text-purple-900">Traditional Reallocation Analysis</h4>
                                 <p className="text-sm text-purple-700 mt-1">
                   This mode shows how resources should optimally be allocated across all components. 
                   It&apos;s useful for understanding ideal allocation patterns and long-term planning.
                 </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 