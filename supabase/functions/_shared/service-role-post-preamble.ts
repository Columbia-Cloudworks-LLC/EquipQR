/**
 * Shared request preamble for service-role-only POST workers
 * (`queue-worker`, `process-export-job`): CORS preflight, POST-only, and the
 * Supabase URL / service-role key secrets. Callers still run their own
 * service-role authorization check with the returned key.
 */

import { requireSecret } from "./require-secret.ts";
import {
  createErrorResponse,
  handleCorsPreflightIfNeeded,
  type RequestContext,
  withCorrelationId,
} from "./supabase-clients.ts";

export interface ServiceRoleRuntimeSecrets {
  supabaseUrl: string;
  serviceRoleKey: string;
}

/** Returns an early Response (preflight / 405) or the runtime secrets the worker needs. */
function beginServiceRolePost(
  req: Request,
  functionName: string,
): Response | ServiceRoleRuntimeSecrets {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405);
  }

  return {
    supabaseUrl: requireSecret("SUPABASE_URL", { functionName }),
    serviceRoleKey: requireSecret("SUPABASE_SERVICE_ROLE_KEY", { functionName }),
  };
}

/**
 * `Deno.serve` wrapper for service-role POST workers: correlation id, preflight, POST-only,
 * and the runtime secrets. The handler must still authorize the caller against `serviceRoleKey`.
 */
export function serveServiceRolePostWorker(
  functionName: string,
  handler: (
    req: Request,
    ctx: RequestContext,
    secrets: ServiceRoleRuntimeSecrets,
  ) => Promise<Response>,
): void {
  Deno.serve(withCorrelationId((req, ctx) => {
    const preamble = beginServiceRolePost(req, functionName);
    if (preamble instanceof Response) return Promise.resolve(preamble);
    return handler(req, ctx, preamble);
  }));
}
