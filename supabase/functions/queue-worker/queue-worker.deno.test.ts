import { assertEquals } from "jsr:@std/assert@1";
import {
  type DrainClient,
  type DrainResult,
  type QueueMessage,
  runDrainLoop,
} from "./index.ts";

/**
 * Drain-loop contract tests for `queue-worker`.
 *
 * The drain loop must:
 *   1. read → invoke → delete each message exactly once on success
 *   2. read → invoke → SKIP delete on invoke failure (so pgmq's vt timeout
 *      makes the message eligible for retry on the next cron tick)
 *   3. read → invoke → delete-failed leaves the message visible too (the
 *      message will be re-delivered, but send-push-notification is idempotent
 *      enough that double-delivery is a soft failure)
 *   4. exit early when the queue returns fewer messages than batch_size,
 *      to avoid a wasted "is the queue empty?" read RPC
 *   5. exit when the read RPC errors (infrastructural failure — wait for
 *      next cron tick rather than burning the rest of the budget)
 *
 * These tests stub the supabase-js client behind the small DrainClient
 * interface so we never touch the real Supabase or supabase-js runtime.
 */

const SAMPLE_MESSAGE = (
  msgId: number,
  body: Record<string, unknown> = { hello: "world" },
): QueueMessage => ({
  msg_id: msgId,
  read_ct: 1,
  enqueued_at: "2026-05-03T18:00:00Z",
  vt: "2026-05-03T18:01:00Z",
  message: body,
});

interface CallLog {
  reads: { qty: number; vt: number }[];
  invokes: { payload: Record<string, unknown> }[];
  deletes: { msgId: number }[];
}

function buildStubClient(
  batches: QueueMessage[][],
  options: {
    invokeError?: { message: string };
    deleteError?: { message: string };
    readError?: { message: string; code?: string };
  } = {},
): { client: DrainClient; calls: CallLog } {
  const calls: CallLog = { reads: [], invokes: [], deletes: [] };
  let batchIdx = 0;

  const client: DrainClient = {
    read: (qty, vt) => {
      calls.reads.push({ qty, vt });
      if (options.readError) {
        return Promise.resolve({ data: null, error: options.readError });
      }
      const next = batches[batchIdx] ?? [];
      batchIdx += 1;
      return Promise.resolve({ data: next, error: null });
    },
    invoke: (payload) => {
      calls.invokes.push({ payload });
      return Promise.resolve({ error: options.invokeError ?? null });
    },
    deleteMessage: (msgId) => {
      calls.deletes.push({ msgId });
      return Promise.resolve({ error: options.deleteError ?? null });
    },
  };

  return { client, calls };
}

const silentLog = (_step: string, _details?: Record<string, unknown>): void => {
  // suppress structured logs during tests so the runner output stays clean
};

Deno.test(
  "happy path: each message produces read + invoke + delete exactly once, then queue drains",
  async () => {
    const { client, calls } = buildStubClient([
      [SAMPLE_MESSAGE(1), SAMPLE_MESSAGE(2), SAMPLE_MESSAGE(3)],
    ]);

    const result: DrainResult = await runDrainLoop(client, {
      maxBatches: 5,
      batchSize: 10,
      vtSeconds: 60,
      log: silentLog,
    });

    assertEquals(result.processed, 3);
    assertEquals(result.failed, 0);
    assertEquals(
      result.batches,
      1,
      "Loop should exit after the first batch because batch.length (3) < batchSize (10).",
    );

    assertEquals(
      calls.reads.length,
      1,
      "Exactly one read; the early-exit branch should prevent a second read.",
    );
    assertEquals(calls.invokes.length, 3, "One invoke per message.");
    assertEquals(calls.deletes.length, 3, "One delete per successful invoke.");
    assertEquals(
      calls.deletes.map((d) => d.msgId).sort((a, b) => a - b),
      [1, 2, 3],
      "Each msg_id should be deleted exactly once.",
    );
  },
);

Deno.test(
  "invoke failure: message is NOT deleted (left for vt-driven retry)",
  async () => {
    const { client, calls } = buildStubClient(
      [[SAMPLE_MESSAGE(1)]],
      { invokeError: { message: "send-push-notification 500" } },
    );

    const result = await runDrainLoop(client, {
      maxBatches: 5,
      batchSize: 10,
      vtSeconds: 60,
      log: silentLog,
    });

    assertEquals(result.processed, 0);
    assertEquals(result.failed, 1);
    assertEquals(calls.invokes.length, 1, "Invoke is attempted once.");
    assertEquals(
      calls.deletes.length,
      0,
      "Delete must NOT be called when invoke fails — pgmq vt makes the message visible again for retry.",
    );
  },
);

Deno.test(
  "delete failure after successful invoke: counts as failed but does not throw",
  async () => {
    const { client, calls } = buildStubClient(
      [[SAMPLE_MESSAGE(7)]],
      { deleteError: { message: "delete RPC 500" } },
    );

    const result = await runDrainLoop(client, {
      maxBatches: 5,
      batchSize: 10,
      vtSeconds: 60,
      log: silentLog,
    });

    assertEquals(result.processed, 0);
    assertEquals(result.failed, 1);
    assertEquals(calls.invokes.length, 1);
    assertEquals(
      calls.deletes.length,
      1,
      "Delete is attempted once even though it errored — the loop should not retry the same delete.",
    );
  },
);

Deno.test(
  "multi-batch path: full batch then a partial batch terminates correctly",
  async () => {
    const fullBatch = Array.from({ length: 5 }, (_, i) => SAMPLE_MESSAGE(i + 1));
    const partialBatch = [SAMPLE_MESSAGE(6), SAMPLE_MESSAGE(7)];
    const { client, calls } = buildStubClient([fullBatch, partialBatch]);

    const result = await runDrainLoop(client, {
      maxBatches: 10,
      batchSize: 5,
      vtSeconds: 60,
      log: silentLog,
    });

    assertEquals(result.processed, 7, "All 7 messages drained successfully.");
    assertEquals(result.failed, 0);
    assertEquals(result.batches, 2, "Two batches before early-exit.");
    assertEquals(
      calls.reads.length,
      2,
      "Two read RPCs — one per batch — and no extra read after the partial batch.",
    );
    assertEquals(calls.invokes.length, 7);
    assertEquals(calls.deletes.length, 7);
  },
);

Deno.test(
  "read error: drain loop exits without invoking or deleting anything",
  async () => {
    const { client, calls } = buildStubClient(
      [[SAMPLE_MESSAGE(99)]],
      { readError: { message: "pgmq.read RPC 503", code: "503" } },
    );

    const result = await runDrainLoop(client, {
      maxBatches: 5,
      batchSize: 10,
      vtSeconds: 60,
      log: silentLog,
    });

    assertEquals(result.processed, 0);
    assertEquals(result.failed, 0);
    assertEquals(result.batches, 1, "Loop counts the batch attempt before bailing.");
    assertEquals(calls.reads.length, 1);
    assertEquals(
      calls.invokes.length,
      0,
      "Invoke must not run if the read failed.",
    );
    assertEquals(
      calls.deletes.length,
      0,
      "Delete must not run if the read failed.",
    );
  },
);

Deno.test(
  "max-batches cap: loop stops before processing the full queue when the cap is small",
  async () => {
    // Three full batches — but cap is 2.
    const fullBatch = (offset: number) =>
      Array.from({ length: 5 }, (_, i) => SAMPLE_MESSAGE(offset + i + 1));
    const { client, calls } = buildStubClient([
      fullBatch(0),
      fullBatch(5),
      fullBatch(10),
    ]);

    const result = await runDrainLoop(client, {
      maxBatches: 2,
      batchSize: 5,
      vtSeconds: 60,
      log: silentLog,
    });

    assertEquals(result.processed, 10, "Two full batches × 5 messages each.");
    assertEquals(result.batches, 2, "Cap reached after batch 2.");
    assertEquals(calls.reads.length, 2);
    assertEquals(
      calls.invokes.length,
      10,
      "Third batch should never have been read or invoked.",
    );
  },
);
