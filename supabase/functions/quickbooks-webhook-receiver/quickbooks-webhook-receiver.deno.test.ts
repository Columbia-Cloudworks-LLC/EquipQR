import { assertEquals } from "jsr:@std/assert@1";
import {
  computeIntuitSignature,
  verifyIntuitSignature,
} from "./webhook-helpers.ts";
import { buildInvoiceStatusEventRows } from "./index.ts";

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

Deno.test("buildInvoiceStatusEventRows fans out one row per organization when a realm is shared", () => {
  const payload = {
    eventNotifications: [
      {
        realmId: "realm-shared",
        dataChangeEvent: {
          entities: [
            { id: "inv-1", name: "Invoice", operation: "Update", lastUpdated: "2026-05-17T12:00:00Z" },
          ],
        },
      },
    ],
  };

  const credentials = [
    { organization_id: "org-a", realm_id: "realm-shared" },
    { organization_id: "org-b", realm_id: "realm-shared" },
  ];

  const rows = buildInvoiceStatusEventRows(payload, credentials);
  assertEquals(rows.length, 2);
  assertEquals(rows.map((r) => r.organization_id).sort(), ["org-a", "org-b"].sort());
  assertEquals(rows.every((r) => r.realm_id === "realm-shared"), true);
  assertEquals(rows.every((r) => r.entity_id === "inv-1"), true);
});

Deno.test("buildInvoiceStatusEventRows skips non-Invoice/Payment entities", () => {
  const payload = {
    eventNotifications: [
      {
        realmId: "realm-1",
        dataChangeEvent: {
          entities: [
            { id: "cust-1", name: "Customer", operation: "Update" },
            { id: "pay-1", name: "Payment", operation: "Create" },
          ],
        },
      },
    ],
  };

  const rows = buildInvoiceStatusEventRows(payload, [{ organization_id: "org-1", realm_id: "realm-1" }]);
  assertEquals(rows.length, 1);
  assertEquals(rows[0]!.entity_name, "Payment");
});

Deno.test("buildInvoiceStatusEventRows returns empty when no credential matches the realm", () => {
  const payload = {
    eventNotifications: [
      {
        realmId: "realm-unknown",
        dataChangeEvent: {
          entities: [{ id: "inv-2", name: "Invoice", operation: "Update" }],
        },
      },
    ],
  };

  const rows = buildInvoiceStatusEventRows(payload, [{ organization_id: "org-1", realm_id: "realm-other" }]);
  assertEquals(rows.length, 0);
});
