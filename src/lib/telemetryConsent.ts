/**
 * Opt-in diagnostic telemetry (Microsoft Clarity session replay) consent.
 *
 * Stored separately from the cookie / preference decision so a user can turn
 * diagnostics on or off from Settings without touching UI preference storage.
 * The Clarity script must never be injected unless this decision is `accepted`.
 */

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

export function isTelemetryAvailable(): boolean {
  return getClarityProjectId() !== null;
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
