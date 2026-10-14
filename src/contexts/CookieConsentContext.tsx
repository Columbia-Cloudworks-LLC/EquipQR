import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  applyCookieConsentDecision,
  getCookieConsentDecision,
  isCookieConsentDecision,
  isPreferenceStorageAllowed,
  type CookieConsentDecision,
} from '@/lib/cookieConsent';
import {
  TELEMETRY_CONSENT_SCOPE_STORAGE_KEY,
  TELEMETRY_CONSENT_STORAGE_KEY,
  getTelemetryConsentDecision,
  isTelemetryAvailable,
  setTelemetryConsentDecision,
  type TelemetryConsentDecision,
} from '@/lib/telemetryConsent';

interface CookieConsentContextValue {
  decision: CookieConsentDecision | null;
  needsConsent: boolean;
  canUsePreferences: boolean;
  /** Opt-in analytics (Google Analytics 4) and session replay (Microsoft Clarity) decision. */
  telemetryDecision: TelemetryConsentDecision | null;
  /** True when a Clarity project id or GA4 measurement id is configured for this build. */
  telemetryAvailable: boolean;
  canUseTelemetry: boolean;
  /** Banner "Accept" / "Accept All": preferences + telemetry (when available). */
  accept: () => void;
  /** Banner "Reject" / "Essential Only": declines everything not yet accepted. */
  reject: () => void;
  /** Settings toggle — changes telemetry only. @returns true when persisted. */
  setTelemetryConsent: (enabled: boolean) => boolean;
}

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

export const CookieConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [decision, setDecision] = useState<CookieConsentDecision | null>(() =>
    getCookieConsentDecision(),
  );
  const [telemetryDecision, setTelemetryDecision] = useState<TelemetryConsentDecision | null>(
    () => getTelemetryConsentDecision(),
  );
  const telemetryAvailable = isTelemetryAvailable();

  useEffect(() => {
    const syncFromStorage = () => {
      setDecision(getCookieConsentDecision());
      setTelemetryDecision(getTelemetryConsentDecision());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null) {
        syncFromStorage();
        return;
      }
      if (event.key === COOKIE_CONSENT_STORAGE_KEY) {
        const next = event.newValue;
        setDecision(isCookieConsentDecision(next) ? next : getCookieConsentDecision());
      } else if (
        event.key === TELEMETRY_CONSENT_STORAGE_KEY ||
        event.key === TELEMETRY_CONSENT_SCOPE_STORAGE_KEY
      ) {
        // Re-read both keys: an acceptance only counts with a covering scope.
        setTelemetryDecision(getTelemetryConsentDecision());
      }
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
    // Only the first-visit notice decides preference storage. A user who already
    // answered it (Accept or Reject) and is now asked only about diagnostics
    // keeps that earlier choice.
    if (decision === null) {
      if (!applyCookieConsentDecision('accepted')) {
        toast.error('Could not save your cookie preference. Please try again.');
        return;
      }
      setDecision('accepted');
    }
    if (telemetryAvailable) {
      if (!setTelemetryConsentDecision('accepted')) {
        toast.error('Could not save your diagnostics preference. Please try again.');
        return;
      }
      setTelemetryDecision('accepted');
    }
  }, [decision, telemetryAvailable]);

  const reject = useCallback(() => {
    // Same rule as accept: an earlier preference choice is never changed here.
    if (decision === null) {
      if (!applyCookieConsentDecision('rejected')) {
        toast.error('Could not save your cookie preference. Please try again.');
        return;
      }
      setDecision('rejected');
    }
    if (telemetryAvailable) {
      if (!setTelemetryConsentDecision('rejected')) {
        toast.error('Could not save your diagnostics preference. Please try again.');
        return;
      }
      setTelemetryDecision('rejected');
    }
  }, [decision, telemetryAvailable]);

  const setTelemetryConsent = useCallback((enabled: boolean) => {
    const next: TelemetryConsentDecision = enabled ? 'accepted' : 'rejected';
    if (!setTelemetryConsentDecision(next)) {
      toast.error('Could not save your diagnostics preference. Please try again.');
      return false;
    }
    setTelemetryDecision(next);
    return true;
  }, []);

  // Prefer React `decision` as the sole gate — re-reading storage inside the
  // memo could disagree with state after same-tab clears until focus sync.
  const value = useMemo<CookieConsentContextValue>(
    () => ({
      decision,
      needsConsent: decision === null || (telemetryAvailable && telemetryDecision === null),
      canUsePreferences: decision === 'accepted',
      telemetryDecision,
      telemetryAvailable,
      canUseTelemetry: telemetryAvailable && telemetryDecision === 'accepted',
      accept,
      reject,
      setTelemetryConsent,
    }),
    [accept, decision, reject, setTelemetryConsent, telemetryAvailable, telemetryDecision],
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

/**
 * Runs `onAllowed` when preference storage becomes allowed mid-session
 * (Accept). Does not re-run on mount when consent was already accepted —
 * mount-time loaders should keep using their existing initializers.
 *
 * Safe outside CookieConsentProvider (falls back to storage + consent event).
 */
export function useWhenPreferenceStorageAllowed(onAllowed: () => void): void {
  const ctx = useContext(CookieConsentContext);
  const allowed = ctx?.canUsePreferences ?? isPreferenceStorageAllowed();
  const prevAllowed = useRef(allowed);
  const onAllowedRef = useRef(onAllowed);
  onAllowedRef.current = onAllowed;

  useEffect(() => {
    if (!prevAllowed.current && allowed) {
      onAllowedRef.current();
    }
    prevAllowed.current = allowed;
  }, [allowed]);

  useEffect(() => {
    if (ctx) return;
    const onChange = () => {
      const next = isPreferenceStorageAllowed();
      if (!prevAllowed.current && next) {
        onAllowedRef.current();
      }
      prevAllowed.current = next;
    };
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, onChange);
  }, [ctx]);
}
