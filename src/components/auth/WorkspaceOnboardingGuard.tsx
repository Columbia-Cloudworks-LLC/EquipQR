import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useWorkspaceOnboardingState } from '@/hooks/useWorkspaceOnboarding';
import { needsWorkspaceOnboarding } from '@/utils/google-workspace';
import { Loader2 } from 'lucide-react';

interface WorkspaceOnboardingGuardProps {
  children: React.ReactNode;
}

/**
 * Guard component that redirects Google Workspace users to onboarding
 * if they haven't completed the domain claiming flow.
 * 
 * This guard ensures users cannot bypass onboarding by directly navigating
 * to dashboard routes.
 */
const WorkspaceOnboardingGuard: React.FC<WorkspaceOnboardingGuardProps> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { data: onboardingState, isLoading: onboardingLoading } = useWorkspaceOnboardingState();
  const location = useLocation();

  // Don't guard the onboarding route itself
  const isOnboardingRoute = location.pathname === '/dashboard/onboarding/workspace';

  // Wait for auth, organization, and onboarding state to load
  if (authLoading || orgLoading || onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div role="status" aria-label="Loading" className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // No user means ProtectedRoute should have already redirected
  if (!user) {
    return <>{children}</>;
  }

  // Skip check for the onboarding route to prevent infinite redirects
  if (isOnboardingRoute) {
    return <>{children}</>;
  }

  // Allow navigation if user is on their personal organization
  // Personal orgs don't require workspace onboarding
  if (currentOrganization?.isPersonal) {
    return <>{children}</>;
  }

  // Use shared utility to determine if onboarding is needed
  // Only check this for workspace organizations
  if (needsWorkspaceOnboarding(user, onboardingState)) {
    return <Navigate to="/dashboard/onboarding/workspace" replace />;
  }

  return <>{children}</>;
};

export default WorkspaceOnboardingGuard;
