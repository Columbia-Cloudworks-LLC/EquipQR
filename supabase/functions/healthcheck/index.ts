import {
  createAdminSupabaseClient,
  createJsonResponse,
  createErrorResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

const RPC_TIMEOUT_MS = 5_000;

interface DbCheck {
  ok: boolean;
  latency_ms: number;
  error_code?: string;
}

interface HealthResponse {
  ok: boolean;
  service: string;
  environment: string;
  checked_at: string;
  checks: { db: DbCheck };
}

function buildHealthResponse(dbCheck: DbCheck): HealthResponse {
  return {
    ok: dbCheck.ok,
    service: "healthcheck",
    environment: Deno.env.get("SUPABASE_ENVIRONMENT") || "production",
    checked_at: new Date().toISOString(),
    checks: { db: dbCheck },
  };
}

async function runDbCheck(): Promise<DbCheck> {
  const supabase = createAdminSupabaseClient();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  const start = performance.now();
  try {
    const { data, error } = await supabase
      .rpc("monitoring_healthcheck", {}, { signal: controller.signal })
      .single();

    const latency_ms = Math.round(performance.now() - start);

    if (error || !data?.ok) {
      console.error("[HEALTHCHECK] RPC error:", error?.message ?? "no data");
      return { ok: false, latency_ms, error_code: "rpc_failed" };
    }

    return { ok: true, latency_ms };
  } catch (err: unknown) {
    const latency_ms = Math.round(performance.now() - start);
    const isAbort =
      err instanceof DOMException && err.name === "AbortError";
    const code = isAbort ? "timeout" : "rpc_failed";
    console.error(`[HEALTHCHECK] ${code}:`, isAbort ? "exceeded timeout" : (err as Error)?.message);
    return { ok: false, latency_ms, error_code: code };
  } finally {
    clearTimeout(timer);
  }
}

export const __testables = { buildHealthResponse, runDbCheck };

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "GET") {
    return createErrorResponse("Method not allowed", 405);
  }

  const dbCheck = await runDbCheck();
  const body = buildHealthResponse(dbCheck);
  return createJsonResponse(body, body.ok ? 200 : 503);
});
