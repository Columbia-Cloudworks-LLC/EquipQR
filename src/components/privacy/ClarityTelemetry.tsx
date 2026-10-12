import { useEffect, useRef } from 'react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { loadClarity, stopClarity } from '@/lib/clarity';
import { getClarityProjectId } from '@/lib/telemetryConsent';

/**
 * Injects Microsoft Clarity only after explicit telemetry consent, and stops
 * it immediately when consent is revoked (banner or Settings toggle).
 * Renders nothing.
 */
export function ClarityTelemetry() {
  const { canUseTelemetry } = useCookieConsent();
  const startedRef = useRef(false);

  useEffect(() => {
    const projectId = getClarityProjectId();
    if (canUseTelemetry && projectId) {
      loadClarity(projectId);
      startedRef.current = true;
    } else if (startedRef.current) {
      stopClarity();
      startedRef.current = false;
    }
  }, [canUseTelemetry]);

  return null;
}
