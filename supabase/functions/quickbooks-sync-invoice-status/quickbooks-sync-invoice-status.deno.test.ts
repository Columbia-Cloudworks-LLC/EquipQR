import { assertEquals } from "jsr:@std/assert@1";
import { deriveQuickBooksInvoiceStatus } from "../quickbooks-export-invoice/qbo-invoice-payload.ts";

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
