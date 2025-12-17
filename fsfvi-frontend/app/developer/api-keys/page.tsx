'use client';

import { useEffect, useState } from 'react';
import { Key, Plus, Trash2, AlertCircle, CheckCircle, Clock, Copy, XCircle, Loader2 } from 'lucide-react';
import { useDeveloperAuth } from '@/hooks/useDeveloperAuth';
import { developerApiKeyAPI } from '@/lib/developerApi';
import type { ApiKey, CreateApiKeyRequest, AvailableScopes } from '@/lib/types/developer';

export default function ApiKeysPage() {
  const { user } = useDeveloperAuth(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [availableScopes, setAvailableScopes] = useState<AvailableScopes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState<CreateApiKeyRequest>({
    name: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [keysResponse, scopesResponse] = await Promise.all([
        developerApiKeyAPI.listApiKeys(),
        developerApiKeyAPI.getAvailableScopes(),
      ]);

      if (keysResponse.success) {
        setApiKeys(keysResponse.data);
      }
      if (scopesResponse.success) {
        setAvailableScopes(scopesResponse.data);
      }
    } catch (err: any) {
      setError('Failed to load API keys');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsCreating(true);

    try {
      const response = await developerApiKeyAPI.createApiKey(newKeyData);
      if (response.success) {
        setCreatedApiKey(response.data.api_key);
        await loadData();
        // Don't close modal yet - show the API key first
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeApiKey = async () => {
    if (!showRevokeModal || !revokeReason.trim()) {
      setError('Please provide a reason for revoking this key');
      return;
    }

    setIsRevoking(true);
    setError('');

    try {
      const response = await developerApiKeyAPI.revokeApiKey(showRevokeModal, {
        reason: revokeReason,
      });
      if (response.success) {
        await loadData();
        setShowRevokeModal(null);
        setRevokeReason('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to revoke API key');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopyApiKey = () => {
    if (createdApiKey) {
      navigator.clipboard.writeText(createdApiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewKeyData({ name: '' });
    setCreatedApiKey(null);
    setError('');
  };

  const activeKeys = apiKeys.filter((key) => key.status === 'active');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="mt-2 text-gray-600">
            Manage your API keys for accessing FSFVI endpoints
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Create New Key</span>
        </button>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-900">
              One-Key-Per-User Policy
            </h3>
            <p className="mt-1 text-xs text-yellow-800">
              Creating a new API key will automatically revoke all your existing active keys.
              This security policy ensures you maintain only one active key at a time.
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* API Keys List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            Your API Keys ({apiKeys.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-gray-600">Loading API keys...</p>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Key className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600 font-medium">No API keys yet</p>
            <p className="mt-2 text-sm text-gray-500">
              Create your first API key to start accessing FSFVI endpoints
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {apiKeys.map((key) => (
              <div key={key.id} className="px-6 py-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-base font-semibold text-gray-900">{key.name}</h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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

                    <div className="space-y-2">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {key.key_prefix}...
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                        </span>
                      </div>

                      {key.expires_at && (
                        <div className="flex items-center space-x-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          <span className="text-orange-600 font-medium">
                            Expires {new Date(key.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Usage: {key.usage_count} requests</span>
                        {key.last_used && (
                          <span>Last used: {new Date(key.last_used).toLocaleDateString()}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {key.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>

                      {key.revoked_at && (
                        <div className="mt-2 text-xs text-red-600">
                          Revoked on {new Date(key.revoked_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {key.status === 'active' && (
                    <button
                      onClick={() => setShowRevokeModal(key.id)}
                      className="ml-4 flex items-center space-x-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {createdApiKey ? (
              /* Show Created Key */
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    API Key Created Successfully!
                  </h2>
                  <p className="text-gray-600">
                    Copy your API key now - you won't be able to see it again
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <label htmlFor="created-api-key" className="block text-sm font-medium text-gray-700 mb-2">
                    Your API Key
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="created-api-key"
                      type="text"
                      value={createdApiKey}
                      readOnly
                      className="flex-1 font-mono text-sm bg-white border border-gray-300 rounded px-3 py-2"
                    />
                    <button
                      onClick={handleCopyApiKey}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                      <span>{copiedKey ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-900">Important Security Notice</p>
                      <p className="mt-1 text-xs text-red-800">
                        Store this key securely. Never commit it to version control or share it publicly.
                        This key provides access to your government's FSFVI data.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={closeCreateModal}
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Create Key Form */
              <form onSubmit={handleCreateApiKey}>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Create New API Key</h2>
                </div>

                <div className="p-6 space-y-6">
                  {/* Key Name */}
                  <div>
                    <label htmlFor="key-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Key Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="key-name"
                      type="text"
                      required
                      value={newKeyData.name}
                      onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                      placeholder="e.g., Production Server, Development Testing"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Give your key a descriptive name to help you remember its purpose
                    </p>
                  </div>

                  {/* Assigned Scopes (Read-Only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Assigned API Scopes
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-xs text-gray-600 mb-3">
                        These scopes are assigned to your government by the administrator. Your API key will automatically have access to all of these endpoints.
                      </p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {availableScopes?.scopes.map((scope) => (
                          <div
                            key={scope}
                            className="flex items-start space-x-3 p-2 bg-white rounded border border-gray-200"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{scope}</div>
                              <div className="text-xs text-gray-500">
                                {availableScopes?.descriptions[scope]}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Warning Notice */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-yellow-900">
                          Creating this key will revoke your existing active keys
                        </p>
                        <p className="mt-1 text-xs text-yellow-800">
                          Due to the one-key-per-user security policy, all your current active keys will be automatically revoked.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newKeyData.name.trim()}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Create API Key</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Revoke API Key Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Revoke API Key</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900">Warning</p>
                    <p className="mt-1 text-xs text-red-800">
                      This action cannot be undone. The API key will be permanently revoked and cannot be used anymore.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="revoke-reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Revocation <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="revoke-reason"
                  required
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={3}
                  placeholder="e.g., Key compromised, No longer needed, Security rotation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowRevokeModal(null);
                  setRevokeReason('');
                  setError('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeApiKey}
                disabled={isRevoking || !revokeReason.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRevoking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Revoke Key</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
