import React, { useCallback } from 'react';
import { useMFA } from '@/hooks/useMFA';
import { useSimpleOrganizationSafe } from '@/hooks/useSimpleOrganization';
import { isMFAEnabled } from '@/lib/flags';
import { Loader2 } from 'lucide-react';
import MFAEnrollment from './MFAEnrollment';
import MFAVerification from './MFAVerification';
import { logger } from '@/utils/logger';

/** Organization roles that require MFA */
const MFA_REQUIRED_ROLES = ['owner', 'admin'] as const;

interface MFAEnforcementGuardProps {
  children: React.ReactNode;
}

/**
 * Route-level guard that enforces MFA for admin/owner roles.
 * Must be placed after SimpleOrganizationProvider in the component tree
 * (needs org role context).
 *
 * Behavior:
 * - If MFA feature flag is disabled → render children
 * - If user's org role is not owner/admin → render children
 * - If admin/owner and MFA not enrolled → show forced enrollment
 * - If admin/owner and MFA enrolled but session is AAL1 → show verification
 * - Otherwise → render children
 */
const MFAEnforcementGuard: React.FC<MFAEnforcementGuardProps> = ({ children }) => {
  const { isEnrolled, isVerified, isLoading: mfaLoading, refreshMFAStatus } = useMFA();
  const orgContext = useSimpleOrganizationSafe();

  // When MFA is disabled via feature flag, pass through
  if (!isMFAEnabled()) {
    return <>{children}</>;
  }

  const currentOrganization = orgContext?.currentOrganization;
  const orgLoading = orgContext?.isLoading ?? false;
  const userRole = currentOrganization?.userRole;

  // Check if this user's role requires MFA
  const roleMandatesMFA = MFA_REQUIRED_ROLES.includes(
    userRole as (typeof MFA_REQUIRED_ROLES)[number]
  );

  // Show loading while org context or MFA status is being determined.
  // This prevents a brief window where admin/owner routes render before
  // the role is known and MFA can be enforced.
  if (orgLoading || mfaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div role="status" aria-label="Checking security requirements" className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Verifying security requirements...</p>
        </div>
      </div>
    );
  }

  // If role doesn't require MFA, pass through
  if (!roleMandatesMFA) {
    return <>{children}</>;
  }

  // Admin/Owner without MFA enrolled → force enrollment
  if (!isEnrolled) {
    return (
      <MFAEnforcementWrapper>
        <MFAEnrollment
          onComplete={() => {
            refreshMFAStatus();
          }}
          isRequired={true}
        />
      </MFAEnforcementWrapper>
    );
  }

  // MFA enrolled but session not at AAL2 → require verification
  if (!isVerified) {
    return (
      <MFAEnforcementWrapper>
        <MFAVerificationWrapper />
      </MFAEnforcementWrapper>
    );
  }

  // All checks passed
  return <>{children}</>;
};

/**
 * Wrapper layout for MFA enforcement screens.
 */
const MFAEnforcementWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="w-full max-w-md rounded-lg border bg-card shadow-sm">
      {children}
    </div>
  </div>
);

/**
 * MFA verification wrapper that handles the success/error callbacks
 * within the enforcement guard context.
 */
const MFAVerificationWrapper: React.FC = () => {
  const { refreshMFAStatus } = useMFA();

  const handleSuccess = useCallback(() => {
    refreshMFAStatus();
  }, [refreshMFAStatus]);

  const handleError = useCallback((errorMsg: string) => {
    logger.error('MFA enforcement verification failed', { error: errorMsg });
  }, []);

  return (
    <MFAVerification
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
};

export default MFAEnforcementGuard;
