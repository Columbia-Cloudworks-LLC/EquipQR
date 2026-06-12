import React from 'react';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SUPPORT_DOCS_URL } from '@/lib/documentationUrl';

type WorkspaceAccessGateMode = 'blocked' | 'pending';

interface WorkspaceAccessGateProps {
  mode: WorkspaceAccessGateMode;
  domain: string | null;
}

const WorkspaceAccessGate: React.FC<WorkspaceAccessGateProps> = ({ mode, domain }) => {
  const isPending = mode === 'pending';

  return (
    <Page maxWidth="3xl" padding="responsive">
      <PageHeader
        title={isPending ? 'Workspace access pending' : 'Workspace access required'}
        description={
          domain
            ? `Your Google account uses the claimed domain ${domain}.`
            : 'Your Google Workspace domain is managed by an existing EquipQR organization.'
        }
      />

      <Alert variant={isPending ? 'default' : 'destructive'}>
        {isPending ? <Clock3 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        <AlertTitle>
          {isPending ? 'Waiting for administrator approval' : 'You do not have access yet'}
        </AlertTitle>
        <AlertDescription className="space-y-3">
          {isPending ? (
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
            <Button variant="outline" size="sm" asChild>
              <a href={SUPPORT_DOCS_URL} target="_blank" rel="noopener noreferrer">
                Help Center
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Sign out</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </Page>
  );
};

export default WorkspaceAccessGate;
