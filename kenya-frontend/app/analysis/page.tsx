'use client';

import React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  AlertTriangle,
  Shield,
  Database,
  FileText,
  Download,
  Upload,
  ChevronRight,
  Info
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Analysis() {
  const { user } = useAuth();
  const kenyaGreen = '#006600';
  const kenyaRed = '#BB0000';

  return (
    <ProtectedRoute>
      <div className="pt-16 min-h-screen">
        {/* Header */}
        <section className="section-padding py-8 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                FSFVI <span className="text-gradient-kenya">Analysis</span>
              </h1>
              <p className="text-gray-600">
                Comprehensive food system vulnerability assessment and analysis tools
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 glass hover:bg-white/20 rounded-lg font-medium transition-all"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Data Required Notice */}
        <section className="section-padding py-8">
          <div className="card-glass" style={{ borderLeft: `4px solid ${kenyaRed}` }}>
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 mr-3 mt-1" style={{ color: kenyaRed }} />
              <div className="flex-1">
                <h3 className="font-semibold mb-2" style={{ color: kenyaRed }}>
                  No Data Available for Analysis
                </h3>
                <p className="text-gray-700 mb-4">
                  To perform a comprehensive FSFVI analysis, you need to upload Kenya's food system budget allocation data first.
                  The analysis requires data for all six food system components.
                </p>
                <Link
                  href="/upload"
                  className="inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                  style={{ backgroundColor: kenyaGreen, color: 'white' }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Data Now
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Analysis Components Preview */}
        <section className="section-padding py-8">
          <h2 className="text-2xl font-bold mb-6">Analysis Components</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Current Distribution Analysis */}
            <div className="card-glass">
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${kenyaGreen}15` }}>
                  <PieChart className="w-6 h-6" style={{ color: kenyaGreen }} />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">Current Budget Distribution</h3>
                  <p className="text-sm text-gray-600">Analyze allocation across 6 components</p>
                </div>
              </div>

              <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center text-gray-400">
                  <PieChart className="w-12 h-12 mx-auto mb-2" />
                  <p>Budget distribution chart will appear here</p>
                  <p className="text-sm">Upload data to generate visualization</p>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Components to analyze:</p>
                <ul className="space-y-1">
                  <li>• Agricultural Production</li>
                  <li>• Food Processing & Storage</li>
                  <li>• Distribution & Logistics</li>
                  <li>• Market Access & Trade</li>
                  <li>• Consumer Food Security</li>
                  <li>• Policy & Governance</li>
                </ul>
              </div>
            </div>

            {/* Vulnerability Assessment */}
            <div className="card-glass">
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${kenyaRed}15` }}>
                  <Shield className="w-6 h-6" style={{ color: kenyaRed }} />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">Vulnerability Assessment</h3>
                  <p className="text-sm text-gray-600">FSFVI calculation and risk analysis</p>
                </div>
              </div>

              <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center text-gray-400">
                  <Shield className="w-12 h-12 mx-auto mb-2" />
                  <p>FSFVI score will appear here</p>
                  <p className="text-sm">Upload data to calculate vulnerability</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Risk Levels:</p>
                  <ul className="text-gray-600 mt-1 space-y-1">
                    <li>🟢 Low Risk (0-0.3)</li>
                    <li>🟡 Medium Risk (0.3-0.6)</li>
                    <li>🔴 High Risk (0.6-1.0)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Analysis Features:</p>
                  <ul className="text-gray-600 mt-1 space-y-1">
                    <li>• Mathematical modeling</li>
                    <li>• Benchmark comparison</li>
                    <li>• Risk categorization</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Performance Gap Analysis */}
            <div className="card-glass">
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#FF8C0015' }}>
                  <BarChart3 className="w-6 h-6" style={{ color: '#FF8C00' }} />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">Performance Gap Analysis</h3>
                  <p className="text-sm text-gray-600">Compare current vs optimal allocation</p>
                </div>
              </div>

              <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center text-gray-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                  <p>Performance gaps will appear here</p>
                  <p className="text-sm">Upload data to identify gaps</p>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Gap Analysis Features:</p>
                <ul className="space-y-1">
                  <li>• Current vs benchmark comparison</li>
                  <li>• Priority component identification</li>
                  <li>• Improvement opportunity ranking</li>
                  <li>• Resource reallocation suggestions</li>
                </ul>
              </div>
            </div>

            {/* Trend Analysis */}
            <div className="card-glass">
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#8B5CF615' }}>
                  <TrendingUp className="w-6 h-6" style={{ color: '#8B5CF6' }} />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">Historical Trends</h3>
                  <p className="text-sm text-gray-600">Track changes over time</p>
                </div>
              </div>

              <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center text-gray-400">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2" />
                  <p>Trend analysis will appear here</p>
                  <p className="text-sm">Multiple periods required</p>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Available when you have:</p>
                <ul className="space-y-1">
                  <li>• Multiple year budget data</li>
                  <li>• Previous FSFVI calculations</li>
                  <li>• Historical policy changes</li>
                  <li>• Comparative analysis periods</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Analysis Process */}
        <section className="section-padding py-8">
          <h2 className="text-2xl font-bold mb-6">Analysis Process</h2>
          <div className="card-glass">
            <div className="space-y-6">
              {[
                {
                  step: 1,
                  title: 'Data Upload & Validation',
                  description: 'Upload budget data and validate for completeness and accuracy',
                  status: 'required',
                  icon: <Upload className="w-5 h-5" />
                },
                {
                  step: 2,
                  title: 'Component Analysis',
                  description: 'Analyze budget allocation across all six food system components',
                  status: 'pending',
                  icon: <BarChart3 className="w-5 h-5" />
                },
                {
                  step: 3,
                  title: 'FSFVI Calculation',
                  description: 'Calculate vulnerability index using mathematical models',
                  status: 'pending',
                  icon: <Shield className="w-5 h-5" />
                },
                {
                  step: 4,
                  title: 'Risk Assessment',
                  description: 'Categorize risk levels and identify critical vulnerabilities',
                  status: 'pending',
                  icon: <AlertTriangle className="w-5 h-5" />
                },
                {
                  step: 5,
                  title: 'Report Generation',
                  description: 'Generate comprehensive analysis reports and recommendations',
                  status: 'pending',
                  icon: <FileText className="w-5 h-5" />
                }
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                    style={{
                      backgroundColor: item.status === 'required' ? kenyaGreen : '#E5E7EB',
                      color: item.status === 'required' ? 'white' : '#9CA3AF'
                    }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold">Step {item.step}: {item.title}</h4>
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: item.status === 'required' ? `${kenyaRed}15` : '#F3F4F6',
                          color: item.status === 'required' ? kenyaRed : '#6B7280'
                        }}
                      >
                        {item.status === 'required' ? 'Action Required' : 'Waiting'}
                      </span>
                    </div>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Information Panel */}
        <section className="section-padding py-8">
          <div className="card-glass" style={{ borderLeft: `4px solid #3B82F6` }}>
            <div className="flex items-start">
              <Info className="w-6 h-6 mr-3 mt-1 text-blue-600" />
              <div>
                <h3 className="font-semibold mb-2 text-blue-800">
                  About FSFVI Analysis
                </h3>
                <div className="text-sm text-gray-700 space-y-2">
                  <p>
                    The Food System Financial Vulnerability Index (FSFVI) is a comprehensive metric that quantifies
                    the vulnerability of Kenya's food system based on budget allocation patterns across six critical components.
                  </p>
                  <p>
                    Our analysis uses advanced mathematical modeling to compare your current allocation with optimal
                    benchmarks, identifying vulnerabilities and providing actionable recommendations for improvement.
                  </p>
                  <p>
                    <strong>Privacy & Security:</strong> All uploaded data is encrypted and processed securely.
                    Only authorized Kenya Government personnel can access the analysis results.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}