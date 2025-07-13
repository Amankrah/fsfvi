import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ArrowUp, 
  ArrowDown, 
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  Target
} from 'lucide-react';
import { ComponentOptimizationResult, NewBudgetOptimizationResult } from '@/lib/api';

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
  iterations: number;
  solver: string;
  mathematical_compliance: boolean;
  constraints_applied: string[];
  error?: string;
  optimization_type?: string;
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
      components_improved?: number;
      components_sacrificed?: number;
      average_improvement_of_improved_components?: number;
      average_sacrifice_of_sacrificed_components?: number;
      net_system_vulnerability_reduction?: number;
      system_optimization_strategy?: string;
      optimization_explanation?: {
        negative_average_means: string;
        system_vs_component: string;
        strategic_reallocation: boolean;
        components_improved_count: number;
        components_sacrificed_count: number;
      };
    };
    recommendations: string[];
  };
  [key: string]: unknown; // Index signature for compatibility
}

interface OptimizationResultsProps {
  result: OptimizationResult | NewBudgetOptimizationResult;
}

export const OptimizationResults: React.FC<OptimizationResultsProps> = ({ result }) => {
  // Check if this is a new budget optimization result
  const isNewBudgetOptimization = 'optimization_type' in result && result.optimization_type === 'new_budget_allocation';
  
  // Extract the appropriate data based on result type
  const getResultData = () => {
    if (isNewBudgetOptimization) {
      const newBudgetResult = result as NewBudgetOptimizationResult;
      return {
        success: newBudgetResult.optimization_results.success,
        original_fsfvi: newBudgetResult.optimization_results.baseline_fsfvi,
        optimal_fsfvi: newBudgetResult.optimization_results.optimal_fsfvi,
        relative_improvement_percent: newBudgetResult.optimization_results.relative_improvement_percent,
        efficiency_gain_percent: newBudgetResult.optimization_results.absolute_improvement * 100, // Convert to percentage
        total_reallocation_amount: newBudgetResult.new_budget_millions,
        reallocation_intensity_percent: newBudgetResult.optimization_results.new_budget_utilization_percent,
        budget_utilization_percent: newBudgetResult.optimization_results.new_budget_utilization_percent,
        component_analysis: newBudgetResult.optimization_results.component_analysis,
        optimization_type: 'new_budget_allocation',
        current_budget: newBudgetResult.current_budget_millions,
        new_budget: newBudgetResult.new_budget_millions,
        total_budget: newBudgetResult.total_budget_millions,
        government_insights: newBudgetResult.optimization_results.government_insights,
        practical_guidance: newBudgetResult.practical_guidance
      };
    } else {
      const traditionalResult = result as OptimizationResult;
      return {
        success: traditionalResult.success,
        original_fsfvi: traditionalResult.original_fsfvi,
        optimal_fsfvi: traditionalResult.optimal_fsfvi,
        relative_improvement_percent: traditionalResult.relative_improvement_percent,
        efficiency_gain_percent: traditionalResult.efficiency_gain_percent,
        total_reallocation_amount: traditionalResult.total_reallocation_amount,
        reallocation_intensity_percent: traditionalResult.reallocation_intensity_percent,
        budget_utilization_percent: traditionalResult.budget_utilization_percent,
        component_analysis: traditionalResult.component_analysis,
        optimization_type: 'traditional_reallocation',
        error: traditionalResult.error
      };
    }
  };

  const resultData = getResultData();

  // Safe access functions for different summary structures
  const getComponentsIncreased = () => {
    if (isNewBudgetOptimization) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return safeValue((resultData.component_analysis as any)?.summary?.components_receiving_new_budget);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return safeValue((resultData.component_analysis as any)?.summary?.components_increased);
    }
  };

  const getComponentsDecreasedOrUtilization = () => {
    if (isNewBudgetOptimization) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return `${safeValue((resultData.component_analysis as any)?.summary?.new_budget_utilized_percent)}%`;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return safeValue((resultData.component_analysis as any)?.summary?.components_decreased);
    }
  };



  const hasStrategicReallocation = () => {
    if (isNewBudgetOptimization) {
      return false; // No strategic reallocation in new budget optimization
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (resultData.component_analysis as any)?.summary?.optimization_explanation?.strategic_reallocation;
    }
  };

  // Enhanced formatters with robust fallbacks  
  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
      return '0.0%';
    }
    return `${Math.abs(value) < 0.01 ? value.toFixed(3) : value.toFixed(1)}%`;
  };
  
  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount) || !isFinite(amount)) {
      return '$0.0M';
    }
    if (Math.abs(amount) >= 1000) {
      return `$${(amount / 1000).toFixed(1)}B`;
    }
    return `$${amount.toFixed(1)}M`;
  };

  const formatNumber = (value: number | undefined | null, decimals: number = 6) => {
    if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
      return '0.' + '0'.repeat(decimals);
    }
    return value.toFixed(decimals);
  };

  const safeValue = (value: number | undefined | null, defaultValue: number = 0) => {
    if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
      return defaultValue;
    }
    return value;
  };

  const getChangeIcon = (change: number | undefined | null) => {
    const safeChange = safeValue(change);
    if (safeChange > 0) return <ArrowUp className="w-4 h-4 text-green-600" />;
    if (safeChange < 0) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return <ArrowRight className="w-4 h-4 text-gray-600" />;
  };

  // Check for validation errors
  const hasValidationError = result && 'error' in result && typeof result.error === 'string';
  const isNewBudgetValidationError = hasValidationError && 
    (result.error?.includes('New budget amount must be specified') || 
     result.error?.includes('Please configure the new budget amount'));

  // Handle error case
  if (!resultData.success && resultData.error) {
    return (
      <Card className="border-0 shadow-lg border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span>
              {isNewBudgetValidationError ? 'New Budget Amount Required' : 'Optimization Failed'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-800">{resultData.error}</p>
            {isNewBudgetValidationError ? (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium mb-2">📝 Required Configuration:</p>
                  <ol className="text-sm text-blue-700 ml-4 list-decimal space-y-1">
                    <li>Click the <strong>Configuration</strong> panel (⚙️ icon)</li>
                    <li>Ensure <strong>&ldquo;New Budget Optimization&rdquo;</strong> mode is selected</li>
                    <li>Enter the <strong>new budget amount</strong> in millions USD</li>
                    <li>Save configuration and run optimization</li>
                  </ol>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>💡 Note:</strong> New budget optimization requires specifying additional funding beyond current allocations. Current allocations remain fixed (as they are already committed/spent).
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-600 mt-2">
                The optimization process encountered an error. Please check your input data and try again.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">FSFVI Improvement</p>
                <p className="text-3xl font-bold text-blue-900">
                  {formatPercent(resultData.relative_improvement_percent)}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {formatNumber(resultData.optimal_fsfvi)} ← {formatNumber(resultData.original_fsfvi)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-1">
                  <p className="text-sm font-medium text-green-600">Efficiency Gain</p>
                  <div className="group relative">
                    <Info className="w-3 h-3 text-green-500 cursor-help" />
                    <div className="invisible group-hover:visible absolute z-10 w-80 p-3 mt-1 text-xs text-white bg-gray-800 rounded-lg shadow-lg -translate-x-1/2 left-1/2">
                      <div className="font-medium mb-1">System Efficiency Improvement</div>
                      <div className="text-gray-200">
                        Efficiency Gain measures how much more efficient your food system becomes after optimization. 
                        It compares the overall system efficiency before and after reallocation:
                      </div>
                      <div className="mt-2 text-gray-300 text-xs">
                        • <strong>Before:</strong> (1 - Original FSFVI) × 100%<br/>
                        • <strong>After:</strong> (1 - Optimized FSFVI) × 100%<br/>
                        • <strong>Gain:</strong> Difference between the two
                      </div>
                      <div className="mt-2 text-green-200 text-xs">
                        Higher efficiency gain = better resource utilization and reduced vulnerabilities
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-900">
                  {formatPercent(resultData.efficiency_gain_percent)}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  System performance boost
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">
                  {isNewBudgetOptimization ? 'New Budget' : 'Reallocation'}
                </p>
                <p className="text-3xl font-bold text-purple-900">
                  {formatCurrency(resultData.total_reallocation_amount)}
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  {isNewBudgetOptimization ? 
                    `${formatPercent(resultData.budget_utilization_percent)} utilized` :
                    `${formatPercent(resultData.reallocation_intensity_percent)} intensity`
                  }
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Type Banner */}
      {isNewBudgetOptimization && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Target className="w-6 h-6 text-emerald-600" />
              <div>
                <h3 className="font-semibold text-emerald-900">New Budget Optimization (Realistic Planning)</h3>
                <p className="text-sm text-emerald-700">
                  Current allocations (${formatCurrency(resultData.current_budget || 0)}) remain fixed. 
                  New budget (${formatCurrency(resultData.new_budget || 0)}) optimally allocated for maximum impact.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Government Insights for New Budget Optimization */}
      {isNewBudgetOptimization && resultData.practical_guidance && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              <span>Government Implementation Guidance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Budget Planning</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    {resultData.government_insights?.budget_planning && Object.entries(resultData.government_insights.budget_planning).map(([key, value]) => (
                      <div key={key} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Strategic Context</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    {resultData.government_insights?.strategic_context && Object.entries(resultData.government_insights.strategic_context).map(([key, value]) => (
                      <div key={key} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Implementation Timeline</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  {resultData.government_insights?.implementation_guidance?.immediate_priorities?.map((priority, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <p>{priority}</p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Next Steps:</strong> {resultData.practical_guidance.implementation}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Component Allocation Changes */}
      {resultData.component_analysis && resultData.component_analysis.components && resultData.component_analysis.components.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>
                {isNewBudgetOptimization ? 'New Budget Allocation Analysis' : 'Component Allocation Changes'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {isNewBudgetOptimization ? 'Receiving New Budget' : 'Budget Increased'}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {isNewBudgetOptimization ? 
                      getComponentsIncreased() :
                      getComponentsIncreased()
                    }
                  </p>
                  <p className="text-xs text-gray-500">components</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {isNewBudgetOptimization ? 'Budget Utilization' : 'Budget Decreased'}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {isNewBudgetOptimization ? 
                      getComponentsDecreasedOrUtilization() :
                      getComponentsDecreasedOrUtilization()
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    {isNewBudgetOptimization ? 'of new budget' : 'components'}
                  </p>
                </div>
              </div>
              
              {hasStrategicReallocation() && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Strategic Optimization:</strong> The algorithm improved overall system performance by strategically 
                    reallocating resources. Some components may show increased vulnerability as funding is redirected to 
                    higher-impact areas for maximum system-wide benefit.
                  </p>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Component</th>
                    {isNewBudgetOptimization ? (
                      <>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Current (Fixed)</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">New Budget</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Total</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900">Impact</th>
                      </>
                    ) : (
                      <>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Current</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Optimal</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900">Change</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900">Vulnerability Reduction</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {resultData.component_analysis.components.map((component: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">
                          {component.component_name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {component.component_type || 'Unknown'}
                        </div>
                      </td>
                      {isNewBudgetOptimization ? (
                        <>
                          <td className="py-3 px-4 text-right">
                            <div className="font-medium">{formatCurrency(component.current_allocation_fixed)}</div>
                            <div className="text-xs text-gray-500">Fixed</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-medium text-green-600">
                              {formatCurrency(component.new_allocation_optimized)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatPercent(component.new_budget_share_percent)} of new
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-medium">{formatCurrency(component.total_allocation)}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="text-sm">
                              <span className="text-green-600">
                                {formatPercent(component.vulnerability_reduction_percent)} reduction
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {component.allocation_priority}
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 text-right">
                            <div className="font-medium">{formatCurrency(component.current_allocation)}</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-medium">{formatCurrency(component.optimal_allocation)}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {getChangeIcon(component.change_amount)}
                              <span className={`font-medium ${
                                safeValue(component.change_amount) > 0 ? 'text-green-600' : 
                                safeValue(component.change_amount) < 0 ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {safeValue(component.change_percent) > 0 ? '+' : ''}{formatPercent(component.change_percent)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatCurrency(Math.abs(safeValue(component.change_amount)))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="text-sm">
                              <span className="text-red-600">{formatPercent(safeValue(component.current_vulnerability) * 100)}</span>
                              <span className="text-gray-400 mx-1">→</span>
                              <span className="text-green-600">{formatPercent(safeValue(component.optimal_vulnerability) * 100)}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatPercent(component.vulnerability_reduction_percent)} reduction
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Backend-Generated Government Recommendations */}
            {resultData.component_analysis.recommendations && resultData.component_analysis.recommendations.length > 0 && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Government Action Recommendations
                </h4>
                <div className="space-y-2">
                  {resultData.component_analysis.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-green-800">{recommendation}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-green-100 rounded-md">
                  <p className="text-xs text-green-700">
                    💡 <strong>Generated by AI optimization:</strong> These recommendations are automatically generated based on the mathematical optimization analysis and highlight the most impactful budget {isNewBudgetOptimization ? 'allocations' : 'reallocations'}.
                  </p>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}
    </div>
  );
}; 