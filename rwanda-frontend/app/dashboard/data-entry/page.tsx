'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IndicatorDataEntry } from '@/components/rwanda/data-entry/IndicatorDataEntry';
import { BulkDataImport } from '@/components/rwanda/data-entry/BulkDataImport';
import { Database, BarChart3, FileSpreadsheet } from 'lucide-react';

type EntryMode = 'indicators' | 'import';

export default function DataEntryPage() {
  const [mode, setMode] = useState<EntryMode>('indicators');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Database className="h-7 w-7 mr-2 text-[var(--rw-blue)]" />
            Data Entry Portal
          </h1>
          <p className="text-gray-600 mt-1">
            Enter raw indicator and budget data for new fiscal years.
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 pb-2">
        <Button
          variant={mode === 'indicators' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('indicators')}
          className="flex items-center"
        >
          <BarChart3 className="h-4 w-4 mr-1" />
          Indicator Data
        </Button>
        <Button
          variant={mode === 'import' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('import')}
          className="flex items-center"
        >
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          Bulk Import
        </Button>
      </div>

      {/* Content based on mode */}
      {mode === 'indicators' && <IndicatorDataEntry />}
      {mode === 'import' && <BulkDataImport />}
    </div>
  );
}
