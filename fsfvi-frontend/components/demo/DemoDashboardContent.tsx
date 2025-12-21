'use client';

import { useState } from 'react';
import { DemoDashboardLayout } from './DemoDashboardLayout';
import { ProfileSection } from './ProfileSection';
import { SecuritySection } from './SecuritySection';
import { PerformanceGapDashboard } from '@/components/performance-gap';

type NavigationItem = 'profile' | 'security' | 'performance-gap';

export function DemoDashboardContent() {
  const [activeNav, setActiveNav] = useState<NavigationItem>('performance-gap');

  const renderContent = () => {
    switch (activeNav) {
      case 'performance-gap':
        return <PerformanceGapDashboard />;
      case 'security':
        return <SecuritySection />;
      case 'profile':
      default:
        return <ProfileSection />;
    }
  };

  return (
    <DemoDashboardLayout activeNav={activeNav} setActiveNav={setActiveNav}>
      {renderContent()}
    </DemoDashboardLayout>
  );
}
