'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Globe2, 
  TrendingUp, 
  Shield, 
  FileText, 
  Users, 
  CheckCircle,
  ArrowRight,
  Target,
  Heart,
  Wheat,
  Truck,
  Leaf,
  Building2
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  const components = [
    { icon: <Wheat className="w-6 h-6" />, name: 'Agricultural Development', color: 'text-green-600' },
    { icon: <Truck className="w-6 h-6" />, name: 'Infrastructure', color: 'text-blue-600' },
    { icon: <Heart className="w-6 h-6" />, name: 'Nutrition & Health', color: 'text-red-600' },
    { icon: <Leaf className="w-6 h-6" />, name: 'Climate & Natural Resources', color: 'text-emerald-600' },
    { icon: <Users className="w-6 h-6" />, name: 'Social Protection & Equity', color: 'text-purple-600' },
    { icon: <Building2 className="w-6 h-6" />, name: 'Governance & Institutions', color: 'text-slate-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="relative overflow-hidden bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FSFVI</h1>
                <p className="text-xs text-gray-600">Food System Financing Vulnerability Index</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <Link href="/auth/login">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introductory Overview */}
        <div className="text-center mb-16">
          <div className="mb-6">
            <Badge className="bg-green-100 text-green-800 px-4 py-2 text-sm font-semibold">
              Framework Validated by 3FS & FSCI Standards
            </Badge>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl mb-6">
            National Food System
            <span className="text-blue-600 block">Vulnerability Assessment</span>
          </h1>
          
          {/* Comprehensive Overview */}
          <div className="max-w-4xl mx-auto mb-8">
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              <strong>FSFVI</strong> is a comprehensive analytical tool designed for government policymakers to assess, 
              analyze, and optimize national food system financing. Built on internationally validated frameworks, 
              it provides evidence-based insights for strengthening food security and resilience.
            </p>
            
            <div className="bg-white rounded-lg p-6 shadow-lg border border-blue-100 text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">How to Navigate This Tool</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">1. Upload Your Data</h4>
                  <p className="text-sm text-gray-600 mb-3">
                                         Upload your country&apos;s food system budget data (Excel/CSV) containing project allocations across the 6 validated components.
                  </p>
                  
                  <h4 className="font-medium text-blue-900 mb-2">2. Framework Overview</h4>
                  <p className="text-sm text-gray-600">
                    Review the 6-component framework aligned with international 3FS and FSCI standards before starting analysis.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">3. Comprehensive Analysis</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Navigate through budget distribution, performance gaps, component vulnerabilities, and system-wide FSFVI calculations.
                  </p>
                  
                  <h4 className="font-medium text-blue-900 mb-2">4. Policy Recommendations</h4>
                  <p className="text-sm text-gray-600">
                    Generate actionable insights and optimization recommendations for policy implementation and resource reallocation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8 py-3">
                Start Your Country Analysis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg" className="px-8 py-3">
                Sign In to Continue
              </Button>
            </Link>
          </div>
        </div>

        {/* Validated Framework Components */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              6-Component Validated Framework
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Built on established international frameworks (3FS & FSCI), our methodology provides comprehensive 
              coverage of national food system investments with proven analytical rigor.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {components.map((component, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <div className={`inline-flex p-3 rounded-full bg-gray-50 mb-4 ${component.color}`}>
                    {component.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{component.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Key Capabilities */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Comprehensive Policy Analysis Capabilities
            </h2>
            <p className="text-lg text-gray-600">
              Everything government policymakers need for evidence-based food system decision-making
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader className="pb-4">
                <div className="bg-blue-600 p-3 rounded-lg w-fit mb-3">
                  <Globe2 className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">Universal Country Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Analyze food system financing for any country using internationally validated methodologies. 
                  Compatible with existing budget structures and planning frameworks.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <CardHeader className="pb-4">
                <div className="bg-green-600 p-3 rounded-lg w-fit mb-3">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">Optimization Engine</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Generate optimal resource allocation recommendations to minimize vulnerabilities and maximize 
                  food system effectiveness using advanced mathematical modeling.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader className="pb-4">
                <div className="bg-purple-600 p-3 rounded-lg w-fit mb-3">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">Policy Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Generate comprehensive policy reports with actionable insights, implementation timelines, 
                  and evidence-based recommendations for government decision-makers.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
              <CardHeader className="pb-4">
                <div className="bg-orange-600 p-3 rounded-lg w-fit mb-3">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">Vulnerability Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Identify system vulnerabilities, assess component-level risks, and prioritize interventions 
                  based on mathematical vulnerability indices and performance gaps.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-indigo-100">
              <CardHeader className="pb-4">
                <div className="bg-indigo-600 p-3 rounded-lg w-fit mb-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Track performance gaps against international benchmarks, monitor efficiency metrics, 
                  and measure progress toward food system strengthening objectives.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-teal-100">
              <CardHeader className="pb-4">
                <div className="bg-teal-600 p-3 rounded-lg w-fit mb-3">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">Budget Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Analyze current budget allocation patterns, assess concentration risks, and receive 
                  strategic recommendations for more effective resource distribution.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Framework Validation */}
        <div className="mb-16">
          <Card className="border-0 shadow-xl bg-gradient-to-r from-green-50 to-blue-50">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Internationally Validated Framework
                </h2>
                <p className="text-lg text-gray-600">
                  Built on proven methodologies trusted by governments worldwide
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-2">3FS Framework</h4>
                  <p className="text-sm text-gray-600">Tracking Financial Flows to Food Systems - Strong foundational alignment</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-2">FSCI Framework</h4>
                  <p className="text-sm text-gray-600">Food Systems Countdown Initiative - Comprehensive governance insights</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-2">Academic Research</h4>
                  <p className="text-sm text-gray-600">Peer-reviewed validation - Consistent with leading frameworks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Government CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-8 py-12 sm:px-12 sm:py-16 lg:px-16">
            <div className="text-center text-white">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Strengthen Your National Food System?
              </h2>
              <p className="text-xl mb-2 text-blue-100">
                Join government agencies worldwide using FSFVI for evidence-based policy making
              </p>
              <p className="text-lg mb-8 text-blue-200">
                                 Upload your country&apos;s budget data and receive comprehensive analysis within minutes
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/register">
                  <Button size="lg" className="bg-white text-blue-600 hover:text-blue-600 px-8
                  ">
                    Start Country Analysis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-white text-blue-600 hover:bg-white hover:text-blue-600 px-8"
                  onClick={() => window.open('mailto:support@fsfvi.org?subject=FSFVI Demo Request', '_blank')}
                >
                  Request Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">FSFVI</span>
            </div>
            <p className="text-gray-600 mb-2">
              Strengthening national food systems through evidence-based analysis and policy optimization
            </p>
                         <p className="text-sm text-gray-500">
               &copy; {new Date().getFullYear()} FSFVI. Built on internationally validated frameworks for government policy makers.
             </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
