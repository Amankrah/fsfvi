'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map } from 'lucide-react';

export default function ProvincesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Map className="h-5 w-5 text-[var(--rw-blue)]" />
          <span>Provinces</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Province-level breakdown — coming in Phase 2.</p>
      </CardContent>
    </Card>
  );
}
