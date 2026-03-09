'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck } from 'lucide-react';

export default function AssessmentPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileCheck className="h-5 w-5 text-[var(--rw-blue)]" />
          <span>FSFI Assessment</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Full FSFI assessment dashboard — coming in Phase 3.</p>
      </CardContent>
    </Card>
  );
}
