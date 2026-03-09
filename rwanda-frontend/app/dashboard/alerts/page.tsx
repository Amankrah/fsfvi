'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export default function AlertsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-[var(--rw-blue)]" />
          <span>Alert Center</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Notification center & threshold alerts — coming in Phase 4.</p>
      </CardContent>
    </Card>
  );
}
