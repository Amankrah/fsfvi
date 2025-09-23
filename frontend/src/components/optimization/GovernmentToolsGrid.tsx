import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Target, Calendar, Shield, Calculator, Users, AlertTriangle, Crosshair, TrendingUp, Zap } from 'lucide-react';
import { MultiYearPlan, ScenarioComparison, BudgetSensitivityAnalysis } from '@/lib/api';

interface OptimizationResults {
  basic?: OptimizationResult;
  multiYear?: MultiYearPlan;
  scenarioComparison?: ScenarioComparison;
  budgetSensitivity?: BudgetSensitivityAnalysis;
  interactive?: OptimizationResult;
  targetBased?: OptimizationResult;
  crisisResilience?: OptimizationResult;
}

interface OptimizationResult {
  success: boolean;
  original_fsfvi: number;
  optimal_fsfvi: number;
  optimal_allocations: number[];
  relative_improvement_percent: number;
  total_reallocation_amount: number;
  iterations: number;
  [key: string]: unknown;
}

interface GovernmentTool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  category: string;
  priority: number;
  dependencies?: string[];
  estimatedTime: string;
  complexity: 'low' | 'medium' | 'high';
}

interface GovernmentToolsGridProps {
  optimizationResults: OptimizationResults;
  analysisInProgress: Record<string, boolean>;
  onRunAnalysis: (toolId: string) => void;
}

export const GovernmentToolsGrid: React.FC<GovernmentToolsGridProps> = ({
  optimizationResults,
  analysisInProgress,
  onRunAnalysis
}) => {
  const governmentTools: GovernmentTool[] = [
    // Phase 1: Foundation Analysis (Required First)
    {
      id: 'optimization',
      name: 'System Optimization',
      description: 'Core allocation optimization analysis - start here for all planning',
      icon: Target,
      enabled: true,
      category: 'foundation',
      priority: 1,
      estimatedTime: '2-3 min',
      complexity: 'medium'
    },

    
    // Phase 2: Strategic Planning
    {
      id: 'multi-year',
      name: 'Multi-Year Strategic Plan',
      description: 'Long-term cumulative new budget planning with target achievement roadmap (current allocations remain fixed)',
      icon: Calendar,
      enabled: true,
      category: 'strategic',
      priority: 2,
      dependencies: ['optimization'],
      estimatedTime: '5-8 min',
      complexity: 'high'
    },
    {
      id: 'target-based',
      name: 'Target Achievement Plan',
      description: 'Optimize to achieve specific FSFVI targets within defined timeframes',
      icon: Crosshair,
      enabled: true,
      category: 'strategic',
      priority: 3,
      dependencies: ['optimization'],
      estimatedTime: '3-4 min',
      complexity: 'medium'
    },
    
    // Phase 3: Risk Assessment
    {
      id: 'scenario-comparison',
      name: 'Crisis Scenario Analysis',
      description: 'Compare allocation strategies across different crisis scenarios',
      icon: Shield,
      enabled: true,
      category: 'risk',
      priority: 4,
      dependencies: ['optimization'],
      estimatedTime: '4-6 min',
      complexity: 'high'
    },
    {
      id: 'crisis-resilience',
      name: 'Resilience Assessment',
      description: 'Comprehensive food system resilience evaluation across crisis scenarios',
      icon: AlertTriangle,
      enabled: true,
      category: 'risk',
      priority: 5,
      dependencies: ['scenario-comparison'],
      estimatedTime: '3-5 min',
      complexity: 'medium'
    },
    
    // Phase 4: Financial Analysis
    {
      id: 'budget-sensitivity',
      name: 'Budget Impact Analysis',
      description: 'Analyze marginal returns and optimal budget levels for informed budgeting',
      icon: Calculator,
      enabled: true,
      category: 'financial',
      priority: 6,
      dependencies: ['optimization'],
      estimatedTime: '4-5 min',
      complexity: 'medium'
    },
    
    // Phase 5: Interactive Refinement
    {
      id: 'interactive',
      name: 'Interactive Adjustment',
      description: 'Manual allocation adjustments with real-time impact assessment',
      icon: Users,
      enabled: true,
      category: 'interactive',
      priority: 7,
      dependencies: ['optimization'],
      estimatedTime: '2-10 min',
      complexity: 'low'
    }
  ];

  const categoryInfo = {
    foundation: {
      name: 'Foundation Analysis',
      description: 'Core analysis required for all subsequent planning',
      color: 'bg-blue-50 border-blue-200',
      icon: Target
    },
    strategic: {
      name: 'Strategic Planning',
      description: 'Long-term planning and target achievement',
      color: 'bg-green-50 border-green-200',
      icon: TrendingUp
    },
    risk: {
      name: 'Risk Assessment',
      description: 'Crisis preparedness and resilience analysis',
      color: 'bg-red-50 border-red-200',
      icon: Shield
    },
    financial: {
      name: 'Financial Analysis',
      description: 'Budget optimization and sensitivity analysis',
      color: 'bg-purple-50 border-purple-200',
      icon: Calculator
    },
    interactive: {
      name: 'Interactive Tools',
      description: 'Manual adjustments and real-time analysis',
      color: 'bg-orange-50 border-orange-200',
      icon: Users
    }
  };

  const getToolStatus = (tool: GovernmentTool) => {
    const isInProgress = analysisInProgress[tool.id];
    const hasResults = optimizationResults[tool.id as keyof OptimizationResults];
    const dependenciesMet = !tool.dependencies || tool.dependencies.every(dep => 
      optimizationResults[dep as keyof OptimizationResults]
    );
    
    return {
      isInProgress,
      hasResults,
      dependenciesMet,
      canRun: dependenciesMet && !isInProgress,
      status: hasResults ? 'completed' : dependenciesMet ? 'available' : 'locked'
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'available': return 'text-blue-600 bg-blue-100';
      case 'locked': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Group tools by category
  const toolsByCategory = governmentTools.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, GovernmentTool[]>);

  // Sort categories by priority (foundation first)
  const categoryOrder: (keyof typeof categoryInfo)[] = ['foundation', 'strategic', 'risk', 'financial', 'interactive'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Government Decision-Making Suite</h2>
            <p className="text-gray-600 mt-1">Evidence-based food system financial planning workflow</p>
          </div>
        </div>
        
        {/* Workflow Progress */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Recommended Workflow</h3>
          <div className="flex items-center justify-center space-x-2 text-sm">
            <Badge className="bg-blue-100 text-blue-800">1. Foundation</Badge>
            <span className="text-blue-600">→</span>
            <Badge className="bg-green-100 text-green-800">2. Strategic</Badge>
            <span className="text-green-600">→</span>
            <Badge className="bg-red-100 text-red-800">3. Risk</Badge>
            <span className="text-red-600">→</span>
            <Badge className="bg-purple-100 text-purple-800">4. Financial</Badge>
            <span className="text-purple-600">→</span>
            <Badge className="bg-orange-100 text-orange-800">5. Interactive</Badge>
          </div>
        </div>
      </div>

      {/* Tools by Category */}
      {categoryOrder.map(categoryKey => {
        const category = categoryInfo[categoryKey];
        const tools = toolsByCategory[categoryKey] || [];
        
        if (tools.length === 0) return null;

        return (
          <div key={categoryKey} className={`border rounded-lg p-6 ${category.color}`}>
            <div className="flex items-center space-x-3 mb-4">
              <category.icon className="w-6 h-6 text-gray-700" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">{category.name}</h3>
                <p className="text-gray-600 text-sm">{category.description}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.sort((a, b) => a.priority - b.priority).map((tool) => {
                const toolStatus = getToolStatus(tool);
                const Icon = tool.icon;
                
                return (
                  <Card key={tool.id} className={`border-0 shadow-md hover:shadow-lg transition-shadow ${
                    toolStatus.canRun ? 'cursor-pointer' : 'opacity-75'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            toolStatus.hasResults ? 'bg-green-100' : 
                            toolStatus.dependenciesMet ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              toolStatus.hasResults ? 'text-green-600' : 
                              toolStatus.dependenciesMet ? 'text-blue-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-sm font-semibold leading-tight">{tool.name}</CardTitle>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={`text-xs ${getStatusColor(toolStatus.status)}`}>
                                {toolStatus.status}
                              </Badge>
                              <span className={`text-xs ${getComplexityColor(tool.complexity)}`}>
                                {tool.complexity}
                              </span>
                            </div>
                          </div>
                        </div>
                        {toolStatus.hasResults && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                      </div>
                      <CardDescription className="text-xs text-gray-600 mt-2">
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500">Est. time: {tool.estimatedTime}</span>
                        {tool.dependencies && (
                          <span className="text-xs text-gray-500">
                            Requires: {tool.dependencies.length} tool{tool.dependencies.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => onRunAnalysis(tool.id)}
                        disabled={!toolStatus.canRun}
                        className="w-full text-xs"
                        variant={toolStatus.hasResults ? "outline" : "default"}
                        size="sm"
                      >
                        {toolStatus.isInProgress ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Icon className="w-3 h-3 mr-2" />
                            {!toolStatus.dependenciesMet ? 'Locked' :
                             toolStatus.hasResults ? 'Update Analysis' : 'Run Analysis'}
                          </>
                        )}
                      </Button>
                      
                      {tool.dependencies && !toolStatus.dependenciesMet && (
                        <p className="text-xs text-red-600 mt-2">
                          Complete {tool.dependencies.join(', ')} first
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}; 