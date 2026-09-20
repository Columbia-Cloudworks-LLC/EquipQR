/**
 * Local-only edge + database smoke for notification retry/acknowledgement.
 * Run after dev-start.bat:
 * deno run --config supabase/functions/deno.json --node-modules-dir=none
 *   --allow-env --allow-net --allow-run --allow-read dev/push-delivery-smoke.deno.ts
 * Requires local VAPID configuration; never sends to an external push endpoint.
 * The real drain loop uses a fixture-only read adapter so unrelated queued
 * notifications and the background cron remain untouched.
 */
import { execSync } from 'node:child_process';
import { createECDH, randomBytes } from 'node:crypto';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import postgres from 'npm:postgres@3.4.7';
import { runDrainLoopForQueue, type DrainClient, type QueueMessage } from '../supabase/functions/queue-worker/index.ts';

function requireLocalUrl(value: string, label: string): string {
  const parsed = new URL(value);
  if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    throw new Error(`${label} must use localhost or 127.0.0.1`);
  }
  return value;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  // Match e2e/user/shared/fresh-start-reset.ts: obtain generated local keys
  // from CLI status, never from a production environment or credential vault.
  let status: Record<string, string>;
  try {
    status = JSON.parse(execSync('npx --no-install supabase status -o json', {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000,
    }));
  } catch {
    throw new Error('Prerequisite: local Supabase CLI status must succeed after dev-start.bat');
  }
  const apiUrl = requireLocalUrl(status.API_URL ?? '', 'API_URL');
  const dbUrl = requireLocalUrl(status.DB_URL ?? '', 'DB_URL');
  const serviceKey = status.SERVICE_ROLE_KEY;
  assert(serviceKey, 'Prerequisite: local CLI status must contain SERVICE_ROLE_KEY');
  const admin = createClient(apiUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const sql = postgres(dbUrl, { max: 1, connect_timeout: 10, idle_timeout: 5 });
  let userId: string | undefined;
  let messageId: number | undefined;
  let cleaned = true;
  try {
    const created = await admin.auth.admin.createUser({
      email: `push-smoke-${crypto.randomUUID()}@example.com`,
      password: randomBytes(32).toString('base64url'), email_confirm: true,
    });
    assert(!created.error && created.data.user, 'Could not create disposable local auth fixture');
    userId = created.data.user.id;
    const key = createECDH('prime256v1');
    key.generateKeys();
    const inserted = await admin.from('push_subscriptions').insert({
      user_id: userId,
      // web-push HTTPS transport rejects this HTTP protocol before networking.
      endpoint: `http://127.0.0.1:1/push-smoke/${crypto.randomUUID()}`,
      p256dh: key.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url'),
    }).select('id').single();
    assert(!inserted.error && inserted.data, 'Could not create local subscription fixture');
    const subscriptionId = inserted.data.id;
    const payload = {
      user_id: userId, title: 'Local retry smoke', body: 'Synthetic local fixture only',
      data: { notification_id: crypto.randomUUID() },
    };
    const invoke = () => fetch(`${apiUrl}/functions/v1/send-push-notification`, {
      method: 'POST', headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(30_000),
    });
    const response = await invoke();
    const result = await response.json();
    assert(result.message !== 'Push notifications not configured', 'Prerequisite: local Edge Function VAPID keys must be configured');
    assert(response.status === 503 && result.failed === 1, 'Expected real edge transport failure to return HTTP 503');
    const retained = await admin.from('push_subscriptions').select('id').eq('id', subscriptionId).single();
    assert(!retained.error && retained.data, 'Retryable delivery must retain its subscription');

    // Delay our row immediately on insert so cron never races this smoke.
    const rows = await sql`select pgmq_public.send('notifications', ${sql.json(payload)}, 3600) as id`;
    messageId = Number(rows[0].id);
    assert(Number.isSafeInteger(messageId), 'Invalid fixture queue message ID');
    const fixtureMessageId = messageId;
    const fixtureUserId = userId;
    const client: DrainClient = {
      read: async () => {
        // Read exactly our fixture, simulate one pgmq read, and keep cron lease.
        const data = await sql`
          update pgmq.q_notifications set read_ct = read_ct + 1, vt = now() + interval '1 hour'
          where msg_id = ${fixtureMessageId} and message->>'user_id' = ${fixtureUserId}
          returning msg_id, read_ct, enqueued_at, vt, message, headers`;
        return { data: data.map(row => ({ ...row, msg_id: Number(row.msg_id) })) as QueueMessage[], error: null };
      },
      invoke: async () => {
        const edgeResponse = await invoke();
        await edgeResponse.arrayBuffer();
        return { error: edgeResponse.ok ? null : { message: `HTTP ${edgeResponse.status}` } };
      },
      deleteMessage: async (_queue, id) => {
        assert(id === messageId, 'Refusing to delete unrelated message');
        await sql`select pgmq_public.delete('notifications', ${id}::bigint)`;
        return { error: null };
      },
      archiveMessage: async () => { throw new Error('Two-attempt smoke must not reach retry archive'); },
    };
    const first = await runDrainLoopForQueue(client, 'notifications', { maxBatches: 1, log: () => {} });
    const queued = await sql`select read_ct from pgmq.q_notifications where msg_id = ${messageId}`;
    assert(first.failed === 1 && queued.length === 1 && Number(queued[0].read_ct) === 1,
      `Failed edge delivery must remain queued after one attempt: processed=${first.processed}, failed=${first.failed}, rows=${queued.length}, read_ct=${queued[0]?.read_ct}, type=${typeof queued[0]?.read_ct}`);
    const preference = await admin.from('notification_preferences').upsert({ user_id: userId, push_notifications: false }, { onConflict: 'user_id' });
    assert(!preference.error, 'Could not opt out disposable fixture');
    const retry = await runDrainLoopForQueue(client, 'notifications', { maxBatches: 1, log: () => {} });
    const remaining = await sql`select msg_id from pgmq.q_notifications where msg_id = ${messageId}`;
    assert(retry.processed === 1 && remaining.length === 0, 'Explicit opt-out must acknowledge and remove queued fixture');
    console.error('PASS: real local edge 503 retains subscription and queue row; explicit opt-out acknowledges retry.');
  } finally {
    // Delete only the exact fixture IDs created by this run, including on failure.
    if (messageId !== undefined) {
      try {
        await sql`delete from pgmq.q_notifications where msg_id = ${messageId}`;
      } catch { cleaned = false; }
    }
    if (userId) {
      const subscriptionCleanup = await admin.from('push_subscriptions').delete().eq('user_id', userId);
      const preferenceCleanup = await admin.from('notification_preferences').delete().eq('user_id', userId);
      const authCleanup = await admin.auth.admin.deleteUser(userId);
      cleaned = cleaned && !subscriptionCleanup.error && !preferenceCleanup.error && !authCleanup.error;
    }
    await sql.end({ timeout: 5 });
    assert(cleaned, `Fixture cleanup failed; inspect synthetic user ${userId ?? 'not created'} and queue message ${messageId ?? 'not created'}`);
  }
}

await main();
