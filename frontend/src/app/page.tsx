'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
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
  Building2,
  Upload,
  Eye,
  Zap
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
    { icon: <Wheat className="w-5 h-5" />, name: 'Agricultural Development', color: 'text-green-600' },
    { icon: <Truck className="w-5 h-5" />, name: 'Infrastructure', color: 'text-blue-600' },
    { icon: <Heart className="w-5 h-5" />, name: 'Nutrition & Health', color: 'text-red-600' },
    { icon: <Leaf className="w-5 h-5" />, name: 'Climate & Resources', color: 'text-emerald-600' },
    { icon: <Users className="w-5 h-5" />, name: 'Social Protection', color: 'text-purple-600' },
    { icon: <Building2 className="w-5 h-5" />, name: 'Governance', color: 'text-slate-600' }
  ];

  const steps = [
    {
      icon: <Upload className="w-6 h-6" />,
      title: "Upload Data",
      description: "Upload your country's food system budget data"
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: "Analyze",
      description: "Get comprehensive vulnerability assessment"
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Optimize",
      description: "Receive actionable policy recommendations"
    }
  ];

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Vulnerability Assessment",
      description: "Identify risks and prioritize interventions"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Performance Analytics",
      description: "Track gaps against international benchmarks"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Smart Optimization",
      description: "AI-powered resource allocation recommendations"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Policy Reports",
      description: "Generate actionable government insights"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">FSFVI</h1>
                <p className="text-xs text-gray-600">Food System Vulnerability Index</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link href="/auth/login">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="py-16 text-center">
          <Badge className="bg-green-100 text-green-800 mb-6">
            <CheckCircle className="w-4 h-4 mr-2" />
            Validated by 3FS & FSCI Standards
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Optimize Your
            <span className="text-blue-600 block">Food System Budget</span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Evidence-based analysis for government policymakers. Assess vulnerabilities, 
            optimize allocations, and strengthen food security with AI-powered insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/auth/register">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
                Start Analysis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg" className="px-8">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Quick Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center p-4">
                <div className="bg-blue-100 p-3 rounded-full mb-3 text-blue-600">
                  {step.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 text-center">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Framework Components */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              6-Component Framework
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive coverage of national food system investments
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {components.map((component, index) => (
              <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white">
                <CardContent className="p-4 text-center">
                  <div className={`inline-flex p-2 rounded-lg bg-gray-50 mb-3 ${component.color}`}>
                    {component.icon}
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm leading-tight">{component.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Key Features */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful Analytics
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need for evidence-based decision making
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-200 bg-white group">
                <CardContent className="p-6 text-center">
                  <div className="bg-blue-50 p-3 rounded-lg w-fit mx-auto mb-4 text-blue-600 group-hover:bg-blue-100 transition-colors">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-16">
          <Card className="border-0 shadow-xl bg-gradient-to-r from-green-50 to-blue-50">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Internationally Validated
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Built on proven methodologies trusted by governments worldwide
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-2">3FS Framework</h4>
                  <p className="text-sm text-gray-600">Financial flows tracking</p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-2">FSCI Standards</h4>
                  <p className="text-sm text-gray-600">Governance insights</p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-2">Peer Reviewed</h4>
                  <p className="text-sm text-gray-600">Academic validation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-8 py-12 text-center text-white">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Optimize Your Food System?
              </h2>
              <p className="text-xl mb-8 text-blue-100">
                Join government agencies using FSFVI for smarter policy decisions
              </p>
              
                             <div className="flex justify-center">
                 <Link href="/auth/register">
                   <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8">
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
      <footer className="mt-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">FSFVI</span>
            </div>
            <p className="text-gray-600 mb-2">
              Evidence-based food system optimization for government policymakers
            </p>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} FSFVI. Built on internationally validated frameworks.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
