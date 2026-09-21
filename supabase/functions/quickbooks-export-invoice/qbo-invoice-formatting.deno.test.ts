import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import { buildInvoiceLines, getInvoiceServiceDescriptors, PM_INVOICE_ITEM_NAME, type PreventativeMaintenanceInvoiceRow, type WorkOrderData } from "./qbo-invoice-lines.ts";
import { buildCustomerMemo } from "./qbo-invoice-payload.ts";

const workOrder: WorkOrderData = {
  id: "work-order", title: "A long administrative title", description: "Inspect hydraulic leak",
  status: "completed", priority: "normal", equipment_id: "equipment", organization_id: "organization",
  created_date: "2026-09-21T12:00:00Z", due_date: "2026-09-22", completed_date: null,
  equipment_working_hours_at_creation: null, has_pm: true,
};
const pm: PreventativeMaintenanceInvoiceRow = {
  id: "pm-1", notes: "Replaced seal", completed_by_name: "Tech",
  pm_checklist_templates: { name: "500-hour service" },
  checklist_data: [{ section: "Hydraulics", title: "Seal", condition: 2, notes: "Replaced seal" }],
};

function installItemMock() {
  const original = globalThis.fetch;
  globalThis.fetch = (input) => {
    const query = new URL(String(input)).searchParams.get("query") || "";
    const name = query.match(/Name = '([^']+)'/)?.[1] || "Item";
    return Promise.resolve(Response.json({ QueryResponse: { Item: [{ Id: name, Name: name, UnitPrice: 999 }] } }));
  };
  return () => { globalThis.fetch = original; };
}

Deno.test("PM-only invoice is a distinct editable zero-price service despite item's default price", async () => {
  const restore = installItemMock();
  try {
    const lines = await buildInvoiceLines("token", "realm", [], [], {
      workOrder, pm, serviceDates: { "pm:pm-1": "2026-08-05" },
    });
    assertEquals(lines.length, 1);
    assertEquals(lines[0], {
      Amount: 0, DetailType: "SalesItemLineDetail", Description: "PM — 500-hour service",
      SalesItemLineDetail: { ItemRef: { value: PM_INVOICE_ITEM_NAME, name: PM_INVOICE_ITEM_NAME }, Qty: 1, UnitPrice: 0, ServiceDate: "2026-08-05" },
    });
  } finally { restore(); }
});

Deno.test("mixed PM, labor, parts preserve charges, service dates and descriptor ordering", async () => {
  const restore = installItemMock();
  try {
    const costs = [
      { description: "Labor - repairs", quantity: 1, unit_price_cents: 7500, total_price_cents: 7500 },
      { description: "Parts - seal kit", quantity: 2, unit_price_cents: 2000, total_price_cents: 4000 },
    ];
    const ctx = { workOrder, pm, publicNotesText: "essay\n".repeat(100), serviceDates: { "pm:pm-1": "2026-08-05", labor: "2026-08-06", parts: "2026-08-07" } };
    const lines = await buildInvoiceLines("token", "realm", costs, [], ctx);
    const descriptors = getInvoiceServiceDescriptors(costs, [], ctx);
    assertEquals(descriptors.map((entry) => entry.key), ["pm:pm-1", "labor", "parts"]);
    assertEquals(lines.map((line) => line.Description), descriptors.map((entry) => entry.description));
    assertEquals(lines.map((line) => line.Amount), [0, 75, 40]);
    assertEquals(descriptors.map((entry) => entry.amount), lines.map((line) => line.Amount));
    assertEquals(descriptors.map((entry) => entry.quantity), lines.map((line) => line.SalesItemLineDetail.Qty));
    assertEquals(descriptors.map((entry) => entry.unit_price), lines.map((line) => line.SalesItemLineDetail.UnitPrice));
    assertEquals(lines.map((line) => line.SalesItemLineDetail.ServiceDate), ["2026-08-05", "2026-08-06", "2026-08-07"]);
  } finally { restore(); }
});

Deno.test("PM template fallback stays concise and non-PM invoice never gets PM item", async () => {
  const restore = installItemMock();
  try {
    const lines = await buildInvoiceLines("token", "realm", [], [], { workOrder, pm: { ...pm, pm_checklist_templates: null } });
    assertEquals(lines[0].Description, "Preventative maintenance");
    const nonPm = await buildInvoiceLines("token", "realm", [], [], { workOrder, pm: null });
    assertEquals(nonPm[0].Description, "Labor");
    assertEquals(getInvoiceServiceDescriptors([], [], { workOrder, pm: null }), [{ key: "labor", description: "Labor", quantity: 1, unit_price: 0, amount: 0 }]);
  } finally { restore(); }
});

Deno.test("memo consolidates PM findings, public notes and parts, excludes private notes and status history", () => {
  const memo = buildCustomerMemo(workOrder, [
    { content: "Replaced seal", is_private: false, author_name: "Tech", created_at: "2026-09-21" },
    { content: "Private customer concern", is_private: true, author_name: "Private person", created_at: "2026-09-21" },
  ], [{ id: "event", old_status: "submitted", new_status: "completed", changed_at: "2026-09-21", reason: "Internal workflow" }], {
    pm, costs: [{ description: "Parts - seal kit", quantity: 1, unit_price_cents: 4000, total_price_cents: 4000 }],
  });
  assertEquals(memo.match(/Replaced seal/g)?.length, 1);
  assertMatch(memo, /Hydraulics \| Seal/);
  assertMatch(memo, /seal kit/);
  assertEquals(/Private|Internal workflow|2026-09-21|Status changed/.test(memo), false);
});

Deno.test("memo truncates long narratives deliberately without losing its size bound", () => {
  const memo = buildCustomerMemo({ ...workOrder, description: "A".repeat(5000) }, [], []);
  assertEquals(memo.length <= 3900, true);
  assertMatch(memo, /see work order for remaining details/);
});
