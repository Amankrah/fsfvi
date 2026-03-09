'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function PerformancePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-[var(--rw-blue)]" />
          <span>Performance Gap Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Performance gap analysis dashboard — coming in Phase 3.</p>
      </CardContent>
    </Card>
  );
}
