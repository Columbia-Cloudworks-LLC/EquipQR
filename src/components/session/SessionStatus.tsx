
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { formatDistanceToNow } from 'date-fns';

export const SessionStatus = () => {
  const { sessionData, isLoading, error, refreshSession } = useSession();

  const getSessionAge = () => {
    if (!sessionData?.lastUpdated) return 'Unknown';
    return formatDistanceToNow(new Date(sessionData.lastUpdated), { addSuffix: true });
  };

  const getStatusIcon = () => {
    if (error) return <XCircle className="h-4 w-4 text-red-500" />;
    if (isLoading) return <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />;
    if (sessionData) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Database className="h-4 w-4 text-gray-500" />;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <Database className="h-5 w-5 mr-2" />
        <CardTitle className="text-sm font-medium">Session Status</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshSession}
          disabled={isLoading}
          className="ml-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm">Session Data</span>
          </div>
          <Badge variant={sessionData ? 'default' : 'secondary'}>
            {sessionData ? 'Loaded' : 'Not Available'}
          </Badge>
        </div>

        {sessionData && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Last Updated</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {getSessionAge()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center">
                <div className="text-lg font-semibold">{sessionData.organizations.length}</div>
                <div className="text-xs text-muted-foreground">Organizations</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{sessionData.teamMemberships.length}</div>
                <div className="text-xs text-muted-foreground">Team Memberships</div>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-700">
              {error}
            </p>
          </div>
        )}

        {!error && sessionData && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-xs text-green-700">
              Session data loaded successfully. Using cached data for improved performance.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
