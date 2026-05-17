/**
 * Deno unit tests for QuickBooks invoice line builders (summarized Labor/Parts, PM copy).
 */
import { assertEquals, assertMatch, assertRejects } from "jsr:@std/assert@1";
import { __testables } from "./qbo-invoice-lines.ts";

const {
  buildInvoiceLines,
  buildPMInvoiceDescription,
  buildPrivateNote,
  escapeQuickBooksQueryValue,
  resolveIncomeAccountRef,
} = __testables;

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

Deno.test("escapeQuickBooksQueryValue escapes quotes and backslashes", () => {
  assertEquals(escapeQuickBooksQueryValue(`Bob's \\Parts`), `Bob\\'s \\\\Parts`);
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
  assertMatch(text, /B \| Bad row/);
  assertMatch(text, /Needs repair/);
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

Deno.test("buildInvoiceLines emits one Parts line for multiple inventory-backed costs", async () => {
  const originalFetch = globalThis.fetch;
  const postBodies: string[] = [];
  try {
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      const bodyStr = init?.body ? String(init.body) : "";

      if (url.includes("/query") && url.includes(encodeURIComponent("Account"))) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              QueryResponse: { Account: [{ Id: "inc-1", Name: "Sales Income" }] },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      if (url.includes("/query") && url.includes(encodeURIComponent("Item"))) {
        return Promise.resolve(
          new Response(JSON.stringify({ QueryResponse: {} }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      if (method === "POST" && /\/v3\/company\/[^/]+\/item(?:\?|$)/.test(url)) {
        postBodies.push(bodyStr);
        const body = JSON.parse(bodyStr) as { Name: string; Type: string };
        return Promise.resolve(
          new Response(
            JSON.stringify({
              Item: { Id: `id-${body.Name}`, Name: body.Name, Type: body.Type },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      return Promise.resolve(new Response("not mocked", { status: 500 }));
    };

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

    const partsLines = lines.filter((l) => l.Description === "Parts");
    assertEquals(partsLines.length, 1);
    assertEquals(partsLines[0]!.Amount, 5); // $5.00 total (100 + 400 cents)
    assertEquals(partsLines[0]!.SalesItemLineDetail.Qty, 1);
    assertEquals(partsLines[0]!.SalesItemLineDetail.UnitPrice, 5);

    const laborPosts = postBodies.map((p) => JSON.parse(p) as { Type: string; Name: string }).filter((p) =>
      p.Name === "Labor"
    );
    const partsPosts = postBodies.filter((p) => {
      const j = JSON.parse(p) as { Type: string; Name: string };
      return j.Name === "Parts";
    }).map((p) => JSON.parse(p) as { Type: string });

    assertEquals(laborPosts.length === 0, true);
    assertEquals(partsPosts.length >= 1, true);
    assertEquals(partsPosts.some((p) => p.Type === "NonInventory"), true);
  } finally {
    restoreFetch(originalFetch);
  }
});

Deno.test("buildInvoiceLines uses Service type for Labor item creation and reuses existing Item Id", async () => {
  const originalFetch = globalThis.fetch;
  const postBodies: string[] = [];
  try {
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      const bodyStr = init?.body ? String(init.body) : "";

      if (url.includes("/query") && url.includes(encodeURIComponent("Account"))) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              QueryResponse: { Account: [{ Id: "inc-1", Name: "Sales Income" }] },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      if (url.includes("/query") && url.includes(encodeURIComponent("Item"))) {
        const decoded = decodeURIComponent(url);
        if (decoded.includes("Labor")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                QueryResponse: { Item: [{ Id: "existing-labor", Name: "Labor", Type: "Service" }] },
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ QueryResponse: {} }), {
            status: 200,
            headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      if (method === "POST" && /\/v3\/company\/[^/]+\/item(?:\?|$)/.test(url)) {
        postBodies.push(bodyStr);
        const body = JSON.parse(bodyStr) as { Name: string; Type: string };
        return Promise.resolve(
          new Response(
            JSON.stringify({
              Item: { Id: `new-${body.Name}`, Name: body.Name, Type: body.Type },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      return Promise.resolve(new Response("not mocked", { status: 500 }));
    };

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
      p.Name === "Labor"
    );
    assertEquals(laborCreates.length, 0);
  } finally {
    restoreFetch(originalFetch);
  }
});

Deno.test("buildInvoiceLines produces Labor and Parts rows when both totals are positive", async () => {
  const originalFetch = globalThis.fetch;
  const postBodies: string[] = [];
  try {
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      const bodyStr = init?.body ? String(init.body) : "";

      if (url.includes("/query") && url.includes(encodeURIComponent("Account"))) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              QueryResponse: { Account: [{ Id: "inc-1", Name: "Sales Income" }] },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      if (url.includes("/query") && url.includes(encodeURIComponent("Item"))) {
        return Promise.resolve(
          new Response(JSON.stringify({ QueryResponse: {} }), {
            status: 200,
            headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      if (method === "POST" && /\/v3\/company\/[^/]+\/item(?:\?|$)/.test(url)) {
        postBodies.push(bodyStr);
        const body = JSON.parse(bodyStr) as { Name: string; Type: string };
        return Promise.resolve(
          new Response(
            JSON.stringify({
              Item: { Id: `new-${body.Name}`, Name: body.Name, Type: body.Type },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      return Promise.resolve(new Response("not mocked", { status: 500 }));
    };

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
    assertEquals(lines[1]!.Description, "Parts");

    const parsedPosts = postBodies.map((p) => JSON.parse(p) as { Name: string; Type: string });
    const laborCreate = parsedPosts.find((p) => p.Name === "Labor");
    const partsCreate = parsedPosts.find((p) => p.Name === "Parts");
    assertEquals(laborCreate?.Type, "Service");
    assertEquals(partsCreate?.Type, "NonInventory");
  } finally {
    restoreFetch(originalFetch);
  }
});
