'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from 'lucide-react';

export default function DataEntryPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-[var(--rw-blue)]" />
          <span>Data Entry Portal</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">District data submission & validation — coming in Phase 5.</p>
      </CardContent>
    </Card>
  );
}
