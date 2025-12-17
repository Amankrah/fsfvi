'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Key,
  Shield,
  User,
  Clock,
  TrendingUp,
  Activity,
  AlertTriangle,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { useDeveloperAuth } from '@/hooks/useDeveloperAuth';
import { developerApiKeyAPI } from '@/lib/developerApi';
import type { ApiKey } from '@/lib/types/developer';
import { StatsCard, PageHeader, AlertBanner, EmptyState } from '@/components/developer';

export default function DeveloperDashboardPage() {
  const { user } = useDeveloperAuth(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const response = await developerApiKeyAPI.listApiKeys();
      if (response.success) {
        setApiKeys(response.data);
      }
    } catch (err: any) {
      setError('Failed to load API keys');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeKeys = apiKeys.filter((key) => key.status === 'active');
  const totalUsage = apiKeys.reduce((sum, key) => sum + key.usage_count, 0);

  // Get keys expiring soon (within 30 days)
  const expiringKeys = apiKeys.filter((key) => {
    if (!key.expires_at) return false;
    const daysUntilExpiry = Math.floor(
      (new Date(key.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'Developer'}`}
        description="Monitor your API usage, manage your keys, and ensure your account security."
        icon={Activity}
      />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active API Keys"
          value={activeKeys.length}
          icon={Key}
          iconColor="green"
          action={{
            label: 'Manage keys',
            href: '/developer/api-keys',
          }}
        />

        <StatsCard
          title="Total API Calls"
          value={totalUsage.toLocaleString()}
          icon={BarChart3}
          iconColor="blue"
        />

        <StatsCard
          title="MFA Security"
          value={user?.mfa_enabled ? 'Enabled' : 'Disabled'}
          icon={Shield}
          iconColor={user?.mfa_enabled ? 'green' : 'yellow'}
          action={{
            label: user?.mfa_enabled ? 'Manage MFA' : 'Enable now',
            href: '/developer/security',
          }}
        />

        <StatsCard
          title="Account Status"
          value={user?.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Active'}
          icon={User}
          iconColor="indigo"
          action={{
            label: 'View profile',
            href: '/developer/profile',
          }}
        />
      </div>

      {/* Alerts Section */}
      {(expiringKeys.length > 0 || !user?.mfa_enabled) && (
        <div className="space-y-4">
          {expiringKeys.length > 0 && (
            <AlertBanner
              variant="warning"
              title="API Keys Expiring Soon"
              message={`You have ${expiringKeys.length} API ${
                expiringKeys.length === 1 ? 'key' : 'keys'
              } expiring within the next 30 days. Consider rotating them to maintain uninterrupted access.`}
              action={{
                label: 'View Expiring Keys',
                onClick: () => (window.location.href = '/developer/api-keys'),
              }}
            />
          )}
        </div>
      )}

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent API Keys */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Key className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Your API Keys</h2>
              </div>
              <Link
                href="/developer/api-keys"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <span>View all</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {isLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-sm text-gray-600">Loading API keys...</p>
              </div>
            ) : error ? (
              <div className="px-6 py-12">
                <AlertBanner
                  variant="error"
                  title="Error Loading API Keys"
                  message={error}
                />
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="px-6 py-12">
                <EmptyState
                  icon={Key}
                  title="No API Keys Yet"
                  description="Create your first API key to start accessing FSFVI government endpoints and services."
                  action={{
                    label: 'Create Your First API Key',
                    onClick: () => (window.location.href = '/developer/api-keys'),
                  }}
                />
              </div>
            ) : (
              <>
                {apiKeys.slice(0, 5).map((key) => (
                  <div
                    key={key.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => (window.location.href = '/developer/api-keys')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{key.name}</h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                              key.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : key.status === 'expired'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {key.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                            {key.key_prefix}...
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 ml-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {key.usage_count.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">requests</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {apiKeys.length > 5 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <Link
                href="/developer/api-keys"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center space-x-1"
              >
                <span>View all {apiKeys.length} API keys</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions & Info */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30 p-6 text-white">
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Quick Actions</span>
            </h3>
            <div className="space-y-3">
              <Link
                href="/developer/api-keys"
                className="block w-full px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-colors text-center font-medium text-sm border border-white/20"
              >
                Create New API Key
              </Link>
              {!user?.mfa_enabled && (
                <Link
                  href="/developer/security"
                  className="block w-full px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors text-center font-medium text-sm text-gray-900 shadow-md"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Enable MFA</span>
                  </span>
                </Link>
              )}
              <Link
                href="/developer/profile"
                className="block w-full px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-colors text-center font-medium text-sm border border-white/20"
              >
                View Profile
              </Link>
            </div>
          </div>

          {/* Account Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-600" />
              <span>Account Information</span>
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Email</span>
                <span className="font-medium text-gray-900 truncate ml-2">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Role</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                  {user?.role}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Member since</span>
                <span className="font-medium text-gray-900">
                  {user?.created_at && new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* System Notice */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-purple-900 mb-1">Food Systems Financial Intelligence</h4>
                <p className="text-[10px] text-purple-800 leading-relaxed">
                  All API access is monitored and logged. Track financial flows in food systems.
                  Your keys are subject to government security policies including mandatory rotation and expiration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
