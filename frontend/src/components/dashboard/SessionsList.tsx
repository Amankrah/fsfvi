'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Eye, 
  MoreHorizontal,
  Globe,
  Clock,
  TrendingUp,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { dataAPI } from '@/lib/api';

interface Session {
  id: string;
  country_name: string;
  fiscal_year: number;
  status: string;
  created_at: string;
  total_budget: number;
  currency?: string;
  budget_unit?: string;
}

interface SessionsListProps {
  sessions: Session[];
  onSessionDeleted?: (sessionId: string) => void;
}

export const SessionsList: React.FC<SessionsListProps> = ({ sessions, onSessionDeleted }) => {
  const [clearingSessionId, setClearingSessionId] = useState<string | null>(null);
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'active': { color: 'bg-blue-100 text-blue-800', label: 'Active' },
      'completed': { color: 'bg-green-100 text-green-800', label: 'Completed' },
      'processing': { color: 'bg-yellow-100 text-yellow-800', label: 'Processing' },
      'data_uploaded': { color: 'bg-gray-100 text-gray-800', label: 'Data Uploaded' },
      'analysis_completed': { color: 'bg-green-100 text-green-800', label: 'Analysis Complete' },
      'optimization_completed': { color: 'bg-purple-100 text-purple-800', label: 'Optimized' },
      'error': { color: 'bg-red-100 text-red-800', label: 'Error' },
      'performance_gaps_calculated': { color: 'bg-purple-100 text-purple-800', label: 'Performance Gaps Calculated' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    
    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const formatBudget = (budget: number, currency = 'USD', unit = 'millions') => {
    if (!budget) return 'N/A';
    return `${currency} ${budget.toFixed(1)}${unit === 'millions' ? 'M' : unit === 'billions' ? 'B' : ''}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewSession = (sessionId: string) => {
    // Navigate to performance gaps analysis (starting point)
    window.location.href = `/analysis/${sessionId}/performance-gaps`;
  };

  const handleClearSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to clear this session? This will delete all associated data and cannot be undone.')) {
      return;
    }

    setClearingSessionId(sessionId);
    try {
      await dataAPI.clearSession(sessionId);
      if (onSessionDeleted) {
        onSessionDeleted(sessionId);
      }
      // Dashboard will refresh automatically via callback
    } catch (error) {
      console.error('Failed to clear session:', error);
      alert('Failed to clear session. Please try again.');
    } finally {
      setClearingSessionId(null);
    }
  };

  const isClearing = (sessionId: string) => clearingSessionId === sessionId;

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No analyses yet
          </h3>
                     <p className="text-gray-600 text-center max-w-md mb-6">
             Start your first FSFVI analysis by uploading your country&apos;s food system data. 
             The system will guide you through vulnerability assessment and optimization.
           </p>
          <div className="flex space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Globe className="h-4 w-4 mr-1" />
              Any Country
            </div>
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              CSV Upload
            </div>
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              Full Analysis
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <Card key={session.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{session.country_name}</CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    FY {session.fiscal_year}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(session.status)}
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                <span>Budget: {formatBudget(session.total_budget, session.currency, session.budget_unit)}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Created: {formatDate(session.created_at)}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                <span>ID: {session.id.substring(0, 8)}...</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {session.status === 'completed' || session.status === 'analysis_completed' ? (
                  'Analysis complete - View detailed performance gap results and recommendations'
                ) : session.status === 'performance_gaps_calculated' ? (
                  'Performance gaps calculated - Continue with vulnerability analysis'
                ) : session.status === 'processing' ? (
                  'Processing data - Analysis in progress'
                ) : session.status === 'data_uploaded' ? (
                  'Data uploaded - Ready for performance gap analysis'
                ) : (
                  'Session active - Continue analysis'
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewSession(session.id)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                
                {(session.status === 'completed' || session.status === 'analysis_completed') && (
                  <>
                    <Button 
                      size="sm"
                      onClick={() => handleViewSession(session.id)}
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Gap Analysis
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleClearSession(session.id)}
                      disabled={isClearing(session.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {isClearing(session.id) ? (
                        <RotateCcw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Clear
                    </Button>
                  </>
                )}

                {session.status === 'performance_gaps_calculated' && (
                  <>
                    <Button 
                      size="sm"
                      onClick={() => handleViewSession(session.id)}
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      View Gaps
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleClearSession(session.id)}
                      disabled={isClearing(session.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {isClearing(session.id) ? (
                        <RotateCcw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Clear
                    </Button>
                  </>
                )}
                
                {session.status === 'data_uploaded' && (
                  <>
                    <Button 
                      size="sm"
                      onClick={() => handleViewSession(session.id)}
                    >
                      Start Gap Analysis
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleClearSession(session.id)}
                      disabled={isClearing(session.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {isClearing(session.id) ? (
                        <RotateCcw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Clear
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Load More Button (if needed) */}
      {sessions.length >= 5 && (
        <div className="text-center pt-4">
          <Button variant="outline">
            Load More Sessions
          </Button>
        </div>
      )}
    </div>
  );
}; 