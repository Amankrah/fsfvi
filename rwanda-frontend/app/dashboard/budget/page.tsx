'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

export default function BudgetPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-[var(--rw-blue)]" />
          <span>Budget Optimization</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Budget optimization dashboard — coming in Phase 3.</p>
      </CardContent>
    </Card>
  );
}
