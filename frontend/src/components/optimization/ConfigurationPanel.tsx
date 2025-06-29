import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, AlertTriangle, CheckCircle, Info, Calendar, Target, Shield } from 'lucide-react';

interface OptimizationConfig {
  method: string;
  scenario: string;
  budgetChange: number;
  targetFsfvi?: number;
  targetYear?: number;
  constraints: {
    minAllocation: number;
    maxAllocation: number;
    transitionLimit: number;
  };
}

interface PlanningScenario {
  name: string;
  description: string;
  enabled: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface PlanningHorizon {
  startYear: number;
  endYear: number;
  budgetGrowth: number;
}

interface ConfigurationPanelProps {
  optimizationConfig: OptimizationConfig;
  planningHorizon: PlanningHorizon;
  onConfigChange: (config: OptimizationConfig) => void;
  onPlanningHorizonChange: (horizon: PlanningHorizon) => void;
  scenarios?: PlanningScenario[];
  analysisType?: string;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  optimizationConfig,
  planningHorizon,
  onConfigChange,
  onPlanningHorizonChange,
  scenarios = [
    { name: 'normal_operations', description: 'Normal Operations', enabled: true, severity: 'low' },
    { name: 'climate_shock', description: 'Climate Crisis', enabled: true, severity: 'high' },
    { name: 'financial_crisis', description: 'Economic Downturn', enabled: true, severity: 'high' },
    { name: 'pandemic_disruption', description: 'Health Emergency', enabled: true, severity: 'critical' },
    { name: 'cyber_threats', description: 'Cyber Security Crisis', enabled: true, severity: 'medium' }
  ],
  analysisType = 'optimization'
}) => {
  const [activeSection, setActiveSection] = useState<string>('basic');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Validation
  useEffect(() => {
    const errors: string[] = [];
    
    if (optimizationConfig.targetFsfvi && (optimizationConfig.targetFsfvi < 0 || optimizationConfig.targetFsfvi > 1)) {
      errors.push('Target FSFVI must be between 0 and 1');
    }
    
    if (optimizationConfig.targetYear && optimizationConfig.targetYear < new Date().getFullYear()) {
      errors.push('Target year must be in the future');
    }
    
    if (planningHorizon.startYear >= planningHorizon.endYear) {
      errors.push('Planning end year must be after start year');
    }
    
    if (optimizationConfig.constraints.minAllocation >= optimizationConfig.constraints.maxAllocation) {
      errors.push('Maximum allocation must be greater than minimum allocation');
    }
    
    setValidationErrors(errors);
  }, [optimizationConfig, planningHorizon]);

  const updateConfig = (updates: Partial<OptimizationConfig>) => {
    onConfigChange({ ...optimizationConfig, ...updates });
  };

  const updateConstraints = (constraintUpdates: Partial<OptimizationConfig['constraints']>) => {
    onConfigChange({
      ...optimizationConfig,
      constraints: { ...optimizationConfig.constraints, ...constraintUpdates }
    });
  };

  const updatePlanningHorizon = (updates: Partial<PlanningHorizon>) => {
    onPlanningHorizonChange({ ...planningHorizon, ...updates });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const configSections = [
    { id: 'basic', name: 'Basic Settings', icon: Settings, description: 'Core analysis parameters' },
    { id: 'scenarios', name: 'Crisis Scenarios', icon: Shield, description: 'Risk assessment settings' },
    { id: 'targets', name: 'Target Settings', icon: Target, description: 'Performance objectives' },
    { id: 'constraints', name: 'Constraints', icon: AlertTriangle, description: 'Allocation limits' },
    { id: 'planning', name: 'Multi-Year Planning', icon: Calendar, description: 'Long-term horizon' }
  ];

  const isRelevantSection = (sectionId: string) => {
    switch (analysisType) {
      case 'multi-year':
        return ['basic', 'targets', 'constraints', 'planning'].includes(sectionId);
      case 'scenario-comparison':
        return ['basic', 'scenarios', 'constraints'].includes(sectionId);
      case 'target-based':
        return ['basic', 'targets', 'constraints'].includes(sectionId);
      case 'budget-sensitivity':
        return ['basic', 'constraints'].includes(sectionId);
      default:
        return ['basic', 'constraints'].includes(sectionId);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Analysis Configuration</span>
          {validationErrors.length > 0 && (
            <Badge className="bg-red-100 text-red-800 ml-2">
              {validationErrors.length} error{validationErrors.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
        
        {/* Analysis Type Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Configuration for: {analysisType?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-900">Configuration Issues</span>
            </div>
            <ul className="text-sm text-red-800 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Section Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {configSections.filter(section => isRelevantSection(section.id)).map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{section.name}</span>
              </button>
            );
          })}
        </div>

        {/* Section Content */}
        {activeSection === 'basic' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Analysis Foundation</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="analysis-method" className="block text-sm font-medium text-gray-700 mb-2">
                  Weighting Method
                </label>
                <select 
                  id="analysis-method"
                  value={optimizationConfig.method} 
                  onChange={(e) => updateConfig({ method: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  aria-label="Select analysis method"
                >
                  <option value="hybrid">Hybrid Weighting (Recommended)</option>
                  <option value="expert">Expert Knowledge</option>
                  <option value="network">Network Analysis</option>
                  <option value="financial">Financial Proportional</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Hybrid combines multiple weighting approaches for optimal results
                </p>
              </div>

              <div>
                <label htmlFor="base-scenario" className="block text-sm font-medium text-gray-700 mb-2">
                  Base Scenario
                </label>
                <select 
                  id="base-scenario"
                  value={optimizationConfig.scenario} 
                  onChange={(e) => updateConfig({ scenario: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  aria-label="Select base scenario"
                >
                  {scenarios.map(scenario => (
                    <option key={scenario.name} value={scenario.name}>
                      {scenario.description}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Context for optimization analysis
                </p>
              </div>
            </div>

            {/* Budget Change Slider */}
            <div>
              <label htmlFor="budget-change" className="block text-sm font-medium text-gray-700 mb-2">
                Budget Change: {optimizationConfig.budgetChange > 0 ? '+' : ''}{optimizationConfig.budgetChange}%
              </label>
              <input
                id="budget-change"
                type="range"
                min="-30"
                max="50"
                step="1"
                value={optimizationConfig.budgetChange}
                onChange={(e) => updateConfig({ budgetChange: parseInt(e.target.value) })}
                className="w-full"
                aria-label="Budget change percentage"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>-30% (Austerity)</span>
                <span>0% (Current)</span>
                <span>+50% (Expansion)</span>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'scenarios' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Crisis Scenario Assessment</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scenarios.map(scenario => (
                <div key={scenario.name} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{scenario.description}</span>
                    <Badge className={`text-xs ${getSeverityColor(scenario.severity || 'medium')}`}>
                      {scenario.severity || 'medium'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">
                    {scenario.name === 'normal_operations' && 'Baseline operating conditions'}
                    {scenario.name === 'climate_shock' && 'Extreme weather events, droughts, floods'}
                    {scenario.name === 'financial_crisis' && 'Economic recession, currency devaluation'}
                    {scenario.name === 'pandemic_disruption' && 'Health emergencies, supply chain disruption'}
                    {scenario.name === 'cyber_threats' && 'Digital infrastructure attacks, data breaches'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'targets' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Performance Targets</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="target-fsfvi" className="block text-sm font-medium text-gray-700 mb-2">
                  Target FSFVI Score
                </label>
                <input 
                  id="target-fsfvi"
                  type="number" 
                  step="0.001"
                  min="0"
                  max="1"
                  value={optimizationConfig.targetFsfvi || ''} 
                  onChange={(e) => updateConfig({ 
                    targetFsfvi: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="e.g., 0.015"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  aria-label="Target FSFVI score"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower scores indicate better performance (0 = perfect, 1 = maximum vulnerability)
                </p>
              </div>

              <div>
                <label htmlFor="target-year" className="block text-sm font-medium text-gray-700 mb-2">
                  Target Achievement Year
                </label>
                <input 
                  id="target-year"
                  type="number" 
                  min={new Date().getFullYear()}
                  max={new Date().getFullYear() + 20}
                  value={optimizationConfig.targetYear || ''} 
                  onChange={(e) => updateConfig({ 
                    targetYear: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  placeholder={`e.g., ${new Date().getFullYear() + 3}`}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  aria-label="Target year for achievement"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Year by which target should be achieved
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'constraints' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Allocation Constraints</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="min-allocation" className="block text-sm font-medium text-gray-700 mb-2">
                  Min Allocation (%)
                </label>
                <input
                  id="min-allocation"
                  type="number"
                  min="0"
                  max="50"
                  value={optimizationConfig.constraints.minAllocation}
                  onChange={(e) => updateConstraints({ minAllocation: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  aria-label="Minimum allocation percentage per component"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum budget share per component
                </p>
              </div>

              <div>
                <label htmlFor="max-allocation" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Allocation (%)
                </label>
                <input
                  id="max-allocation"
                  type="number"
                  min="10"
                  max="100"
                  value={optimizationConfig.constraints.maxAllocation}
                  onChange={(e) => updateConstraints({ maxAllocation: parseFloat(e.target.value) || 100 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  aria-label="Maximum allocation percentage per component"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum budget share per component
                </p>
              </div>

              <div>
                <label htmlFor="transition-limit" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Year-over-Year Change (%)
                </label>
                <input
                  id="transition-limit"
                  type="number"
                  min="0"
                  max="100"
                  value={optimizationConfig.constraints.transitionLimit}
                  onChange={(e) => updateConstraints({ transitionLimit: parseFloat(e.target.value) || 30 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  aria-label="Maximum year-over-year allocation change"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Limits dramatic budget shifts
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Constraint Guidelines</span>
              </div>
              <p className="text-xs text-yellow-800 mt-1">
                Conservative constraints (10-40% max allocation, 15% transition limit) provide stability. 
                Aggressive constraints (up to 60% allocation, 50% transition) allow rapid transformation.
              </p>
            </div>
          </div>
        )}

        {activeSection === 'planning' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Multi-Year Planning Horizon</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="planning-start" className="block text-sm font-medium text-gray-700 mb-2">
                  Planning Start Year
                </label>
                <input
                  id="planning-start"
                  type="number"
                  min={new Date().getFullYear()}
                  max={new Date().getFullYear() + 5}
                  value={planningHorizon.startYear}
                  onChange={(e) => updatePlanningHorizon({ startYear: parseInt(e.target.value) || new Date().getFullYear() })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  aria-label="Planning start year"
                />
              </div>
              
              <div>
                <label htmlFor="planning-end" className="block text-sm font-medium text-gray-700 mb-2">
                  Planning End Year
                </label>
                <input
                  id="planning-end"
                  type="number"
                  min={planningHorizon.startYear + 1}
                  max={new Date().getFullYear() + 20}
                  value={planningHorizon.endYear}
                  onChange={(e) => updatePlanningHorizon({ endYear: parseInt(e.target.value) || new Date().getFullYear() + 5 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  aria-label="Planning end year"
                />
              </div>
              
              <div>
                <label htmlFor="budget-growth" className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Budget Growth (%)
                </label>
                <input
                  id="budget-growth"
                  type="number"
                  step="0.1"
                  min="-10"
                  max="20"
                  value={planningHorizon.budgetGrowth}
                  onChange={(e) => updatePlanningHorizon({ budgetGrowth: parseFloat(e.target.value) || 3 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  aria-label="Annual budget growth percentage"
                />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Planning Summary</span>
              </div>
              <p className="text-xs text-green-800 mt-1">
                {planningHorizon.endYear - planningHorizon.startYear + 1} year planning horizon 
                ({planningHorizon.startYear}-{planningHorizon.endYear}) with {planningHorizon.budgetGrowth}% annual growth
              </p>
            </div>
          </div>
        )}

        {/* Configuration Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Configuration Status</span>
            <div className="flex items-center space-x-2">
              {validationErrors.length === 0 ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Ready for Analysis</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600">Requires Attention</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 