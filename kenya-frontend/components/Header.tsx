'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Shield, ChevronRight, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu) {
        setShowUserMenu(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserMenu]);

  const getNavLinks = () => {
    if (isAuthenticated) {
      return [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/analysis', label: 'Analysis' },
        { href: '/upload', label: 'Upload Data', soon: true },
        { href: '/reports', label: 'Reports', soon: true },
      ];
    } else {
      return [
        { href: '/', label: 'Home' },
        { href: '/about', label: 'About' },
      ];
    }
  };

  const navLinks = getNavLinks();

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'glass-dark shadow-xl' : 'glass'
    }`}>
      <div className="section-padding">
        <nav className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-lg opacity-20" style={{background: 'linear-gradient(to right, var(--color-kenya-green), var(--color-kenya-red))'}}></div>
              <Shield className="w-10 h-10" style={{color: 'var(--color-kenya-green)'}} />
            </div>
            <div>
              <h1 className="font-bold text-xl">
                <span className="text-gradient-kenya">FSFVI</span>
                <span className="ml-2" style={{color: 'var(--color-kenya-red)'}}>Kenya</span>
              </h1>
              <p className="text-xs text-gray-600 -mt-1">Food System Security</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative group"
              >
                <span className="text-gray-700 hover:text-green-700 transition-colors font-medium">
                  {link.label}
                </span>
                {link.soon && (
                  <span className="absolute -top-2 -right-4 text-xs text-white px-1 rounded" style={{backgroundColor: 'var(--color-kenya-red)'}}>
                    soon
                  </span>
                )}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-300" style={{background: 'linear-gradient(to right, var(--color-kenya-green), var(--color-kenya-red))'}}></span>
              </Link>
            ))}

            {/* Authentication Section */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 glass hover:bg-white/20 rounded-lg transition-all"
                >
                  <User className="w-5 h-5" style={{color: 'var(--color-kenya-green)'}} />
                  <span className="font-medium text-gray-700">{user.username}</span>
                  {user.is_temporary_password && (
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--color-kenya-red)'}} title="Password change required"></div>
                  )}
                </button>

                {/* User Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 glass-dark border border-white/20 rounded-lg shadow-xl z-50">
                    <div className="p-2 space-y-1">
                      <div className="px-3 py-2 border-b border-white/10">
                        <p className="text-sm font-medium text-gray-700">Kenya Government</p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                      </div>
                      {user.is_temporary_password && (
                        <Link
                          href="/change-password"
                          className="flex items-center px-3 py-2 text-sm hover:bg-white/10 rounded transition-colors" style={{color: 'var(--color-kenya-red)'}}
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Change Password (Required)
                        </Link>
                      )}
                      <Link
                        href="/change-password"
                        className="flex items-center px-3 py-2 text-sm hover:bg-white/10 rounded transition-colors text-gray-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Change Password
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center px-3 py-2 text-sm hover:bg-white/10 rounded transition-colors text-gray-700"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/signin" className="btn-kenya text-sm">
                Government Sign In
                <ChevronRight className="inline-block w-4 h-4 ml-1" />
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" style={{color: 'var(--color-kenya-red)'}} />
            ) : (
              <Menu className="w-6 h-6" style={{color: 'var(--color-kenya-green)'}} />
            )}
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 glass-kenya border-t border-white/20">
            <div className="section-padding py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-3 text-gray-700 hover:text-green-700 transition-colors font-medium relative"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                  {link.soon && (
                    <span className="ml-2 text-xs text-white px-2 py-1 rounded" style={{backgroundColor: 'var(--color-kenya-red)'}}>
                      coming soon
                    </span>
                  )}
                </Link>
              ))}

              {/* Mobile Authentication */}
              {isAuthenticated && user ? (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex items-center mb-4">
                    <User className="w-5 h-5 mr-2" style={{color: 'var(--color-kenya-green)'}} />
                    <span className="font-medium text-gray-700">{user.username}</span>
                    {user.is_temporary_password && (
                      <div className="w-2 h-2 rounded-full ml-2" style={{backgroundColor: 'var(--color-kenya-red)'}} title="Password change required"></div>
                    )}
                  </div>
                  {user.is_temporary_password && (
                    <Link
                      href="/change-password"
                      className="block py-2 text-sm font-medium transition-colors mb-2" style={{color: 'var(--color-kenya-red)'}}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Change Password (Required)
                    </Link>
                  )}
                  <Link
                    href="/change-password"
                    className="block py-2 text-sm text-gray-700 hover:text-green-700 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Change Password
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block py-2 text-sm text-gray-700 hover:text-red-700 transition-colors w-full text-left"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link href="/signin" className="btn-kenya text-sm w-full mt-4" onClick={() => setIsMobileMenuOpen(false)}>
                  Government Sign In
                  <ChevronRight className="inline-block w-4 h-4 ml-1" />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;