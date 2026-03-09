'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function ReportsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-[var(--rw-blue)]" />
          <span>Report Generator</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">PDF report generation & history — coming in Phase 5.</p>
      </CardContent>
    </Card>
  );
}
