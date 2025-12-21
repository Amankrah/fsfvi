'use client';

import { useState } from 'react';
import { useDemoAuth } from '@/hooks/useDemoAuth';
import { Button } from '@/components/ui/button';
import {
  User,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronRight,
  BarChart3,
} from 'lucide-react';

type NavigationItem = 'profile' | 'security' | 'performance-gap';

interface DemoDashboardLayoutProps {
  children?: React.ReactNode;
  activeNav: NavigationItem;
  setActiveNav: (nav: NavigationItem) => void;
}

export function DemoDashboardLayout({ children, activeNav, setActiveNav }: DemoDashboardLayoutProps) {
  const { user, isLoading, logout } = useDemoAuth(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navigationItems = [
    {
      id: 'performance-gap' as NavigationItem,
      label: 'Performance Gap Analysis',
      icon: BarChart3,
      description: 'Analyze food system performance gaps',
    },
    {
      id: 'profile' as NavigationItem,
      label: 'Profile',
      icon: User,
      description: 'View and manage your account information',
    },
    {
      id: 'security' as NavigationItem,
      label: 'Security',
      icon: Shield,
      description: 'Manage passwords and two-factor authentication',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>

              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    Demo Government Portal
                  </h1>
                  <p className="text-xs text-gray-600 hidden sm:block">
                    FSFVI Dashboard
                  </p>
                </div>
              </div>
            </div>

            {/* User Info and Logout */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                <p className="text-xs text-gray-600">Demo Government</p>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="text-gray-700 hover:text-red-600 hover:border-red-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setActiveNav(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation - Desktop */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-24">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Dashboard</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your food system data
                </p>
              </div>

              <nav className="p-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;

                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setActiveNav(item.id)}
                      className={`w-full group flex items-center justify-between px-3 py-3 rounded-lg transition-all mb-1 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                        <div className="text-left">
                          <p className={`font-medium text-sm ${isActive ? 'text-white' : 'text-gray-900'}`}>
                            {item.label}
                          </p>
                          <p className={`text-xs mt-0.5 ${isActive ? 'text-blue-100' : 'text-gray-600'}`}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 ${
                          isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
