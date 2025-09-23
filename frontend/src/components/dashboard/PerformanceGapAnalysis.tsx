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
  EyeOff,
  ChevronDown,
  ChevronRight,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';

interface PerformanceGap {
  component_name: string;
  gap_percent: number;
  actual_gap_percent?: number;
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
  worst_actual_gap_percent?: number;
  largest_actual_gap_percent?: number;
  ranking_note?: string;
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

  const getPriorityConfig = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': 
        return {
          color: 'bg-red-50 text-red-700 border-red-200',
          gradient: 'from-red-500 to-red-600',
          icon: <AlertTriangle className="w-4 h-4" />,
          dotColor: 'bg-red-500'
        };
      case 'high': 
        return {
          color: 'bg-orange-50 text-orange-700 border-orange-200',
          gradient: 'from-orange-500 to-orange-600',
          icon: <TrendingDown className="w-4 h-4" />,
          dotColor: 'bg-orange-500'
        };
      case 'medium': 
        return {
          color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
          gradient: 'from-yellow-500 to-yellow-600',
          icon: <ArrowDown className="w-4 h-4" />,
          dotColor: 'bg-yellow-500'
        };
      case 'low': 
        return {
          color: 'bg-green-50 text-green-700 border-green-200',
          gradient: 'from-green-500 to-green-600',
          icon: <CheckCircle className="w-4 h-4" />,
          dotColor: 'bg-green-500'
        };
      default: 
        return {
          color: 'bg-gray-50 text-gray-700 border-gray-200',
          gradient: 'from-gray-500 to-gray-600',
          icon: <Minus className="w-4 h-4" />,
          dotColor: 'bg-gray-500'
        };
    }
  };

  const getGapVisualization = (gapPercent: number) => {
    if (gapPercent === 0) {
      return {
        icon: <Shield className="w-6 h-6" />,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        barColor: 'bg-green-500',
        status: 'Excellent'
      };
    }
    if (gapPercent >= 100) {
      return {
        icon: <AlertTriangle className="w-6 h-6" />,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        barColor: 'bg-red-500',
        status: 'Critical'
      };
    }
    if (gapPercent > 30) {
      return {
        icon: <TrendingDown className="w-6 h-6" />,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        barColor: 'bg-red-500',
        status: 'High Risk'
      };
    }
    if (gapPercent > 15) {
      return {
        icon: <ArrowDown className="w-6 h-6" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        barColor: 'bg-orange-500',
        status: 'Medium Risk'
      };
    }
    if (gapPercent > 5) {
      return {
        icon: <Minus className="w-6 h-6" />,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        barColor: 'bg-yellow-500',
        status: 'Low Risk'
      };
    }
    return {
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      barColor: 'bg-green-500',
      status: 'Good'
    };
  };

  const getGapInterpretation = (gapPercent: number, component?: PerformanceGap) => {
    if (gapPercent === 0) {
      return {
        status: 'excellent',
        title: 'Excellent Performance',
        description: 'This component is meeting or exceeding its benchmark, indicating strong resilience.',
        actionNeeded: 'Maintain current approach and consider as a model for other components.',
        badge: 'Resilient',
        color: 'green'
      };
    }
    
    if (gapPercent >= 100) {
      const observed = component?.debug_observed || 0;
      const benchmark = component?.debug_benchmark || 0;
      const actualGap = benchmark > 0 ? ((benchmark - observed) / observed * 100) : 0;
      
      return {
        status: 'critical',
        title: 'Critical Performance Gap',
        description: `Performance is severely below benchmark. Actual gap: ${actualGap.toFixed(1)}% below target.`,
        actionNeeded: 'Immediate intervention required with comprehensive restructuring.',
        badge: 'Critical',
        color: 'red',
        details: `Observed: ${observed.toLocaleString()}, Target: ${benchmark.toLocaleString()}`
      };
    }
    
    if (gapPercent > 30) {
      return {
        status: 'high',
        title: 'High Performance Gap',
        description: 'Significant underperformance requiring targeted intervention.',
        actionNeeded: 'Priority intervention needed with strategic resource allocation.',
        badge: 'High Priority',
        color: 'red'
      };
    }
    
    if (gapPercent > 15) {
      return {
        status: 'medium',
        title: 'Moderate Performance Gap', 
        description: 'Notable gap that should be addressed with focused investment.',
        actionNeeded: 'Strategic improvements recommended.',
        badge: 'Medium Priority',
        color: 'orange'
      };
    }
    
    if (gapPercent > 5) {
      return {
        status: 'low',
        title: 'Minor Performance Gap',
        description: 'Small gap with room for improvement through optimization.',
        actionNeeded: 'Fine-tuning opportunities available.',
        badge: 'Low Priority',
        color: 'yellow'
      };
    }
    
    return {
      status: 'good',
      title: 'Good Performance',
      description: 'Performance is close to benchmark with minimal improvement needed.',
      actionNeeded: 'Monitor and maintain current performance levels.',
      badge: 'Good',
      color: 'green'
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
      <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardContent className="p-12">
          <div className="text-center">
            <div className="bg-blue-100 p-4 rounded-full w-fit mx-auto mb-6">
              <Activity className="w-12 h-12 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Calculating Performance Gaps...
            </h3>
            <div className="space-y-4 max-w-md mx-auto">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-12 text-center">
          <div className="bg-blue-100 p-4 rounded-full w-fit mx-auto mb-6">
            <Target className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Performance Gap Analysis
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
            Calculate performance gaps to see detailed component-level analysis against international benchmarks
          </p>
          {onRecalculate && (
            <Button onClick={onRecalculate} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Calculator className="w-5 h-5 mr-2" />
              Calculate Performance Gaps
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const sortedComponents = getSortedComponents();

  return (
    <div className="space-y-8">
      {/* Overview Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Components</p>
                <p className="text-3xl font-bold text-blue-900">{results.summary?.total_components || 0}</p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <BarChart3 className="w-8 h-8 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Significant Gaps</p>
                <p className="text-3xl font-bold text-orange-900">{results.summary?.components_with_significant_gaps || 0}</p>
                <p className="text-xs text-orange-700">Above 15%</p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <AlertTriangle className="w-8 h-8 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">Average Gap</p>
                <p className="text-3xl font-bold text-yellow-900">{results.summary?.average_gap_percent?.toFixed(1) || '0.0'}%</p>
              </div>
              <div className="bg-yellow-200 p-3 rounded-full">
                <Target className="w-8 h-8 text-yellow-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-red-50 to-red-100 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Largest Gap</p>
                <p className="text-3xl font-bold text-red-900">{results.summary?.largest_gap_percent?.toFixed(1) || '0.0'}%</p>
                {results.summary?.largest_actual_gap_percent && results.summary.largest_actual_gap_percent > (results.summary.largest_gap_percent || 0) && (
                  <p className="text-xs text-red-700">Actual: {results.summary.largest_actual_gap_percent.toFixed(1)}%</p>
                )}
              </div>
              <div className="bg-red-200 p-3 rounded-full">
                <TrendingDown className="w-8 h-8 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis Card */}
      <Card className="shadow-xl border-0 bg-white">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-2xl">
                <Target className="w-6 h-6 mr-3 text-blue-600" />
                Performance Gap Analysis
              </CardTitle>
              <CardDescription className="text-lg mt-1">
                Component-level performance gaps for {countryName}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMathematicalDetails(!showMathematicalDetails)}
                className="shadow-sm"
              >
                {showMathematicalDetails ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showMathematicalDetails ? 'Hide' : 'Show'} Details
              </Button>
              {onRecalculate && (
                <Button size="sm" onClick={onRecalculate} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                  <Calculator className="w-4 h-4 mr-2" />
                  Recalculate
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          {/* Worst Performer Alert */}
          {results.summary?.worst_performer && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 rounded-lg p-6 mb-8">
              <div className="flex items-start">
                <div className="bg-red-100 p-2 rounded-full mr-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 text-lg mb-2">Priority Attention Required</h4>
                  <p className="text-red-800 mb-2">
                    <strong>{results.summary.worst_performer}</strong> shows the largest performance gap 
                    {results.summary.worst_actual_gap_percent ? (
                      <> (<strong>{results.summary.worst_actual_gap_percent.toFixed(1)}%</strong> actual gap)</>
                    ) : (
                      <> ({results.summary?.largest_gap_percent?.toFixed(1) || '0.0'}%)</>
                    )} and requires immediate intervention.
                  </p>
                  {results.summary.ranking_note && (
                    <p className="text-sm text-red-700 italic bg-red-100 p-2 rounded">
                      <strong>Note:</strong> {results.summary.ranking_note}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mathematical Details */}
          {showMathematicalDetails && (
            <Card className="mb-8 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Calculator className="w-5 h-5 mr-2 text-blue-600" />
                  Mathematical Context & Validation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h5 className="font-bold text-gray-900 mb-3">Analysis Method</h5>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {results.mathematical_context?.formula_description || 'Performance gap analysis measures deviation from benchmark values using validated FSFVI methodology'}
                    </p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h5 className="font-bold text-gray-900 mb-3">Validation Status</h5>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Method: {results.mathematical_context?.calculation_method || 'core_fsfvi_functions'}</span>
                      <Badge className="bg-green-100 text-green-800 border border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {results.mathematical_context?.validation_status?.replace(/_/g, ' ') || 'Validated'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Component Analysis */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Component Performance Analysis</h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'gap' | 'name' | 'priority')}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="gap">Sort by Gap Size</option>
                <option value="priority">Sort by Priority</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {sortedComponents.map((component) => {
                const visualization = getGapVisualization(component.gap_percent);
                const interpretation = getGapInterpretation(component.gap_percent, component);
                const priorityConfig = getPriorityConfig(component.priority_level);
                const isExpanded = selectedComponent === component.type;

                return (
                  <Card
                    key={component.type}
                    className={`transition-all duration-200 hover:shadow-lg cursor-pointer border-0 ${
                      isExpanded ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedComponent(isExpanded ? null : component.type)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className={`p-3 rounded-xl ${visualization.bgColor}`}>
                            <div className={visualization.color}>
                              {visualization.icon}
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-bold text-gray-900 text-lg">{component.component_name}</h4>
                              <Badge className={`${priorityConfig.color} border`}>
                                {priorityConfig.icon}
                                <span className="ml-1">{component.priority_level.charAt(0).toUpperCase() + component.priority_level.slice(1)}</span>
                              </Badge>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div>
                                <p className="text-sm text-gray-600">Performance Gap</p>
                                <p className="text-xl font-bold text-gray-900">
                                  {component.gap_percent?.toFixed(1) || '0.0'}%
                                  {component.actual_gap_percent && component.actual_gap_percent > component.gap_percent && (
                                    <span className="text-red-600 text-sm font-medium ml-2">
                                      (Actually {component.actual_gap_percent.toFixed(1)}%)
                                    </span>
                                  )}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-sm text-gray-600">Status</p>
                                <p className={`text-sm font-semibold ${visualization.color}`}>
                                  {visualization.status}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Normalized Gap</p>
                            <p className="font-mono text-sm font-medium text-gray-900">
                              {component.normalized_gap?.toFixed(4) || '0.0000'}
                            </p>
                          </div>
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                        </div>
                      </div>

                      {/* Gap Visualization Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                          <span>Performance Gap Visualization</span>
                          <span>{component.gap_percent?.toFixed(1) || '0.0'}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${visualization.barColor}`}
                            style={{ width: `${Math.min(100, component.gap_percent || 0)}%` }}
                          />
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Performance Data */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h5 className="font-bold text-gray-900 mb-4 flex items-center">
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Performance Data
                              </h5>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Observed Value:</span>
                                  <span className="font-medium">{component.debug_observed?.toLocaleString() || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Benchmark Value:</span>
                                  <span className="font-medium">{component.debug_benchmark?.toLocaleString() || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Gap Percentage:</span>
                                  <span className="font-bold text-red-600">{component.gap_percent?.toFixed(2) || '0.00'}%</span>
                                </div>
                                {component.actual_gap_percent && component.actual_gap_percent !== component.gap_percent && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Actual Gap (Uncapped):</span>
                                    <span className="font-bold text-red-700">{component.actual_gap_percent.toFixed(2)}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Action Recommendations */}
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h5 className="font-bold text-gray-900 mb-4 flex items-center">
                                <Zap className="w-4 h-4 mr-2" />
                                {interpretation.title}
                              </h5>
                              <div className="space-y-3">
                                <p className="text-sm text-gray-700 leading-relaxed">{interpretation.description}</p>
                                <div className="bg-white p-3 rounded border-l-4 border-blue-400">
                                  <p className="text-sm font-medium text-blue-900">Recommended Action:</p>
                                  <p className="text-sm text-blue-800 mt-1">{interpretation.actionNeeded}</p>
                                </div>
                                {interpretation.details && (
                                  <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                                    {interpretation.details}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Priority Actions */}
          {results.priority_actions.length > 0 && (
            <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <AlertTriangle className="w-6 h-6 mr-3 text-orange-600" />
                  Priority Action Plan
                </CardTitle>
                <CardDescription>
                  Immediate recommendations based on performance gap analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.priority_actions.map((action, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-400">
                      <div className="flex items-start space-x-3">
                        <div className="bg-orange-100 rounded-full p-2 mt-1">
                          <span className="text-sm font-bold text-orange-700 w-5 h-5 flex items-center justify-center">
                            {index + 1}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 leading-relaxed">{action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 