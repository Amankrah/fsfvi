'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Shield,
  Target,
  TrendingUp,
  Users,
  Award,
  BookOpen,
  Linkedin,
  Mail,
  ExternalLink,
  CheckCircle,
  Globe,
  BarChart3,
  Brain,
  Lightbulb,
  Calendar
} from 'lucide-react';

export default function About() {
  const kenyaGreen = '#006600';
  const kenyaRed = '#BB0000';
  const teamMembers = [
    {
      name: 'John M. Ulimwengu',
      role: 'Research Lead',
      title: 'Senior Research Fellow at IFPRI',
      description: 'Leading food policy researcher with extensive experience in agricultural economics and food security analysis across Africa.',
      expertise: ['Food Policy', 'Agricultural Economics', 'Policy Frameworks'],
      linkedin: 'https://www.linkedin.com/in/john-ulimwengu-003a32208/',
      profile: 'https://www.ifpri.org/profile/john-ulimwengu/',
      image: '/images/john_ulimwengu.jpg'
    },
    {
      name: 'Emmanuel Amankrah Kwofie',
      role: 'Technical Lead',
      title: 'Software Engineer & Cloud Architect',
      description: 'Expert in scalable system architecture and data analytics, specializing in government decision-making platforms.',
      expertise: ['Cloud Architecture', 'Data Analytics', 'System Design'],
      linkedin: 'https://www.linkedin.com/in/eakwofie/',
      website: 'https://www.eakwofie.com/',
      image: '/images/emmanuel_amankrah_kwofie.jpg'
    },
    {
      name: 'Ebenezer Miezah Kwofie',
      role: 'Academic Lead',
      title: 'Professor at McGill University',
      description: 'Academic expert in food systems research with focus on agricultural development and food security in developing nations.',
      expertise: ['Food Systems', 'Research Methodology', 'Agricultural Development'],
      linkedin: 'https://www.linkedin.com/in/ebenezer-miezah-kwofie-phd-99511421/',
      profile: 'https://www.mcgill.ca/macdonald/ebenezer-miezah-kwofie',
      image: '/images/ebenezer_miezah_kwofie.jpg'
    }
  ];

  const capabilities = [
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Vulnerability Index',
      description: 'Mathematical modeling to calculate FSFVI scores across six food system components',
      features: [
        'Component-level analysis',
        'Risk categorization',
        'Trend analysis',
        'Benchmark comparisons'
      ]
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Budget Optimization',
      description: 'AI-powered optimization algorithms for strategic resource allocation',
      features: [
        'Resource reallocation',
        'Impact maximization',
        'Cost-benefit analysis',
        'Scenario modeling'
      ]
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: 'Multi-Year Planning',
      description: 'Strategic roadmap development for progressive vulnerability reduction',
      features: [
        '5-year projections',
        'Milestone tracking',
        'Progress monitoring',
        'Adaptive planning'
      ]
    }
  ];

  const milestones = [
    { year: '2023', event: 'Research & Development Phase', status: 'completed' },
    { year: '2024', event: 'Platform Architecture Design', status: 'completed' },
    { year: '2024', event: 'Kenya Pilot Program Launch', status: 'current' },
    { year: '2025', event: 'Full Platform Deployment', status: 'upcoming' },
    { year: '2025', event: 'Regional Expansion', status: 'upcoming' }
  ];

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="section-padding py-20">
        <div className="relative">
          {/* Background Elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-10 right-10 w-64 h-64 rounded-full blur-3xl" style={{backgroundColor: `${kenyaGreen}15`}}></div>
            <div className="absolute bottom-10 left-10 w-80 h-80 rounded-full blur-3xl" style={{backgroundColor: `${kenyaRed}15`}}></div>
          </div>

          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              About <span className="text-gradient-kenya">FSFVI Kenya</span>
            </h1>
            <p className="text-xl text-gray-700 leading-relaxed">
              Empowering Kenya with evidence-based tools for food system vulnerability assessment
              and strategic investment optimization
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="section-padding py-20">
        <div className="max-w-6xl mx-auto">
          <div className="card-glass">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center mb-4">
                  <Shield className="w-10 h-10 mr-3" style={{color: kenyaGreen}} />
                  <h2 className="text-3xl font-bold">Our Mission</h2>
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  FSFVI Kenya is dedicated to strengthening Kenya's food security through data-driven analysis
                  and strategic planning. We provide government policymakers with the tools they need to:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" style={{color: kenyaGreen}} />
                    <span>Identify vulnerabilities in the food system</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" style={{color: kenyaGreen}} />
                    <span>Optimize budget allocation across food system components</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" style={{color: kenyaGreen}} />
                    <span>Develop strategic multi-year plans for resilience</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" style={{color: kenyaGreen}} />
                    <span>Track progress towards food security goals</span>
                  </li>
                </ul>
              </div>
              <div className="relative">
                <div className="glass-kenya rounded-2xl p-8 text-center">
                  <Globe className="w-20 h-20 mx-auto mb-4" style={{color: kenyaGreen}} />
                  <h3 className="text-2xl font-bold mb-2 text-gradient-kenya">Kenya First</h3>
                  <p className="text-gray-700">
                    Tailored specifically for Kenya's unique food system challenges and opportunities
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Capabilities */}
      <section className="section-padding py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Platform <span className="text-gradient-kenya">Capabilities</span>
          </h2>
          <p className="text-xl text-gray-700">
            Advanced tools for comprehensive food system analysis
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {capabilities.map((capability, index) => (
            <div key={index} className="card-glass">
              <div className="mb-4" style={{color: kenyaGreen}}>
                {capability.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{capability.title}</h3>
              <p className="text-gray-700 mb-4">{capability.description}</p>
              <ul className="space-y-2">
                {capability.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-sm">
                    <div className="w-1.5 h-1.5 bg-kenya-red rounded-full mr-2"></div>
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* The Index Section */}
      <section className="section-padding py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Understanding the <span className="text-gradient-kenya">FSFVI</span>
            </h2>
            <p className="text-xl text-gray-700">
              Food System Financial Vulnerability Index
            </p>
          </div>

          <div className="card-glass">
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-4 text-kenya-green">What is FSFVI?</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Food System Financial Vulnerability Index (FSFVI) is a comprehensive metric that quantifies
                the vulnerability of a country's food system based on budget allocation across six critical components:
              </p>

              <div className="grid md:grid-cols-2 gap-4 my-6">
                {[
                  'Agricultural Production',
                  'Food Processing & Storage',
                  'Distribution & Logistics',
                  'Market Access & Trade',
                  'Consumer Food Security',
                  'Policy & Governance'
                ].map((component, idx) => (
                  <div key={idx} className="flex items-center glass rounded-lg p-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-kenya-green to-kenya-red rounded-lg flex items-center justify-center text-white font-bold mr-3">
                      {idx + 1}
                    </div>
                    <span className="font-medium">{component}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold mb-3 text-kenya-green">How It Works</h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <Brain className="w-5 h-5 text-kenya-red mr-2 mt-0.5" />
                    <span>Mathematical modeling of budget distribution</span>
                  </li>
                  <li className="flex items-start">
                    <Brain className="w-5 h-5 text-kenya-red mr-2 mt-0.5" />
                    <span>Comparison with global benchmarks</span>
                  </li>
                  <li className="flex items-start">
                    <Brain className="w-5 h-5 text-kenya-red mr-2 mt-0.5" />
                    <span>Risk-level categorization</span>
                  </li>
                  <li className="flex items-start">
                    <Brain className="w-5 h-5 text-kenya-red mr-2 mt-0.5" />
                    <span>Performance gap analysis</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-3 text-kenya-green">Benefits</h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <Lightbulb className="w-5 h-5 text-kenya-green mr-2 mt-0.5" />
                    <span>Evidence-based decision making</span>
                  </li>
                  <li className="flex items-start">
                    <Lightbulb className="w-5 h-5 text-kenya-green mr-2 mt-0.5" />
                    <span>Resource optimization</span>
                  </li>
                  <li className="flex items-start">
                    <Lightbulb className="w-5 h-5 text-kenya-green mr-2 mt-0.5" />
                    <span>Risk mitigation strategies</span>
                  </li>
                  <li className="flex items-start">
                    <Lightbulb className="w-5 h-5 text-kenya-green mr-2 mt-0.5" />
                    <span>Long-term resilience building</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="section-padding py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Meet the <span className="text-gradient-kenya">Team</span>
          </h2>
          <p className="text-xl text-gray-700">
            Expert researchers and engineers dedicated to Kenya's food security
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {teamMembers.map((member, index) => (
            <div key={index} className="card-glass overflow-hidden group">
              <div className="relative h-64 bg-gradient-to-br from-kenya-green/20 to-kenya-red/20">
                {/* Placeholder for image */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Users className="w-24 h-24 text-kenya-green/30" />
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold">{member.name}</h3>
                  <p className="text-kenya-red font-semibold">{member.role}</p>
                  <p className="text-sm text-gray-600">{member.title}</p>
                </div>

                <p className="text-gray-700 text-sm mb-4">{member.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {member.expertise.map((skill, idx) => (
                    <span key={idx} className="px-2 py-1 glass rounded-full text-xs font-medium text-kenya-green">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="flex space-x-3">
                  {member.linkedin && (
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer"
                       className="p-2 glass rounded-lg hover:bg-kenya-green/20 transition-colors">
                      <Linkedin className="w-4 h-4 text-kenya-green" />
                    </a>
                  )}
                  {(member.profile || member.website) && (
                    <a href={member.profile || member.website} target="_blank" rel="noopener noreferrer"
                       className="p-2 glass rounded-lg hover:bg-kenya-green/20 transition-colors">
                      <ExternalLink className="w-4 h-4 text-kenya-green" />
                    </a>
                  )}
                  <a href="#" className="p-2 glass rounded-lg hover:bg-kenya-green/20 transition-colors">
                    <Mail className="w-4 h-4 text-kenya-green" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline Section */}
      <section className="section-padding py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Project <span className="text-gradient-kenya">Timeline</span>
          </h2>
          <p className="text-xl text-gray-700">
            Our journey towards a food-secure Kenya
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-kenya-green via-kenya-red to-kenya-black"></div>

            {/* Timeline Items */}
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={index} className="flex items-start">
                  <div className={`
                    w-16 h-16 rounded-full flex items-center justify-center font-bold text-white shadow-lg
                    ${milestone.status === 'completed' ? 'bg-kenya-green' :
                      milestone.status === 'current' ? 'bg-kenya-red animate-pulse' : 'bg-gray-400'}
                  `}>
                    {milestone.year.slice(-2)}
                  </div>
                  <div className="ml-8 card-glass flex-1">
                    <h3 className="text-lg font-bold mb-1">{milestone.event}</h3>
                    <p className="text-sm text-gray-600">
                      {milestone.status === 'completed' && 'Completed'}
                      {milestone.status === 'current' && 'In Progress'}
                      {milestone.status === 'upcoming' && 'Coming Soon'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding py-20">
        <div className="card-glass bg-gradient-to-r from-kenya-green/20 to-kenya-red/20 text-center">
          <Award className="w-16 h-16 text-kenya-green mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Kenya's Food System?
          </h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Join us in building a resilient and food-secure future for Kenya
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/" className="btn-kenya px-8 py-3">
              Explore Platform
            </Link>
            <a href="mailto:kenya@fsfvi.ai" className="px-8 py-3 glass hover:bg-white/20 rounded-lg font-semibold transition-all">
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}