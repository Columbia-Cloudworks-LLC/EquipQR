/**
 * Deno unit tests for QuickBooks invoice line builders (summarized Labor/Parts, PM copy).
 */
import { assertEquals, assertMatch, assertRejects } from "jsr:@std/assert@1";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { QBO_INVOICE_ITEM_NAMES } from "../_shared/quickbooks-config.ts";
import { __testables } from "./qbo-invoice-lines.ts";
import { __payloadTestables, type QuickBooksInvoice } from "./qbo-invoice-payload.ts";
import { updateWorkOrderInvoiceMirror } from "./work-order-invoice-mirror.ts";
import { loadWorkOrderForExport } from "./qbo-work-order-gate.ts";
import { __qboInvoiceApiTestables } from "./qbo-invoice-api.ts";

const {
  buildInvoiceLines,
  buildPMInvoiceDescription,
  buildPartsLineDescription,
  buildPrivateNote,
  escapeQuickBooksQueryValue,
  resolveIncomeAccountRef,
} = __testables;
const {
  applyCustomerBillEmail,
  applyInvoiceTaxState,
  buildCustomerMemo,
  buildInvoiceCustomFields,
  deriveQuickBooksInvoiceStatus,
} = __payloadTestables;

Deno.test("applyCustomerBillEmail seeds BillEmail from the customer lookup", () => {
  const invoice: QuickBooksInvoice = { CustomerRef: { value: "32" }, Line: [] };
  const seeded = applyCustomerBillEmail(invoice, " customer@example.com ");
  assertEquals(seeded.BillEmail?.Address, "customer@example.com");
});

Deno.test("applyCustomerBillEmail preserves an existing invoice BillEmail on update", () => {
  const invoice: QuickBooksInvoice = { CustomerRef: { value: "32" }, Line: [] };
  const seeded = applyCustomerBillEmail(
    invoice,
    "customer@example.com",
    { Address: "edited-in-qbo@example.com" },
  );
  assertEquals(seeded.BillEmail?.Address, "edited-in-qbo@example.com");
});

Deno.test("applyCustomerBillEmail leaves the invoice untouched without an email", () => {
  const invoice: QuickBooksInvoice = { CustomerRef: { value: "32" }, Line: [] };
  assertEquals(applyCustomerBillEmail(invoice, null).BillEmail, undefined);
  assertEquals(applyCustomerBillEmail(invoice, "   ").BillEmail, undefined);
  assertEquals(applyCustomerBillEmail(invoice, undefined, { Address: "  " }).BillEmail, undefined);
});

const REALM = "realm-test-1";

const minimalWorkOrder = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "WO",
  description: "Desc",
  status: "completed",
  priority: "normal",
  equipment_id: "22222222-2222-2222-2222-222222222222",
  organization_id: "33333333-3333-3333-3333-333333333333",
  created_date: new Date().toISOString(),
  due_date: null as string | null,
  completed_date: new Date().toISOString(),
  equipment_working_hours_at_creation: null as number | null,
  has_pm: true,
};

function restoreFetch(original: typeof fetch) {
  globalThis.fetch = original;
}

const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const ITEM_POST_PATH = /\/v3\/company\/[^/]+\/item(?:\?|$)/;

type ExistingQboItem = {
  Id: string;
  Name: string;
  Type: string;
};

type InstallQuickBooksItemFetchMockOptions = {
  /** When provided, records raw POST bodies for item-create assertions */
  postBodies?: string[];
  /** Prefix for IDs returned from item-create POST (default `new-`) */
  createdItemIdPrefix?: "id-" | "new-";
  /** Pre-existing items matched by escaped `Name = '...'` in Item query URLs */
  existingItemsByName?: Record<string, ExistingQboItem>;
  /** Income account name in Account query mock (default `Sales Income`) */
  incomeAccountName?: string;
  /**
   * `compact`: regression-style mock (POST first, `Sales` account, empty Item queries).
   * `full`: Account + Item query + optional POST with `not mocked` fallback.
   */
  mode?: "full" | "compact";
};

function installQuickBooksItemFetchMock(
  options: InstallQuickBooksItemFetchMockOptions = {},
): typeof fetch {
  const originalFetch = globalThis.fetch;
  const {
    postBodies,
    createdItemIdPrefix = "new-",
    existingItemsByName = {},
    incomeAccountName = "Sales Income",
    mode = "full",
  } = options;

  const compactAccountName = "Sales";
  const accountName = mode === "compact" ? compactAccountName : incomeAccountName;

  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const bodyStr = init?.body ? String(init.body) : "";

    if (method === "POST" && ITEM_POST_PATH.test(url)) {
      if (postBodies) {
        postBodies.push(bodyStr);
      }
      const body = JSON.parse(bodyStr) as { Name: string; Type?: string };
      const itemResponse =
        mode === "compact"
          ? { Item: { Id: `id-${body.Name}`, Name: body.Name } }
          : {
            Item: {
              Id: `${createdItemIdPrefix}${body.Name}`,
              Name: body.Name,
              Type: body.Type,
            },
          };
      return Promise.resolve(
        new Response(JSON.stringify(itemResponse), {
          status: 200,
          headers: JSON_HEADERS,
        }),
      );
    }

    if (url.includes("/query") && url.includes(encodeURIComponent("Account"))) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            QueryResponse: { Account: [{ Id: "inc-1", Name: accountName }] },
          }),
          { status: 200, headers: JSON_HEADERS },
        ),
      );
    }

    if (url.includes("/query") && url.includes(encodeURIComponent("Item"))) {
      const decoded = decodeURIComponent(url);
      for (const [name, item] of Object.entries(existingItemsByName)) {
        const escaped = escapeQuickBooksQueryValue(name);
        if (decoded.includes(`Name = '${escaped}'`)) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ QueryResponse: { Item: [item] } }),
              { status: 200, headers: JSON_HEADERS },
            ),
          );
        }
      }
      return Promise.resolve(
        new Response(JSON.stringify({ QueryResponse: {} }), {
          status: 200,
          headers: JSON_HEADERS,
        }),
      );
    }

    if (mode === "full") {
      return Promise.resolve(new Response("not mocked", { status: 500 }));
    }

    return Promise.resolve(
      new Response(JSON.stringify({ QueryResponse: {} }), {
        status: 200,
        headers: JSON_HEADERS,
      }),
    );
  };

  return originalFetch;
}

Deno.test("escapeQuickBooksQueryValue escapes quotes and backslashes", () => {
  assertEquals(escapeQuickBooksQueryValue(`Bob's \\Parts`), `Bob\\'s \\\\Parts`);
});

Deno.test("buildPartsLineDescription lists billable rows and strips redundant Parts prefixes", () => {
  const partsDescription = buildPartsLineDescription([
    {
      description: "Parts - engine oil, oil filter, hydraulic filter",
      quantity: 1,
      unit_price_cents: 18640,
      total_price_cents: 18640,
      inventory_item_id: null,
    },
    {
      description: "Seal kit",
      quantity: 1,
      unit_price_cents: 2500,
      total_price_cents: 2500,
      inventory_item_id: "inv-1",
    },
    // Zero-amount rows are excluded from the invoice total, so they are
    // excluded from the customer-facing breakdown too.
    {
      description: "Warranty adjustment",
      quantity: 1,
      unit_price_cents: 0,
      total_price_cents: 0,
      inventory_item_id: null,
    },
  ]);
  assertEquals(
    partsDescription,
    "Parts:\n- engine oil, oil filter, hydraulic filter\n- Seal kit",
  );
});

Deno.test("buildPartsLineDescription falls back to bare Parts when no descriptions survive", () => {
  assertEquals(buildPartsLineDescription([]), "Parts");
  assertEquals(
    buildPartsLineDescription([
      {
        description: "Parts - ",
        quantity: 1,
        unit_price_cents: 500,
        total_price_cents: 500,
        inventory_item_id: null,
      },
    ]),
    "Parts",
  );
});

Deno.test("buildPMInvoiceDescription includes all-OK sentence when every condition is 1", () => {
  const text = buildPMInvoiceDescription(
    {
      id: "pm1",
      checklist_data: [
        { section: "A", title: "Oil", condition: 1, notes: "" },
      ],
      notes: null,
      completed_by_name: "Alex Tech",
      pm_checklist_templates: { name: "Forklift PM" },
    },
    "",
    "Fallback",
  );
  assertMatch(text, /PM performed: Forklift PM/);
  assertMatch(text, /All PM items were marked OK by Alex Tech/);
});

Deno.test("buildPMInvoiceDescription lists only exception rows when conditions are not OK", () => {
  const text = buildPMInvoiceDescription(
    {
      id: "pm1",
      checklist_data: [
        { section: "A", title: "OK row", condition: 1 },
        { section: "B", title: "Bad row", condition: 5, notes: "Needs repair" },
      ],
      notes: null,
      completed_by_name: null,
      pm_checklist_templates: { name: "PM Template" },
    },
    "",
    "Jamie",
  );
  assertEquals(text.includes("All PM items were marked OK"), false);
  assertMatch(text, /B \| Bad row\r\nNeeds repair/);
});

Deno.test("buildPMInvoiceDescription appends Public notes after PM summary", () => {
  const text = buildPMInvoiceDescription(
    {
      id: "pm1",
      checklist_data: [],
      notes: null,
      completed_by_name: null,
      pm_checklist_templates: null,
    },
    "Customer visible note line 1\nLine 2",
    "Tech",
  );
  assertMatch(text, /Public notes:/);
  assertMatch(text, /Customer visible note line 1/);
});

Deno.test("buildPMInvoiceDescription truncates very long output below 3975 chars", () => {
  const filler = "x".repeat(5000);
  const text = buildPMInvoiceDescription(null, filler, "T");
  assertEquals(text.length < 3975, true);
  assertMatch(text, /\.\.\. \(truncated\)$/);
});

Deno.test("buildPrivateNote keeps itemized per-cost lines", () => {
  const wo = { ...minimalWorkOrder };
  const costs = [
    {
      description: "Hydraulic hose",
      quantity: 2,
      unit_price_cents: 2500,
      total_price_cents: 5000,
      inventory_item_id: "inv-1",
    },
    {
      description: "Labor",
      quantity: 1,
      unit_price_cents: 8000,
      total_price_cents: 8000,
      inventory_item_id: null,
    },
  ];
  const memo = buildPrivateNote(wo, [], costs as never);
  assertMatch(memo, /Hydraulic hose/);
  assertMatch(memo, /Labor/);
  assertMatch(memo, /Cost Breakdown/);
});

Deno.test("buildInvoiceCustomFields maps equipment and machine hours", () => {
  const fields = buildInvoiceCustomFields(
    {
      ...minimalWorkOrder,
      equipment_working_hours_at_creation: 123,
      equipment: {
        name: "Forklift 7",
        manufacturer: "Toyota",
        model: "8FGCU25",
        serial_number: "SER-7",
        team_id: "team-1",
      },
    },
    [{
      content: "checkout",
      is_private: false,
      author_name: "Tech",
      created_at: new Date().toISOString(),
      machine_hours: 130,
    }],
  );

  assertEquals(fields.find((f) => f.Name === "Make/Model")?.StringValue, "Toyota 8FGCU25");
  assertEquals(fields.find((f) => f.Name === "Serial")?.StringValue, "SER-7");
  assertEquals(fields.find((f) => f.Name === "Machine Hours")?.StringValue, "Intake 123 / Checkout 130");
});

Deno.test("buildCustomerMemo formats public timeline entries with z timestamps", () => {
  const memo = buildCustomerMemo(
    { ...minimalWorkOrder, title: "Hydraulic repair", description: "Lift leaking" },
    [{
      content: "Replaced seal kit",
      is_private: false,
      author_name: "Tech",
      created_at: "2026-05-17T12:34:56.000Z",
    }],
    [{
      id: "hist-1",
      old_status: "in_progress",
      new_status: "completed",
      changed_at: "2026-05-17T13:45:00.000Z",
      reason: "Ready for pickup",
    }],
  );

  assertMatch(memo, /Initial request: Lift leaking\./);
  assertMatch(memo, /2026-05-17T12:34z - \[Replaced seal kit\]/);
  assertMatch(memo, /2026-05-17T13:45z - \[Status changed to Completed - Ready for pickup\]/);
});

Deno.test("applyInvoiceTaxState applies NON tax code to tax-exempt sales lines", () => {
  const lines = applyInvoiceTaxState(
    [{
      Amount: 100,
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: { value: "labor", name: "Labor" },
        Qty: 1,
        UnitPrice: 100,
      },
    }],
    { isTaxExempt: true, verified: true, source: "quickbooks" },
  );

  assertEquals(lines[0]!.SalesItemLineDetail.TaxCodeRef?.value, "NON");
});

Deno.test("deriveQuickBooksInvoiceStatus classifies paid, partial, overdue, and sent invoices", () => {
  assertEquals(deriveQuickBooksInvoiceStatus({ Balance: 0, TotalAmt: 50 }), "paid");
  assertEquals(deriveQuickBooksInvoiceStatus({ Balance: 25, TotalAmt: 50 }), "partially_paid");
  assertEquals(
    deriveQuickBooksInvoiceStatus({ Balance: 50, TotalAmt: 50, DueDate: "2026-01-01" }, undefined, new Date("2026-05-17T00:00:00Z")),
    "overdue",
  );
  assertEquals(deriveQuickBooksInvoiceStatus({ Balance: 50, TotalAmt: 50, EmailStatus: "EmailSent" }), "sent");
});

Deno.test("deriveQuickBooksInvoiceStatus avoids paid/partial/overdue when Balance or TotalAmt is absent", () => {
  assertEquals(deriveQuickBooksInvoiceStatus({ TotalAmt: 100 }), "draft");
  assertEquals(
    deriveQuickBooksInvoiceStatus({
      TotalAmt: 100,
      EmailStatus: "EmailSent",
    }),
    "sent",
  );
  assertEquals(deriveQuickBooksInvoiceStatus({ Balance: 0 }), "draft");
  assertEquals(
    deriveQuickBooksInvoiceStatus(
      { DueDate: "2026-01-01" },
      undefined,
      new Date("2026-05-17T00:00:00Z"),
    ),
    "draft",
  );
});

Deno.test("resolveIncomeAccountRef throws actionable message when no Income account exists", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify({ QueryResponse: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    await assertRejects(
      async () => await resolveIncomeAccountRef("token", REALM),
      Error,
      "QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID",
    );
  } finally {
    restoreFetch(originalFetch);
  }
});

Deno.test("resolveIncomeAccountRef throws when configured ID returns non-OK HTTP", async () => {
  const originalFetch = globalThis.fetch;
  const prevConfiguredId = Deno.env.get("QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID");
  try {
    Deno.env.set("QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID", "missing-account-99");
    globalThis.fetch = (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/account/missing-account-99")) {
        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({ QueryResponse: { Account: [{ Id: "inc-should-not-run", Name: "Sales" }] } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    };

    await assertRejects(
      async () => await resolveIncomeAccountRef("tok", REALM),
      Error,
      "QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID",
    );
  } finally {
    restoreFetch(originalFetch);
    if (prevConfiguredId === undefined) {
      Deno.env.delete("QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID");
    } else {
      Deno.env.set("QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID", prevConfiguredId);
    }
  }
});

Deno.test("buildInvoiceLines emits one Parts line for multiple inventory-backed costs", async () => {
  const postBodies: string[] = [];
  const originalFetch = installQuickBooksItemFetchMock({
    postBodies,
    createdItemIdPrefix: "id-",
  });
  try {
    const costs = [
      {
        description: "Bolt A",
        quantity: 1,
        unit_price_cents: 100,
        total_price_cents: 100,
        inventory_item_id: "i1",
      },
      {
        description: "Bolt B",
        quantity: 2,
        unit_price_cents: 200,
        total_price_cents: 400,
        inventory_item_id: "i2",
      },
    ];

    const notes = [{
      hours_worked: 0,
      is_private: false,
      content: "",
      author_name: null,
      created_at: "",
    }] as never[];

    const lines = await buildInvoiceLines("tok", REALM, costs as never, notes, {
      workOrder: minimalWorkOrder as never,
      pm: null,
      publicNotesText: "",
    });

    const partsLines = lines.filter((l) => (l.Description ?? "").startsWith("Parts"));
    assertEquals(partsLines.length, 1);
    assertEquals(partsLines[0]!.Description, "Parts:\n- Bolt A\n- Bolt B");
    assertEquals(partsLines[0]!.Amount, 5); // $5.00 total (100 + 400 cents)
    assertEquals(partsLines[0]!.SalesItemLineDetail.Qty, 1);
    assertEquals(partsLines[0]!.SalesItemLineDetail.UnitPrice, 5);

    const laborPosts = postBodies.map((p) => JSON.parse(p) as { Type: string; Name: string }).filter((p) =>
      p.Name === QBO_INVOICE_ITEM_NAMES.labor
    );
    const partsPosts = postBodies.filter((p) => {
      const j = JSON.parse(p) as { Type: string; Name: string };
      return j.Name === QBO_INVOICE_ITEM_NAMES.parts;
    }).map((p) => JSON.parse(p) as { Type: string });

    assertEquals(laborPosts.length === 0, true);
    assertEquals(partsPosts.length >= 1, true);
    assertEquals(partsPosts.some((p) => p.Type === "NonInventory"), true);
  } finally {
    restoreFetch(originalFetch);
  }
});

Deno.test("buildInvoiceLines uses Service type for Labor item creation and reuses existing Item Id", async () => {
  const postBodies: string[] = [];
  const originalFetch = installQuickBooksItemFetchMock({
    postBodies,
    existingItemsByName: {
      [QBO_INVOICE_ITEM_NAMES.labor]: {
        Id: "existing-labor",
        Name: QBO_INVOICE_ITEM_NAMES.labor,
        Type: "Service",
      },
    },
  });
  try {
    const costs = [
      {
        description: "Labor — repair",
        quantity: 1,
        unit_price_cents: 12000,
        total_price_cents: 12000,
        inventory_item_id: null,
      },
    ];

    const notes = [{ hours_worked: 3, is_private: false, content: "", author_name: null, created_at: "" }] as never[];

    const lines = await buildInvoiceLines("tok", REALM, costs as never, notes, {
      workOrder: minimalWorkOrder as never,
      pm: null,
      publicNotesText: "",
    });

    assertEquals(lines.length >= 1, true);
    assertEquals(lines[0]!.SalesItemLineDetail.ItemRef.value, "existing-labor");

    const laborCreates = postBodies.map((p) => JSON.parse(p) as { Name: string; Type: string }).filter((p) =>
      p.Name === QBO_INVOICE_ITEM_NAMES.labor
    );
    assertEquals(laborCreates.length, 0);
  } finally {
    restoreFetch(originalFetch);
  }
});

Deno.test("buildInvoiceLines produces Labor and Parts rows when both totals are positive", async () => {
  const postBodies: string[] = [];
  const originalFetch = installQuickBooksItemFetchMock({ postBodies });
  try {
    const costs = [
      {
        description: "Labor task",
        quantity: 1,
        unit_price_cents: 6000,
        total_price_cents: 6000,
        inventory_item_id: null,
      },
      {
        description: "Seal kit",
        quantity: 1,
        unit_price_cents: 2500,
        total_price_cents: 2500,
        inventory_item_id: "inv",
      },
    ];

    const notes = [{ hours_worked: 2, is_private: false, content: "", author_name: null, created_at: "" }] as never[];

    const lines = await buildInvoiceLines("tok", REALM, costs as never, notes, {
      workOrder: minimalWorkOrder as never,
      pm: null,
      publicNotesText: "",
    });

    assertEquals(lines.length, 2);
    assertMatch(lines[0]!.Description ?? "", /Labor/);
    assertEquals(lines[1]!.Description, "Parts:\n- Seal kit");

    const parsedPosts = postBodies.map((p) => JSON.parse(p) as { Name: string; Type: string });
    const laborCreate = parsedPosts.find((p) => p.Name === QBO_INVOICE_ITEM_NAMES.labor);
    const partsCreate = parsedPosts.find((p) => p.Name === QBO_INVOICE_ITEM_NAMES.parts);
    assertEquals(laborCreate?.Type, "Service");
    assertEquals(partsCreate?.Type, "NonInventory");
  } finally {
    restoreFetch(originalFetch);
  }
});

Deno.test(
  "buildInvoiceLines sums manual non-inventory and inventory-backed rows into one Parts line with Labor",
  async () => {
    const postBodies: string[] = [];
    const originalFetch = installQuickBooksItemFetchMock({ postBodies });
    try {
      const costs = [
        {
          description: "Labor",
          quantity: 1,
          unit_price_cents: 6000,
          total_price_cents: 6000,
          inventory_item_id: null,
        },
        {
          description: "Seal kit",
          quantity: 1,
          unit_price_cents: 2500,
          total_price_cents: 2500,
          inventory_item_id: "inv-1",
        },
        {
          description: "Shop supplies (manual)",
          quantity: 1,
          unit_price_cents: 1500,
          total_price_cents: 1500,
          inventory_item_id: null,
        },
      ];

      const notes = [{
        hours_worked: 0,
        is_private: false,
        content: "",
        author_name: null,
        created_at: "",
      }] as never[];

      const lines = await buildInvoiceLines("tok", REALM, costs as never, notes, {
        workOrder: minimalWorkOrder as never,
        pm: null,
        publicNotesText: "",
      });

      assertEquals(lines.length, 2);
      assertEquals(lines[0]!.Description, "Labor");
      assertEquals(lines[0]!.Amount, 60);
      assertEquals(lines[1]!.Description, "Parts:\n- Seal kit\n- Shop supplies (manual)");
      // $25 + $15 = $40
      assertEquals(lines[1]!.Amount, 40);

      const parsedPosts = postBodies.map((p) => JSON.parse(p) as { Name: string; Type: string });
      assertEquals(parsedPosts.some((p) => p.Name === "Other"), false);
      assertEquals(parsedPosts.some((p) => p.Name === "Truck Supplies"), false);
    } finally {
      restoreFetch(originalFetch);
    }
  },
);

Deno.test("buildInvoiceLines folds Truck Supplies cost row into summarized Parts only", async () => {
  const postBodies: string[] = [];
  const originalFetch = installQuickBooksItemFetchMock({ postBodies });
  try {
    const costs = [
      {
        description: "Truck Supplies",
        quantity: 1,
        unit_price_cents: 3500,
        total_price_cents: 3500,
        inventory_item_id: null,
      },
    ];

    const notes = [{ hours_worked: 0, is_private: false, content: "", author_name: null, created_at: "" }] as never[];

    const lines = await buildInvoiceLines("tok", REALM, costs as never, notes, {
      workOrder: minimalWorkOrder as never,
      pm: null,
      publicNotesText: "",
    });

    assertEquals(lines.length, 1);
    assertEquals(lines[0]!.Description, "Parts:\n- Truck Supplies");
    assertEquals(lines[0]!.Amount, 35);

    const parsedPosts = postBodies.map((p) => JSON.parse(p) as { Name: string; Type: string });
    assertEquals(parsedPosts.some((p) => p.Name === "Truck Supplies"), false);
    assertEquals(parsedPosts.some((p) => p.Name === "Other"), false);
    assertEquals(parsedPosts.some((p) => p.Name === QBO_INVOICE_ITEM_NAMES.parts), true);
  } finally {
    restoreFetch(originalFetch);
  }
});

// ────────────────────────────────────────────────────────────────
// Regression tests for PR #964 Qodo feedback
// ────────────────────────────────────────────────────────────────

// Fix 1: Labor Amount must equal aggregated labor cost total regardless of rate
Deno.test("buildInvoiceLines Labor Amount matches aggregated labor cost even when hours imply a different rate", async () => {
  const originalFetch = installQuickBooksItemFetchMock({ mode: "compact" });
  try {
    const costs = [{
      description: "Labor — welding",
      quantity: 1,
      unit_price_cents: 9000,
      total_price_cents: 9000,
      inventory_item_id: null,
    }];
    // 3 hrs logged; if rate-based it would compute a different Amount but must still equal $90
    const notes = [{ hours_worked: 3, is_private: false, content: "", author_name: null, created_at: "" }] as never[];

    const lines = await buildInvoiceLines("tok", REALM, costs as never, notes, {
      workOrder: minimalWorkOrder as never,
      pm: null,
      publicNotesText: "",
    });

    assertEquals(lines.length, 1);
    // Amount must equal the aggregated labor cost, not hours × any configured rate
    assertEquals(lines[0]!.Amount, 90);
  } finally {
    restoreFetch(originalFetch);
  }
});

Deno.test("buildInvoiceLines bills labor from default rate when hours exist but no labor costs", async () => {
  const prevRate = Deno.env.get("QBO_DEFAULT_LABOR_RATE_CENTS");
  try {
    Deno.env.set("QBO_DEFAULT_LABOR_RATE_CENTS", "5000");
    const originalFetch = installQuickBooksItemFetchMock({ mode: "compact" });
    try {
      const notes = [{
        hours_worked: 2,
        is_private: false,
        content: "",
        author_name: null,
        created_at: "",
      }] as never[];

      const lines = await buildInvoiceLines("tok", REALM, [], notes, {
        workOrder: minimalWorkOrder as never,
        pm: null,
        publicNotesText: "",
      });

      const laborLines = lines.filter((l) => /Labor/.test(l.Description ?? ""));
      assertEquals(laborLines.length >= 1, true);
      // 2 hrs * 5000 cents/hr = 10000 cents => $100.00
      assertEquals(laborLines[0]!.Amount, 100);
    } finally {
      restoreFetch(originalFetch);
    }
  } finally {
    if (prevRate === undefined) {
      Deno.env.delete("QBO_DEFAULT_LABOR_RATE_CENTS");
    } else {
      Deno.env.set("QBO_DEFAULT_LABOR_RATE_CENTS", prevRate);
    }
  }
});

Deno.test("buildInvoiceLines default-rate labor bills rounded Qty so UnitPrice matches configured hourly rate", async () => {
  const prevRate = Deno.env.get("QBO_DEFAULT_LABOR_RATE_CENTS");
  try {
    Deno.env.set("QBO_DEFAULT_LABOR_RATE_CENTS", "5000"); // $50.00/hr
    const originalFetch = installQuickBooksItemFetchMock({ mode: "compact" });
    try {
      const notes = [{
        hours_worked: 1.234,
        is_private: false,
        content: "",
        author_name: null,
        created_at: "",
      }] as never[];

      const lines = await buildInvoiceLines("tok", REALM, [], notes, {
        workOrder: minimalWorkOrder as never,
        pm: null,
        publicNotesText: "",
      });

      const laborLines = lines.filter((l) => /Labor/.test(l.Description ?? ""));
      assertEquals(laborLines.length >= 1, true);
      const qty = laborLines[0]!.SalesItemLineDetail.Qty;
      assertEquals(qty, 1.23);
      // round(1.23 * 5000) / 100 dollars — must not use raw 1.234 for cents total
      assertEquals(laborLines[0]!.Amount, 61.5);
      assertEquals(laborLines[0]!.SalesItemLineDetail.UnitPrice, 50);
    } finally {
      restoreFetch(originalFetch);
    }
  } finally {
    if (prevRate === undefined) {
      Deno.env.delete("QBO_DEFAULT_LABOR_RATE_CENTS");
    } else {
      Deno.env.set("QBO_DEFAULT_LABOR_RATE_CENTS", prevRate);
    }
  }
});

// Labor Qty must match the value used for UnitPrice (rounded hours, min 0.01) so Qty×UnitPrice ≈ Amount
Deno.test("buildInvoiceLines Labor uses clamped rounded Qty and matching UnitPrice for tiny logged hours", async () => {
  const originalFetch = installQuickBooksItemFetchMock({ mode: "compact" });
  try {
    const costs = [{
      description: "Labor — small job",
      quantity: 1,
      unit_price_cents: 5000,
      total_price_cents: 5000,
      inventory_item_id: null,
    }];
    const notes = [{
      hours_worked: 0.004,
      is_private: false,
      content: "",
      author_name: null,
      created_at: "",
    }] as never[];

    const lines = await buildInvoiceLines("tok", REALM, costs as never, notes, {
      workOrder: minimalWorkOrder as never,
      pm: null,
      publicNotesText: "",
    });

    assertEquals(lines.length, 1);
    assertEquals(lines[0]!.Amount, 50);
    const qty = lines[0]!.SalesItemLineDetail.Qty;
    const unit = lines[0]!.SalesItemLineDetail.UnitPrice;
    assertEquals(qty, 0.01);
    assertEquals(unit, 5000);
    assertMatch(lines[0]!.Description ?? "", /Labor \(0\.01 hrs\)/);
    assertEquals((lines[0]!.Description ?? "").includes("Labor (0.00 hrs)"), false);
  } finally {
    restoreFetch(originalFetch);
  }
});

// Fix 2a: PM exception path includes technician attribution
Deno.test("buildPMInvoiceDescription includes technician attribution in exception path", () => {
  const text = buildPMInvoiceDescription(
    {
      id: "pm2",
      checklist_data: [
        { section: "A", title: "OK row", condition: 1 },
        { section: "B", title: "Bad row", condition: 5, notes: "Needs repair" },
      ],
      notes: null,
      completed_by_name: "Sam Tech",
      pm_checklist_templates: { name: "Annual PM" },
    },
    "",
    "Fallback",
  );
  assertMatch(text, /PM items were reviewed by Sam Tech/);
  assertMatch(text, /B \| Bad row\r\nNeeds repair/);
});

// Fix 2b: Empty checklist path includes technician attribution
Deno.test("buildPMInvoiceDescription includes technician attribution when checklist has no rows", () => {
  const text = buildPMInvoiceDescription(
    {
      id: "pm3",
      checklist_data: [],
      notes: null,
      completed_by_name: "Jordan T.",
      pm_checklist_templates: { name: "Quick Check" },
    },
    "",
    "Fallback",
  );
  assertMatch(text, /PM checklist was completed by Jordan T\./);
  assertMatch(text, /no checklist rows were recorded/);
});

// Completed work orders without costs/hours still export via a zero-dollar Labor line.
Deno.test("buildInvoiceLines emits zero-dollar labor line when no billable totals exist", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (_input: RequestInfo | URL) => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            QueryResponse: { Item: [{ Id: "labor-id", Name: QBO_INVOICE_ITEM_NAMES.labor }] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    };

    const lines = await buildInvoiceLines("tok", REALM, [], [], {
      workOrder: { ...minimalWorkOrder, title: "Technician-Created WO" } as never,
      pm: null,
      publicNotesText: "",
    });

    assertEquals(lines.length, 1);
    assertEquals(lines[0].Amount, 0);
    assertEquals(lines[0].Description, "Technician-Created WO");
    assertEquals(lines[0].SalesItemLineDetail.Qty, 1);
    assertEquals(lines[0].SalesItemLineDetail.UnitPrice, 0);
  } finally {
    restoreFetch(originalFetch);
  }
});

// Fix 4: Existing item reuse does not trigger an Account query; creation does
Deno.test("getOrCreateSalesItem reuses existing item without calling resolveIncomeRef", async () => {
  const originalFetch = globalThis.fetch;
  let incomeRefCalls = 0;
  try {
    globalThis.fetch = (_input: RequestInfo | URL) => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            QueryResponse: { Item: [{ Id: "existing-id", Name: QBO_INVOICE_ITEM_NAMES.labor }] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    };

    const { getOrCreateSalesItem: getOrCreate } = __testables;
    const result = await getOrCreate("tok", REALM, QBO_INVOICE_ITEM_NAMES.labor, "Service", async () => {
      incomeRefCalls++;
      return { value: "inc-99" };
    });

    assertEquals(result.value, "existing-id");
    assertEquals(incomeRefCalls, 0, "Income account resolver must NOT be called when item already exists");
  } finally {
    restoreFetch(originalFetch);
  }
});

Deno.test("getOrCreateSalesItem rejects throttled item query (429) without POST or income resolution", async () => {
  const originalFetch = globalThis.fetch;
  let postItemCount = 0;
  let incomeRefCalls = 0;
  try {
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "POST" && /\/v3\/company\/[^/]+\/item(?:\?|$)/.test(url)) {
        postItemCount++;
      }
      if (url.includes("/query") && url.includes(encodeURIComponent("Item"))) {
        return Promise.resolve(
          new Response("throttled", {
            status: 429,
            headers: {
              "Content-Type": "text/plain",
              "Retry-After": "120",
            },
          }),
        );
      }
      return Promise.resolve(new Response("unexpected", { status: 500 }));
    };

    const { getOrCreateSalesItem: getOrCreate } = __testables;
    await assertRejects(
      async () =>
        await getOrCreate("tok", REALM, QBO_INVOICE_ITEM_NAMES.labor, "Service", async () => {
          incomeRefCalls++;
          return { value: "inc-1" };
        }),
      Error,
      "429",
    );
    assertEquals(postItemCount, 0, "Must not POST create item after failed query");
    assertEquals(incomeRefCalls, 0, "Income resolver must not run when query failed");
  } finally {
    restoreFetch(originalFetch);
  }
});

Deno.test("getOrCreateSalesItem rejects Fault item query response without POST or income resolution", async () => {
  const originalFetch = globalThis.fetch;
  let postItemCount = 0;
  let incomeRefCalls = 0;
  try {
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "POST" && /\/v3\/company\/[^/]+\/item(?:\?|$)/.test(url)) {
        postItemCount++;
      }
      if (url.includes("/query") && url.includes(encodeURIComponent("Item"))) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              Fault: {
                Error: [{ Message: "Query failed", Detail: "Malformed query" }],
                type: "ValidationFault",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response("unexpected", { status: 500 }));
    };

    const { getOrCreateSalesItem: getOrCreate } = __testables;
    await assertRejects(
      async () =>
        await getOrCreate("tok", REALM, QBO_INVOICE_ITEM_NAMES.labor, "Service", async () => {
          incomeRefCalls++;
          return { value: "inc-1" };
        }),
      Error,
      "QuickBooks item query Fault",
    );
    assertEquals(postItemCount, 0, "Must not POST create item after Fault query response");
    assertEquals(incomeRefCalls, 0, "Income resolver must not run when query returned Fault");
  } finally {
    restoreFetch(originalFetch);
  }
});

// Configured non-Income account by ID fails closed (no silent fallback to another Income account)
Deno.test("resolveIncomeAccountRef throws when configured ID returns a non-Income account", async () => {
  const originalFetch = globalThis.fetch;
  const prevConfiguredId = Deno.env.get("QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID");
  const callUrls: string[] = [];
  try {
    Deno.env.set("QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID", "cfg-non-income-1");
    globalThis.fetch = (input: RequestInfo | URL) => {
      const url = String(input);
      callUrls.push(url);
      if (url.includes("/account/cfg-non-income-1")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              Account: {
                Id: "cfg-non-income-1",
                Name: "Operating Expenses",
                AccountType: "Expense",
                Active: true,
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({ QueryResponse: { Account: [{ Id: "inc-2", Name: "Services Income" }] } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    };

    await assertRejects(
      async () => await resolveIncomeAccountRef("tok", REALM),
      Error,
      "QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID",
    );
    assertEquals(
      callUrls.some((u) => u.includes("/account/cfg-non-income-1")),
      true,
      "/account/{id} must run when QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID is set",
    );
    assertEquals(
      callUrls.some((u) => u.includes("/query") && u.includes(encodeURIComponent("Account"))),
      false,
      "must not fall back to Income query when configured Id is unusable",
    );
  } finally {
    restoreFetch(originalFetch);
    if (prevConfiguredId === undefined) {
      Deno.env.delete("QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID");
    } else {
      Deno.env.set("QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID", prevConfiguredId);
    }
  }
});

Deno.test("resolveIncomeAccountRef throws when configured ID returns inactive Income account", async () => {
  const originalFetch = globalThis.fetch;
  const prevConfiguredId = Deno.env.get("QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID");
  try {
    Deno.env.set("QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID", "cfg-inactive-income");
    globalThis.fetch = (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/account/cfg-inactive-income")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              Account: {
                Id: "cfg-inactive-income",
                Name: "Old Services Income",
                AccountType: "Income",
                Active: false,
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response("unexpected", { status: 500 }));
    };

    await assertRejects(
      async () => await resolveIncomeAccountRef("tok", REALM),
      Error,
      "active Income account",
    );
  } finally {
    restoreFetch(originalFetch);
    if (prevConfiguredId === undefined) {
      Deno.env.delete("QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID");
    } else {
      Deno.env.set("QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID", prevConfiguredId);
    }
  }
});

// Fix 3 + cap: Final concatenated description stays within QBO limit after appending long suffix
Deno.test("buildInvoiceLines final line Description stays within QBO field limit after appending suffix", async () => {
  const originalFetch = installQuickBooksItemFetchMock({ mode: "compact" });
  try {
    // Inventory cost with a very long description; PM public desc also near the cap
    const longCostDesc = "Cost detail: " + "x".repeat(3500);
    const longPublicNotes = "y".repeat(3500);
    const costs = [{
      description: longCostDesc,
      quantity: 1,
      unit_price_cents: 5000,
      total_price_cents: 5000,
      inventory_item_id: "inv-a",
    }];

    const lines = await buildInvoiceLines("tok", REALM, costs as never, [], {
      workOrder: minimalWorkOrder as never,
      pm: null,
      publicNotesText: longPublicNotes,
    });

    assertEquals(lines.length, 1);
    const desc = lines[0]!.Description ?? "";
    assertEquals(desc.length <= 3975, true, `Description length ${desc.length} exceeds QBO limit`);
  } finally {
    restoreFetch(originalFetch);
  }
});

// ────────────────────────────────────────────────────────────────
// Invoice mirror timestamps (PR #968)
// ────────────────────────────────────────────────────────────────

type MirrorUpdateCapture = {
  payload: Record<string, unknown>;
  hasSentNullGuard: boolean;
  hasPaidNullGuard: boolean;
};

function createExportMirrorMock() {
  const updates: MirrorUpdateCapture[] = [];
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
    };
    builder.then = (resolve: (v: unknown) => unknown) => {
      capture();
      return Promise.resolve({ error: null }).then(resolve);
    };
    return builder;
  }
  return { from, updates };
}

Deno.test("updateWorkOrderInvoiceMirror omits timestamps from main payload and null-guards paid_at", async () => {
  const { from, updates } = createExportMirrorMock();
  await updateWorkOrderInvoiceMirror({ from } as unknown as SupabaseClient, {
    workOrderId: "wo-1",
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

Deno.test("updateWorkOrderInvoiceMirror null-guards invoice_sent_at for sent invoices", async () => {
  const { from, updates } = createExportMirrorMock();
  await updateWorkOrderInvoiceMirror({ from } as unknown as SupabaseClient, {
    workOrderId: "wo-2",
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

Deno.test("updateWorkOrderInvoiceMirror first-writes invoice_sent_at for emailed paid invoices", async () => {
  const { from, updates } = createExportMirrorMock();
  await updateWorkOrderInvoiceMirror({ from } as unknown as SupabaseClient, {
    workOrderId: "wo-3",
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

Deno.test("updateWorkOrderInvoiceMirror resolves without throwing when the main work_orders update fails", async () => {
  function from(_table: string) {
    const builder: any = {
      update(_p: Record<string, unknown>) { return builder; },
      eq(_c: string, _v: unknown) { return builder; },
      is(_c: string, _v: unknown) { return builder; },
    };
    builder.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ error: { message: "simulated DB error" } }).then(resolve);
    return builder;
  }

  let threw = false;
  try {
    await updateWorkOrderInvoiceMirror({ from } as unknown as SupabaseClient, {
      workOrderId: "wo-fail",
      organizationId: "org-1",
      realmId: "realm-1",
      invoice: {
        Id: "inv-fail",
        Balance: 50,
        TotalAmt: 100,
        EmailStatus: "NotSent",
      } as QuickBooksInvoice,
    });
  } catch {
    threw = true;
  }
  assertEquals(
    threw,
    false,
    "mirror failures are secondary side effects — export outcome must not propagate them as failures",
  );
});

// ────────────────────────────────────────────────────────────────
// Work order export gate (PR #1023)
// ────────────────────────────────────────────────────────────────

type WorkOrderExportSingleResult = {
  data: unknown;
  error: { code?: string; message: string } | null;
};

type WorkOrderExportQueryBuilder = {
  select(_cols: string): WorkOrderExportQueryBuilder;
  eq(_col: string, _val: unknown): WorkOrderExportQueryBuilder;
  in(_col: string, _vals: unknown[]): WorkOrderExportQueryBuilder;
  single(): Promise<WorkOrderExportSingleResult>;
};

function createWorkOrderExportMock(singleResult: WorkOrderExportSingleResult) {
  function from(_table: string) {
    const builder: WorkOrderExportQueryBuilder = {
      select(_cols: string) { return builder; },
      eq(_col: string, _val: unknown) { return builder; },
      in(_col: string, _vals: unknown[]) { return builder; },
      single() { return Promise.resolve(singleResult); },
    };
    return builder;
  }
  return { from };
}

Deno.test("loadWorkOrderForExport returns notFound for PGRST116", async () => {
  const { from } = createWorkOrderExportMock({
    data: null,
    error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" },
  });
  const result = await loadWorkOrderForExport(
    { from } as unknown as SupabaseClient,
    "wo-missing",
    ["org-1"],
  );
  assertEquals(result, { workOrder: null, error: null, notFound: true });
});

Deno.test("loadWorkOrderForExport returns error without notFound for non-PGRST116 failures", async () => {
  const { from } = createWorkOrderExportMock({
    data: null,
    error: { code: "42501", message: "permission denied for table work_orders" },
  });
  const result = await loadWorkOrderForExport(
    { from } as unknown as SupabaseClient,
    "wo-fail",
    ["org-1"],
  );
  assertEquals(result.workOrder, null);
  assertEquals(result.error, "permission denied for table work_orders");
  assertEquals(result.notFound, false);
});

const { assertNoFault, logQuickBooksHttpFailure } = __qboInvoiceApiTestables;

Deno.test("assertNoFault logs metadata only and throws without PII from Fault", () => {
  const logs: Array<{ step: string; details?: Record<string, unknown> }> = [];
  const logStep = (step: string, details?: Record<string, unknown>) => {
    logs.push({ step, details });
  };

  let thrown: Error | null = null;
  try {
    assertNoFault(
      {
        Fault: {
          type: "ValidationFault",
          Error: [{
            code: "6240",
            Message: "Secret Customer Name",
            Detail: "Invoice 12345 for Acme Corp",
          }],
        },
      },
      logStep,
      "invoice create response",
      "tid-123",
    );
  } catch (error) {
    thrown = error as Error;
  }

  assertEquals(thrown !== null, true);
  assertEquals(thrown!.message.includes("Secret Customer Name"), false);
  assertEquals(thrown!.message.includes("Acme Corp"), false);
  const detailsJson = JSON.stringify(logs[0]?.details ?? {});
  assertEquals(detailsJson.includes("Secret Customer Name"), false);
  assertEquals(detailsJson.includes("Acme Corp"), false);
  assertEquals(logs[0]?.details?.type, "ValidationFault");
});

Deno.test("logQuickBooksHttpFailure avoids logging upstream response bodies", () => {
  const logs: Array<{ step: string; details?: Record<string, unknown> }> = [];
  const logStep = (step: string, details?: Record<string, unknown>) => {
    logs.push({ step, details });
  };

  logQuickBooksHttpFailure(
    "Invoice update failed",
    new Response('{"Fault":{"Error":[{"Message":"Secret Customer Name"}]}}', { status: 400 }),
    "tid-456",
    logStep,
  );

  const detailsJson = JSON.stringify(logs[0]?.details ?? {});
  assertEquals(detailsJson.includes("Secret Customer Name"), false);
  assertEquals(logs[0]?.details?.status, 400);
  assertEquals(logs[0]?.details?.reason, "bad_request");
  assertEquals(logs[0]?.details?.intuit_tid, "tid-456");
});
