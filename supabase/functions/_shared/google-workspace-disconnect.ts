import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export type GoogleWorkspaceDisconnectResult = {
  credentialsDeleted: number;
  directoryUsersDeleted: number;
  domainUnclaimed: number;
};

/**
 * Service-role cleanup mirroring disconnect_google_workspace RPC deletes without
 * organization membership checks. Used by Google RISC revocation handlers.
 */
export async function disconnectGoogleWorkspaceForOrganization(
  supabaseClient: SupabaseClient,
  organizationId: string,
): Promise<GoogleWorkspaceDisconnectResult> {
  const { data, error } = await supabaseClient.rpc("disconnect_google_workspace_internal", {
    p_organization_id: organizationId,
  });

  if (error) {
    throw new Error(`Failed to disconnect Google Workspace: ${error.message}`);
  }

  const result = (data ?? {}) as Record<string, unknown>;

  return {
    credentialsDeleted: Number(result.credentials_deleted ?? 0),
    directoryUsersDeleted: Number(result.directory_users_deleted ?? 0),
    domainUnclaimed: Number(result.domain_unclaimed ?? 0),
  };
}
