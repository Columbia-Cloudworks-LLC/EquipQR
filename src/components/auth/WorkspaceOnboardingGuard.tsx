import React from 'react';

interface WorkspaceOnboardingGuardProps {
  children: React.ReactNode;
}

/**
 * Guard component for workspace onboarding.
 * 
 * NOTE: Workspace onboarding is now voluntary. Users can connect Google Workspace
 * from the Organization Settings page. This guard no longer forces redirects.
 */
const WorkspaceOnboardingGuard: React.FC<WorkspaceOnboardingGuardProps> = ({ children }) => {
  // Simply allow all navigation - workspace onboarding is voluntary
  // Users can connect Google Workspace from Organization Settings if they choose
  return <>{children}</>;
};

export default WorkspaceOnboardingGuard;
