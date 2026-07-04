const tokenCache = new Map<string, string>();
export const OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT = 'equipqr-operator-checkin-token-changed';

export function getStoredOperatorCheckinToken(assignmentId: string): string | null {
  return tokenCache.get(assignmentId) ?? null;
}

export function storeOperatorCheckinToken(assignmentId: string, rawToken: string): void {
  tokenCache.set(assignmentId, rawToken);
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT, { detail: { assignmentId } }),
  );
}

export function clearStoredOperatorCheckinToken(assignmentId: string): void {
  tokenCache.delete(assignmentId);
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT, { detail: { assignmentId } }),
  );
}

export function subscribeOperatorCheckinTokenChanges(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => onChange();
  window.addEventListener(OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT, handler);
  return () => window.removeEventListener(OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT, handler);
}
