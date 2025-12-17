'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Key,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  Code,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { demoApiClient } from '@/lib/demoApi';

interface ApiDemoProps {
  title: string;
  description: string;
  scope: string;
  endpoint: string;
  icon: React.ElementType;
  color: string;
  onExecute: (apiKey: string, params?: Record<string, any>) => Promise<any>;
  parameters?: {
    name: string;
    label: string;
    type: 'text' | 'number';
    placeholder: string;
    required: boolean;
  }[];
}

export function ApiDemo({ title, description, scope, endpoint, icon: Icon, color, onExecute, parameters }: ApiDemoProps) {
  const [apiKey, setApiKey] = useState('');
  const [params, setParams] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExecute = async () => {
    if (!apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      demoApiClient.setApiKey(apiKey);
      const result = await onExecute(apiKey, params);
      setResponse(result);
      setShowResponse(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getColorClasses = () => {
    const colors: Record<string, { bg: string; text: string; border: string; badge: string }> = {
      emerald: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-600',
        border: 'border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-700',
      },
      teal: {
        bg: 'bg-teal-50',
        text: 'text-teal-600',
        border: 'border-teal-200',
        badge: 'bg-teal-100 text-teal-700',
      },
      purple: {
        bg: 'bg-purple-50',
        text: 'text-purple-600',
        border: 'border-purple-200',
        badge: 'bg-purple-100 text-purple-700',
      },
      amber: {
        bg: 'bg-amber-50',
        text: 'text-amber-600',
        border: 'border-amber-200',
        badge: 'bg-amber-100 text-amber-700',
      },
      rose: {
        bg: 'bg-rose-50',
        text: 'text-rose-600',
        border: 'border-rose-200',
        badge: 'bg-rose-100 text-rose-700',
      },
    };
    return colors[color] || colors.emerald;
  };

  const colorClasses = getColorClasses();

  return (
    <Card className={`border-2 ${colorClasses.border} hover:shadow-xl transition-all`}>
      <CardHeader className={`${colorClasses.bg} border-b ${colorClasses.border}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center text-xl mb-2">
              <div className={`w-10 h-10 rounded-xl ${colorClasses.bg} border-2 ${colorClasses.border} flex items-center justify-center mr-3`}>
                <Icon className={`h-6 w-6 ${colorClasses.text}`} />
              </div>
              {title}
            </CardTitle>
            <CardDescription className="text-sm mb-3">{description}</CardDescription>
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-mono px-3 py-1 rounded-full ${colorClasses.badge} font-medium`}>
                {scope}
              </span>
              <span className="text-xs font-mono px-3 py-1 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                GET {endpoint}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* API Key Input */}
        <div>
          <Label htmlFor={`apikey-${scope}`} className="flex items-center mb-2">
            <Key className="h-4 w-4 mr-2 text-gray-500" />
            API Key
          </Label>
          <Input
            id={`apikey-${scope}`}
            type="password"
            placeholder="Enter your API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono text-sm"
          />
        </div>

        {/* Optional Parameters */}
        {parameters && parameters.length > 0 && (
          <div className="space-y-3">
            {parameters.map((param) => (
              <div key={param.name}>
                <Label htmlFor={`${scope}-${param.name}`} className="mb-2 block">
                  {param.label} {!param.required && <span className="text-gray-400">(optional)</span>}
                </Label>
                <Input
                  id={`${scope}-${param.name}`}
                  type={param.type}
                  placeholder={param.placeholder}
                  value={params[param.name] || ''}
                  onChange={(e) => setParams({ ...params, [param.name]: e.target.value })}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {/* Execute Button */}
        <Button
          onClick={handleExecute}
          disabled={isLoading}
          className={`w-full bg-gradient-to-r from-${color}-600 to-${color}-700 hover:from-${color}-700 hover:to-${color}-800 text-white shadow-md`}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Execute API Call
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 text-sm">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Response */}
        {response && !error && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-green-100 border-b border-green-200">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-semibold text-green-900 text-sm">Success</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 text-green-700 hover:text-green-900 hover:bg-green-200"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowResponse(!showResponse)}
                  className="h-8 text-green-700 hover:text-green-900 hover:bg-green-200"
                >
                  {showResponse ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Hide
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show
                    </>
                  )}
                </Button>
              </div>
            </div>

            {showResponse && (
              <div className="p-4 bg-white">
                <div className="flex items-center mb-2">
                  <Code className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Response</span>
                </div>
                <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded p-4 overflow-x-auto max-h-96 overflow-y-auto">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
