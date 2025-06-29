'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wheat,
  Truck,
  Heart,
  Leaf,
  Users,
  Building2,
  ArrowRight,
  CheckCircle,
  Info
} from 'lucide-react';
import { AnalysisNavigation } from '@/components/analysis/AnalysisNavigation';

export default function ComponentsOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.sessionId as string;

  const components = [
    {
      id: 'agricultural_development',
      title: 'Agricultural Development',
      icon: <Wheat className="w-8 h-8" />,
      description: 'Core agricultural production and productivity enhancement',
      gradient: 'from-green-50 to-emerald-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-700',
      framework: '3FS Framework Alignment',
      scope: [
        'Agricultural research and extension services',
        'Production systems and productivity enhancement',
        'Value chain strengthening and development',
        'Input supply and farmer support systems',
        'Agricultural yields and food availability',
        'Smallholder agriculture and rural development'
      ],
      rationale: 'Represents the foundational component across all frameworks. Essential for food production capacity and forms the backbone of food system operations.',
      indicators: [
        'Agricultural productivity metrics',
        'Crop and livestock yields',
        'Value chain efficiency',
        'Farmer income and livelihoods',
        'Technology adoption rates'
      ]
    },
    {
      id: 'infrastructure',
      title: 'Infrastructure',
      icon: <Truck className="w-8 h-8" />,
      description: 'Physical and digital backbone enabling food system operations',
      gradient: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-700',
      framework: '3FS Infrastructure for Food Systems',
      scope: [
        'Rural roads and transportation networks',
        'Storage facilities and warehouses',
        'Processing and packaging facilities',
        'Market infrastructure and cold chains',
        'Irrigation systems and water infrastructure',
        'Digital connectivity and telecommunications'
      ],
      rationale: 'Universally recognized as critical enabling environment. Provides the physical foundation that enables all other food system activities to function effectively.',
      indicators: [
        'Infrastructure coverage and quality',
        'Transportation efficiency',
        'Storage capacity utilization',
        'Market access metrics',
        'Post-harvest loss reduction'
      ]
    },
    {
      id: 'nutrition_health',
      title: 'Nutrition & Health',
      icon: <Heart className="w-8 h-8" />,
      description: 'Health outcomes and nutrition-specific interventions',
      gradient: 'from-red-50 to-pink-50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-700',
      framework: '3FS & FSCI Alignment',
      scope: [
        'Nutrition-specific programs and interventions',
        'Micronutrient supplementation and fortification',
        'Nutrition education and behavior change',
        'School feeding and maternal nutrition',
        'Food safety and quality assurance',
        'Food environments and diet quality'
      ],
      rationale: 'Perfect alignment across frameworks. Directly addresses human wellbeing objectives and represents the ultimate outcome of effective food systems.',
      indicators: [
        'Nutritional status indicators',
        'Food safety compliance',
        'Access to nutritious foods',
        'Malnutrition prevalence',
        'Diet quality scores'
      ]
    },
    {
      id: 'climate_natural_resources',
      title: 'Climate & Natural Resources',
      icon: <Leaf className="w-8 h-8" />,
      description: 'Environmental sustainability and climate resilience',
      gradient: 'from-emerald-50 to-teal-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-700',
      framework: '3FS & FSCI Environment Theme',
      scope: [
        'Climate-smart agriculture and adaptation',
        'Natural resource management and conservation',
        'Ecosystem restoration and biodiversity',
        'Renewable energy and sustainability',
        'Greenhouse gas emissions reduction',
        'Water resources and land use management'
      ],
      rationale: 'Reflects environmental sustainability imperative present in all frameworks. Critical for long-term resilience and addresses both climate mitigation and adaptation.',
      indicators: [
        'Environmental sustainability metrics',
        'Climate resilience measures',
        'Resource use efficiency',
        'Biodiversity conservation',
        'Emission reduction targets'
      ]
    },
    {
      id: 'social_protection_equity',
      title: 'Social Protection & Equity',
      icon: <Users className="w-8 h-8" />,
      description: 'Social protection systems and equity enhancement',
      gradient: 'from-purple-50 to-violet-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-700',
      framework: 'FSCI Livelihoods, Poverty, and Equity',
      scope: [
        'Social protection and safety net programs',
        'Emergency food assistance and transfers',
        'Poverty reduction and livelihood support',
        'Gender equity and women empowerment',
        'Social inclusion and vulnerable populations',
        'Human rights and access to resources'
      ],
      rationale: 'Enhanced from social assistance to include broader equity and rights dimensions. Addresses systemic aspects of social inclusion beyond direct assistance programs.',
      indicators: [
        'Social protection coverage',
        'Poverty and inequality metrics',
        'Gender equality measures',
        'Access to social services',
        'Rights realization indicators'
      ]
    },
    {
      id: 'governance_institutions',
      title: 'Governance & Institutions',
      icon: <Building2 className="w-8 h-8" />,
      description: 'Policy frameworks and institutional capacity',
      gradient: 'from-slate-50 to-gray-50',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-700',
      framework: 'FSCI Governance Theme',
      scope: [
        'Policy and regulatory frameworks',
        'Institutional capacity and coordination',
        'Democratic participation and accountability',
        'Multi-stakeholder governance platforms',
        'Cross-sectoral coordination mechanisms',
        'Market governance and power dynamics'
      ],
      rationale: 'Validated as distinct component addressing critical gap in 3FS framework. Serves as the most connected domain influencing all other components and provides institutional architecture.',
      indicators: [
        'Governance effectiveness metrics',
        'Policy implementation capacity',
        'Institutional coordination',
        'Participation and accountability',
        'Regulatory quality measures'
      ]
    }
  ];

  const frameworks = [
    {
      name: '3FS Framework',
      description: 'Tracking Financial Flows to Food Systems',
      alignment: 'Strong foundational alignment',
      coverage: '5/6 components directly covered'
    },
    {
      name: 'FSCI Framework', 
      description: 'Food Systems Countdown Initiative',
      alignment: 'Comprehensive measurement approach',
      coverage: '6/6 components with governance insights'
    },
    {
      name: 'Academic Literature',
      description: 'Peer-reviewed food systems research',
      alignment: 'Consistent with leading frameworks',
      coverage: 'Validates governance as distinct component'
    }
  ];

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <AnalysisNavigation 
        sessionId={sessionId}
        currentPage="components-overview"
        sessionInfo={{
          country: 'Framework Overview',
          fiscal_year: new Date().getFullYear()
        }}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Food Systems Framework Components
            </h1>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto mb-6">
              A validated 6-component framework based on leading food systems methodologies, 
              combining 3FS tracking capabilities with FSCI governance insights.
            </p>
            <div className="flex justify-center">
              <Badge className="bg-green-100 text-green-800 px-4 py-2 text-lg font-semibold">
                Framework Validated ✓
              </Badge>
            </div>
          </div>

          {/* Framework Validation */}
          <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl text-gray-800">
                <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
                Framework Validation Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {frameworks.map((framework, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-blue-100">
                    <h4 className="font-semibold text-gray-900 mb-2">{framework.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{framework.description}</p>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-500">Alignment:</span>
                        <span className="ml-2 text-green-600 font-medium">{framework.alignment}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Coverage:</span>
                        <span className="ml-2 text-blue-600 font-medium">{framework.coverage}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-100 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Validation Conclusion:</strong> Strong consistency with established food systems measurement frameworks 
                  while addressing critical gaps. The addition of governance and institutions is essential for comprehensive 
                  food systems analysis and investment tracking.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Components Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {components.map((component, index) => (
              <Card key={component.id} className={`shadow-lg border-0 bg-gradient-to-br ${component.gradient} hover:shadow-xl transition-shadow duration-200`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-full ${component.iconBg}`}>
                        <div className={component.iconColor}>
                          {component.icon}
                        </div>
                      </div>
                      <div>
                        <CardTitle className="text-xl text-gray-900">{component.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{component.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Component {index + 1}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Framework Alignment */}
                    <div className="bg-white/70 p-3 rounded-lg">
                      <h5 className="font-semibold text-gray-900 text-sm mb-1">Framework Alignment</h5>
                      <p className="text-xs text-gray-700">{component.framework}</p>
                    </div>

                    {/* Scope */}
                    <div>
                      <h5 className="font-semibold text-gray-900 text-sm mb-2">Component Scope</h5>
                      <div className="space-y-1">
                        {component.scope.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center text-xs text-gray-700">
                            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                            {item}
                          </div>
                        ))}
                        {component.scope.length > 3 && (
                          <div className="text-xs text-gray-500 ml-4">
                            +{component.scope.length - 3} more areas
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rationale */}
                    <div className="bg-white/70 p-3 rounded-lg">
                      <h5 className="font-semibold text-gray-900 text-sm mb-1">Component Rationale</h5>
                      <p className="text-xs text-gray-700 leading-relaxed">{component.rationale}</p>
                    </div>

                    {/* Key Indicators Preview */}
                    <div>
                      <h5 className="font-semibold text-gray-900 text-sm mb-2">Key Performance Areas</h5>
                      <div className="grid grid-cols-2 gap-1">
                        {component.indicators.slice(0, 4).map((indicator, idx) => (
                          <div key={idx} className="text-xs text-gray-600 bg-white/50 px-2 py-1 rounded">
                            {indicator}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Implementation Guidance */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl text-gray-800">
                <Info className="w-6 h-6 mr-3 text-blue-600" />
                Implementation Guidance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Framework Benefits</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      Strong alignment with established international frameworks
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      Addresses critical governance gap in 3FS methodology
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      Enables comprehensive food systems investment tracking
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      Balances analytical utility with practical implementation
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Analysis Capabilities</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <ArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      Component-level vulnerability assessment
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      Performance gap identification and prioritization
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      Resource allocation optimization recommendations
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      System-wide FSFVI calculation and risk assessment
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Continue to Analysis */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ready to Analyze Your Food System?
            </h3>
            <p className="text-gray-600 mb-6">
              Use this validated framework to assess budget distribution, identify vulnerabilities, 
              and optimize resource allocation for your food system components.
            </p>
            <Button 
              onClick={() => router.push(`/analysis/${sessionId}/budget-distribution`)}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Start Budget Analysis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
} 