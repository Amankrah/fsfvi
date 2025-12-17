'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Globe,
  ArrowLeft,
  TrendingUp,
  BarChart3,
  Target,
  AlertCircle,
  DollarSign,
  Users,
  Leaf,
  ShoppingCart,
  Scale,
  Info,
  Sparkles,
  ArrowRight,
  Calendar,
  LineChart,
  Shield,
  CheckCircle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DemoPage() {
  const [selectedCountry] = useState('Sample Country');

  // Mock data for demonstration
  const performanceData = [
    {
      component: 'Agricultural Productivity',
      score: 72,
      benchmark: 85,
      gap: -13,
      funding: 450000000,
      icon: Leaf,
      color: 'emerald'
    },
    {
      component: 'Nutrition & Food Security',
      score: 65,
      benchmark: 80,
      gap: -15,
      funding: 280000000,
      icon: Users,
      color: 'teal'
    },
    {
      component: 'Climate Resilience',
      score: 58,
      benchmark: 75,
      gap: -17,
      funding: 150000000,
      icon: AlertCircle,
      color: 'rose'
    },
    {
      component: 'Market Infrastructure',
      score: 70,
      benchmark: 80,
      gap: -10,
      funding: 320000000,
      icon: ShoppingCart,
      color: 'purple'
    },
    {
      component: 'Governance & Policy',
      score: 75,
      benchmark: 85,
      gap: -10,
      funding: 180000000,
      icon: Scale,
      color: 'amber'
    },
  ];

  const financialFlows = {
    government: 850000000,
    donors: 380000000,
    privateSector: 150000000,
    total: 1380000000
  };

  const fsfiIndex = {
    overall: 68,
    vulnerabilityScore: 32,
    fundingEfficiency: 74,
    priorityAlignment: 71
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    if (score >= 60) return 'text-amber-700 bg-amber-100 border-amber-200';
    return 'text-rose-700 bg-rose-100 border-rose-200';
  };

  const getColorClass = (color: string, type: 'bg' | 'text' | 'border'): string => {
    const colorMap: Record<string, Record<string, string>> = {
      emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-500' },
      teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-500' },
      rose: { bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-500' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-500' },
      amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-500' },
    };
    return colorMap[color]?.[type] || '';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-b border-gray-100">
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-emerald-600 transition-colors mb-6 font-medium">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>

          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl shadow-lg">
                    <Globe className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">FSFI Platform Demo</h1>
                    <p className="text-gray-600 text-lg">Food Systems Financial Intelligence Dashboard</p>
                  </div>
                </div>
                <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-600 mb-1">Demo Country</p>
                  <p className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{selectedCountry}</p>
                </div>
              </div>

              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-white p-2 rounded-lg shadow-sm mr-4">
                      <Info className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="text-sm text-gray-700">
                      <p className="font-bold text-emerald-900 mb-2 text-base">Interactive Demo Dashboard</p>
                      <p className="leading-relaxed">
                        This dashboard demonstrates the full capabilities of the FSFI platform. In a custom deployment,
                        all data would be sourced from your country's actual systems, integrated with your government's
                        authentication, and hosted securely within your infrastructure to ensure complete data sovereignty.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          {/* FSFI Index Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white border-0 shadow-xl hover:shadow-2xl transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium opacity-90">FSFI Index</CardTitle>
                  <Sparkles className="h-4 w-4 opacity-75" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold mb-1">{fsfiIndex.overall}</div>
                <p className="text-sm opacity-90">out of 100 points</p>
                <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
                  <div className="bg-white h-full rounded-full" style={{ width: `${fsfiIndex.overall}%` }} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-rose-100 hover:border-rose-200 hover:shadow-lg transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-rose-500" />
                  Vulnerability Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-rose-600 mb-1">{fsfiIndex.vulnerabilityScore}%</div>
                <p className="text-sm text-gray-600">High priority areas</p>
                <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${fsfiIndex.vulnerabilityScore}%` }} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-100 hover:border-emerald-200 hover:shadow-lg transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-emerald-500" />
                  Funding Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-emerald-600 mb-1">{fsfiIndex.fundingEfficiency}%</div>
                <p className="text-sm text-gray-600">Resource utilization</p>
                <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${fsfiIndex.fundingEfficiency}%` }} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-teal-100 hover:border-teal-200 hover:shadow-lg transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Target className="h-4 w-4 mr-2 text-teal-500" />
                  Priority Alignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-teal-600 mb-1">{fsfiIndex.priorityAlignment}%</div>
                <p className="text-sm text-gray-600">Strategic coherence</p>
                <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${fsfiIndex.priorityAlignment}%` }} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="performance" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 bg-gray-100">
              <TabsTrigger value="performance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3">
                <BarChart3 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Performance</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3">
                <DollarSign className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Financial Flows</span>
              </TabsTrigger>
              <TabsTrigger value="analysis" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Vulnerability</span>
              </TabsTrigger>
              <TabsTrigger value="scenarios" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3">
                <Target className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Scenarios</span>
              </TabsTrigger>
            </TabsList>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              <Card className="border-2 border-gray-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
                  <CardTitle className="flex items-center text-xl">
                    <BarChart3 className="h-5 w-5 mr-2 text-emerald-600" />
                    Food System Component Assessment
                  </CardTitle>
                  <CardDescription className="text-base">
                    Performance vs. benchmarks (CAADP, SDGs, HLPE, AfDB, World Bank, ReSAKSS)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {performanceData.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="group border-2 border-gray-100 rounded-xl p-6 hover:border-emerald-200 hover:shadow-xl transition-all duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                          <div className="flex items-center mb-4 sm:mb-0">
                            <div className={`w-12 h-12 rounded-xl ${getColorClass(item.color, 'bg')} flex items-center justify-center mr-4 shadow-sm group-hover:scale-110 transition-transform`}>
                              <Icon className={`h-6 w-6 ${getColorClass(item.color, 'text')}`} />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-lg">{item.component}</h4>
                              <p className="text-sm text-gray-600">Current allocation: {formatCurrency(item.funding)}</p>
                            </div>
                          </div>
                          <div className={`px-6 py-3 rounded-xl font-bold text-2xl border-2 ${getScoreColor(item.score)}`}>
                            {item.score}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-gray-600 mb-1">Current Score</p>
                            <p className="font-bold text-gray-900 text-lg">{item.score}/100</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-gray-600 mb-1">Benchmark Target</p>
                            <p className="font-bold text-gray-900 text-lg">{item.benchmark}/100</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-gray-600 mb-1">Performance Gap</p>
                            <p className={`font-bold text-lg ${item.gap < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {item.gap} points
                            </p>
                          </div>
                        </div>
                        <div className="bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                          <div
                            className={`h-full bg-gradient-to-r from-${item.color}-400 to-${item.color}-600 rounded-full transition-all duration-500`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financial Flows Tab */}
            <TabsContent value="financial" className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-2 border-emerald-100 hover:border-emerald-200 hover:shadow-xl transition-all">
                  <CardHeader className="bg-gradient-to-br from-emerald-50 to-white">
                    <CardTitle className="flex items-center text-emerald-700">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Government
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {formatCurrency(financialFlows.government)}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {((financialFlows.government / financialFlows.total) * 100).toFixed(1)}% of total
                    </p>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(financialFlows.government / financialFlows.total) * 100}%` }} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-teal-100 hover:border-teal-200 hover:shadow-xl transition-all">
                  <CardHeader className="bg-gradient-to-br from-teal-50 to-white">
                    <CardTitle className="flex items-center text-teal-700">
                      <Users className="h-5 w-5 mr-2" />
                      Donors
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {formatCurrency(financialFlows.donors)}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {((financialFlows.donors / financialFlows.total) * 100).toFixed(1)}% of total
                    </p>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-teal-500 h-full rounded-full" style={{ width: `${(financialFlows.donors / financialFlows.total) * 100}%` }} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-100 hover:border-purple-200 hover:shadow-xl transition-all sm:col-span-2 lg:col-span-1">
                  <CardHeader className="bg-gradient-to-br from-purple-50 to-white">
                    <CardTitle className="flex items-center text-purple-700">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Private Sector
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {formatCurrency(financialFlows.privateSector)}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {((financialFlows.privateSector / financialFlows.total) * 100).toFixed(1)}% of total
                    </p>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full" style={{ width: `${(financialFlows.privateSector / financialFlows.total) * 100}%` }} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-2 border-gray-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
                  <CardTitle className="flex items-center text-xl">
                    <DollarSign className="h-5 w-5 mr-2 text-teal-600" />
                    3FS Financial Flow Mapping
                  </CardTitle>
                  <CardDescription className="text-base">
                    Disaggregated financial flows mapped to food system components
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {performanceData.map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all">
                        <div className="flex-1 mb-3 sm:mb-0">
                          <div className="flex items-center mb-2">
                            <div className={`w-8 h-8 rounded-lg ${getColorClass(item.color, 'bg')} flex items-center justify-center mr-3`}>
                              <div className={`w-3 h-3 rounded-full bg-gradient-to-br from-${item.color}-500 to-${item.color}-600`} />
                            </div>
                            <p className="font-bold text-gray-900">{item.component}</p>
                          </div>
                          <div className="bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                            <div
                              className={`h-full bg-gradient-to-r from-${item.color}-400 to-${item.color}-600 rounded-full`}
                              style={{ width: `${(item.funding / financialFlows.total) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="sm:ml-6 sm:text-right">
                          <p className="text-xl font-bold text-gray-900">{formatCurrency(item.funding)}</p>
                          <p className="text-sm text-gray-600 font-medium">
                            {((item.funding / financialFlows.total) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-6 border-t-2 border-gray-100">
                    <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-xl border-2 border-emerald-100">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Financial Flows</p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{formatCurrency(financialFlows.total)}</p>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm">
                        <DollarSign className="h-8 w-8 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vulnerability Analysis Tab */}
            <TabsContent value="analysis" className="space-y-6">
              <Card className="border-2 border-gray-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
                  <CardTitle className="flex items-center text-xl">
                    <Target className="h-5 w-5 mr-2 text-rose-600" />
                    Investment Priority Ranking
                  </CardTitle>
                  <CardDescription className="text-base">
                    Based on performance gaps, funding levels, and sensitivity analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {[...performanceData]
                    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
                    .map((item, idx) => (
                      <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 border-l-4 ${getColorClass(item.color, 'border')} bg-gradient-to-r from-gray-50 to-white rounded-r-xl hover:shadow-lg transition-all`}>
                        <div className="flex items-center mb-4 sm:mb-0">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center font-bold text-lg mr-4 shadow-md`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-lg">{item.component}</p>
                            <p className="text-sm text-gray-600">
                              Gap: {Math.abs(item.gap)} points • Current: {formatCurrency(item.funding)}
                            </p>
                          </div>
                        </div>
                        <div className="bg-white px-6 py-3 rounded-xl border-2 border-emerald-100">
                          <p className="text-xs text-gray-600 mb-1 font-medium">Recommended increase</p>
                          <p className="text-xl font-bold text-emerald-600">
                            +{formatCurrency(Math.abs(item.gap) * 5000000)}
                          </p>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center text-amber-900">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Key Vulnerabilities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-5 bg-white rounded-xl border border-amber-100 shadow-sm">
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-rose-500 rounded-full mt-2 mr-3" />
                      <div>
                        <p className="font-bold text-gray-900 mb-2">Climate Resilience - Critical Gap</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          17-point gap from benchmark with lowest funding allocation. Immediate investment needed
                          in climate adaptation infrastructure and early warning systems.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-white rounded-xl border border-amber-100 shadow-sm">
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3" />
                      <div>
                        <p className="font-bold text-gray-900 mb-2">Nutrition & Food Security - Underfunded</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          15-point gap despite high strategic priority. Requires increased allocation for
                          nutrition programs and food access initiatives.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Scenarios Tab */}
            <TabsContent value="scenarios" className="space-y-6">
              {/* Multi-Year Simulation Header */}
              <Card className="border-2 border-purple-100 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 shadow-xl">
                <CardContent className="pt-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 to-pink-600 p-3 rounded-xl shadow-lg mr-4">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Multi-Year Strategic Planning</h3>
                      <p className="text-gray-700 leading-relaxed">
                        Project food system performance 1-5 years into the future. Test different investment strategies,
                        see how decisions compound over time, and build data-driven budget proposals.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scenario Comparison */}
              <Card className="border-2 border-gray-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
                  <CardTitle className="flex items-center text-xl">
                    <Target className="h-5 w-5 mr-2 text-purple-600" />
                    5-Year Scenario Comparison
                  </CardTitle>
                  <CardDescription className="text-base">
                    See how different investment strategies perform over time
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  {/* Scenario Selector Cards */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-5 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-gray-900">Business as Usual</h4>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">Baseline</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Continue current allocation patterns with 3% annual growth</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Year 5 FSFI:</span>
                          <span className="font-bold text-gray-700">58/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vulnerability:</span>
                          <span className="font-bold text-rose-600">38%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-xl border-2 border-emerald-300 ring-2 ring-emerald-200 shadow-md">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-emerald-900">Optimized Strategy</h4>
                        <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full flex items-center">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Best
                        </span>
                      </div>
                      <p className="text-sm text-emerald-800 mb-4">FSFI-recommended allocation maximizing resilience within budget</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-emerald-700">Year 5 FSFI:</span>
                          <span className="font-bold text-emerald-600">82/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-700">Vulnerability:</span>
                          <span className="font-bold text-emerald-600">12%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 p-5 rounded-xl border-2 border-amber-200 hover:border-amber-300 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-amber-900">Budget Constrained</h4>
                        <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">-10% Budget</span>
                      </div>
                      <p className="text-sm text-amber-800 mb-4">Optimized allocation with 10% budget reduction</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-amber-700">Year 5 FSFI:</span>
                          <span className="font-bold text-amber-600">68/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-amber-700">Vulnerability:</span>
                          <span className="font-bold text-amber-600">24%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Year-by-Year Progression */}
                  <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border-2 border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                      <LineChart className="h-5 w-5 mr-2 text-purple-600" />
                      FSFI Index Projection (2025-2029)
                    </h4>
                    <div className="space-y-3">
                      {[
                        { year: 2025, baseline: 58, optimized: 65, constrained: 56 },
                        { year: 2026, baseline: 58, optimized: 71, constrained: 60 },
                        { year: 2027, baseline: 59, optimized: 76, constrained: 64 },
                        { year: 2028, baseline: 59, optimized: 79, constrained: 66 },
                        { year: 2029, baseline: 58, optimized: 82, constrained: 68 }
                      ].map((yearData) => (
                        <div key={yearData.year} className="space-y-1">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-semibold text-gray-700">Year {yearData.year}</span>
                            <div className="flex items-center space-x-4 text-xs">
                              <span className="text-gray-600">Baseline: {yearData.baseline}</span>
                              <span className="text-emerald-600 font-semibold">Optimized: {yearData.optimized}</span>
                              <span className="text-amber-600">Constrained: {yearData.constrained}</span>
                            </div>
                          </div>
                          <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="absolute h-full bg-gray-300 rounded-full"
                              style={{ width: `${yearData.baseline}%` }}
                            />
                            <div
                              className="absolute h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full shadow-md"
                              style={{ width: `${yearData.optimized}%` }}
                            />
                            <div
                              className="absolute h-full bg-amber-400 rounded-full opacity-60"
                              style={{ width: `${yearData.constrained}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Investment Impact Breakdown */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border-2 border-emerald-200">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center mr-3">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-lg">Optimized Strategy Details</h4>
                      </div>
                      <div className="space-y-3 mb-4">
                        <div className="bg-white p-3 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-700">Agriculture Development</span>
                            <span className="text-sm font-bold text-emerald-600">+18%</span>
                          </div>
                          <div className="bg-gray-100 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '78%' }} />
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-700">Climate Resilience</span>
                            <span className="text-sm font-bold text-teal-600">+25%</span>
                          </div>
                          <div className="bg-gray-100 rounded-full h-1.5">
                            <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: '85%' }} />
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-700">Nutrition Programs</span>
                            <span className="text-sm font-bold text-cyan-600">+22%</span>
                          </div>
                          <div className="bg-gray-100 rounded-full h-1.5">
                            <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: '82%' }} />
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-700">Infrastructure</span>
                            <span className="text-sm font-bold text-blue-600">+12%</span>
                          </div>
                          <div className="bg-gray-100 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '72%' }} />
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl">
                        <p className="text-sm font-semibold text-gray-900 mb-1">Total 5-Year Investment:</p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                          {formatCurrency(14.8 * 1000000000)}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Same total budget, optimized allocation</p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-200">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                          <Shield className="h-5 w-5 text-white" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-lg">Expected Outcomes (Year 5)</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl">
                          <div className="flex items-center mb-2">
                            <CheckCircle className="h-5 w-5 text-emerald-600 mr-2" />
                            <span className="font-semibold text-gray-900">Food Security</span>
                          </div>
                          <p className="text-sm text-gray-700 pl-7">
                            Severe food insecurity reduced from 28% to 15% of population
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl">
                          <div className="flex items-center mb-2">
                            <CheckCircle className="h-5 w-5 text-teal-600 mr-2" />
                            <span className="font-semibold text-gray-900">Climate Adaptation</span>
                          </div>
                          <p className="text-sm text-gray-700 pl-7">
                            75% of vulnerable communities with climate-resilient infrastructure
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl">
                          <div className="flex items-center mb-2">
                            <CheckCircle className="h-5 w-5 text-cyan-600 mr-2" />
                            <span className="font-semibold text-gray-900">Nutrition</span>
                          </div>
                          <p className="text-sm text-gray-700 pl-7">
                            Child stunting rates decrease from 26% to 18%
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl">
                          <div className="flex items-center mb-2">
                            <CheckCircle className="h-5 w-5 text-purple-600 mr-2" />
                            <span className="font-semibold text-gray-900">System Resilience</span>
                          </div>
                          <p className="text-sm text-gray-700 pl-7">
                            Vulnerability to price shocks reduced by 68%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Insights */}
                  <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-2xl shadow-xl">
                    <div className="flex items-start mb-4">
                      <Sparkles className="h-6 w-6 mr-3 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-lg mb-2">Strategic Planning Insights</h4>
                        <div className="space-y-2 text-sm text-blue-50">
                          <p>• <strong>Front-load infrastructure:</strong> 18-month lag time means early investment pays off in years 3-5</p>
                          <p>• <strong>Climate resilience ROI:</strong> Every $1M invested prevents $3.2M in drought-related losses</p>
                          <p>• <strong>Nutrition multiplier:</strong> Improved child nutrition boosts agricultural productivity by 12% over 5 years</p>
                          <p>• <strong>Budget flexibility:</strong> Even with 10% cuts, smart reallocation maintains 68/100 FSFI score</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Call to Action */}
          <Card className="mt-12 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white border-0 shadow-2xl">
            <CardContent className="pt-8 pb-8">
              <div className="text-center max-w-3xl mx-auto">
                <h3 className="text-3xl md:text-4xl font-bold mb-4">Ready to Deploy FSFI for Your Country?</h3>
                <p className="text-lg md:text-xl mb-8 text-emerald-50 leading-relaxed">
                  Contact our technical team to discuss a custom, secure FSFI platform deployment
                  tailored to your country's food system and infrastructure.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="mailto:J.Ulimwengu@cgiar.org,emmanuel.kwofie@mcgill.ca?cc=ebenezer.miezah@mcgill.ca&subject=FSFI%20Custom%20Deployment%20Inquiry&body=Dear%20FSFI%20Technical%20Team,%0D%0A%0D%0AI%20am%20writing%20to%20express%20interest%20in%20the%20Food%20Systems%20Financial%20Intelligence%20(FSFI)%20platform%20for%20[Country/Institution%20Name].%0D%0A%0D%0AOrganization:%20[Your%20Government%20Ministry/Institution]%0D%0ACountry:%20[Country%20Name]%0D%0AContact%20Person:%20[Your%20Full%20Name]%0D%0ATitle/Position:%20[Your%20Title]%0D%0AEmail:%20[Your%20Email]%0D%0APhone:%20[Your%20Phone%20Number]%0D%0A%0D%0AWe%20are%20interested%20in:%0D%0A-%20Learning%20more%20about%20FSFI%20capabilities%0D%0A-%20Understanding%20deployment%20options%20and%20requirements%0D%0A-%20Discussing%20integration%20with%20our%20existing%20systems%0D%0A-%20Scheduling%20a%20technical%20presentation/demo%0D%0A%0D%0AAdditional%20Information:%0D%0A[Please%20share%20any%20specific%20requirements,%20current%20challenges,%20or%20questions%20you%20have%20about%20food%20system%20financing%20in%20your%20country]%0D%0A%0D%0ABest%20regards,%0D%0A[Your%20Name]"
                  >
                    <Button type="button" size="lg" className="w-full sm:w-auto bg-white text-emerald-600 hover:bg-emerald-50 font-bold text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all">
                      Schedule Technical Discussion
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </a>
                  <Link href="/about">
                    <Button type="button" size="lg" variant="outline" className="w-full sm:w-auto bg-transparent text-white border-2 border-white hover:bg-white/10 font-bold text-lg px-8 py-6">
                      Learn More About FSFI
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
