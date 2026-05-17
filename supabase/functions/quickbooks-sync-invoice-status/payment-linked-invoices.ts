import { QBO_API_BASE, getIntuitTid, withMinorVersion } from "../_shared/quickbooks-config.ts";

/**
 * QuickBooks Online Payment shape needed to resolve linked invoices.
 * @see https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment
 */
export interface QuickBooksPayment {
  Id?: string;
  Line?: Array<{ LinkedTxn?: Array<{ TxnId?: string; TxnType?: string }> }>;
}

export function extractLinkedInvoiceIdsFromPayment(payment: QuickBooksPayment): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of payment.Line ?? []) {
    for (const link of line?.LinkedTxn ?? []) {
      const type = link?.TxnType?.toLowerCase();
      const id = link?.TxnId?.trim();
      if (type === "invoice" && id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

export async function fetchPayment(
  accessToken: string,
  realmId: string,
  paymentId: string,
): Promise<QuickBooksPayment> {
  const response = await fetch(
    withMinorVersion(`${QBO_API_BASE}/v3/company/${realmId}/payment/${encodeURIComponent(paymentId)}`),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );
  getIntuitTid(response);
  if (!response.ok) {
    throw new Error(`QuickBooks payment read failed (${response.status})`);
  }
  const body = await response.json();
  if (body.Fault) {
    throw new Error(`QuickBooks payment read Fault: ${JSON.stringify(body.Fault).substring(0, 300)}`);
  }
  if (!body.Payment) {
    throw new Error("QuickBooks payment read returned no Payment");
  }
  return body.Payment as QuickBooksPayment;
}
