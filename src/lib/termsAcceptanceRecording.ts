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
 * Email-confirmation signups have no session at submit time; persist intent and record
 * evidence on the first session (see AuthProvider auth listener).
 */
export function schedulePendingTermsAcceptanceFlush(userIdAtEvent: string): void {
  if (!hasPendingTermsAcceptanceForUser(userIdAtEvent)) return;

  queueMicrotask(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session: liveSession } }) => {
        const uid = liveSession?.user?.id;
        if (!liveSession?.access_token || uid !== userIdAtEvent) return;
        if (!hasPendingTermsAcceptanceForUser(uid)) return;

        return recordTermsAcceptance(liveSession.access_token).then(ok => {
          if (ok) clearPendingTermsAcceptanceForUser(uid);
        });
      })
      .catch(err => {
        if (import.meta.env.DEV) {
          logger.warn('Deferred terms acceptance flush skipped', err);
        }
      });
  });
}
