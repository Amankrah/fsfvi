'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';

export default function PSTA5Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-[var(--rw-blue)]" />
          <span>PSTA 5 Alignment Tracker</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">PSTA 5 strategic alignment tracker — coming in Phase 4.</p>
      </CardContent>
    </Card>
  );
}
