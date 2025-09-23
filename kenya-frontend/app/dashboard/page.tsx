'use client';

import React from 'react';
import Link from 'next/link';
import {
  Shield,
  BarChart3,
  PieChart,
  TrendingUp,
  Upload,
  Database,
  Settings,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Users,
  FileText,
  Download
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Dashboard() {
  const { user } = useAuth();
  const kenyaGreen = '#006600';
  const kenyaRed = '#BB0000';

  const quickStats = [
    {
      title: 'FSFVI Score',
      value: 'Not Available',
      subtitle: 'Upload data to calculate',
      icon: <Shield className="w-8 h-8" />,
      color: '#6B7280',
    },
    {
      title: 'Components Analyzed',
      value: '0/6',
      subtitle: 'Food system components',
      icon: <BarChart3 className="w-8 h-8" />,
      color: kenyaRed,
    },
    {
      title: 'Budget Optimization',
      value: 'Pending',
      subtitle: 'Analysis required',
      icon: <Target className="w-8 h-8" />,
      color: '#FF8C00',
    },
    {
      title: 'Last Analysis',
      value: 'Never',
      subtitle: 'No previous analysis',
      icon: <Clock className="w-8 h-8" />,
      color: '#6B7280',
    },
  ];

  const quickActions = [
    {
      title: 'Upload Budget Data',
      description: 'Upload Kenya\'s food system budget allocation data',
      icon: <Upload className="w-6 h-6" />,
      href: '/upload',
      color: kenyaGreen,
      status: 'Start Here',
    },
    {
      title: 'View Analysis',
      description: 'Review vulnerability assessment results',
      icon: <BarChart3 className="w-6 h-6" />,
      href: '/analysis',
      color: kenyaRed,
      status: 'Requires Data',
      disabled: true,
    },
    {
      title: 'Budget Optimization',
      description: 'Get recommendations for optimal allocation',
      icon: <PieChart className="w-6 h-6" />,
      href: '/optimization',
      color: '#FF8C00',
      status: 'Requires Analysis',
      disabled: true,
    },
    {
      title: 'Multi-Year Planning',
      description: 'Create strategic roadmap for improvement',
      icon: <Calendar className="w-6 h-6" />,
      href: '/planning',
      color: '#8B5CF6',
      status: 'Advanced Feature',
      disabled: true,
    },
  ];

  const recentActivity = [
    {
      action: 'User Login',
      description: `Government user "${user?.username}" logged in`,
      timestamp: new Date().toLocaleString(),
      type: 'security',
      icon: <Shield className="w-4 h-4" />,
    },
  ];

  return (
    <ProtectedRoute>
      <div className="pt-16 min-h-screen">
        {/* Header */}
        <section className="section-padding py-8 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Kenya FSFVI <span className="text-gradient-kenya">Dashboard</span>
              </h1>
              <p className="text-gray-600">
                Welcome back, {user?.username}. Manage your food system vulnerability analysis.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Last login: {user?.last_login || 'First time'}
              </div>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: kenyaGreen }} title="System Online"></div>
            </div>
          </div>
        </section>

        {/* Get Started Notice */}
        <section className="section-padding py-8">
          <div className="card-glass" style={{ borderLeft: `4px solid ${kenyaGreen}` }}>
            <div className="flex items-start">
              <CheckCircle className="w-6 h-6 mr-3 mt-1" style={{ color: kenyaGreen }} />
              <div className="flex-1">
                <h3 className="font-semibold mb-1" style={{ color: kenyaGreen }}>
                  Welcome to the Kenya FSFVI Platform
                </h3>
                <p className="text-gray-700 mb-3">
                  To begin your food system vulnerability assessment, start by uploading your budget allocation data.
                  The platform will guide you through the analysis process.
                </p>
                <Link
                  href="/upload"
                  className="inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                  style={{ backgroundColor: kenyaGreen, color: 'white' }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Start with Data Upload
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="section-padding py-8">
          <h2 className="text-2xl font-bold mb-6">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickStats.map((stat, index) => (
              <div key={index} className="card-glass">
                <div className="flex items-center justify-between mb-4">
                  <div style={{ color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.subtitle}</div>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900">{stat.title}</h3>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="section-padding py-8">
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action, index) => (
              <div key={index} className="card-glass group">
                <div className="flex items-start space-x-4">
                  <div
                    className="p-3 rounded-xl shadow-lg"
                    style={{ backgroundColor: action.disabled ? '#9CA3AF' : action.color }}
                  >
                    <div className="text-white">
                      {action.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{action.title}</h3>
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: action.disabled ? '#F3F4F6' : `${action.color}15`,
                          color: action.disabled ? '#6B7280' : action.color
                        }}
                      >
                        {action.status}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{action.description}</p>
                    <Link
                      href={action.disabled ? '#' : action.href}
                      className={`inline-flex items-center font-medium transition-all ${
                        action.disabled
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'hover:underline group-hover:translate-x-1'
                      }`}
                      style={{ color: action.disabled ? undefined : action.color }}
                      onClick={action.disabled ? (e) => e.preventDefault() : undefined}
                    >
                      {action.disabled ? 'Not Available' : 'Get Started'}
                      {!action.disabled && <span className="ml-1">→</span>}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Process Overview */}
        <section className="section-padding py-8">
          <h2 className="text-2xl font-bold mb-6">Analysis Process</h2>
          <div className="card-glass">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 text-center">
              {[
                { step: 1, title: 'Upload Data', icon: <Upload className="w-6 h-6" />, status: 'pending' },
                { step: 2, title: 'Data Validation', icon: <CheckCircle className="w-6 h-6" />, status: 'locked' },
                { step: 3, title: 'Component Analysis', icon: <BarChart3 className="w-6 h-6" />, status: 'locked' },
                { step: 4, title: 'FSFVI Calculation', icon: <Shield className="w-6 h-6" />, status: 'locked' },
                { step: 5, title: 'Vulnerability Score', icon: <AlertTriangle className="w-6 h-6" />, status: 'locked' },
                { step: 6, title: 'Optimization', icon: <Target className="w-6 h-6" />, status: 'locked' },
                { step: 7, title: 'Reports', icon: <FileText className="w-6 h-6" />, status: 'locked' },
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-lg"
                    style={{
                      backgroundColor: item.status === 'pending' ? kenyaGreen : item.status === 'completed' ? kenyaGreen : '#E5E7EB',
                      color: item.status === 'locked' ? '#9CA3AF' : 'white'
                    }}
                  >
                    {item.icon}
                  </div>
                  <div className="text-sm font-medium text-gray-700">{item.title}</div>
                  <div className="text-xs text-gray-500">Step {item.step}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="section-padding py-8">
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <div className="card-glass">
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${kenyaGreen}15` }}
                  >
                    <div style={{ color: kenyaGreen }}>
                      {activity.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{activity.action}</h4>
                      <span className="text-sm text-gray-500">{activity.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security Notice */}
        <section className="section-padding py-8">
          <div className="card-glass" style={{ borderLeft: `4px solid ${kenyaRed}` }}>
            <div className="flex items-start">
              <Shield className="w-6 h-6 mr-3 mt-1" style={{ color: kenyaRed }} />
              <div>
                <h3 className="font-semibold mb-1" style={{ color: kenyaRed }}>
                  Security & Privacy Notice
                </h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>• All data uploads are encrypted and stored securely</p>
                  <p>• Access is limited to authorized Kenya Government personnel</p>
                  <p>• System activities are logged for audit and security purposes</p>
                  <p>• Session will expire after 30 minutes of inactivity</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}