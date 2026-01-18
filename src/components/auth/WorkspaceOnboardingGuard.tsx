import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceOnboardingState } from '@/hooks/useWorkspaceOnboarding';
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
  const { data: onboardingState, isLoading: onboardingLoading } = useWorkspaceOnboardingState();
  const location = useLocation();

  // Don't guard the onboarding route itself
  const isOnboardingRoute = location.pathname === '/dashboard/onboarding/workspace';

  // Wait for auth and onboarding state to load
  if (authLoading || onboardingLoading) {
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

  // Determine if user is a Google user
  const provider = (user.app_metadata as { provider?: string })?.provider;
  const providers = (user.app_metadata as { providers?: string[] })?.providers || [];
  const isGoogleUser = provider === 'google' || providers.includes('google');

  // Non-Google users don't need workspace onboarding
  if (!isGoogleUser) {
    return <>{children}</>;
  }

  // Check if onboarding is needed
  const domain = onboardingState?.domain;
  const isConsumerDomain = domain === 'gmail.com' || domain === 'googlemail.com';

  // Consumer domain users (gmail.com, etc.) don't need workspace onboarding
  if (isConsumerDomain) {
    return <>{children}</>;
  }

  // Check if domain is claimed and workspace is connected
  const needsOnboarding = Boolean(
    onboardingState &&
    (
      onboardingState.domain_status !== 'claimed' ||
      (onboardingState.domain_status === 'claimed' && onboardingState.is_workspace_connected === false)
    )
  );

  if (needsOnboarding) {
    return <Navigate to="/dashboard/onboarding/workspace" replace />;
  }

  return <>{children}</>;
};

export default WorkspaceOnboardingGuard;
