import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';

interface SessionInfo {
  country: string;
  fiscal_year: number;
  total_budget: number;
  currency: string;
}

interface OptimizationHeaderProps {
  sessionInfo: SessionInfo | null;
}

export const OptimizationHeader: React.FC<OptimizationHeaderProps> = ({ sessionInfo }) => {
  const formatCurrency = (amount: number) => `$${amount.toFixed(1)}M`;

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <CardHeader>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Food System Financial Optimization Suite
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Comprehensive decision-making tools for nationwide food system financial allocation and resilience planning
            </CardDescription>
          </div>
        </div>
        
        {/* Country Info */}
        <div className="bg-white rounded-lg p-4 border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Country</p>
              <p className="font-semibold text-gray-900">{sessionInfo?.country || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Fiscal Year</p>
              <p className="font-semibold text-gray-900">{sessionInfo?.fiscal_year || new Date().getFullYear()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Budget</p>
              <p className="font-semibold text-gray-900">{formatCurrency(sessionInfo?.total_budget || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Currency</p>
              <p className="font-semibold text-gray-900">{sessionInfo?.currency || 'USD'}</p>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}; 