import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  buildInvoiceLines,
  buildPrivateNote,
  type PreventativeMaintenanceInvoiceRow,
  type WorkOrderCost,
  type WorkOrderData,
  type WorkOrderNote,
} from "./qbo-invoice-lines.ts";
import {
  applyInvoiceTaxState,
  buildCustomerMemo,
  buildInvoiceCustomFields,
  type VerifiedTaxState,
  type WorkOrderStatusEvent,
} from "./qbo-invoice-payload.ts";

export interface WorkOrderExportContext {
  costs: WorkOrderCost[];
  notes: WorkOrderNote[];
  statusHistory: WorkOrderStatusEvent[];
  pmRow: PreventativeMaintenanceInvoiceRow | null;
}

export async function loadWorkOrderExportContext(
  supabaseClient: SupabaseClient,
  workOrderId: string,
  organizationId: string,
): Promise<WorkOrderExportContext> {
  const { data: costs } = await supabaseClient
    .from('work_order_costs')
    .select('id, description, quantity, unit_price_cents, total_price_cents, inventory_item_id, work_orders!inner(organization_id)')
    .eq('work_order_id', workOrderId)
    .eq('work_orders.organization_id', organizationId);

  const { data: notes } = await supabaseClient
    .from('work_order_notes')
    .select('id, content, is_private, author_name, created_at, hours_worked, machine_hours, work_orders!inner(organization_id)')
    .eq('work_order_id', workOrderId)
    .eq('work_orders.organization_id', organizationId)
    .order('created_at', { ascending: true });

  const { data: statusHistory } = await supabaseClient
    .from('work_order_status_history')
    .select('id, old_status, new_status, changed_at, reason, work_orders!inner(organization_id)')
    .eq('work_order_id', workOrderId)
    .eq('work_orders.organization_id', organizationId)
    .order('changed_at', { ascending: true });

  const { data: pmRow } = await supabaseClient
    .from('preventative_maintenance')
    .select(
      'id, checklist_data, notes, completed_by_name, pm_checklist_templates(name)',
    )
    .eq('work_order_id', workOrderId)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    costs: (costs || []) as WorkOrderCost[],
    notes: (notes || []) as WorkOrderNote[],
    statusHistory: (statusHistory || []) as WorkOrderStatusEvent[],
    pmRow: (pmRow ?? null) as PreventativeMaintenanceInvoiceRow | null,
  };
}

export interface PreparedInvoiceArtifacts {
  invoiceLines: Awaited<ReturnType<typeof buildInvoiceLines>>;
  privateNote: string;
  customerMemo: string;
  customFields: ReturnType<typeof buildInvoiceCustomFields>;
}

export async function buildPreparedInvoiceArtifacts(
  accessToken: string,
  realmId: string,
  workOrder: WorkOrderData,
  context: WorkOrderExportContext,
  taxState: VerifiedTaxState,
): Promise<PreparedInvoiceArtifacts> {
  const notesTyped = context.notes;
  const publicNotesText = notesTyped
    .filter((n) => !n.is_private)
    .map((n) => n.content)
    .join("\n");

  let invoiceLines = await buildInvoiceLines(
    accessToken,
    realmId,
    context.costs,
    notesTyped,
    {
      workOrder,
      pm: context.pmRow,
      publicNotesText,
    },
  );
  if (invoiceLines.length === 0) {
    throw new Error("No billable line items were found for this work order.");
  }
  invoiceLines = applyInvoiceTaxState(invoiceLines, taxState);
  const privateNote = buildPrivateNote(
    workOrder,
    context.notes,
    context.costs,
  );
  const customerMemo = buildCustomerMemo(
    workOrder,
    context.notes,
    context.statusHistory,
  );
  const customFields = buildInvoiceCustomFields(
    workOrder,
    context.notes,
  );

  return {
    invoiceLines,
    privateNote,
    customerMemo,
    customFields,
  };
}
