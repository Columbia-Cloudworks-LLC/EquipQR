import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  PRIVACY_VERSION_HASH,
  TERMS_VERSION_HASH,
} from '@/lib/legalPolicyVersions';
import { logger } from '@/utils/logger';

const storageKey = (userId: string) => `equipqr_pending_terms_acceptance:${userId}`;

export function markPendingTermsAcceptanceForUser(userId: string): void {
  try {
    localStorage.setItem(storageKey(userId), '1');
  } catch {
    // ignore quota / private mode
  }
}

export function clearPendingTermsAcceptanceForUser(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}

function hasPendingTermsAcceptanceForUser(userId: string): boolean {
  try {
    return localStorage.getItem(storageKey(userId)) === '1';
  } catch {
    return false;
  }
}

/** Sign-up stores acceptance intent in user_metadata so it survives cross-device email verification. */
function userMetadataIndicatesSignupTermsAccepted(user: User): boolean {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (!meta) return false;

  const accepted = meta.terms_accepted;
  const acceptedOk =
    accepted === true ||
    accepted === 'true' ||
    String(accepted).toLowerCase() === 'true';
  if (!acceptedOk) return false;

  const th = meta.terms_version_hash;
  const ph = meta.privacy_version_hash;
  return (
    typeof th === 'string' &&
    typeof ph === 'string' &&
    th === TERMS_VERSION_HASH &&
    ph === PRIVACY_VERSION_HASH
  );
}

function shouldAttemptTermsAcceptanceFlush(user: User): boolean {
  if (hasPendingTermsAcceptanceForUser(user.id)) return true;
  return userMetadataIndicatesSignupTermsAccepted(user);
}

async function userHasCurrentTermsAcceptanceRow(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('terms_acceptances')
    .select('id')
    .eq('user_id', userId)
    .eq('terms_version_hash', TERMS_VERSION_HASH)
    .eq('privacy_version_hash', PRIVACY_VERSION_HASH)
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error('Failed to check terms_acceptances row', error);
    return false;
  }
  return data != null;
}

export async function recordTermsAcceptance(accessToken: string): Promise<boolean> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/record-terms-acceptance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        terms_version_hash: TERMS_VERSION_HASH,
        privacy_version_hash: PRIVACY_VERSION_HASH,
      }),
    });

    const payload = await res.json().catch(() => ({}));
    return res.ok && payload?.success === true;
  } catch {
    return false;
  }
}

/**
 * Email-confirmation signups have no session at submit time; persist intent (localStorage +
 * user_metadata on sign-up) and record evidence on the first session (see AuthProvider auth listener).
 */
export function schedulePendingTermsAcceptanceFlush(user: User): void {
  if (!shouldAttemptTermsAcceptanceFlush(user)) return;

  const userIdAtEvent = user.id;

  queueMicrotask(() => {
    supabase.auth
      .getSession()
      .then(async ({ data: { session: liveSession } }) => {
        const uid = liveSession?.user?.id;
        if (!liveSession?.access_token || uid !== userIdAtEvent) return;

        const sessionUser = liveSession.user;
        if (!shouldAttemptTermsAcceptanceFlush(sessionUser)) return;

        const already = await userHasCurrentTermsAcceptanceRow(uid);
        if (already) {
          clearPendingTermsAcceptanceForUser(uid);
          return;
        }

        const ok = await recordTermsAcceptance(liveSession.access_token);
        if (ok) clearPendingTermsAcceptanceForUser(uid);
      })
      .catch(err => {
        logger.error('Deferred terms acceptance flush failed', err);
      });
  });
}
