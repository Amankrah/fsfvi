'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingDown, 
  AlertTriangle, 
  Target,
  BarChart3,
  Calculator,
  CheckCircle,
  Activity,
  ArrowDown,
  Minus,
  Eye,
  EyeOff
} from 'lucide-react';

interface PerformanceGap {
  component_name: string;
  gap_percent: number;
  actual_gap_percent?: number;  // Uncapped gap for ranking
  normalized_gap: number;
  priority_level: string;
  debug_observed?: number;
  debug_benchmark?: number;
  performance_status?: string;
  prefer_higher?: boolean;
}

interface PerformanceGapSummary {
  total_components: number;
  components_with_significant_gaps: number;
  average_gap_percent: number;
  worst_performer: string;
  largest_gap_percent: number;
  worst_actual_gap_percent?: number;  // Actual gap of worst performer
  largest_actual_gap_percent?: number;  // Largest actual gap overall
  ranking_note?: string;  // Note about ranking methodology
}

interface MathematicalContext {
  formula_used: string;
  formula_description: string;
  variables: {
    [key: string]: string;
  };
  calculation_method: string;
  validation_status: string;
}

interface PerformanceGapResults {
  gaps: { [key: string]: PerformanceGap };
  summary: PerformanceGapSummary;
  priority_actions: string[];
  mathematical_context: MathematicalContext;
}

interface PerformanceGapAnalysisProps {
  results: PerformanceGapResults | null;
  isLoading?: boolean;
  countryName?: string;
  onRecalculate?: () => void;
}

export const PerformanceGapAnalysis: React.FC<PerformanceGapAnalysisProps> = ({
  results,
  isLoading = false,
  countryName = 'Selected Country',
  onRecalculate
}) => {
  const [showMathematicalDetails, setShowMathematicalDetails] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'gap' | 'name' | 'priority'>('gap');

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getGapIcon = (gapPercent: number) => {
    if (gapPercent > 30) return <TrendingDown className="w-5 h-5 text-red-500" />;
    if (gapPercent > 15) return <ArrowDown className="w-5 h-5 text-orange-500" />;
    if (gapPercent > 5) return <Minus className="w-5 h-5 text-yellow-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getGapInterpretation = (gapPercent: number, component?: PerformanceGap) => {
    if (gapPercent === 0) {
      return {
        status: 'excellent',
        title: 'Excellent Performance - No Gap',
        description: 'This component is meeting or exceeding its benchmark, indicating resilience and effective resource allocation.',
        actionNeeded: 'Maintain current approach and consider this as a model for other components.',
        badge: 'Resilient'
      };
    }
    
    if (gapPercent >= 100) {
      const observed = component?.debug_observed || 0;
      const benchmark = component?.debug_benchmark || 0;
      const actualGap = benchmark > 0 ? ((benchmark - observed) / observed * 100) : 0;
      
      return {
        status: 'critical',
        title: 'Critical Performance Gap (Capped at 100%)',
        description: `Performance is severely below benchmark. Actual performance gap: ${actualGap.toFixed(1)}% below target.`,
        actionNeeded: 'Immediate intervention required with comprehensive restructuring and significant resource reallocation.',
        badge: 'Critical',
        details: `Observed: ${observed.toLocaleString()}, Target: ${benchmark.toLocaleString()}`
      };
    }
    
    if (gapPercent > 30) {
      return {
        status: 'high',
        title: 'High Performance Gap',
        description: 'Significant underperformance requiring targeted intervention.',
        actionNeeded: 'Priority intervention needed with strategic resource allocation.',
        badge: 'High Priority'
      };
    }
    
    if (gapPercent > 15) {
      return {
        status: 'medium',
        title: 'Moderate Performance Gap', 
        description: 'Notable gap that should be addressed with focused investment.',
        actionNeeded: 'Strategic improvements recommended with targeted resource allocation.',
        badge: 'Medium Priority'
      };
    }
    
    if (gapPercent > 5) {
      return {
        status: 'low',
        title: 'Minor Performance Gap',
        description: 'Small gap with room for improvement through optimization.',
        actionNeeded: 'Fine-tuning and optimization opportunities available.',
        badge: 'Low Priority'
      };
    }
    
    return {
      status: 'good',
      title: 'Good Performance',
      description: 'Performance is close to benchmark with minimal improvement needed.',
      actionNeeded: 'Monitor and maintain current performance levels.',
      badge: 'Good'
    };
  };

  const getSortedComponents = () => {
    if (!results?.gaps) return [];
    
    const components = Object.entries(results.gaps).map(([type, gap]) => ({
      type,
      ...gap
    }));

    return components.sort((a, b) => {
      switch (sortBy) {
        case 'gap':
          // Sort by actual gap first, then by displayed gap
          const aActualGap = a.actual_gap_percent ?? a.gap_percent;
          const bActualGap = b.actual_gap_percent ?? b.gap_percent;
          return bActualGap - aActualGap;
        case 'name':
          return a.component_name.localeCompare(b.component_name);
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority_level as keyof typeof priorityOrder] || 0) - 
                 (priorityOrder[a.priority_level as keyof typeof priorityOrder] || 0);
        default:
          return 0;
      }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2 animate-pulse" />
            Calculating Performance Gaps...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Performance Gap Analysis
          </CardTitle>
          <CardDescription>
            Calculate performance gaps to see detailed component-level gaps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Performance Gap Data
            </h3>
            <p className="text-gray-600 mb-4">
              Run the performance gap analysis to see detailed component-level gaps
            </p>
            {onRecalculate && (
              <Button onClick={onRecalculate}>
                <Calculator className="w-4 h-4 mr-2" />
                Calculate Performance Gaps
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedComponents = getSortedComponents();

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Performance Gap Analysis
              </CardTitle>
              <CardDescription>
                Performance gaps for {countryName} - Performance gap analysis
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMathematicalDetails(!showMathematicalDetails)}
              >
                {showMathematicalDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showMathematicalDetails ? 'Hide' : 'Show'} Details
              </Button>
              {onRecalculate && (
                <Button size="sm" onClick={onRecalculate}>
                  <Calculator className="w-4 h-4 mr-2" />
                  Recalculate
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">{results.summary?.total_components || 0}</div>
              <div className="text-sm text-blue-700">Total Components</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-900">{results.summary?.components_with_significant_gaps || 0}</div>
              <div className="text-sm text-orange-700">Significant Gaps ({'>'}15%)</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-900">{results.summary?.average_gap_percent?.toFixed(1) || '0.0'}%</div>
              <div className="text-sm text-yellow-700">Average Gap</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-900">{results.summary?.largest_gap_percent?.toFixed(1) || '0.0'}%</div>
              <div className="text-sm text-red-700">Largest Gap (Display)</div>
              {results.summary?.largest_actual_gap_percent && results.summary.largest_actual_gap_percent > (results.summary.largest_gap_percent || 0) && (
                <div className="text-xs text-red-600 font-medium">
                  Actual: {results.summary.largest_actual_gap_percent.toFixed(1)}%
                </div>
              )}
            </div>
          </div>

          {/* Worst Performer Highlight */}
          {results.summary?.worst_performer && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <div>
                  <h4 className="font-semibold text-red-900">Attention Required (Ranked by Actual Gaps)</h4>
                  <p className="text-sm text-red-700">
                    <strong>{results.summary.worst_performer}</strong> has the largest performance gap 
                    {results.summary.worst_actual_gap_percent ? (
                      <>(<strong>{results.summary.worst_actual_gap_percent.toFixed(1)}%</strong> actual gap)</>
                    ) : (
                      <>({results.summary?.largest_gap_percent?.toFixed(1) || '0.0'}%)</>
                    )} and requires immediate attention.
                  </p>
                  {results.summary.ranking_note && (
                    <p className="text-xs text-red-600 mt-1 italic">
                      Note: {results.summary.ranking_note}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Analysis Details (Expandable) */}
          {showMathematicalDetails && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Calculator className="w-4 h-4 mr-2" />
                  Analysis Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <h5 className="font-semibold text-sm mb-2">Performance Gap Analysis:</h5>
                    <p className="text-sm text-gray-600 mt-2">
                      {results.mathematical_context?.formula_description || 'Performance gap analysis measures deviation from benchmark values'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-sm font-semibold text-blue-600">Performance Gap</div>
                      <div className="text-xs text-gray-600 mt-1">Normalized performance gap (dimensionless, [0,1])</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-sm font-semibold text-blue-600">Observed Value</div>
                      <div className="text-xs text-gray-600 mt-1">Current performance measurement</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-sm font-semibold text-blue-600">Benchmark</div>
                      <div className="text-xs text-gray-600 mt-1">Target performance value</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Calculation Method: {results.mathematical_context?.calculation_method || 'core_fsfvi_functions'}</span>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {results.mathematical_context?.validation_status?.replace(/_/g, ' ') || 'Validated'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Special Cases Alert */}
          {sortedComponents.some(c => c.gap_percent === 0 || c.gap_percent >= 100) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* 0% Gap Components */}
              {sortedComponents.filter(c => c.gap_percent === 0).map(component => (
                <div key={`zero-${component.type}`} className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <h4 className="font-semibold text-green-900">Resilient Component</h4>
                  </div>
                  <p className="text-sm text-green-800 mb-2">
                    <strong>{component.component_name}</strong> shows 0% gap
                  </p>
                  <p className="text-xs text-green-700">
                    Observed: {component.debug_observed?.toLocaleString() || 'N/A'} | 
                    Benchmark: {component.debug_benchmark?.toLocaleString() || 'N/A'}
                  </p>
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    ✓ Performing {component.debug_observed && component.debug_benchmark ? 
                      `${((component.debug_observed - component.debug_benchmark) / component.debug_benchmark * 100).toFixed(1)}% above benchmark` : 
                      'above benchmark'}
                  </p>
                </div>
              ))}

              {/* 100% Gap Components */}
              {sortedComponents.filter(c => c.gap_percent >= 100).map(component => (
                <div key={`hundred-${component.type}`} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                    <h4 className="font-semibold text-red-900">Critical Gap (Capped)</h4>
                  </div>
                  <p className="text-sm text-red-800 mb-2">
                    <strong>{component.component_name}</strong> shows 100% gap (capped)
                  </p>
                  <p className="text-xs text-red-700">
                    Observed: {component.debug_observed?.toLocaleString() || 'N/A'} | 
                    Benchmark: {component.debug_benchmark?.toLocaleString() || 'N/A'}
                  </p>
                  {component.debug_observed && component.debug_benchmark && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      ⚠️ Actually {((component.debug_benchmark - component.debug_observed) / component.debug_observed * 100).toFixed(1)}% below benchmark
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Component Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Component-Level Analysis</CardTitle>
              <CardDescription>
                Detailed performance gaps by food system component
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'gap' | 'name' | 'priority')}
                className="text-sm border rounded px-2 py-1"
                aria-label="Sort components by"
              >
                <option value="gap">Sort by Gap Size</option>
                <option value="priority">Sort by Priority</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedComponents.map((component) => (
              <div
                key={component.type}
                className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
                  selectedComponent === component.type ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedComponent(
                  selectedComponent === component.type ? null : component.type
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getGapIcon(component.gap_percent)}
                    <div>
                      <h4 className="font-semibold text-gray-900">{component.component_name}</h4>
                      <p className="text-sm text-gray-600">
                        Performance Gap: {component.gap_percent?.toFixed(1) || '0.0'}%
                        {component.actual_gap_percent && component.actual_gap_percent > component.gap_percent && (
                          <span className="text-red-600 font-medium"> (Actually {component.actual_gap_percent.toFixed(1)}% below)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={`${getPriorityColor(component.priority_level)} border`}>
                      {component.priority_level.charAt(0).toUpperCase() + component.priority_level.slice(1)} Priority
                    </Badge>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {component.normalized_gap?.toFixed(4) || '0.0000'}
                      </div>
                      <div className="text-xs text-gray-500">Normalized Gap</div>
                    </div>
                  </div>
                </div>

                {/* Gap Visualization Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Performance Gap</span>
                    <span>{component.gap_percent?.toFixed(1) || '0.0'}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        (component.gap_percent || 0) > 30 ? 'bg-red-500' :
                        (component.gap_percent || 0) > 15 ? 'bg-orange-500' :
                        (component.gap_percent || 0) > 5 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, component.gap_percent || 0)}%` }}
                    />
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedComponent === component.type && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-lg border">
                        <h5 className="font-semibold text-sm mb-2">Gap Analysis</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Gap Percentage:</span>
                            <span className="font-medium">{component.gap_percent?.toFixed(2) || '0.00'}%</span>
                          </div>
                          {component.actual_gap_percent && component.actual_gap_percent !== component.gap_percent && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Actual Gap (Uncapped):</span>
                              <span className="font-medium text-red-600">{component.actual_gap_percent.toFixed(2)}%</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Normalized Gap:</span>
                            <span className="font-medium font-mono">{component.normalized_gap?.toFixed(6) || '0.000000'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Priority Level:</span>
                            <Badge className={`${getPriorityColor(component.priority_level)} text-xs`}>
                              {component.priority_level}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg border">
                        <h5 className="font-semibold text-sm mb-2">Interpretation</h5>
                        {(() => {
                          const interpretation = getGapInterpretation(component.gap_percent || 0, component);
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h6 className="font-medium text-sm">{interpretation.title}</h6>
                                <Badge className={`text-xs ${
                                  interpretation.status === 'excellent' ? 'bg-green-100 text-green-800' :
                                  interpretation.status === 'critical' ? 'bg-red-100 text-red-800' :
                                  interpretation.status === 'high' ? 'bg-orange-100 text-orange-800' :
                                  interpretation.status === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {interpretation.badge}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700">{interpretation.description}</p>
                              <p className="text-xs text-gray-600 font-medium">{interpretation.actionNeeded}</p>
                              {interpretation.details && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                  <strong>Values:</strong> {interpretation.details}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Priority Actions */}
      {results.priority_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Priority Actions
            </CardTitle>
            <CardDescription>
              Recommended immediate actions based on performance gap analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.priority_actions.map((action, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="bg-orange-100 rounded-full p-1 mt-0.5">
                    <span className="text-xs font-bold text-orange-700 w-4 h-4 flex items-center justify-center">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-900">{action}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 