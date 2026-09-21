/** Local DB/auth + real invoice handler smoke; ALL Intuit requests use an in-memory fixture. */
import { execSync } from "node:child_process";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { assert, assertEquals } from "jsr:@std/assert@1";
import { handleQuickBooksExportInvoice } from "../supabase/functions/quickbooks-export-invoice/qbo-export-handler.ts";
import type { QuickBooksInvoice } from "../supabase/functions/quickbooks-export-invoice/qbo-invoice-payload.ts";

const status = JSON.parse(
  execSync("npx --no-install supabase status -o json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30000,
  }),
);
const api = new URL(status.API_URL);
assert(
  ["127.0.0.1", "localhost"].includes(api.hostname),
  "Local database required",
);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(api.href, status.SERVICE_ROLE_KEY, options);
const userClient = createClient(api.href, status.ANON_KEY, options);
const orgId = crypto.randomUUID(),
  teamId = crypto.randomUUID(),
  equipmentId = crypto.randomUUID(),
  woId = crypto.randomUUID(),
  pmId = crypto.randomUUID();
const email = `invoice-smoke-${crypto.randomUUID()}@example.com`,
  password = crypto.randomUUID();
let userId: string | undefined;
const originalFetch = globalThis.fetch;
let invoice: QuickBooksInvoice | null = null;
let invoiceWrites = 0;
const write = async (table: string, row: Record<string, unknown>) => {
  const { error } = await admin.from(table).insert(row);
  assert(!error, `Fixture ${table}: ${error?.message}`);
};
try {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert(!created.error && created.data.user, "Create disposable local user");
  userId = created.data.user.id;
  await write("organizations", { id: orgId, name: "Disposable invoice smoke" });
  await write("organization_members", {
    organization_id: orgId,
    user_id: userId,
    role: "owner",
    status: "active",
  });
  await write("teams", {
    id: teamId,
    organization_id: orgId,
    name: "Invoice smoke team",
  });
  await write("equipment", {
    id: equipmentId,
    organization_id: orgId,
    team_id: teamId,
    name: "Invoice smoke equipment",
    manufacturer: "Fixture",
    model: "Fixture",
    serial_number: equipmentId,
    location: "Local only",
    installation_date: "2020-01-01",
  });
  await write("work_orders", {
    id: woId,
    organization_id: orgId,
    equipment_id: equipmentId,
    title: "Invoice smoke",
    description: "Public fixture findings",
    created_by: userId,
    status: "completed",
    priority: "medium",
    has_pm: true,
    due_date: "2020-02-01T00:00:00Z",
  });
  await write("preventative_maintenance", {
    id: pmId,
    work_order_id: woId,
    equipment_id: equipmentId,
    organization_id: orgId,
    created_by: userId,
    status: "completed",
    notes: "Fixture PM completed",
    checklist_data: [],
  });
  await write("quickbooks_team_customers", {
    organization_id: orgId,
    team_id: teamId,
    quickbooks_customer_id: "fixture-customer",
    display_name: "Fixture customer",
  });
  await write("quickbooks_credentials", {
    organization_id: orgId,
    realm_id: "fixture-realm",
    access_token: "fake-local-token",
    refresh_token: "fake-local-refresh",
    access_token_expires_at: "2099-01-01T00:00:00Z",
    refresh_token_expires_at: "2099-01-01T00:00:00Z",
  });
  const login = await userClient.auth.signInWithPassword({ email, password });
  assert(!login.error && login.data.session, "Authenticate disposable user");
  const token = login.data.session.access_token;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin === api.origin) return originalFetch(input, init);
    assert(
      ["quickbooks.api.intuit.com", "sandbox-quickbooks.api.intuit.com"]
        .includes(url.hostname),
      `Blocked external host ${url.hostname}`,
    );
    assert(
      url.pathname.includes("/fixture-realm/"),
      "Only synthetic QuickBooks realm permitted",
    );
    const query = url.searchParams.get("query") ?? "";
    if (url.pathname.includes("/customer/")) {
      return Response.json({
        Customer: {
          Id: "fixture-customer",
          Taxable: false,
          SalesTermRef: { value: "30" },
          PrimaryEmailAddr: { Address: "fixture@example.com" },
        },
      });
    }
    if (/from Term/i.test(query)) {
      return Response.json({
        QueryResponse: {
          Term: [{ Id: "30", Name: "Net 30", DueDays: 30, Type: "STANDARD" }],
        },
      });
    }
    if (/from Item/i.test(query)) {
      return Response.json({
        QueryResponse: {
          Item: [{
            Id: "fixture-item",
            Name: "Preventative Maintenance",
            Type: "Service",
            Active: true,
          }],
        },
      });
    }
    if (url.pathname.endsWith("/invoice") && init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      invoiceWrites++;
      assert(!url.pathname.endsWith("/send"), "Never send");
      if (!body.Id) {
        assert(
          url.searchParams.get("requestid") === `equipqr-${woId}`,
          "Stable create idempotency key",
        );
        assertEquals(body.AllowOnlineACHPayment, false);
        assertEquals(body.AllowOnlineCreditCardPayment, false);
        assertEquals(body.EmailStatus, "NotSet");
      } else {
        assert(
          body.sparse && body.SyncToken === invoice?.SyncToken,
          "Sparse guarded update",
        );
      }
      invoice = {
        ...invoice,
        ...body,
        Id: "fixture-invoice",
        SyncToken: String(invoiceWrites),
        Line: body.Line.map((line: Record<string, unknown>, index: number) => ({
          ...line,
          Id: line.Id ?? String(index + 1),
        })),
      };
      return Response.json({ Invoice: invoice });
    }
    if (url.pathname.endsWith("/invoice/fixture-invoice")) {
      return Response.json({ Invoice: invoice });
    }
    throw new Error(`Unhandled fake QuickBooks operation: ${url.pathname}`);
  };
  const invoke = async (body: Record<string, unknown>, bearer = token) => {
    const req = new Request(
      `${api.origin}/functions/v1/quickbooks-export-invoice`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearer}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ work_order_id: woId, ...body }),
      },
    );
    const response = await handleQuickBooksExportInvoice({
      req,
      ctx: { correlationId: crypto.randomUUID() },
      corsHeaders: {},
      secrets: {
        clientId: "fake",
        clientSecret: "fake",
        supabaseUrl: api.href,
        supabaseServiceKey: status.SERVICE_ROLE_KEY,
      },
      supabaseClient: admin,
    }, (_step, details) => {
      if (details?.message) console.error(details.message);
    });
    return { status: response.status, data: await response.json() };
  };
  const review = await invoke({ action: "review" });
  assertEquals(review.status, 200);
  assertEquals(review.data.saved_details, null);
  assertEquals(review.data.services[0].unit_price, 0);
  assertEquals(invoiceWrites, 0);
  const dates = {
    invoice_date: "2024-02-29",
    due_date: "2024-03-30",
    payment_term_id: "30",
    service_dates: { [`pm:${pmId}`]: "2024-02-01" },
  };
  const saved = await userClient.from("work_order_invoice_details").upsert({
    work_order_id: woId,
    organization_id: orgId,
    ...dates,
  });
  assert(
    !saved.error,
    `Save through authenticated RLS: ${saved.error?.message}`,
  );
  const tamper = await userClient.from("work_order_invoice_details").update({
    qb_line_ids: { [`pm:${pmId}`]: "tamper" },
  }).eq("work_order_id", woId);
  assert(tamper.error, "Client cannot alter server-owned line identity");
  const confirmation = {
    ...dates,
    source_fingerprint: review.data.source_fingerprint,
    existing_invoice_id: null,
    existing_sync_token: null,
    overwrite_existing_dates: false,
  };
  assertEquals(
    (await invoke({
      action: "export",
      confirmation: { ...confirmation, invoice_date: null },
    })).status,
    409,
  );
  assertEquals(invoiceWrites, 0);
  await admin.from("work_orders").update({
    description: "Changed after invoice review",
  }).eq("id", woId);
  const changedSource = await invoke({ action: "export", confirmation });
  assertEquals(changedSource.status, 409);
  assertEquals(
    changedSource.data.error,
    "Work order billing details changed since review. Reload and review the invoice again.",
  );
  assertEquals(invoiceWrites, 0);
  confirmation.source_fingerprint =
    (await invoke({ action: "review" })).data.source_fingerprint;
  // A previous company association must not leak stale service keys into a new invoice.
  await admin.from("work_order_invoice_details").update({
    qb_line_ids: {
      __realm_id: "old-company",
      __invoice_id: "old-invoice",
      labor: "1",
    },
  }).eq("work_order_id", woId);
  const exported = await invoke({ action: "export", confirmation });
  assertEquals(exported.status, 200, JSON.stringify(exported.data));
  assert(invoice);
  assertEquals(invoice.TxnDate, dates.invoice_date);
  assertEquals(invoice.DueDate, dates.due_date);
  assertEquals(invoice.Line[0].SalesItemLineDetail.ServiceDate, "2024-02-01");
  assertEquals(invoice.Line[0].Amount, 0);
  const mapped = await admin.from("work_order_invoice_details").select(
    "qb_line_ids",
  ).eq("work_order_id", woId).single();
  assertEquals(mapped.data?.qb_line_ids[`pm:${pmId}`], "1");
  assertEquals(mapped.data?.qb_line_ids.labor, undefined);
  // Simulate the merchant editing the real invoice fields; no external call occurs.
  invoice.Line[0].Amount = 350;
  invoice.Line[0].SalesItemLineDetail.UnitPrice = 350;
  invoice.TxnDate = "2024-03-01";
  invoice.DueDate = "2024-03-31";
  invoice.SyncToken = "merchant-edit";
  const reviewed = await invoke({ action: "review" });
  assertEquals(reviewed.data.services[0].unit_price, 350);
  assertEquals(reviewed.data.existing_invoice.invoice_date, "2024-03-01");
  assertEquals((await invoke({ action: "export", confirmation })).status, 409);
  const updated = await invoke({
    action: "export",
    confirmation: {
      ...confirmation,
      source_fingerprint: reviewed.data.source_fingerprint,
      invoice_date: invoice.TxnDate,
      due_date: invoice.DueDate,
      existing_invoice_id: invoice.Id,
      existing_sync_token: invoice.SyncToken,
    },
  });
  assertEquals(updated.status, 200, JSON.stringify(updated.data));
  assertEquals(invoice.Line.length, 1);
  assertEquals(invoice.Line[0].Amount, 350);
  assertEquals(invoice.TxnDate, "2024-03-01");
  assertEquals(
    (await invoke({ action: "review" }, "invalid-token")).status,
    401,
  );
  console.log(
    "PASS: real local auth/RLS + handler review/create/update; historical dates, manual pricing, stale guard, delivery flags, and line identity verified. All Intuit I/O was synthetic.",
  );
} finally {
  globalThis.fetch = originalFetch;
  await admin.from("work_orders").delete().eq("id", woId);
  await admin.from("equipment").delete().eq("id", equipmentId);
  await admin.from("teams").delete().eq("id", teamId);
  await admin.from("organizations").delete().eq("id", orgId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}
