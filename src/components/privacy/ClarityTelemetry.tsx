import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { isClarityLoaded, loadClarity, stopClarity } from '@/lib/clarity';
import { isTokenBearingPath } from '@/lib/googleAnalytics';
import { getClarityProjectId } from '@/lib/telemetryConsent';

/**
 * Injects Microsoft Clarity only after explicit telemetry consent on non-token
 * routes, and stops it immediately when consent is revoked (banner or Settings
 * toggle) or when entering a token-bearing route. Renders nothing.
 */
export function ClarityTelemetry() {
  const { canUseTelemetry } = useCookieConsent();
  const { pathname } = useLocation();
  const startedRef = useRef(false);
  const onTokenRoute =
    isTokenBearingPath(pathname) ||
    (typeof window !== 'undefined' && isTokenBearingPath(window.location.pathname));

  useLayoutEffect(() => {
    if ((!canUseTelemetry || onTokenRoute) && (startedRef.current || isClarityLoaded())) {
      stopClarity();
      startedRef.current = false;
    }
  }, [canUseTelemetry, onTokenRoute]);

  useEffect(() => {
    const projectId = getClarityProjectId();
    if (canUseTelemetry && projectId && !onTokenRoute) {
      loadClarity(projectId);
      startedRef.current = isClarityLoaded();
    } else if (startedRef.current || isClarityLoaded()) {
      stopClarity();
      startedRef.current = false;
    }
  }, [canUseTelemetry, onTokenRoute]);

  return null;
}
