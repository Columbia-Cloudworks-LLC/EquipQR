import { corsHeaders } from "../_shared/cors.ts";
import {
  createAdminSupabaseClient,
  createUserSupabaseClient,
  createErrorResponse,
  requireUser,
  verifyOrgAdmin,
} from "../_shared/supabase-clients.ts";
import {
  getGoogleWorkspaceAccessToken,
  GoogleWorkspaceTokenError,
} from "../_shared/google-workspace-token.ts";
import { googleApiFetch } from "../_shared/google-api-retry.ts";

interface SyncRequest {
  organizationId: string;
}

interface GoogleDirectoryUser {
  id: string;
  primaryEmail: string;
  name?: {
    fullName?: string;
    givenName?: string;
    familyName?: string;
  };
  suspended?: boolean;
  orgUnitPath?: string;
}

interface GoogleDirectoryResponse {
  users?: GoogleDirectoryUser[];
  nextPageToken?: string;
}

const USERS_URL = "https://admin.googleapis.com/admin/directory/v1/users";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GOOGLE-WORKSPACE-SYNC] ${step}${detailsStr}`);
};

function buildDirectoryUrl(domain: string, pageToken?: string): string {
  const params = new URLSearchParams({
    customer: "my_customer",
    maxResults: "500",
    orderBy: "email",
    domain,
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  return `${USERS_URL}?${params.toString()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405);
    }

    const supabase = createUserSupabaseClient(req);
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    const body: SyncRequest = await req.json();
    const { organizationId } = body;
    if (!organizationId) {
      return createErrorResponse("organizationId is required", 400);
    }

    const isAdmin = await verifyOrgAdmin(supabase, auth.user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse("Only organization administrators can sync Workspace users", 403);
    }

    // SECURITY NOTE: We use the admin client for these operations because:
    // 1. google_workspace_credentials contains encrypted OAuth tokens that should
    //    not be directly accessible via RLS (even to org admins in the app layer)
    // 2. google_workspace_directory_users is a sync target that requires bulk upserts
    //
    // Authorization is enforced at the application layer:
    // - User authentication verified via requireUser() above
    // - Org admin status verified via verifyOrgAdmin() above
    // - organizationId is validated against the user's membership
    //
    // Defense-in-depth: We still filter by organizationId to ensure the admin client
    // only accesses data for the verified organization.
    const adminClient = createAdminSupabaseClient();

    // Get a valid Google Workspace access token using the shared helper.
    // This handles credential lookup, decryption, token refresh, and expiry updates.
    let tokenResult;
    try {
      tokenResult = await getGoogleWorkspaceAccessToken(adminClient, organizationId);
    } catch (tokenError) {
      if (tokenError instanceof GoogleWorkspaceTokenError) {
        logStep("Token error", { code: tokenError.code, message: tokenError.message });
        const statusMap: Record<string, number> = {
          not_connected: 400,
          oauth_not_configured: 500,
          encryption_config_error: 500,
          token_corruption: 500,
          token_refresh_failed: 502,
          token_revoked: 401,
          insufficient_scopes: 403,
        };
        return createErrorResponse(tokenError.message, statusMap[tokenError.code] ?? 500);
      }
      throw tokenError;
    }

    const { accessToken, domain } = tokenResult;

    let nextPageToken: string | undefined;
    const nowIso = new Date().toISOString();

    // Batch configuration: collect users across pages before upserting
    // Using 200 users per batch by default for better error recovery granularity
    // and to avoid potential timeout/memory issues with larger batches.
    // Can be overridden via GW_SYNC_BATCH_SIZE environment variable.
    const DEFAULT_BATCH_SIZE = 200;
    const MAX_BATCH_SIZE = 1000;
    const envBatchSize = Deno.env.get("GW_SYNC_BATCH_SIZE");
    // Coerce undefined/null to empty string so parseInt yields NaN, which we handle below
    const parsedBatchSize = Number.parseInt(envBatchSize || "", 10);
    const BATCH_SIZE =
      Number.isNaN(parsedBatchSize) || parsedBatchSize <= 0
        ? DEFAULT_BATCH_SIZE
        : Math.min(parsedBatchSize, MAX_BATCH_SIZE);
    let pendingRows: Array<{
      organization_id: string;
      google_user_id: string;
      primary_email: string;
      full_name: string | null;
      given_name: string | null;
      family_name: string | null;
      suspended: boolean;
      org_unit_path: string | null;
      last_synced_at: string;
      updated_at: string;
    }> = [];
    let totalUsers = 0;
    let pagesProcessed = 0;

    do {
      const url = buildDirectoryUrl(domain, nextPageToken);
      const response = await googleApiFetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }, { label: "directory-sync" });

      if (!response.ok) {
        logStep("Directory API error", { status: response.status });
        return createErrorResponse(`Failed to fetch Google Workspace users (HTTP ${response.status})`, 502);
      }

      const payload: GoogleDirectoryResponse = await response.json();
      const users = payload.users || [];
      pagesProcessed++;

      const rows = users.map((user) => ({
        organization_id: organizationId,
        google_user_id: user.id,
        primary_email: user.primaryEmail,
        full_name: user.name?.fullName || null,
        given_name: user.name?.givenName || null,
        family_name: user.name?.familyName || null,
        suspended: user.suspended ?? false,
        org_unit_path: user.orgUnitPath || null,
        last_synced_at: nowIso,
        updated_at: nowIso,
      }));

      pendingRows.push(...rows);
      totalUsers += rows.length;

      // Batch upsert when we've collected enough users to reduce DB round trips
      if (pendingRows.length >= BATCH_SIZE) {
        logStep("Batch upserting users", { count: pendingRows.length, pagesProcessed, totalSoFar: totalUsers });
        const { error: upsertError } = await adminClient
          .from("google_workspace_directory_users")
          .upsert(pendingRows, { onConflict: "organization_id,google_user_id" });

        if (upsertError) {
          logStep("Upsert error", { error: upsertError.message });
          return createErrorResponse("Failed to store directory users", 500);
        }

        pendingRows = []; // Reset batch
      }

      nextPageToken = payload.nextPageToken;
    } while (nextPageToken);

    // Final upsert for remaining users
    if (pendingRows.length > 0) {
      logStep("Final batch upserting users", { count: pendingRows.length, pagesProcessed, total: totalUsers });
      const { error: upsertError } = await adminClient
        .from("google_workspace_directory_users")
        .upsert(pendingRows, { onConflict: "organization_id,google_user_id" });

      if (upsertError) {
        logStep("Upsert error", { error: upsertError.message });
        return createErrorResponse("Failed to store directory users", 500);
      }
    }

    logStep("Sync complete", { totalUsers, pagesProcessed });

    return new Response(JSON.stringify({ success: true, usersSynced: totalUsers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return createErrorResponse("Unexpected error while syncing Google Workspace users", 500);
  }
});

