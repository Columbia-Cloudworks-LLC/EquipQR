const STORAGE_PREFIX = 'equipqr-operator-checkin-token:';
export const OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT = 'equipqr-operator-checkin-token-changed';

export function getStoredOperatorCheckinToken(assignmentId: string): string | null {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${assignmentId}`);
  } catch {
    return null;
  }
}

export function storeOperatorCheckinToken(assignmentId: string, rawToken: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${assignmentId}`, rawToken);
    window.dispatchEvent(
      new CustomEvent(OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT, { detail: { assignmentId } }),
    );
  } catch {
    // Best-effort only — QR can still be regenerated via token rotation.
  }
}

export function clearStoredOperatorCheckinToken(assignmentId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${assignmentId}`);
    window.dispatchEvent(
      new CustomEvent(OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT, { detail: { assignmentId } }),
    );
  } catch {
    // ignore
  }
}

export function subscribeOperatorCheckinTokenChanges(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener(OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT, handler);
  return () => window.removeEventListener(OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT, handler);
}
