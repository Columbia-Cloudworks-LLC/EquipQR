import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceOnboardingState } from '@/hooks/useWorkspaceOnboarding';
import { isConsumerGoogleDomain, isGoogleUser } from '@/utils/google-workspace';
import WorkspaceAccessGate from '@/components/auth/WorkspaceAccessGate';

interface WorkspaceOnboardingGuardProps {
  children: React.ReactNode;
}

/**
 * Blocks dashboard access for Google users on claimed Workspace domains who lack
 * explicit authorization via workspace membership, invitation, import claim, or
 * active membership in another organization.
 */
const WorkspaceOnboardingGuard: React.FC<WorkspaceOnboardingGuardProps> = ({ children }) => {
  const { user } = useAuth();
  const { data: onboardingState, isLoading, isError, refetch } = useWorkspaceOnboardingState();

  if (!user || !isGoogleUser(user)) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Checking workspace access" />
      </div>
    );
  }

  if (isError) {
    return <WorkspaceAccessGate mode="error" domain={null} onRetry={() => { void refetch(); }} />;
  }

  if (!onboardingState || onboardingState.domain_status !== 'claimed') {
    return <>{children}</>;
  }

  if (isConsumerGoogleDomain(onboardingState.domain)) {
    return <>{children}</>;
  }

  if (onboardingState.has_workspace_membership || onboardingState.has_other_organization_membership) {
    return <>{children}</>;
  }

  if (onboardingState.has_pending_invitation || onboardingState.has_pending_claim) {
    return <WorkspaceAccessGate mode="pending" domain={onboardingState.domain} />;
  }

  return <WorkspaceAccessGate mode="blocked" domain={onboardingState.domain} />;
};

export default WorkspaceOnboardingGuard;
