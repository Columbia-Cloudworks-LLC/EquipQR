import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { MissingSecretError, requireSecret } from "../_shared/require-secret.ts";
import {
  createAdminSupabaseClient,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import {
  disconnectOrganizationsForRiscPayload,
  isVerificationOnlyEvent,
  verifyGoogleSecurityEventToken,
} from "./risc-helpers.ts";

const FUNCTION_NAME = "google-risc-receiver";

function logStep(step: string, details?: Record<string, unknown>) {
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[GOOGLE-RISC-RECEIVER] ${step}${detailsStr}`);
}

function resolveAcceptedAudiences(): string[] {
  const workspaceClientId = requireSecret("GOOGLE_WORKSPACE_CLIENT_ID", { functionName: FUNCTION_NAME });
  const audiences = [workspaceClientId.trim()];
  const authClientId = Deno.env.get("GOOGLE_AUTH_CLIENT_ID")?.trim();
  if (authClientId) {
    audiences.push(authClientId);
  }
  return audiences;
}

export async function handleGoogleRiscRequest(
  req: Request,
  deps: {
    verifyToken: typeof verifyGoogleSecurityEventToken;
    disconnectOrganizations: typeof disconnectOrganizationsForRiscPayload;
    createServiceClient: () => ReturnType<typeof createAdminSupabaseClient>;
    resolveAcceptedAudiences: () => string[];
  },
): Promise<Response> {
  const corsResponse = handleCorsPreflightIfNeeded(req, { useValidatedOrigin: true });
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405, { req });
  }

  const rawBody = (await req.text()).trim();
  if (!rawBody) {
    return createErrorResponse("Missing security event token", 400, { req });
  }

  const acceptedAudiences = deps.resolveAcceptedAudiences();

  let payload;
  try {
    payload = await deps.verifyToken(rawBody, acceptedAudiences);
  } catch (error) {
    logStep("Security event token rejected", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return createErrorResponse("Invalid security event token", 401, { req });
  }

  if (isVerificationOnlyEvent(payload)) {
    logStep("Verification event acknowledged", { jti: payload.jti });
    return createJsonResponse({ success: true, verification: true }, 200, { req });
  }

  const supabaseClient = deps.createServiceClient();
  const { disconnectedOrganizationIds } = await deps.disconnectOrganizations(supabaseClient, payload);

  logStep("Processed security event", {
    jti: payload.jti,
    eventTypes: Object.keys(payload.events),
    disconnectedCount: disconnectedOrganizationIds.length,
  });

  return createJsonResponse({ success: true, disconnectedOrganizationIds }, 200, { req });
}

Deno.serve(withCorrelationId(async (req) => {
  try {
    return await handleGoogleRiscRequest(req, {
      verifyToken: verifyGoogleSecurityEventToken,
      disconnectOrganizations: disconnectOrganizationsForRiscPayload,
      createServiceClient: () => createAdminSupabaseClient(),
      resolveAcceptedAudiences,
    });
  } catch (error) {
    if (error instanceof MissingSecretError) {
      logStep("Missing required secret", { secret: error.secretName });
      return createErrorResponse("Service misconfigured", 500, { req });
    }

    logStep("Unhandled receiver error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return createErrorResponse("Internal server error", 500, { req });
  }
}));

export { createClient };
