import { supabase } from '@/integrations/supabase/client';
import type { SessionData } from '@/types/session';

export const GOOGLE_WORKSPACE_MANAGE_DENIED_MESSAGE =
  'You must be an organization owner or admin to manage Google Workspace.';

export function canManageGoogleWorkspaceIntegration(
  userRole: string | null | undefined,
): boolean {
  return userRole === 'owner' || userRole === 'admin';
}

export function getOrganizationRoleFromSession(
  sessionData: SessionData | null | undefined,
  organizationId: string | null | undefined,
): string | undefined {
  if (!sessionData || !organizationId) {
    return undefined;
  }

  return sessionData.organizations.find((org) => org.id === organizationId)?.userRole;
}

export function resolveGoogleWorkspaceManageAccess(
  organizationId: string | null | undefined,
  sessionData: SessionData | null | undefined,
): boolean {
  return canManageGoogleWorkspaceIntegration(
    getOrganizationRoleFromSession(sessionData, organizationId),
  );
}

export async function assertCanManageGoogleWorkspaceIntegration(
  organizationId: string,
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to manage Google Workspace.');
  }

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!canManageGoogleWorkspaceIntegration(membership?.role)) {
    throw new Error(GOOGLE_WORKSPACE_MANAGE_DENIED_MESSAGE);
  }
}
