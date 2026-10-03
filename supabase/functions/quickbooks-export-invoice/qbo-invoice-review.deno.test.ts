import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  calculateDueDate,
  type InvoiceConfirmation,
  type InvoiceDetails,
  InvoiceReviewError,
  isCalendarDate,
  mergeInvoiceLines,
  updateBlockingReason,
  validateConfirmation,
} from "./qbo-invoice-review.ts";
import type { QuickBooksInvoice } from "./qbo-invoice-payload.ts";
import {
  createQuickBooksInvoice,
  updateQuickBooksInvoice,
} from "./qbo-invoice-api.ts";
import type { PreparedInvoiceArtifacts } from "./qbo-export-context.ts";

const services = [{ key: "pm:123", description: "PM — Monthly" }];
const confirmation: InvoiceConfirmation = {
  source_fingerprint: "fixture",
  invoice_date: "2026-09-21",
  due_date: "2026-10-21",
  payment_term_id: null,
  service_dates: { "pm:123": "2026-08-05" },
  existing_invoice_id: null,
  existing_sync_token: null,
};
const saved: InvoiceDetails = {
  invoice_date: null,
  due_date: null,
  payment_term_id: null,
  service_dates: {},
  qb_line_ids: { "pm:123": "1", __realm_id: "realm", __invoice_id: "90" },
};
const line = {
  Id: "1",
  Amount: 600,
  DetailType: "SalesItemLineDetail" as const,
  Description: "old narrative",
  SalesItemLineDetail: {
    ItemRef: { value: "5" },
    Qty: 2,
    UnitPrice: 300,
    ServiceDate: "2026-08-05",
  },
};
const existing: QuickBooksInvoice = {
  Id: "90",
  SyncToken: "3",
  CustomerRef: { value: "32" },
  Line: [line],
  TxnDate: "2026-09-21",
  DueDate: "2026-10-21",
};
const generated = [{
  ...line,
  Id: undefined,
  Amount: 0,
  Description: "PM — Monthly",
  SalesItemLineDetail: { ...line.SalesItemLineDetail, Qty: 1, UnitPrice: 0 },
}];
Deno.test("dates reject impossible dates and preserve historical calendar dates", () => {
  assertEquals(isCalendarDate("2026-02-29"), false);
  assertEquals(isCalendarDate("2024-02-29"), true);
  assertEquals(isCalendarDate("2026-08-05T00:00:00Z"), false);
  assertEquals(
    validateConfirmation(confirmation, null, services, []).invoice_date,
    "2026-09-21",
  );
  assertThrows(
    () =>
      validateConfirmation(
        { ...confirmation, invoice_date: "" },
        null,
        services,
        [],
      ),
    InvoiceReviewError,
  );
  assertThrows(
    () =>
      validateConfirmation(
        { ...confirmation, service_dates: {} },
        null,
        services,
        [],
      ),
    InvoiceReviewError,
  );
});
Deno.test("terms use chosen invoice date including monthly cutoff and short months", () => {
  const term = {
    id: "1",
    name: "Net 30",
    due_days: 30,
    day_of_month_due: null,
    due_next_month_days: null,
  };
  assertEquals(calculateDueDate("2026-09-21", term), "2026-10-21");
  assertEquals(
    calculateDueDate("2026-01-30", {
      ...term,
      due_days: null,
      day_of_month_due: 31,
      due_next_month_days: 5,
    }),
    "2026-02-28",
  );
  assertEquals(
    calculateDueDate("2026-09-10", {
      ...term,
      due_days: null,
      day_of_month_due: 15,
      due_next_month_days: 5,
    }),
    "2026-09-15",
  );
});
Deno.test("re-export preserves manually priced lines and unrelated manual lines", () => {
  const manual = { ...line, Id: "2", Description: "Manual extra" };
  const merged = mergeInvoiceLines(
    generated,
    services,
    { ...existing, Line: [line, manual] },
    saved,
    { ...confirmation, existing_invoice_id: "90", existing_sync_token: "3" },
    "realm",
  );
  assertEquals(merged[0].Amount, 600);
  assertEquals(merged[0].SalesItemLineDetail.Qty, 2);
  assertEquals(merged[0].SalesItemLineDetail.UnitPrice, 300);
  assertEquals(merged[0].Description, "PM — Monthly");
  assertEquals(merged[1], manual);
  assertEquals(merged.length, 2);
});
Deno.test("legacy mappings, online payment delivery and stale reviews block safe update", () => {
  assertEquals(
    updateBlockingReason(
      existing,
      { ...saved, qb_line_ids: {} },
      services,
      "realm",
    )
      ?.includes("association"),
    true,
  );
  assertEquals(
    updateBlockingReason(
      { ...existing, AllowOnlineACHPayment: true },
      saved,
      services,
      "realm",
    )?.includes("delivery"),
    true,
  );
  assertThrows(
    () =>
      validateConfirmation(
        {
          ...confirmation,
          existing_invoice_id: "90",
          existing_sync_token: "2",
        },
        existing,
        services,
        [],
      ),
    InvoiceReviewError,
  );
  assertThrows(
    () =>
      validateConfirmation(
        {
          ...confirmation,
          existing_invoice_id: "90",
          existing_sync_token: "3",
          invoice_date: "2026-09-20",
        },
        existing,
        services,
        [],
      ),
    InvoiceReviewError,
  );
});
Deno.test("create sends selected dates and disables imported invoice automatic payment delivery; update is sparse", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  const bodies: QuickBooksInvoice[] = [];
  globalThis.fetch = (input, init) => {
    urls.push(String(input));
    const body = JSON.parse(String(init?.body));
    bodies.push(body);
    return Promise.resolve(
      Response.json({ Invoice: { ...body, Id: "90", SyncToken: "4" } }),
    );
  };
  try {
    const artifacts: PreparedInvoiceArtifacts = {
      invoiceLines: generated,
      privateNote: "",
      customerMemo: "",
      customFields: [],
    };
    const mapping = {
      quickbooks_customer_id: "32",
      display_name: "Customer",
      customer_account_id: null,
      cached_is_tax_exempt: null,
      tax_status_synced_at: null,
    };
    const tax = {
      verified: true,
      source: "quickbooks" as const,
      isTaxExempt: true,
    };
    await createQuickBooksInvoice(
      "token",
      "realm",
      "work-order",
      mapping,
      artifacts,
      tax,
      confirmation,
      () => {},
    );
    assertEquals(urls[0].includes("requestid=equipqr-work-order"), true);
    assertEquals(bodies[0].TxnDate, "2026-09-21");
    assertEquals(bodies[0].DueDate, "2026-10-21");
    assertEquals(bodies[0].AllowOnlineACHPayment, false);
    assertEquals(bodies[0].AllowOnlineCreditCardPayment, false);
    assertEquals(bodies[0].EmailStatus, "NotSet");

    await createQuickBooksInvoice(
      "token",
      "realm",
      "work-order",
      mapping,
      artifacts,
      tax,
      confirmation,
      () => {},
      "attempt-123",
    );
    assertEquals(urls[1].includes("requestid=equipqr-work-order-attempt-123"), true);
    await updateQuickBooksInvoice(
      "token",
      "realm",
      existing,
      mapping,
      artifacts,
      tax,
      confirmation,
      () => {},
    );
    assertEquals(bodies[2].sparse, true);
    assertEquals(bodies[2].TxnDate, undefined);
    assertEquals(bodies[2].DueDate, undefined);
    assertEquals(bodies[2].AllowOnlineACHPayment, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("line provenance rejects another company or invoice and preserves non-sales lines", () => {
  assertEquals(
    updateBlockingReason(existing, saved, services, "other-realm")?.includes(
      "association",
    ),
    true,
  );
  assertEquals(
    updateBlockingReason(
      { ...existing, Id: "other-invoice" },
      saved,
      services,
      "realm",
    )?.includes("association"),
    true,
  );
  const actualApiInvoice: QuickBooksInvoice = JSON.parse(JSON.stringify({
    ...existing,
    Line: [line, {
      Id: "2",
      DetailType: "SubTotalLineDetail",
      Amount: 600,
      SubTotalLineDetail: {},
    }, {
      Id: "3",
      DetailType: "DiscountLineDetail",
      Amount: 60,
      DiscountLineDetail: { PercentBased: true, DiscountPercent: 10 },
    }],
  }));
  const merged = mergeInvoiceLines(
    [{
      ...generated[0],
      SalesItemLineDetail: {
        ...generated[0].SalesItemLineDetail,
        TaxCodeRef: { value: "NON" },
      },
    }],
    services,
    actualApiInvoice,
    saved,
    {
      ...confirmation,
      overwrite_existing_dates: true,
      service_dates: { "pm:123": "2026-09-01" },
    },
    "realm",
  );
  assertEquals(merged[0].SalesItemLineDetail.ServiceDate, "2026-08-05");
  assertEquals(merged[0].SalesItemLineDetail.TaxCodeRef, { value: "NON" });
  assertEquals(merged.slice(1), actualApiInvoice.Line.slice(1));
});
Deno.test("source fingerprints are stable across key order and detect changed costs", async () => {
  const { invoiceSourceFingerprint } = await import("./qbo-invoice-review.ts");
  assertEquals(
    await invoiceSourceFingerprint({ cost: 100, note: "work" }),
    await invoiceSourceFingerprint({ note: "work", cost: 100 }),
  );
  assertEquals(
    await invoiceSourceFingerprint({ cost: 100 }) ===
      await invoiceSourceFingerprint({ cost: 500 }),
    false,
  );
});
Deno.test("review validation messages remain useful without reflecting arbitrary error text", async () => {
  const { createErrorResponse } = await import(
    "../_shared/supabase-clients.ts"
  );
  const message =
    "Work order billing details changed since review. Reload and review the invoice again.";
  assertEquals((await createErrorResponse(message, 409).json()).error, message);
  assertEquals(
    (await createErrorResponse(message + " secret", 409).json()).error ===
      message + " secret",
    false,
  );
});

Deno.test("isQuickBooksNotFoundError detects 404 and 400 Fault Object Not Found / 610", async () => {
  const { isQuickBooksNotFoundError } = await import("./qbo-invoice-api.ts");
  assertEquals(isQuickBooksNotFoundError(404, null), true);
  assertEquals(
    isQuickBooksNotFoundError(400, {
      Error: [{ code: "610", Message: "Object Not Found" }],
    }),
    true,
  );
  assertEquals(
    isQuickBooksNotFoundError(400, {
      Error: [{ Message: "Object Not Found" }],
    }),
    true,
  );
  assertEquals(
    isQuickBooksNotFoundError(400, {
      Error: [{ Detail: "Object Not Found : No entity found with Id: 123" }],
    }),
    true,
  );
  assertEquals(
    isQuickBooksNotFoundError(400, {
      Error: [{ code: "2030", Message: "Invalid date format" }],
    }),
    false,
  );
  assertEquals(isQuickBooksNotFoundError(500, null), false);
});

Deno.test("fetchExistingInvoiceForUpdate returns null when invoice is deleted or not found", async () => {
  const { fetchExistingInvoiceForUpdate } = await import("./qbo-invoice-api.ts");
  const originalFetch = globalThis.fetch;

  // 1. 404 Not Found
  globalThis.fetch = () => Promise.resolve(new Response(null, { status: 404 }));
  try {
    const res = await fetchExistingInvoiceForUpdate("token", "realm", "inv-404", () => {});
    assertEquals(res, null);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // 2. 400 with Fault code 610 Object Not Found
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          Fault: { Error: [{ code: "610", Message: "Object Not Found" }] },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );
  try {
    const res = await fetchExistingInvoiceForUpdate("token", "realm", "inv-610", () => {});
    assertEquals(res, null);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // 3. 200 with status: "Deleted"
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          Invoice: { Id: "inv-del", status: "Deleted" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  try {
    const res = await fetchExistingInvoiceForUpdate("token", "realm", "inv-del", () => {});
    assertEquals(res, null);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // 4. 200 active invoice
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          Invoice: { Id: "inv-live", SyncToken: "1" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  try {
    const res = await fetchExistingInvoiceForUpdate("token", "realm", "inv-live", () => {});
    assertEquals(res?.Id, "inv-live");
  } finally {
    globalThis.fetch = originalFetch;
  }

  // 5. 200 with missing Invoice or missing Invoice.Id throws instead of returning null
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({ Invoice: {} }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  try {
    let threw = false;
    try {
      await fetchExistingInvoiceForUpdate("token", "realm", "inv-malformed", () => {});
    } catch {
      threw = true;
    }
    assertEquals(threw, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("loadInvoiceReviewContext cleans up deleted invoices and marks wasDeleted", async () => {
  const { loadInvoiceReviewContext } = await import("./qbo-invoice-review.ts");
  const originalFetch = globalThis.fetch;

  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];

  const mockSupabase: any = {
    from: (table: string) => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === "work_order_invoice_details") {
            return Promise.resolve({
              data: {
                invoice_date: null,
                due_date: null,
                payment_term_id: null,
                service_dates: {},
                qb_line_ids: { "pm:123": "1", __invoice_id: "old-inv", __realm_id: "realm-1" },
              },
              error: null,
            });
          }
          if (table === "quickbooks_export_logs") {
            return Promise.resolve({
              data: { id: "log-1", quickbooks_invoice_id: "old-inv" },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        },
        update: (payload: Record<string, unknown>) => {
          const entry = { table, payload, filters: {} as Record<string, unknown> };
          updates.push(entry);
          builder.eq = (col: string, val: unknown) => {
            entry.filters[col] = val;
            return builder;
          };
          return builder;
        },
      };
      return builder;
    },
  };

  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/customer/")) {
      return Promise.resolve(new Response(JSON.stringify({ Customer: {} }), { status: 200 }));
    }
    if (url.includes("Term")) {
      return Promise.resolve(new Response(JSON.stringify({ QueryResponse: { Term: [] } }), { status: 200 }));
    }
    if (url.includes("/invoice/old-inv")) {
      return Promise.resolve(new Response(JSON.stringify({ Fault: { Error: [{ code: "610", Message: "Object Not Found" }] } }), { status: 400 }));
    }
    return Promise.resolve(new Response(null, { status: 404 }));
  };

  try {
    const context = await loadInvoiceReviewContext(
      mockSupabase,
      "token",
      "realm-1",
      "wo-123",
      "org-1",
      "cust-1",
      () => {},
    );

    assertEquals(context.wasDeleted, true);
    assertEquals(context.existing, null);
    assertEquals(context.saved.qb_line_ids, {});

    const logUpdate = updates.find((u) => u.table === "quickbooks_export_logs") as any;
    assertEquals(logUpdate?.payload.status, "error");
    assertEquals(logUpdate?.payload.error_message, "Invoice was deleted in QuickBooks");
    assertEquals(logUpdate?.filters.work_order_id, "wo-123");
    assertEquals(logUpdate?.filters.organization_id, "org-1");
    assertEquals(logUpdate?.filters.realm_id, "realm-1");
    assertEquals(logUpdate?.filters.status, "success");
    assertEquals(logUpdate?.filters.quickbooks_invoice_id, "old-inv");

    const woUpdate = updates.find((u) => u.table === "work_orders");
    assertEquals(woUpdate?.payload.quickbooks_invoice_id, null);
    assertEquals(woUpdate?.payload.quickbooks_invoice_number, null);
    assertEquals(woUpdate?.payload.invoice_sent_at, null);
    assertEquals(woUpdate?.payload.invoice_paid_at, null);

    const detailsUpdate = updates.find((u) => u.table === "work_order_invoice_details");
    assertEquals(detailsUpdate?.payload.qb_line_ids, {});
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("loadInvoiceReviewContext retains wasDeleted on subsequent reviews after deletion was already marked", async () => {
  const { loadInvoiceReviewContext } = await import("./qbo-invoice-review.ts");
  const originalFetch = globalThis.fetch;

  const mockSupabase: any = {
    from: (table: string) => {
      const builder: any = {
        select: () => builder,
        eq: (_col: string, val: unknown) => {
          if (val === "success" || val === "error") {
            builder._status = val;
          }
          return builder;
        },
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === "work_order_invoice_details") {
            return Promise.resolve({
              data: {
                invoice_date: null,
                due_date: null,
                payment_term_id: null,
                service_dates: {},
                qb_line_ids: {},
              },
              error: null,
            });
          }
          if (table === "quickbooks_export_logs") {
            if (builder._status === "success") {
              return Promise.resolve({ data: null, error: null });
            }
            return Promise.resolve({
              data: {
                id: "log-del",
                quickbooks_invoice_id: "old-inv",
                created_at: "2026-10-02T12:00:00Z",
              },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        },
        update: () => builder,
      };
      return builder;
    },
  };

  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/customer/")) {
      return Promise.resolve(new Response(JSON.stringify({ Customer: {} }), { status: 200 }));
    }
    if (url.includes("Term")) {
      return Promise.resolve(new Response(JSON.stringify({ QueryResponse: { Term: [] } }), { status: 200 }));
    }
    return Promise.resolve(new Response(null, { status: 404 }));
  };

  try {
    const context = await loadInvoiceReviewContext(
      mockSupabase,
      "token",
      "realm-1",
      "wo-123",
      "org-1",
      "cust-1",
      () => {},
    );

    assertEquals(context.wasDeleted, true);
    assertEquals(context.existing, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

