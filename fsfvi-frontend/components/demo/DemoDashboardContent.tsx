'use client';

import { useState } from 'react';
import { DemoDashboardLayout } from './DemoDashboardLayout';
import { ProfileSection } from './ProfileSection';
import { SecuritySection } from './SecuritySection';
import { PerformanceGapDashboard } from '@/components/performance-gap';
import { AssessmentDashboard } from '@/components/assessment';
import { BudgetOptimizationDashboard } from '@/components/budget-optimization';

type NavigationItem = 'profile' | 'security' | 'performance-gap' | 'assessment' | 'budget-optimization';

export function DemoDashboardContent() {
  const [activeNav, setActiveNav] = useState<NavigationItem>('assessment');

  const renderContent = () => {
    switch (activeNav) {
      case 'assessment':
        return <AssessmentDashboard />;
      case 'performance-gap':
        return <PerformanceGapDashboard />;
      case 'budget-optimization':
        return <BudgetOptimizationDashboard />;
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
