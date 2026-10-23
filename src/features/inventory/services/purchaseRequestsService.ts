import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type {
  CreateInventoryPurchaseRequestInput,
  InventoryPurchaseRequest,
  InventoryPurchaseRequestRow,
  InventoryPurchaseRequestStatus,
  ReceiveInventoryPurchaseRequestInput,
} from '@/features/inventory/types/inventory';

type JoinedInventoryItemSummary = {
  name: string;
  sku: string | null;
  quantity_on_hand: number;
  low_stock_threshold: number;
  location: string | null;
};

type PurchaseRequestRowWithJoin = InventoryPurchaseRequestRow & {
  inventory_items?: JoinedInventoryItemSummary | JoinedInventoryItemSummary[] | null;
};

function normalizePurchaseRequestStatus(status: string): InventoryPurchaseRequestStatus {
  if (
    status === 'requested' ||
    status === 'ordered' ||
    status === 'received' ||
    status === 'cancelled'
  ) {
    return status;
  }
  return 'requested';
}

function mapPurchaseRequestRow(row: PurchaseRequestRowWithJoin): InventoryPurchaseRequest {
  const joinedItem = Array.isArray(row.inventory_items)
    ? row.inventory_items[0]
    : row.inventory_items;

  return {
    id: row.id,
    organization_id: row.organization_id,
    inventory_item_id: row.inventory_item_id,
    requested_quantity: row.requested_quantity,
    vendor_name: row.vendor_name,
    notes: row.notes,
    status: normalizePurchaseRequestStatus(row.status),
    created_by: row.created_by,
    ordered_at: row.ordered_at,
    ordered_by: row.ordered_by,
    received_at: row.received_at,
    received_by: row.received_by,
    received_quantity: row.received_quantity,
    invoice_number: row.invoice_number,
    received_unit_cost: row.received_unit_cost,
    inventory_transaction_id: row.inventory_transaction_id,
    cancelled_at: row.cancelled_at,
    cancelled_by: row.cancelled_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    inventoryItemName: joinedItem?.name,
    inventoryItemSku: joinedItem?.sku ?? null,
    inventoryItemQuantityOnHand: joinedItem?.quantity_on_hand,
    inventoryItemLowStockThreshold: joinedItem?.low_stock_threshold,
    inventoryItemLocation: joinedItem?.location ?? null,
  };
}

export async function getInventoryPurchaseRequests(
  organizationId: string,
  options?: {
    status?: InventoryPurchaseRequestStatus | 'all';
    inventoryItemId?: string;
  },
): Promise<InventoryPurchaseRequest[]> {
  try {
    let query = supabase
      .from('inventory_purchase_requests')
      .select(
        `
        *,
        inventory_items!inner(
          name,
          sku,
          quantity_on_hand,
          low_stock_threshold,
          location
        )
      `,
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.inventoryItemId) {
      query = query.eq('inventory_item_id', options.inventoryItemId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((row) => mapPurchaseRequestRow(row));
  } catch (error) {
    logger.error('Error fetching inventory purchase requests:', error);
    throw error;
  }
}

export async function createInventoryPurchaseRequest(
  organizationId: string,
  userId: string,
  input: CreateInventoryPurchaseRequestInput,
): Promise<InventoryPurchaseRequest> {
  if (!Number.isInteger(input.requestedQuantity) || input.requestedQuantity <= 0) {
    throw new Error('Requested quantity must be a positive integer');
  }

  try {
    const { data, error } = await supabase
      .from('inventory_purchase_requests')
      .insert({
        organization_id: organizationId,
        inventory_item_id: input.inventoryItemId,
        requested_quantity: input.requestedQuantity,
        vendor_name: input.vendorName?.trim() || null,
        notes: input.notes?.trim() || null,
        status: 'requested',
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapPurchaseRequestRow(data);
  } catch (error) {
    logger.error('Error creating inventory purchase request:', error);
    throw error;
  }
}

async function transitionPurchaseRequestStatus(params: {
  organizationId: string;
  requestId: string;
  allowedCurrentStatuses: InventoryPurchaseRequestStatus[];
  patch: Partial<InventoryPurchaseRequestRow>;
  actionLabel: string;
}): Promise<InventoryPurchaseRequest> {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('inventory_purchase_requests')
      .update({
        ...params.patch,
        updated_at: nowIso,
      })
      .eq('id', params.requestId)
      .eq('organization_id', params.organizationId)
      .in('status', params.allowedCurrentStatuses)
      .select('*')
      .single();

    if (error) throw error;
    return mapPurchaseRequestRow(data);
  } catch (error) {
    logger.error(`Error ${params.actionLabel}:`, error);
    throw error;
  }
}

export async function markInventoryPurchaseRequestOrdered(
  organizationId: string,
  requestId: string,
  userId: string,
): Promise<InventoryPurchaseRequest> {
  return transitionPurchaseRequestStatus({
    organizationId,
    requestId,
    allowedCurrentStatuses: ['requested'],
    patch: {
      status: 'ordered',
      ordered_at: new Date().toISOString(),
      ordered_by: userId,
    },
    actionLabel: 'marking purchase request ordered',
  });
}

export async function cancelInventoryPurchaseRequest(
  organizationId: string,
  requestId: string,
  userId: string,
): Promise<InventoryPurchaseRequest> {
  return transitionPurchaseRequestStatus({
    organizationId,
    requestId,
    allowedCurrentStatuses: ['requested', 'ordered'],
    patch: {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId,
    },
    actionLabel: 'cancelling purchase request',
  });
}

export async function receiveInventoryPurchaseRequest(
  input: ReceiveInventoryPurchaseRequestInput,
): Promise<InventoryPurchaseRequest> {
  if (!Number.isInteger(input.receivedQuantity) || input.receivedQuantity <= 0) {
    throw new Error('Received quantity must be a positive integer');
  }

  try {
    const { data, error } = await supabase.rpc('receive_inventory_purchase_request', {
      p_request_id: input.requestId,
      p_received_quantity: input.receivedQuantity,
      p_invoice_number: input.invoiceNumber?.trim() || null,
      p_received_unit_cost: input.receivedUnitCost ?? null,
      p_notes: input.notes?.trim() || null,
    });

    if (error) throw error;
    return mapPurchaseRequestRow(data);
  } catch (error) {
    logger.error('Error receiving purchase request:', error);
    throw error;
  }
}
