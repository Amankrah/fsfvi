import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export function Analytics() {
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDays, setSelectedDays] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [selectedDays]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getAnalyticsOverview(selectedDays);
      setOverview(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!overview) return null;

  const { governments, users, api_usage, daily_trends, quota_warnings } = overview;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
        <select
          value={selectedDays}
          onChange={(e) => setSelectedDays(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Governments"
          value={governments.total}
          icon="🌍"
          color="blue"
        />
        <MetricCard
          title="Active Users"
          value={users.total}
          icon="👥"
          color="green"
        />
        <MetricCard
          title="Total Requests"
          value={api_usage.total_requests.toLocaleString()}
          icon="📊"
          color="purple"
        />
        <MetricCard
          title="Error Rate"
          value={`${api_usage.error_rate.toFixed(2)}%`}
          icon="⚠️"
          color={api_usage.error_rate > 5 ? 'red' : 'green'}
        />
      </div>

      {/* Government Status Breakdown */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Governments by Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {governments.by_status.map((status: any) => (
            <div key={status.status} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700 capitalize">{status.status}</span>
              <span className={`text-2xl font-bold ${
                status.status === 'active' ? 'text-green-600' :
                status.status === 'suspended' ? 'text-red-600' :
                'text-yellow-600'
              }`}>
                {status.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Users by Role */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Users by Role</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.by_role.map((role: any) => (
            <div key={role.role} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700 capitalize">{role.role}</span>
              <span className="text-2xl font-bold text-blue-600">{role.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Trends Chart */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Request Trends</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Requests</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Errors</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Active Govs</th>
              </tr>
            </thead>
            <tbody>
              {daily_trends.slice(0, 10).map((trend: any) => (
                <tr key={trend.date} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(trend.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {(trend.requests || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">
                    {(trend.errors || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {trend.active_governments || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quota Warnings */}
      {quota_warnings.length > 0 && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-red-600">⚠️ Quota Warnings</h3>
          <p className="text-sm text-gray-600 mb-4">
            Governments approaching or exceeding their quota limits (80%+ usage)
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Government</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Daily Usage</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monthly Usage</th>
                </tr>
              </thead>
              <tbody>
                {quota_warnings.map((warning: any) => (
                  <tr key={warning.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{warning.name}</div>
                      <div className="text-xs text-gray-500">{warning.country}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="text-gray-900">
                        {warning.daily_usage?.toLocaleString()} / {warning.daily_quota?.toLocaleString()}
                      </div>
                      <div className={`text-xs font-semibold ${
                        warning.daily_percent >= 100 ? 'text-red-600' :
                        warning.daily_percent >= 80 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {warning.daily_percent?.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="text-gray-900">
                        {warning.monthly_usage?.toLocaleString()} / {warning.monthly_quota?.toLocaleString()}
                      </div>
                      <div className={`text-xs font-semibold ${
                        warning.monthly_percent >= 100 ? 'text-red-600' :
                        warning.monthly_percent >= 80 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {warning.monthly_percent?.toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow';
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`text-3xl ${colorClasses[color]} rounded-full p-3`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
