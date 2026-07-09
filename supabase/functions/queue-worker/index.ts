/**
 * Queue Worker Edge Function
 *
 * Drains pgmq queues and invokes the matching Edge Function per message:
 *   * `notifications` → send-push-notification (#722)
 *   * `exports` → process-export-job (#1193)
 *
 * Cron-triggered every minute by `cron.schedule('drain-notifications-queue', ...)`
 * via `public.invoke_queue_worker()` (name kept for backward compatibility).
 *
 * Behavior contract (per queue):
 *   1. Read up to 10 messages with a 60-second visibility timeout.
 *   2. Invoke the target function with `msg.message`.
 *   3. On success (or permanent failure ACK), delete the message.
 *   4. On transient failure, leave the message for vt retry.
 *   5. Loop until empty or MAX_BATCHES_PER_INVOCATION.
 *
 * Authentication: Bearer = SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import { requireSecret } from "../_shared/require-secret.ts";
import { EXPORTS_QUEUE_NAME } from "../_shared/export-job.ts";

const FUNCTION_NAME = "queue-worker";

const NOTIFICATIONS_QUEUE = "notifications";
const VISIBILITY_TIMEOUT_SECONDS = 60;
const BATCH_SIZE = 10;
const MAX_BATCHES_PER_INVOCATION = 50;

const QUEUE_TARGETS: Record<string, string> = {
  [NOTIFICATIONS_QUEUE]: "send-push-notification",
  [EXPORTS_QUEUE_NAME]: "process-export-job",
};

const logStep = (
  step: string,
  details?: Record<string, unknown>,
): void => {
  console.log(
    JSON.stringify({
      level: "info",
      function: FUNCTION_NAME,
      step,
      ...(details ?? {}),
    }),
  );
};

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
  headers: Record<string, unknown> | null;
}

export interface DrainResult {
  processed: number;
  failed: number;
  batches: number;
  queues: Record<string, { processed: number; failed: number; batches: number }>;
}

export interface InvokeResult {
  error: { message: string } | null;
  /** When true, ACK/delete even if the job reported logical failure (no retry). */
  permanentFailure?: boolean;
}

/**
 * Minimal interface the drain loop needs from the supabase-js client.
 */
export interface DrainClient {
  read: (queueName: string, qty: number, vt: number) => Promise<{
    data: QueueMessage[] | null;
    error: { message: string; code?: string } | null;
  }>;
  invoke: (queueName: string, payload: Record<string, unknown>) => Promise<InvokeResult>;
  deleteMessage: (queueName: string, msgId: number) => Promise<{
    error: { message: string } | null;
  }>;
}

function buildSupabaseDrainClient(
  supabaseUrl: string,
  serviceRoleKey: string,
): DrainClient {
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const pgmqClient = adminClient.schema("pgmq_public");

  return {
    read: async (queueName, qty, vt) => {
      const result = await pgmqClient.rpc("read", {
        queue_name: queueName,
        sleep_seconds: vt,
        n: qty,
      });
      return {
        data: (result.data ?? null) as QueueMessage[] | null,
        error: result.error
          ? { message: result.error.message, code: result.error.code }
          : null,
      };
    },
    invoke: async (queueName, payload) => {
      const target = QUEUE_TARGETS[queueName];
      if (!target) {
        return { error: { message: `No target function for queue ${queueName}` } };
      }
      const result = await adminClient.functions.invoke(target, { body: payload });
      if (result.error) {
        return { error: { message: result.error.message } };
      }
      // process-export-job returns 200 + { success: false } for permanent failures
      // so the worker can ACK without retrying forever.
      const data = result.data as { success?: boolean; permanent?: boolean } | null;
      if (data && data.success === false) {
        return {
          error: { message: "Job reported failure" },
          permanentFailure: data.permanent !== false,
        };
      }
      return { error: null };
    },
    deleteMessage: async (queueName, msgId) => {
      const result = await pgmqClient.rpc("delete", {
        queue_name: queueName,
        message_id: msgId,
      });
      return {
        error: result.error ? { message: result.error.message } : null,
      };
    },
  };
}

/**
 * Drain a single named queue. Exported for deno tests.
 */
export async function runDrainLoopForQueue(
  client: DrainClient,
  queueName: string,
  options: {
    maxBatches?: number;
    batchSize?: number;
    vtSeconds?: number;
    log?: (step: string, details?: Record<string, unknown>) => void;
  } = {},
): Promise<{ processed: number; failed: number; batches: number }> {
  const maxBatches = options.maxBatches ?? MAX_BATCHES_PER_INVOCATION;
  const batchSize = options.batchSize ?? BATCH_SIZE;
  const vtSeconds = options.vtSeconds ?? VISIBILITY_TIMEOUT_SECONDS;
  const log = options.log ?? logStep;

  let processed = 0;
  let failed = 0;
  let batches = 0;

  while (batches < maxBatches) {
    batches += 1;

    const { data: messages, error: readError } = await client.read(
      queueName,
      batchSize,
      vtSeconds,
    );

    if (readError) {
      log("queue-read-error", {
        queue: queueName,
        batch: batches,
        error: readError.message,
        code: readError.code,
      });
      break;
    }

    const batch = messages ?? [];
    if (batch.length === 0) {
      break;
    }

    log("batch-fetched", { queue: queueName, batch: batches, messages: batch.length });

    for (const msg of batch) {
      const payload = msg.message ?? {};

      try {
        const invokeResult = await client.invoke(queueName, payload);

        if (invokeResult.error && !invokeResult.permanentFailure) {
          failed += 1;
          log("invoke-failed", {
            queue: queueName,
            msg_id: msg.msg_id,
            read_ct: msg.read_ct,
            error: invokeResult.error.message,
          });
          continue;
        }

        if (invokeResult.permanentFailure) {
          log("invoke-permanent-failure", {
            queue: queueName,
            msg_id: msg.msg_id,
            error: invokeResult.error?.message,
          });
          failed += 1;
        }

        const { error: deleteError } = await client.deleteMessage(queueName, msg.msg_id);

        if (deleteError) {
          failed += 1;
          log("delete-failed", {
            queue: queueName,
            msg_id: msg.msg_id,
            error: deleteError.message,
          });
          continue;
        }

        if (!invokeResult.permanentFailure) {
          processed += 1;
        }
      } catch (err) {
        failed += 1;
        log("processing-exception", {
          queue: queueName,
          msg_id: msg.msg_id,
          read_ct: msg.read_ct,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (batch.length < batchSize) {
      break;
    }
  }

  return { processed, failed, batches };
}

/**
 * Drain all configured queues. Exported for deno tests.
 * Prefer draining exports before notifications so heavy export work gets a
 * fair share of the invocation budget when both queues are busy.
 */
export async function runDrainLoop(
  client: DrainClient,
  options: {
    maxBatches?: number;
    batchSize?: number;
    vtSeconds?: number;
    queues?: string[];
    log?: (step: string, details?: Record<string, unknown>) => void;
  } = {},
): Promise<DrainResult> {
  const queues = options.queues ?? [EXPORTS_QUEUE_NAME, NOTIFICATIONS_QUEUE];
  const perQueue: DrainResult["queues"] = {};
  let processed = 0;
  let failed = 0;
  let batches = 0;

  for (const queueName of queues) {
    const result = await runDrainLoopForQueue(client, queueName, options);
    perQueue[queueName] = result;
    processed += result.processed;
    failed += result.failed;
    batches += result.batches;
  }

  return { processed, failed, batches, queues: perQueue };
}

if (import.meta.main) {
  Deno.serve(withCorrelationId(async (req, ctx) => {
    const corsResponse = handleCorsPreflightIfNeeded(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405);
    }

    const supabaseUrl = requireSecret("SUPABASE_URL", { functionName: FUNCTION_NAME });
    const serviceRoleKey = requireSecret("SUPABASE_SERVICE_ROLE_KEY", { functionName: FUNCTION_NAME });

    if (!validateServiceRoleAuth(req)) {
      logStep("auth-rejected", { correlation_id: ctx.correlationId });
      return createErrorResponse("Unauthorized", 401);
    }

    logStep("drain-started", {
      correlation_id: ctx.correlationId,
      queues: [EXPORTS_QUEUE_NAME, NOTIFICATIONS_QUEUE],
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
      queues: result.queues,
      elapsed_ms: elapsedMs,
    });

    return createJsonResponse({
      success: true,
      processed: result.processed,
      failed: result.failed,
      batches: result.batches,
      queues: result.queues,
      elapsed_ms: elapsedMs,
    });
  }));
}
