'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Mail, MapPin, Phone, Twitter, Linkedin, Globe } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <footer className="glass-dark border-t border-white/20 mt-auto">
      <div className="section-padding py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="w-8 h-8" style={{color: 'var(--color-kenya-green)'}} />
              <div>
                <h3 className="font-bold text-lg text-gradient-kenya">FSFVI Kenya</h3>
                <p className="text-xs text-gray-600">Food System Security</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Evidence-based analysis and optimization platform for Kenya's food system investment and vulnerability assessment.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4" style={{color: 'var(--color-kenya-green)'}}>Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-gray-700 hover:text-red-700 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-gray-700 hover:text-red-700 transition-colors">
                  About FSFVI
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-gray-700 hover:text-red-700 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/analysis" className="text-sm text-gray-700 hover:text-red-700 transition-colors">
                  Analysis Tools
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4" style={{color: 'var(--color-kenya-green)'}}>Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-gray-700 hover:text-red-700 transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-700 hover:text-red-700 transition-colors">
                  Research Papers
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-700 hover:text-red-700 transition-colors">
                  Case Studies
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-700 hover:text-red-700 transition-colors">
                  API Access
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4" style={{color: 'var(--color-kenya-green)'}}>Contact</h4>
            <ul className="space-y-2">
              <li className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 mt-0.5" style={{color: 'var(--color-kenya-red)'}} />
                <span className="text-sm text-gray-700">
                  Nairobi, Kenya
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <Mail className="w-4 h-4 mt-0.5" style={{color: 'var(--color-kenya-red)'}} />
                <a href="mailto:support@fsfvi.ai" className="text-sm text-gray-700 hover:text-red-700 transition-colors">
                  support@fsfvi.ai
                </a>
              </li>
            </ul>

            {/* Social Links */}
            <div className="flex space-x-3 mt-4">
              <a href="https://linkedin.com/company/fsfvi" target="_blank" rel="noopener noreferrer" className="p-2 glass rounded-lg hover:bg-green-100/20 transition-colors">
                <Linkedin className="w-4 h-4" style={{color: 'var(--color-kenya-green)'}} />
              </a>
              <a href="https://x.com/fsfvi" target="_blank" rel="noopener noreferrer" className="p-2 glass rounded-lg hover:bg-green-100/20 transition-colors">
                <Twitter className="w-4 h-4" style={{color: 'var(--color-kenya-green)'}} />
              </a>
              <a href="https://fsfvi.ai" target="_blank" rel="noopener noreferrer" className="p-2 glass rounded-lg hover:bg-green-100/20 transition-colors">
                <Globe className="w-4 h-4" style={{color: 'var(--color-kenya-green)'}} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-600">
              © {currentYear} FSFVI.ai - All rights reserved
            </p>
            <p className="text-sm text-gray-600">
              {currentDate}
            </p>
            <div className="flex space-x-4">
              <Link href="/privacy" className="text-sm text-gray-600 hover:text-green-700 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-gray-600 hover:text-green-700 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;