import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Landing from '@/pages/Landing';
import { useWorkspaceOnboardingState } from '@/hooks/useWorkspaceOnboarding';

const SmartLanding = () => {
  const { user, isLoading } = useAuth();
  const { data: onboardingState, isLoading: onboardingLoading } = useWorkspaceOnboardingState();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is authenticated and not loading, redirect to dashboard
    if (!isLoading && !onboardingLoading && user) {
      const provider = (user.app_metadata as { provider?: string })?.provider;
      const providers = (user.app_metadata as { providers?: string[] })?.providers || [];
      const isGoogleUser = provider === 'google' || providers.includes('google');
      const domain = onboardingState?.domain;
      const isConsumerDomain = domain === 'gmail.com' || domain === 'googlemail.com';
      const needsOnboarding = Boolean(
        isGoogleUser &&
        onboardingState &&
        !isConsumerDomain &&
        (
          onboardingState.domain_status !== 'claimed' ||
          (onboardingState.domain_status === 'claimed' && onboardingState.is_workspace_connected === false)
        )
      );

      navigate(needsOnboarding ? '/dashboard/onboarding/workspace' : '/dashboard', { replace: true });
    }
  }, [user, isLoading, onboardingLoading, onboardingState, navigate]);

  // Show loading state or nothing while checking auth
  if (isLoading || onboardingLoading) {
    return null;
  }

  // Show landing page only for unauthenticated users
  if (!user) {
    return <Landing />;
  }

  // Return null while redirecting authenticated users
  return null;
};

export default SmartLanding;