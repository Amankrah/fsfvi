'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Download,
  Info,
  Loader2
} from 'lucide-react';
import { dataAPI } from '@/lib/api';

interface AnalysisFormData {
  country_name: string;
  fiscal_year: number;
  currency: string;
  budget_unit: string;
  description: string;
}

interface NewAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (sessionId: string) => void;
}

export const NewAnalysisDialog: React.FC<NewAnalysisDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'details' | 'processing'>('upload');
  
  // Form state
  const [formData, setFormData] = useState<AnalysisFormData>({
    country_name: '',
    fiscal_year: new Date().getFullYear(),
    currency: 'USD',
    budget_unit: 'millions',
    description: '',
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setError('');
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
    setStep('details');
  };

  const removeFile = () => {
    setSelectedFile(null);
    setStep('upload');
    setError('');
  };

  const handleInputChange = (field: keyof AnalysisFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.country_name.trim()) {
      return 'Country name is required';
    }
    if (formData.country_name.length < 2) {
      return 'Country name must be at least 2 characters';
    }
    if (formData.fiscal_year < 2000 || formData.fiscal_year > 2030) {
      return 'Fiscal year must be between 2000 and 2030';
    }
    if (!formData.currency.trim()) {
      return 'Currency is required';
    }
    if (!formData.budget_unit) {
      return 'Budget unit is required';
    }
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setStep('processing');
    setUploadProgress(0);

    try {
      // Create FormData for file upload
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('country_name', formData.country_name);
      uploadFormData.append('fiscal_year', formData.fiscal_year.toString());
      uploadFormData.append('currency', formData.currency);
      uploadFormData.append('budget_unit', formData.budget_unit);
      if (formData.description.trim()) {
        uploadFormData.append('description', formData.description);
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      // Upload and process file
      const result = await dataAPI.uploadCSV(uploadFormData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Wait a moment to show completion
      setTimeout(() => {
        onSuccess(result.session_id);
        resetDialog();
      }, 1000);

    } catch (err: unknown) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setStep('details');
    } finally {
      setUploading(false);
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setStep('upload');
    setError('');
    setUploadProgress(0);
    setUploading(false);
    setFormData({
      country_name: '',
      fiscal_year: new Date().getFullYear(),
      currency: 'USD',
      budget_unit: 'millions',
      description: '',
    });
  };

  const handleClose = () => {
    if (!uploading) {
      resetDialog();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Start New FSFVI Analysis
          </DialogTitle>
          <DialogDescription>
            Upload your country&apos;s food system data to begin vulnerability analysis and optimization.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            {/* File Upload Area */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Upload CSV file"
              />
              
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload CSV File
              </h3>
              <p className="text-gray-600 mb-4">
                Drag and drop your file here, or click to select
              </p>
              <Button type="button">
                Choose File
              </Button>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Data Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Info className="w-4 h-4 mr-2" />
                  Data Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600">
                  <p className="mb-3">Your CSV file should contain columns for:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Component/Sector names</li>
                    <li>Financial expenditure/budget amounts</li>
                    <li>Performance values (optional)</li>
                    <li>Benchmark/target values (optional)</li>
                  </ul>
                </div>
                
                <div className="pt-3 border-t">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'details' && selectedFile && (
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Selected File Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={removeFile} type="button">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country_name">Country Name *</Label>
                <Input
                  id="country_name"
                  placeholder="e.g., Kenya, Ghana, Nigeria"
                  value={formData.country_name}
                  onChange={(e) => handleInputChange('country_name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fiscal_year">Fiscal Year *</Label>
                <Input
                  id="fiscal_year"
                  type="number"
                  placeholder={new Date().getFullYear().toString()}
                  value={formData.fiscal_year}
                  onChange={(e) => handleInputChange('fiscal_year', parseInt(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Select currency"
                  required
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="KES">KES</option>
                  <option value="GHS">GHS</option>
                  <option value="NGN">NGN</option>
                  <option value="ZAR">ZAR</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget_unit">Budget Unit *</Label>
                <select
                  id="budget_unit"
                  value={formData.budget_unit}
                  onChange={(e) => handleInputChange('budget_unit', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Select budget unit"
                  required
                >
                  <option value="thousands">Thousands</option>
                  <option value="millions">Millions</option>
                  <option value="billions">Billions</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <textarea
                id="description"
                placeholder="Brief description of this analysis..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                Start Analysis
              </Button>
            </div>
          </form>
        )}

        {step === 'processing' && (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Processing Your Data
              </h3>
              <p className="text-gray-600 mb-6">
                Uploading and analyzing your food system data...
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            
            <p className="text-sm text-gray-600">
              {uploadProgress < 50 ? 'Uploading file...' :
               uploadProgress < 90 ? 'Processing data...' :
               'Finalizing analysis setup...'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}; 