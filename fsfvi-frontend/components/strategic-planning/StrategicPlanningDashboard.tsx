/**
 * FSFVI Strategic Planning Dashboard
 * ====================================
 * Main dashboard container for multi-year budget planning and MTEF generation
 *
 * CRITICAL: Government-level system for national development plans, MTEF submissions,
 * and SDG achievement pathways where fiscal credibility and livelihoods depend on
 * accurate strategic planning
 *
 * Pattern Reference: components/budget-optimization/BudgetOptimizationDashboard.tsx
 * Integration: Uses tab-based navigation for different planning views
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, TrendingUp, Target, LineChart } from 'lucide-react';
import { MultiYearPlan } from './MultiYearPlan';
import { MtefGeneration } from './MtefGeneration';
import { HistoricalTrends } from './HistoricalTrends';

type TabValue = 'multi-year' | 'mtef' | 'trends';

export function StrategicPlanningDashboard() {
  const [activeTab, setActiveTab] = useState<TabValue>('multi-year');

  // Centralized strategic planning configuration state
  const [fiscalYear] = useState<number>(2025);

  const tabs = [
    {
      value: 'multi-year' as TabValue,
      label: 'Multi-Year Plan',
      icon: Target,
      description: '3-5+ year strategic planning',
      color: 'from-blue-600 to-cyan-600',
    },
    {
      value: 'mtef' as TabValue,
      label: 'MTEF',
      icon: Calendar,
      description: '3-year budget framework',
      color: 'from-purple-600 to-pink-600',
    },
    {
      value: 'trends' as TabValue,
      label: 'Historical Trends',
      icon: LineChart,
      description: 'Evidence-based insights',
      color: 'from-green-600 to-emerald-600',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Enhanced Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-700 p-8 shadow-2xl">
        {/* Decorative background blurs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400 opacity-10 rounded-full blur-3xl -ml-48 -mb-48"></div>

        <div className="relative z-10 space-y-4">
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight">
                Strategic Planning
              </h1>
              <p className="text-purple-100 text-lg font-medium mt-1">
                Multi-Year Budget Planning & MTEF Generation
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
                        ? `bg-gradient-to-r ${tab.color} text-white`
                        : 'bg-white/20 text-white group-hover:bg-white/30'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div
                      className={`font-bold transition-colors ${
                        activeTab === tab.value ? 'text-gray-900' : 'text-white'
                      }`}
                    >
                      {tab.label}
                    </div>
                    <div
                      className={`text-sm transition-colors ${
                        activeTab === tab.value ? 'text-gray-600' : 'text-white/70'
                      }`}
                    >
                      {tab.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content Area */}
      <Tabs value={activeTab} className="space-y-8">
        <TabsList className="hidden">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Multi-Year Strategic Plan Tab */}
        <TabsContent value="multi-year" className="space-y-6">
          <MultiYearPlan fiscalYear={fiscalYear} />
        </TabsContent>

        {/* MTEF Generation Tab */}
        <TabsContent value="mtef" className="space-y-6">
          <MtefGeneration fiscalYear={fiscalYear} />
        </TabsContent>

        {/* Historical Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <HistoricalTrends fiscalYear={fiscalYear} />
        </TabsContent>
      </Tabs>

      {/* Government Accountability Notice */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900 mb-1">
              Critical Government Planning System
            </h3>
            <p className="text-sm text-amber-800">
              Strategic plans and MTEF submissions must be validated by Ministry of Finance before
              presentation to Parliament. Budget conservation has been verified to ensure fiscal credibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
