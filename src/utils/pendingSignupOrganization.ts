import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const PENDING_SIGNUP_ORGANIZATION_STORAGE_KEY = 'pendingSignupOrganizationName';
export const DEFAULT_PERSONAL_ORGANIZATION_NAME = 'My Organization';
export const PENDING_SIGNUP_ORGANIZATION_MAX_AGE_MS = 15 * 60 * 1000;

export function getPendingSignupOrganizationName(): string | null {
  try {
    const value = sessionStorage.getItem(PENDING_SIGNUP_ORGANIZATION_STORAGE_KEY)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

export function setPendingSignupOrganizationName(organizationName: string): void {
  const trimmed = organizationName.trim();
  try {
    if (trimmed) {
      sessionStorage.setItem(PENDING_SIGNUP_ORGANIZATION_STORAGE_KEY, trimmed);
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

export async function applyPendingSignupOrganizationName(userId: string): Promise<void> {
  const organizationName = getPendingSignupOrganizationName();
  if (!organizationName) {
    return;
  }

  const { data: personalOrg, error: personalOrgError } = await supabase
    .from('personal_organizations')
    .select('organization_id')
    .eq('user_id', userId)
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

  const { error: updateError } = await supabase
    .from('organizations')
    .update({
      name: organizationName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organization.id);

  if (updateError) {
    logger.warn('Failed to apply pending Google signup organization name', updateError);
    return;
  }

  clearPendingSignupOrganizationName();
}
