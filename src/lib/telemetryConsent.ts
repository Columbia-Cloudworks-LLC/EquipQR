/**
 * Opt-in analytics and diagnostic telemetry consent (Google Analytics 4 and
 * Microsoft Clarity session replay share one decision).
 *
 * Stored separately from the cookie / preference decision so a user can turn
 * diagnostics on or off from Settings without touching UI preference storage.
 * Neither script may be injected unless this decision is `accepted`.
 */

import { getGaMeasurementId } from '@/lib/googleAnalytics';

export const TELEMETRY_CONSENT_STORAGE_KEY = 'equipqr_telemetry_consent';

export type TelemetryConsentDecision = 'accepted' | 'rejected';

export function isTelemetryConsentDecision(value: unknown): value is TelemetryConsentDecision {
  return value === 'accepted' || value === 'rejected';
}

/** Clarity project id from build-time env; telemetry is unavailable without it. */
export function getClarityProjectId(): string | null {
  const raw = import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Plain-language list of the configured telemetry tools for consent copy,
 * e.g. "Google Analytics to see how visitors find and use EquipQR and Microsoft
 * Clarity for …". Empty string when neither is configured.
 */
export function describeTelemetryProviders(): string {
  const parts: string[] = [];
  if (getGaMeasurementId() !== null) {
    parts.push('Google Analytics to see how visitors find and use EquipQR');
  }
  if (getClarityProjectId() !== null) {
    parts.push(
      'Microsoft Clarity for masked session replays and heatmaps that help us fix interface problems',
    );
  }
  return parts.join(' and ');
}

/** True when Clarity and/or Google Analytics is configured for this build. */
export function isTelemetryAvailable(): boolean {
  return getClarityProjectId() !== null || getGaMeasurementId() !== null;
}

function getLocalStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return globalThis.localStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getTelemetryConsentDecision(): TelemetryConsentDecision | null {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(TELEMETRY_CONSENT_STORAGE_KEY);
    return isTelemetryConsentDecision(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** @returns true when the decision was persisted successfully. */
export function setTelemetryConsentDecision(decision: TelemetryConsentDecision): boolean {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    storage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, decision);
    return storage.getItem(TELEMETRY_CONSENT_STORAGE_KEY) === decision;
  } catch {
    return false;
  }
}
