import type { InvoiceConfirmation } from "./qbo-invoice-review.ts";
import {
  getIntuitTid,
  QBO_API_BASE,
  withMinorVersion,
} from "../_shared/quickbooks-config.ts";
import type { TeamCustomerMapping } from "./qbo-tax-status.ts";
import type { PreparedInvoiceArtifacts } from "./qbo-export-context.ts";
import {
  applyCustomerBillEmail,
  applyTransactionTaxState,
  type QuickBooksInvoice,
  type VerifiedTaxState,
} from "./qbo-invoice-payload.ts";

export interface InvoiceApiResult {
  invoice: QuickBooksInvoice;
  intuitTid: string | null;
}

type QuickBooksFaultMetadata = {
  type?: unknown;
  errorCodes: Array<string | number | undefined>;
};

function extractQuickBooksFaultMetadata(
  fault: unknown,
): QuickBooksFaultMetadata {
  if (!fault || typeof fault !== "object") {
    return { errorCodes: [] };
  }
  const faultObj = fault as Record<string, unknown>;
  const errors = Array.isArray(faultObj.Error) ? faultObj.Error : [];
  const errorCodes = errors.map((entry) => {
    if (!entry || typeof entry !== "object") return undefined;
    return (entry as Record<string, unknown>).code as
      | string
      | number
      | undefined;
  });
  return {
    type: faultObj.type,
    errorCodes,
  };
}

function canonicalQuickBooksHttpFailureReason(status: number): string {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "quickbooks_unavailable";
  return "quickbooks_request_failed";
}

function assertNoFault(
  payload: { Fault?: unknown },
  logStep: (step: string, details?: Record<string, unknown>) => void,
  context: string,
  intuitTid: string | null,
): void {
  if (!payload.Fault) return;

  const { type, errorCodes } = extractQuickBooksFaultMetadata(payload.Fault);
  logStep(`Fault in ${context}`, { type, errorCodes, intuit_tid: intuitTid });
  throw new Error(`QuickBooks returned a validation error for ${context}`);
}

function logQuickBooksHttpFailure(
  step: string,
  response: Response,
  intuitTid: string | null,
  logStep: (step: string, details?: Record<string, unknown>) => void,
): void {
  logStep(step, {
    status: response.status,
    reason: canonicalQuickBooksHttpFailureReason(response.status),
    intuit_tid: intuitTid,
  });
}

export function isQuickBooksNotFoundError(
  status: number,
  fault: unknown,
): boolean {
  if (status === 404) return true;
  if (!fault || typeof fault !== "object") return false;
  const faultObj = fault as Record<string, unknown>;
  const errors = Array.isArray(faultObj.Error) ? faultObj.Error : [];
  return errors.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const error = entry as Record<string, unknown>;
    const code = String(error.code ?? "");
    const message = String(error.Message ?? "").toLowerCase();
    const detail = String(error.Detail ?? "").toLowerCase();
    return (
      code === "610" ||
      message.includes("object not found") ||
      detail.includes("object not found") ||
      detail.includes("no entity found") ||
      (status === 400 && message.includes("not found"))
    );
  });
}

export async function fetchExistingInvoiceForUpdate(
  accessToken: string,
  realmId: string,
  invoiceId: string,
  logStep: (step: string, details?: Record<string, unknown>) => void,
): Promise<QuickBooksInvoice | null> {
  const getInvoiceUrl = withMinorVersion(
    `${QBO_API_BASE}/v3/company/${realmId}/invoice/${invoiceId}`,
  );
  const getResponse = await fetch(getInvoiceUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const intuitTid = getIntuitTid(getResponse);

  if (getResponse.status === 404) {
    logStep("Invoice not found in QuickBooks (404)", { invoiceId, intuit_tid: intuitTid });
    return null;
  }

  let responseData: Record<string, unknown> | null = null;
  try {
    responseData = await getResponse.json();
  } catch {
    // Non-JSON response
  }

  if (responseData?.Fault && isQuickBooksNotFoundError(getResponse.status, responseData.Fault)) {
    logStep("Invoice not found or deleted in QuickBooks", {
      invoiceId,
      status: getResponse.status,
      intuit_tid: intuitTid,
    });
    return null;
  }

  if (!getResponse.ok) {
    logQuickBooksHttpFailure(
      "Invoice read failed",
      getResponse,
      intuitTid,
      logStep,
    );
    throw new Error("Failed to fetch existing invoice for update");
  }

  if (!responseData) {
    throw new Error("Failed to fetch existing invoice for update: empty response");
  }

  assertNoFault(
    responseData,
    logStep,
    "invoice read response",
    intuitTid,
  );

  const invoice = responseData.Invoice as (QuickBooksInvoice & { status?: string }) | undefined;
  if (invoice?.status === "Deleted") {
    logStep("Invoice marked Deleted in QuickBooks response", { invoiceId, intuit_tid: intuitTid });
    return null;
  }
  if (!invoice || !invoice.Id) {
    throw new Error(
      `QuickBooks invoice read returned no Invoice.Id (intuit_tid: ${intuitTid ?? "unknown"})`,
    );
  }
  return invoice as QuickBooksInvoice;
}

export async function updateQuickBooksInvoice(
  accessToken: string,
  realmId: string,
  existingInvoice: QuickBooksInvoice,
  customerMapping: TeamCustomerMapping,
  artifacts: PreparedInvoiceArtifacts,
  taxState: VerifiedTaxState,
  confirmation: InvoiceConfirmation,
  logStep: (step: string, details?: Record<string, unknown>) => void,
): Promise<InvoiceApiResult> {
  const { invoiceLines, privateNote, customerMemo, customFields } = artifacts;

  let updatedInvoice: QuickBooksInvoice = {
    sparse: true,
    Id: existingInvoice.Id,
    SyncToken: existingInvoice.SyncToken,
    CustomerRef: { value: customerMapping.quickbooks_customer_id },
    Line: invoiceLines,
    CustomField: customFields,
    PrivateNote: privateNote,
    CustomerMemo: { value: customerMemo },
  };
  if (confirmation.overwrite_existing_dates) {
    updatedInvoice.TxnDate = confirmation.invoice_date;
    updatedInvoice.DueDate = confirmation.due_date;
    if (confirmation.payment_term_id) {
      updatedInvoice.SalesTermRef = { value: confirmation.payment_term_id };
    }
  }
  updatedInvoice = applyCustomerBillEmail(
    updatedInvoice,
    taxState.customerPrimaryEmail,
    existingInvoice.BillEmail,
  );
  updatedInvoice = applyTransactionTaxState(updatedInvoice, taxState);

  const updateUrl = withMinorVersion(
    `${QBO_API_BASE}/v3/company/${realmId}/invoice`,
  );
  const updateResponse = await fetch(updateUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedInvoice),
  });

  const intuitTid = getIntuitTid(updateResponse);

  if (!updateResponse.ok) {
    logQuickBooksHttpFailure(
      "Invoice update failed",
      updateResponse,
      intuitTid,
      logStep,
    );
    throw new Error("Failed to update invoice in QuickBooks");
  }

  const updateResult = await updateResponse.json();
  assertNoFault(updateResult, logStep, "invoice update response", intuitTid);

  return {
    invoice: updateResult.Invoice as QuickBooksInvoice,
    intuitTid,
  };
}

export async function createQuickBooksInvoice(
  accessToken: string,
  realmId: string,
  workOrderId: string,
  customerMapping: TeamCustomerMapping,
  artifacts: PreparedInvoiceArtifacts,
  taxState: VerifiedTaxState,
  confirmation: InvoiceConfirmation,
  logStep: (step: string, details?: Record<string, unknown>) => void,
  attemptId?: string,
): Promise<InvoiceApiResult> {
  const { invoiceLines, privateNote, customerMemo, customFields } = artifacts;
  const generatedDocNumber = `WO-${workOrderId.substring(0, 8).toUpperCase()}`;
  logStep("Creating new invoice", { docNumber: generatedDocNumber });

  let newInvoice: QuickBooksInvoice = {
    DocNumber: generatedDocNumber,
    CustomerRef: { value: customerMapping.quickbooks_customer_id },
    Line: invoiceLines,
    CustomField: customFields,
    PrivateNote: privateNote,
    CustomerMemo: { value: customerMemo },
    TxnDate: confirmation.invoice_date,
    DueDate: confirmation.due_date,
    ...(confirmation.payment_term_id
      ? { SalesTermRef: { value: confirmation.payment_term_id } }
      : {}),
    AllowOnlineCreditCardPayment: false,
    AllowOnlineACHPayment: false,
    EmailStatus: "NotSet",
  };

  newInvoice = applyCustomerBillEmail(
    newInvoice,
    taxState.customerPrimaryEmail,
  );
  newInvoice = applyTransactionTaxState(newInvoice, taxState);

  const idempotencyKey = attemptId
    ? `equipqr-${workOrderId}-${attemptId}`
    : `equipqr-${workOrderId}`;
  const createUrl =
    withMinorVersion(`${QBO_API_BASE}/v3/company/${realmId}/invoice`) +
    `&requestid=${encodeURIComponent(idempotencyKey)}`;
  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newInvoice),
  });

  const intuitTid = getIntuitTid(createResponse);

  if (!createResponse.ok) {
    logQuickBooksHttpFailure(
      "Invoice creation failed",
      createResponse,
      intuitTid,
      logStep,
    );
    throw new Error("Failed to create invoice in QuickBooks");
  }

  const createResult = await createResponse.json();
  assertNoFault(createResult, logStep, "invoice create response", intuitTid);

  return {
    invoice: createResult.Invoice as QuickBooksInvoice,
    intuitTid,
  };
}

export const __qboInvoiceApiTestables = {
  assertNoFault,
  extractQuickBooksFaultMetadata,
  canonicalQuickBooksHttpFailureReason,
  logQuickBooksHttpFailure,
  isQuickBooksNotFoundError,
};
