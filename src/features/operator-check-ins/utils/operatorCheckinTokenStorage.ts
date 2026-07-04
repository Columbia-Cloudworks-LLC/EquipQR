const STORAGE_PREFIX = 'equipqr-operator-checkin-token:';
export const OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT = 'equipqr-operator-checkin-token-changed';

function getTokenStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getStoredOperatorCheckinToken(assignmentId: string): string | null {
  const storage = getTokenStorage();
  if (!storage) return null;
  try {
    return storage.getItem(`${STORAGE_PREFIX}${assignmentId}`);
  } catch {
    return null;
  }
}

export function storeOperatorCheckinToken(assignmentId: string, rawToken: string): void {
  const storage = getTokenStorage();
  if (!storage) return;
  try {
    storage.setItem(`${STORAGE_PREFIX}${assignmentId}`, rawToken);
    window.dispatchEvent(
      new CustomEvent(OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT, { detail: { assignmentId } }),
    );
  } catch {
    // Best-effort only — QR can still be regenerated via token rotation.
  }
}

export function clearStoredOperatorCheckinToken(assignmentId: string): void {
  const storage = getTokenStorage();
  if (!storage) return;
  try {
    storage.removeItem(`${STORAGE_PREFIX}${assignmentId}`);
    window.dispatchEvent(
      new CustomEvent(OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT, { detail: { assignmentId } }),
    );
  } catch {
    // ignore
  }
}

export function subscribeOperatorCheckinTokenChanges(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => onChange();
  window.addEventListener(OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT, handler);
  return () => window.removeEventListener(OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT, handler);
}
