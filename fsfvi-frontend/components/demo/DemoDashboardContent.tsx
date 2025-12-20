'use client';

import { useState } from 'react';
import { DemoDashboardLayout } from './DemoDashboardLayout';
import { ProfileSection } from './ProfileSection';
import { SecuritySection } from './SecuritySection';

type NavigationItem = 'profile' | 'security';

export function DemoDashboardContent() {
  const [activeNav, setActiveNav] = useState<NavigationItem>('profile');

  return (
    <DemoDashboardLayout activeNav={activeNav} setActiveNav={setActiveNav}>
      {activeNav === 'security' ? <SecuritySection /> : <ProfileSection />}
    </DemoDashboardLayout>
  );
}
