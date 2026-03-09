'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun } from 'lucide-react';

export default function SeasonalPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sun className="h-5 w-5 text-[var(--rw-blue)]" />
          <span>Seasonal Dashboard</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Season A/B/C crop calendar dashboard — coming in Phase 4.</p>
      </CardContent>
    </Card>
  );
}
