'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ImplementationRisk } from '@/lib/types/planning';
import { CheckCircle2, AlertTriangle, Target, Shield } from 'lucide-react';

interface PlanningInsightsCardsProps {
  expectedOutcomes: string[];
  implementationRisks: ImplementationRisk[];
  successFactors: string[];
}

const severityColor: Record<string, string> = {
  low: 'border-l-green-500 bg-green-50/50',
  medium: 'border-l-yellow-500 bg-yellow-50/50',
  high: 'border-l-orange-500 bg-orange-50/50',
  critical: 'border-l-red-500 bg-red-50/50',
};

export function PlanningInsightsCards({
  expectedOutcomes,
  implementationRisks,
  successFactors,
}: PlanningInsightsCardsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-[var(--rw-green)]" />
            Expected Outcomes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {expectedOutcomes.length === 0 ? (
            <p className="text-sm text-gray-500">No outcomes listed.</p>
          ) : (
            <ul className="space-y-1.5">
              {expectedOutcomes.map((o, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="h-4 w-4 text-[var(--rw-green)] flex-shrink-0 mt-0.5" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Implementation Risks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {implementationRisks.length === 0 ? (
            <p className="text-sm text-gray-500">No risks identified.</p>
          ) : (
            <ul className="space-y-3">
              {implementationRisks.map((r, i) => (
                <li
                  key={i}
                  className={`text-sm pl-3 border-l-4 rounded-r ${severityColor[r.severity?.toLowerCase()] ?? severityColor.medium}`}
                >
                  <p className="font-medium text-gray-900">{r.risk_type}</p>
                  <p className="text-gray-600 mt-0.5">{r.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-medium">Mitigation:</span> {r.mitigation}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-[var(--rw-blue)]" />
            Success Factors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {successFactors.length === 0 ? (
            <p className="text-sm text-gray-500">No factors listed.</p>
          ) : (
            <ul className="space-y-1.5">
              {successFactors.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="h-4 w-4 text-[var(--rw-blue)] flex-shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
