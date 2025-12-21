'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, Award, Target } from 'lucide-react';
import { govPerformanceGapAPI } from '@/lib/fsfviApi/performanceGapApi';
import type { PeerComparisonReport, ComponentComparison } from '@/lib/types/performanceGap';
import { COMPONENT_DISPLAY_NAMES, QUARTILE_DISPLAY_NAMES } from '@/lib/types/performanceGap';

export function PeerComparison() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PeerComparisonReport | null>(null);
  const [fiscalYear, setFiscalYear] = useState<number>(2025);

  /**
   * Load real peer comparison data from database
   * CRITICAL: No mock data - fetches from demo_gov_backend database
   *
   * Peer countries: Rwanda, Ghana, Kenya (regional peers)
   */
  const loadPeerComparisonData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[PeerComparison] Fetching peer comparison for FY ${fiscalYear}...`);

      // Define peer countries for comparison (real regional peers)
      const peerCountries = ['Rwanda', 'Ghana', 'Kenya'];

      // Fetch real data from government database and compare with peers
      const response = await govPerformanceGapAPI.compareToPeers(peerCountries, fiscalYear);

      console.log(`[PeerComparison] Comparison complete:`, response.data);
      setReport(response.data);
    } catch (err: any) {
      console.error('[PeerComparison] Failed to load peer comparison:', err);

      if (err.response?.data?.message?.includes('No validated data')) {
        setError('No validated data found for FY ' + fiscalYear + '. Please ensure data is entered and validated in the system.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load peer comparison from database');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPeerComparisonData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear]);

  if (isLoading && !report) {
    return (
      <Card className="border-2 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
              </div>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 relative z-10" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">Comparing with Peer Countries</p>
              <p className="text-sm text-gray-600">Analyzing regional performance benchmarks...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !report) {
    return (
      <Alert variant="destructive" className="border-2 shadow-lg animate-in fade-in duration-300">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription className="font-medium text-base">{error}</AlertDescription>
      </Alert>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary Cards - Enhanced */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              <span className="flex items-center gap-2">
              <Target className="w-3 h-3" />
              Peer Countries
            </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{report.peer_countries.length}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {report.peer_countries.map((country) => (
                <span
                  key={country}
                  className="inline-flex items-center px-2.5 py-1 bg-white border-2 border-blue-300 rounded-lg text-xs font-semibold text-blue-900"
                >
                  {country}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-bold text-green-900 uppercase tracking-wider">
              <span className="flex items-center gap-2">
              <Award className="w-3 h-3" />
              Areas Above Peers
            </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-800">{report.areas_above_peers}</div>
            <p className="text-xs text-green-700 mt-1 font-medium">Leading performance areas</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-bold text-orange-900 uppercase tracking-wider">
              <span className="flex items-center gap-2">
              <TrendingDown className="w-3 h-3" />
              Areas Below Peers
            </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-800">{report.areas_below_peers}</div>
            <p className="text-xs text-orange-700 mt-1 font-medium">Learning opportunities</p>
          </CardContent>
        </Card>
      </div>

      {/* Learning Opportunities - Enhanced */}
      {report.learning_opportunities.length > 0 && (
        <Card className="border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="border-b border-blue-200 bg-gradient-to-r from-blue-100/50 to-cyan-100/50">
            <CardTitle className="flex items-center gap-3 text-blue-950">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold">Learning Opportunities</div>
                <div className="text-sm font-normal text-blue-800">Where peer countries excel</div>
              </div>
            </CardTitle>
            <CardDescription className="text-sm font-semibold text-blue-900 mt-2">
              Areas where regional peers are outperforming
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {report.learning_opportunities.map((opportunity, idx) => (
                <li
                  key={idx}
                  className="group flex items-start gap-4 p-4 bg-white rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-left"
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                    {idx + 1}
                  </span>
                  <span className="text-base font-semibold text-gray-900 leading-relaxed pt-1">
                    {opportunity}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Competitive Advantages - Enhanced */}
      {report.competitive_advantages.length > 0 && (
        <Card className="border-2 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="border-b border-green-200 bg-gradient-to-r from-green-100/50 to-emerald-100/50">
            <CardTitle className="flex items-center gap-3 text-green-950">
              <div className="p-2 bg-green-600 rounded-lg shadow-md">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold">Competitive Advantages</div>
                <div className="text-sm font-normal text-green-800">Your strengths</div>
              </div>
            </CardTitle>
            <CardDescription className="text-sm font-semibold text-green-900 mt-2">
              Areas where you are leading regional peers
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {report.competitive_advantages.map((advantage, idx) => (
                <li
                  key={idx}
                  className="group flex items-start gap-4 p-4 bg-white rounded-xl border-2 border-green-200 hover:border-green-400 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-left"
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-green-600 to-green-700 text-white flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                    {idx + 1}
                  </span>
                  <span className="text-base font-semibold text-gray-900 leading-relaxed pt-1">
                    {advantage}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Component Comparisons - Enhanced */}
      <Card className="border-2 border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-gray-50 to-slate-50 border-b-2 border-gray-200">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-purple-600 to-indigo-600 rounded-full"></div>
              Component Comparisons
            </CardTitle>
            <CardDescription className="text-base font-semibold text-gray-700">
              <span className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                LIVE DATA
              </span>
              Real data from government database (FY {fiscalYear}) vs regional peers
            </span>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPeerComparisonData}
            disabled={isLoading}
            className="border-2 border-gray-300 font-semibold hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="pt-6 bg-gradient-to-b from-white to-gray-50/30">
          <div className="space-y-5">
            {report.component_comparisons.map((comparison) => (
              <div
                key={comparison.component_type}
                className="animate-in fade-in slide-in-from-bottom-2"
              >
                <PeerComparisonCard comparison={comparison} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PeerComparisonCard({ comparison }: { comparison: ComponentComparison }) {
  const differencePercent = comparison.difference_from_peers_percent;
  const isAbovePeers = differencePercent > 0;
  const isNearPeers = Math.abs(differencePercent) < 5;

  const getQuartileColor = (quartile: string) => {
    switch (quartile) {
      case 'top_quartile':
        return 'from-green-50 to-green-100 border-green-400 text-green-900';
      case 'third_quartile':
        return 'from-blue-50 to-blue-100 border-blue-400 text-blue-900';
      case 'second_quartile':
        return 'from-yellow-50 to-yellow-100 border-yellow-400 text-yellow-900';
      case 'bottom_quartile':
        return 'from-red-50 to-red-100 border-red-400 text-red-900';
      default:
        return 'from-gray-50 to-gray-100 border-gray-400 text-gray-900';
    }
  };

  const getPerformanceIcon = () => {
    if (isNearPeers) return <Minus className="h-6 w-6 text-gray-600" />;
    return isAbovePeers ? (
      <TrendingUp className="h-6 w-6 text-green-600" />
    ) : (
      <TrendingDown className="h-6 w-6 text-red-600" />
    );
  };

  return (
    <div className="group border-2 border-gray-300 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 bg-white hover:border-purple-400 relative overflow-hidden">
      {/* Decorative element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-indigo-100 opacity-30 rounded-full blur-3xl -mr-16 -mt-16"></div>

      <div className="space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-1.5 h-8 rounded-full ${
                isAbovePeers ? 'bg-green-600' : isNearPeers ? 'bg-gray-600' : 'bg-red-600'
              }`}></div>
              <h3 className="text-xl font-bold text-gray-900">
                {COMPONENT_DISPLAY_NAMES[comparison.component_type] || comparison.component_type}
              </h3>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 px-4 py-3 rounded-xl border-2 border-indigo-300 hover:shadow-lg transition-all duration-200">
                <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  Your Score
                </div>
                <div className="text-2xl font-bold text-indigo-950">
                  {comparison.current_value.toFixed(1)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-3 rounded-xl border-2 border-blue-300 hover:shadow-lg transition-all duration-200">
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Peer Average
                </div>
                <div className="text-2xl font-bold text-blue-950">
                  {comparison.peer_average.toFixed(1)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 px-4 py-3 rounded-xl border-2 border-emerald-300 hover:shadow-lg transition-all duration-200">
                <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  Best Peer
                </div>
                <div className="text-2xl font-bold text-emerald-950">
                  {comparison.peer_best.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Indicator */}
          <div className="flex items-center gap-4 ml-6">
            <div className={`text-center px-6 py-4 rounded-2xl border-3 shadow-xl hover:shadow-2xl transition-all duration-300 ${
              isAbovePeers ? 'bg-gradient-to-br from-green-100 to-green-200 border-green-400' :
              isNearPeers ? 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-400' :
              'bg-gradient-to-br from-red-100 to-red-200 border-red-400'
            }`}>
              <div className="flex items-center justify-center mb-2">
                {getPerformanceIcon()}
              </div>
              <div className={`text-3xl font-black ${
                isAbovePeers ? 'text-green-900' : isNearPeers ? 'text-gray-900' : 'text-red-900'
              }`}>
                {isAbovePeers ? '+' : ''}{differencePercent.toFixed(1)}%
              </div>
              <div className={`text-xs font-bold uppercase tracking-wider mt-1 ${
                isAbovePeers ? 'text-green-800' : isNearPeers ? 'text-gray-800' : 'text-red-800'
              }`}>
                vs Peers
              </div>
            </div>

            {/* Quartile Badge */}
            <div className="flex flex-col gap-2">
              <div className={`px-4 py-2.5 rounded-xl text-xs font-bold text-center border-2 shadow-lg bg-gradient-to-br ${getQuartileColor(comparison.quartile)}`}>
                {QUARTILE_DISPLAY_NAMES[comparison.quartile]?.split('(')[0] || comparison.quartile.replace(/_/g, ' ')}
              </div>
              <div className="text-center">
                <span className="text-xs font-semibold text-gray-600 capitalize">
                  {comparison.performance_level.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Comparison Bar - Enhanced */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border-2 border-gray-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">Regional Comparison</span>
            <span className="text-xs font-semibold text-gray-600">
              Range: {comparison.peer_worst.toFixed(1)} - {comparison.peer_best.toFixed(1)}
            </span>
          </div>
          <div className="relative h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl overflow-hidden shadow-inner border-2 border-gray-400">
            {/* Peer Range Highlight */}
            <div
              className="absolute h-full bg-blue-300 opacity-40"
              style={{
                left: `${Math.max(0, (comparison.peer_worst / comparison.peer_best) * 100)}%`,
                width: `${Math.min(100, ((comparison.peer_best - comparison.peer_worst) / comparison.peer_best) * 100)}%`,
              }}
            />
            {/* Peer Average Marker */}
            <div
              className="absolute h-full w-1.5 bg-blue-600 shadow-lg z-10"
              style={{ left: `${Math.min(98, (comparison.peer_average / comparison.peer_best) * 100)}%` }}
            >
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                Avg: {comparison.peer_average.toFixed(1)}
              </div>
            </div>
            {/* Your Score Marker */}
            <div
              className={`absolute h-full w-2.5 shadow-2xl z-20 ${
                isAbovePeers ? 'bg-green-600' : isNearPeers ? 'bg-gray-600' : 'bg-red-600'
              }`}
              style={{ left: `${Math.min(97.5, (comparison.current_value / comparison.peer_best) * 100)}%` }}
            >
              <div className={`absolute -top-8 left-1/2 transform -translate-x-1/2 text-white text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap shadow-lg ${
                isAbovePeers ? 'bg-green-600' : isNearPeers ? 'bg-gray-600' : 'bg-red-600'
              }`}>
                You: {comparison.current_value.toFixed(1)}
              </div>
            </div>
          </div>
          <div className="flex justify-between text-xs font-semibold text-gray-600 mt-3">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              Min: {comparison.peer_worst.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              Avg: {comparison.peer_average.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Max: {comparison.peer_best.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
