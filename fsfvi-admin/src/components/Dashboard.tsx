import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Governments } from './Governments';
import { Users } from './Users';
import { ApiKeys } from './ApiKeys';
import { Analytics } from './Analytics';
import { AuditLogs } from './AuditLogs';
import { SystemHealth } from './SystemHealth';

type Tab = 'analytics' | 'governments' | 'users' | 'api-keys' | 'audit-logs' | 'system-health';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const { user, logout } = useAuth();

  const tabs = [
    { id: 'analytics' as const, label: 'Analytics', icon: '📊' },
    { id: 'governments' as const, label: 'Governments', icon: '🌍' },
    { id: 'users' as const, label: 'Users', icon: '👥' },
    { id: 'api-keys' as const, label: 'API Keys', icon: '🔑' },
    { id: 'audit-logs' as const, label: 'Audit Logs', icon: '📋' },
    { id: 'system-health' as const, label: 'System Health', icon: '🏥' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FSFI Admin</h1>
              <p className="text-sm text-gray-600">Food Systems Financial Intelligence</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'governments' && <Governments />}
        {activeTab === 'users' && <Users />}
        {activeTab === 'api-keys' && <ApiKeys />}
        {activeTab === 'audit-logs' && <AuditLogs />}
        {activeTab === 'system-health' && <SystemHealth />}
      </main>
    </div>
  );
}
