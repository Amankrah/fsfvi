'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  CheckCircle,
  ArrowRight,
  Target,
  Upload,
  Eye,
  Play,
  BarChart3,
  PieChart,
  Settings,
  Calendar,
  Database,
  Sparkles,
  Award,
  ChevronRight,
  ExternalLink,
  Linkedin
} from 'lucide-react';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  React.useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 relative">
                <Image
                  src="/logo.png"
                  alt="FSFVI Logo"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">Loading FSFI Platform...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  const steps = [
    {
      icon: <Upload className="w-7 h-7" />,
      title: "Upload Data",
      description: "Upload your country's food system budget data or use our comprehensive sample dataset",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Eye className="w-7 h-7" />,
      title: "Analyze",
      description: "Get comprehensive vulnerability assessment across 6 critical food system components",
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      icon: <Target className="w-7 h-7" />,
      title: "Optimize",
      description: "Receive actionable policy recommendations and strategic multi-year planning insights",
      gradient: "from-purple-500 to-pink-500"
    }
  ];

  const demoSteps = [
    {
      step: 1,
      title: "Data Upload & Setup",
      icon: <Database className="w-6 h-6" />,
      description: "Upload country data or use sample data for comprehensive testing and analysis",
      actions: ["Select country file (CSV)", "Or choose sample data", "Configure currency and fiscal year"],
      color: "bg-blue-50 border-blue-200 text-blue-800",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      step: 2,
      title: "Current Distribution Analysis",
      icon: <PieChart className="w-6 h-6" />,
      description: "Analyze how budget is currently allocated across 6 food system components",
      actions: ["Budget concentration analysis", "Component allocation efficiency", "Risk distribution assessment"],
      color: "bg-green-50 border-green-200 text-green-800",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      step: 3,
      title: "Performance Gap Assessment",
      icon: <BarChart3 className="w-6 h-6" />,
      description: "Identify gaps between current and benchmark performance with detailed insights",
      actions: ["Performance vs benchmark comparison", "Priority component identification", "Gap magnitude analysis"],
      color: "bg-yellow-50 border-yellow-200 text-yellow-800",
      gradient: "from-yellow-500 to-orange-500"
    },
    {
      step: 4,
      title: "Component Vulnerability Analysis",
      icon: <Shield className="w-6 h-6" />,
      description: "Calculate vulnerability scores for each food system component using advanced algorithms",
      actions: ["Mathematical FSFVI calculation", "Risk-level categorization", "Critical component identification"],
      color: "bg-red-50 border-red-200 text-red-800",
      gradient: "from-red-500 to-pink-500"
    },
    {
      step: 5,
      title: "System-Level FSFVI",
      icon: <Target className="w-6 h-6" />,
      description: "Aggregate system vulnerability score and comprehensive government insights",
      actions: ["Overall FSFVI score calculation", "Risk level determination", "Executive summary generation"],
      color: "bg-purple-50 border-purple-200 text-purple-800",
      gradient: "from-purple-500 to-indigo-500"
    },
    {
      step: 6,
      title: "Budget Optimization",
      icon: <Settings className="w-6 h-6" />,
      description: "Optimize resource allocation for maximum impact using mathematical models",
      actions: ["Current vs optimal allocation", "Improvement potential analysis", "Implementation recommendations"],
      color: "bg-indigo-50 border-indigo-200 text-indigo-800",
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      step: 7,
      title: "Multi-Year Strategic Planning",
      icon: <Calendar className="w-6 h-6" />,
      description: "Simulate multi-year optimization to achieve target FSFVI with strategic roadmap",
      actions: ["Set target FSFVI goals", "Multi-year budget scenarios", "Progressive improvement tracking"],
      color: "bg-emerald-50 border-emerald-200 text-emerald-800",
      gradient: "from-emerald-500 to-teal-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 via-transparent to-purple-100/20"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/5 to-cyan-400/5 rounded-full blur-2xl transform -translate-x-48 -translate-y-48"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/5 to-pink-400/5 rounded-full blur-2xl transform translate-x-48 translate-y-48"></div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-white/30 shadow-xl">
        <div className="bg-gradient-to-r from-white/10 via-white/5 to-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <nav className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 relative flex-shrink-0 p-1 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                  <Image
                    src="/logo.png"
                    alt="FSFVI Logo"
                    fill
                    className="object-contain rounded-lg"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent drop-shadow-sm">
                    FSFVI
                  </h1>
                  <p className="text-sm text-gray-700 font-medium drop-shadow-sm">Food System Financing Intelligence</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <Link href="/auth/login">
                  <Button variant="outline" size="sm" className="bg-white/30 hover:bg-white/40 border-white/40 hover:border-white/60 backdrop-blur-sm transition-all duration-200 font-medium text-gray-800 shadow-lg">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm" className="bg-gradient-to-r from-blue-600/90 to-blue-700/90 hover:from-blue-700/90 hover:to-blue-800/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-200 font-medium border border-white/20">
                    Get Started
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        {/* Hero Section */}
        <section className="py-20 text-center">
          <div className="mb-8">
            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 px-4 py-2 text-sm font-medium shadow-lg">
              <Sparkles className="w-4 h-4 mr-2" />
              Advanced Food System Analysis Platform
            </Badge>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Optimize Your
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
              Food System Budget
            </span>
          </h1>
          
          <p className="text-xl text-gray-700 max-w-4xl mx-auto mb-12 leading-relaxed font-medium">
            Evidence-based analysis for government policymakers. Assess vulnerabilities,
            optimize allocations, and strengthen food security with data-driven insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/auth/register">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-10 py-4 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                Start Analysis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg" className="px-10 py-4 text-lg font-semibold bg-white/80 hover:bg-white border-2 border-gray-300 hover:border-gray-400 transition-all duration-200">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Quick Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="group">
                <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white/95 transform group-hover:scale-105">
                  <CardContent className="p-8 text-center">
                    <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-r ${step.gradient} flex items-center justify-center text-white shadow-lg`}>
                      {step.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Demo Flow Section */}
        <section className="py-20">
          <div className="relative">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 rounded-3xl"></div>
            <div className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-3xl border border-white/20"></div>
            
            <div className="relative p-12">
              <div className="text-center mb-16">
                <div className="flex items-center justify-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white shadow-lg">
                    <Play className="w-8 h-8" />
                  </div>
                </div>
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Complete Analysis Workflow
                </h2>
                <p className="text-xl text-gray-700 max-w-4xl mx-auto font-medium">
                  Experience the full analysis process from data upload to multi-year strategic planning
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {demoSteps.map((step, index) => (
                  <Card key={index} className="group border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white/90 backdrop-blur-sm overflow-hidden transform hover:scale-105">
                    <CardContent className="p-8">
                      <div className="flex items-center mb-6">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${step.gradient} flex items-center justify-center text-white shadow-lg mr-4`}>
                          {step.icon}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${step.color}`}>
                          Step {step.step}
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                        {step.title}
                      </h3>
                      
                      <p className="text-gray-700 mb-6 leading-relaxed font-medium">
                        {step.description}
                      </p>
                      
                      <div className="space-y-3">
                        {step.actions.map((action, actionIndex) => (
                          <div key={actionIndex} className="flex items-center text-sm text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            </div>
                            <span className="font-medium">{action}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="text-center mt-16">
                <Card className="inline-block border-0 shadow-2xl bg-white/90 backdrop-blur-sm overflow-hidden">
                  <CardContent className="p-10 max-w-3xl">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Experience the Full Workflow?</h3>
                    <p className="text-gray-700 mb-8 text-lg font-medium">
                      Get started with sample data or upload your own country data to see the complete analysis in action.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link href="/auth/register">
                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                          Try Sample Data
                          <Database className="w-5 h-5 ml-2" />
                        </Button>
                      </Link>
                      <Link href="/auth/register">
                        <Button variant="outline" className="px-8 py-3 text-lg font-semibold bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 transition-all duration-200">
                          Upload Your Data
                          <Upload className="w-5 h-5 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl text-white shadow-lg">
                <Shield className="w-8 h-8" />
              </div>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Meet the Team
            </h2>
            <p className="text-xl text-gray-700 max-w-4xl mx-auto font-medium">
              Our expert team combines deep technical expertise with extensive experience in food security research and policy analysis
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            

            {/* John M. Ulimwengu */}
            <Card className="group border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white/95 backdrop-blur-sm overflow-hidden transform hover:scale-105">
              <CardContent className="p-0">
                <div className="relative h-80 bg-gradient-to-br from-emerald-50 to-emerald-100">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  <Image
                    src="/images/john_ulimwengu.jpg"
                    alt="John M. Ulimwengu"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-8">
                  <div className="flex items-center mb-4">
                    <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mr-3"></div>
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">
                      Research Lead
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    John M. Ulimwengu
                  </h3>
                  <p className="text-emerald-600 font-semibold mb-4">
                    Senior Research Fellow at IFPRI
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed font-medium mb-6">
                    Leading food policy researcher with extensive experience in agricultural economics and food security analysis. Expert in developing evidence-based policy frameworks.
                  </p>
                  <div className="flex space-x-4 pt-4 border-t border-gray-100">
                    <a 
                      href="https://www.linkedin.com/in/john-ulimwengu-003a32208/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      <Linkedin className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">LinkedIn</span>
                    </a>
                    <a 
                      href="https://www.ifpri.org/profile/john-ulimwengu/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">Profile</span>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emmanuel Amankrah Kwofie */}
            <Card className="group border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white/95 backdrop-blur-sm overflow-hidden transform hover:scale-105">
              <CardContent className="p-0">
                <div className="relative h-80 bg-gradient-to-br from-blue-50 to-blue-100">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  <Image
                    src="/images/emmanuel_amankrah_kwofie.jpg"
                    alt="Emmanuel Amankrah Kwofie"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-8">
                  <div className="flex items-center mb-4">
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mr-3"></div>
                    <Badge className="bg-blue-50 text-blue-800 border-blue-200">
                      Technical Lead
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Emmanuel Amankrah Kwofie
                  </h3>
                  <p className="text-blue-600 font-semibold mb-4">
                    Software Engineer & Cloud Architect
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed font-medium mb-6">
                    Expert in scalable system architecture and advanced data analytics. Specializes in building robust platforms for complex policy analysis and government decision-making tools.
                  </p>
                  <div className="flex space-x-4 pt-4 border-t border-gray-100">
                    <a 
                      href="https://www.linkedin.com/in/eakwofie/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Linkedin className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">LinkedIn</span>
                    </a>
                    <a 
                      href="https://www.eakwofie.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">Website</span>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ebenezer Miezah Kwofie */}
            <Card className="group border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white/95 backdrop-blur-sm overflow-hidden transform hover:scale-105">
              <CardContent className="p-0">
                <div className="relative h-80 bg-gradient-to-br from-purple-50 to-purple-100">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  <Image
                    src="/images/ebenezer_miezah_kwofie.jpg"
                    alt="Ebenezer Miezah Kwofie"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-8">
                  <div className="flex items-center mb-4">
                    <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-3"></div>
                    <Badge className="bg-purple-50 text-purple-800 border-purple-200">
                      Academic Lead
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Ebenezer Miezah Kwofie
                  </h3>
                  <p className="text-purple-600 font-semibold mb-4">
                    Professor at McGill University
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed font-medium mb-6">
                    Academic expert in food systems research and policy analysis. Brings deep theoretical knowledge and practical experience in agricultural development and food security.
                  </p>
                  <div className="flex space-x-4 pt-4 border-t border-gray-100">
                    <a 
                      href="https://www.linkedin.com/in/ebenezer-miezah-kwofie-phd-99511421/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      <Linkedin className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">LinkedIn</span>
                    </a>
                    <a 
                      href="https://www.mcgill.ca/macdonald/ebenezer-miezah-kwofie"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">Profile</span>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-3xl"></div>
            <div className="absolute inset-0 bg-black/10 rounded-3xl"></div>
            <div className="relative px-12 py-16 text-center text-white">
              <div className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl font-bold mb-6">
                Ready to Optimize Your Food System?
              </h2>
              <p className="text-xl mb-12 text-blue-100 max-w-2xl mx-auto font-medium">
                Join government agencies using FSFI for smarter policy decisions and strategic planning
              </p>
              
              <div className="flex justify-center">
                <Link href="/auth/register">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-4 text-lg font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                    Start Free Analysis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-20 bg-white/80 backdrop-blur-md border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-10 h-10 relative">
                <Image
                  src="/logo.png"
                  alt="FSFVI Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">FSFI</span>
            </div>
            <p className="text-gray-700 mb-4 text-lg font-medium">
              Evidence-based food system optimization for government policymakers
            </p>
            <p className="text-gray-500 font-medium">
              © {new Date().getFullYear()} FSFI. Advanced analytics for food security.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
