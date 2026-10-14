import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import {
  captureLandingUtm,
  getGaMeasurementId,
  loadGoogleAnalytics,
  stopGoogleAnalytics,
  trackGooglePageView,
} from '@/lib/googleAnalytics';

/** Marketing and legal pages keep their real title; app titles may name customer data. */
const PUBLIC_TITLE_PATHS = /^\/($|features\/|privacy-policy|terms-of-service|right-to-repair|auth)/;

/**
 * Injects Google Analytics 4 only after explicit telemetry consent, sends a
 * sanitized page view per route, and stops it when consent is revoked.
 * Renders nothing.
 */
export function GoogleAnalyticsTelemetry() {
  const { canUseTelemetry } = useCookieConsent();
  const { pathname, search } = useLocation();
  const startedRef = useRef(false);
  // Read the query on path changes only; filter/tab query edits are not page views.
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    captureLandingUtm(search);
  }, [search]);

  useEffect(() => {
    const measurementId = getGaMeasurementId();
    if (canUseTelemetry && measurementId) {
      loadGoogleAnalytics(measurementId);
      startedRef.current = true;
    } else if (startedRef.current && measurementId) {
      stopGoogleAnalytics(measurementId);
      startedRef.current = false;
    }
  }, [canUseTelemetry]);

  useEffect(() => {
    if (!canUseTelemetry || !getGaMeasurementId()) return;
    const title = PUBLIC_TITLE_PATHS.test(pathname) ? document.title : 'EquipQR';
    trackGooglePageView(pathname, searchRef.current, title);
  }, [canUseTelemetry, pathname]);

  return null;
}
