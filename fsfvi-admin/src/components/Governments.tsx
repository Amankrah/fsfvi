import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Government, CreateGovernmentRequest, GovernmentDetail, UpdateGovernmentRequest } from '../types';

export function Governments() {
  const [governments, setGovernments] = useState<Government[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGovernment, setSelectedGovernment] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGovernments();
  }, []);

  const loadGovernments = async () => {
    try {
      const response = await apiClient.listGovernments();
      setGovernments(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load governments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm('Are you sure you want to suspend this government?')) return;

    try {
      await apiClient.suspendGovernment(id);
      await loadGovernments(); // Reload after action
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to suspend government');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await apiClient.activateGovernment(id);
      await loadGovernments(); // Reload after action
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to activate government');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading governments...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Government Management</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          {showCreateForm ? 'Cancel' : '+ New Government'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showCreateForm && (
        <CreateGovernmentForm
          onSuccess={() => {
            setShowCreateForm(false);
            loadGovernments();
          }}
        />
      )}

      {selectedGovernment && (
        <GovernmentDetailModal
          governmentId={selectedGovernment}
          onClose={() => {
            setSelectedGovernment(null);
            loadGovernments();
          }}
        />
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Country
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Government
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {governments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No governments found. Create one to get started.
                </td>
              </tr>
            ) : (
              governments.map((gov) => (
                <tr key={gov.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{gov.country_name}</div>
                    <div className="text-sm text-gray-500">{gov.country_code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {gov.government_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {gov.government_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        gov.tier === 'enterprise'
                          ? 'bg-purple-100 text-purple-800'
                          : gov.tier === 'premium'
                          ? 'bg-blue-100 text-blue-800'
                          : gov.tier === 'standard'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {gov.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        gov.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : gov.status === 'suspended' || gov.status === 'revoked'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {gov.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{gov.primary_contact_name}</div>
                    <div className="text-sm text-gray-500">{gov.contact_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setSelectedGovernment(gov.id)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        View
                      </button>
                      {gov.status === 'active' ? (
                        <button
                          onClick={() => handleSuspend(gov.id)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(gov.id)}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateGovernmentForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState<CreateGovernmentRequest>({
    country_code: '',
    country_name: '',
    government_name: '',
    government_type: 'federal',
    tier: 'basic',
    contact_email: '',
    primary_contact_name: '',
    primary_contact_title: '',
    api_quota_daily: 1000,
    api_quota_monthly: 30000,
    allowed_endpoints: [],
    max_active_api_keys: 5,  // Default: 5 active keys
    mandatory_rotation_days: undefined,  // Default: no mandatory rotation
    api_key_expiry_days: 365,  // Default: 365 days (1 year)
  });
  const [availableScopes, setAvailableScopes] = useState<string[]>([]);
  const [scopeDescriptions, setScopeDescriptions] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingScopes, setIsLoadingScopes] = useState(true);

  useEffect(() => {
    loadScopes();
  }, []);

  const loadScopes = async () => {
    try {
      const response = await apiClient.getAvailableScopes();
      setAvailableScopes(response.data.scopes);
      setScopeDescriptions(response.data.descriptions);
      // Set first two scopes as default
      setFormData((prev) => ({
        ...prev,
        allowed_endpoints: response.data.scopes.slice(0, 2),
      }));
    } catch (err: any) {
      setError('Failed to load available scopes from backend');
    } finally {
      setIsLoadingScopes(false);
    }
  };

  const handleScopeToggle = (scope: string) => {
    // Security check: Warn if granting wildcard access
    if (scope === '*' && !formData.allowed_endpoints.includes(scope)) {
      const confirmed = window.confirm(
        '⚠️ SECURITY WARNING ⚠️\n\n' +
        'You are about to grant WILDCARD (*) permission to this new government.\n\n' +
        'This grants UNRESTRICTED ACCESS to ALL API endpoints, including:\n' +
        '- All current endpoints\n' +
        '- All future endpoints\n' +
        '- No scope restrictions\n\n' +
        'This should ONLY be used for:\n' +
        '• Internal testing accounts\n' +
        '• System administrators\n' +
        '• Development environments\n\n' +
        'For production government accounts, please grant specific scopes instead.\n\n' +
        'Are you ABSOLUTELY SURE you want to proceed?'
      );

      if (!confirmed) {
        return; // Cancel the action
      }
    }

    setFormData((prev) => ({
      ...prev,
      allowed_endpoints: prev.allowed_endpoints.includes(scope)
        ? prev.allowed_endpoints.filter((s) => s !== scope)
        : [...prev.allowed_endpoints, scope],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.allowed_endpoints.length === 0) {
      setError('Please select at least one API endpoint/scope');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.createGovernment(formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create government');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingScopes) {
    return <div className="text-center py-4">Loading form configuration...</div>;
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Create New Government</h3>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={2}
              value={formData.country_code}
              onChange={(e) =>
                setFormData({ ...formData, country_code: e.target.value.toUpperCase() })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="KE"
            />
            <p className="mt-1 text-xs text-gray-500">ISO 3166-1 alpha-2 code (2 letters)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.country_name}
              onChange={(e) => setFormData({ ...formData, country_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Kenya"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Government Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.government_name}
            onChange={(e) => setFormData({ ...formData, government_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Ministry of Agriculture and Livestock"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="gov-type" className="block text-sm font-medium text-gray-700 mb-1">
              Government Type <span className="text-red-500">*</span>
            </label>
            <select
              id="gov-type"
              value={formData.government_type}
              onChange={(e) =>
                setFormData({ ...formData, government_type: e.target.value as any })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="federal">Federal</option>
              <option value="state">State</option>
              <option value="regional">Regional</option>
              <option value="local">Local</option>
              <option value="agency">Agency</option>
            </select>
          </div>

          <div>
            <label htmlFor="gov-tier" className="block text-sm font-medium text-gray-700 mb-1">
              Access Tier <span className="text-red-500">*</span>
            </label>
            <select
              id="gov-tier"
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="basic">Basic - Limited access</option>
              <option value="standard">Standard - Full core access</option>
              <option value="premium">Premium - Advanced analytics</option>
              <option value="enterprise">Enterprise - Custom integrations</option>
            </select>
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-t pt-4">
          <h4 className="text-md font-semibold mb-3 text-gray-900">Primary Contact Information</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.primary_contact_name}
                onChange={(e) =>
                  setFormData({ ...formData, primary_contact_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.primary_contact_title}
                onChange={(e) =>
                  setFormData({ ...formData, primary_contact_title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Director of Technology"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="contact@government.gov"
            />
          </div>
        </div>

        {/* API Configuration */}
        <div className="border-t pt-4">
          <h4 className="text-md font-semibold mb-3 text-gray-900">API Configuration</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="daily-quota" className="block text-sm font-medium text-gray-700 mb-1">
                Daily API Quota <span className="text-red-500">*</span>
              </label>
              <input
                id="daily-quota"
                type="number"
                required
                min={100}
                value={formData.api_quota_daily}
                onChange={(e) =>
                  setFormData({ ...formData, api_quota_daily: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                aria-label="Daily API quota in number of requests"
                title="Maximum API requests allowed per day"
                placeholder="1000"
              />
              <p className="mt-1 text-xs text-gray-500">Maximum requests per day</p>
            </div>

            <div>
              <label htmlFor="monthly-quota" className="block text-sm font-medium text-gray-700 mb-1">
                Monthly API Quota <span className="text-red-500">*</span>
              </label>
              <input
                id="monthly-quota"
                type="number"
                required
                min={1000}
                value={formData.api_quota_monthly}
                onChange={(e) =>
                  setFormData({ ...formData, api_quota_monthly: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                aria-label="Monthly API quota in number of requests"
                title="Maximum API requests allowed per month"
                placeholder="30000"
              />
              <p className="mt-1 text-xs text-gray-500">Maximum requests per month</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allowed API Endpoints/Scopes <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
              {availableScopes.map((scope) => (
                <label
                  key={scope}
                  className={`flex items-start space-x-3 cursor-pointer p-2 rounded transition-colors ${
                    scope === '*'
                      ? 'bg-red-50 border-2 border-red-300 hover:bg-red-100'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.allowed_endpoints.includes(scope)}
                    onChange={() => handleScopeToggle(scope)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    aria-label={`Enable ${scope} scope - ${scopeDescriptions[scope]}`}
                    title={scopeDescriptions[scope]}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{scope}</div>
                    <div className="text-xs text-gray-500">{scopeDescriptions[scope]}</div>
                  </div>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Selected: {formData.allowed_endpoints.length} scope(s) - Fetched dynamically from
              backend
            </p>
          </div>
        </div>

        {/* API Key Security Controls */}
        <div className="border-t pt-4">
          <h4 className="text-md font-semibold mb-3 text-gray-900">🔐 API Key Security Controls</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="max-keys" className="block text-sm font-medium text-gray-700 mb-1">
                Max Active API Keys <span className="text-red-500">*</span>
              </label>
              <input
                id="max-keys"
                type="number"
                required
                min={1}
                max={50}
                value={formData.max_active_api_keys}
                onChange={(e) =>
                  setFormData({ ...formData, max_active_api_keys: parseInt(e.target.value) || 5 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                aria-label="Maximum active API keys allowed"
                title="Maximum number of active API keys this government can have (1-50)"
                placeholder="5"
              />
              <p className="mt-1 text-xs text-gray-500">Limit: 1-50 keys (Default: 5)</p>
            </div>

            <div>
              <label htmlFor="rotation-days" className="block text-sm font-medium text-gray-700 mb-1">
                Mandatory Rotation Days
              </label>
              <input
                id="rotation-days"
                type="number"
                min={1}
                max={365}
                value={formData.mandatory_rotation_days || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    mandatory_rotation_days: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                aria-label="Mandatory API key rotation period in days"
                title="Force API key rotation every N days (1-365, leave empty for no rotation)"
                placeholder="Optional (e.g., 90)"
              />
              <p className="mt-1 text-xs text-gray-500">Optional: 1-365 days (Empty = No rotation)</p>
            </div>

            <div>
              <label htmlFor="api-key-expiry" className="block text-sm font-medium text-gray-700 mb-1">
                API Key Expiry Days
              </label>
              <input
                id="api-key-expiry"
                type="number"
                min={1}
                max={730}
                value={formData.api_key_expiry_days || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    api_key_expiry_days: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                aria-label="Default API key expiration in days"
                title="Default expiration for ALL API keys created under this government (1-730 days)"
                placeholder="365"
              />
              <p className="mt-1 text-xs text-gray-500">Optional: 1-730 days (Default: 365)</p>
            </div>
          </div>

          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Security Controls:</strong>
            </p>
            <ul className="mt-1 text-xs text-blue-700 list-disc list-inside space-y-1">
              <li><strong>Max Active Keys:</strong> Limits total API keys per government (prevents key sprawl)</li>
              <li><strong>Mandatory Rotation:</strong> Forces periodic key rotation to limit exposure window</li>
              <li><strong>API Key Expiry:</strong> ALL users inherit this expiration policy (ensures consistency)</li>
              <li><strong>One-Key-Per-User:</strong> Each user automatically limited to 1 active key (backend enforced)</li>
            </ul>
          </div>
        </div>

        {/* IP Whitelist (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            IP Whitelist (Optional)
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Restrict API access to specific IP addresses. Leave empty to allow access from any IP.
          </p>

          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Enter IP address (e.g., 192.168.1.100)"
                value={(formData as any).newIpAddress || ''}
                onChange={(e) => setFormData({ ...formData, newIpAddress: e.target.value } as any)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                aria-label="New IP address"
              />
              <button
                type="button"
                onClick={() => {
                  const newIp = ((formData as any).newIpAddress || '').trim();
                  if (!newIp) return;

                  // Basic IP validation
                  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
                  const ipv6Regex = /^([\da-fA-F]{0,4}:){2,7}[\da-fA-F]{0,4}$/;

                  if (!ipv4Regex.test(newIp) && !ipv6Regex.test(newIp)) {
                    alert('Please enter a valid IP address (IPv4 or IPv6)');
                    return;
                  }

                  const currentIps = formData.ip_whitelist || [];
                  if (currentIps.includes(newIp)) {
                    alert('This IP address is already in the whitelist');
                    return;
                  }

                  setFormData({
                    ...formData,
                    ip_whitelist: [...currentIps, newIp],
                    newIpAddress: '',
                  } as any);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Add IP
              </button>
            </div>

            <div className="space-y-2">
              {(formData.ip_whitelist || []).length > 0 ? (
                (formData.ip_whitelist || []).map((ip) => (
                  <div
                    key={ip}
                    className="flex items-center justify-between bg-white p-2 rounded border border-gray-200"
                  >
                    <span className="text-sm font-mono text-gray-900">{ip}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          ip_whitelist: (formData.ip_whitelist || []).filter((i) => i !== ip),
                        });
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 italic text-center py-2">
                  No IP addresses (access from any IP)
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <p className="text-xs text-blue-800">
                <strong>Examples:</strong> Server IPs, Office network, VPN gateway, or specific developer IPs
              </p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onSuccess}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Government'}
          </button>
        </div>
      </form>
    </div>
  );
}

function GovernmentDetailModal({ governmentId, onClose }: { governmentId: string; onClose: () => void }) {
  const [government, setGovernment] = useState<GovernmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [availableScopes, setAvailableScopes] = useState<string[]>([]);
  const [scopeDescriptions, setScopeDescriptions] = useState<Record<string, string>>({});

  // Extended form data type to include UI-only fields
  const [formData, setFormData] = useState<UpdateGovernmentRequest & { newIpAddress?: string }>({});

  useEffect(() => {
    loadGovernmentDetail();
    loadScopes();
  }, [governmentId]);

  const loadGovernmentDetail = async () => {
    try {
      const response = await apiClient.getGovernment(governmentId);
      setGovernment(response.data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load government details');
      setIsLoading(false);
    }
  };

  const loadScopes = async () => {
    try {
      const response = await apiClient.getAvailableScopes();
      setAvailableScopes(response.data.scopes);
      setScopeDescriptions(response.data.descriptions);
    } catch (err: any) {
      console.error('Failed to load scopes:', err);
    }
  };

  const handleEdit = () => {
    if (government) {
      // Initialize form with current government data
      setFormData({
        tier: government.tier,
        status: government.status,
        contact_email: government.contact_email,
        api_quota_daily: government.api_quota_daily,
        api_quota_monthly: government.api_quota_monthly,
        allowed_endpoints: government.allowed_endpoints,
        ip_whitelist: government.ip_whitelist || undefined,
        max_active_api_keys: government.max_active_api_keys,
        mandatory_rotation_days: government.mandatory_rotation_days || undefined,
        api_key_expiry_days: government.api_key_expiry_days || undefined,
      });
      setIsEditing(true);
    }
  };

  const handleDelete = async () => {
    if (!government) return;

    // Multi-step confirmation for critical operation
    const step1 = window.confirm(
      `🚨 CRITICAL WARNING - PERMANENT DELETION 🚨\n\n` +
      `You are about to DELETE the government account:\n\n` +
      `• Government: ${government.government_name}\n` +
      `• Country: ${government.country_name}\n` +
      `• Status: ${government.status}\n\n` +
      `This action is PERMANENT and IRREVERSIBLE!\n\n` +
      `Do you want to proceed to the next confirmation step?`
    );

    if (!step1) return;

    // Second confirmation with typed verification
    const governmentName = government.government_name;
    const typedName = window.prompt(
      `🚨 SECOND CONFIRMATION REQUIRED 🚨\n\n` +
      `This will PERMANENTLY DELETE:\n` +
      `• All users associated with this government\n` +
      `• All API keys and access tokens\n` +
      `• All usage statistics and audit logs\n` +
      `• The government account itself\n\n` +
      `NOTE: Active governments cannot be deleted. Status must be 'suspended' first.\n\n` +
      `To confirm, type the government name exactly:\n` +
      `"${governmentName}"`
    );

    if (typedName !== governmentName) {
      alert('❌ Deletion cancelled - name did not match exactly.');
      return;
    }

    // Final confirmation
    const finalConfirm = window.confirm(
      `⚠️ FINAL CONFIRMATION ⚠️\n\n` +
      `This is your LAST CHANCE to cancel.\n\n` +
      `Are you ABSOLUTELY CERTAIN you want to permanently delete "${governmentName}"?\n\n` +
      `Click OK to DELETE PERMANENTLY or Cancel to abort.`
    );

    if (!finalConfirm) return;

    setIsSaving(true);
    setError('');

    try {
      await apiClient.deleteGovernment(governmentId);
      alert(`✅ Government "${governmentName}" has been permanently deleted.`);
      onClose(); // Close modal and refresh list
    } catch (err: any) {
      // Parse error response - check multiple possible fields
      let errorMsg = 'Failed to delete government';

      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.error) {
          // Backend returns error in "error" field
          errorMsg = err.response.data.error;
        } else if (err.response.data.message) {
          errorMsg = err.response.data.message;
        }
      }

      setError(errorMsg);

      // Provide user-friendly instructions for "active government" error
      if (errorMsg.toLowerCase().includes('active government') || errorMsg.toLowerCase().includes('suspend')) {
        alert(
          `❌ DELETION BLOCKED - Government is Active\n\n` +
          `Security Policy: Active governments cannot be deleted.\n\n` +
          `Required steps to delete this government:\n\n` +
          `1. Click "OK" to close this error\n` +
          `2. Click "Edit" button\n` +
          `3. Change Status to "Suspended"\n` +
          `4. Click "Save Changes"\n` +
          `5. Then try deleting again\n\n` +
          `Error details: ${errorMsg}`
        );
      } else {
        alert(`❌ Deletion failed: ${errorMsg}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!government) return;

    setIsSaving(true);
    setError('');

    try {
      // Build update payload with only changed fields
      const updatePayload: UpdateGovernmentRequest = {};

      if (formData.status !== undefined && formData.status !== government.status) {
        updatePayload.status = formData.status;
      }
      if (formData.tier !== undefined && formData.tier !== government.tier) {
        updatePayload.tier = formData.tier;
      }
      if (formData.contact_email !== undefined && formData.contact_email !== government.contact_email) {
        updatePayload.contact_email = formData.contact_email;
      }
      if (formData.api_quota_daily !== undefined && formData.api_quota_daily !== government.api_quota_daily) {
        updatePayload.api_quota_daily = formData.api_quota_daily;
      }
      if (formData.api_quota_monthly !== undefined && formData.api_quota_monthly !== government.api_quota_monthly) {
        updatePayload.api_quota_monthly = formData.api_quota_monthly;
      }
      if (formData.allowed_endpoints !== undefined) {
        // Check if endpoints have changed (bidirectional comparison)
        const currentEndpoints = [...(government.allowed_endpoints || [])].sort();
        const newEndpoints = [...(formData.allowed_endpoints || [])].sort();
        const endpointsChanged =
          currentEndpoints.length !== newEndpoints.length ||
          !currentEndpoints.every((ep, idx) => ep === newEndpoints[idx]);

        if (endpointsChanged) {
          updatePayload.allowed_endpoints = formData.allowed_endpoints;
        }
      }
      if (formData.ip_whitelist !== undefined) {
        updatePayload.ip_whitelist = formData.ip_whitelist;
      }
      // API Key Security Controls
      if (formData.max_active_api_keys !== undefined && formData.max_active_api_keys !== government.max_active_api_keys) {
        updatePayload.max_active_api_keys = formData.max_active_api_keys;
      }
      if (formData.mandatory_rotation_days !== undefined && formData.mandatory_rotation_days !== government.mandatory_rotation_days) {
        updatePayload.mandatory_rotation_days = formData.mandatory_rotation_days;
      }
      if (formData.api_key_expiry_days !== undefined && formData.api_key_expiry_days !== government.api_key_expiry_days) {
        updatePayload.api_key_expiry_days = formData.api_key_expiry_days;
      }

      // Validate that at least one field is being updated
      if (Object.keys(updatePayload).length === 0) {
        setError('No changes detected. Please modify at least one field before saving.');
        setIsSaving(false);
        return;
      }

      console.log('=== UPDATE PAYLOAD ===');
      console.log('Government ID:', governmentId);
      console.log('Payload:', JSON.stringify(updatePayload, null, 2));
      console.log('Original allowed_endpoints:', government.allowed_endpoints);
      console.log('New allowed_endpoints:', formData.allowed_endpoints);

      await apiClient.updateGovernment(governmentId, updatePayload);
      await loadGovernmentDetail();
      setIsEditing(false);
      setFormData({});
    } catch (err: any) {
      console.error('=== UPDATE ERROR ===');
      console.error('Error object:', err);
      console.error('Response:', err.response);
      console.error('Status:', err.response?.status);
      console.error('Data:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to update government');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!government) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Government Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-600">Country</label>
                <p className="text-sm text-gray-900 mt-1">{government.country_name} ({government.country_code})</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Government Name</label>
                <p className="text-sm text-gray-900 mt-1">{government.government_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Type</label>
                <p className="text-sm text-gray-900 mt-1 capitalize">{government.government_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Status</label>
                {isEditing ? (
                  <select
                    value={formData.status ?? government.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    title="Government account status"
                    aria-label="Select government status"
                  >
                    <option value="pending">Pending - Awaiting approval</option>
                    <option value="active">Active - Fully operational</option>
                    <option value="suspended">Suspended - Temporarily disabled</option>
                    <option value="revoked">Revoked - Permanently disabled</option>
                  </select>
                ) : (
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      government.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : government.status === 'suspended' || government.status === 'revoked'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {government.status}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-600">Contact Name</label>
                <p className="text-sm text-gray-900 mt-1">{government.primary_contact_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Contact Title</label>
                <p className="text-sm text-gray-900 mt-1">{government.primary_contact_title}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.contact_email ?? government.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="contact@government.gov"
                    title="Contact email address"
                    aria-label="Contact email address"
                  />
                ) : (
                  <p className="text-sm text-gray-900 mt-1">{government.contact_email}</p>
                )}
              </div>
            </div>
          </div>

          {/* API Configuration */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">API Configuration</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Access Tier</label>
                  {isEditing ? (
                    <select
                      value={formData.tier || government.tier}
                      onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      title="Access tier level for API permissions"
                      aria-label="Select access tier"
                    >
                      <option value="basic">Basic</option>
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900 mt-1 capitalize">{government.tier}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">ID</label>
                  <p className="text-xs text-gray-500 mt-1 font-mono">{government.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Daily Quota</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={100}
                      value={formData.api_quota_daily ?? government.api_quota_daily}
                      onChange={(e) =>
                        setFormData({ ...formData, api_quota_daily: parseInt(e.target.value) || 0 })
                      }
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="1000"
                      title="Maximum API requests allowed per day"
                      aria-label="Daily API quota"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 mt-1">{government.api_quota_daily.toLocaleString()} requests/day</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Monthly Quota</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={1000}
                      value={formData.api_quota_monthly ?? government.api_quota_monthly}
                      onChange={(e) =>
                        setFormData({ ...formData, api_quota_monthly: parseInt(e.target.value) || 0 })
                      }
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="30000"
                      title="Maximum API requests allowed per month"
                      aria-label="Monthly API quota"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 mt-1">{government.api_quota_monthly.toLocaleString()} requests/month</p>
                  )}
                </div>
              </div>

              {/* Allowed Endpoints/Scopes */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Allowed API Endpoints/Scopes
                </label>
                {isEditing ? (
                  <div className="space-y-2 bg-white border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {availableScopes.length > 0 ? (
                      availableScopes.map((scope) => (
                        <label
                          key={scope}
                          className={`flex items-start space-x-3 cursor-pointer p-2 rounded transition-colors ${
                            scope === '*'
                              ? 'bg-red-50 border-2 border-red-300 hover:bg-red-100'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={(formData.allowed_endpoints ?? government.allowed_endpoints)?.includes(scope)}
                            onChange={(e) => {
                              // Security check: Warn if granting wildcard access
                              if (scope === '*' && e.target.checked) {
                                const confirmed = window.confirm(
                                  '⚠️ SECURITY WARNING ⚠️\n\n' +
                                  'You are about to grant WILDCARD (*) permission to this government.\n\n' +
                                  'This grants UNRESTRICTED ACCESS to ALL API endpoints, including:\n' +
                                  '- All current endpoints\n' +
                                  '- All future endpoints\n' +
                                  '- No scope restrictions\n\n' +
                                  'This should ONLY be used for:\n' +
                                  '• Internal testing accounts\n' +
                                  '• System administrators\n' +
                                  '• Development environments\n\n' +
                                  'For production government accounts, please grant specific scopes instead.\n\n' +
                                  'Are you ABSOLUTELY SURE you want to proceed?'
                                );

                                if (!confirmed) {
                                  return; // Cancel the action
                                }
                              }

                              const currentEndpoints = formData.allowed_endpoints ?? government.allowed_endpoints ?? [];
                              setFormData({
                                ...formData,
                                allowed_endpoints: e.target.checked
                                  ? [...currentEndpoints, scope]
                                  : currentEndpoints.filter((s) => s !== scope),
                              });
                            }}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            aria-label={`Enable ${scope} scope`}
                            title={scopeDescriptions[scope]}
                          />
                          <div className="flex-1">
                            <div className="text-xs font-medium text-gray-900">{scope}</div>
                            <div className="text-xs text-gray-500">{scopeDescriptions[scope]}</div>
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-2">Loading scopes...</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {government.allowed_endpoints && government.allowed_endpoints.length > 0 ? (
                      government.allowed_endpoints.map((scope) => (
                        <div key={scope} className="flex items-start space-x-2 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            scope === '*'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {scope}
                          </span>
                          {scopeDescriptions[scope] && (
                            <span className={`text-xs mt-1 ${
                              scope === '*' ? 'text-red-600 font-medium' : 'text-gray-500'
                            }`}>
                              {scopeDescriptions[scope]}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">No scopes assigned</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* API Key Security Controls */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">🔐 API Key Security Controls</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Max Active API Keys</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={formData.max_active_api_keys ?? government.max_active_api_keys}
                      onChange={(e) =>
                        setFormData({ ...formData, max_active_api_keys: parseInt(e.target.value) || 5 })
                      }
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="5"
                      title="Maximum number of active API keys (1-50)"
                      aria-label="Max active API keys"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 mt-1">{government.max_active_api_keys} keys</p>
                  )}
                  {isEditing && (
                    <p className="mt-1 text-xs text-gray-500">Range: 1-50 keys</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Mandatory Rotation Period</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={formData.mandatory_rotation_days ?? government.mandatory_rotation_days ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mandatory_rotation_days: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional (e.g., 90)"
                      title="Force API key rotation every N days (1-365, leave empty for no rotation)"
                      aria-label="Mandatory rotation days"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 mt-1">
                      {government.mandatory_rotation_days
                        ? `${government.mandatory_rotation_days} days`
                        : 'No mandatory rotation'}
                    </p>
                  )}
                  {isEditing && (
                    <p className="mt-1 text-xs text-gray-500">Range: 1-365 days (empty = no rotation)</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">API Key Expiry Period</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={1}
                      max={730}
                      value={formData.api_key_expiry_days ?? government.api_key_expiry_days ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          api_key_expiry_days: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional (e.g., 365)"
                      title="Default API key expiration for ALL users (1-730 days)"
                      aria-label="API key expiry days"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 mt-1">
                      {government.api_key_expiry_days
                        ? `${government.api_key_expiry_days} days`
                        : 'No expiration'}
                    </p>
                  )}
                  {isEditing && (
                    <p className="mt-1 text-xs text-gray-500">Range: 1-730 days (empty = no expiration)</p>
                  )}
                </div>
              </div>

              {!isEditing && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Active Security Policies:</strong>
                  </p>
                  <ul className="mt-1 text-xs text-blue-700 list-disc list-inside space-y-1">
                    <li>
                      <strong>Max Active Keys:</strong> Government can have up to {government.max_active_api_keys} active API keys
                    </li>
                    <li>
                      <strong>Key Rotation:</strong>{' '}
                      {government.mandatory_rotation_days
                        ? `Keys must be rotated every ${government.mandatory_rotation_days} days`
                        : 'No mandatory rotation policy'}
                    </li>
                    <li>
                      <strong>API Key Expiry:</strong>{' '}
                      {government.api_key_expiry_days
                        ? `All API keys expire after ${government.api_key_expiry_days} days`
                        : 'No expiration policy (keys never expire)'}
                    </li>
                    <li>
                      <strong>One-Key-Per-User:</strong> Each user limited to 1 active key (auto-enforced)
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* IP Whitelist Configuration */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">🌐 IP Whitelist (Optional)</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <p className="text-xs text-gray-600">
                Restrict API access to specific IP addresses. Leave empty to allow access from any IP.
              </p>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Enter IP address (e.g., 192.168.1.100)"
                      value={formData.newIpAddress || ''}
                      onChange={(e) => setFormData({ ...formData, newIpAddress: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      aria-label="New IP address"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newIp = (formData.newIpAddress || '').trim();
                        if (!newIp) return;

                        // Basic IP validation (IPv4)
                        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
                        const ipv6Regex = /^([\da-fA-F]{0,4}:){2,7}[\da-fA-F]{0,4}$/;

                        if (!ipv4Regex.test(newIp) && !ipv6Regex.test(newIp)) {
                          alert('Please enter a valid IP address (IPv4 or IPv6)');
                          return;
                        }

                        const currentIps = formData.ip_whitelist ?? government.ip_whitelist ?? [];
                        if (currentIps.includes(newIp)) {
                          alert('This IP address is already in the whitelist');
                          return;
                        }

                        setFormData({
                          ...formData,
                          ip_whitelist: [...currentIps, newIp],
                          newIpAddress: '',
                        });
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Add IP
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(formData.ip_whitelist ?? government.ip_whitelist ?? []).length > 0 ? (
                      (formData.ip_whitelist ?? government.ip_whitelist ?? []).map((ip) => (
                        <div
                          key={ip}
                          className="flex items-center justify-between bg-white p-2 rounded border border-gray-200"
                        >
                          <span className="text-sm font-mono text-gray-900">{ip}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const currentIps = formData.ip_whitelist ?? government.ip_whitelist ?? [];
                              setFormData({
                                ...formData,
                                ip_whitelist: currentIps.filter((i) => i !== ip),
                              });
                            }}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 italic text-center py-2">
                        No IP addresses whitelisted (access allowed from any IP)
                      </p>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>IP Whitelist Examples:</strong>
                    </p>
                    <ul className="mt-1 text-xs text-blue-700 list-disc list-inside space-y-1">
                      <li><strong>Server IP:</strong> If government backend calls the API (e.g., 203.0.113.50)</li>
                      <li><strong>Office Network:</strong> If developers work from specific location (e.g., 198.51.100.0/24)</li>
                      <li><strong>VPN Gateway:</strong> If government uses VPN (e.g., 192.0.2.1)</li>
                      <li><strong>Developer IPs:</strong> Individual developer machine IPs</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {government.ip_whitelist && government.ip_whitelist.length > 0 ? (
                    <>
                      <p className="text-xs text-gray-600 mb-2">
                        <strong>Whitelisted IPs ({government.ip_whitelist.length}):</strong>
                      </p>
                      <div className="space-y-1">
                        {government.ip_whitelist.map((ip) => (
                          <div
                            key={ip}
                            className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-mono mr-2 mb-1"
                          >
                            {ip}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
                        <p className="text-xs text-green-800">
                          ✅ <strong>IP Restriction Active:</strong> API access only allowed from whitelisted IPs
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs text-yellow-800">
                        ⚠️ <strong>No IP Restriction:</strong> API access allowed from any IP address
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Timeline</h3>
            <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-600">Created</label>
                <p className="text-xs text-gray-900 mt-1">{new Date(government.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Activated</label>
                <p className="text-xs text-gray-900 mt-1">
                  {government.activated_at ? new Date(government.activated_at).toLocaleString() : 'Not activated'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Expires</label>
                <p className="text-xs text-gray-900 mt-1">
                  {government.expires_at ? new Date(government.expires_at).toLocaleString() : 'No expiration'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({});
                  setError('');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mr-auto"
                title="Permanently delete this government account"
              >
                🗑️ Delete
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleEdit}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
