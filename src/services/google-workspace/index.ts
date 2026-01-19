import { supabase } from '@/integrations/supabase/client';

export type WorkspaceDomainStatus = 'unclaimed' | 'pending' | 'approved' | 'claimed';

export interface WorkspaceOnboardingState {
  email: string | null;
  domain: string | null;
  domain_status: WorkspaceDomainStatus;
  claim_status: string | null;
  claim_id: string | null;
  workspace_org_id: string | null;
  is_workspace_connected: boolean | null;
}

export interface WorkspaceConnectionStatus {
  is_connected: boolean;
  domain: string | null;
  connected_at: string | null;
  access_token_expires_at: string | null;
  scopes: string | null;
}

export interface WorkspaceDirectoryUser {
  id: string;
  organization_id: string;
  google_user_id: string;
  primary_email: string;
  full_name: string | null;
  given_name: string | null;
  family_name: string | null;
  suspended: boolean;
  org_unit_path: string | null;
  last_synced_at: string | null;
}

export async function getWorkspaceOnboardingState(userId: string): Promise<WorkspaceOnboardingState | null> {
  const { data, error } = await supabase.rpc('get_workspace_onboarding_state', {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as WorkspaceOnboardingState;
}

export async function requestWorkspaceDomainClaim(domain: string): Promise<string> {
  const { data, error } = await supabase.rpc('request_workspace_domain_claim', {
    p_domain: domain,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function createWorkspaceOrganizationForDomain(
  domain: string,
  organizationName: string
): Promise<{ organization_id: string; domain: string }> {
  const { data, error } = await supabase.rpc('create_workspace_organization_for_domain', {
    p_domain: domain,
    p_organization_name: organizationName,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to create workspace organization');
  }

  return data[0];
}

export async function getGoogleWorkspaceConnectionStatus(
  organizationId: string
): Promise<WorkspaceConnectionStatus> {
  const { data, error } = await supabase.rpc('get_google_workspace_connection_status', {
    p_organization_id: organizationId,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return {
      is_connected: false,
      domain: null,
      connected_at: null,
      access_token_expires_at: null,
      scopes: null,
    };
  }

  return data[0] as WorkspaceConnectionStatus;
}

export async function syncGoogleWorkspaceUsers(organizationId: string): Promise<{ usersSynced: number }> {
  const { data, error } = await supabase.functions.invoke('google-workspace-sync-users', {
    body: { organizationId },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.success) {
    throw new Error('Failed to sync Google Workspace users');
  }

  return { usersSynced: data.usersSynced || 0 };
}

export async function listWorkspaceDirectoryUsers(organizationId: string): Promise<WorkspaceDirectoryUser[]> {
  const { data, error } = await supabase
    .from('google_workspace_directory_users')
    .select('*')
    .eq('organization_id', organizationId)
    .order('primary_email', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as WorkspaceDirectoryUser[];
}

export async function selectGoogleWorkspaceMembers(
  organizationId: string,
  emails: string[],
  adminEmails: string[]
): Promise<{ members_added: number; admin_applied: number; admin_pending: number }> {
  const { data, error } = await supabase.rpc('select_google_workspace_members', {
    p_organization_id: organizationId,
    p_emails: emails,
    p_admin_emails: adminEmails,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as {
    members_added: number;
    admin_applied: number;
    admin_pending: number;
  };
}

