import React from 'react';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SUPPORT_DOCS_URL } from '@/lib/documentationUrl';

type WorkspaceAccessGateMode = 'blocked' | 'pending' | 'error';

interface WorkspaceAccessGateProps {
  mode: WorkspaceAccessGateMode;
  domain: string | null;
  onRetry?: () => void;
}

const WorkspaceAccessGate: React.FC<WorkspaceAccessGateProps> = ({ mode, domain, onRetry }) => {
  const { signOut } = useAuth();
  const isPending = mode === 'pending';
  const isError = mode === 'error';

  return (
    <Page maxWidth="3xl" padding="responsive">
      <PageHeader
        title={
          isError
            ? 'Unable to verify workspace access'
            : isPending
              ? 'Workspace access pending'
              : 'Workspace access required'
        }
        description={
          isError
            ? 'EquipQR could not confirm your Google Workspace access status.'
            : domain
              ? `Your Google account uses the claimed domain ${domain}.`
              : 'Your Google Workspace domain is managed by an existing EquipQR organization.'
        }
      />

      <Alert variant={isError || !isPending ? 'destructive' : 'default'}>
        {isPending ? <Clock3 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        <AlertTitle>
          {isError
            ? 'Access check failed'
            : isPending
              ? 'Waiting for administrator approval'
              : 'You do not have access yet'}
        </AlertTitle>
        <AlertDescription className="space-y-3">
          {isError ? (
            <p>
              We could not load your workspace onboarding status. Try again, or sign out and back in
              if the problem continues.
            </p>
          ) : isPending ? (
            <p>
              An organization administrator has started adding you, or you have a pending invitation.
              Sign in again after your administrator completes the import or your invitation is ready.
            </p>
          ) : (
            <p>
              EquipQR does not allow automatic self-join for claimed Google Workspace domains.
              Ask your organization administrator to import you from Google Workspace or send you a
              standard EquipQR invitation.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {isError && onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try again
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <a href={SUPPORT_DOCS_URL} target="_blank" rel="noopener noreferrer">
                Help Center
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void signOut();
              }}
            >
              Sign out
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </Page>
  );
};

export default WorkspaceAccessGate;
