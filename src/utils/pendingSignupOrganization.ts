import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const PENDING_SIGNUP_ORGANIZATION_STORAGE_KEY = 'pendingSignupOrganizationName';
export const DEFAULT_PERSONAL_ORGANIZATION_NAME = 'My Organization';
export const PENDING_SIGNUP_ORGANIZATION_MAX_AGE_MS = 15 * 60 * 1000;

export type PendingSignupApplyUser = {
  id: string;
  created_at?: string | null;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
};

type PendingSignupOrganizationRecord = {
  name: string;
  startedAt: number;
};

function isGoogleAuthUser(user: PendingSignupApplyUser): boolean {
  if (user.app_metadata?.provider === 'google') {
    return true;
  }
  return user.app_metadata?.providers?.includes('google') === true;
}

function isRecentAuthUser(createdAt: string | null | undefined, now = Date.now()): boolean {
  const createdMs = Date.parse(createdAt ?? '');
  return Number.isFinite(createdMs) && now - createdMs <= PENDING_SIGNUP_ORGANIZATION_MAX_AGE_MS;
}

function readPendingRecord(now = Date.now()): PendingSignupOrganizationRecord | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_ORGANIZATION_STORAGE_KEY)?.trim();
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as { name?: unknown; startedAt?: unknown };
      if (typeof parsed.name === 'string' && typeof parsed.startedAt === 'number') {
        const name = parsed.name.trim();
        if (!name) {
          return null;
        }
        if (now - parsed.startedAt > PENDING_SIGNUP_ORGANIZATION_MAX_AGE_MS) {
          sessionStorage.removeItem(PENDING_SIGNUP_ORGANIZATION_STORAGE_KEY);
          return null;
        }
        return { name, startedAt: parsed.startedAt };
      }
    } catch {
      // Earlier commits stored a plain name string.
    }

    return { name: raw, startedAt: now };
  } catch {
    return null;
  }
}

export function getPendingSignupOrganizationName(): string | null {
  return readPendingRecord()?.name ?? null;
}

export function setPendingSignupOrganizationName(organizationName: string): void {
  const trimmed = organizationName.trim();
  try {
    if (trimmed) {
      const record: PendingSignupOrganizationRecord = {
        name: trimmed,
        startedAt: Date.now(),
      };
      sessionStorage.setItem(PENDING_SIGNUP_ORGANIZATION_STORAGE_KEY, JSON.stringify(record));
      return;
    }
    sessionStorage.removeItem(PENDING_SIGNUP_ORGANIZATION_STORAGE_KEY);
  } catch {
    return;
  }
}

export function clearPendingSignupOrganizationName(): void {
  try {
    sessionStorage.removeItem(PENDING_SIGNUP_ORGANIZATION_STORAGE_KEY);
  } catch {
    return;
  }
}

export async function applyPendingSignupOrganizationName(
  user: PendingSignupApplyUser,
): Promise<void> {
  const pending = readPendingRecord();
  if (!pending) {
    return;
  }

  if (!isGoogleAuthUser(user) || !isRecentAuthUser(user.created_at)) {
    clearPendingSignupOrganizationName();
    return;
  }

  const { data: personalOrg, error: personalOrgError } = await supabase
    .from('personal_organizations')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (personalOrgError || !personalOrg?.organization_id) {
    return;
  }

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id, name, created_at')
    .eq('id', personalOrg.organization_id)
    .maybeSingle();

  if (organizationError || !organization) {
    return;
  }

  if (organization.name !== DEFAULT_PERSONAL_ORGANIZATION_NAME) {
    clearPendingSignupOrganizationName();
    return;
  }

  const createdAt = Date.parse(organization.created_at);
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > PENDING_SIGNUP_ORGANIZATION_MAX_AGE_MS) {
    clearPendingSignupOrganizationName();
    return;
  }

  const { data: updated, error: updateError } = await supabase
    .from('organizations')
    .update({
      name: pending.name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organization.id)
    .select('id')
    .maybeSingle();

  if (updateError || !updated) {
    logger.warn('Failed to apply pending Google signup organization name', updateError);
    return;
  }

  clearPendingSignupOrganizationName();
}
