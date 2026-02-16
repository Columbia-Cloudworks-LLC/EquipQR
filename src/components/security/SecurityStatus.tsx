
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useOrganizationSecurity } from '@/features/organization/hooks/useOrganizationSecurity';

export const SecurityStatus = () => {
  const { testResult, isTestingComplete, runSecurityTest } = useOrganizationSecurity();

  const getStatusIcon = (success: boolean, hasErrors: boolean) => {
    if (hasErrors) return <XCircle className="h-4 w-4 text-red-500" />;
    if (success) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = (success: boolean, hasErrors: boolean) => {
    if (hasErrors) return <Badge variant="destructive">Failed</Badge>;
    if (success) return <Badge variant="default" className="bg-green-500">Passed</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  if (!isTestingComplete) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <Shield className="h-5 w-5 mr-2" />
          <CardTitle className="text-sm font-medium">Security Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading security status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <Shield className="h-5 w-5 mr-2" />
        <CardTitle className="text-sm font-medium">Security Status</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={runSecurityTest}
          className="ml-auto"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(testResult.canFetchOrganizations, testResult.hasErrors)}
            <span className="text-sm">Organization Access</span>
          </div>
          {getStatusBadge(testResult.canFetchOrganizations, testResult.hasErrors)}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(testResult.canFetchMembers, testResult.hasErrors)}
            <span className="text-sm">Member Access</span>
          </div>
          {getStatusBadge(testResult.canFetchMembers, testResult.hasErrors)}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(testResult.canFetchTeams, testResult.hasErrors)}
            <span className="text-sm">Team Access</span>
          </div>
          {getStatusBadge(testResult.canFetchTeams, testResult.hasErrors)}
        </div>

        {testResult.hasErrors && testResult.errors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <h4 className="text-sm font-medium text-red-800 mb-2">Security Issues:</h4>
            <ul className="space-y-1">
              {testResult.errors.map((error, index) => (
                <li key={index} className="text-xs text-red-700">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!testResult.hasErrors && testResult.canFetchOrganizations && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-xs text-green-700">
              All security policies are working correctly. Database access is properly secured with RLS.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
