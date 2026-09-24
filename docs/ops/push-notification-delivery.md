# Push notification delivery

Work-order notification rows remain the durable in-app record. Background push delivery uses the `notifications` pgmq queue and the queue worker.

## Delivery and retry contract

- A successful send, explicit push opt-out, or absence of registered devices acknowledges the queued message.
- A push-provider HTTP 404 or 410 expires that device subscription. Only the numeric provider status is authoritative; digits in an error message do not expire a device.
- Other send failures, subscription lookup failures, and preference lookup failures retain the message for retry. An unavailable preference store never overrides a user's opt-out.
- Expired-subscription cleanup must succeed before the message is acknowledged.
- Notifications receive at most five delivery attempts. On the next queue read, the worker archives the message without sending it again. Export jobs keep their existing retry behavior.
- Archive failures leave the message queued, but do not trigger another push attempt after the limit.

Delivery is **at least once**. A partial failure can resend to devices that already succeeded, and browser notifications may alert again. Stable notification IDs replace the existing notification card but do not guarantee silent deduplication. The retry limit bounds this behavior; per-device delivery receipts are outside this fix.

Missing VAPID configuration continues to mean push is intentionally disabled. In-app notifications remain available. This fix does not implement email delivery, quiet hours, digests, or the preference redesign in issue #1438.

## Investigate exhausted retries

Look for the structured `notification-retries-exhausted` event in queue-worker logs. It records the message ID and read count without logging the notification payload. `notification-archive-failed` means archiving needs attention; the worker will retry archiving without sending again.

The original message is retained in the pgmq notifications archive for authorized operator inspection. Resolve the provider, device, or configuration failure before considering a deliberate replay. Replaying can alert successful devices again; do not automatically re-enqueue the archive.

## Verification and deployment

Run the push-delivery and queue-worker Deno tests with the npm dependency cache isolated from the frontend installation:

```bash
deno test --no-config --node-modules-dir=none --allow-env supabase/functions/send-push-notification/push-delivery.deno.test.ts supabase/functions/queue-worker/queue-worker.deno.test.ts
```

The tests simulate provider responses without sending external push messages. Local-stack verification and notification workflow evidence are still required before publishing. Deploy the push sender and queue worker together through the normal next-version release; preview staging does not authorize a production Edge Function deployment.
