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
  Info,
  ExternalLink
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
      gradient: 'from-green-500 to-emerald-600',
      textColor: 'text-green-700',
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
      gradient: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-700',
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
      gradient: 'from-red-500 to-pink-600',
      textColor: 'text-red-700',
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
      gradient: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-700',
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
      gradient: 'from-purple-500 to-violet-600',
      textColor: 'text-purple-700',
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
      gradient: 'from-slate-500 to-gray-600',
      textColor: 'text-slate-700',
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
      coverage: '5/6 components directly covered',
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    {
      name: 'FSCI Framework', 
      description: 'Food Systems Countdown Initiative',
      alignment: 'Comprehensive measurement approach',
      coverage: '6/6 components with governance insights',
      color: 'bg-green-50 border-green-200 text-green-800'
    },
    {
      name: 'Academic Literature',
      description: 'Peer-reviewed food systems research',
      alignment: 'Consistent with leading frameworks',
      coverage: 'Validates governance as distinct component',
      color: 'bg-purple-50 border-purple-200 text-purple-800'
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
      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-10">
          {/* Header Section */}
          <div className="text-center">
            <Badge className="bg-green-100 text-green-800 mb-4">
              <CheckCircle className="w-4 h-4 mr-2" />
              Framework Validated
            </Badge>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              6-Component Food Systems Framework
            </h1>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              A validated framework combining 3FS tracking capabilities with FSCI governance insights 
              for comprehensive food system investment analysis.
            </p>
          </div>

          {/* Framework Validation */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl text-gray-800">
                <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
                International Framework Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {frameworks.map((framework, index) => (
                  <div key={index} className={`p-4 rounded-lg border-2 ${framework.color}`}>
                    <h4 className="font-bold mb-2">{framework.name}</h4>
                    <p className="text-sm mb-3 opacity-80">{framework.description}</p>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{framework.alignment}</div>
                      <div className="text-sm font-medium">{framework.coverage}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg border border-green-200">
                <p className="text-sm text-gray-800 font-medium">
                  <strong>Validation Result:</strong> Strong consistency with established frameworks while addressing 
                  critical governance gaps. Essential for comprehensive food systems investment tracking and optimization.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Components List */}
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Framework Components</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Each component represents a critical dimension of food system investment and governance
              </p>
            </div>

            {components.map((component, index) => (
              <Card key={component.id} className="shadow-lg border-0 bg-white hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Icon and Header */}
                    <div className="flex-shrink-0">
                      <div className={`bg-gradient-to-br ${component.gradient} p-4 rounded-2xl text-white shadow-lg`}>
                        {component.icon}
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 space-y-6">
                      {/* Title and Description */}
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-gray-900">{component.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            Component {index + 1}
                          </Badge>
                        </div>
                        <p className="text-lg text-gray-600 leading-relaxed">{component.description}</p>
                      </div>

                      {/* Framework Alignment */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h5 className="font-semibold text-gray-900 mb-1 flex items-center">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Framework Alignment
                        </h5>
                        <p className="text-sm text-gray-700">{component.framework}</p>
                      </div>

                      {/* Two Column Layout for Scope and Rationale */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Component Scope */}
                        <div>
                          <h5 className="font-semibold text-gray-900 mb-3">Component Scope</h5>
                          <div className="space-y-2">
                            {component.scope.map((item, idx) => (
                              <div key={idx} className="flex items-start text-sm text-gray-700">
                                <div className={`w-2 h-2 rounded-full mr-3 mt-2 bg-gradient-to-r ${component.gradient}`}></div>
                                <span className="leading-relaxed">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Component Rationale and Indicators */}
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">Component Rationale</h5>
                            <p className="text-sm text-gray-700 leading-relaxed">{component.rationale}</p>
                          </div>

                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">Key Performance Areas</h5>
                            <div className="space-y-1">
                              {component.indicators.map((indicator, idx) => (
                                <div key={idx} className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-md">
                                  {indicator}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Implementation Guidance */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-gray-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl text-gray-800">
                <Info className="w-6 h-6 mr-3 text-blue-600" />
                Implementation & Analysis Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold text-gray-900 mb-4 text-lg">Framework Benefits</h4>
                  <div className="space-y-3">
                    {[
                      'Strong alignment with established international frameworks',
                      'Addresses critical governance gap in 3FS methodology',
                      'Enables comprehensive food systems investment tracking',
                      'Balances analytical utility with practical implementation'
                    ].map((benefit, idx) => (
                      <div key={idx} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-4 text-lg">Analysis Capabilities</h4>
                  <div className="space-y-3">
                    {[
                      'Component-level vulnerability assessment',
                      'Performance gap identification and prioritization',
                      'Resource allocation optimization recommendations',
                      'System-wide FSFVI calculation and risk assessment'
                    ].map((capability, idx) => (
                      <div key={idx} className="flex items-start">
                        <ArrowRight className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{capability}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Continue to Analysis */}
          <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-600 to-indigo-700">
            <CardContent className="p-8 text-center text-white">
              <h3 className="text-2xl font-bold mb-4">
                Ready to Analyze Your Food System?
              </h3>
              <p className="text-blue-100 mb-6 text-lg max-w-2xl mx-auto">
                Use this validated framework to assess budget distribution, identify vulnerabilities, 
                and optimize resource allocation across all six components.
              </p>
              <Button 
                onClick={() => router.push(`/analysis/${sessionId}/budget-distribution`)}
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
              >
                Start Budget Analysis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 