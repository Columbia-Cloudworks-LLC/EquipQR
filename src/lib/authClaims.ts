import { supabase } from '@/integrations/supabase/client';

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

/**
 * Return locally verified Supabase Auth JWT claims for identity-only client checks.
 *
 * EquipQR's Supabase project uses asymmetric ES256 signing, so supabase-js can
 * verify these claims locally from the cached JWKS instead of round-tripping to
 * the Auth server like getUser() does.
 */
export async function getAuthClaims(): Promise<AuthClaims | null> {
  const { data, error } = await supabase.auth.getClaims();
  if (error) return null;
  return extractAuthClaims(data);
}

export async function requireAuthClaims(message = 'User not authenticated'): Promise<AuthClaims> {
  const claims = await getAuthClaims();
  if (!claims) {
    throw new Error(message);
  }
  return claims;
}

export async function getAuthUserIdFromClaims(): Promise<string | null> {
  const claims = await getAuthClaims();
  return claims?.sub ?? null;
}

export async function requireAuthUserIdFromClaims(message = 'User not authenticated'): Promise<string> {
  const claims = await requireAuthClaims(message);
  return claims.sub;
}
