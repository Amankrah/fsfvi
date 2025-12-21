/**
 * Performance Gap Dashboard
 * ==========================
 * Main container for all performance gap analysis features
 * Professional government-level UI for critical decision making
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Target, Users, Activity } from 'lucide-react';

import { PerformanceGapAnalysis } from './PerformanceGapAnalysis';
import { PeerComparison } from './PeerComparison';
import { GapClosureTracking } from './GapClosureTracking';
import { TargetRecommendations } from './TargetRecommendations';

type TabValue = 'analysis' | 'peers' | 'tracking' | 'targets';

export function PerformanceGapDashboard() {
  const [activeTab, setActiveTab] = useState<TabValue>('analysis');

  const tabs = [
    {
      value: 'analysis' as TabValue,
      label: 'Gap Analysis',
      icon: BarChart3,
      description: 'Identify performance gaps',
      color: 'from-blue-600 to-indigo-600',
    },
    {
      value: 'peers' as TabValue,
      label: 'Peer Comparison',
      icon: Users,
      description: 'Compare with regional peers',
      color: 'from-purple-600 to-pink-600',
    },
    {
      value: 'tracking' as TabValue,
      label: 'Progress Tracking',
      icon: TrendingUp,
      description: 'Track gap closure over time',
      color: 'from-indigo-600 to-purple-600',
    },
    {
      value: 'targets' as TabValue,
      label: 'Target Planning',
      icon: Target,
      description: 'Set evidence-based targets',
      color: 'from-emerald-600 to-green-600',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 shadow-2xl">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -ml-32 -mb-32"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
              <Activity className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight">
                Performance Gap Analysis
              </h1>
              <p className="text-blue-100 text-lg font-medium mt-1">
                Evidence-based insights for strategic government decision making
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-6">
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
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      activeTab === tab.value
                        ? `bg-gradient-to-br ${tab.color}`
                        : 'bg-white/20'
                    }`}
                  >
                    <tab.icon
                      className={`h-5 w-5 ${
                        activeTab === tab.value ? 'text-white' : 'text-blue-100'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-bold text-sm ${
                        activeTab === tab.value ? 'text-gray-900' : 'text-white'
                      }`}
                    >
                      {tab.label}
                    </div>
                    <div
                      className={`text-xs mt-0.5 truncate ${
                        activeTab === tab.value ? 'text-gray-600' : 'text-blue-200'
                      }`}
                    >
                      {tab.description}
                    </div>
                  </div>
                </div>
                {activeTab === tab.value && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        {/* Hidden native TabsList - we use custom buttons above */}
        <TabsList className="hidden">
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="peers">Peers</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="mt-0">
          <PerformanceGapAnalysis />
        </TabsContent>

        <TabsContent value="peers" className="mt-0">
          <PeerComparison />
        </TabsContent>

        <TabsContent value="tracking" className="mt-0">
          <GapClosureTracking />
        </TabsContent>

        <TabsContent value="targets" className="mt-0">
          <TargetRecommendations />
        </TabsContent>
      </Tabs>
    </div>
  );
}
