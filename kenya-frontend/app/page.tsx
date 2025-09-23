'use client';

import React from 'react';
import Link from 'next/link';
import {
  Shield,
  BarChart3,
  FileText,
  Upload,
  Database,
  LineChart,
  PieChart,
  Target,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Globe,
  Users,
  Award
} from 'lucide-react';

export default function Home() {
  const kenyaGreen = '#006600';
  const kenyaRed = '#BB0000';

  const steps = [
    {
      number: '01',
      title: 'Upload Your Data',
      description: 'Upload Kenya\'s food system budget data or use our comprehensive sample dataset to get started',
      icon: <Upload className="w-6 h-6" />,
      gradient: `linear-gradient(to right, ${kenyaGreen}, #228B22)`,
    },
    {
      number: '02',
      title: 'Analyze Vulnerabilities',
      description: 'Get detailed vulnerability assessment across 6 critical food system components',
      icon: <BarChart3 className="w-6 h-6" />,
      gradient: `linear-gradient(to right, ${kenyaRed}, #FF6B6B)`,
    },
    {
      number: '03',
      title: 'Optimize Investment',
      description: 'Receive actionable recommendations for budget allocation and strategic planning',
      icon: <Target className="w-6 h-6" />,
      gradient: 'linear-gradient(to right, #000000, #4B5563)',
    },
  ];

  const features = [
    {
      title: 'Vulnerability Assessment',
      description: 'Comprehensive analysis of food system vulnerabilities using advanced mathematical models',
      icon: <Shield className="w-8 h-8" />,
      metrics: ['6 Components', 'Real-time Analysis', 'Risk Scoring'],
    },
    {
      title: 'Budget Optimization',
      description: 'AI-powered recommendations for optimal budget allocation across food system components',
      icon: <PieChart className="w-8 h-8" />,
      metrics: ['Resource Allocation', 'Impact Analysis', 'ROI Calculation'],
    },
    {
      title: 'Multi-Year Planning',
      description: 'Strategic roadmap for progressive improvement towards minimal vulnerability',
      icon: <LineChart className="w-8 h-8" />,
      metrics: ['5-Year Projections', 'Scenario Planning', 'Progress Tracking'],
    },
    {
      title: 'Evidence-Based Insights',
      description: 'Data-driven policy recommendations backed by research and global best practices',
      icon: <Database className="w-8 h-8" />,
      metrics: ['Research Backed', 'Policy Framework', 'Best Practices'],
    },
  ];

  const upcomingFeatures = [
    'Real-time dashboard with live data integration',
    'Collaborative planning tools for government teams',
    'Advanced scenario simulation and forecasting',
    'Integration with national budget systems',
    'Automated report generation and distribution',
    'Mobile app for field data collection',
  ];

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="section-padding py-20">
        <div className="relative">
          {/* Background Elements */}
          <div className="absolute inset-0 -z-10">
            <div
              className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl animate-float"
              style={{ backgroundColor: `${kenyaGreen}15` }}
            ></div>
            <div
              className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl animate-float animation-delay-2000"
              style={{ backgroundColor: `${kenyaRed}15` }}
            ></div>
          </div>

          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center space-x-2 px-4 py-2 glass rounded-full">
                <Globe className="w-5 h-5" style={{ color: kenyaGreen }} />
                <span className="text-sm font-medium text-gray-700">
                  Kenya Food System Platform
                </span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="text-gradient-kenya">Strengthen Kenya's</span>
              <br />
              <span className="text-gray-900">Food Security</span>
            </h1>

            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Evidence-based analysis and optimization platform designed specifically for Kenya's food system.
              Assess vulnerabilities, optimize investments, and build resilience for a food-secure future.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/signin" className="btn-kenya px-8 py-4 text-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 mr-2" />
                Access Platform
              </Link>
              <Link href="/about" className="px-8 py-4 text-lg font-semibold glass hover:bg-white/20 rounded-lg transition-all duration-300 flex items-center justify-center">
                Learn More
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>

            {/* Kenya Flag Colors Bar */}
            <div className="flex justify-center mb-8">
              <div className="flex h-2 w-32 rounded-full overflow-hidden">
                <div className="flex-1" style={{ backgroundColor: '#000000' }}></div>
                <div className="flex-1" style={{ backgroundColor: kenyaRed }}></div>
                <div className="flex-1 bg-white border border-gray-200"></div>
                <div className="flex-1" style={{ backgroundColor: kenyaGreen }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            <span className="text-gradient-kenya">How FSFVI Works</span>
          </h2>
          <p className="text-xl text-gray-700">
            Three simple steps to transform Kenya's food system
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-gray-300 to-transparent"></div>
              )}

              <div className="card-glass group hover:scale-105 transition-transform duration-300">
                <div className="flex items-start space-x-4">
                  <div
                    className="p-3 rounded-xl text-white shadow-lg"
                    style={{ background: step.gradient }}
                  >
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-bold text-gray-300 mb-2">{step.number}</div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">{step.title}</h3>
                    <p className="text-gray-700">{step.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="section-padding py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Platform <span className="text-gradient-kenya">Capabilities</span>
          </h2>
          <p className="text-xl text-gray-700">
            Comprehensive tools for food system analysis and optimization
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="card-glass group">
              <div className="flex items-start space-x-4 mb-4">
                <div className="p-3 glass-kenya rounded-xl" style={{ color: kenyaGreen }}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-700">{feature.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {feature.metrics.map((metric, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 glass rounded-full text-sm font-medium"
                    style={{ color: kenyaGreen }}
                  >
                    {metric}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Coming Soon Features */}
      <section className="section-padding py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Coming <span className="text-gradient-kenya">Soon</span>
          </h2>
          <p className="text-xl text-gray-700">
            Exciting features in development
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {upcomingFeatures.map((feature, idx) => (
            <div key={idx} className="glass rounded-lg p-4 hover:bg-white/20 transition-colors">
              <div className="flex items-start">
                <Award className="w-5 h-5 mr-2 mt-0.5" style={{ color: '#FFD700' }} />
                <span className="text-gray-700">{feature}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding py-20">
        <div
          className="card-glass text-center"
          style={{
            background: `linear-gradient(to right, ${kenyaGreen}20, ${kenyaRed}20)`
          }}
        >
          <div className="max-w-3xl mx-auto">
            <Shield className="w-16 h-16 mx-auto mb-6" style={{ color: kenyaGreen }} />
            <h2 className="text-3xl font-bold mb-4">
              Secure Government Access
            </h2>
            <p className="text-xl text-gray-700 mb-8">
              This platform is exclusively designed for authorized Kenyan government officials 
              working on food security policy and budget allocation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signin" className="btn-kenya px-8 py-4 text-lg flex items-center justify-center">
                <Shield className="w-5 h-5 mr-2" />
                Government Sign In
              </Link>
              <Link href="/about" className="px-8 py-4 text-lg font-semibold glass hover:bg-white/20 rounded-lg transition-all duration-300 flex items-center justify-center">
                Platform Documentation
                <FileText className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}