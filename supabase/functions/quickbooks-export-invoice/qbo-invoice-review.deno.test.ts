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
  const bodies: QuickBooksInvoice[] = [];
  globalThis.fetch = (_input, init) => {
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
    assertEquals(bodies[0].TxnDate, "2026-09-21");
    assertEquals(bodies[0].DueDate, "2026-10-21");
    assertEquals(bodies[0].AllowOnlineACHPayment, false);
    assertEquals(bodies[0].AllowOnlineCreditCardPayment, false);
    assertEquals(bodies[0].EmailStatus, "NotSet");
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
    assertEquals(bodies[1].sparse, true);
    assertEquals(bodies[1].TxnDate, undefined);
    assertEquals(bodies[1].DueDate, undefined);
    assertEquals(bodies[1].AllowOnlineACHPayment, undefined);
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
