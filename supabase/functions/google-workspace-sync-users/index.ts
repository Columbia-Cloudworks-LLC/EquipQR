import { corsHeaders } from "../_shared/cors.ts";
import {
  createAdminSupabaseClient,
  createUserSupabaseClient,
  createErrorResponse,
  requireUser,
  verifyOrgAdmin,
} from "../_shared/supabase-clients.ts";
import { decryptToken, getTokenEncryptionKey } from "../_shared/crypto.ts";

interface SyncRequest {
  organizationId: string;
}

interface GoogleRefreshResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
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

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERS_URL = "https://admin.googleapis.com/admin/directory/v1/users";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GOOGLE-WORKSPACE-SYNC] ${step}${detailsStr}`);
};

async function refreshAccessToken(refreshToken: string): Promise<GoogleRefreshResponse> {
  const clientId = Deno.env.get("GOOGLE_WORKSPACE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_WORKSPACE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Google Workspace OAuth is not configured");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Google access token");
  }

  return await response.json();
}

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

    const adminClient = createAdminSupabaseClient();
    const { data: creds, error: credsError } = await adminClient
      .from("google_workspace_credentials")
      .select("domain, refresh_token")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (credsError || !creds?.refresh_token || !creds?.domain) {
      return createErrorResponse("Google Workspace is not connected for this organization", 400);
    }

    // Decrypt the stored refresh token
    let encryptionKey: string;
    try {
      encryptionKey = getTokenEncryptionKey();
    } catch (keyError) {
      // Configuration issue: encryption key is missing or invalid
      const errorMessage = keyError instanceof Error ? keyError.message : String(keyError);
      logStep("Encryption key configuration error", { error: errorMessage });
      return createErrorResponse(
        "Google Workspace encryption is not properly configured. Please contact your administrator.",
        500
      );
    }

    let decryptedRefreshToken: string;
    try {
      decryptedRefreshToken = await decryptToken(creds.refresh_token, encryptionKey);
      logStep("Refresh token decrypted successfully");
    } catch (decryptError) {
      // Token corruption issue: key is valid but token cannot be decrypted
      const errorType = decryptError instanceof Error ? decryptError.name : "UnknownError";
      logStep("Failed to decrypt refresh token", { errorType });
      return createErrorResponse(
        "Failed to decrypt stored credentials. The stored token may be corrupted. Please reconnect Google Workspace.",
        500
      );
    }

    const tokenData = await refreshAccessToken(decryptedRefreshToken);
    const accessToken = tokenData.access_token;
    const accessTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await adminClient
      .from("google_workspace_credentials")
      .update({
        access_token_expires_at: accessTokenExpiresAt.toISOString(),
        scopes: tokenData.scope || null,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("domain", creds.domain);

    let nextPageToken: string | undefined;
    const nowIso = new Date().toISOString();

    // Batch configuration: collect users across pages before upserting
    // Using 200 users per batch by default for better error recovery granularity
    // and to avoid potential timeout/memory issues with larger batches.
    // Can be overridden via GW_SYNC_BATCH_SIZE environment variable.
    const DEFAULT_BATCH_SIZE = 200;
    const MAX_BATCH_SIZE = 1000;
    const envBatchSize = Deno.env.get("GW_SYNC_BATCH_SIZE");
    // When envBatchSize is undefined or null, Number.parseInt(envBatchSize, 10) returns NaN, so we can rely on the NaN check below
    const parsedBatchSize = Number.parseInt(envBatchSize, 10);
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
      const url = buildDirectoryUrl(creds.domain, nextPageToken);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

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

