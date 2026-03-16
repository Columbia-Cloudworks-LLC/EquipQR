
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Database, RefreshCw, Clock, CheckCircle, XCircle, ShieldAlert, LogOut } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SessionStatus = () => {
  const { sessionData, isLoading, error, refreshSession } = useSession();
  const { user, signOut } = useAuth();

  const getSessionAge = () => {
    if (!sessionData?.lastUpdated) return 'Unknown';
    return formatDistanceToNow(new Date(sessionData.lastUpdated), { addSuffix: true });
  };

  const getLastSignIn = () => {
    if (!user?.last_sign_in_at) return 'Unknown';
    return formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true });
  };

  const handleSignOutAllSessions = async () => {
    try {
      const { error: globalSignOutError } = await supabase.auth.signOut({ scope: 'global' });
      if (globalSignOutError) throw globalSignOutError;

      await signOut();
      toast.success('Signed out of all sessions');
      window.location.assign('/auth');
    } catch (globalError) {
      toast.error(globalError instanceof Error ? globalError.message : 'Failed to sign out all sessions');
    }
  };

  const getStatusIcon = () => {
    if (error) return <XCircle className="h-4 w-4 text-destructive" />;
    if (isLoading) return <RefreshCw className="h-4 w-4 animate-spin text-warning" />;
    if (sessionData) return <CheckCircle className="h-4 w-4 text-success" />;
    return <Database className="h-4 w-4 text-muted-foreground" />;
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Last Sign In</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {getLastSignIn()}
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

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out all sessions
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out all active sessions?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This revokes your active sessions across all devices. You will need to sign in again everywhere.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleSignOutAllSessions()}>
                    Sign out everywhere
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
            <p className="text-xs text-destructive">
              {error}
            </p>
          </div>
        )}

        {!error && sessionData && (
          <div className="mt-4 p-3 bg-success/10 border border-success/30 rounded-md">
            <p className="text-xs text-success">
              Session data loaded successfully. Using cached data for improved performance.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

