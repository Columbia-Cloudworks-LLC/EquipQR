import { assertEquals } from "jsr:@std/assert@1";
import {
  type DrainClient,
  type DrainResult,
  type QueueMessage,
  runDrainLoop,
  runDrainLoopForQueue,
} from "./index.ts";

/**
 * Drain-loop contract tests for `queue-worker` (notifications + exports).
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
  headers: null,
});

interface CallLog {
  reads: { queueName: string; qty: number; vt: number }[];
  invokes: { queueName: string; payload: Record<string, unknown> }[];
  deletes: { queueName: string; msgId: number }[];
}

function buildStubClient(
  batchesByQueue: Record<string, QueueMessage[][]>,
  options: {
    invokeError?: { message: string };
    permanentFailure?: boolean;
    deleteError?: { message: string };
    readError?: { message: string; code?: string };
  } = {},
): { client: DrainClient; calls: CallLog } {
  const calls: CallLog = { reads: [], invokes: [], deletes: [] };
  const batchIdx: Record<string, number> = {};

  const client: DrainClient = {
    read: (queueName, qty, vt) => {
      calls.reads.push({ queueName, qty, vt });
      if (options.readError) {
        return Promise.resolve({ data: null, error: options.readError });
      }
      const idx = batchIdx[queueName] ?? 0;
      batchIdx[queueName] = idx + 1;
      const batches = batchesByQueue[queueName] ?? [];
      const next = batches[idx] ?? [];
      return Promise.resolve({ data: next, error: null });
    },
    invoke: (queueName, payload) => {
      calls.invokes.push({ queueName, payload });
      if (options.invokeError) {
        return Promise.resolve({
          error: options.invokeError,
          permanentFailure: options.permanentFailure,
        });
      }
      return Promise.resolve({ error: null });
    },
    deleteMessage: (queueName, msgId) => {
      calls.deletes.push({ queueName, msgId });
      return Promise.resolve({ error: options.deleteError ?? null });
    },
  };

  return { client, calls };
}

const silentLog = (_step: string, _details?: Record<string, unknown>): void => {
  // suppress structured logs during tests
};

Deno.test(
  "happy path: each message produces read + invoke + delete exactly once, then queue drains",
  async () => {
    const { client, calls } = buildStubClient({
      notifications: [[SAMPLE_MESSAGE(1), SAMPLE_MESSAGE(2), SAMPLE_MESSAGE(3)]],
    });

    const result = await runDrainLoopForQueue(client, "notifications", {
      maxBatches: 5,
      batchSize: 10,
      vtSeconds: 60,
      log: silentLog,
    });

    assertEquals(result.processed, 3);
    assertEquals(result.failed, 0);
    assertEquals(calls.invokes.length, 3);
    assertEquals(calls.deletes.map((d) => d.msgId), [1, 2, 3]);
  },
);

Deno.test(
  "invoke failure without permanentFailure skips delete (retry via vt)",
  async () => {
    const { client, calls } = buildStubClient(
      { notifications: [[SAMPLE_MESSAGE(10)]] },
      { invokeError: { message: "downstream 500" } },
    );

    const result = await runDrainLoopForQueue(client, "notifications", {
      maxBatches: 2,
      batchSize: 10,
      log: silentLog,
    });

    assertEquals(result.processed, 0);
    assertEquals(result.failed, 1);
    assertEquals(calls.deletes.length, 0);
  },
);

Deno.test(
  "permanentFailure ACKs (deletes) so poison messages do not retry forever",
  async () => {
    const { client, calls } = buildStubClient(
      { exports: [[SAMPLE_MESSAGE(42, { export_log_id: "x" })]] },
      { invokeError: { message: "invalid payload" }, permanentFailure: true },
    );

    const result = await runDrainLoopForQueue(client, "exports", {
      maxBatches: 2,
      batchSize: 10,
      log: silentLog,
    });

    assertEquals(result.processed, 0);
    assertEquals(result.failed, 1);
    assertEquals(calls.deletes.length, 1);
    assertEquals(calls.deletes[0]?.msgId, 42);
  },
);

Deno.test(
  "multi-queue drain processes exports then notifications",
  async () => {
    const { client, calls } = buildStubClient({
      exports: [[SAMPLE_MESSAGE(1, { export_log_id: "a" })]],
      notifications: [[SAMPLE_MESSAGE(2, { user_id: "u" })]],
    });

    const result: DrainResult = await runDrainLoop(client, {
      maxBatches: 5,
      batchSize: 10,
      log: silentLog,
      queues: ["exports", "notifications"],
    });

    assertEquals(result.processed, 2);
    assertEquals(result.queues.exports?.processed, 1);
    assertEquals(result.queues.notifications?.processed, 1);
    assertEquals(calls.reads[0]?.queueName, "exports");
    assertEquals(
      calls.reads.some((r) => r.queueName === "notifications"),
      true,
    );
  },
);

Deno.test("read error stops draining that queue", async () => {
  const { client, calls } = buildStubClient(
    { notifications: [[SAMPLE_MESSAGE(1)]] },
    { readError: { message: "extension missing", code: "42883" } },
  );

  const result = await runDrainLoopForQueue(client, "notifications", {
    maxBatches: 5,
    log: silentLog,
  });

  assertEquals(result.processed, 0);
  assertEquals(calls.invokes.length, 0);
});

Deno.test("delete failure counts as failed after successful invoke", async () => {
  const { client } = buildStubClient(
    { notifications: [[SAMPLE_MESSAGE(7)]] },
    { deleteError: { message: "delete failed" } },
  );

  const result = await runDrainLoopForQueue(client, "notifications", {
    maxBatches: 2,
    log: silentLog,
  });

  assertEquals(result.processed, 0);
  assertEquals(result.failed, 1);
});
