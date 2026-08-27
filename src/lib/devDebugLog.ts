export interface DevDebugLogPayload {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
  runId?: string;
}

export function writeDebugLog(payload: DevDebugLogPayload): void {
  if (typeof window === 'undefined' || !import.meta.env.DEV || import.meta.env.MODE === 'test') {
    return;
  }

  try {
    const body = JSON.stringify(payload);
    const endpoint = new URL('/__cursor-debug-log', window.location.origin).toString();

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
      return;
    }

    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    // Best-effort debug instrumentation only.
  }
}
