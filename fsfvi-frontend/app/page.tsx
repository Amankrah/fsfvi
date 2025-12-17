'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, TrendingUp, Globe, Target, Database, LineChart, Check, Sparkles, Shield } from 'lucide-react';

export default function Home() {
  const currentYear = new Date().getFullYear();
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl shadow-lg">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">FSFI</span>
              <p className="text-xs text-gray-500 -mt-1">Food Systems Intelligence</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">
              Features
            </Link>
            <Link href="/about" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">
              About
            </Link>
            <Link href="/demo" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">
              Demo
            </Link>
            <Link href="/developer/login" className="text-gray-600 hover:text-blue-600 transition-colors font-medium inline-flex items-center space-x-1">
              <Shield className="h-4 w-4" />
              <span>Developer</span>
            </Link>
            <a
              href="mailto:J.Ulimwengu@cgiar.org,emmanuel.kwofie@mcgill.ca?cc=ebenezer.miezah@mcgill.ca&subject=FSFI%20Custom%20Deployment%20Inquiry&body=Dear%20FSFI%20Technical%20Team,%0D%0A%0D%0AI%20am%20writing%20to%20express%20interest%20in%20the%20Food%20Systems%20Financial%20Intelligence%20(FSFI)%20platform%20for%20[Country/Institution%20Name].%0D%0A%0D%0AOrganization:%20[Your%20Government%20Ministry/Institution]%0D%0ACountry:%20[Country%20Name]%0D%0AContact%20Person:%20[Your%20Full%20Name]%0D%0ATitle/Position:%20[Your%20Title]%0D%0AEmail:%20[Your%20Email]%0D%0APhone:%20[Your%20Phone%20Number]%0D%0A%0D%0AWe%20are%20interested%20in:%0D%0A-%20Learning%20more%20about%20FSFI%20capabilities%0D%0A-%20Understanding%20deployment%20options%20and%20requirements%0D%0A-%20Discussing%20integration%20with%20our%20existing%20systems%0D%0A-%20Scheduling%20a%20technical%20presentation/demo%0D%0A%0D%0AAdditional%20Information:%0D%0A[Please%20share%20any%20specific%20requirements,%20current%20challenges,%20or%20questions%20you%20have%20about%20food%20system%20financing%20in%20your%20country]%0D%0A%0D%0ABest%20regards,%0D%0A[Your%20Name]"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 font-semibold"
            >
              Contact Us
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>

        <div className="container mx-auto px-4 lg:px-8 py-24 lg:py-32">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-8 border border-emerald-200">
              <Sparkles className="h-4 w-4" />
              <span>IFAD 3FS Program Partnership</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Transform Food System
              <span className="block mt-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Financing Decisions
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Custom, secure platforms that optimize food system investments through
              <span className="text-emerald-600 font-semibold"> performance benchmarking</span>,
              <span className="text-teal-600 font-semibold"> 3FS financial analysis</span>, and
              <span className="text-cyan-600 font-semibold"> evidence-based intelligence</span>.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/demo"
                className="group bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-emerald-500/40 transition-all duration-300 inline-flex items-center justify-center transform hover:-translate-y-0.5"
              >
                Explore Live Demo
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="mailto:J.Ulimwengu@cgiar.org,emmanuel.kwofie@mcgill.ca?cc=ebenezer.miezah@mcgill.ca&subject=FSFI%20Custom%20Deployment%20Inquiry&body=Dear%20FSFI%20Technical%20Team,%0D%0A%0D%0AI%20am%20writing%20to%20express%20interest%20in%20the%20Food%20Systems%20Financial%20Intelligence%20(FSFI)%20platform%20for%20[Country/Institution%20Name].%0D%0A%0D%0AOrganization:%20[Your%20Government%20Ministry/Institution]%0D%0ACountry:%20[Country%20Name]%0D%0AContact%20Person:%20[Your%20Full%20Name]%0D%0ATitle/Position:%20[Your%20Title]%0D%0AEmail:%20[Your%20Email]%0D%0APhone:%20[Your%20Phone%20Number]%0D%0A%0D%0AWe%20are%20interested%20in:%0D%0A-%20Learning%20more%20about%20FSFI%20capabilities%0D%0A-%20Understanding%20deployment%20options%20and%20requirements%0D%0A-%20Discussing%20integration%20with%20our%20existing%20systems%0D%0A-%20Scheduling%20a%20technical%20presentation/demo%0D%0A%0D%0AAdditional%20Information:%0D%0A[Please%20share%20any%20specific%20requirements,%20current%20challenges,%20or%20questions%20you%20have%20about%20food%20system%20financing%20in%20your%20country]%0D%0A%0D%0ABest%20regards,%0D%0A[Your%20Name]"
                className="bg-white text-gray-900 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 inline-flex items-center justify-center"
              >
                Schedule Consultation
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                <span>Custom Deployment</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-teal-500 rounded-full"></div>
                <span>Data Sovereignty</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-cyan-500 rounded-full"></div>
                <span>Enterprise Security</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Comprehensive Food Systems Analysis
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Integrated intelligence platform for optimizing food system investments with data-driven insights
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature Card 1 */}
            <div className="group relative bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="bg-gradient-to-br from-emerald-100 to-emerald-50 w-14 h-14 rounded-xl flex items-center justify-center mb-5 shadow-sm">
                  <BarChart3 className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Performance Benchmarking
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Assess food system components against CAADP, SDGs, HLPE, and other global frameworks to identify strengths, weaknesses, and priority investment areas.
                </p>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className="group relative bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-teal-200 hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="bg-gradient-to-br from-teal-100 to-teal-50 w-14 h-14 rounded-xl flex items-center justify-center mb-5 shadow-sm">
                  <TrendingUp className="h-7 w-7 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Financial Flow Tracking
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Track and analyze financial flows from government, donors, and private sector aligned with the 3FS framework to optimize resource allocation.
                </p>
              </div>
            </div>

            {/* Feature Card 3 */}
            <div className="group relative bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-purple-200 hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="bg-gradient-to-br from-purple-100 to-purple-50 w-14 h-14 rounded-xl flex items-center justify-center mb-5 shadow-sm">
                  <Target className="h-7 w-7 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  FSFI Index Computation
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Calculate comprehensive Food System Financing Intelligence scores integrating performance gaps, financial allocations, and sensitivity analysis.
                </p>
              </div>
            </div>

            {/* Feature Card 4 */}
            <div className="group relative bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-amber-200 hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="bg-gradient-to-br from-amber-100 to-amber-50 w-14 h-14 rounded-xl flex items-center justify-center mb-5 shadow-sm">
                  <LineChart className="h-7 w-7 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Scenario Analysis
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Run sensitivity analysis and investment scenarios to understand how resource allocation changes impact food system performance outcomes.
                </p>
              </div>
            </div>

            {/* Feature Card 5 */}
            <div className="group relative bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-rose-200 hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="bg-gradient-to-br from-rose-100 to-rose-50 w-14 h-14 rounded-xl flex items-center justify-center mb-5 shadow-sm">
                  <Database className="h-7 w-7 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Investment Optimization
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Identify optimal investment priorities using vulnerability mapping and resource allocation algorithms tailored to your food system context.
                </p>
              </div>
            </div>

            {/* Feature Card 6 */}
            <div className="group relative bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-cyan-200 hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="bg-gradient-to-br from-cyan-100 to-cyan-50 w-14 h-14 rounded-xl flex items-center justify-center mb-5 shadow-sm">
                  <Globe className="h-7 w-7 text-cyan-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Evidence-Based Policy
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Support strategic decision-making with comprehensive dashboards, visual analytics, and actionable insights for policymakers and development partners.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-gradient-to-br from-slate-50 to-gray-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                About FSFI
              </h2>
              <p className="text-xl text-gray-600">
                Part of the IFAD 3FS Program in partnership with AKADEMIYA2063 and IFPRI
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-xl mb-12 border border-gray-100">
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                The <strong className="text-emerald-600">Food System Financing Intelligence (FSFI)</strong> framework is designed to enhance
                evidence-based policymaking by strengthening countries' ability to measure, analyze, and optimize
                financial flows affecting food system performance.
              </p>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-l-4 border-emerald-500 p-6 rounded-r-xl mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">FSFI Framework Components</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <span className="text-emerald-600 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <p className="text-gray-700 leading-relaxed">
                        <span className="font-semibold text-gray-900">Component 1:</span> Assessment of food system components (agricultural productivity, nutrition, climate resilience, market infrastructure, governance) against established benchmarks (CAADP, SDGs, HLPE, AfDB, World Bank, ReSAKSS)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                      <span className="text-teal-600 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <p className="text-gray-700 leading-relaxed">
                        <span className="font-semibold text-gray-900">Component 2:</span> Revisiting and disaggregating 3FS financial flows - mapping government expenditures, donor contributions, and private-sector investments to food system components
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                      <span className="text-cyan-600 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <p className="text-gray-700 leading-relaxed">
                        <span className="font-semibold text-gray-900">Component 3:</span> Development of FSFI Index and digital platform integrating performance gaps, financial allocations, and sensitivity parameters with computation engine, dashboards, and visual analytics
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-lg text-gray-700 leading-relaxed">
                FSFI integrates performance benchmarking, financial flows, and sensitivity analysis into a single
                analytical platform, providing governments and development partners with actionable insights for
                optimal resource prioritization across food system components.
              </p>
            </div>

            {/* Partnership Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 text-center shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">IFAD</div>
                <p className="text-sm text-gray-600 font-medium">Grant #2000005300</p>
                <p className="text-xs text-gray-500 mt-1">3FS Program Funding</p>
              </div>
              <div className="bg-white rounded-xl p-6 text-center shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">AKADEMIYA2063</div>
                <p className="text-sm text-gray-600 font-medium">Program Implementation</p>
                <p className="text-xs text-gray-500 mt-1">Agreement: R-IFPRI-1-RA-251001</p>
              </div>
              <div className="bg-white rounded-xl p-6 text-center shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">IFPRI</div>
                <p className="text-sm text-gray-600 font-medium">Technical Development</p>
                <p className="text-xs text-gray-500 mt-1">Dr. John M. Ulimwengu (PI)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deployment Section */}
      <section id="deployment" className="py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Custom Deployment Model
              </h2>
              <p className="text-xl text-gray-600">
                Secure, sovereign, and tailored to your country's unique requirements
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Security Card */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-8 rounded-2xl border border-emerald-100">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-white p-3 rounded-xl shadow-sm">
                    <Database className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Data Sovereignty & Security
                  </h3>
                </div>
                <ul className="space-y-4">
                  {[
                    'Your data stays in your country - complete data sovereignty',
                    'Integration with your government\'s authentication systems',
                    'Highest security standards and encryption',
                    'On-premise or secure cloud deployment options'
                  ].map((item, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center mt-0.5">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Customization Card */}
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-8 rounded-2xl border border-teal-100">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-white p-3 rounded-xl shadow-sm">
                    <Target className="h-6 w-6 text-teal-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Custom Implementation
                  </h3>
                </div>
                <ul className="space-y-4">
                  {[
                    'Tailored to your country\'s food system structure',
                    'Integration with existing government systems and data sources',
                    'Custom benchmarks aligned with your national priorities',
                    'Ongoing maintenance and support from our technical team'
                  ].map((item, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mt-0.5">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Process Steps */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-8 lg:p-12 rounded-2xl border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Deployment Process</h3>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    step: '1',
                    title: 'Explore the Demo',
                    description: 'Experience the full FSFI dashboard to understand platform capabilities',
                    color: 'emerald'
                  },
                  {
                    step: '2',
                    title: 'Technical Discussion',
                    description: 'Our team meets with your government to understand requirements and infrastructure',
                    color: 'teal'
                  },
                  {
                    step: '3',
                    title: 'Custom Deployment',
                    description: 'We build, deploy, and maintain a secure FSFI platform tailored to your needs',
                    color: 'cyan'
                  }
                ].map((item, index) => (
                  <div key={index} className="text-center">
                    <div className={`inline-flex w-14 h-14 rounded-full bg-gradient-to-br from-${item.color}-500 to-${item.color}-600 text-white items-center justify-center font-bold text-2xl mb-4 shadow-lg`}>
                      {item.step}
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2 text-lg">{item.title}</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Food System Financing?
            </h2>
            <p className="text-xl text-emerald-50 mb-10 leading-relaxed">
              Contact our technical team to discuss a custom FSFI deployment tailored to your country's unique food system challenges and opportunities
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/demo">
                <button type="button" className="bg-white text-emerald-600 px-8 py-4 rounded-xl text-lg font-bold hover:shadow-2xl transition-all duration-300 inline-flex items-center transform hover:-translate-y-0.5">
                  Explore Demo First
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </Link>
              <a
                href="mailto:J.Ulimwengu@cgiar.org,emmanuel.kwofie@mcgill.ca?cc=ebenezer.miezah@mcgill.ca&subject=FSFI%20Custom%20Deployment%20Inquiry&body=Dear%20FSFI%20Technical%20Team,%0D%0A%0D%0AI%20am%20writing%20to%20express%20interest%20in%20the%20Food%20Systems%20Financial%20Intelligence%20(FSFI)%20platform%20for%20[Country/Institution%20Name].%0D%0A%0D%0AOrganization:%20[Your%20Government%20Ministry/Institution]%0D%0ACountry:%20[Country%20Name]%0D%0AContact%20Person:%20[Your%20Full%20Name]%0D%0ATitle/Position:%20[Your%20Title]%0D%0AEmail:%20[Your%20Email]%0D%0APhone:%20[Your%20Phone%20Number]%0D%0A%0D%0AWe%20are%20interested%20in:%0D%0A-%20Learning%20more%20about%20FSFI%20capabilities%0D%0A-%20Understanding%20deployment%20options%20and%20requirements%0D%0A-%20Discussing%20integration%20with%20our%20existing%20systems%0D%0A-%20Scheduling%20a%20technical%20presentation/demo%0D%0A%0D%0AAdditional%20Information:%0D%0A[Please%20share%20any%20specific%20requirements,%20current%20challenges,%20or%20questions%20you%20have%20about%20food%20system%20financing%20in%20your%20country]%0D%0A%0D%0ABest%20regards,%0D%0A[Your%20Name]"
              >
                <button type="button" className="bg-emerald-700 text-white px-8 py-4 rounded-xl text-lg font-bold border-2 border-emerald-500/30 hover:bg-emerald-800 hover:shadow-2xl transition-all duration-300 inline-flex items-center">
                  Schedule Technical Discussion
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand Column */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">FSFI</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Food Systems Financial Intelligence - Optimizing food system investments through evidence-based analysis.
              </p>
            </div>

            {/* Platform Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Platform</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="#features" className="hover:text-emerald-400 transition-colors">Features</Link></li>
                <li><Link href="/about" className="hover:text-emerald-400 transition-colors">About</Link></li>
                <li><Link href="/demo" className="hover:text-emerald-400 transition-colors">Demo</Link></li>
                <li><Link href="/developer/login" className="hover:text-blue-400 transition-colors inline-flex items-center space-x-1">
                  <Shield className="h-3 w-3" />
                  <span>Developer Portal</span>
                </Link></li>
              </ul>
            </div>

            {/* Program Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Program</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="https://www.ifad.org/" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">IFAD</a></li>
                <li><a href="https://akademiya2063.org/" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">AKADEMIYA2063</a></li>
                <li><a href="https://www.ifpri.org/" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">IFPRI</a></li>
              </ul>
            </div>

            {/* Technical Team */}
            <div>
              <h4 className="font-bold text-white mb-4">Technical Team</h4>
              <ul className="space-y-3 text-sm">
                <li>Dr. John M. Ulimwengu (PI)</li>
                <li className="text-gray-400">IFPRI</li>
                <li className="mt-3">Mr. Emmanuel A. Kwofie</li>
                <li className="text-gray-400">McGill University</li>
                <li className="mt-3">Dr. Ebenezer M. Miezah</li>
                <li className="text-gray-400">McGill University</li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-sm text-gray-400">
              &copy; {currentYear} FSFI. Part of the IFAD 3FS Program. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
