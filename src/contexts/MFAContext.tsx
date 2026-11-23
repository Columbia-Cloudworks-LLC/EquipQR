
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { Factor, AuthenticatorAssuranceLevels } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isMFAEnabled } from '@/lib/flags';
import { logger } from '@/utils/logger';
import { isAuthConnectivityFailure, sessionIdFromAccessToken } from '@/lib/offlineSession';

interface EnrollTOTPResult {
  qrCode: string;
  secret: string;
  factorId: string;
}

export interface MFAContextType {
  /** All enrolled TOTP factors */
  factors: Factor[];
  /** Current authenticator assurance level (aal1 or aal2) */
  currentLevel: AuthenticatorAssuranceLevels | null;
  /** Target authenticator assurance level */
  nextLevel: AuthenticatorAssuranceLevels | null;
  /** Whether the user has at least one verified TOTP factor */
  isEnrolled: boolean;
  /** Whether the current session is at AAL2 */
  isVerified: boolean;
  /** Whether the user needs to verify MFA (enrolled but at AAL1) */
  needsVerification: boolean;
  /** Whether MFA status is still loading */
  isLoading: boolean;
  /** Enroll a new TOTP factor — returns QR code, secret, and factor ID */
  enrollTOTP: () => Promise<EnrollTOTPResult | null>;
  /** Verify a TOTP code for a specific factor (challenge + verify) */
  verifyTOTP: (factorId: string, code: string) => Promise<{ error: Error | null }>;
  /** Remove an enrolled factor */
  unenrollFactor: (factorId: string) => Promise<{ error: Error | null }>;
  /** Challenge and verify using the first available verified factor */
  challengeAndVerify: (code: string) => Promise<{ error: Error | null }>;
  /** Refresh MFA status from Supabase */
  refreshMFAStatus: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const MFAContext = createContext<MFAContextType | undefined>(undefined);

/**
 * No-op MFA context value used when MFA feature flag is disabled.
 * All methods are safe no-ops that return empty/null values.
 */
const DISABLED_MFA_CONTEXT: MFAContextType = {
  factors: [],
  currentLevel: null,
  nextLevel: null,
  isEnrolled: false,
  isVerified: false,
  needsVerification: false,
  isLoading: false,
  enrollTOTP: async () => null,
  verifyTOTP: async () => ({ error: new Error('MFA is not enabled') }),
  unenrollFactor: async () => ({ error: new Error('MFA is not enabled') }),
  challengeAndVerify: async () => ({ error: new Error('MFA is not enabled') }),
  refreshMFAStatus: async () => { /* no-op */ },
};

export const MFAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // When MFA is disabled, provide a static no-op context
  if (!isMFAEnabled()) {
    return (
      <MFAContext.Provider value={DISABLED_MFA_CONTEXT}>
        {children}
      </MFAContext.Provider>
    );
  }

  return <MFAProviderInner>{children}</MFAProviderInner>;
};

interface RememberedMFAStatus {
  /**
   * The sign-in this status was confirmed for. A verified level belongs to
   * one session: a later password-only sign-in must not inherit it.
   */
  sessionId: string | null;
  factors: Factor[];
  currentLevel: AuthenticatorAssuranceLevels | null;
  nextLevel: AuthenticatorAssuranceLevels | null;
}

const mfaStatusStorageKey = (userId: string) => `equipqr_mfa_status_${userId}`;

/**
 * Last MFA status the server confirmed for this user on this device. Used
 * only when the status cannot be checked because there is no connection, so
 * an owner or admin who already passed MFA is not shown the enrollment screen
 * (which cannot work offline) and locked out of their cached data.
 */
function rememberMFAStatus(userId: string, status: RememberedMFAStatus): void {
  try {
    localStorage.setItem(mfaStatusStorageKey(userId), JSON.stringify(status));
  } catch {
    // Best-effort.
  }
}

function recallMFAStatus(userId: string): RememberedMFAStatus | null {
  try {
    const raw = localStorage.getItem(mfaStatusStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedMFAStatus> | null;
    if (!parsed || !Array.isArray(parsed.factors)) return null;
    return {
      sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : null,
      factors: parsed.factors,
      currentLevel: parsed.currentLevel ?? null,
      nextLevel: parsed.nextLevel ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Inner MFA provider that actually manages state. Only rendered when MFA is enabled.
 * Separated to avoid calling hooks conditionally.
 */
const MFAProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const sessionId = sessionIdFromAccessToken(session?.access_token);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [currentLevel, setCurrentLevel] = useState<AuthenticatorAssuranceLevels | null>(null);
  const [nextLevel, setNextLevel] = useState<AuthenticatorAssuranceLevels | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derived values (rule 5.1 — compute during render, not stored as state)
  const isEnrolled = factors.some((f) => f.status === 'verified');
  const isVerified = currentLevel === 'aal2';
  const needsVerification = isEnrolled && currentLevel === 'aal1' && nextLevel === 'aal2';

  const refreshMFAStatus = useCallback(async () => {
    if (!user) {
      setFactors([]);
      setCurrentLevel(null);
      setNextLevel(null);
      setIsLoading(false);
      return;
    }

    try {
      // Parallel fetch (rule 1.4 — no sequential waterfall)
      const [aalResult, factorsResult] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);

      const aalUnreachable = !!aalResult.error && isAuthConnectivityFailure(aalResult.error);
      const factorsUnreachable =
        !!factorsResult.error && isAuthConnectivityFailure(factorsResult.error);
      const remembered =
        aalUnreachable || factorsUnreachable ? recallMFAStatus(user.id) : null;

      // Factors belong to the user, so the remembered list is safe to reuse
      // when they cannot be listed.
      const resolvedFactors = factorsResult.data
        ? factorsResult.data.totp ?? []
        : factorsUnreachable && remembered
          ? remembered.factors
          : null;
      if (resolvedFactors) setFactors(resolvedFactors);

      if (aalResult.data) {
        // The level this session actually has always wins over anything remembered.
        setCurrentLevel(aalResult.data.currentLevel);
        setNextLevel(aalResult.data.nextLevel);
      } else if (aalUnreachable && remembered) {
        if (remembered.sessionId !== null && remembered.sessionId === sessionId) {
          setCurrentLevel(remembered.currentLevel);
          setNextLevel(remembered.nextLevel);
        } else if (remembered.factors.some((factor) => factor.status === 'verified')) {
          // A different sign-in than the one that was verified: ask again.
          setCurrentLevel('aal1');
          setNextLevel('aal2');
        }
      }

      if (aalResult.data && factorsResult.data) {
        rememberMFAStatus(user.id, {
          sessionId,
          factors: factorsResult.data.totp ?? [],
          currentLevel: aalResult.data.currentLevel,
          nextLevel: aalResult.data.nextLevel,
        });
      }
    } catch (error) {
      logger.error('Failed to refresh MFA status', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, sessionId]);

  // Refresh MFA status when user changes (rule 5.6 — narrow dep on user?.id)
  const userId = user?.id;
  useEffect(() => {
    if (userId) {
      refreshMFAStatus();
    } else {
      setFactors([]);
      setCurrentLevel(null);
      setNextLevel(null);
      setIsLoading(false);
    }
  }, [userId, refreshMFAStatus]);

  // Listen for auth state changes to keep MFA status in sync
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'MFA_CHALLENGE_VERIFIED') {
        refreshMFAStatus();
      }
      if (event === 'SIGNED_OUT') {
        setFactors([]);
        setCurrentLevel(null);
        setNextLevel(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshMFAStatus]);

  const enrollTOTP = useCallback(async (): Promise<EnrollTOTPResult | null> => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) throw error;

      return {
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        factorId: data.id,
      };
    } catch (error) {
      logger.error('MFA enrollment error', error);
      return null;
    }
  }, []);

  const verifyTOTP = useCallback(async (factorId: string, code: string): Promise<{ error: Error | null }> => {
    try {
      // Challenge and verify are dependent — must be sequential
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      await refreshMFAStatus();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [refreshMFAStatus]);

  const unenrollFactor = useCallback(async (factorId: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      await refreshMFAStatus();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [refreshMFAStatus]);

  const challengeAndVerify = useCallback(async (code: string): Promise<{ error: Error | null }> => {
    const verifiedFactor = factors.find((f) => f.status === 'verified');
    if (!verifiedFactor) {
      return { error: new Error('No verified MFA factor found') };
    }

    return verifyTOTP(verifiedFactor.id, code);
  }, [factors, verifyTOTP]);

  return (
    <MFAContext.Provider
      value={{
        factors,
        currentLevel,
        nextLevel,
        isEnrolled,
        isVerified,
        needsVerification,
        isLoading,
        enrollTOTP,
        verifyTOTP,
        unenrollFactor,
        challengeAndVerify,
        refreshMFAStatus,
      }}
    >
      {children}
    </MFAContext.Provider>
  );
};
