import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Shield, 
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { MultiYearPlan } from '@/lib/api';

interface MultiYearResultsProps {
  result: MultiYearPlan;
}

export const MultiYearResults: React.FC<MultiYearResultsProps> = ({ result }) => {
  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) return '0.0%';
    return `${value.toFixed(1)}%`;
  };
  
  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0.0M';
    return `$${amount.toFixed(1)}M`;
  };
  
  const formatYear = (year: number | undefined | null) => {
    if (year === undefined || year === null || isNaN(year)) return 'Unknown';
    return year.toString();
  };

  const safeValue = (value: number | undefined | null, defaultValue: number = 0) => {
    if (value === undefined || value === null || isNaN(value)) return defaultValue;
    return value;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'achieved':
      case 'on_track':
        return 'text-green-600 bg-green-100';
      case 'at_risk':
        return 'text-yellow-600 bg-yellow-100';
      case 'off_track':
      case 'unlikely':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPreparednessColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'excellent':
        return 'text-green-600 bg-green-100';
      case 'good':
        return 'text-blue-600 bg-blue-100';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-100';
      case 'poor':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Enhanced validation and error handling
  if (!result) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="py-12">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Multi-Year Plan Data</h3>
            <p className="text-gray-600">Multi-year planning data is not available or failed to load.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safely extract data with fallbacks
  const planningHorizon = result.planning_horizon || {};
  const trajectoryAnalysis = result.trajectory_analysis || {};
  const targetAchievement = result.target_achievement || {};
  const yearlyRecommendations = result.yearly_recommendations || {};
  const crisisPreparedness = result.crisis_preparedness || {};
  const governmentRecommendations = result.government_recommendations || {};
  
  // Calculate budget totals more clearly
  const totalBudgetBillions = safeValue(trajectoryAnalysis.total_budget_billions, 0);
  const totalBudgetMillions = totalBudgetBillions * 1000; // Convert billions to millions
  const planningYears = Math.max(safeValue(planningHorizon.total_years, 1), 1);
  const averageBudgetPerYear = totalBudgetMillions / planningYears;
  
  // Get yearly entries for component allocation analysis
  const yearlyEntries = Object.entries(yearlyRecommendations).sort(([a], [b]) => parseInt(a) - parseInt(b));

  return (
    <div className="space-y-6">
      {/* Planning Horizon Overview - Enhanced for Cumulative New Budget */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span>Multi-Year New Budget Planning</span>
          </CardTitle>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>📊 Cumulative New Budget Approach:</strong> Current allocations remain fixed (already committed/spent). 
              Each year adds new budget optimally allocated to maximize system improvements. All improvements 
              are measured against the original baseline (current allocations only) to show true cumulative impact.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-indigo-600">Planning Horizon</p>
              <p className="text-2xl font-bold text-indigo-900">
                {planningYears} Years
              </p>
              <p className="text-xs text-indigo-700">
                {formatYear(planningHorizon.start_year)} - {formatYear(planningHorizon.end_year)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-green-600">Total New Investment</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(totalBudgetMillions)}
              </p>
              <p className="text-xs text-green-700">
                {formatCurrency(averageBudgetPerYear)} additional/year avg
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-purple-600">Cumulative Impact</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatPercent(trajectoryAnalysis.total_improvement_percent)}
              </p>
              <p className="text-xs text-purple-700">
                From baseline vulnerability level
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Achievement Analysis */}
      {targetAchievement && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span>Target Achievement Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3">Target Status</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Target FSFVI:</span>
                      <span className="font-bold text-blue-900">{targetAchievement.target_fsfvi?.toFixed(6) || '0.000000'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Target Year:</span>
                      <span className="font-bold text-blue-900">{formatYear(targetAchievement.target_year)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Projected FSFVI:</span>
                      <span className="font-bold text-blue-900">{targetAchievement.projected_fsfvi?.toFixed(6) || '0.000000'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Target Gap:</span>
                      <span className={`font-bold ${(targetAchievement.target_gap || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {(targetAchievement.target_gap || 0) > 0 ? '+' : ''}{targetAchievement.target_gap?.toFixed(6) || '0.000000'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <Badge className={`text-lg px-4 py-2 ${getStatusColor(targetAchievement.achievement_status || 'unknown')}`}>
                    {(targetAchievement.achievement_status || 'unknown').replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>

              {targetAchievement.additional_budget_needed_millions && (
                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h4 className="font-semibold text-orange-900 mb-3">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      Additional Resources Needed
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-orange-700">Additional Budget:</span>
                        <span className="font-bold text-orange-900">
                          {formatCurrency(targetAchievement.additional_budget_needed_millions)}
                        </span>
                      </div>
                      <div className="text-sm text-orange-800">
                        <strong>Alternative Strategies:</strong>
                        <ul className="mt-2 space-y-1">
                          {targetAchievement.alternative_strategies?.map((strategy, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <ArrowRight className="w-3 h-3 mt-1 flex-shrink-0" />
                              <span>{strategy}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Component Allocation Breakdown by Year */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span>New Budget Component Allocation by Year</span>
          </CardTitle>
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>📊 Component Breakdown:</strong> Shows how new budget is optimally distributed across 
              the six food system components each year for maximum vulnerability reduction.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {yearlyEntries.map(([year, recommendation]) => {
              const componentTypes = ['agricultural_development', 'infrastructure', 'governance_institutions', 'nutrition_health', 'climate_natural_resources', 'social_protection_equity'];
              const optimalNewAllocations = recommendation?.optimal_new_allocations || [];
              const newBudgetThisYear = recommendation?.new_budget_this_year || recommendation?.budget || 0;
              
              return (
                <div key={year} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">Year {year}</h4>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">New Budget This Year</p>
                      <p className="font-bold text-green-600">{formatCurrency(newBudgetThisYear)}</p>
                    </div>

                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {componentTypes.map((componentType, index) => {
                      const allocation = optimalNewAllocations[index] || 0;
                      const percentage = newBudgetThisYear > 0 ? (allocation / newBudgetThisYear) * 100 : 0;
                      const componentName = componentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      
                      return (
                        <div key={componentType} className="p-3 bg-gray-50 rounded-lg">
                          <h5 className="font-medium text-gray-900 text-sm mb-2">{componentName}</h5>
                          <div className="space-y-1">
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(allocation)}</p>
                            <p className="text-sm text-gray-600">{percentage.toFixed(1)}% of new budget</p>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                                     {newBudgetThisYear > 0 && (
                     <div className="mt-4 pt-3 border-t border-gray-200">
                       <p className="text-sm text-gray-600">
                         <strong>Cumulative Impact from Original Baseline:</strong> {formatPercent(recommendation?.improvement_from_baseline)} 
                         total system improvement (includes all previous years&apos; new budget)
                       </p>
                     </div>
                   )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Yearly Recommendations Timeline - Updated for Cumulative New Budget */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <span>Cumulative New Budget Timeline</span>
          </CardTitle>
          <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-800">
              <strong>💡 Implementation Strategy:</strong> Each year shows additional new budget being optimally allocated 
              on top of previous years. Current allocations remain fixed throughout. All improvement percentages 
              are cumulative from the original baseline (year 0 with current allocations only).
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(yearlyRecommendations)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([year, recommendation]) => (
                <div key={year} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 text-lg">Year {year}</h4>
                    <div className="flex items-center space-x-3">
                      <Badge className={`${getPreparednessColor(recommendation?.implementation_complexity || 'medium')}`}>
                        {recommendation?.implementation_complexity || 'medium'} complexity
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">New Budget This Year</p>
                        <p className="font-bold text-gray-900">{formatCurrency(recommendation?.new_budget_this_year || recommendation?.budget)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Budget Display for New Approach */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">New Budget This Year:</span>
                        <span className="font-bold text-green-600 ml-2">
                          {formatCurrency(recommendation?.new_budget_this_year || recommendation?.budget)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Cumulative New Budget:</span>
                        <span className="font-bold text-blue-600 ml-2">
                          {formatCurrency(recommendation?.cumulative_new_budget || recommendation?.budget)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Budget (Current + New):</span>
                        <span className="font-bold text-purple-600 ml-2">
                          {formatCurrency(recommendation?.total_budget_after_new || recommendation?.budget)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600">Projected FSFVI</p>
                      <p className="font-bold text-blue-900">{recommendation?.projected_fsfvi?.toFixed(6) || '0.000000'}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-600">Cumulative Improvement from Original Baseline</p>
                      <p className="font-bold text-green-900">{formatPercent(recommendation?.improvement_from_baseline)}</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-600">Crisis Resilience</p>
                      <p className="font-bold text-purple-900">{((recommendation?.crisis_resilience_score || 0) * 100).toFixed(0)}%</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-xs text-orange-600">Approach</p>
                      <p className="font-bold text-orange-900">
                        {recommendation?.optimization_type === 'dynamic_new_budget_allocation' ? 'Dynamic' : 
                         recommendation?.optimization_type === 'cumulative_new_budget' ? 'New Budget' : 'Standard'}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Optimization Badge */}
                  {recommendation?.optimization_type === 'dynamic_new_budget_allocation' && (
                    <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <h5 className="text-sm font-semibold text-emerald-800 mb-2">
                        🧠 Dynamic Optimization Applied
                      </h5>
                                             <div className="text-xs text-emerald-700">
                         This year&apos;s allocation used dynamic optimization that considers cumulative funding effects, 
                         sensitivity parameter changes, and performance improvements from previous investments. 
                         The allocation strategy adapts based on the evolving system state.
                       </div>
                    </div>
                  )}

                  {/* Standard Transition Analysis */}
                  {recommendation?.transition_analysis && typeof recommendation?.transition_analysis?.total_reallocation === 'number' && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <h5 className="text-sm font-semibold text-gray-800 mb-2">
                        Transition Analysis
                        {parseInt(year) === Object.keys(yearlyRecommendations).map(Number).sort()[0] && (
                          <span className="text-xs text-gray-600 ml-2">(vs. original baseline)</span>
                        )}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-gray-600">Total Changes:</span>
                          <span className="font-medium ml-1">
                            {formatCurrency(recommendation?.transition_analysis?.total_reallocation || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Components Increased:</span>
                          <span className="font-medium ml-1 text-green-600">
                            {recommendation?.transition_analysis?.components_increased || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Components Decreased:</span>
                          <span className="font-medium ml-1 text-red-600">
                            {recommendation?.transition_analysis?.components_decreased || 0}
                          </span>
                        </div>
                      </div>
                      {parseInt(year) === Object.keys(yearlyRecommendations).map(Number).sort()[0] && (
                        <div className="mt-2 text-xs text-blue-600">
                          Shows allocation changes from adding ${formatCurrency(recommendation?.new_budget_this_year || 0).replace('$', '').replace('M', '')}M new budget to original baseline
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Crisis Preparedness Analysis */}
      {crisisPreparedness && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-red-600" />
              <span>Crisis Preparedness Assessment</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overall Resilience Trend */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Resilience Trajectory</h4>
                <div className="space-y-2">
                  {(crisisPreparedness.overall_resilience_trend || []).map((trend, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Year {trend?.year || 'Unknown'}</span>
                      <div className="flex items-center space-x-2">
                        <div className={`w-16 h-2 rounded-full ${
                          (trend?.resilience_score || 0) > 0.8 ? 'bg-green-500' :
                          (trend?.resilience_score || 0) > 0.6 ? 'bg-blue-500' :
                          (trend?.resilience_score || 0) > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className="text-sm font-bold">
                          {((trend?.resilience_score || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preparedness Recommendations */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Key Recommendations</h4>
                <div className="space-y-2">
                  {(crisisPreparedness.preparedness_recommendations || []).map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-blue-800">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Government Recommendations */}
      {governmentRecommendations && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <span>Government Strategic Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <h4 className="font-semibold text-indigo-900 mb-3">Executive Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-indigo-700">Planning Horizon:</span>
                    <span className="font-medium ml-2">{governmentRecommendations.executive_summary?.planning_horizon_years || 0} years</span>
                  </div>
                  <div>
                    <span className="text-indigo-700">Total Investment:</span>
                    <span className="font-medium ml-2">{formatCurrency((governmentRecommendations.executive_summary?.total_budget_billions || 0) * 1000)}</span>
                  </div>
                  <div>
                    <span className="text-indigo-700">Expected Improvement:</span>
                    <span className="font-medium ml-2">{formatPercent(governmentRecommendations.executive_summary?.projected_improvement_percent)}</span>
                  </div>
                  <div>
                    <span className="text-indigo-700">Crisis Preparedness:</span>
                    <Badge className={`ml-2 ${getPreparednessColor(governmentRecommendations.executive_summary?.crisis_preparedness || 'unknown')}`}>
                      {governmentRecommendations.executive_summary?.crisis_preparedness || 'unknown'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Categories */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Immediate Actions */}
                <div>
                  <h5 className="font-semibold text-red-600 mb-3 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Immediate Actions (0-6 months)
                  </h5>
                  <ul className="space-y-2">
                    {(governmentRecommendations.immediate_actions || []).map((action, index) => (
                      <li key={index} className="text-sm p-2 bg-red-50 rounded border border-red-200">
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Medium-term Strategy */}
                <div>
                  <h5 className="font-semibold text-yellow-600 mb-3 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Medium-term Strategy (6-24 months)
                  </h5>
                  <ul className="space-y-2">
                    {(governmentRecommendations.medium_term_strategy || []).map((strategy, index) => (
                      <li key={index} className="text-sm p-2 bg-yellow-50 rounded border border-yellow-200">
                        {strategy}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Long-term Vision */}
                <div>
                  <h5 className="font-semibold text-green-600 mb-3 flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Long-term Vision (2+ years)
                  </h5>
                  <ul className="space-y-2">
                    {(governmentRecommendations.long_term_vision || []).map((vision, index) => (
                      <li key={index} className="text-sm p-2 bg-green-50 rounded border border-green-200">
                        {vision}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Budget Recommendations */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Budget Recommendations
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Total Commitment:</span>
                    <span className="font-bold ml-2">{formatCurrency(governmentRecommendations.budget_recommendations?.total_commitment_millions)}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Annual Average:</span>
                    <span className="font-bold ml-2">{formatCurrency(governmentRecommendations.budget_recommendations?.annual_average_millions)}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Efficiency Rating:</span>
                    <Badge className="ml-2 bg-green-100 text-green-800">
                      {governmentRecommendations.budget_recommendations?.efficiency_rating || 'unknown'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-green-700">Funding Adequacy:</span>
                    <Badge className="ml-2 bg-green-100 text-green-800">
                      {governmentRecommendations.budget_recommendations?.funding_adequacy || 'unknown'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  );
}; 