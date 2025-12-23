/**
 * FSFVI Budget Optimization Dashboard
 * =====================================
 * Main dashboard container for budget optimization and resource allocation
 *
 * CRITICAL: Government-level system where livelihoods depend on optimal
 * resource allocation decisions for food security
 *
 * Pattern Reference: components/assessment/AssessmentDashboard.tsx
 * Integration: Uses tab-based navigation for different optimization views
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Target, Zap } from 'lucide-react';
import { AllocationEfficiency } from './AllocationEfficiency';
import { ReallocationPlan } from './ReallocationPlan';
import { OptimizationResults } from './OptimizationResults';
import type { OptimizationObjectiveString } from '@/lib/types/budgetOptimization';

type TabValue = 'efficiency' | 'plan' | 'optimize';

export function BudgetOptimizationDashboard() {
  const [activeTab, setActiveTab] = useState<TabValue>('efficiency');

  // Centralized budget optimization configuration state
  const [fiscalYear, setFiscalYear] = useState<number>(2025);
  const [objective, setObjective] = useState<OptimizationObjectiveString>('minimize_fsfvi');

  const tabs = [
    {
      value: 'efficiency' as TabValue,
      label: 'Allocation Efficiency',
      icon: TrendingUp,
      description: 'Analyze current budget efficiency',
      color: 'from-blue-600 to-cyan-600',
    },
    {
      value: 'plan' as TabValue,
      label: 'Reallocation Plan',
      icon: Target,
      description: 'Implementation roadmap',
      color: 'from-purple-600 to-pink-600',
    },
    {
      value: 'optimize' as TabValue,
      label: 'Optimize',
      icon: Zap,
      description: 'Mathematical optimization',
      color: 'from-orange-600 to-red-600',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Enhanced Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 shadow-2xl">
        {/* Decorative background blurs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400 opacity-10 rounded-full blur-3xl -ml-48 -mb-48"></div>

        <div className="relative z-10 space-y-4">
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight">
                Budget Optimization
              </h1>
              <p className="text-blue-100 text-lg font-medium mt-1">
                Strategic Resource Allocation for Food Security
              </p>
            </div>
          </div>

          {/* Custom Tab Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`group relative overflow-hidden rounded-xl p-4 text-left transition-all duration-300 ${
                  activeTab === tab.value
                    ? 'bg-white shadow-xl scale-105'
                    : 'bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:scale-102'
                }`}
              >
                {/* Active indicator */}
                {activeTab === tab.value && (
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.color}`}></div>
                )}

                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      activeTab === tab.value
                        ? `bg-gradient-to-br ${tab.color}`
                        : 'bg-white/20'
                    }`}
                  >
                    <tab.icon
                      className={`h-5 w-5 transition-colors duration-300 ${
                        activeTab === tab.value ? 'text-white' : 'text-blue-100'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-bold text-sm transition-colors duration-300 ${
                        activeTab === tab.value ? 'text-gray-900' : 'text-white'
                      }`}
                    >
                      {tab.label}
                    </div>
                    <div
                      className={`text-xs mt-0.5 truncate transition-colors duration-300 ${
                        activeTab === tab.value ? 'text-gray-600' : 'text-blue-200'
                      }`}
                    >
                      {tab.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Government Warning Banner */}
          <div className="mt-4 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
            <p className="text-sm text-white font-medium flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="font-bold uppercase tracking-wider">CRITICAL SYSTEM</span>
              <span className="text-blue-100">•</span>
              <span className="text-blue-100">
                Budget decisions impact millions of livelihoods
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Content Area - Radix UI Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        {/* Hidden default TabsList (using custom tabs above) */}
        <TabsList className="hidden">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Allocation Efficiency Tab */}
        <TabsContent value="efficiency" className="mt-0">
          <AllocationEfficiency
            fiscalYear={fiscalYear}
            onFiscalYearChange={setFiscalYear}
          />
        </TabsContent>

        {/* Reallocation Plan Tab */}
        <TabsContent value="plan" className="mt-0">
          <ReallocationPlan
            fiscalYear={fiscalYear}
            onFiscalYearChange={setFiscalYear}
          />
        </TabsContent>

        {/* Optimization Results Tab */}
        <TabsContent value="optimize" className="mt-0">
          <OptimizationResults
            fiscalYear={fiscalYear}
            objective={objective}
            onFiscalYearChange={setFiscalYear}
            onObjectiveChange={setObjective}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
