'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export default function DistrictsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-[var(--rw-blue)]" />
          <span>Districts</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">District comparison & ranking — coming in Phase 2.</p>
      </CardContent>
    </Card>
  );
}
