'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { indicatorAPI, type ImportResult, type ImportPreviewRow } from '@/lib/api/indicatorApi';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileUp,
  X,
  AlertTriangle,
} from 'lucide-react';

const COMPONENT_COLORS: Record<string, string> = {
  markets: 'bg-blue-100 text-blue-800',
  crop_production: 'bg-green-100 text-green-800',
  nutrition: 'bg-orange-100 text-orange-800',
  research: 'bg-purple-100 text-purple-800',
  post_harvest: 'bg-yellow-100 text-yellow-800',
  environment: 'bg-teal-100 text-teal-800',
  animal_systems: 'bg-pink-100 text-pink-800',
  finance: 'bg-indigo-100 text-indigo-800',
};

export function BulkDataImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fiscalYear, setFiscalYear] = useState<number>(new Date().getFullYear());
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewResult(null);
      setError(null);
      setImportSuccess(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase().split('.').pop();
      if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
        setSelectedFile(file);
        setPreviewResult(null);
        setError(null);
        setImportSuccess(false);
      } else {
        setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setPreviewResult(null);
    setError(null);
    setImportSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handlePreview = async () => {
    if (!selectedFile) return;

    setPreviewing(true);
    setError(null);

    try {
      const result = await indicatorAPI.importFile(selectedFile, fiscalYear, 'preview');
      setPreviewResult(result);
    } catch (err: unknown) {
      console.error('[BulkDataImport] Preview failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to preview file');
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setError(null);
    setImportSuccess(false);

    try {
      const result = await indicatorAPI.importFile(selectedFile, fiscalYear, 'import');
      setPreviewResult(result);
      if (result.created || result.updated) {
        setImportSuccess(true);
      }
    } catch (err: unknown) {
      console.error('[BulkDataImport] Import failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to import file');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await indicatorAPI.downloadTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'indicator_data_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[BulkDataImport] Template download failed:', err);
      setError('Failed to download template');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5 text-[var(--rw-blue)]" />
            <span>Bulk Data Import</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Supported Formats</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                <strong>CSV/Excel</strong> with columns: indicator_code, gross_lcu_bn, weighted_lcu_bn,
                observed_value, benchmark_value
              </li>
              <li>
                <strong>Indicator codes</strong> can be just "IND-01" or full "IND-01: Yield (t/ha)"
              </li>
            </ul>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="mt-3"
            >
              <Download className="h-4 w-4 mr-1" />
              Download Template CSV
            </Button>
          </div>

          {/* Fiscal Year Selection */}
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Fiscal Year
              </label>
              <Input
                type="number"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-32"
              />
            </div>
          </div>

          {/* File Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              selectedFile
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-[var(--rw-blue)] hover:bg-blue-50'
            }`}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileUp className="h-8 w-8 text-green-600" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">{selectedFile.name}</div>
                  <div className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">
                  Drag and drop a CSV or Excel file here, or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Select File
                </Button>
              </>
            )}
          </div>

          {/* Action Buttons */}
          {selectedFile && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={previewing || importing}
              >
                {previewing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Previewing...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Preview Data
                  </>
                )}
              </Button>

              <Button
                onClick={handleImport}
                disabled={importing || previewing || !previewResult || previewResult.matched === 0}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}

      {/* Success Message */}
      {importSuccess && previewResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
          <span className="text-sm text-green-800">
            Successfully imported data for FY {previewResult.fiscal_year}/{previewResult.fiscal_year + 1}:
            {' '}{previewResult.created} created, {previewResult.updated} updated.
          </span>
        </div>
      )}

      {/* Preview Results */}
      {previewResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>
                {previewResult.mode === 'preview' ? 'Preview' : 'Import'} Results
              </span>
              <div className="flex gap-4 text-sm font-normal">
                <span className="text-gray-600">
                  Total rows: <strong>{previewResult.total_rows}</strong>
                </span>
                <span className="text-green-600">
                  Matched: <strong>{previewResult.matched}</strong>
                </span>
                {previewResult.unmatched > 0 && (
                  <span className="text-amber-600">
                    Unmatched: <strong>{previewResult.unmatched}</strong>
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Errors */}
            {previewResult.errors.length > 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center text-amber-800 font-medium text-sm mb-2">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {previewResult.errors.length} row(s) with issues
                </div>
                <div className="max-h-32 overflow-y-auto text-sm">
                  {previewResult.errors.slice(0, 10).map((err, i) => (
                    <div key={i} className="text-amber-700">
                      Row {err.row}: {err.error}
                    </div>
                  ))}
                  {previewResult.errors.length > 10 && (
                    <div className="text-amber-600 mt-1">
                      ... and {previewResult.errors.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preview Table */}
            {previewResult.preview.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500">
                      <th className="pb-2 pr-2 font-medium">Row</th>
                      <th className="pb-2 pr-2 font-medium">Code</th>
                      <th className="pb-2 pr-2 font-medium">Indicator</th>
                      <th className="pb-2 pr-2 font-medium">Component</th>
                      <th className="pb-2 pr-2 font-medium text-right">Gross (Bn)</th>
                      <th className="pb-2 pr-2 font-medium text-right">Weighted (Bn)</th>
                      <th className="pb-2 pr-2 font-medium text-right">Observed</th>
                      <th className="pb-2 font-medium text-right">Benchmark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.preview.map((row: ImportPreviewRow) => (
                      <tr key={row.row} className="border-b border-gray-100">
                        <td className="py-2 pr-2 text-gray-500">{row.row}</td>
                        <td className="py-2 pr-2 font-mono text-xs">{row.indicator_code}</td>
                        <td className="py-2 pr-2 max-w-[200px] truncate" title={row.indicator_name}>
                          {row.indicator_name}
                        </td>
                        <td className="py-2 pr-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${COMPONENT_COLORS[row.component] || 'bg-gray-100 text-gray-800'}`}
                          >
                            {row.component}
                          </span>
                        </td>
                        <td className="py-2 pr-2 text-right font-mono">
                          {row.gross_lcu_bn.toFixed(2)}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono">
                          {row.weighted_lcu_bn.toFixed(2)}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono">
                          {row.observed_value?.toFixed(2) ?? '—'}
                        </td>
                        <td className="py-2 text-right font-mono">
                          {row.benchmark_value?.toFixed(2) ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewResult.matched > previewResult.preview.length && (
                  <div className="text-center text-sm text-gray-500 py-3">
                    Showing first {previewResult.preview.length} of {previewResult.matched} matched rows
                  </div>
                )}
              </div>
            )}

            {previewResult.preview.length === 0 && previewResult.matched === 0 && (
              <div className="text-center py-8 text-gray-500">
                No matching indicators found in the file
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default BulkDataImport;
