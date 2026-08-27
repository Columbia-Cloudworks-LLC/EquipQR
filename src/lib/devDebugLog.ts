export interface DevDebugLogPayload {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
  runId?: string;
}

export function writeDebugLog(payload: DevDebugLogPayload): void {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return;
  }

  try {
    const body = JSON.stringify(payload);

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/__cursor-debug-log', blob);
      return;
    }

    void fetch('/__cursor-debug-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    // Best-effort debug instrumentation only.
  }
}
