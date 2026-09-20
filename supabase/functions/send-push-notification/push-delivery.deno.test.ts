import { assertEquals } from "jsr:@std/assert@1";
import { stub } from "jsr:@std/testing@1/mock";
import webpush from "npm:web-push@3.6.7";
import { handlePushNotification } from "./index.ts";
import { runDrainLoopForQueue, type QueueMessage } from "../queue-worker/index.ts";

const payload = {
  user_id: "00000000-0000-0000-0000-000000000001",
  title: "Work Order Assigned",
  body: "A work order has been assigned.",
  data: { notification_id: "test-notification" },
};

async function withDelivery(
  outcomes: (number | "network" | "misleading-message")[],
  verify: (call: () => Promise<Response>, deleted: string[], sent: string[]) => Promise<void>,
  options: { preferenceError?: boolean; disabled?: boolean; cleanupError?: boolean } = {},
) {
  const keys = webpush.generateVAPIDKeys();
  const env = {
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    VAPID_PUBLIC_KEY: keys.publicKey,
    VAPID_PRIVATE_KEY: keys.privateKey,
    VAPID_SUBJECT: "mailto:test@example.com",
  };
  const previous = new Map(Object.keys(env).map((key) => [key, Deno.env.get(key)]));
  for (const [key, value] of Object.entries(env)) Deno.env.set(key, value);
  const deleted: string[] = [];
  const sent: string[] = [];
  const subscriptions = outcomes.map((_, index) => ({
    id: `device-${index}`, endpoint: `https://push.example.com/${index}`, p256dh: "test", auth: "test",
  }));
  const fetchStub = stub(globalThis, "fetch", (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    if (url.pathname.endsWith("/notification_preferences")) {
      return Promise.resolve(Response.json(
        options.preferenceError ? { message: "unavailable" } : { push_notifications: !options.disabled },
        { status: options.preferenceError ? 503 : 200 },
      ));
    }
    if (url.pathname.endsWith("/push_subscriptions")) {
      if (method === "DELETE") {
        deleted.push(url.searchParams.get("id") ?? "");
        return Promise.resolve(new Response(null, { status: options.cleanupError ? 503 : 204 }));
      }
      return Promise.resolve(Response.json(subscriptions));
    }
    throw new Error(`Unexpected network request: ${url.pathname}`);
  });
  const pushStub = stub(webpush, "sendNotification", (subscription) => {
    sent.push(subscription.endpoint);
    const index = Number(new URL(subscription.endpoint).pathname.slice(1));
    const outcome = outcomes[index];
    if (outcome === 201) return Promise.resolve({ statusCode: 201, body: "", headers: {} });
    const error = new Error(outcome === "misleading-message" ? "Upstream request 410 timed out" : "Push request failed");
    if (typeof outcome === "number") Object.assign(error, { statusCode: outcome });
    return Promise.reject(error);
  });
  try {
    await verify(() => handlePushNotification(new Request("http://localhost/push", {
      method: "POST", headers: { Authorization: "Bearer test-service-key", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })), deleted, sent);
  } finally {
    pushStub.restore();
    fetchStub.restore();
    for (const [key, value] of previous) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
}

for (const failure of [429, 503, "network", "misleading-message"] as const) {
  Deno.test(`push failure ${failure} remains retryable and does not delete subscriptions`, async () => {
    await withDelivery([failure], async (call, deleted) => {
      assertEquals((await call()).status, 503);
      assertEquals(deleted, []);
    });
  });
}

Deno.test("mixed success and failure retains the queue message until recovery", async () => {
  const outcomes = [201, 503];
  await withDelivery(outcomes, async (call) => {
    const message: QueueMessage = {
      msg_id: 42, read_ct: 1, enqueued_at: "2026-09-20T00:00:00Z", vt: "2026-09-20T00:01:00Z",
      message: payload, headers: null,
    };
    const deleted: number[] = [];
    const client = {
      read: () => Promise.resolve({ data: [message], error: null }),
      invoke: async () => {
        const response = await call();
        return { error: response.ok ? null : { message: `HTTP ${response.status}` } };
      },
      deleteMessage: (_queue: string, id: number) => {
        deleted.push(id);
        return Promise.resolve({ error: null });
      },
      archiveMessage: () => Promise.reject(new Error("Unexpected archive before retry limit")),
    };
    const first = await runDrainLoopForQueue(client, "notifications", { maxBatches: 1, log: () => {} });
    assertEquals(first.failed, 1);
    assertEquals(deleted, []);
    outcomes[1] = 201;
    const retry = await runDrainLoopForQueue(client, "notifications", { maxBatches: 1, log: () => {} });
    assertEquals(retry.processed, 1);
    assertEquals(deleted, [42]);
  });
});

Deno.test("404 and 410 expire subscriptions and allow the queue to acknowledge", async () => {
  await withDelivery([404, 410, 201], async (call, deleted) => {
    const response = await call();
    assertEquals(response.status, 200);
    assertEquals(await response.json(), { success: true, sent: 1, failed: 2, cleaned: 2 });
    assertEquals(deleted, ["in.(device-0,device-1)"]);
  });
});

Deno.test("preference lookup failures retry without sending against an unknown opt-out", async () => {
  await withDelivery([201], async (call, _deleted, sent) => {
    assertEquals((await call()).status, 503);
    assertEquals(sent, []);
  }, { preferenceError: true });
});

Deno.test("explicit push opt-out acknowledges without sending", async () => {
  await withDelivery([201], async (call, _deleted, sent) => {
    assertEquals((await call()).status, 200);
    assertEquals(sent, []);
  }, { disabled: true });
});

Deno.test("no registered devices is an intentional acknowledgement", async () => {
  await withDelivery([], async (call, _deleted, sent) => {
    assertEquals((await call()).status, 200);
    assertEquals(sent, []);
  });
});

Deno.test("expired-subscription cleanup failures preserve retry", async () => {
  await withDelivery([410], async (call) => {
    assertEquals((await call()).status, 503);
  }, { cleanupError: true });
});
