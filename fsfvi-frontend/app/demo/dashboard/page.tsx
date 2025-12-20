'use client';

import { ProtectedRoute } from '@/components/demo';
import { DemoDashboardContent } from '@/components/demo/DemoDashboardContent';

export default function DemoDashboardPage() {
  return (
    <ProtectedRoute>
      <DemoDashboardContent />
    </ProtectedRoute>
  );
}
