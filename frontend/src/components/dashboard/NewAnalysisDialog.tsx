'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { dataAPI } from '@/lib/api';

interface AnalysisFormData {
  country_name: string;
  fiscal_year: number;
  currency: string;
  budget_unit: string;
  description: string;
}

interface NewAnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sessionId: string) => void;
}

export const NewAnalysisDialog: React.FC<NewAnalysisDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<'details' | 'processing'>('details');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [useDummyData, setUseDummyData] = useState(false);
  const [formData, setFormData] = useState<AnalysisFormData>({
    country_name: '',
    fiscal_year: 2024,
    currency: 'USD',
    budget_unit: 'millions',
    description: ''
  });

  // Automatically set country name to "Dummy" when dummy data mode is selected
  useEffect(() => {
    if (useDummyData) {
      setFormData(prev => ({ ...prev, country_name: 'Dummy' }));
    }
  }, [useDummyData]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleInputChange = (field: keyof AnalysisFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.country_name.trim()) {
      return 'Country name is required';
    }
    if (formData.fiscal_year < 2000 || formData.fiscal_year > 2030) {
      return 'Fiscal year must be between 2000 and 2030';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!useDummyData && !selectedFile) {
      setError('Please select a file or choose to use dummy data');
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
      // Create FormData for upload
      const uploadFormData = new FormData();
      
      if (useDummyData) {
        // For dummy data, we don't need a file
        uploadFormData.append('country_name', formData.country_name);
        uploadFormData.append('fiscal_year', formData.fiscal_year.toString());
        uploadFormData.append('currency', formData.currency);
        uploadFormData.append('budget_unit', formData.budget_unit);
        if (formData.description.trim()) {
          uploadFormData.append('description', formData.description);
        }
      } else {
        // For real file upload
        uploadFormData.append('file', selectedFile!);
        uploadFormData.append('country_name', formData.country_name);
        uploadFormData.append('fiscal_year', formData.fiscal_year.toString());
        uploadFormData.append('currency', formData.currency);
        uploadFormData.append('budget_unit', formData.budget_unit);
        if (formData.description.trim()) {
          uploadFormData.append('description', formData.description);
        }
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

      // Upload and process file or dummy data
      const result = useDummyData 
        ? await dataAPI.uploadDummyData(uploadFormData)
        : await dataAPI.uploadCSV(uploadFormData);

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
    setStep('details');
    setError(null);
    setUploadProgress(0);
    setUploading(false);
    setUseDummyData(false);
    setFormData({
      country_name: '',
      fiscal_year: 2024,
      currency: 'USD',
      budget_unit: 'millions',
      description: ''
    });
  };

  const handleClose = () => {
    if (!uploading) {
      resetDialog();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Start New Analysis</DialogTitle>
          <DialogDescription>
            Upload your food system data or use sample data to begin analysis
          </DialogDescription>
        </DialogHeader>

        {step === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Data Source Selection */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="upload-file"
                  name="data-source"
                  checked={!useDummyData}
                  onChange={() => setUseDummyData(false)}
                  className="h-4 w-4"
                />
                <label htmlFor="upload-file" className="text-sm font-medium">
                  Upload CSV File
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="use-dummy"
                  name="data-source"
                  checked={useDummyData}
                  onChange={() => setUseDummyData(true)}
                  className="h-4 w-4"
                />
                <label htmlFor="use-dummy" className="text-sm font-medium">
                  Use Dummy Data (Test Mode)
                </label>
              </div>
            </div>

            {/* File Upload Section */}
            {!useDummyData && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="file" className="block text-sm font-medium mb-2">
                    Upload CSV File
                  </label>
                  <input
                    id="file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload a CSV file with your food system data
                  </p>
                </div>
              </div>
            )}

            {/* Dummy Data Info */}
            {useDummyData && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start space-x-2">
                  <div className="text-blue-600 mt-0.5">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Test Mode</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This will use sample data to demonstrate the analysis platform. 
                      Perfect for exploring features without uploading your own data.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="country_name" className="block text-sm font-medium">
                  Country Name *
                </label>
                <input
                  id="country_name"
                  type="text"
                  placeholder="e.g., Kenya, Ghana, Nigeria"
                  value={formData.country_name}
                  onChange={(e) => handleInputChange('country_name', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="fiscal_year" className="block text-sm font-medium">
                  Fiscal Year *
                </label>
                <input
                  id="fiscal_year"
                  type="number"
                  placeholder="2024"
                  value={formData.fiscal_year}
                  onChange={(e) => handleInputChange('fiscal_year', parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="currency" className="block text-sm font-medium">
                  Currency *
                </label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
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
                <label htmlFor="budget_unit" className="block text-sm font-medium">
                  Budget Unit *
                </label>
                <select
                  id="budget_unit"
                  value={formData.budget_unit}
                  onChange={(e) => handleInputChange('budget_unit', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="thousands">Thousands</option>
                  <option value="millions">Millions</option>
                  <option value="billions">Billions</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium">
                Description (Optional)
              </label>
              <textarea
                id="description"
                placeholder="Brief description of this analysis..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md min-h-[80px]"
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {useDummyData ? 'Load Sample Data' : 'Upload & Process'}
              </Button>
            </div>
          </form>
        )}

        {step === 'processing' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium mb-2">
                {useDummyData ? 'Loading Sample Data' : 'Processing Your Data'}
              </h3>
              <p className="text-gray-600 mb-4">
                {useDummyData 
                  ? 'Setting up sample data for analysis...'
                  : 'Analyzing your food system data...'
                }
              </p>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">{Math.round(uploadProgress)}%</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}; 