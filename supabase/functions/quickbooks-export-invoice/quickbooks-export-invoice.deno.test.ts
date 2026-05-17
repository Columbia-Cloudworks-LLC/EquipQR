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

Deno.test(
  "buildInvoiceLines sums manual non-inventory and inventory-backed rows into one Parts line with Labor",
  async () => {
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
      assertEquals(lines[1]!.Description, "Parts");
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
    assertEquals(lines[0]!.Description, "Parts");
    assertEquals(lines[0]!.Amount, 35);

    const parsedPosts = postBodies.map((p) => JSON.parse(p) as { Name: string; Type: string });
    assertEquals(parsedPosts.some((p) => p.Name === "Truck Supplies"), false);
    assertEquals(parsedPosts.some((p) => p.Name === "Other"), false);
    assertEquals(parsedPosts.some((p) => p.Name === "Parts"), true);
  } finally {
    restoreFetch(originalFetch);
  }
});

// ────────────────────────────────────────────────────────────────
// Regression tests for PR #964 Qodo feedback
// ────────────────────────────────────────────────────────────────

// Fix 1: Labor Amount must equal aggregated labor cost total regardless of rate
Deno.test("buildInvoiceLines Labor Amount matches aggregated labor cost even when hours imply a different rate", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { Name: string; Type: string };
        return Promise.resolve(
          new Response(
            JSON.stringify({ Item: { Id: `id-${body.Name}`, Name: body.Name } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      const url = String(_input);
      if (url.includes("/query") && url.includes(encodeURIComponent("Account"))) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ QueryResponse: { Account: [{ Id: "inc-1", Name: "Sales" }] } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ QueryResponse: {} }), {
          status: 200, headers: { "Content-Type": "application/json" },
        }),
      );
    };

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
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) => {
        const method = (init?.method ?? "GET").toUpperCase();
        if (method === "POST") {
          const body = JSON.parse(String(init?.body ?? "{}")) as { Name: string; Type: string };
          return Promise.resolve(
            new Response(
              JSON.stringify({ Item: { Id: `id-${body.Name}`, Name: body.Name } }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }
        const url = String(_input);
        if (url.includes("/query") && url.includes(encodeURIComponent("Account"))) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ QueryResponse: { Account: [{ Id: "inc-1", Name: "Sales" }] } }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ QueryResponse: {} }), {
            status: 200, headers: { "Content-Type": "application/json" },
          }),
        );
      };

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
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) => {
        const method = (init?.method ?? "GET").toUpperCase();
        if (method === "POST") {
          const body = JSON.parse(String(init?.body ?? "{}")) as { Name: string; Type: string };
          return Promise.resolve(
            new Response(
              JSON.stringify({ Item: { Id: `id-${body.Name}`, Name: body.Name } }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }
        const url = String(_input);
        if (url.includes("/query") && url.includes(encodeURIComponent("Account"))) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ QueryResponse: { Account: [{ Id: "inc-1", Name: "Sales" }] } }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ QueryResponse: {} }), {
            status: 200, headers: { "Content-Type": "application/json" },
          }),
        );
      };

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
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { Name: string; Type: string };
        return Promise.resolve(
          new Response(
            JSON.stringify({ Item: { Id: `id-${body.Name}`, Name: body.Name } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      const url = String(_input);
      if (url.includes("/query") && url.includes(encodeURIComponent("Account"))) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ QueryResponse: { Account: [{ Id: "inc-1", Name: "Sales" }] } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ QueryResponse: {} }), {
          status: 200, headers: { "Content-Type": "application/json" },
        }),
      );
    };

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

// Fix 3: Empty work order returns [] without any QuickBooks fetch
Deno.test("buildInvoiceLines returns empty array for a work order with no billable totals without any fetch", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;
  try {
    globalThis.fetch = () => {
      fetchCallCount++;
      return Promise.resolve(new Response("should not be called", { status: 500 }));
    };

    const lines = await buildInvoiceLines("tok", REALM, [], [], {
      workOrder: minimalWorkOrder as never,
      pm: null,
      publicNotesText: "",
    });

    assertEquals(lines.length, 0);
    assertEquals(fetchCallCount, 0, "No QuickBooks API calls should be made for empty work orders");
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
          JSON.stringify({ QueryResponse: { Item: [{ Id: "existing-id", Name: "Labor" }] } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    };

    const { getOrCreateSalesItem: getOrCreate } = __testables;
    const result = await getOrCreate("tok", REALM, "Labor", "Service", async () => {
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
        await getOrCreate("tok", REALM, "Labor", "Service", async () => {
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
        await getOrCreate("tok", REALM, "Labor", "Service", async () => {
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
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { Name: string };
        return Promise.resolve(
          new Response(
            JSON.stringify({ Item: { Id: `id-${body.Name}`, Name: body.Name } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      const url = String(_input);
      if (url.includes("/query") && url.includes(encodeURIComponent("Account"))) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ QueryResponse: { Account: [{ Id: "inc-1", Name: "Sales" }] } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ QueryResponse: {} }), {
          status: 200, headers: { "Content-Type": "application/json" },
        }),
      );
    };

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
