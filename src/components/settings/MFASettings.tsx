import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useMFA } from '@/hooks/useMFA';
import { useSimpleOrganizationSafe } from '@/hooks/useSimpleOrganization';
import { useAppToast } from '@/hooks/useAppToast';
import { ShieldCheck, ShieldOff, Trash2, Loader2 } from 'lucide-react';
import MFAEnrollment from '@/components/auth/MFAEnrollment';

const MFA_REQUIRED_ROLES = ['owner', 'admin'] as const;

const MFASettings: React.FC = () => {
  const { factors, isEnrolled, isLoading, unenrollFactor, refreshMFAStatus } = useMFA();
  const orgContext = useSimpleOrganizationSafe();
  const toast = useAppToast();
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [removingFactorId, setRemovingFactorId] = useState<string | null>(null);

  const userRole = orgContext?.currentOrganization?.userRole;
  const isMFARequired = MFA_REQUIRED_ROLES.includes(
    userRole as (typeof MFA_REQUIRED_ROLES)[number]
  );

  const verifiedFactors = factors.filter((f) => f.status === 'verified');

  const handleRemoveFactor = useCallback(async (factorId: string) => {
    setRemovingFactorId(factorId);
    const { error } = await unenrollFactor(factorId);
    setRemovingFactorId(null);

    if (error) {
      toast.error({
        title: 'Failed to Remove',
        description: 'Could not remove the authenticator. Please try again.',
      });
    } else {
      toast.success({
        title: 'Authenticator Removed',
        description: 'Two-factor authentication has been disabled.',
      });
    }
  }, [unenrollFactor, toast]);

  const handleEnrollmentComplete = useCallback(async () => {
    setShowEnrollment(false);
    await refreshMFAStatus();
  }, [refreshMFAStatus]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4" role="status" aria-label="Loading MFA status">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show enrollment flow inline
  if (showEnrollment) {
    return (
      <Card>
        <CardContent className="pt-6">
          <MFAEnrollment
            onComplete={handleEnrollmentComplete}
            onSkip={() => setShowEnrollment(false)}
            isRequired={false}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEnrolled ? (
              <ShieldCheck className="h-5 w-5 text-primary" />
            ) : (
              <ShieldOff className="h-5 w-5 text-muted-foreground" />
            )}
            <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
          </div>
          <Badge variant={isEnrolled ? 'default' : 'secondary'}>
            {isEnrolled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        <CardDescription>
          Add an extra layer of security to your account with a time-based one-time password (TOTP).
          {isMFARequired ? (
            <span className="block mt-1 text-primary font-medium">
              Required for your role ({userRole}).
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEnrolled ? (
          <div className="space-y-3">
            {verifiedFactors.map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {factor.friendly_name || 'Authenticator App'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Added {new Date(factor.created_at).toLocaleDateString()}
                  </span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={removingFactorId === factor.id || isMFARequired}
                      aria-label="Remove authenticator"
                    >
                      {removingFactorId === factor.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Authenticator?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will disable two-factor authentication on your account.
                        You will need to set it up again if you want to re-enable it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemoveFactor(factor.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
            {isMFARequired ? (
              <p className="text-xs text-muted-foreground">
                Two-factor authentication cannot be removed for admin and owner accounts.
              </p>
            ) : null}
          </div>
        ) : (
          <Button onClick={() => setShowEnrollment(true)}>
            Set Up Two-Factor Authentication
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default MFASettings;
