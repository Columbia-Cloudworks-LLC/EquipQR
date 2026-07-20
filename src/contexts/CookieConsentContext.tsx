import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  applyCookieConsentDecision,
  getCookieConsentDecision,
  isCookieConsentDecision,
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

  useEffect(() => {
    const syncFromStorage = () => {
      setDecision(getCookieConsentDecision());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== COOKIE_CONSENT_STORAGE_KEY) return;
      const next = event.newValue;
      setDecision(isCookieConsentDecision(next) ? next : getCookieConsentDecision());
    };
    window.addEventListener('storage', onStorage);
    // Same-tab clears (e.g. DevTools) won't fire `storage`; focus re-syncs.
    window.addEventListener('focus', syncFromStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', syncFromStorage);
    };
  }, []);

  const accept = useCallback(() => {
    if (!applyCookieConsentDecision('accepted')) {
      toast.error('Could not save your cookie preference. Please try again.');
      return;
    }
    setDecision('accepted');
  }, []);

  const reject = useCallback(() => {
    if (!applyCookieConsentDecision('rejected')) {
      toast.error('Could not save your cookie preference. Please try again.');
      return;
    }
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
