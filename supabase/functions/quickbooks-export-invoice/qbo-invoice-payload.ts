import {
  QBO_INVOICE_CUSTOM_FIELD_DEFINITION_IDS,
  QBO_NON_TAXABLE_TAX_CODE_REF,
  QBO_TAXABLE_TAX_CODE_REF,
} from "../_shared/quickbooks-config.ts";
import type {
  InvoiceSalesLines,
  WorkOrderData,
  WorkOrderNote,
} from "./qbo-invoice-lines.ts";

export interface WorkOrderStatusEvent {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  reason: string | null;
}

export type QuickBooksInvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "paid"
  | "partially_paid"
  | "overdue"
  | "voided";

export interface QuickBooksInvoice {
  Id?: string;
  SyncToken?: string;
  CustomerRef: { value: string };
  Line: InvoiceSalesLines;
  CustomField?: Array<{
    DefinitionId: string;
    Name?: string;
    Type?: "StringType";
    StringValue: string;
  }>;
  PrivateNote?: string;
  CustomerMemo?: { value: string };
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  TxnTaxDetail?: {
    TotalTax?: number;
  };
  Balance?: number;
  TotalAmt?: number;
  EmailStatus?: string;
}

export interface VerifiedTaxState {
  isTaxExempt: boolean | null;
  verified: boolean;
  source: "quickbooks" | "cache" | "unconfirmed";
}

const formatTimelineTimestamp = (value: string): string => {
  const iso = new Date(value).toISOString();
  return `${iso.slice(0, 16)}z`;
};

const formatStatus = (status: string): string =>
  status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export function buildCustomerTimelineLines(
  statusEvents: WorkOrderStatusEvent[],
  notes: WorkOrderNote[],
): string[] {
  const timelineLines: Array<{ timestamp: string; text: string }> = [];

  statusEvents.forEach((event) => {
    const summary = event.reason
      ? `Status changed to ${formatStatus(event.new_status)} - ${event.reason}`
      : `Status changed to ${formatStatus(event.new_status)}`;
    timelineLines.push({ timestamp: event.changed_at, text: summary });
  });

  notes
    .filter((note) => !note.is_private)
    .forEach((note) => {
      timelineLines.push({ timestamp: note.created_at, text: note.content });
    });

  return timelineLines
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((entry) => `${formatTimelineTimestamp(entry.timestamp)} - [${entry.text}]`);
}

export function buildCustomerMemo(
  workOrder: WorkOrderData,
  notes: WorkOrderNote[],
  statusEvents: WorkOrderStatusEvent[],
): string {
  const publicNotes = notes.filter((note) => !note.is_private);
  const latestPublicResolution = publicNotes.length > 0
    ? publicNotes[publicNotes.length - 1].content
    : "Resolved per work order completion.";

  const header = [
    `Initial request: ${workOrder.description || workOrder.title}.`,
    `Resolution: ${latestPublicResolution}`,
  ].join("\n");

  const timeline = buildCustomerTimelineLines(statusEvents, notes);
  if (timeline.length === 0) {
    return header;
  }

  return `${header}\n\n${timeline.join("\n")}`.slice(0, 3900);
}

export function getMachineHoursCustomFieldValue(
  workOrder: WorkOrderData,
  notes: WorkOrderNote[],
): string {
  const intakeHours = workOrder.equipment_working_hours_at_creation;
  const checkoutEntry = [...notes]
    .reverse()
    .find((note) => note.machine_hours !== null && note.machine_hours !== undefined);
  const checkoutHours = checkoutEntry?.machine_hours ?? null;

  if (intakeHours !== null && checkoutHours !== null) {
    return `Intake ${intakeHours} / Checkout ${checkoutHours}`;
  }
  if (intakeHours !== null) {
    return `Intake ${intakeHours}`;
  }
  if (checkoutHours !== null) {
    return `Checkout ${checkoutHours}`;
  }
  return "N/A";
}

export function buildInvoiceCustomFields(
  workOrder: WorkOrderData,
  notes: WorkOrderNote[],
): NonNullable<QuickBooksInvoice["CustomField"]> {
  const makeModelValue = [workOrder.equipment?.manufacturer, workOrder.equipment?.model]
    .filter(Boolean)
    .join(" ")
    .trim() || workOrder.equipment?.name || "N/A";

  return [
    {
      DefinitionId: QBO_INVOICE_CUSTOM_FIELD_DEFINITION_IDS.makeModel,
      Type: "StringType",
      Name: "Make/Model",
      StringValue: makeModelValue,
    },
    {
      DefinitionId: QBO_INVOICE_CUSTOM_FIELD_DEFINITION_IDS.serial,
      Type: "StringType",
      Name: "Serial",
      StringValue: workOrder.equipment?.serial_number || "N/A",
    },
    {
      DefinitionId: QBO_INVOICE_CUSTOM_FIELD_DEFINITION_IDS.machineHours,
      Type: "StringType",
      Name: "Machine Hours",
      StringValue: getMachineHoursCustomFieldValue(workOrder, notes),
    },
  ];
}

export function applyInvoiceTaxState(
  lines: InvoiceSalesLines,
  taxState: VerifiedTaxState,
): InvoiceSalesLines {
  if (taxState.isTaxExempt === true) {
    return lines.map((line) => ({
      ...line,
      SalesItemLineDetail: {
        ...line.SalesItemLineDetail,
        TaxCodeRef: { value: QBO_NON_TAXABLE_TAX_CODE_REF },
      },
    }));
  }

  if (taxState.isTaxExempt === false && QBO_TAXABLE_TAX_CODE_REF) {
    return lines.map((line) => ({
      ...line,
      SalesItemLineDetail: {
        ...line.SalesItemLineDetail,
        TaxCodeRef: { value: QBO_TAXABLE_TAX_CODE_REF },
      },
    }));
  }

  return lines;
}

export function applyTransactionTaxState(
  invoice: QuickBooksInvoice,
  taxState: VerifiedTaxState,
): QuickBooksInvoice {
  if (taxState.isTaxExempt !== true) return invoice;
  return {
    ...invoice,
    TxnTaxDetail: {
      ...(invoice.TxnTaxDetail ?? {}),
      TotalTax: 0,
    },
  };
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export function amountToCents(value: unknown): number | null {
  const dollars = toNumber(value);
  return dollars === null ? null : Math.round(dollars * 100);
}

export function deriveQuickBooksInvoiceStatus(
  invoice: Pick<QuickBooksInvoice, "Balance" | "TotalAmt" | "EmailStatus" | "DueDate">,
  operation?: string,
  now: Date = new Date(),
): QuickBooksInvoiceStatus {
  const normalizedOperation = operation?.toLowerCase();
  if (normalizedOperation === "void" || normalizedOperation === "voided" || normalizedOperation === "delete") {
    return "voided";
  }

  const balanceCents = amountToCents(invoice.Balance);
  const totalCents = amountToCents(invoice.TotalAmt);

  if (balanceCents === null || totalCents === null) {
    const emailStatusFallback = invoice.EmailStatus?.toLowerCase();
    return emailStatusFallback === "emailsent" ? "sent" : "draft";
  }

  if (balanceCents <= 0 && totalCents > 0) {
    return "paid";
  }

  if (totalCents > 0 && balanceCents > 0 && balanceCents < totalCents) {
    return "partially_paid";
  }

  if (invoice.DueDate) {
    const dueDate = new Date(`${invoice.DueDate}T23:59:59Z`);
    if (!Number.isNaN(dueDate.getTime()) && dueDate < now) {
      return "overdue";
    }
  }

  const emailStatus = invoice.EmailStatus?.toLowerCase();
  if (emailStatus === "emailsent") {
    return "sent";
  }

  return "draft";
}

export const __payloadTestables = {
  applyInvoiceTaxState,
  applyTransactionTaxState,
  amountToCents,
  buildCustomerMemo,
  buildCustomerTimelineLines,
  buildInvoiceCustomFields,
  deriveQuickBooksInvoiceStatus,
  getMachineHoursCustomFieldValue,
};
