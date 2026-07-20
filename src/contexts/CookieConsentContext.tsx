import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  applyCookieConsentDecision,
  getCookieConsentDecision,
  isPreferenceStorageAllowed,
  type CookieConsentDecision,
} from '@/lib/cookieConsent';

interface CookieConsentContextValue {
  decision: CookieConsentDecision | null;
  needsConsent: boolean;
  canUsePreferences: boolean;
  accept: () => void;
  reject: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

export const CookieConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [decision, setDecision] = useState<CookieConsentDecision | null>(() =>
    getCookieConsentDecision(),
  );

  const accept = useCallback(() => {
    applyCookieConsentDecision('accepted');
    setDecision('accepted');
  }, []);

  const reject = useCallback(() => {
    applyCookieConsentDecision('rejected');
    setDecision('rejected');
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      decision,
      needsConsent: decision === null,
      canUsePreferences: decision === 'accepted' && isPreferenceStorageAllowed(),
      accept,
      reject,
    }),
    [accept, decision, reject],
  );

  return (
    <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
  );
};

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return ctx;
}
