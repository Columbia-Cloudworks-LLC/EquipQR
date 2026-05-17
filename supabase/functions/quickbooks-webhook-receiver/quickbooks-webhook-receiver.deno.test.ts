import { assertEquals } from "jsr:@std/assert@1";
import {
  computeIntuitSignature,
  verifyIntuitSignature,
} from "./webhook-helpers.ts";

Deno.test("verifyIntuitSignature accepts a valid Intuit HMAC signature", async () => {
  const payload = JSON.stringify({
    eventNotifications: [{ realmId: "realm-1", dataChangeEvent: { entities: [] } }],
  });
  const verifier = "test-verifier-token";
  const signature = await computeIntuitSignature(payload, verifier);

  assertEquals(await verifyIntuitSignature(payload, signature, verifier), true);
});

Deno.test("verifyIntuitSignature rejects invalid or missing signatures", async () => {
  const payload = "{}";
  const verifier = "test-verifier-token";

  assertEquals(await verifyIntuitSignature(payload, "invalid", verifier), false);
  assertEquals(await verifyIntuitSignature(payload, null, verifier), false);
});
