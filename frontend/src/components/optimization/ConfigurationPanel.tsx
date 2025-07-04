import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Info, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, DollarSign } from 'lucide-react';

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
  optimizationMode: 'traditional' | 'new_budget';
  newBudgetAmount?: number;
}

interface PlanningHorizon {
  startYear: number;
  endYear: number;
  budgetGrowth: number;
}

interface SessionInfo {
  country: string;
  fiscal_year: number;
  total_budget: number;
  currency: string;
}

interface BudgetImpactConfig {
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

interface ConfigurationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionInfo: SessionInfo | null;
  optimizationConfig: OptimizationConfig;
  setOptimizationConfig: (config: OptimizationConfig) => void;
  budgetImpactConfig: BudgetImpactConfig;
  setBudgetImpactConfig: (config: BudgetImpactConfig) => void;
  planningHorizon: PlanningHorizon;
}

export default function ConfigurationPanel({
  isOpen,
  onClose,
  sessionInfo,
  optimizationConfig,
  setOptimizationConfig,
  budgetImpactConfig,
  setBudgetImpactConfig,
  planningHorizon
}: ConfigurationPanelProps) {
  const [activeTab, setActiveTab] = useState<'optimization' | 'budget-impact'>('optimization');
  
  // Local state for optimization configuration
  const [tempOptimizationConfig, setTempOptimizationConfig] = useState<OptimizationConfig>(optimizationConfig);
  
  // Local state for budget impact configuration
  const [tempBudgetImpactConfig, setTempBudgetImpactConfig] = useState<BudgetImpactConfig>(budgetImpactConfig);

  // Validation
  useEffect(() => {
    // Validation logic if needed
  }, [optimizationConfig, planningHorizon]);

  const handleSaveConfiguration = () => {
    // Validation for new budget optimization
    if (tempOptimizationConfig.optimizationMode === 'new_budget') {
      if (!tempOptimizationConfig.newBudgetAmount || tempOptimizationConfig.newBudgetAmount <= 0) {
        alert('Please enter a valid new budget amount (greater than 0) for new budget optimization mode.');
        return;
      }
      if (tempOptimizationConfig.newBudgetAmount > 100000) {
        alert('New budget amount seems unreasonably large. Please check the amount (should be in millions USD).');
        return;
      }
    }
    
    setOptimizationConfig(tempOptimizationConfig);
    setBudgetImpactConfig(tempBudgetImpactConfig);
    onClose();
  };

  const handleCancel = () => {
    // Reset to original configs
    setTempOptimizationConfig(optimizationConfig);
    setTempBudgetImpactConfig(budgetImpactConfig);
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount * 1000000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Optimization Configuration</span>
          </DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('optimization')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'optimization'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Optimization Settings</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('budget-impact')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'budget-impact'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Budget Impact Analysis</span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'optimization' && (
            <div className="space-y-6">
              {/* Optimization Mode Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span>Optimization Mode</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        tempOptimizationConfig.optimizationMode === 'traditional' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setTempOptimizationConfig(prev => ({ ...prev, optimizationMode: 'traditional' }))}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center mt-0.5">
                          {tempOptimizationConfig.optimizationMode === 'traditional' && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">Traditional Reallocation</h3>
                          <p className="text-sm text-gray-600">
                            Optimizes reallocation of entire current budget. Shows &ldquo;how money should have been allocated.&rdquo;
                          </p>
                          <div className="mt-2 text-xs text-gray-500">
                            • Retrospective analysis<br/>
                            • Treats all allocations as malleable<br/>
                            • Useful for understanding patterns
                          </div>
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        tempOptimizationConfig.optimizationMode === 'new_budget' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setTempOptimizationConfig(prev => ({ ...prev, optimizationMode: 'new_budget' }))}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center mt-0.5">
                          {tempOptimizationConfig.optimizationMode === 'new_budget' && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">New Budget Optimization</h3>
                          <p className="text-sm text-gray-600">
                            Current allocations are fixed. Optimizes allocation of new budget for maximum impact.
                          </p>
                          <div className="mt-2 text-xs text-gray-500">
                            • Prospective planning<br/>
                            • Realistic for government budgeting<br/>
                            • Focuses on new investments
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* New Budget Amount Configuration */}
                  {tempOptimizationConfig.optimizationMode === 'new_budget' && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <Label className="text-sm font-medium text-green-900">
                        New Budget Amount (Million USD)
                      </Label>
                      <div className="mt-2 space-y-2">
                        <Input
                          type="number"
                          placeholder="Enter new budget amount"
                          value={tempOptimizationConfig.newBudgetAmount || ''}
                          onChange={(e) => setTempOptimizationConfig(prev => ({ 
                            ...prev, 
                            newBudgetAmount: parseFloat(e.target.value) || 0 
                          }))}
                          className="bg-white"
                        />
                        <div className="flex items-center space-x-2 text-sm text-green-700">
                          <Info className="w-4 h-4" />
                          <span>
                            Current budget: {formatCurrency(sessionInfo?.total_budget || 2900)}
                            {tempOptimizationConfig.newBudgetAmount && (
                              <span className="ml-2">
                                → Total: {formatCurrency((sessionInfo?.total_budget || 2900) + tempOptimizationConfig.newBudgetAmount)}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rest of optimization configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="method">Optimization Method</Label>
                      <select
                        id="method"
                        aria-label="Optimization Method"
                        value={tempOptimizationConfig.method}
                        onChange={(e) => setTempOptimizationConfig(prev => ({ ...prev, method: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="hybrid">Hybrid (Recommended)</option>
                        <option value="mathematical">Mathematical</option>
                        <option value="gradient">Gradient-based</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="scenario">Scenario</Label>
                      <select
                        id="scenario"
                        aria-label="Scenario"
                        value={tempOptimizationConfig.scenario}
                        onChange={(e) => setTempOptimizationConfig(prev => ({ ...prev, scenario: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="baseline">Baseline</option>
                        <option value="aggressive">Aggressive</option>
                        <option value="conservative">Conservative</option>
                        <option value="balanced">Balanced</option>
                      </select>
                    </div>
                  </div>

                  {/* Traditional mode specific settings */}
                  {tempOptimizationConfig.optimizationMode === 'traditional' && (
                    <div>
                      <Label htmlFor="budgetChange">Budget Change Percentage</Label>
                      <Input
                        id="budgetChange"
                        type="number"
                        placeholder="0.0"
                        value={tempOptimizationConfig.budgetChange}
                        onChange={(e) => setTempOptimizationConfig(prev => ({ 
                          ...prev, 
                          budgetChange: parseFloat(e.target.value) || 0 
                        }))}
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        Percentage change in total budget (positive for increase, negative for decrease)
                      </p>
                    </div>
                  )}

                  {/* Constraints */}
                  <div>
                    <Label className="text-base font-medium">Constraints</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div>
                        <Label htmlFor="minAllocation" className="text-sm">Min Allocation (%)</Label>
                        <Input
                          id="minAllocation"
                          type="number"
                          placeholder="0"
                          value={tempOptimizationConfig.constraints.minAllocation}
                          onChange={(e) => setTempOptimizationConfig(prev => ({
                            ...prev,
                            constraints: { ...prev.constraints, minAllocation: parseFloat(e.target.value) || 0 }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxAllocation" className="text-sm">Max Allocation (%)</Label>
                        <Input
                          id="maxAllocation"
                          type="number"
                          placeholder="100"
                          value={tempOptimizationConfig.constraints.maxAllocation}
                          onChange={(e) => setTempOptimizationConfig(prev => ({
                            ...prev,
                            constraints: { ...prev.constraints, maxAllocation: parseFloat(e.target.value) || 100 }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="transitionLimit" className="text-sm">Transition Limit (%)</Label>
                        <Input
                          id="transitionLimit"
                          type="number"
                          placeholder="50"
                          value={tempOptimizationConfig.constraints.transitionLimit}
                          onChange={(e) => setTempOptimizationConfig(prev => ({
                            ...prev,
                            constraints: { ...prev.constraints, transitionLimit: parseFloat(e.target.value) || 50 }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'budget-impact' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span>Budget Impact Analysis Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="baseBudget">Base Budget (Million USD)</Label>
                      <Input
                        id="baseBudget"
                        type="number"
                        placeholder={sessionInfo?.total_budget?.toString() || "2900"}
                        value={tempBudgetImpactConfig.baseBudget || ''}
                        onChange={(e) => setTempBudgetImpactConfig(prev => ({ 
                          ...prev, 
                          baseBudget: parseFloat(e.target.value) || 0 
                        }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="methodBI">Analysis Method</Label>
                      <select
                        id="methodBI"
                        aria-label="Budget Impact Analysis Method"
                        value={tempBudgetImpactConfig.method}
                        onChange={(e) => setTempBudgetImpactConfig(prev => ({ ...prev, method: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="hybrid">Hybrid</option>
                        <option value="mathematical">Mathematical</option>
                        <option value="gradient">Gradient-based</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="budgetVariations">Budget Variations (Million USD)</Label>
                    <Input
                      id="budgetVariations"
                      type="text"
                      placeholder="100, 200, 300, 400, 500"
                      value={tempBudgetImpactConfig.budgetVariations.join(', ')}
                      onChange={(e) => setTempBudgetImpactConfig(prev => ({ 
                        ...prev, 
                        budgetVariations: e.target.value.split(',').map(v => parseFloat(v.trim()) || 0).filter(v => v > 0)
                      }))}
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Comma-separated values for budget sensitivity analysis
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="scenarioBI">Scenario</Label>
                    <select
                      id="scenarioBI"
                      aria-label="Budget Impact Scenario"
                      value={tempBudgetImpactConfig.scenario}
                      onChange={(e) => setTempBudgetImpactConfig(prev => ({ ...prev, scenario: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="baseline">Baseline</option>
                      <option value="aggressive">Aggressive</option>
                      <option value="conservative">Conservative</option>
                      <option value="balanced">Balanced</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Constraints</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div>
                        <Label htmlFor="minAllocationBI" className="text-sm">Min Allocation</Label>
                        <Input
                          id="minAllocationBI"
                          type="number"
                          placeholder="0"
                          value={tempBudgetImpactConfig.constraints.minAllocation}
                          onChange={(e) => setTempBudgetImpactConfig(prev => ({
                            ...prev,
                            constraints: { ...prev.constraints, minAllocation: parseFloat(e.target.value) || 0 }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxAllocationBI" className="text-sm">Max Allocation</Label>
                        <Input
                          id="maxAllocationBI"
                          type="number"
                          placeholder="1000"
                          value={tempBudgetImpactConfig.constraints.maxAllocation}
                          onChange={(e) => setTempBudgetImpactConfig(prev => ({
                            ...prev,
                            constraints: { ...prev.constraints, maxAllocation: parseFloat(e.target.value) || 1000 }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="transitionLimitBI" className="text-sm">Transition Limit</Label>
                        <Input
                          id="transitionLimitBI"
                          type="number"
                          placeholder="50"
                          value={tempBudgetImpactConfig.constraints.transitionLimit}
                          onChange={(e) => setTempBudgetImpactConfig(prev => ({
                            ...prev,
                            constraints: { ...prev.constraints, transitionLimit: parseFloat(e.target.value) || 50 }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="border-t my-4" />

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSaveConfiguration}>
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 