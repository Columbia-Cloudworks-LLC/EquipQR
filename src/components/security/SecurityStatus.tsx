
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useOrganizationSecurity } from '@/features/organization/hooks/useOrganizationSecurity';

export const SecurityStatus = () => {
  const { testResult, isTestingComplete, runSecurityTest } = useOrganizationSecurity();

  const getStatusIcon = (success: boolean, hasErrors: boolean) => {
    if (hasErrors) return <XCircle className="h-4 w-4 text-destructive" />;
    if (success) return <CheckCircle className="h-4 w-4 text-success" />;
    return <AlertTriangle className="h-4 w-4 text-warning" />;
  };

  const getStatusBadge = (success: boolean, hasErrors: boolean) => {
    if (hasErrors) return <Badge variant="destructive">Failed</Badge>;
    if (success) return <Badge variant="default" className="bg-success">Passed</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  if (!isTestingComplete) {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Security Status</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading security status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Security Status</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={runSecurityTest}
                aria-label="Refresh security status"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh security status</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center justify-between min-h-[32px]">
        <div className="flex items-center gap-2">
          {getStatusIcon(testResult.canFetchOrganizations, testResult.hasErrors)}
          <span className="text-sm">Organization Access</span>
        </div>
        {getStatusBadge(testResult.canFetchOrganizations, testResult.hasErrors)}
      </div>

      <div className="flex items-center justify-between min-h-[32px]">
        <div className="flex items-center gap-2">
          {getStatusIcon(testResult.canFetchMembers, testResult.hasErrors)}
          <span className="text-sm">Member Access</span>
        </div>
        {getStatusBadge(testResult.canFetchMembers, testResult.hasErrors)}
      </div>

      <div className="flex items-center justify-between min-h-[32px]">
        <div className="flex items-center gap-2">
          {getStatusIcon(testResult.canFetchTeams, testResult.hasErrors)}
          <span className="text-sm">Team Access</span>
        </div>
        {getStatusBadge(testResult.canFetchTeams, testResult.hasErrors)}
      </div>

      {testResult.hasErrors && testResult.errors.length > 0 && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
          <h4 className="text-sm font-medium text-destructive mb-2">Security Issues:</h4>
          <ul className="space-y-1">
            {testResult.errors.map((error, index) => (
              <li key={index} className="text-xs text-destructive">
                &bull; {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!testResult.hasErrors && testResult.canFetchOrganizations && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-md">
          <p className="text-xs text-success">
            All security policies are working correctly. Database access is properly secured with RLS.
          </p>
        </div>
      )}
    </div>
  );
};
