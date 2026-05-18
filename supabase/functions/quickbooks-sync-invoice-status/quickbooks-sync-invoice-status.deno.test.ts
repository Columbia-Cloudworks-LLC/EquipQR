import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  deriveQuickBooksInvoiceStatus,
  type QuickBooksInvoice,
} from "../quickbooks-export-invoice/qbo-invoice-payload.ts";
import { updateMirroredWorkOrders } from "./mirror-work-orders.ts";
import {
  extractLinkedInvoiceIdsFromPayment,
  fetchPayment,
  type QuickBooksPayment,
} from "./payment-linked-invoices.ts";
import { __syncTestables } from "./index.ts";

const { refreshTokenIfNeeded, claimInvoiceEvents, EVENT_BATCH_SIZE, markEvent } = __syncTestables;

/** Records update payload and chained `.eq()` filters for service-role credential writes. */
function createQuickBooksCredentialUpdateMock(opts?: { persistError?: { message: string } }) {
  let payload: Record<string, unknown> = {};
  const eqFilters: Array<[string, unknown]> = [];
  return {
    from: (_table: string) => ({
      update: (p: Record<string, unknown>) => {
        payload = { ...p };
        return {
          eq: (col: string, val: unknown) => {
            eqFilters.push([col, val]);
            return {
              eq: (col2: string, val2: unknown) => {
                eqFilters.push([col2, val2]);
                return Promise.resolve({
                  error: opts?.persistError ?? null,
                });
              },
            };
          },
        };
      },
    }),
    get capturedPayload() {
      return payload;
    },
    get eqFilters() {
      return eqFilters;
    },
  };
}

type UpdateCapture = {
  payload: Record<string, unknown>;
  hasSentNullGuard: boolean;
  hasPaidNullGuard: boolean;
};

function createWorkOrderUpdateMock() {
  const updates: UpdateCapture[] = [];
  function from(_table: string) {
    let payload: Record<string, unknown> = {};
    let sentGuard = false;
    let paidGuard = false;
    let recorded = false;
    const capture = () => {
      if (recorded) return;
      recorded = true;
      updates.push({
        payload: { ...payload },
        hasSentNullGuard: sentGuard,
        hasPaidNullGuard: paidGuard,
      });
    };
    const builder: any = {
      update(p: Record<string, unknown>) {
        payload = { ...p };
        recorded = false;
        sentGuard = false;
        paidGuard = false;
        return builder;
      },
      eq(_c: string, _v: unknown) {
        return builder;
      },
      is(col: string, val: unknown) {
        if (col === "invoice_sent_at" && val === null) sentGuard = true;
        if (col === "invoice_paid_at" && val === null) paidGuard = true;
        return builder;
      },
      select(_s?: string) {
        capture();
        return Promise.resolve({ data: [{ id: "wo-1" }], error: null });
      },
    };
    builder.then = (resolve: (v: unknown) => unknown) => {
      capture();
      return Promise.resolve({ error: null }).then(resolve);
    };
    return builder;
  }
  return { from, updates };
}

Deno.test("deriveQuickBooksInvoiceStatus treats void webhook operations as voided", () => {
  assertEquals(
    deriveQuickBooksInvoiceStatus({ Balance: 100, TotalAmt: 100 }, "Void"),
    "voided",
  );
});

Deno.test("deriveQuickBooksInvoiceStatus treats zero balance invoices as paid", () => {
  assertEquals(
    deriveQuickBooksInvoiceStatus({ Balance: 0, TotalAmt: 100, EmailStatus: "EmailSent" }),
    "paid",
  );
});

Deno.test("deriveQuickBooksInvoiceStatus does not mark paid when Balance is missing despite TotalAmt > 0", () => {
  assertEquals(deriveQuickBooksInvoiceStatus({ TotalAmt: 100 }), "draft");
  assertEquals(
    deriveQuickBooksInvoiceStatus({ TotalAmt: 100, EmailStatus: "EmailSent" }),
    "sent",
  );
});

Deno.test("deriveQuickBooksInvoiceStatus does not use overdue when monetary fields are incomplete", () => {
  assertEquals(
    deriveQuickBooksInvoiceStatus(
      { DueDate: "2026-01-01" },
      undefined,
      new Date("2026-05-17T00:00:00Z"),
    ),
    "draft",
  );
});

Deno.test("updateMirroredWorkOrders omits invoice timestamps from main payload and null-guards paid_at", async () => {
  const { from, updates } = createWorkOrderUpdateMock();
  await updateMirroredWorkOrders({ from } as unknown as SupabaseClient, {
    organizationId: "org-1",
    realmId: "realm-1",
    invoice: {
      Id: "inv-1",
      Balance: 0,
      TotalAmt: 100,
      EmailStatus: "EmailSent",
    } as QuickBooksInvoice,
  });

  assertEquals(updates.length >= 2, true);
  assertEquals("invoice_paid_at" in updates[0]!.payload, false);
  assertEquals("invoice_sent_at" in updates[0]!.payload, false);
  const paidFollowUp = updates.find((u) => "invoice_paid_at" in u.payload);
  assertEquals(paidFollowUp !== undefined, true);
  assertEquals(paidFollowUp!.hasPaidNullGuard, true);
});

Deno.test("updateMirroredWorkOrders null-guards invoice_sent_at when status is sent", async () => {
  const { from, updates } = createWorkOrderUpdateMock();
  await updateMirroredWorkOrders({ from } as unknown as SupabaseClient, {
    organizationId: "org-1",
    realmId: "realm-1",
    invoice: {
      Id: "inv-2",
      Balance: 50,
      TotalAmt: 50,
      EmailStatus: "EmailSent",
    } as QuickBooksInvoice,
  });

  const sentFollowUp = updates.find((u) => "invoice_sent_at" in u.payload);
  assertEquals(sentFollowUp !== undefined, true);
  assertEquals(sentFollowUp!.hasSentNullGuard, true);
});

Deno.test("updateMirroredWorkOrders first-writes invoice_sent_at for emailed paid invoices", async () => {
  const { from, updates } = createWorkOrderUpdateMock();
  await updateMirroredWorkOrders({ from } as unknown as SupabaseClient, {
    organizationId: "org-1",
    realmId: "realm-1",
    invoice: {
      Id: "inv-3",
      Balance: 0,
      TotalAmt: 100,
      EmailStatus: "EmailSent",
    } as QuickBooksInvoice,
  });

  const sentFollowUp = updates.find((u) => "invoice_sent_at" in u.payload);
  assertEquals(sentFollowUp !== undefined, true, "invoice_sent_at should be first-written for emailed paid invoices");
  assertEquals(sentFollowUp!.hasSentNullGuard, true);
});

Deno.test("updateMirroredWorkOrders does not write invoice_sent_at for voided emailed invoices", async () => {
  const { from, updates } = createWorkOrderUpdateMock();
  await updateMirroredWorkOrders({ from } as unknown as SupabaseClient, {
    organizationId: "org-1",
    realmId: "realm-1",
    invoice: {
      Id: "inv-4",
      Balance: 50,
      TotalAmt: 50,
      EmailStatus: "EmailSent",
    } as QuickBooksInvoice,
    operation: "Void",
  });

  const sentFollowUp = updates.find((u) => "invoice_sent_at" in u.payload);
  assertEquals(sentFollowUp, undefined, "voided invoices should not write invoice_sent_at");
});

Deno.test("fetchPayment returns both payment and intuitTid from response header", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify({ Payment: { Id: "pay-99", Line: [] } }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            intuit_tid: "tid-abc-123",
          },
        }),
      );

    const { payment, intuitTid } = await fetchPayment("token", "realm-1", "pay-99");
    assertEquals(payment.Id, "pay-99");
    assertEquals(intuitTid, "tid-abc-123");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("fetchPayment includes intuit_tid in error message when response is not ok", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response("Unauthorized", {
          status: 401,
          headers: { intuit_tid: "tid-err-456" },
        }),
      );

    let thrown = false;
    try {
      await fetchPayment("token", "realm-1", "pay-1");
    } catch (e) {
      thrown = true;
      const msg = e instanceof Error ? e.message : String(e);
      assertEquals(msg.includes("tid-err-456"), true);
    }
    assertEquals(thrown, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("extractLinkedInvoiceIdsFromPayment collects unique Invoice-linked TxnIds across lines", () => {
  const payment: QuickBooksPayment = {
    Id: "pay-1",
    Line: [
      {
        LinkedTxn: [
          { TxnId: "70", TxnType: "Invoice" },
          { TxnId: "70", TxnType: "Invoice" },
        ],
      },
      {
        LinkedTxn: [
          { TxnId: "71", TxnType: "invoice" },
        ],
      },
    ],
  };
  assertEquals(extractLinkedInvoiceIdsFromPayment(payment), ["70", "71"]);
});

Deno.test("extractLinkedInvoiceIdsFromPayment ignores non-Invoice linked types and blank ids", () => {
  const payment: QuickBooksPayment = {
    Line: [
      {
        LinkedTxn: [
          { TxnId: "80", TxnType: "CreditMemo" },
          { TxnId: "  ", TxnType: "Invoice" },
          { TxnId: "81", TxnType: "Invoice" },
        ],
      },
    ],
  };
  assertEquals(extractLinkedInvoiceIdsFromPayment(payment), ["81"]);
});

Deno.test("extractLinkedInvoiceIdsFromPayment returns empty when no Invoice links", () => {
  assertEquals(extractLinkedInvoiceIdsFromPayment({}), []);
  assertEquals(extractLinkedInvoiceIdsFromPayment({ Line: [] }), []);
  assertEquals(
    extractLinkedInvoiceIdsFromPayment({
      Line: [{ LinkedTxn: [{ TxnId: "1", TxnType: "Check" }] }],
    }),
    [],
  );
});

Deno.test("refreshTokenIfNeeded returns current access_token without refresh when still valid", async () => {
  const futureExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const credential = {
    id: "cred-1",
    organization_id: "org-1",
    realm_id: "realm-1",
    access_token: "current-access-token",
    refresh_token: "current-refresh-token",
    access_token_expires_at: futureExpiry,
    refresh_token_expires_at: futureExpiry,
  };
  const fakeClient = { from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }) };

  const result = await refreshTokenIfNeeded(credential, fakeClient as unknown as SupabaseClient, "client-id", "client-secret");
  assertEquals(result.accessToken, "current-access-token");
  assertEquals(result.credential, credential);
});

Deno.test("refreshTokenIfNeeded returns rotated tokens and updated in-memory credential after refresh", async () => {
  const expiredExpiry = new Date(Date.now() - 60 * 1000).toISOString();
  const futureRefresh = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const credential = {
    id: "cred-2",
    organization_id: "org-2",
    realm_id: "realm-2",
    access_token: "old-access-token",
    refresh_token: "old-refresh-token",
    access_token_expires_at: expiredExpiry,
    refresh_token_expires_at: futureRefresh,
  };

  const mock = createQuickBooksCredentialUpdateMock();

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
            token_type: "bearer",
            expires_in: 3600,
            x_refresh_token_expires_in: 8726400,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const result = await refreshTokenIfNeeded(credential, mock as unknown as SupabaseClient, "client-id", "client-secret");

    assertEquals(result.accessToken, "new-access-token");
    assertEquals(result.credential.access_token, "new-access-token");
    assertEquals(result.credential.refresh_token, "new-refresh-token");
    assertEquals(result.credential.id, "cred-2");
    assertEquals(mock.capturedPayload.access_token, "new-access-token");
    assertEquals(mock.capturedPayload.refresh_token, "new-refresh-token");
    assertEquals(mock.eqFilters, [["id", "cred-2"], ["organization_id", "org-2"]]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("refreshTokenIfNeeded throws when QuickBooks token refresh succeeds but credential persistence fails", async () => {
  const expiredExpiry = new Date(Date.now() - 60 * 1000).toISOString();
  const futureRefresh = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const credential = {
    id: "cred-3",
    organization_id: "org-3",
    realm_id: "realm-3",
    access_token: "old-access-token",
    refresh_token: "old-refresh-token",
    access_token_expires_at: expiredExpiry,
    refresh_token_expires_at: futureRefresh,
  };

  const mock = createQuickBooksCredentialUpdateMock({
    persistError: { message: "simulated quickbooks_credentials update failure" },
  });

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
            token_type: "bearer",
            expires_in: 3600,
            x_refresh_token_expires_in: 8726400,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    await assertRejects(
      async () =>
        await refreshTokenIfNeeded(credential, mock as unknown as SupabaseClient, "client-id", "client-secret"),
      Error,
      "QuickBooks credential persistence failed:",
    );
    assertEquals(mock.eqFilters, [["id", "cred-3"], ["organization_id", "org-3"]]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("claimInvoiceEvents calls claim RPC with EVENT_BATCH_SIZE and returns rows", async () => {
  let rpcName = "";
  let rpcArgs: Record<string, unknown> = {};
  const fakeClient = {
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcName = name;
      rpcArgs = args;
      return Promise.resolve({
        data: [
          {
            id: "evt-1",
            organization_id: "org-1",
            realm_id: "realm-1",
            entity_name: "Invoice",
            entity_id: "inv-1",
            operation: "Update",
            attempts: 1,
          },
        ],
        error: null,
      });
    },
  };

  const rows = await claimInvoiceEvents(fakeClient as unknown as SupabaseClient);
  assertEquals(rpcName, "claim_quickbooks_invoice_status_events");
  assertEquals(rpcArgs.p_batch_size, EVENT_BATCH_SIZE);
  assertEquals(rows.length, 1);
  assertEquals(rows[0]!.id, "evt-1");
});

Deno.test("claimInvoiceEvents throws when RPC returns an error", async () => {
  const fakeClient = {
    rpc: () =>
      Promise.resolve({
        data: null,
        error: { message: "simulated claim failure" },
      }),
  };

  await assertRejects(
    async () => await claimInvoiceEvents(fakeClient as unknown as SupabaseClient),
    Error,
    "simulated claim failure",
  );
});

Deno.test("markEvent throws when quickbooks_invoice_status_events update fails", async () => {
  const fakeClient = {
    from: (_table: string) => ({
      update: (_payload: Record<string, unknown>) => ({
        eq: (_col: string, _val: unknown) =>
          Promise.resolve({ error: { message: "simulated mark failure" } }),
      }),
    }),
  };

  await assertRejects(
    async () => await markEvent(fakeClient as unknown as SupabaseClient, "evt-mark-1", "processed"),
    Error,
    "Failed to mark invoice status event evt-mark-1:",
  );
});
