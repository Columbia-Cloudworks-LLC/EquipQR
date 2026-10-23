import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelInventoryPurchaseRequest,
  createInventoryPurchaseRequest,
  getInventoryPurchaseRequests,
  markInventoryPurchaseRequestOrdered,
  receiveInventoryPurchaseRequest,
} from '../purchaseRequestsService';
import { computeSuggestedRestockQuantity } from '../../components/RequestRestockDialog';

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

const sampleRow = {
  id: 'pr-1',
  organization_id: 'org-1',
  inventory_item_id: 'item-1',
  requested_quantity: 10,
  vendor_name: 'NAPA Auto Parts',
  notes: 'Need before Friday PM run',
  status: 'requested',
  created_by: 'user-1',
  ordered_at: null,
  ordered_by: null,
  received_at: null,
  received_by: null,
  received_quantity: null,
  invoice_number: null,
  received_unit_cost: null,
  inventory_transaction_id: null,
  cancelled_at: null,
  cancelled_by: null,
  created_at: '2026-04-20T12:00:00.000Z',
  updated_at: '2026-04-20T12:00:00.000Z',
  inventory_items: {
    name: 'Hydraulic Filter 10W',
    sku: 'HF-10W',
    quantity_on_hand: 2,
    low_stock_threshold: 5,
    location: 'Bin A3',
  },
};

describe('purchaseRequestsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computeSuggestedRestockQuantity', () => {
    it('computes 2x low_stock_threshold minus current quantity on hand when threshold > 0', () => {
      expect(
        computeSuggestedRestockQuantity({
          quantity_on_hand: 2,
          low_stock_threshold: 5,
        }),
      ).toBe(8);
    });

    it('returns at least 1 even when quantity_on_hand exceeds 2x threshold', () => {
      expect(
        computeSuggestedRestockQuantity({
          quantity_on_hand: 20,
          low_stock_threshold: 5,
        }),
      ).toBe(1);
    });

    it('defaults to 1 when low_stock_threshold is 0 or item is null', () => {
      expect(
        computeSuggestedRestockQuantity({
          quantity_on_hand: 0,
          low_stock_threshold: 0,
        }),
      ).toBe(1);
      expect(computeSuggestedRestockQuantity(null)).toBe(1);
    });
  });

  describe('getInventoryPurchaseRequests', () => {
    it('fetches purchase requests with joined inventory item details', async () => {
      const eqItemMock = vi.fn().mockResolvedValue({ data: [sampleRow], error: null });
      const eqStatusMock = vi.fn().mockReturnValue({ eq: eqItemMock });
      const orderMock = vi.fn().mockReturnValue({ eq: eqStatusMock });
      const eqOrgMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqOrgMock });
      mockFrom.mockReturnValue({ select: selectMock });

      const result = await getInventoryPurchaseRequests('org-1', {
        status: 'requested',
        inventoryItemId: 'item-1',
      });

      expect(mockFrom).toHaveBeenCalledWith('inventory_purchase_requests');
      expect(eqOrgMock).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(eqStatusMock).toHaveBeenCalledWith('status', 'requested');
      expect(eqItemMock).toHaveBeenCalledWith('inventory_item_id', 'item-1');
      expect(result).toHaveLength(1);
      expect(result[0].inventoryItemName).toBe('Hydraulic Filter 10W');
      expect(result[0].inventoryItemSku).toBe('HF-10W');
      expect(result[0].status).toBe('requested');
    });
  });

  describe('createInventoryPurchaseRequest', () => {
    it('rejects non-positive quantities', async () => {
      await expect(
        createInventoryPurchaseRequest('org-1', 'user-1', {
          inventoryItemId: 'item-1',
          requestedQuantity: 0,
        }),
      ).rejects.toThrow('Requested quantity must be a positive integer');
    });

    it('inserts a requested purchase request scoped to the organization', async () => {
      const singleMock = vi.fn().mockResolvedValue({ data: sampleRow, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      mockFrom.mockReturnValue({ insert: insertMock });

      const created = await createInventoryPurchaseRequest('org-1', 'user-1', {
        inventoryItemId: 'item-1',
        requestedQuantity: 10,
        vendorName: ' NAPA Auto Parts ',
        notes: ' Need before Friday PM run ',
      });

      expect(insertMock).toHaveBeenCalledWith({
        organization_id: 'org-1',
        inventory_item_id: 'item-1',
        requested_quantity: 10,
        vendor_name: 'NAPA Auto Parts',
        notes: 'Need before Friday PM run',
        status: 'requested',
        created_by: 'user-1',
      });
      expect(created.id).toBe('pr-1');
    });
  });

  describe('markInventoryPurchaseRequestOrdered & cancelInventoryPurchaseRequest', () => {
    it('transitions requested -> ordered', async () => {
      const orderedRow = {
        ...sampleRow,
        status: 'ordered',
        ordered_by: 'user-1',
        ordered_at: '2026-04-21T10:00:00.000Z',
      };
      const singleMock = vi.fn().mockResolvedValue({ data: orderedRow, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const inStatusMock = vi.fn().mockReturnValue({ select: selectMock });
      const eqOrgMock = vi.fn().mockReturnValue({ in: inStatusMock });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqOrgMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      mockFrom.mockReturnValue({ update: updateMock });

      const result = await markInventoryPurchaseRequestOrdered('org-1', 'pr-1', 'user-1');
      expect(result.status).toBe('ordered');
      expect(inStatusMock).toHaveBeenCalledWith('status', ['requested']);
    });

    it('transitions requested/ordered -> cancelled', async () => {
      const cancelledRow = {
        ...sampleRow,
        status: 'cancelled',
        cancelled_by: 'user-1',
        cancelled_at: '2026-04-21T11:00:00.000Z',
      };
      const singleMock = vi.fn().mockResolvedValue({ data: cancelledRow, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const inStatusMock = vi.fn().mockReturnValue({ select: selectMock });
      const eqOrgMock = vi.fn().mockReturnValue({ in: inStatusMock });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqOrgMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      mockFrom.mockReturnValue({ update: updateMock });

      const result = await cancelInventoryPurchaseRequest('org-1', 'pr-1', 'user-1');
      expect(result.status).toBe('cancelled');
      expect(inStatusMock).toHaveBeenCalledWith('status', ['requested', 'ordered']);
    });
  });

  describe('receiveInventoryPurchaseRequest', () => {
    it('calls receive_inventory_purchase_request RPC with sanitized arguments', async () => {
      const receivedRow = {
        ...sampleRow,
        status: 'received',
        received_quantity: 10,
        invoice_number: 'INV-900',
        received_unit_cost: 14.5,
        inventory_transaction_id: 'tx-1',
      };
      mockRpc.mockResolvedValue({ data: receivedRow, error: null });

      const result = await receiveInventoryPurchaseRequest({
        requestId: 'pr-1',
        receivedQuantity: 10,
        invoiceNumber: ' INV-900 ',
        receivedUnitCost: 14.5,
        notes: ' All 10 filters intact ',
      });

      expect(mockRpc).toHaveBeenCalledWith('receive_inventory_purchase_request', {
        p_request_id: 'pr-1',
        p_received_quantity: 10,
        p_invoice_number: 'INV-900',
        p_received_unit_cost: 14.5,
        p_notes: 'All 10 filters intact',
      });
      expect(result.status).toBe('received');
      expect(result.received_quantity).toBe(10);
      expect(result.invoice_number).toBe('INV-900');
    });
  });
});
