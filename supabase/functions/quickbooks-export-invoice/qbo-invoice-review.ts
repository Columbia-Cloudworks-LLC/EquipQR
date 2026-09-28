import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  QBO_API_BASE,
  withMinorVersion,
} from "../_shared/quickbooks-config.ts";
import type { QuickBooksInvoice } from "./qbo-invoice-payload.ts";
import type { InvoiceSalesLines } from "./qbo-invoice-lines.ts";
import { fetchExistingInvoiceForUpdate } from "./qbo-invoice-api.ts";

export class InvoiceReviewError extends Error {}
export interface InvoiceDetails {
  invoice_date: string | null;
  due_date: string | null;
  payment_term_id: string | null;
  service_dates: Record<string, string>;
  qb_line_ids: Record<string, string>;
}
export interface InvoiceConfirmation {
  source_fingerprint: string;
  invoice_date: string;
  due_date: string;
  payment_term_id: string | null;
  service_dates: Record<string, string>;
  existing_invoice_id: string | null;
  existing_sync_token: string | null;
  overwrite_existing_dates?: boolean;
}
export interface InvoiceTerm {
  id: string;
  name: string;
  due_days: number | null;
  day_of_month_due: number | null;
  due_next_month_days: number | null;
}
export interface InvoiceService {
  key: string;
  description: string;
}
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}
export function calculateDueDate(
  invoiceDate: string,
  term: InvoiceTerm,
): string | null {
  if (!isCalendarDate(invoiceDate)) return null;
  const date = new Date(`${invoiceDate}T00:00:00Z`);
  if (
    term.due_days !== null && Number.isInteger(term.due_days) &&
    term.due_days >= 0
  ) {
    date.setUTCDate(date.getUTCDate() + term.due_days);
    return date.toISOString().slice(0, 10);
  }
  if (
    term.day_of_month_due === null || term.day_of_month_due < 1 ||
    term.day_of_month_due > 31
  ) return null;
  const dueInMonth = (month: number) =>
    new Date(
      Date.UTC(
        date.getUTCFullYear(),
        month,
        Math.min(
          term.day_of_month_due!,
          new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0)).getUTCDate(),
        ),
      ),
    );
  let due = dueInMonth(date.getUTCMonth());
  const daysUntilDue = (due.getTime() - date.getTime()) / 86400000;
  if (daysUntilDue < 0 || daysUntilDue < (term.due_next_month_days ?? 0)) {
    due = dueInMonth(date.getUTCMonth() + 1);
  }
  return due.toISOString().slice(0, 10);
}
export async function loadInvoiceReviewContext(
  client: SupabaseClient,
  accessToken: string,
  realmId: string,
  workOrderId: string,
  organizationId: string,
  customerId: string,
  log: (step: string, details?: Record<string, unknown>) => void,
) {
  const { data, error } = await client.from("work_order_invoice_details")
    .select("invoice_date,due_date,payment_term_id,service_dates,qb_line_ids")
    .eq("work_order_id", workOrderId).eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error("Failed to load saved invoice details");
  const saved: InvoiceDetails = data ??
    {
      invoice_date: null,
      due_date: null,
      payment_term_id: null,
      service_dates: {},
      qb_line_ids: {},
    };
  const { data: previous, error: previousError } = await client.from(
    "quickbooks_export_logs",
  ).select("quickbooks_invoice_id").eq("work_order_id", workOrderId).eq(
    "organization_id",
    organizationId,
  ).eq("realm_id", realmId).eq("status", "success").order("created_at", {
    ascending: false,
  }).limit(1).maybeSingle();
  if (previousError) throw new Error("Failed to load invoice export history");
  const get = async (path: string) => {
    const response = await fetch(
      withMinorVersion(`${QBO_API_BASE}/v3/company/${realmId}/${path}`),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );
    if (!response.ok) {
      throw new InvoiceReviewError(
        "Could not read QuickBooks billing details. Try again before exporting.",
      );
    }
    const result = await response.json();
    if (result.Fault) {
      throw new InvoiceReviewError(
        "QuickBooks could not provide billing details.",
      );
    }
    return result;
  };
  const [customer, termResponse, existing] = await Promise.all([
    get(`customer/${encodeURIComponent(customerId)}`),
    get(
      `query?query=${
        encodeURIComponent(
          "select * from Term where Active = true MAXRESULTS 1000",
        )
      }`,
    ),
    previous?.quickbooks_invoice_id
      ? fetchExistingInvoiceForUpdate(
        accessToken,
        realmId,
        previous.quickbooks_invoice_id,
        log,
      )
      : Promise.resolve(null),
  ]);
  if (existing && existing.CustomerRef.value !== customerId) {
    throw new InvoiceReviewError(
      "The mapped customer differs from the existing invoice. Review this invoice in QuickBooks.",
    );
  }
  const terms: InvoiceTerm[] = (termResponse.QueryResponse?.Term ?? []).map((
    term: {
      Id: string;
      Name: string;
      Type?: string;
      DueDays?: number;
      DayOfMonthDue?: number;
      DueNextMonthDays?: number;
    },
  ) => ({
    id: term.Id,
    name: term.Name,
    due_days: term.Type === "DATE_DRIVEN" || term.Type === "DateDriven" ||
        term.DayOfMonthDue != null
      ? null
      : term.DueDays ?? null,
    day_of_month_due: term.DayOfMonthDue ?? null,
    due_next_month_days: term.DueNextMonthDays ?? null,
  }));
  return {
    saved,
    hasSavedDetails: data !== null,
    existing: existing as QuickBooksInvoice | null,
    terms,
    customerTermId: customer.Customer?.SalesTermRef?.value ?? null,
  };
}
export function updateBlockingReason(
  existing: QuickBooksInvoice | null,
  saved: InvoiceDetails,
  services: InvoiceService[],
  realmId: string,
): string | null {
  if (!existing) return null;
  if (
    saved.qb_line_ids.__realm_id !== realmId ||
    saved.qb_line_ids.__invoice_id !== existing.Id
  ) {
    return "This invoice does not have a complete saved line association. Review/update it in QuickBooks to preserve its existing charges.";
  }
  if (existing.AllowOnlineCreditCardPayment || existing.AllowOnlineACHPayment) {
    return "Online payments are enabled on this invoice. Review/update it in QuickBooks to avoid automatic customer delivery.";
  }
  if (
    services.some((service) =>
      !saved.qb_line_ids[service.key] ||
      !existing.Line.some((line) => line.Id === saved.qb_line_ids[service.key])
    )
  ) {
    return "This invoice does not have a complete saved line association. Review/update it in QuickBooks to preserve its existing charges.";
  }
  return null;
}
export function validateConfirmation(
  value: InvoiceConfirmation | undefined,
  existing: QuickBooksInvoice | null,
  services: InvoiceService[],
  terms: InvoiceTerm[],
): InvoiceConfirmation {
  if (
    !value || !isCalendarDate(value.invoice_date) ||
    !isCalendarDate(value.due_date)
  ) {
    throw new InvoiceReviewError(
      "Select and confirm Invoice date and Due date before exporting.",
    );
  }
  if (
    value.existing_invoice_id !== (existing?.Id ?? null) ||
    value.existing_sync_token !== (existing?.SyncToken ?? null)
  ) {
    throw new InvoiceReviewError(
      "The QuickBooks invoice changed since review. Reload and review it again before exporting.",
    );
  }
  if (
    value.payment_term_id !== null &&
    !terms.some((term) => term.id === value.payment_term_id) &&
    value.payment_term_id !== existing?.SalesTermRef?.value
  ) {
    throw new InvoiceReviewError(
      "Select valid QuickBooks payment terms or an explicit Due date.",
    );
  }
  if (
    !value.service_dates ||
    services.some((service) =>
      !isCalendarDate(value.service_dates[service.key])
    )
  ) {
    throw new InvoiceReviewError(
      "Select a Service date for every invoice line before exporting.",
    );
  }
  if (
    value.overwrite_existing_dates !== undefined &&
    typeof value.overwrite_existing_dates !== "boolean"
  ) {
    throw new InvoiceReviewError(
      "Confirm whether invoice dates should be replaced.",
    );
  }
  if (existing?.SalesTermRef?.value && value.payment_term_id === null) {
    throw new InvoiceReviewError(
      "Keep the existing payment terms or select replacement terms. Clear terms directly in QuickBooks.",
    );
  }
  if (
    existing && !value.overwrite_existing_dates &&
    (value.invoice_date !== existing.TxnDate ||
      value.due_date !== existing.DueDate ||
      value.payment_term_id !== (existing.SalesTermRef?.value ?? null))
  ) {
    throw new InvoiceReviewError(
      "QuickBooks dates differ. Choose to preserve them or explicitly replace them after review.",
    );
  }
  return value;
}
export function mergeInvoiceLines(
  generated: InvoiceSalesLines,
  services: InvoiceService[],
  existing: QuickBooksInvoice | null,
  saved: InvoiceDetails,
  confirmation: InvoiceConfirmation,
  realmId: string,
): InvoiceSalesLines {
  if (generated.length !== services.length) {
    throw new InvoiceReviewError(
      "Invoice lines changed. Review again before exporting.",
    );
  }
  if (!existing) return generated;
  const reason = updateBlockingReason(existing, saved, services, realmId);
  if (reason) throw new InvoiceReviewError(reason);
  const replacements = new Map(
    services.map((
      service,
      index,
    ) => [saved.qb_line_ids[service.key], { service, line: generated[index] }]),
  );
  return existing.Line.map((old) => {
    const replacement = old.Id ? replacements.get(old.Id) : undefined;
    if (!replacement) return old;
    return {
      ...old,
      Description: replacement.line.Description,
      SalesItemLineDetail: {
        ...old.SalesItemLineDetail,
        TaxCodeRef: replacement.line.SalesItemLineDetail.TaxCodeRef,
        ServiceDate: old.SalesItemLineDetail?.ServiceDate ??
          confirmation.service_dates[replacement.service.key],
      },
    };
  });
}

/** Canonical source snapshot excludes user-edited billing inputs and clock values. */
export async function invoiceSourceFingerprint(
  source: unknown,
): Promise<string> {
  const canonicalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map((
          [key, item],
        ) => [key, canonicalize(item)]),
      );
    }
    return value;
  };
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(canonicalize(source))),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
