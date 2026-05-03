/**
 * Queue Worker Edge Function
 *
 * Drains the public.notifications pgmq queue and invokes the
 * `send-push-notification` Edge Function for each enqueued message.
 *
 * Cron-triggered every minute by `cron.schedule('drain-notifications-queue', ...)`
 * defined in `supabase/migrations/20260503140000_schedule_queue_worker.sql`.
 * The cron job calls a SECURITY DEFINER function `public.invoke_queue_worker()`
 * that performs `net.http_post` to this Edge Function with a Bearer token
 * sourced from `vault.decrypted_secrets` (`service_role_key`).
 *
 * Producer side: `public.broadcast_notification` trigger (rewritten in
 * `supabase/migrations/20260503150000_route_push_notifications_through_queue.sql`)
 * calls `pgmq_public.send('notifications', payload)` instead of fire-and-forget
 * `net.http_post` to `send-push-notification`. The payload schema matches the
 * existing send-push-notification request body.
 *
 * Behavior contract:
 *   1. Read up to 10 messages with a 60-second visibility timeout.
 *   2. For each message, invoke `send-push-notification` with `msg.message`.
 *   3. On success, delete the message (final acknowledgement).
 *   4. On failure, log + leave the message — pgmq makes it visible again
 *      after `vt` expires for automatic retry (durable retry semantics).
 *   5. Loop until `read` returns 0 messages, then exit.
 *   6. Hard cap: 50 batches per invocation (= 500 messages max) to stay
 *      well within the 150s edge-function execution limit.
 *
 * Authentication: Bearer = SUPABASE_SERVICE_ROLE_KEY. This function is invoked
 * only by the database via pg_net using the service role key fetched from
 * Supabase Vault. External callers are rejected with 401.
 *
 * See Change Record on issue #722 for the full design.
 */

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import { requireSecret } from "../_shared/require-secret.ts";

const FUNCTION_NAME = "queue-worker";

const QUEUE_NAME = "notifications";
const VISIBILITY_TIMEOUT_SECONDS = 60;
const BATCH_SIZE = 10;
const MAX_BATCHES_PER_INVOCATION = 50;

const logStep = (
  step: string,
  details?: Record<string, unknown>,
): void => {
  // Structured single-line JSON log so Better Stack / Datadog can parse cleanly.
  // The correlationId is added by withCorrelationId via the per-request context
  // when the handler logs from inside the wrapper; this helper is shared by all
  // call sites that don't have access to the ctx (drain loop helpers, etc.) and
  // omits the field when not provided.
  console.log(
    JSON.stringify({
      level: "info",
      function: FUNCTION_NAME,
      step,
      ...(details ?? {}),
    }),
  );
};

/**
 * Validate that the request is authenticated with the service role key.
 * pg_cron invokes this function via pg_net using the key fetched from
 * vault.decrypted_secrets. Externally-originated calls are rejected.
 */
function validateServiceRoleAuth(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") {
    return false;
  }

  const token = parts[1];
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return expected !== undefined && token === expected;
}

export interface QueueMessage {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  message: Record<string, unknown> | null;
}

export interface DrainResult {
  processed: number;
  failed: number;
  batches: number;
}

/**
 * Minimal interface the drain loop needs from the supabase-js client. Defining
 * it as an interface (not a concrete client type) lets the deno tests pass a
 * lightweight stub without standing up real network calls.
 */
export interface DrainClient {
  read: (qty: number, vt: number) => Promise<{
    data: QueueMessage[] | null;
    error: { message: string; code?: string } | null;
  }>;
  invoke: (payload: Record<string, unknown>) => Promise<{
    error: { message: string } | null;
  }>;
  deleteMessage: (msgId: number) => Promise<{
    error: { message: string } | null;
  }>;
}

/**
 * Build a DrainClient backed by a real supabase-js admin client. Kept as a
 * single named export so the production code path (the Deno.serve handler
 * below) and the test path can both use it; tests bypass it by passing a
 * hand-written stub directly into runDrainLoop.
 */
function buildSupabaseDrainClient(
  supabaseUrl: string,
  serviceRoleKey: string,
): DrainClient {
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // pgmq_public exposes the user-facing read/send/delete/pop/archive RPCs
  // on top of the pgmq.q_<queue> tables.
  const pgmqClient = adminClient.schema("pgmq_public");

  return {
    read: async (qty, vt) => {
      const result = await pgmqClient.rpc("read", {
        queue_name: QUEUE_NAME,
        vt,
        qty,
      });
      return {
        data: (result.data ?? null) as QueueMessage[] | null,
        error: result.error
          ? { message: result.error.message, code: result.error.code }
          : null,
      };
    },
    invoke: async (payload) => {
      const result = await adminClient.functions.invoke(
        "send-push-notification",
        { body: payload },
      );
      return {
        error: result.error ? { message: result.error.message } : null,
      };
    },
    deleteMessage: async (msgId) => {
      const result = await pgmqClient.rpc("delete", {
        queue_name: QUEUE_NAME,
        message_id: msgId,
      });
      return {
        error: result.error ? { message: result.error.message } : null,
      };
    },
  };
}

/**
 * Pure drain loop. Reads up to BATCH_SIZE messages per batch, invokes
 * send-push-notification per message, deletes on success, leaves on failure
 * (auto-retry after vt expires). Stops when the queue is empty or when
 * MAX_BATCHES_PER_INVOCATION is reached.
 *
 * Exported so the deno test can drive it with a stub DrainClient and verify
 * the read/invoke/delete contract directly without spinning up the real
 * supabase-js stack.
 */
export async function runDrainLoop(
  client: DrainClient,
  options: {
    maxBatches?: number;
    batchSize?: number;
    vtSeconds?: number;
    log?: (step: string, details?: Record<string, unknown>) => void;
  } = {},
): Promise<DrainResult> {
  const maxBatches = options.maxBatches ?? MAX_BATCHES_PER_INVOCATION;
  const batchSize = options.batchSize ?? BATCH_SIZE;
  const vtSeconds = options.vtSeconds ?? VISIBILITY_TIMEOUT_SECONDS;
  const log = options.log ?? logStep;

  let processed = 0;
  let failed = 0;
  let batches = 0;

  while (batches < maxBatches) {
    batches += 1;

    const { data: messages, error: readError } = await client.read(batchSize, vtSeconds);

    if (readError) {
      log("queue-read-error", {
        batch: batches,
        error: readError.message,
        code: readError.code,
      });
      // Read failures are typically infrastructural (extension not present,
      // RLS policy blocking, etc.). Stop draining; next cron tick retries.
      break;
    }

    const batch = messages ?? [];
    if (batch.length === 0) {
      break;
    }

    log("batch-fetched", { batch: batches, messages: batch.length });

    for (const msg of batch) {
      const payload = msg.message ?? {};

      try {
        const { error: invokeError } = await client.invoke(payload);

        if (invokeError) {
          failed += 1;
          log("invoke-failed", {
            msg_id: msg.msg_id,
            read_ct: msg.read_ct,
            error: invokeError.message,
          });
          // Do NOT delete — message reappears after vt expires for retry.
          continue;
        }

        const { error: deleteError } = await client.deleteMessage(msg.msg_id);

        if (deleteError) {
          // Delivery succeeded but ACK failed — message will be re-delivered
          // after vt. send-push-notification is idempotent enough that
          // double-delivery is a soft failure, not a correctness one.
          failed += 1;
          log("delete-failed", {
            msg_id: msg.msg_id,
            error: deleteError.message,
          });
          continue;
        }

        processed += 1;
      } catch (err) {
        failed += 1;
        log("processing-exception", {
          msg_id: msg.msg_id,
          read_ct: msg.read_ct,
          error: err instanceof Error ? err.message : String(err),
        });
        // Leave the message — vt timeout will make it eligible for retry.
      }
    }

    if (batch.length < batchSize) {
      // Smaller-than-batchSize result means the queue is now empty;
      // exit early instead of issuing another read RPC for [].
      break;
    }
  }

  return { processed, failed, batches };
}

Deno.serve(withCorrelationId(async (req, ctx) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405);
  }

  // Resolve required secrets BEFORE the auth check, per the EquipQR Edge
  // Function smoke-test contract — a 500 here distinguishes "secret missing"
  // from a 401 "auth failed" so on-call can react accordingly.
  const supabaseUrl = requireSecret("SUPABASE_URL", { functionName: FUNCTION_NAME });
  const serviceRoleKey = requireSecret("SUPABASE_SERVICE_ROLE_KEY", { functionName: FUNCTION_NAME });

  if (!validateServiceRoleAuth(req)) {
    logStep("auth-rejected", { correlation_id: ctx.correlationId });
    return createErrorResponse("Unauthorized", 401);
  }

  logStep("drain-started", {
    correlation_id: ctx.correlationId,
    queue: QUEUE_NAME,
    batch_size: BATCH_SIZE,
    vt_seconds: VISIBILITY_TIMEOUT_SECONDS,
    max_batches: MAX_BATCHES_PER_INVOCATION,
  });

  const startedAt = Date.now();
  const drainClient = buildSupabaseDrainClient(supabaseUrl, serviceRoleKey);
  const result = await runDrainLoop(drainClient);
  const elapsedMs = Date.now() - startedAt;

  logStep("drain-finished", {
    correlation_id: ctx.correlationId,
    processed: result.processed,
    failed: result.failed,
    batches: result.batches,
    elapsed_ms: elapsedMs,
  });

  return createJsonResponse({
    success: true,
    processed: result.processed,
    failed: result.failed,
    batches: result.batches,
    elapsed_ms: elapsedMs,
  });
}));
