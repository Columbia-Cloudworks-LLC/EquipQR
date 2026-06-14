import { supabase } from '@/integrations/supabase/client';
import {
  throwGoogleWorkspaceInvokeError,
  throwGoogleWorkspaceResponseError,
} from '@/services/google-workspace/invokeError';

export type WorkspaceDomainStatus = 'unclaimed' | 'claimed';

export interface WorkspaceOnboardingState {
  email: string | null;
  domain: string | null;
  domain_status: WorkspaceDomainStatus;
  workspace_org_id: string | null;
  is_workspace_connected: boolean | null;
  has_workspace_membership?: boolean;
  has_pending_invitation?: boolean;
  has_pending_claim?: boolean;
  has_other_organization_membership?: boolean;
}

export interface WorkspaceConnectionStatus {
  is_connected: boolean;
  domain: string | null;
  connected_at: string | null;
  access_token_expires_at: string | null;
  scopes: string | null;
  connected_email: string | null;
}

export type GoogleExportDocumentType = 'work-orders-internal-packet';
export type GoogleExportSelectionKind = 'folder' | 'shared_drive';

export interface GoogleDriveDestinationBrowseItem {
  id: string;
  name: string;
  kind: 'shared_drive' | 'folder';
  driveId: string | null;
  selectable: boolean;
  parentId: string | null;
}

export interface GoogleDriveDestinationBrowseResponse {
  items: GoogleDriveDestinationBrowseItem[];
  parentId: string | null;
  driveId: string | null;
  workspaceDomain: string;
}

export interface GoogleExportDestination {
  id: string;
  organization_id: string;
  document_type: GoogleExportDocumentType;
  selection_kind: GoogleExportSelectionKind;
  drive_id: string | null;
  parent_id: string;
  display_name: string;
  web_view_link: string | null;
  configured_by: string | null;
  folder_by_team: boolean;
  folder_by_equipment: boolean;
  created_at: string;
  updated_at: string;
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
      connected_email: null,
    };
  }

  return data[0] as WorkspaceConnectionStatus;
}

export interface GoogleWorkspaceSyncResult {
  usersSynced: number;
  directoryMarkedSuspended: number;
  membersDeactivated: number;
  claimsRevoked: number;
}

export async function syncGoogleWorkspaceUsers(organizationId: string): Promise<GoogleWorkspaceSyncResult> {
  const { data, error } = await supabase.functions.invoke('google-workspace-sync-users', {
    body: { organizationId },
  });

  if (error) {
    await throwGoogleWorkspaceInvokeError(error);
  }

  if (!data?.success) {
    throwGoogleWorkspaceResponseError(data ?? {});
  }

  return {
    usersSynced: data.usersSynced || 0,
    directoryMarkedSuspended: data.directoryMarkedSuspended || 0,
    membersDeactivated: data.membersDeactivated || 0,
    claimsRevoked: data.claimsRevoked || 0,
  };
}

export async function getGoogleExportDestination(
  organizationId: string,
  documentType: GoogleExportDocumentType = 'work-orders-internal-packet',
): Promise<GoogleExportDestination | null> {
  const { data, error } = await supabase.functions.invoke('get-google-export-destination', {
    body: { organizationId, documentType },
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data?.destination ?? null) as GoogleExportDestination | null;
}

export async function setGoogleExportDestination(input: {
  organizationId: string;
  documentType?: GoogleExportDocumentType;
  selectionKind: GoogleExportSelectionKind;
  parentId: string;
  folderByTeam?: boolean;
  folderByEquipment?: boolean;
}): Promise<GoogleExportDestination> {
  const bodyPayload: Record<string, unknown> = {
    organizationId: input.organizationId,
    documentType: input.documentType ?? 'work-orders-internal-packet',
    selectionKind: input.selectionKind,
    parentId: input.parentId,
  };
  if (typeof input.folderByTeam === 'boolean') {
    bodyPayload.folderByTeam = input.folderByTeam;
  }
  if (typeof input.folderByEquipment === 'boolean') {
    bodyPayload.folderByEquipment = input.folderByEquipment;
  }

  const { data, error } = await supabase.functions.invoke('set-google-export-destination', {
    body: bodyPayload,
  });

  if (error) {
    await throwGoogleWorkspaceInvokeError(error as Error & { context?: unknown });
  }

  if (data?.error) {
    throwGoogleWorkspaceResponseError(data);
  }

  return data.destination as GoogleExportDestination;
}

export async function listGoogleDriveDestinations(input: {
  organizationId: string;
  parentId?: string | null;
  driveId?: string | null;
}): Promise<GoogleDriveDestinationBrowseResponse> {
  const { data, error } = await supabase.functions.invoke('list-google-drive-destinations', {
    body: {
      organizationId: input.organizationId,
      parentId: input.parentId ?? null,
      driveId: input.driveId ?? null,
    },
  });

  if (error) {
    await throwGoogleWorkspaceInvokeError(error as Error & { context?: unknown });
  }

  if (data?.error) {
    throwGoogleWorkspaceResponseError(data);
  }

  return data as GoogleDriveDestinationBrowseResponse;
}

export async function createGoogleDriveDestinationFolder(input: {
  organizationId: string;
  parentId: string;
  driveId?: string | null;
  name: string;
}): Promise<GoogleDriveDestinationBrowseItem> {
  const { data, error } = await supabase.functions.invoke('manage-google-drive-destination-folder', {
    body: {
      action: 'create',
      organizationId: input.organizationId,
      parentId: input.parentId,
      driveId: input.driveId ?? null,
      name: input.name,
    },
  });

  if (error) {
    await throwGoogleWorkspaceInvokeError(error as Error & { context?: unknown });
  }

  if (data?.error) {
    throwGoogleWorkspaceResponseError(data);
  }

  return data.folder as GoogleDriveDestinationBrowseItem;
}

export type GoogleDriveDestinationFolderDeleteResult = {
  deleted: true;
  folderId: string;
  hadContents: boolean;
  childCount: number;
};

export class GoogleDriveFolderDeleteConfirmationRequiredError extends Error {
  constructor(
    message: string,
    readonly childCount: number,
  ) {
    super(message);
    this.name = 'GoogleDriveFolderDeleteConfirmationRequiredError';
  }
}

export async function deleteGoogleDriveDestinationFolder(input: {
  organizationId: string;
  folderId: string;
  confirmDataLoss?: boolean;
}): Promise<GoogleDriveDestinationFolderDeleteResult> {
  const { data, error } = await supabase.functions.invoke('manage-google-drive-destination-folder', {
    body: {
      action: 'delete',
      organizationId: input.organizationId,
      folderId: input.folderId,
      confirmDataLoss: input.confirmDataLoss ?? false,
    },
  });

  if (error) {
    const response = (error as Error & { context?: unknown }).context;
    if (response instanceof Response) {
      const payload = await response.clone().json().catch(() => null) as {
        error?: string;
        code?: string;
        childCount?: number;
      } | null;

      if (payload?.code === 'folder_not_empty_requires_confirmation') {
        throw new GoogleDriveFolderDeleteConfirmationRequiredError(
          payload.error ?? 'Folder is not empty',
          payload.childCount ?? 0,
        );
      }

      if (payload?.error) {
        throwGoogleWorkspaceResponseError(payload);
      }
    }

    await throwGoogleWorkspaceInvokeError(error as Error & { context?: unknown });
  }

  if (data?.error) {
    if (data.code === 'folder_not_empty_requires_confirmation') {
      throw new GoogleDriveFolderDeleteConfirmationRequiredError(
        data.error,
        data.childCount ?? 0,
      );
    }
    throwGoogleWorkspaceResponseError(data);
  }

  return data as GoogleDriveDestinationFolderDeleteResult;
}

export async function listWorkspaceDirectoryUsers(
  organizationId: string
): Promise<WorkspaceDirectoryUser[]> {
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

/**
 * Light-weight directory user type for import UI.
 * Only includes fields needed for the member import sheet.
 */
export interface WorkspaceDirectoryUserLight {
  id: string;
  primary_email: string;
  full_name: string | null;
  suspended: boolean;
}

/**
 * List Google Workspace directory users with only essential fields for import UI.
 * Returns a lighter payload than listWorkspaceDirectoryUsers.
 * @param organizationId - The organization ID
 */
export async function listWorkspaceDirectoryUsersLight(
  organizationId: string
): Promise<WorkspaceDirectoryUserLight[]> {
  const { data, error } = await supabase
    .from('google_workspace_directory_users')
    .select('id, primary_email, full_name, suspended')
    .eq('organization_id', organizationId)
    .order('primary_email', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as WorkspaceDirectoryUserLight[];
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

export interface DisconnectWorkspaceResult {
  success: boolean;
  credentials_deleted: number;
  directory_users_deleted: number;
  domain_unclaimed: number;
  domain: string | null;
}

/**
 * Disconnect Google Workspace integration for an organization.
 * Clears OAuth credentials, cached directory users, and releases the workspace domain claim.
 *
 * @param organizationId - The organization to disconnect
 */
export async function disconnectGoogleWorkspace(
  organizationId: string,
): Promise<DisconnectWorkspaceResult> {
  const { data, error } = await supabase.rpc('disconnect_google_workspace', {
    p_organization_id: organizationId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as DisconnectWorkspaceResult;
}
