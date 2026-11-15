import { assertEquals } from "jsr:@std/assert@1";
import { deriveInvoiceMirrorTimestamps } from "./quickbooks-invoice-mirror-flags.ts";

const NOW = new Date("2026-01-02T03:04:05.000Z");

Deno.test("deriveInvoiceMirrorTimestamps: emailed open invoice sets sent only", () => {
  assertEquals(
    deriveInvoiceMirrorTimestamps({ EmailStatus: "EmailSent" }, "sent", NOW),
    { shouldSetSent: true, shouldSetPaid: false, timestamp: "2026-01-02T03:04:05.000Z" },
  );
});

Deno.test("deriveInvoiceMirrorTimestamps: draft and voided never set sent", () => {
  for (const status of ["draft", "voided"]) {
    assertEquals(
      deriveInvoiceMirrorTimestamps({ EmailStatus: "EmailSent" }, status, NOW).shouldSetSent,
      false,
    );
  }
});

Deno.test("deriveInvoiceMirrorTimestamps: not emailed does not set sent", () => {
  assertEquals(deriveInvoiceMirrorTimestamps({}, "sent", NOW).shouldSetSent, false);
  assertEquals(
    deriveInvoiceMirrorTimestamps({ EmailStatus: "NotSet" }, "sent", NOW).shouldSetSent,
    false,
  );
});

Deno.test("deriveInvoiceMirrorTimestamps: paid status sets paid", () => {
  assertEquals(deriveInvoiceMirrorTimestamps({}, "paid", NOW).shouldSetPaid, true);
  assertEquals(deriveInvoiceMirrorTimestamps({}, "sent", NOW).shouldSetPaid, false);
});
