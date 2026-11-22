import { supabase } from '@/integrations/supabase/client';
import { isAuthConnectivityFailure, readStoredAuthSession } from '@/lib/offlineSession';

export interface AuthClaims {
  sub: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  [claim: string]: unknown;
}

function extractAuthClaims(data: unknown): AuthClaims | null {
  const claims = (data as { claims?: Partial<AuthClaims> } | null | undefined)?.claims;
  if (!claims || typeof claims.sub !== 'string' || claims.sub.length === 0) {
    return null;
  }

  return claims as AuthClaims;
}

/** Identity from the session stored on this device, for when Auth is unreachable. */
function claimsFromStoredSession(): AuthClaims | null {
  const user = readStoredAuthSession()?.user;
  if (!user) return null;
  return {
    sub: user.id,
    email: user.email,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
  };
}

/**
 * Return locally verified Supabase Auth JWT claims for identity-only client checks.
 *
 * EquipQR's Supabase project uses asymmetric ES256 signing, so supabase-js can
 * verify these claims locally from the cached JWKS instead of round-tripping to
 * the Auth server like getUser() does.
 *
 * With no connection the signing keys cannot be downloaded and an expired
 * token cannot be refreshed, so verification fails even though the user is
 * signed in. In that case only, fall back to the identity in the stored
 * session so offline screens and queued changes keep working; the server
 * re-checks everything when the changes sync.
 */
export async function getAuthClaims(): Promise<AuthClaims | null> {
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (!error) return extractAuthClaims(data);
    return isAuthConnectivityFailure(error) ? claimsFromStoredSession() : null;
  } catch (error) {
    if (isAuthConnectivityFailure(error)) return claimsFromStoredSession();
    throw error;
  }
}

export async function requireAuthClaims(message = 'User not authenticated'): Promise<AuthClaims> {
  const claims = await getAuthClaims();
  if (!claims) {
    throw new Error(message);
  }
  return claims;
}

export async function requireAuthUserIdFromClaims(message = 'User not authenticated'): Promise<string> {
  const claims = await requireAuthClaims(message);
  return claims.sub;
}
