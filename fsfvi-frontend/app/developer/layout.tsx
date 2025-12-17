'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Key,
  User,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  AlertCircle,
  CheckCircle2,
  Server,
  Activity,
  ChevronDown,
} from 'lucide-react';
import { useDeveloperAuth } from '@/hooks/useDeveloperAuth';

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useDeveloperAuth(true);
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Don't render layout for login page
  if (pathname === '/developer/login') {
    return <>{children}</>;
  }

  const navigation = [
    { name: 'Dashboard', href: '/developer/dashboard', icon: Home },
    { name: 'API Keys', href: '/developer/api-keys', icon: Key },
    { name: 'Security & MFA', href: '/developer/security', icon: Shield },
    { name: 'Profile', href: '/developer/profile', icon: User },
  ];

  const isActive = (href: string) => pathname === href;

  // Generate breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Developer Portal', href: '/developer/dashboard' }];

    let currentPath = '';
    paths.forEach((path, index) => {
      if (path === 'developer') return;
      currentPath += `/${path}`;
      const navItem = navigation.find(item => item.href.includes(path));
      breadcrumbs.push({
        name: navItem?.name || path.charAt(0).toUpperCase() + path.slice(1),
        href: `/developer${currentPath}`,
      });
    });

    return breadcrumbs;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block relative">
            <div className="absolute inset-0 rounded-full bg-blue-600 opacity-25 animate-ping"></div>
            <div className="relative inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600"></div>
          </div>
          <p className="mt-6 text-lg font-medium text-gray-700">Loading Developer Portal...</p>
          <p className="mt-2 text-sm text-gray-500">Securing your session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm backdrop-blur-sm bg-white/95">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo + Mobile Menu */}
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>

              <Link href="/developer/dashboard" className="flex items-center space-x-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-gray-900 tracking-tight">FSFVI Developer</h1>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Government API Portal</p>
                </div>
              </Link>
            </div>

            {/* Center: Branding (Desktop) */}
            <div className="hidden xl:flex items-center">
              <p className="text-xs text-gray-500 font-medium">Food Systems Financial Intelligence</p>
            </div>

            {/* Right: Notifications + User Menu */}
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <button
                type="button"
                className="relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {!user?.mfa_enabled && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {user?.full_name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg text-white font-bold shadow-md">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {user?.role}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            user?.mfa_enabled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user?.mfa_enabled ? (
                              <><CheckCircle2 className="h-3 w-3 mr-1" /> MFA On</>
                            ) : (
                              <><AlertCircle className="h-3 w-3 mr-1" /> MFA Off</>
                            )}
                          </span>
                        </div>
                      </div>
                      <Link
                        href="/developer/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="h-4 w-4 mr-3 text-gray-400" />
                        Your Profile
                      </Link>
                      <Link
                        href="/developer/security"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Shield className="h-4 w-4 mr-3 text-gray-400" />
                        Security Settings
                      </Link>
                      <div className="border-t border-gray-100 my-2"></div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center space-x-2 pb-3 text-xs overflow-x-auto">
            {getBreadcrumbs().map((crumb, index, arr) => (
              <div key={`${crumb.href}-${index}`} className="flex items-center space-x-2">
                {index > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
                {index === arr.length - 1 ? (
                  <span className="font-medium text-gray-900">{crumb.name}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {crumb.name}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <nav className="px-4 py-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                      active
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-semibold shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {active && <ChevronRight className="h-4 w-4 text-blue-600" />}
                  </Link>
                );
              })}
            </nav>

          </div>
        )}
      </header>

      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Sidebar Navigation (Desktop) */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:top-16 bg-white/80 backdrop-blur-md border-r border-gray-200">
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all group ${
                    active
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'}`} />
                  <span className="font-medium">{item.name}</span>
                  {active && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Government Info Card */}
          <div className="p-4 border-t border-gray-200">
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center space-x-2 mb-3">
                <Server className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Government ID</p>
              </div>
              <p className="text-sm font-mono text-gray-900 mb-1 truncate">
                {user?.government_id}
              </p>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Account Status</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                    {user?.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50/50">
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Food Systems<br />Financial Intelligence
              </p>
              <p className="text-[9px] text-gray-400 mt-1">Government-Level System</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-72">
          <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
            {/* Security Alert Banner */}
            {!user?.mfa_enabled && pathname !== '/developer/security' && (
              <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 rounded-lg p-4 shadow-sm">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-semibold text-yellow-900">
                      Security Recommendation: Enable Multi-Factor Authentication
                    </h3>
                    <p className="mt-1 text-xs text-yellow-800">
                      Protect your government API access with an additional layer of security. MFA is strongly recommended for all developer accounts.
                    </p>
                    <div className="mt-3">
                      <Link
                        href="/developer/security"
                        className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white text-xs font-medium rounded-lg hover:bg-yellow-700 transition-colors shadow-sm"
                      >
                        <Shield className="h-3.5 w-3.5 mr-1.5" />
                        Enable MFA Now
                      </Link>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ml-3 flex-shrink-0 text-yellow-600 hover:text-yellow-800"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
