import { useState, useEffect } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { apiClient } from '../api/client';
import type { User, CreateUserRequest, CreateUserResponse, UpdateUserRequest, ResetPasswordResponse, Government } from '../types';

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [governments, setGovernments] = useState<Government[]>([]);
  const [selectedGov, setSelectedGov] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedGov]);

  const loadData = async () => {
    try {
      const [usersRes, govsRes] = await Promise.all([
        apiClient.listUsers(selectedGov || undefined),
        apiClient.listGovernments(1, 100),
      ]);
      setUsers(usersRes.data);
      setGovernments(govsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          {showCreateForm ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="gov-filter" className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Government
        </label>
        <select
          id="gov-filter"
          value={selectedGov}
          onChange={(e) => setSelectedGov(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Governments</option>
          {governments.map((gov) => (
            <option key={gov.id} value={gov.id}>
              {gov.country_name} - {gov.government_name}
            </option>
          ))}
        </select>
      </div>

      {showCreateForm && (
        <CreateUserForm
          governments={governments}
          onSuccess={() => {
            setShowCreateForm(false);
            loadData();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                API Key Expiry
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                MFA
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No users found. Create one to get started.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                    <div className="text-sm text-gray-500">{user.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : user.status === 'locked'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.api_key_expiry_days ? `${user.api_key_expiry_days} days` : 'No expiration'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.mfa_enabled ? '✅ Enabled' : '❌ Disabled'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowViewModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowEditModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <ViewUserModal
          user={selectedUser}
          government={governments.find(g => g.id === selectedUser.government_id)}
          onClose={() => {
            setShowViewModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          governments={governments}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            loadData();
          }}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}

function CreateUserForm({
  governments,
  onSuccess,
  onCancel,
}: {
  governments: Government[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<CreateUserRequest>({
    government_id: '',
    email: '',
    password: '',
    full_name: '',
    title: '',
    role: 'developer',
    api_key_expiry_days: 365, // Default: 1 year
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const [createdUserCredentials, setCreatedUserCredentials] = useState<CreateUserResponse | null>(null);

  // Generate password from backend
  const handleGeneratePassword = async () => {
    setIsGeneratingPassword(true);
    try {
      const response = await apiClient.generatePassword();
      setFormData({ ...formData, password: response.data.password });
      setShowPassword(true); // Show the generated password
    } catch (err) {
      setError('Failed to generate password');
    } finally {
      setIsGeneratingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.government_id) {
      setError('Please select a government');
      return;
    }

    // Password is always required and validated by backend
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.api_key_expiry_days && (formData.api_key_expiry_days < 1 || formData.api_key_expiry_days > 730)) {
      setError('API key expiry must be between 1 and 730 days');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.createUser(formData);
      // Backend returns CreateUserResponse with user and plain_password
      setCreatedUserCredentials(response.data);
      // Don't close form immediately - show credentials first
    } catch (err: any) {
      // Parse error from backend
      let errorMsg = 'Failed to create user';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.error) {
          errorMsg = err.response.data.error;
        } else if (err.response.data.message) {
          errorMsg = err.response.data.message;
        }
      }
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download credentials as text file using Tauri's native file save dialog
  const downloadCredentials = async (credentials: CreateUserResponse) => {
    try {
      const govName = governments.find(g => g.id === credentials.user.government_id)?.government_name || 'Unknown';
      const content = `FSFVI PLATFORM - USER CREDENTIALS
======================================

IMPORTANT: This is the ONLY time you will see this password.
Please save it securely and share it with the user through a secure channel.

Government: ${govName}
User Name: ${credentials.user.full_name}
Title: ${credentials.user.title}
Email: ${credentials.user.email}
Password: ${credentials.plain_password}
Role: ${credentials.user.role}
API Key Expiry: ${credentials.user.api_key_expiry_days ? `${credentials.user.api_key_expiry_days} days` : 'No expiration'}

Account Status: ${credentials.user.status}
Created: ${new Date(credentials.user.created_at).toLocaleString()}

======================================
SECURITY NOTICE:
1. Change password after first login
2. Enable MFA for additional security
3. Do not share credentials via email or unsecured channels
4. Delete this file after securely sharing with the user
======================================

FSFVI Platform
Generated: ${new Date().toLocaleString()}
`;

      // Sanitize email for filename (remove @ and .)
      const sanitizedEmail = credentials.user.email.replace(/@/g, '_at_').replace(/\./g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const defaultFilename = `FSFVI_User_${sanitizedEmail}_${timestamp}.txt`;

      // Open native file save dialog
      const filePath = await save({
        defaultPath: defaultFilename,
        filters: [{
          name: 'Text Files',
          extensions: ['txt']
        }]
      });

      // User cancelled the dialog
      if (!filePath) {
        console.log('User cancelled file save');
        return;
      }

      // Write the file using Tauri's file system API
      await writeTextFile(filePath, content);

      console.log('Credentials file saved successfully to:', filePath);
      alert('Credentials file saved successfully!');
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to save credentials file. Please copy the password manually.');
    }
  };

  // Close credentials modal and refresh list
  const closeCredentialsModal = () => {
    setCreatedUserCredentials(null);
    onSuccess();
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Create New User</h3>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Government Selection */}
        <div>
          <label htmlFor="user-government" className="block text-sm font-medium text-gray-700 mb-1">
            Government <span className="text-red-500">*</span>
          </label>
          <select
            id="user-government"
            required
            value={formData.government_id}
            onChange={(e) => setFormData({ ...formData, government_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Government</option>
            {governments.map((gov) => (
              <option key={gov.id} value={gov.id}>
                {gov.country_name} - {gov.government_name}
              </option>
            ))}
          </select>
        </div>

        {/* Personal Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Senior Data Analyst"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="user@government.gov"
          />
        </div>

        {/* Password Field with Auto-Generate Option */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                maxLength={100}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter or generate password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm hover:text-gray-700"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <button
              type="button"
              onClick={handleGeneratePassword}
              disabled={isGeneratingPassword}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isGeneratingPassword ? 'Generating...' : 'Generate Password'}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Click "Generate Password" for a secure 16-character password, or enter manually (min 8 characters)
          </p>
        </div>

        {/* Role & API Key Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              id="user-role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'developer' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="developer">Developer - Government user with API access</option>
              <option value="admin">Admin - FSFI company administrator</option>
            </select>
          </div>

          <div>
            <label htmlFor="api-key-expiry" className="block text-sm font-medium text-gray-700 mb-1">
              API Key Expiry (Days)
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
              placeholder="365"
            />
            <p className="mt-1 text-xs text-gray-500">1-730 days (leave empty for no expiration)</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">About API Key Expiry</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Controls how long API keys created by this user will be valid</li>
            <li>• Developer cannot override this setting when creating API keys</li>
            <li>• Recommended: 365 days (1 year) for production users</li>
            <li>• Leave empty for testing/internal accounts (no expiration)</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>

      {/* Credentials Modal - Shows after successful user creation */}
      {createdUserCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-green-700">User Created Successfully!</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600 text-2xl">✓</span>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-700 text-xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-semibold text-yellow-800">SECURITY CRITICAL</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      This is the ONLY time you will see this password. Save it immediately using the download button below.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">User Name</label>
                  <p className="text-sm font-medium text-gray-900">{createdUserCredentials.user.full_name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
                  <p className="text-sm font-medium text-gray-900">{createdUserCredentials.user.email}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Password</label>
                  <div className="bg-white border-2 border-green-500 rounded p-3 mt-1">
                    <p className="text-lg font-mono font-bold text-gray-900 break-all">
                      {createdUserCredentials.plain_password}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Role</label>
                    <p className="text-sm font-medium text-gray-900 capitalize">{createdUserCredentials.user.role}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">API Key Expiry</label>
                    <p className="text-sm font-medium text-gray-900">
                      {createdUserCredentials.user.api_key_expiry_days
                        ? `${createdUserCredentials.user.api_key_expiry_days} days`
                        : 'No expiration'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Next Steps:</h4>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Download the credentials as a text file using the button below</li>
                  <li>Share the credentials file with the government developer through a SECURE channel</li>
                  <li>Instruct the user to change their password immediately after first login</li>
                  <li>Recommend enabling MFA for enhanced security</li>
                  <li>Delete the credentials file after securely sharing it</li>
                </ol>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => downloadCredentials(createdUserCredentials)}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Credentials File
                </button>
                <button
                  type="button"
                  onClick={closeCredentialsModal}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// View User Modal Component
function ViewUserModal({
  user,
  government,
  onClose,
}: {
  user: User;
  government?: Government;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">User Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close modal"
              title="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Full Name</label>
              <p className="text-base text-gray-900">{user.full_name}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Title</label>
              <p className="text-base text-gray-900">{user.title}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Email</label>
              <p className="text-base text-gray-900">{user.email}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Government</label>
              <p className="text-base text-gray-900">{government?.government_name || 'Unknown'}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Role</label>
              <span
                className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}
              >
                {user.role}
              </span>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Status</label>
              <span
                className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                  user.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : user.status === 'locked'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {user.status}
              </span>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">API Key Expiry</label>
              <p className="text-base text-gray-900">
                {user.api_key_expiry_days ? `${user.api_key_expiry_days} days` : 'No expiration'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">MFA Status</label>
              <p className="text-base text-gray-900">{user.mfa_enabled ? '✅ Enabled' : '❌ Disabled'}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Failed Login Attempts</label>
              <p className="text-base text-gray-900">{user.failed_login_attempts}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Last Login</label>
              <p className="text-base text-gray-900">
                {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Created At</label>
              <p className="text-base text-gray-900">{new Date(user.created_at).toLocaleString()}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Last Updated</label>
              <p className="text-base text-gray-900">{new Date(user.updated_at).toLocaleString()}</p>
            </div>

            {user.locked_until && (
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-500 mb-1">Locked Until</label>
                <p className="text-base text-red-600">{new Date(user.locked_until).toLocaleString()}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({
  user,
  governments,
  onSuccess,
  onClose,
}: {
  user: User;
  governments: Government[];
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<UpdateUserRequest>({
    full_name: user.full_name,
    title: user.title,
    status: user.status,
    api_key_expiry_days: user.api_key_expiry_days || undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<ResetPasswordResponse | null>(null);

  const government = governments.find(g => g.id === user.government_id);

  const handleGeneratePassword = async () => {
    setIsGeneratingPassword(true);
    try {
      const response = await apiClient.generatePassword();
      setNewPassword(response.data.password);
    } catch (err) {
      setError('Failed to generate password');
    } finally {
      setIsGeneratingPassword(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsResettingPassword(true);
    setError('');

    try {
      const response = await apiClient.resetUserPassword(user.id, { new_password: newPassword });
      setResetPasswordResult(response.data);
      setShowPasswordReset(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.api_key_expiry_days && (formData.api_key_expiry_days < 1 || formData.api_key_expiry_days > 730)) {
      setError('API key expiry must be between 1 and 730 days');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.updateUser(user.id, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadPasswordFile = async (password: string) => {
    try {
      const content = `FSFVI PLATFORM - PASSWORD RESET

======================================

User: ${user.full_name}
Email: ${user.email}
New Password: ${password}

IMPORTANT: This password has been reset by an administrator.
Please change it immediately after your next login.

======================================
Reset Date: ${new Date().toLocaleString()}
`;

      const sanitizedEmail = user.email.replace(/@/g, '_at_').replace(/\./g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const defaultFilename = `FSFVI_PasswordReset_${sanitizedEmail}_${timestamp}.txt`;

      const filePath = await save({
        defaultPath: defaultFilename,
        filters: [{
          name: 'Text Files',
          extensions: ['txt']
        }]
      });

      if (!filePath) return;

      await writeTextFile(filePath, content);
      alert('Password file saved successfully!');
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to save password file. Please copy the password manually.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Edit User</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close modal"
              title="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Government:</strong> {government?.government_name || 'Unknown'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Email:</strong> {user.email}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Role:</strong> <span className="capitalize">{user.role}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name & Title */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-full-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="edit-full-name"
                  type="text"
                  minLength={2}
                  maxLength={100}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  aria-label="User full name"
                  title="User full name"
                />
              </div>

              <div>
                <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  id="edit-title"
                  type="text"
                  minLength={2}
                  maxLength={100}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  aria-label="User job title"
                  title="User job title"
                />
              </div>
            </div>

            {/* Status & API Key Expiry */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="user-status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="user-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'locked' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  aria-label="User account status"
                  title="User account status"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="locked">Locked</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key Expiry (days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={730}
                  value={formData.api_key_expiry_days || ''}
                  onChange={(e) => setFormData({ ...formData, api_key_expiry_days: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="365"
                />
              </div>
            </div>

            {/* Password Reset Section */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowPasswordReset(!showPasswordReset)}
                className="text-orange-600 hover:text-orange-800 font-medium flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                {showPasswordReset ? 'Hide Password Reset' : 'Reset Password'}
              </button>

              {showPasswordReset && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800 mb-3">
                    Generate a new password for this user. The new password will be shown only once.
                  </p>

                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter or generate new password"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      disabled={isGeneratingPassword}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                      {isGeneratingPassword ? 'Generating...' : 'Generate'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isResettingPassword || newPassword.length < 8}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {isResettingPassword ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Password Reset Success Modal */}
          {resetPasswordResult && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-60">
              <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
                <h4 className="text-xl font-bold text-green-700 mb-4">Password Reset Successful!</h4>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <p className="text-sm font-semibold text-yellow-800">IMPORTANT</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    This is the ONLY time you will see this password. Save it immediately.
                  </p>
                </div>

                <div className="bg-white border-2 border-green-500 rounded p-3 mb-4">
                  <label className="text-xs font-semibold text-gray-500 uppercase">New Password</label>
                  <p className="text-lg font-mono font-bold text-gray-900 break-all mt-1">
                    {resetPasswordResult.plain_password}
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => downloadPasswordFile(resetPasswordResult.plain_password)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                  >
                    Download Password
                  </button>
                  <button
                    onClick={() => {
                      setResetPasswordResult(null);
                      setNewPassword('');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
