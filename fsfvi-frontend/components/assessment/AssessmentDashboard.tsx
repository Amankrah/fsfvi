/**
 * FSFVI Assessment Dashboard
 * ===========================
 * Main dashboard container for vulnerability assessments
 *
 * CRITICAL: Government-level system where livelihoods depend on accurate
 * vulnerability assessments and policy decisions
 *
 * Pattern Reference: components/performance-gap/PerformanceGapDashboard.tsx
 * Integration: Uses tab-based navigation for different assessment views
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCheck, ListChecks, Target, BarChart3 } from 'lucide-react';
import { AssessmentOverview } from './AssessmentOverview';
import { ComponentInsights } from './ComponentInsights';
import { ActionPriorities } from './ActionPriorities';
import type { WeightingMethod, Scenario } from '@/lib/types/assessment';

type TabValue = 'overview' | 'components' | 'actions';

export function AssessmentDashboard() {
  const [activeTab, setActiveTab] = useState<TabValue>('overview');

  // Centralized assessment configuration state
  const [fiscalYear, setFiscalYear] = useState<number>(2025);
  const [weightingMethod, setWeightingMethod] = useState<WeightingMethod>('hybrid');
  const [scenario, setScenario] = useState<Scenario>('normal_operations');

  const tabs = [
    {
      value: 'overview' as TabValue,
      label: 'Overview',
      icon: BarChart3,
      description: 'System vulnerability summary',
      color: 'from-indigo-600 to-purple-600',
    },
    {
      value: 'components' as TabValue,
      label: 'Components',
      icon: ListChecks,
      description: 'Detailed component analysis',
      color: 'from-purple-600 to-pink-600',
    },
    {
      value: 'actions' as TabValue,
      label: 'Action Priorities',
      icon: Target,
      description: 'Policy recommendations',
      color: 'from-orange-600 to-red-600',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Enhanced Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-700 p-8 shadow-2xl">
        {/* Decorative background blurs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400 opacity-10 rounded-full blur-3xl -ml-48 -mb-48"></div>

        <div className="relative z-10 space-y-4">
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
              <FileCheck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight">
                FSFVI Vulnerability Assessment
              </h1>
              <p className="text-indigo-100 text-lg font-medium mt-1">
                Food System Financial Vulnerability Index Analysis
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
                        activeTab === tab.value ? 'text-white' : 'text-indigo-100'
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
                        activeTab === tab.value ? 'text-gray-600' : 'text-indigo-200'
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
              <span className="font-bold uppercase tracking-wider">GOVERNMENT SYSTEM</span>
              <span className="text-indigo-100">•</span>
              <span className="text-indigo-100">
                Real-time data from national food security database
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

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-0">
          <AssessmentOverview
            fiscalYear={fiscalYear}
            weightingMethod={weightingMethod}
            scenario={scenario}
            onFiscalYearChange={setFiscalYear}
            onWeightingMethodChange={setWeightingMethod}
            onScenarioChange={setScenario}
          />
        </TabsContent>

        {/* Components Tab */}
        <TabsContent value="components" className="mt-0">
          <ComponentInsights
            fiscalYear={fiscalYear}
            weightingMethod={weightingMethod}
            scenario={scenario}
          />
        </TabsContent>

        {/* Action Priorities Tab */}
        <TabsContent value="actions" className="mt-0">
          <ActionPriorities
            fiscalYear={fiscalYear}
            weightingMethod={weightingMethod}
            scenario={scenario}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
