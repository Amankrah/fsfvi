'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, ArrowLeft, Target, TrendingUp, AlertCircle, BarChart3, Shield, Users, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

export default function AboutPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-b border-gray-100">
        <div className="container mx-auto px-4 lg:px-8 py-12">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-emerald-600 transition-colors mb-8 font-medium">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>

          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center space-x-4 mb-6">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg">
                  <Globe className="h-12 w-12 text-white" />
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900">About FSFI</h1>
              </div>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Food Systems Financial Intelligence - A quantitative diagnostic tool for optimizing
                food system investments and maximizing resilience
              </p>
              <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mt-6 border border-emerald-200">
                <Sparkles className="h-4 w-4" />
                <span>IFAD 3FS Program • AKADEMIYA2063 • IFPRI Partnership</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* The Problem */}
          <Card className="border-2 border-rose-100 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-rose-50 to-red-50 border-b-2 border-rose-100">
              <CardTitle className="flex items-center text-2xl md:text-3xl">
                <div className="bg-white p-2 rounded-lg shadow-sm mr-3">
                  <AlertCircle className="h-6 w-6 text-rose-600" />
                </div>
                The Critical Gap
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-gray-700 pt-8 text-lg leading-relaxed">
              <p>
                For decades, governments and development organizations focused narrowly on agricultural
                productivity—yields, inputs, production. But food security depends on interconnected
                components spanning agricultural development, infrastructure, nutrition and health, social
                assistance, and climate resilience—what we now understand as <strong className="text-gray-900">food systems</strong>.
              </p>
              <p>
                The transition from agricultural development to food systems thinking has created a critical
                gap: <strong className="text-gray-900">decision-makers lack coherent, up-to-date evidence on how financial resources flow
                across these interconnected components</strong>. Although methodologies such as the 3FS
                (Financial Flows to Food Systems), jointly developed by IFAD and the World Bank, track
                financial flows, the more pertinent question remains unanswered:
              </p>
              <div className="bg-gradient-to-br from-rose-50 to-red-50 border-l-4 border-rose-600 p-6 rounded-r-xl my-6">
                <p className="font-bold text-rose-900 text-xl">
                  Which financial inconsistencies jeopardize food system performance?
                </p>
              </div>
              <p>
                Financial resources are often improperly allocated, critical deficiencies endure, and
                interventions fail to foster significant performance gains. For example, Kenya's agricultural
                budget still falls short of the Malabo Declaration's 10% commitment even as severe food
                insecurity worsened from 23% to 28% between 2018-2021.
              </p>
              <div className="bg-gray-900 text-white p-6 rounded-xl">
                <p className="font-bold text-lg">
                  Tracking flows is not enough. We must identify the underfunded elements that present
                  the most significant risk of system failure.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* The Solution */}
          <Card className="border-2 border-emerald-100 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b-2 border-emerald-100">
              <CardTitle className="flex items-center text-2xl md:text-3xl">
                <div className="bg-white p-2 rounded-lg shadow-sm mr-3">
                  <Target className="h-6 w-6 text-emerald-600" />
                </div>
                What is FSFI?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-gray-700 pt-8">
              <p className="text-xl font-bold text-gray-900 leading-relaxed">
                A quantitative diagnostic tool that identifies which food system components are most
                financially vulnerable and provides evidence-based optimization strategies to maximize
                resilience within budget constraints.
              </p>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-8 rounded-2xl border-2 border-emerald-100 mt-8">
                <h4 className="font-bold text-gray-900 mb-4 text-xl">How FSFI Works:</h4>
                <p className="mb-6 text-lg text-gray-700">FSFI integrates three critical data streams:</p>
                <div className="space-y-5">
                  <div className="flex items-start bg-white p-5 rounded-xl shadow-sm">
                    <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-4">
                      <BarChart3 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 mb-2 text-lg">Performance Gaps</p>
                      <p className="text-gray-700">
                        Measures how each component (agricultural development, infrastructure, nutrition,
                        climate resilience, social protection, governance) performs against established benchmarks
                        (CAADP, SDGs, HLPE, AfDB, World Bank, ReSAKSS)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start bg-white p-5 rounded-xl shadow-sm">
                    <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mr-4">
                      <TrendingUp className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 mb-2 text-lg">Financial Allocation</p>
                      <p className="text-gray-700">
                        Tracks actual resource distribution across the system using the 3FS framework,
                        mapping government expenditures, donor contributions, and private-sector investments
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start bg-white p-5 rounded-xl shadow-sm">
                    <div className="flex-shrink-0 w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center mr-4">
                      <Target className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 mb-2 text-lg">Sensitivity Analysis</p>
                      <p className="text-gray-700">
                        Calculates how responsive each component is to additional funding, accounting
                        for diminishing returns and cascading dependencies between components
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-8 rounded-2xl text-white shadow-xl">
                <p className="text-xl font-bold mb-3 flex items-center">
                  <Sparkles className="h-6 w-6 mr-2" />
                  The Key Insight:
                </p>
                <p className="text-lg leading-relaxed">
                  The proposed financial analysis extends beyond insufficient funding, encompassing
                  the issue of inappropriate resource allocation. <strong>FSFI reveals where each additional
                  dollar will have maximum impact on system performance</strong>, accounting for diminishing
                  returns and cascading dependencies between components.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* What Makes FSFI Different */}
          <Card className="border-2 border-gray-100 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
              <CardTitle className="text-2xl md:text-3xl">What Makes FSFI Different</CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-emerald-50 to-white p-6 rounded-xl border-2 border-emerald-100 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mr-2" />
                    <h4 className="font-bold text-gray-900 text-lg">Complements 3FS</h4>
                  </div>
                  <p className="text-gray-700">
                    While 3FS tracks where money goes, FSFI identifies where deficiencies are—the
                    critical missing piece for strategic allocation
                  </p>
                </div>
                <div className="bg-gradient-to-br from-teal-50 to-white p-6 rounded-xl border-2 border-teal-100 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-3">
                    <CheckCircle className="h-5 w-5 text-teal-600 mr-2" />
                    <h4 className="font-bold text-gray-900 text-lg">Actionable Optimization</h4>
                  </div>
                  <p className="text-gray-700">
                    Provides specific reallocation recommendations with quantified impact projections
                  </p>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-white p-6 rounded-xl border-2 border-cyan-100 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-3">
                    <CheckCircle className="h-5 w-5 text-cyan-600 mr-2" />
                    <h4 className="font-bold text-gray-900 text-lg">Context-Aware</h4>
                  </div>
                  <p className="text-gray-700">
                    Adapts weighting methodology to country income levels, crisis types (drought,
                    pandemic, financial shock), and development stages
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border-2 border-purple-100 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-3">
                    <CheckCircle className="h-5 w-5 text-purple-600 mr-2" />
                    <h4 className="font-bold text-gray-900 text-lg">Transparent Methodology</h4>
                  </div>
                  <p className="text-gray-700">
                    Every calculation traceable to published research, with sensitivity analysis
                    showing confidence intervals
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Practical Applications */}
          <Card className="border-2 border-gray-100 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
              <CardTitle className="text-2xl md:text-3xl">Practical Applications</CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="space-y-5">
                <div className="border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50 to-white pl-6 pr-6 py-5 rounded-r-xl hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-gray-900 mb-2 text-lg">National Governments</h4>
                  <p className="text-gray-700">
                    Optimize annual food system budgets by identifying which ministries/programs
                    yield highest marginal returns in terms of performance
                  </p>
                </div>
                <div className="border-l-4 border-teal-500 bg-gradient-to-r from-teal-50 to-white pl-6 pr-6 py-5 rounded-r-xl hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-gray-900 mb-2 text-lg">Donors & Development Partners</h4>
                  <p className="text-gray-700">
                    Target investments to components where funding gaps pose greatest systemic risk,
                    avoiding overinvestment in already-high performance areas
                  </p>
                </div>
                <div className="border-l-4 border-rose-500 bg-gradient-to-r from-rose-50 to-white pl-6 pr-6 py-5 rounded-r-xl hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-gray-900 mb-2 text-lg">Crisis Response</h4>
                  <p className="text-gray-700">
                    Rapidly assess which system components are most exposed during shocks and
                    prioritize emergency interventions accordingly
                  </p>
                </div>
                <div className="border-l-4 border-purple-500 bg-gradient-to-r from-purple-50 to-white pl-6 pr-6 py-5 rounded-r-xl hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-gray-900 mb-2 text-lg">Progress Tracking</h4>
                  <p className="text-gray-700">
                    Monitor whether policy changes actually improve performance over time through
                    comparable longitudinal measurements
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Why This Matters */}
          <Card className="border-2 border-cyan-100 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-xl">
            <CardHeader className="border-b border-cyan-200">
              <CardTitle className="text-2xl md:text-3xl text-cyan-900">Why This Matters</CardTitle>
              <CardDescription className="text-cyan-800 text-lg">From Reactive Crisis Management to Proactive System Performance</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-cyan-100">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center text-lg">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                      <Shield className="h-5 w-5 text-emerald-600" />
                    </div>
                    Evidence-Based Allocation
                  </h4>
                  <p className="text-gray-700">
                    Smooth budget negotiations through data-driven optimization, ensuring every
                    dollar maximizes food system performance
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-cyan-100">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center text-lg">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    </div>
                    Early Warning System
                  </h4>
                  <p className="text-gray-700">
                    Mathematical models detect vulnerability patterns before they manifest as
                    crises, enabling preventive interventions
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-cyan-100">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center text-lg">
                    <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center mr-3">
                      <Target className="h-5 w-5 text-rose-600" />
                    </div>
                    Crisis Response Acceleration
                  </h4>
                  <p className="text-gray-700">
                    During shocks, instantly identifies which food system components are most at
                    risk, enabling rapid, targeted resource deployment
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-cyan-100">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center text-lg">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                      <Users className="h-5 w-5 text-teal-600" />
                    </div>
                    Policy Bridge
                  </h4>
                  <p className="text-gray-700">
                    Translates complex food system analysis into clear, actionable policy
                    recommendations that government decision-makers can implement immediately
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Partnership & Project Information */}
          <Card className="border-2 border-gray-100 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
              <CardTitle className="text-2xl md:text-3xl">Partnership & Implementation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
              <div>
                <h4 className="font-bold text-gray-900 mb-4 text-xl">Project Information</h4>
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-6 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3" />
                    <p className="text-gray-700"><strong className="text-gray-900">Project:</strong> Food System Financing Intelligence (FSFI)</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 mr-3" />
                    <p className="text-gray-700"><strong className="text-gray-900">Program:</strong> Scaling up country capacity to track Financial Flows to Food Systems (3FS)</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2 mr-3" />
                    <p className="text-gray-700"><strong className="text-gray-900">Date:</strong> December 8, 2025</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-4 text-xl">Partnership Structure</h4>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl p-6 text-center shadow-lg border-2 border-emerald-100 hover:border-emerald-200 hover:shadow-xl transition-all">
                    <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">IFAD</div>
                    <p className="text-sm text-gray-700 font-semibold mb-1">Grant Funding</p>
                    <p className="text-xs text-gray-600">3FS Program</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 text-center shadow-lg border-2 border-teal-100 hover:border-teal-200 hover:shadow-xl transition-all">
                    <div className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">AKADEMIYA2063</div>
                    <p className="text-sm text-gray-700 font-semibold mb-1">Program Coordination</p>
                    <p className="text-xs text-gray-600">Implementation Partner</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 text-center shadow-lg border-2 border-cyan-100 hover:border-cyan-200 hover:shadow-xl transition-all">
                    <div className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">IFPRI</div>
                    <p className="text-sm text-gray-700 font-semibold mb-1">Technical Development</p>
                    <p className="text-xs text-gray-600">Research & Platform</p>
                    <p className="text-xs text-gray-500 mt-2">Dr. John M. Ulimwengu (PI)</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-4 text-xl">Technical Team</h4>
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-emerald-600 font-bold">PI</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Dr. John M. Ulimwengu</p>
                      <p className="text-sm text-gray-600">Principal Investigator, IFPRI</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-teal-600 font-bold">CI</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Mr. Emmanuel A. Kwofie</p>
                      <p className="text-sm text-gray-600">Co-Investigator, McGill University</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-cyan-600 font-bold">CI</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Dr. Ebenezer M. Miezah</p>
                      <p className="text-sm text-gray-600">Co-Investigator, McGill University</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-4 text-xl">Objective</h4>
                <p className="text-gray-700 text-lg leading-relaxed bg-gradient-to-r from-gray-50 to-white p-6 rounded-xl border border-gray-100">
                  The "Scaling up country capacity to track Financial Flows to Food Systems (3FS)" program
                  aims to enhance evidence-based policymaking by strengthening countries' ability to
                  measure, analyze, and optimize financial flows affecting food system performance.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white border-0 shadow-2xl">
            <CardContent className="pt-8 pb-8">
              <div className="text-center max-w-3xl mx-auto">
                <h3 className="text-3xl md:text-4xl font-bold mb-4">Interested in FSFI for Your Country?</h3>
                <p className="mb-8 text-emerald-50 text-lg md:text-xl leading-relaxed">
                  Contact our technical team to discuss a custom FSFI deployment tailored to
                  your country's food system needs
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/demo"
                    className="bg-white text-emerald-600 px-8 py-4 rounded-xl font-bold hover:shadow-2xl transition-all duration-300 inline-flex items-center justify-center text-lg"
                  >
                    Explore Demo Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <a
                    href="mailto:J.Ulimwengu@cgiar.org,emmanuel.kwofie@mcgill.ca?cc=ebenezer.miezah@mcgill.ca&subject=FSFI%20Custom%20Deployment%20Inquiry&body=Dear%20FSFI%20Technical%20Team,%0D%0A%0D%0AI%20am%20writing%20to%20express%20interest%20in%20the%20Food%20Systems%20Financial%20Intelligence%20(FSFI)%20platform%20for%20[Country/Institution%20Name].%0D%0A%0D%0AOrganization:%20[Your%20Government%20Ministry/Institution]%0D%0ACountry:%20[Country%20Name]%0D%0AContact%20Person:%20[Your%20Full%20Name]%0D%0ATitle/Position:%20[Your%20Title]%0D%0AEmail:%20[Your%20Email]%0D%0APhone:%20[Your%20Phone%20Number]%0D%0A%0D%0AWe%20are%20interested%20in:%0D%0A-%20Learning%20more%20about%20FSFI%20capabilities%0D%0A-%20Understanding%20deployment%20options%20and%20requirements%0D%0A-%20Discussing%20integration%20with%20our%20existing%20systems%0D%0A-%20Scheduling%20a%20technical%20presentation/demo%0D%0A%0D%0AAdditional%20Information:%0D%0A[Please%20share%20any%20specific%20requirements,%20current%20challenges,%20or%20questions%20you%20have%20about%20food%20system%20financing%20in%20your%20country]%0D%0A%0D%0ABest%20regards,%0D%0A[Your%20Name]"
                    className="bg-transparent text-white px-8 py-4 rounded-xl font-bold border-2 border-white hover:bg-white/10 transition-all duration-300 inline-flex items-center justify-center text-lg"
                  >
                    Contact Technical Team
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-gray-50 mt-20">
        <div className="container mx-auto px-4 lg:px-8 py-8 text-center">
          <p className="text-sm text-gray-600">
            &copy; {currentYear} FSFI. Part of the IFAD 3FS Program. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
