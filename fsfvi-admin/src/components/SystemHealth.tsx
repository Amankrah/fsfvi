import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { DetailedHealthResponse } from '../types';

export function SystemHealth() {
  const [health, setHealth] = useState<DetailedHealthResponse | null>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [alertHours, setAlertHours] = useState(24);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [alertHours]);

  const loadData = async () => {
    try {
      const [healthRes, alertsRes] = await Promise.all([
        apiClient.getSystemHealth(),
        apiClient.getSecurityAlerts(alertHours),
      ]);
      setHealth(healthRes.data);
      setAlerts(alertsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load system data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading system health...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!health || !alerts) return null;

  const totalAlerts =
    alerts.alerts.failed_logins.length +
    alerts.alerts.rate_limit_violations.length +
    alerts.alerts.unauthorized_access.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">System Health & Security</h2>
        <div className="flex items-center space-x-4">
          <select
            value={alertHours}
            onChange={(e) => setAlertHours(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Last 1 hour</option>
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={72}>Last 3 days</option>
          </select>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* System Status - REAL MEASURED METRICS */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">System Status</h3>
          <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
            health.status === 'operational'
              ? 'bg-green-100 text-green-800'
              : health.status === 'degraded'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {health.status === 'operational' ? '✓ Operational' :
             health.status === 'degraded' ? '⚠ Degraded' :
             '✗ Down'}
          </div>
        </div>

        {/* Overall System Response Time */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{health.service}</span>
            <span className="text-xs text-gray-500">Version {health.version}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Response Time</span>
            <span className={`font-mono font-semibold ${
              health.response_time_ms < 100 ? 'text-green-600' :
              health.response_time_ms < 500 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {health.response_time_ms}ms
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatusCard
            title="Database"
            status={health.database.status === 'connected' ? 'Connected' :
                   health.database.status === 'slow' ? 'Slow' : 'Disconnected'}
            isHealthy={health.database.status === 'connected'}
            details={[
              `Response Time: ${health.database.response_time_ms !== null ? health.database.response_time_ms + 'ms' : 'N/A'}`,
              `Active Connections: ${health.database.active_connections}/${health.database.max_connections}`,
              `Connection Usage: ${Math.round((health.database.active_connections / health.database.max_connections) * 100)}%`,
            ]}
          />
          <StatusCard
            title="Backend API"
            status={health.status === 'operational' ? 'Operational' :
                   health.status === 'degraded' ? 'Degraded' : 'Down'}
            isHealthy={health.status === 'operational'}
            details={[
              `Status: ${health.status}`,
              `Response Time: ${health.response_time_ms}ms`,
              `Last Check: ${new Date(health.timestamp).toLocaleTimeString()}`,
            ]}
          />
        </div>
      </div>

      {/* Security Alerts Summary */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Security Alerts</h3>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
            totalAlerts === 0
              ? 'bg-green-100 text-green-800'
              : totalAlerts < 10
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {totalAlerts} alerts
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AlertCard
            title="Failed Logins"
            count={alerts.alerts.failed_logins.length}
            icon="🔒"
            color="red"
          />
          <AlertCard
            title="Rate Limit Violations"
            count={alerts.alerts.rate_limit_violations.length}
            icon="⚡"
            color="yellow"
          />
          <AlertCard
            title="Unauthorized Access"
            count={alerts.alerts.unauthorized_access.length}
            icon="🚫"
            color="red"
          />
        </div>
      </div>

      {/* Suspicious IPs */}
      {alerts.suspicious_ips.length > 0 && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-red-600">🚨 Suspicious IP Addresses</h3>
          <p className="text-sm text-gray-600 mb-4">
            IP addresses with 5 or more security-related events in the last {alertHours} hours
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Attempts</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Attempt</th>
                </tr>
              </thead>
              <tbody>
                {alerts.suspicious_ips.map((ip: any) => (
                  <tr key={ip.ip_address} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{ip.ip_address}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full font-semibold">
                        {ip.attempt_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {ip.actions && ip.actions.join(', ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(ip.last_attempt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Failed Logins */}
      {alerts.alerts.failed_logins.length > 0 && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Failed Login Attempts</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User/Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Government</th>
                </tr>
              </thead>
              <tbody>
                {alerts.alerts.failed_logins.slice(0, 10).map((login: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(login.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {login.email || login.user_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{login.ip_address}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{login.government || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revoked API Keys */}
      {alerts.revoked_api_keys.length > 0 && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recently Revoked API Keys</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Key Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Government</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revoked By</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revoked At</th>
                </tr>
              </thead>
              <tbody>
                {alerts.revoked_api_keys.map((key: any) => (
                  <tr key={key.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{key.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{key.government}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{key.revoked_by || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{key.reason || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(key.revoked_at).toLocaleString()}
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

interface StatusCardProps {
  title: string;
  status: string;
  isHealthy: boolean;
  details: string[];
}

function StatusCard({ title, status, isHealthy, details }: StatusCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isHealthy
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {status}
        </span>
      </div>
      <div className="space-y-1">
        {details.map((detail, idx) => (
          <div key={idx} className="text-sm text-gray-600">{detail}</div>
        ))}
      </div>
    </div>
  );
}

interface AlertCardProps {
  title: string;
  count: number;
  icon: string;
  color: 'red' | 'yellow' | 'green';
}

function AlertCard({ title, count, icon, color }: AlertCardProps) {
  const colorClasses = {
    red: 'bg-red-50',
    yellow: 'bg-yellow-50',
    green: 'bg-green-50',
  };

  return (
    <div className={`${colorClasses[color]} border border-${color}-200 rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{count}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}
