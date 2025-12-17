import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { ApiKey, Government } from '../types';

/**
 * ============================================================================
 * ADMIN API KEY MANAGEMENT COMPONENT
 *
 * SECURITY POLICY:
 * - Admins can VIEW all API keys for any government
 * - Admins can REVOKE API keys (emergency action with reason)
 * - Admins CANNOT CREATE API keys (only developers can create keys)
 * - All admin actions are logged for audit trail
 * ============================================================================
 */

export function ApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [governments, setGovernments] = useState<Government[]>([]);
  const [selectedGov, setSelectedGov] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    loadGovernments();
  }, []);

  useEffect(() => {
    if (selectedGov) {
      loadApiKeys();
    }
  }, [selectedGov]);

  const loadGovernments = async () => {
    try {
      const response = await apiClient.listGovernments(1, 100);
      setGovernments(response.data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load governments');
      setIsLoading(false);
    }
  };

  const loadApiKeys = async () => {
    if (!selectedGov) return;

    try {
      setIsLoading(true);
      const response = await apiClient.listApiKeys(selectedGov);
      // API client already extracts api_keys from nested response, so use response.data directly
      setApiKeys(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewClick = (key: ApiKey) => {
    setSelectedKey(key);
    setShowDetailsDialog(true);
  };

  const handleRevokeClick = (key: ApiKey) => {
    setSelectedKey(key);
    setShowRevokeDialog(true);
    setRevokeReason('');
    setAdminNote('');
  };

  const handleRevokeConfirm = async () => {
    if (!selectedKey || !revokeReason.trim()) {
      alert('Please provide a reason for revocation');
      return;
    }

    if (revokeReason.length < 10) {
      alert('Reason must be at least 10 characters');
      return;
    }

    setIsRevoking(true);
    try {
      await apiClient.adminRevokeApiKey(selectedKey.id, {
        reason: revokeReason,
        admin_note: adminNote.trim() || undefined,
      });

      setShowRevokeDialog(false);
      setSelectedKey(null);
      setRevokeReason('');
      setAdminNote('');
      loadApiKeys();

      alert('API key revoked successfully. The developer will be notified.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to revoke API key');
    } finally {
      setIsRevoking(false);
    }
  };

  if (isLoading && governments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading governments...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">API Key Management</h2>
        <p className="text-sm text-gray-600">
          View and manage developer-created API keys. Admins can view details and revoke keys but cannot create new keys.
        </p>
      </div>

      {/* Security Notice */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">Admin Security Policy</h3>
            <p className="text-xs text-blue-800">
              <strong>Only developers can create API keys.</strong> As an admin, you can view key details, monitor usage, and revoke keys in emergency situations. All admin actions are logged for audit purposes.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <svg className="h-5 w-5 text-red-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="apikey-gov-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Government
        </label>
        <select
          id="apikey-gov-select"
          value={selectedGov}
          onChange={(e) => setSelectedGov(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Choose a government...</option>
          {governments.map((gov) => (
            <option key={gov.id} value={gov.id}>
              {gov.country_name} - {gov.government_name}
            </option>
          ))}
        </select>
      </div>

      {selectedGov && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              API Keys ({apiKeys.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Key Prefix
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {apiKeys.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <p className="text-gray-500 font-medium">No API keys found</p>
                        <p className="text-sm text-gray-400 mt-1">Developers for this government haven't created any API keys yet.</p>
                      </td>
                    </tr>
                  ) : (
                    apiKeys.map((key) => (
                      <tr key={key.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{key.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                            {key.key_prefix}...
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            key.status === 'active' ? 'bg-green-100 text-green-800' :
                            key.status === 'revoked' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {key.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {key.usage_count || 0} requests
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {key.last_used
                            ? new Date(key.last_used).toLocaleString()
                            : <span className="text-gray-400">Never</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {key.expires_at
                            ? new Date(key.expires_at).toLocaleDateString()
                            : <span className="text-gray-400">Never</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(key.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleViewClick(key)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              View
                            </button>
                            {key.status === 'active' ? (
                              <button
                                onClick={() => handleRevokeClick(key)}
                                className="text-red-600 hover:text-red-900 font-medium"
                              >
                                Revoke
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Revoke API Key Dialog */}
      {showRevokeDialog && selectedKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Revoke API Key</h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-red-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900">Critical Admin Action</p>
                    <p className="text-xs text-red-800 mt-1">
                      This action cannot be undone. The API key will be permanently revoked and the developer will be notified.
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Key Name:</span>
                  <span className="ml-2 text-gray-900">{selectedKey.name}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Key Prefix:</span>
                  <code className="ml-2 bg-gray-200 px-2 py-1 rounded text-xs font-mono">{selectedKey.key_prefix}...</code>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Usage:</span>
                  <span className="ml-2 text-gray-900">{selectedKey.usage_count || 0} requests</span>
                </div>
              </div>

              {/* Reason (Required) */}
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
                  placeholder="e.g., Security incident detected, Key compromised, Policy violation, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum 10 characters. This will be shown to the developer.
                </p>
              </div>

              {/* Internal Admin Note (Optional) */}
              <div>
                <label htmlFor="admin-note" className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Admin Note (Optional)
                </label>
                <textarea
                  id="admin-note"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={2}
                  placeholder="Internal notes for audit trail (not shown to developer)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  For internal audit purposes only. Not visible to the developer.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setShowRevokeDialog(false);
                  setSelectedKey(null);
                  setRevokeReason('');
                  setAdminNote('');
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeConfirm}
                disabled={isRevoking || !revokeReason.trim() || revokeReason.length < 10}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isRevoking ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Revoking...
                  </>
                ) : (
                  'Revoke API Key'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View API Key Details Dialog */}
      {showDetailsDialog && selectedKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">API Key Details</h3>
              <button
                onClick={() => {
                  setShowDetailsDialog(false);
                  setSelectedKey(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{selectedKey.name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedKey.status === 'active' ? 'bg-green-100 text-green-800' :
                      selectedKey.status === 'revoked' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedKey.status.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Key Prefix</label>
                <p className="mt-1">
                  <code className="text-sm bg-gray-100 px-3 py-1 rounded font-mono text-gray-700">
                    {selectedKey.key_prefix}...
                  </code>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scopes</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Array.isArray(selectedKey.scopes) ? selectedKey.scopes : []).map((scope, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      {scope}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Usage Count</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedKey.usage_count || 0} requests</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Used</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedKey.last_used ? new Date(selectedKey.last_used).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(selectedKey.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedKey.expires_at ? new Date(selectedKey.expires_at).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>

              {selectedKey.revoked_at && (
                <div className="pt-4 border-t border-gray-200">
                  <label className="text-xs font-semibold text-red-600 uppercase tracking-wider">Revocation Details</label>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Revoked At:</span> {new Date(selectedKey.revoked_at).toLocaleString()}
                    </p>
                    {selectedKey.revocation_reason && (
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">Reason:</span> {selectedKey.revocation_reason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsDialog(false);
                  setSelectedKey(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
