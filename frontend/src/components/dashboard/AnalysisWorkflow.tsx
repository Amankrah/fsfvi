'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  BarChart3, 
  Target,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  Activity,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { analysisAPI, dataAPI } from '@/lib/api';

interface AnalysisStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  icon: React.ReactNode;
  results?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface AnalysisWorkflowProps {
  sessionId: string | null;
  countryName: string | null;
  onAnalysisComplete?: () => void;
}

export const AnalysisWorkflow: React.FC<AnalysisWorkflowProps> = ({ 
  sessionId, 
  countryName,
  onAnalysisComplete 
}) => {
  const router = useRouter();
  const [clearingSession, setClearingSession] = useState(false);
  const [steps, setSteps] = useState<AnalysisStep[]>([
    {
      id: 'distribution',
      title: 'Analyze Current Distribution',
      description: 'Analyze budget allocation patterns and concentration',
      status: 'pending',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'performance_gaps',
      title: 'Calculate Performance Gaps',
      description: 'Identify gaps between current and benchmark performance',
      status: 'pending',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      id: 'vulnerabilities',
      title: 'Component Vulnerabilities',
      description: 'Calculate vulnerability scores for each component',
      status: 'pending',
      icon: <AlertCircle className="w-5 h-5" />,
    },
    {
      id: 'system_vulnerability',
      title: 'System FSFVI Score',
      description: 'Calculate overall system vulnerability index',
      status: 'pending',
      icon: <Target className="w-5 h-5" />,
    },
  ]);

  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const updateStepStatus = (stepId: string, status: AnalysisStep['status'], results?: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, results } : step
    ));
    
    // Auto-expand step when completed
    if (status === 'completed' && results) {
      setExpandedSteps(prev => new Set([...prev, stepId]));
    }
  };

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getToken = () => {
    return localStorage.getItem('auth_token') || '';
  };

  const runAnalysisStep = async (stepId: string) => {
    if (!sessionId) {
      alert('No session selected. Please upload data first.');
      return;
    }

    const token = getToken();
    updateStepStatus(stepId, 'running');

    try {
      let results;
      
      switch (stepId) {
        case 'distribution':
          results = await analysisAPI.analyzeCurrentDistribution(sessionId, token);
          break;
        case 'performance_gaps':
          results = await analysisAPI.calculatePerformanceGaps(sessionId, token);
          break;
        case 'vulnerabilities':
          results = await analysisAPI.calculateComponentVulnerabilities(sessionId, token);
          break;
        case 'system_vulnerability':
          results = await analysisAPI.calculateSystemVulnerability(sessionId, token);
          break;
        default:
          throw new Error('Unknown analysis step');
      }

      updateStepStatus(stepId, 'completed', results);
      
      if (onAnalysisComplete) {
        onAnalysisComplete();
      }
    } catch (error) {
      console.error(`Analysis step ${stepId} failed:`, error);
      updateStepStatus(stepId, 'error');
      alert(`Analysis failed: ${error}`);
    }
  };

  const runFullAnalysis = async () => {
    if (!sessionId) {
      alert('No session selected. Please upload data first.');
      return;
    }

    // Run each individual step to populate the workflow UI
    for (const step of steps) {
      if (step.status !== 'completed') {
        await runAnalysisStep(step.id);
        await new Promise(resolve => setTimeout(resolve, 500)); // Shorter delay between steps
      }
    }
  };

  const handleClearSession = async () => {
    if (!sessionId) return;
    
    if (!confirm('Are you sure you want to clear this session? This will delete all analysis results and cannot be undone.')) {
      return;
    }

    setClearingSession(true);
    try {
      await dataAPI.clearSession(sessionId);
      // Navigate back to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to clear session:', error);
      alert('Failed to clear session. Please try again.');
    } finally {
      setClearingSession(false);
    }
  };

  const runComprehensiveAnalysis = async () => {
    if (!sessionId) {
      alert('No session selected. Please upload data first.');
      return;
    }

    const token = getToken();
    
    try {
      // Mark all steps as running
      steps.forEach(step => updateStepStatus(step.id, 'running'));
      
      // Call the comprehensive analysis endpoint
      const comprehensiveResult = await analysisAPI.analyzeSystem(sessionId, token);
      
      // Extract and update results for each step - auto-expansion handled by updateStepStatus
      updateStepStatus('distribution', 'completed', {
        key_insights: [
          `Total budget: $${comprehensiveResult.distribution_analysis?.total_budget_usd_millions?.toFixed(1) || '0.0'}M`,
          `Budget utilization: ${comprehensiveResult.distribution_analysis?.budget_utilization_percent?.toFixed(1) || '0.0'}%`,
          `Components analyzed: ${comprehensiveResult.distribution_analysis?.component_allocations ? Object.keys(comprehensiveResult.distribution_analysis.component_allocations).length : 0}`,
          `Concentration level: ${comprehensiveResult.distribution_analysis?.concentration_analysis?.concentration_level || 'Unknown'}`
        ]
      });
      
      updateStepStatus('performance_gaps', 'completed', comprehensiveResult.performance_gaps || {});
      
      updateStepStatus('vulnerabilities', 'completed', comprehensiveResult.component_vulnerabilities || {});
      
      updateStepStatus('system_vulnerability', 'completed', comprehensiveResult);

      if (onAnalysisComplete) {
        onAnalysisComplete();
      }
      
    } catch (error) {
      console.error('Comprehensive analysis failed:', error);
      steps.forEach(step => updateStepStatus(step.id, 'error'));
      alert(`Comprehensive analysis failed: ${error}`);
    }
  };

  const getStepIcon = (step: AnalysisStep) => {
    switch (step.status) {
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return step.icon;
    }
  };

  const getStepBadge = (status: AnalysisStep['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const renderResults = (step: AnalysisStep) => {
    if (!step.results) return null;

    switch (step.id) {
      case 'distribution':
        return (
          <div className="mt-3 space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Key Insights:</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                {step.results.key_insights?.map((insight: string, index: number) => (
                  <li key={index}>• {insight}</li>
                ))}
              </ul>
            </div>
            
            {/* API Endpoint Info */}
            <div className="flex justify-center">
              <Badge className="bg-blue-100 text-blue-800 text-xs">
                /analyze_current_distribution
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (sessionId) {
                    router.push(`/analysis/${sessionId}/budget-distribution`);
                  } else {
                    alert('Session ID not available');
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Detailed Analysis
              </Button>
              <Button
                size="sm"
                onClick={() => runAnalysisStep('distribution')}
                disabled={step.status === 'running'}
              >
                <Activity className="w-4 h-4 mr-1" />
                Recalculate
              </Button>
            </div>
          </div>
        );
      case 'performance_gaps':
        return (
          <div className="mt-3 space-y-3">
            {/* Quick Summary - Updated for dedicated endpoint data structure */}
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="text-sm font-semibold text-yellow-900 mb-2">Performance Summary:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-800">{step.results.summary?.average_gap_percent?.toFixed(1) || '0.0'}%</div>
                  <div className="text-yellow-700">Average Gap</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-800">{step.results.summary?.worst_performer || 'N/A'}</div>
                  <div className="text-red-700">Worst Performer</div>
                  {step.results.summary?.worst_actual_gap_percent && (
                    <div className="text-xs text-red-600 mt-1">
                      <strong>{step.results.summary.worst_actual_gap_percent.toFixed(1)}%</strong> actual gap
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-800">{step.results.summary?.components_with_significant_gaps || 0}</div>
                  <div className="text-orange-700">Components w/ Gaps</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-800">{step.results.summary?.largest_gap_percent?.toFixed(1) || '0.0'}%</div>
                  <div className="text-blue-700">Largest Gap (Display)</div>
                  {step.results.summary?.largest_actual_gap_percent && step.results.summary.largest_actual_gap_percent > (step.results.summary.largest_gap_percent || 0) && (
                    <div className="text-xs text-blue-600 mt-1">
                      <strong>{step.results.summary.largest_actual_gap_percent.toFixed(1)}%</strong> actual
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mathematical Context Indicator */}
            {step.results.mathematical_context && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-semibold text-blue-900">Formula Used:</h5>
                    <code className="text-xs font-mono text-blue-800">{step.results.mathematical_context.formula_used}</code>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Validated
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      /calculate_performance_gaps
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-1">{step.results.mathematical_context.formula_description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (sessionId) {
                    router.push(`/analysis/${sessionId}/performance-gaps`);
                  } else {
                    alert('Session ID not available');
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Detailed Analysis
              </Button>
              <Button
                size="sm"
                onClick={() => runAnalysisStep('performance_gaps')}
                disabled={step.status === 'running'}
              >
                <Activity className="w-4 h-4 mr-1" />
                Recalculate
              </Button>
            </div>
          </div>
        );
      case 'vulnerabilities':
        return (
          <div className="mt-3 space-y-3">
            {/* Enhanced Quick Summary with Critical Alert */}
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="text-sm font-semibold text-orange-900 mb-2">FSFVI Vulnerability Analysis:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-800">{step.results.summary?.average_vulnerability_percent?.toFixed(1) || '0.0'}%</div>
                  <div className="text-orange-700">System Avg</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-800">{step.results.summary?.critical_components_count || 0}</div>
                  <div className="text-red-700">Critical Risk</div>
                  {(step.results.summary?.critical_components_count || 0) > 0 && (
                    <div className="text-xs text-red-600 mt-1 font-semibold">
                      ⚠️ Immediate Action
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-800">{step.results.summary?.high_risk_components_count || 0}</div>
                  <div className="text-orange-700">High Risk</div>
                  {(step.results.summary?.high_risk_components_count || 0) > 0 && (
                    <div className="text-xs text-orange-600 mt-1">
                      Priority Focus
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-800">{step.results.summary?.worst_performer || 'N/A'}</div>
                  <div className="text-blue-700">Worst Performer</div>
                  {step.results.summary?.highest_vulnerability_percent && (
                    <div className="text-xs text-red-600 mt-1">
                      <strong>{step.results.summary.highest_vulnerability_percent.toFixed(1)}%</strong> vulnerability
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Critical Components Alert */}
            {step.results.critical_components && step.results.critical_components.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-300">
                <div className="flex items-center mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                  <h5 className="text-sm font-semibold text-red-900">Critical Vulnerabilities Detected</h5>
                </div>
                <div className="flex flex-wrap gap-1">
                  {step.results.critical_components.map((comp: string, idx: number) => (
                    <Badge key={idx} className="bg-red-100 text-red-800 text-xs">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Budget at Risk Insight */}
            {step.results.analysis_metadata && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-yellow-900">Budget Analysis:</span>
                    <span className="text-yellow-800 ml-2">
                      ${step.results.analysis_metadata.total_budget_millions.toFixed(1)}M total allocation
                    </span>
                  </div>
                  <div className="text-yellow-700">
                    {step.results.analysis_metadata.total_components} components analyzed
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Mathematical Context Indicator */}
            {step.results.mathematical_context && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h5 className="text-sm font-semibold text-blue-900">FSFVI Formula:</h5>
                    <code className="text-xs font-mono text-blue-800 font-bold">{step.results.mathematical_context.formula_used}</code>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Mathematically Validated
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      /calculate_component_vulnerabilities
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-blue-700">{step.results.mathematical_context.formula_description}</p>
                <div className="mt-2 text-xs text-blue-600">
                  <strong>Method:</strong> {step.results.mathematical_context.weighting_method || 'hybrid'} • 
                  <strong> Scenario:</strong> {step.results.mathematical_context.scenario_context || 'normal_operations'} • 
                  <strong> Sensitivity:</strong> {step.results.mathematical_context.sensitivity_estimation || 'default'}
                </div>
              </div>
            )}

            {/* Component Performance Highlights */}
            {step.results.components && Object.keys(step.results.components).length > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <h5 className="text-sm font-semibold text-gray-900 mb-2">Component Highlights:</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                     {(Object.entries(step.results.components) as [string, { component_name?: string; vulnerability: number }][]).slice(0, 6).map(([compType, compData]) => (
                    <div key={compType} className="flex justify-between items-center bg-white p-2 rounded border">
                      <span className="text-gray-700 truncate">{compData.component_name || compType.replace('_', ' ')}</span>
                      <span className={`font-bold ${
                        compData.vulnerability >= 0.7 ? 'text-red-600' :
                        compData.vulnerability >= 0.5 ? 'text-orange-600' :
                        compData.vulnerability >= 0.3 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {(compData.vulnerability * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Health Assessment */}
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center mb-1">
                <Activity className="w-4 h-4 text-indigo-600 mr-2" />
                <h5 className="text-sm font-semibold text-indigo-900">System Health Assessment</h5>
              </div>
              <p className="text-xs text-indigo-800">
                {(() => {
                  const avgVuln = step.results.summary?.average_vulnerability_percent || 0;
                  const criticalCount = step.results.summary?.critical_components_count || 0;
                  
                  if (criticalCount > 0) {
                    return `🚨 System shows critical vulnerabilities requiring immediate intervention (${criticalCount} critical components)`;
                  } else if (avgVuln > 50) {
                    return `⚠️ High system vulnerability detected - strategic improvements needed`;
                  } else if (avgVuln > 30) {
                    return `🔍 Moderate vulnerability - targeted optimizations recommended`;
                  } else if (avgVuln > 15) {
                    return `✅ Low to moderate vulnerability - system shows good resilience`;
                  } else {
                    return `🎯 Excellent system performance with minimal vulnerability`;
                  }
                })()}
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                                  onClick={() => {
                    if (sessionId) {
                      router.push(`/analysis/${sessionId}/component-vulnerabilities`);
                    } else {
                      alert('Session ID not available - Please upload data first or select a recent session');
                    }
                  }}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Comprehensive Analysis
              </Button>
              <Button
                size="sm"
                onClick={() => runAnalysisStep('vulnerabilities')}
                disabled={step.status === 'running'}
              >
                <Activity className="w-4 h-4 mr-1" />
                Recalculate
              </Button>
            </div>
          </div>
        );
      case 'system_vulnerability':
        return (
          <div className="mt-3 space-y-3">
            {/* FSFVI Results - Robust data extraction */}
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <h4 className="text-sm font-semibold text-red-900 mb-2">System FSFVI Analysis:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-800">
                    {(() => {
                      const score = step.results.fsfvi_results?.fsfvi_score || 
                                   step.results.system_analysis?.fsfvi_score || 0;
                      return (score * 100).toFixed(2);
                    })()}%
                  </div>
                  <div className="text-red-700">FSFVI Score</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-800">
                    {step.results.fsfvi_results?.risk_level || 
                     step.results.system_analysis?.risk_level || 'Unknown'}
                  </div>
                  <div className="text-orange-700">Risk Level</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-800">
                    {(() => {
                      const efficiency = step.results.fsfvi_results?.financing_efficiency_percent ||
                                        step.results.system_analysis?.government_insights?.financing_efficiency_percent ||
                                        ((1 - (step.results.fsfvi_results?.fsfvi_score || step.results.system_analysis?.fsfvi_score || 0)) * 100);
                      return efficiency.toFixed(1);
                    })()}%
                  </div>
                  <div className="text-green-700">Efficiency</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-800">
                    {step.results.system_analysis?.critical_components?.length || 0}
                  </div>
                  <div className="text-blue-700">Critical Components</div>
                </div>
              </div>
            </div>

            {/* Mathematical Formula Display */}
                         <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
               <div className="flex items-center justify-between mb-2">
                 <h5 className="text-sm font-semibold text-blue-900">FSFVI Mathematical Framework:</h5>
                 <Badge className="bg-green-100 text-green-800 text-xs">
                   <CheckCircle className="w-3 h-3 mr-1" />
                   Calculated
                 </Badge>
               </div>
               <code className="text-xs font-mono text-blue-800 font-bold">
                 {step.results.mathematical_interpretation?.formula_applied || 
                  'FSFVI = Σᵢ ωᵢ·υᵢ(fᵢ) = Σᵢ ωᵢ·δᵢ·[1/(1+αᵢfᵢ)]'}
               </code>
               <p className="text-xs text-blue-700 mt-1">
                 Aggregated vulnerability across {step.results.system_analysis?.component_statistics?.total_components || 'all'} food system components
               </p>
             </div>

                         {/* Executive Summary */}
             {(step.results.executive_summary || step.results.system_analysis?.government_insights) && (
               <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                 <h5 className="text-sm font-semibold text-blue-900">Government Assessment:</h5>
                 <p className="text-xs text-blue-800 mt-1">
                   {step.results.executive_summary?.overall_assessment || 
                    `System shows ${step.results.system_analysis?.risk_level || 'unknown'} vulnerability level`}
                 </p>
                 {(step.results.executive_summary?.immediate_actions_required || 
                   (step.results.system_analysis?.critical_components?.length || 0) > 0) && (
                   <div className="mt-2 px-2 py-1 bg-orange-100 rounded text-xs text-orange-800">
                     ⚠️ Immediate interventions required for critical components
                   </div>
                 )}
               </div>
             )}

                         {/* Critical Components Alert */}
             {(step.results.system_analysis?.critical_components?.length || 0) > 0 && (
               <div className="p-3 bg-red-50 rounded-lg border border-red-300">
                 <div className="flex items-center mb-2">
                   <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                   <h5 className="text-sm font-semibold text-red-900">Critical System Components</h5>
                 </div>
                 <div className="flex flex-wrap gap-1">
                   {step.results.system_analysis.critical_components.map((comp: string, idx: number) => (
                     <Badge key={idx} className="bg-red-100 text-red-800 text-xs">
                       {comp}
                     </Badge>
                   ))}
                 </div>
               </div>
             )}

            {/* API Endpoint Info */}
            <div className="flex justify-center">
              <Badge className="bg-blue-100 text-blue-800 text-xs">
                /calculate_system_vulnerability
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (sessionId) {
                    router.push(`/analysis/${sessionId}/system-vulnerability`);
                  } else {
                    alert('Session ID not available');
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Comprehensive Analysis
              </Button>
              <Button
                size="sm"
                onClick={() => runAnalysisStep('system_vulnerability')}
                disabled={step.status === 'running'}
              >
                <Activity className="w-4 h-4 mr-1" />
                Recalculate
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!sessionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>FSFVI Analysis Workflow</CardTitle>
          <CardDescription>
            Upload data first to begin the analysis workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Data Available
            </h3>
            <p className="text-gray-600">
              Please upload country data to start the FSFVI analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>FSFVI Analysis Workflow</span>
            <div className="flex items-center space-x-2">
              <Button onClick={runComprehensiveAnalysis} className="flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Comprehensive Analysis
              </Button>
              <Button onClick={runFullAnalysis} variant="outline" className="flex items-center">
                <PlayCircle className="w-4 h-4 mr-2" />
                Step-by-Step
              </Button>
              <Button 
                onClick={handleClearSession} 
                variant="outline" 
                disabled={clearingSession}
                className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {clearingSession ? (
                  <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Clear Session
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Complete FSFVI vulnerability analysis for {countryName || 'your data'}. 
            Choose comprehensive analysis for faster results or step-by-step for detailed workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.id} className="border rounded-lg">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {getStepIcon(step)}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{step.title}</h3>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStepBadge(step.status)}
                      {step.results && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStepExpansion(step.id)}
                        >
                          {expandedSteps.has(step.id) ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                          }
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runAnalysisStep(step.id)}
                        disabled={step.status === 'running'}
                      >
                        {step.status === 'running' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : step.status === 'completed' ? (
                          'Re-run'
                        ) : (
                          <ArrowRight className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Expanded Results */}
                  {expandedSteps.has(step.id) && renderResults(step)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}; 