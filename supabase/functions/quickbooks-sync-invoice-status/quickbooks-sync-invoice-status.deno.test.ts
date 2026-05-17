import { assertEquals } from "jsr:@std/assert@1";
import {
  deriveQuickBooksInvoiceStatus,
  type QuickBooksInvoice,
} from "../quickbooks-export-invoice/qbo-invoice-payload.ts";
import { updateMirroredWorkOrders } from "./mirror-work-orders.ts";
import {
  extractLinkedInvoiceIdsFromPayment,
  type QuickBooksPayment,
} from "./payment-linked-invoices.ts";

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

Deno.test("updateMirroredWorkOrders omits invoice timestamps from main payload and null-guards paid_at", async () => {
  const { from, updates } = createWorkOrderUpdateMock();
  await updateMirroredWorkOrders({ from }, {
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
  await updateMirroredWorkOrders({ from }, {
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
