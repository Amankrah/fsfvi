'use client';

import React from 'react';
import { 
  ComponentOptimizationResult,
  NewBudgetOptimizationResult
} from '@/lib/api';

// Budget Impact Analysis Configuration Interface
export interface BudgetImpactConfig {
  configured: boolean;
  baseBudget?: number;
  budgetVariations: number[];
  method: string;
  scenario: string;
  constraints: {
    minAllocation: number;
    maxAllocation: number;
    transitionLimit: number;
  };
}

interface BudgetImpactAnalysisProps {
  optimizationResult: OptimizationResult | NewBudgetOptimizationResult;
}

interface OptimizationResult {
  success: boolean;
  original_fsfvi: number;
  optimal_fsfvi: number;
  optimal_allocations: number[];
  relative_improvement_percent: number;
  efficiency_gain_percent: number;
  total_reallocation_amount: number;
  reallocation_intensity_percent: number;
  budget_utilization_percent: number;
  component_analysis?: {
    components: ComponentOptimizationResult[];
    summary: {
      total_components: number;
      components_increased: number;
      components_decreased: number;
      largest_increase: number;
      largest_decrease: number;
      total_vulnerability_reduction: number;
      average_vulnerability_reduction_percent: number;
    };
    recommendations: string[];
  };
}

export default function BudgetImpactAnalysis({
  optimizationResult
}: BudgetImpactAnalysisProps) {

  // Check if this is a new budget optimization result
  const isNewBudgetOptimization = 'optimization_type' in optimizationResult && 
                                  optimizationResult.optimization_type === 'new_budget_allocation';
  
  return (
    <div className="space-y-6">
      {/* Enhanced Budget Impact Display for New Budget Approach */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
          {isNewBudgetOptimization ? '📊 New Budget Analysis' : '📊 Budget Reallocation Analysis'}
        </h4>
        <p className="text-sm text-blue-800 mb-3">
          {isNewBudgetOptimization ? 
            'Analyzing impact of additional budget allocation while keeping current spending fixed.' :
            'Analyzing impact of reallocating existing budget across components.'
          }
        </p>
        
        {isNewBudgetOptimization && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-800">
              <strong>💡 New Budget Approach:</strong> Current allocations remain fixed (already committed/spent). 
              Only new budget is optimized for maximum impact on system vulnerability reduction.
            </p>
          </div>
        )}
        
                 {!isNewBudgetOptimization && (
           <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
             <p className="text-sm text-amber-800">
               <strong>⚠ Traditional Approach:</strong> This analysis treats all allocations as malleable. 
               Consider using &ldquo;New Budget Optimization&rdquo; mode for realistic government planning.
             </p>
           </div>
         )}
      </div>
    </div>
  );
} 