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
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      id: 'optimization',
      title: 'Analyze Optimal Allocation',
      description: 'Show how current budget should have been allocated for best performance',
      status: 'pending',
      icon: <Activity className="w-5 h-5" />,
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
        case 'optimization':
          // Use traditional optimization mode to show "how money should have been allocated"
          results = await analysisAPI.optimizeAllocation(
            sessionId, 
            token, 
            'hybrid', // method
            0, // budgetChangePercent - no budget change, just reallocation
            undefined, // constraints
            'traditional' // optimizationMode - retrospective analysis
          );
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





  const getStepBadge = (status: AnalysisStep['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 px-3 py-1 font-semibold">✓ Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800 px-3 py-1 font-semibold">⟳ Running</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 px-3 py-1 font-semibold">✗ Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 px-3 py-1 font-semibold">○ Pending</Badge>;
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
            


            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                onClick={() => {
                  if (sessionId) {
                    router.push(`/analysis/${sessionId}/budget-distribution`);
                  } else {
                    alert('Session ID not available');
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Detailed Analysis
              </Button>
              <Button
                variant="outline"
                onClick={() => runAnalysisStep('distribution')}
                disabled={step.status === 'running'}
                className="border-gray-300 hover:bg-gray-50"
              >
                <Activity className="w-4 h-4 mr-2" />
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

            {/* Analysis Context Indicator */}
            {step.results.mathematical_context && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-semibold text-blue-900">Analysis Method:</h5>
                    <p className="text-xs text-blue-800">Performance gap calculation completed</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Validated
                    </Badge>

                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-1">Performance gap calculation completed successfully</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                className="bg-yellow-600 hover:bg-yellow-700 text-white flex-1"
                onClick={() => {
                  if (sessionId) {
                    router.push(`/analysis/${sessionId}/performance-gaps`);
                  } else {
                    alert('Session ID not available');
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Detailed Analysis
              </Button>
              <Button
                variant="outline"
                onClick={() => runAnalysisStep('performance_gaps')}
                disabled={step.status === 'running'}
                className="border-gray-300 hover:bg-gray-50"
              >
                <Activity className="w-4 h-4 mr-2" />
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

            {/* Enhanced Analysis Context Indicator */}
            {step.results.mathematical_context && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h5 className="text-sm font-semibold text-blue-900">FSFVI Analysis:</h5>
                    <p className="text-xs text-blue-800">Component vulnerability assessment completed</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Analysis Validated
                    </Badge>

                  </div>
                </div>
                <p className="text-xs text-blue-700">Component vulnerability assessment completed using FSFVI methodology</p>
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
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                onClick={() => {
                  if (sessionId) {
                    router.push(`/analysis/${sessionId}/component-vulnerabilities`);
                  } else {
                    alert('Session ID not available - Please upload data first or select a recent session');
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Detailed Analysis
              </Button>
              <Button
                variant="outline"
                onClick={() => runAnalysisStep('vulnerabilities')}
                disabled={step.status === 'running'}
                className="border-gray-300 hover:bg-gray-50"
              >
                <Activity className="w-4 h-4 mr-2" />
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

                        {/* Analysis Framework Display */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-semibold text-blue-900">FSFVI Analysis Framework:</h5>
                <Badge className="bg-green-100 text-green-800 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Calculated
                </Badge>
              </div>
              <p className="text-xs text-blue-800">
                System vulnerability assessment using comprehensive analysis framework
              </p>
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



            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                className="bg-red-600 hover:bg-red-700 text-white flex-1"
                onClick={() => {
                  if (sessionId) {
                    router.push(`/analysis/${sessionId}/system-vulnerability`);
                  } else {
                    alert('Session ID not available');
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Detailed Analysis
              </Button>
              <Button
                variant="outline"
                onClick={() => runAnalysisStep('system_vulnerability')}
                disabled={step.status === 'running'}
                className="border-gray-300 hover:bg-gray-50"
              >
                <Activity className="w-4 h-4 mr-2" />
                Recalculate
              </Button>
            </div>
          </div>
        );
      case 'optimization':
        return (
          <div className="mt-3 space-y-3">
            {/* Optimization Results Summary - Traditional Retrospective Analysis */}
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <h4 className="text-sm font-semibold text-green-900 mb-2">
                Optimal Allocation Analysis: <span className="text-xs font-normal text-green-700">(how budget should have been allocated)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-800">
                    {/* Extract from flattened structure at top level */}
                    {step.results.relative_improvement_percent?.toFixed(1) || 
                     step.results.optimization_results?.relative_improvement_percent?.toFixed(1) || '0.0'}%
                  </div>
                  <div className="text-green-700">FSFVI Improvement</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-800">
                    ${(step.results.total_reallocation_amount || 
                       step.results.optimization_results?.total_reallocation_amount || 0).toFixed(1)}M
                  </div>
                  <div className="text-blue-700">Total Reallocation</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-800">
                    {step.results.budget_utilization_percent?.toFixed(1) || 
                     step.results.efficiency_gain_percent?.toFixed(1) ||
                     step.results.optimization_results?.budget_utilization_percent?.toFixed(1) || 
                     step.results.optimization_results?.efficiency_gain_percent?.toFixed(1) || '0.0'}%
                  </div>
                  <div className="text-purple-700">Budget Utilization</div>
                </div>
              </div>
            </div>

            {/* Optimization Validation */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-semibold text-blue-900">Optimal Allocation Analysis:</h5>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {(step.results.success !== undefined ? step.results.success : step.results.optimization_results?.success) ? 'Converged' : 'Failed'}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-blue-800">
                Shows optimal reallocation of current budget for maximum vulnerability reduction
              </p>
              <div className="mt-2 text-xs text-blue-700">
                ℹ️ This shows how current budget should have been allocated - for new budget planning, use detailed analysis
              </div>
            </div>

            {/* Reallocation Impact Assessment */}
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <h5 className="text-sm font-semibold text-yellow-900 mb-2">Reallocation Potential:</h5>
              <div className="text-xs text-yellow-800">
                {(() => {
                  const improvement = step.results.relative_improvement_percent || 
                                    step.results.optimization_results?.relative_improvement_percent || 0;
                  const reallocation = step.results.reallocation_intensity_percent || 
                                     step.results.optimization_results?.reallocation_intensity_percent || 0;
                  
                  if (improvement > 30) {
                    return `🎯 High-impact reallocation potential: ${improvement.toFixed(1)}% FSFVI improvement achievable with strategic redistribution`;
                  } else if (improvement > 15) {
                    return `📈 Moderate optimization opportunity: ${improvement.toFixed(1)}% improvement with ${reallocation.toFixed(1)}% budget reallocation`;
                  } else if (improvement > 5) {
                    return `🔧 Targeted improvements: ${improvement.toFixed(1)}% FSFVI reduction possible with focused reallocation`;
                  } else {
                    return `📊 Current allocation near-optimal: ${improvement.toFixed(1)}% additional improvement possible`;
                  }
                })()}
              </div>
              <div className="mt-2 text-xs text-blue-700">
                This shows missed opportunities - for new budget planning, use detailed optimization analysis
              </div>
            </div>

            {/* Budget Reallocation Insight */}
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-indigo-900">Reallocation Analysis:</span>
                  <span className="text-indigo-800 ml-2">
                    {(step.results.reallocation_intensity_percent || 
                      step.results.optimization_results?.reallocation_intensity_percent) && 
                      `${(step.results.reallocation_intensity_percent || 
                          step.results.optimization_results?.reallocation_intensity_percent).toFixed(1)}% budget reallocation intensity`
                    }
                  </span>
                </div>
                <div className="text-indigo-700">
                  {(step.results.budget_utilization_percent || 
                    step.results.optimization_results?.budget_utilization_percent) && 
                    `${(step.results.budget_utilization_percent || 
                        step.results.optimization_results?.budget_utilization_percent).toFixed(1)}% budget utilized`
                  }
                </div>
              </div>
              <div className="mt-1 text-xs text-indigo-700">
                📊 Shows optimal reallocation pattern | 💡 For new budget planning, use allocation optimization page
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                onClick={() => {
                  if (sessionId) {
                    router.push(`/analysis/${sessionId}/allocation-optimization`);
                  } else {
                    alert('Session ID not available');
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                Configure New Budget Optimization
              </Button>
              <Button
                variant="outline"
                onClick={() => runAnalysisStep('optimization')}
                disabled={step.status === 'running'}
                className="border-gray-300 hover:bg-gray-50"
              >
                <Activity className="w-4 h-4 mr-2" />
                Re-optimize
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

  // Calculate progress for visual indicator
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <div className="space-y-8">
      {/* Header Card with Progress */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <CardHeader className="pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                FSFVI Analysis Workflow
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                Complete vulnerability analysis for <span className="font-semibold text-indigo-700">{countryName || 'your data'}</span>
              </CardDescription>
              
              {/* Progress Indicator */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Analysis Progress</span>
                  <span className="font-medium">{completedSteps}/{steps.length} steps completed</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={runFullAnalysis} 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Run Full Analysis
              </Button>
              <Button 
                onClick={handleClearSession} 
                variant="outline" 
                disabled={clearingSession}
                className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              >
                {clearingSession ? (
                  <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Clear Session
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Enhanced Steps */}
      <div className="grid gap-6">
        {steps.map((step, index) => (
          <Card 
            key={step.id} 
            className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${
              step.status === 'completed' ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-l-green-500' :
              step.status === 'running' ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-l-4 border-l-blue-500' :
              step.status === 'error' ? 'bg-gradient-to-br from-red-50 to-pink-50 border-l-4 border-l-red-500' :
              'bg-gradient-to-br from-gray-50 to-slate-50 border-l-4 border-l-gray-300'
            }`}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-4">
                {/* Step Number */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
                  step.status === 'completed' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                  step.status === 'running' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                  step.status === 'error' ? 'bg-gradient-to-br from-red-500 to-pink-600' :
                  'bg-gradient-to-br from-gray-400 to-slate-500'
                }`}>
                  {step.status === 'completed' ? <CheckCircle className="w-6 h-6" /> :
                   step.status === 'running' ? <Loader2 className="w-6 h-6 animate-spin" /> :
                   step.status === 'error' ? <AlertCircle className="w-6 h-6" /> :
                   index + 1}
                </div>

                {/* Step Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                    {getStepBadge(step.status)}
                  </div>
                  <p className="text-gray-600">{step.description}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {step.results && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStepExpansion(step.id)}
                      className="hover:bg-white hover:shadow-md"
                    >
                      {expandedSteps.has(step.id) ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                      }
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => runAnalysisStep(step.id)}
                    disabled={step.status === 'running'}
                    className={`${
                      step.status === 'completed' ? 
                        'bg-green-600 hover:bg-green-700 text-white' :
                        'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {step.status === 'running' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : step.status === 'completed' ? (
                      <>
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Re-run
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-1" />
                        Start
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {/* Expanded Results */}
            {expandedSteps.has(step.id) && (
              <CardContent className="pt-0">
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  {renderResults(step)}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Completion Status */}
      {completedSteps === steps.length && (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-green-900 mb-1">Analysis Complete!</h3>
                <p className="text-green-700">
                  All FSFVI analysis steps have been completed successfully. You can now view detailed results in each analysis section.
                </p>
              </div>
              <Button 
                onClick={() => {
                  if (sessionId) {
                    router.push(`/analysis/${sessionId}/system-vulnerability`);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Results
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 