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
  const { count: credentialsDeleted, error: credentialsError } = await supabaseClient
    .from("google_workspace_credentials")
    .delete({ count: "exact" })
    .eq("organization_id", organizationId);

  if (credentialsError) {
    throw new Error(`Failed to delete Google Workspace credentials: ${credentialsError.message}`);
  }

  const { count: directoryUsersDeleted, error: directoryError } = await supabaseClient
    .from("google_workspace_directory_users")
    .delete({ count: "exact" })
    .eq("organization_id", organizationId);

  if (directoryError) {
    throw new Error(`Failed to delete Google Workspace directory cache: ${directoryError.message}`);
  }

  const { count: domainUnclaimed, error: domainError } = await supabaseClient
    .from("workspace_domains")
    .delete({ count: "exact" })
    .eq("organization_id", organizationId);

  if (domainError) {
    throw new Error(`Failed to release workspace domain claim: ${domainError.message}`);
  }

  return {
    credentialsDeleted: credentialsDeleted ?? 0,
    directoryUsersDeleted: directoryUsersDeleted ?? 0,
    domainUnclaimed: domainUnclaimed ?? 0,
  };
}
