import {
  QBO_API_BASE,
  getIntuitTid,
  withMinorVersion,
} from "../_shared/quickbooks-config.ts";
import type { TeamCustomerMapping } from "./qbo-tax-status.ts";
import type { PreparedInvoiceArtifacts } from "./qbo-export-context.ts";
import {
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

function extractQuickBooksFaultMetadata(fault: unknown): QuickBooksFaultMetadata {
  if (!fault || typeof fault !== "object") {
    return { errorCodes: [] };
  }
  const faultObj = fault as Record<string, unknown>;
  const errors = Array.isArray(faultObj.Error) ? faultObj.Error : [];
  const errorCodes = errors.map((entry) => {
    if (!entry || typeof entry !== "object") return undefined;
    return (entry as Record<string, unknown>).code as string | number | undefined;
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

export async function fetchExistingInvoiceForUpdate(
  accessToken: string,
  realmId: string,
  invoiceId: string,
  logStep: (step: string, details?: Record<string, unknown>) => void,
): Promise<QuickBooksInvoice> {
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

  if (!getResponse.ok) {
    throw new Error("Failed to fetch existing invoice for update");
  }

  const existingInvoiceData = await getResponse.json();
  assertNoFault(existingInvoiceData, logStep, "invoice read response", getIntuitTid(getResponse));
  return existingInvoiceData.Invoice as QuickBooksInvoice;
}

export async function updateQuickBooksInvoice(
  accessToken: string,
  realmId: string,
  existingInvoice: QuickBooksInvoice,
  customerMapping: TeamCustomerMapping,
  artifacts: PreparedInvoiceArtifacts,
  taxState: VerifiedTaxState,
  logStep: (step: string, details?: Record<string, unknown>) => void,
): Promise<InvoiceApiResult> {
  const { invoiceLines, privateNote, customerMemo, customFields } = artifacts;

  let updatedInvoice: QuickBooksInvoice = {
    Id: existingInvoice.Id,
    SyncToken: existingInvoice.SyncToken,
    CustomerRef: { value: customerMapping.quickbooks_customer_id },
    Line: invoiceLines,
    CustomField: customFields,
    PrivateNote: privateNote,
    CustomerMemo: { value: customerMemo },
  };
  updatedInvoice = applyTransactionTaxState(updatedInvoice, taxState);

  const updateUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${realmId}/invoice`);
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
    logQuickBooksHttpFailure("Invoice update failed", updateResponse, intuitTid, logStep);
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
  workOrderDueDate: string | null | undefined,
  logStep: (step: string, details?: Record<string, unknown>) => void,
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
    TxnDate: new Date().toISOString().split("T")[0],
  };

  if (workOrderDueDate) {
    newInvoice.DueDate = workOrderDueDate.split("T")[0];
  }
  newInvoice = applyTransactionTaxState(newInvoice, taxState);

  const createUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${realmId}/invoice`);
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
    logQuickBooksHttpFailure("Invoice creation failed", createResponse, intuitTid, logStep);
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
};
