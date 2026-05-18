import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkOrderCostsState } from '../useWorkOrderCostsState';
import type { WorkOrderCost } from '@/features/work-orders/types/workOrderCosts';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

let _idCounter = 1;

const makeWorkOrderCost = (overrides: Partial<WorkOrderCost> = {}): WorkOrderCost => ({
  id: `cost-${_idCounter++}`,
  work_order_id: 'wo-1',
  description: 'Test cost',
  quantity: 2,
  unit_price_cents: 500,
  total_price_cents: 1000,
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  inventory_item_id: null,
  original_quantity: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Legacy tests (preserved)
// ---------------------------------------------------------------------------

describe('useWorkOrderCostsState', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    _idCounter = 1;
  });

  it('uses crypto.randomUUID when available', () => {
    const deterministicUuid = '11111111-1111-4111-8111-111111111111';
    vi.stubGlobal('crypto', {
      randomUUID: () => deterministicUuid,
    });
    const { result } = renderHook(() => useWorkOrderCostsState([]));
    act(() => {
      result.current.resetCostsWithMinimum([]);
    });
    expect(result.current.costs).toHaveLength(1);
    expect(result.current.costs[0].id).toBe(deterministicUuid);
  });

  it('uses fallback id when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {});
    const { result } = renderHook(() => useWorkOrderCostsState([]));
    act(() => {
      result.current.resetCostsWithMinimum([]);
    });
    expect(result.current.costs[0].id).toMatch(/^new-cost-\d+-[a-z0-9]+$/);
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('starts with an empty costs array when no initialCosts are provided', () => {
      const { result } = renderHook(() => useWorkOrderCostsState());
      expect(result.current.costs).toHaveLength(0);
    });

    it('maps initialCosts to WorkOrderCostItems with correct fields', () => {
      const cost = makeWorkOrderCost({ description: 'Labor', quantity: 3, unit_price_cents: 200 });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      expect(result.current.costs).toHaveLength(1);
      expect(result.current.costs[0].description).toBe('Labor');
      expect(result.current.costs[0].quantity).toBe(3);
      expect(result.current.costs[0].unit_price_cents).toBe(200);
    });

    it('does not carry over created_by or created_at from source costs', () => {
      const cost = makeWorkOrderCost();
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      expect(result.current.costs[0]).not.toHaveProperty('created_by');
      expect(result.current.costs[0]).not.toHaveProperty('created_at');
    });
  });

  // -------------------------------------------------------------------------
  // addCost
  // -------------------------------------------------------------------------

  describe('addCost', () => {
    it('appends a new empty placeholder row', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => { result.current.addCost(); });

      expect(result.current.costs).toHaveLength(1);
    });

    it('new placeholder row has isNew=true and an empty description', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => { result.current.addCost(); });

      expect(result.current.costs[0].isNew).toBe(true);
      expect(result.current.costs[0].description).toBe('');
    });

    it('new placeholder row starts with quantity=1 and unit_price_cents=0', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => { result.current.addCost(); });

      expect(result.current.costs[0].quantity).toBe(1);
      expect(result.current.costs[0].unit_price_cents).toBe(0);
      expect(result.current.costs[0].total_price_cents).toBe(0);
    });

    it('calling addCost multiple times appends multiple rows', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => {
        result.current.addCost();
        result.current.addCost();
        result.current.addCost();
      });

      expect(result.current.costs).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // addFilledCost
  // -------------------------------------------------------------------------

  describe('addFilledCost', () => {
    it('adds a pre-filled cost with total_price_cents = quantity × unit_price_cents', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => {
        result.current.addFilledCost({
          id: 'fc-1',
          work_order_id: 'wo-1',
          description: 'Widget',
          quantity: 4,
          unit_price_cents: 250,
        });
      });

      expect(result.current.costs).toHaveLength(1);
      expect(result.current.costs[0].total_price_cents).toBe(1000);
    });

    it('marks the added cost as isNew=false because it is already saved', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => {
        result.current.addFilledCost({
          id: 'fc-2',
          work_order_id: 'wo-1',
          description: 'Part',
          quantity: 1,
          unit_price_cents: 100,
        });
      });

      expect(result.current.costs[0].isNew).toBe(false);
    });

    it('removes empty placeholder rows before adding the filled cost', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      // Add two empty placeholders first
      act(() => {
        result.current.addCost();
        result.current.addCost();
      });
      expect(result.current.costs).toHaveLength(2);

      // addFilledCost should remove the empty ones
      act(() => {
        result.current.addFilledCost({
          id: 'fc-3',
          work_order_id: 'wo-1',
          description: 'Filled part',
          quantity: 1,
          unit_price_cents: 50,
        });
      });

      expect(result.current.costs).toHaveLength(1);
      expect(result.current.costs[0].description).toBe('Filled part');
    });

    it('keeps non-empty placeholder rows when adding a filled cost', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => { result.current.addCost(); });

      // Type something into the placeholder via updateCost
      const placeholderId = result.current.costs[0].id;
      act(() => { result.current.updateCost(placeholderId, 'description', 'Has content'); });

      // addFilledCost should keep the non-empty placeholder
      act(() => {
        result.current.addFilledCost({
          id: 'fc-4',
          work_order_id: 'wo-1',
          description: 'Another',
          quantity: 1,
          unit_price_cents: 10,
        });
      });

      expect(result.current.costs).toHaveLength(2);
    });

    it('stores inventory_item_id and original_quantity when provided', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => {
        result.current.addFilledCost({
          id: 'fc-5',
          work_order_id: 'wo-1',
          description: 'Inventory item',
          quantity: 2,
          unit_price_cents: 300,
          inventory_item_id: 'inv-abc',
          original_quantity: 5,
        });
      });

      expect(result.current.costs[0].inventory_item_id).toBe('inv-abc');
      expect(result.current.costs[0].original_quantity).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // removeCost
  // -------------------------------------------------------------------------

  describe('removeCost', () => {
    it('completely removes a cost that has isNew=true', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => { result.current.addCost(); });
      const newId = result.current.costs[0].id;

      act(() => { result.current.removeCost(newId); });

      expect(result.current.costs).toHaveLength(0);
    });

    it('marks a persisted (non-new) cost as isDeleted so it disappears from costs', () => {
      const persisted = makeWorkOrderCost({ id: 'persisted-1' });
      const { result } = renderHook(() => useWorkOrderCostsState([persisted]));

      act(() => { result.current.removeCost('persisted-1'); });

      // costs getter filters out deleted items
      expect(result.current.costs).toHaveLength(0);
    });

    it('leaves other costs untouched when removing one', () => {
      const c1 = makeWorkOrderCost({ id: 'c1' });
      const c2 = makeWorkOrderCost({ id: 'c2', description: 'Keep me' });
      const { result } = renderHook(() => useWorkOrderCostsState([c1, c2]));

      act(() => { result.current.removeCost('c1'); });

      expect(result.current.costs).toHaveLength(1);
      expect(result.current.costs[0].description).toBe('Keep me');
    });
  });

  // -------------------------------------------------------------------------
  // updateCost
  // -------------------------------------------------------------------------

  describe('updateCost', () => {
    it('updates the specified field on the matching cost', () => {
      const cost = makeWorkOrderCost({ id: 'uc-1', description: 'Old description' });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      act(() => { result.current.updateCost('uc-1', 'description', 'New description'); });

      expect(result.current.costs[0].description).toBe('New description');
    });

    it('recalculates total_price_cents when quantity changes', () => {
      const cost = makeWorkOrderCost({ id: 'uc-2', quantity: 2, unit_price_cents: 500, total_price_cents: 1000 });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      act(() => { result.current.updateCost('uc-2', 'quantity', 5); });

      expect(result.current.costs[0].total_price_cents).toBe(2500);
    });

    it('recalculates total_price_cents when unit_price_cents changes', () => {
      const cost = makeWorkOrderCost({ id: 'uc-3', quantity: 3, unit_price_cents: 100, total_price_cents: 300 });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      act(() => { result.current.updateCost('uc-3', 'unit_price_cents', 200); });

      expect(result.current.costs[0].total_price_cents).toBe(600);
    });

    it('does NOT recalculate total when only the description field changes', () => {
      const cost = makeWorkOrderCost({ id: 'uc-4', quantity: 2, unit_price_cents: 400, total_price_cents: 800 });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      act(() => { result.current.updateCost('uc-4', 'description', 'Different'); });

      expect(result.current.costs[0].total_price_cents).toBe(800);
    });

    it('does not affect other costs when updating one', () => {
      const c1 = makeWorkOrderCost({ id: 'uc-5a', description: 'First', quantity: 1, unit_price_cents: 100, total_price_cents: 100 });
      const c2 = makeWorkOrderCost({ id: 'uc-5b', description: 'Second', quantity: 2, unit_price_cents: 200, total_price_cents: 400 });
      const { result } = renderHook(() => useWorkOrderCostsState([c1, c2]));

      act(() => { result.current.updateCost('uc-5a', 'quantity', 10); });

      expect(result.current.costs[0].total_price_cents).toBe(1000); // 10 × 100
      expect(result.current.costs[1].total_price_cents).toBe(400); // unchanged
    });
  });

  // -------------------------------------------------------------------------
  // getCleanCosts
  // -------------------------------------------------------------------------

  describe('getCleanCosts', () => {
    it('excludes deleted costs', () => {
      const persisted = makeWorkOrderCost({ id: 'gc-1', description: 'Real cost' });
      const { result } = renderHook(() => useWorkOrderCostsState([persisted]));

      act(() => { result.current.removeCost('gc-1'); });

      expect(result.current.getCleanCosts()).toHaveLength(0);
    });

    it('excludes costs with an empty (or whitespace-only) description', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => { result.current.addCost(); }); // blank description

      expect(result.current.getCleanCosts()).toHaveLength(0);
    });

    it('includes valid non-deleted costs with non-empty descriptions', () => {
      const cost = makeWorkOrderCost({ id: 'gc-2', description: 'Valid cost' });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      expect(result.current.getCleanCosts()).toHaveLength(1);
    });

    it('trims whitespace from descriptions in the result', () => {
      const cost = makeWorkOrderCost({ id: 'gc-3', description: '  Trim me  ' });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      const clean = result.current.getCleanCosts();
      expect(clean[0].description).toBe('Trim me');
    });
  });

  // -------------------------------------------------------------------------
  // getNewCosts
  // -------------------------------------------------------------------------

  describe('getNewCosts', () => {
    it('returns only new costs that have a non-empty description', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => { result.current.addCost(); });
      const newId = result.current.costs[0].id;
      act(() => { result.current.updateCost(newId, 'description', 'New item'); });

      expect(result.current.getNewCosts()).toHaveLength(1);
    });

    it('excludes new costs with an empty description', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => { result.current.addCost(); }); // no description entered

      expect(result.current.getNewCosts()).toHaveLength(0);
    });

    it('excludes persisted (non-new) costs', () => {
      const persisted = makeWorkOrderCost({ id: 'gn-1' });
      const { result } = renderHook(() => useWorkOrderCostsState([persisted]));

      expect(result.current.getNewCosts()).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // getUpdatedCosts
  // -------------------------------------------------------------------------

  describe('getUpdatedCosts', () => {
    it('returns persisted costs that are not deleted', () => {
      const c1 = makeWorkOrderCost({ id: 'gu-1' });
      const c2 = makeWorkOrderCost({ id: 'gu-2' });
      const { result } = renderHook(() => useWorkOrderCostsState([c1, c2]));

      expect(result.current.getUpdatedCosts()).toHaveLength(2);
    });

    it('excludes deleted costs', () => {
      const cost = makeWorkOrderCost({ id: 'gu-3' });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      act(() => { result.current.removeCost('gu-3'); });

      expect(result.current.getUpdatedCosts()).toHaveLength(0);
    });

    it('excludes new (placeholder) costs', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => { result.current.addCost(); });

      expect(result.current.getUpdatedCosts()).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // getDeletedCosts
  // -------------------------------------------------------------------------

  describe('getDeletedCosts', () => {
    it('returns persisted costs that have been removed', () => {
      const cost = makeWorkOrderCost({ id: 'gd-1' });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      act(() => { result.current.removeCost('gd-1'); });

      expect(result.current.getDeletedCosts()).toHaveLength(1);
      expect(result.current.getDeletedCosts()[0].id).toBe('gd-1');
    });

    it('does not include new costs that were added then removed', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => { result.current.addCost(); });
      const newId = result.current.costs[0].id;
      act(() => { result.current.removeCost(newId); });

      // New costs are spliced out entirely, not marked deleted
      expect(result.current.getDeletedCosts()).toHaveLength(0);
    });

    it('returns an empty array when nothing has been deleted', () => {
      const cost = makeWorkOrderCost({ id: 'gd-2' });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      expect(result.current.getDeletedCosts()).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // getInventorySourcedCosts
  // -------------------------------------------------------------------------

  describe('getInventorySourcedCosts', () => {
    it('returns costs that have an inventory_item_id', () => {
      const c1 = makeWorkOrderCost({ id: 'gi-1', inventory_item_id: 'inv-1' });
      const c2 = makeWorkOrderCost({ id: 'gi-2', inventory_item_id: null });
      const { result } = renderHook(() => useWorkOrderCostsState([c1, c2]));

      const sourced = result.current.getInventorySourcedCosts();
      expect(sourced).toHaveLength(1);
      expect(sourced[0].id).toBe('gi-1');
    });

    it('excludes deleted costs even if they have an inventory_item_id', () => {
      const cost = makeWorkOrderCost({ id: 'gi-3', inventory_item_id: 'inv-2' });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      act(() => { result.current.removeCost('gi-3'); });

      expect(result.current.getInventorySourcedCosts()).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // validateCosts
  // -------------------------------------------------------------------------

  describe('validateCosts', () => {
    it('returns true when all costs have a description, positive quantity, and non-negative price', () => {
      const cost = makeWorkOrderCost({ description: 'Valid', quantity: 1, unit_price_cents: 0 });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      expect(result.current.validateCosts()).toBe(true);
    });

    it('returns true for an empty costs array', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      expect(result.current.validateCosts()).toBe(true);
    });

    it('returns false when a cost has an empty description', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => { result.current.addCost(); }); // empty description

      expect(result.current.validateCosts()).toBe(false);
    });

    it('returns false when quantity is zero', () => {
      const cost = makeWorkOrderCost({ id: 'val-1', description: 'Item', quantity: 0, unit_price_cents: 100 });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      expect(result.current.validateCosts()).toBe(false);
    });

    it('returns false when unit_price_cents is negative', () => {
      const cost = makeWorkOrderCost({ id: 'val-2', description: 'Item', quantity: 1, unit_price_cents: -1 });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      expect(result.current.validateCosts()).toBe(false);
    });

    it('skips deleted costs when validating (they do not cause failure)', () => {
      const persisted = makeWorkOrderCost({ id: 'val-3', description: 'Will be deleted' });
      const { result } = renderHook(() => useWorkOrderCostsState([persisted]));

      act(() => { result.current.removeCost('val-3'); });

      // After deletion the only remaining cost has isDeleted=true; validateCosts ignores it
      expect(result.current.validateCosts()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // resetCosts
  // -------------------------------------------------------------------------

  describe('resetCosts', () => {
    it('replaces all existing costs with the new set', () => {
      const initial = makeWorkOrderCost({ id: 'rs-1', description: 'Old' });
      const { result } = renderHook(() => useWorkOrderCostsState([initial]));

      const fresh = makeWorkOrderCost({ id: 'rs-2', description: 'Fresh' });
      act(() => { result.current.resetCosts([fresh]); });

      expect(result.current.costs).toHaveLength(1);
      expect(result.current.costs[0].description).toBe('Fresh');
    });

    it('resets to an empty array when called with an empty list', () => {
      const cost = makeWorkOrderCost({ id: 'rs-3' });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      act(() => { result.current.resetCosts([]); });

      expect(result.current.costs).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // resetCostsWithMinimum
  // -------------------------------------------------------------------------

  describe('resetCostsWithMinimum', () => {
    it('maps provided costs when the list is non-empty', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      const cost = makeWorkOrderCost({ id: 'rwm-1', description: 'Provided cost' });
      act(() => { result.current.resetCostsWithMinimum([cost]); });

      expect(result.current.costs).toHaveLength(1);
      expect(result.current.costs[0].description).toBe('Provided cost');
    });

    it('adds a placeholder row when the list is empty (min 1 editable row)', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      act(() => { result.current.resetCostsWithMinimum([]); });

      expect(result.current.costs).toHaveLength(1);
      expect(result.current.costs[0].isNew).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // hasInventorySource
  // -------------------------------------------------------------------------

  describe('hasInventorySource', () => {
    it('returns true when the cost has an inventory_item_id', () => {
      const cost = makeWorkOrderCost({ id: 'his-1', inventory_item_id: 'inv-xyz' });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      expect(result.current.hasInventorySource('his-1')).toBe(true);
    });

    it('returns false when the cost has no inventory_item_id', () => {
      const cost = makeWorkOrderCost({ id: 'his-2', inventory_item_id: null });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      expect(result.current.hasInventorySource('his-2')).toBe(false);
    });

    it('returns false when the id is not found in costs', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      expect(result.current.hasInventorySource('nonexistent')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getInventoryInfo
  // -------------------------------------------------------------------------

  describe('getInventoryInfo', () => {
    it('returns inventory info when the cost has an inventory_item_id', () => {
      const cost = makeWorkOrderCost({
        id: 'gii-1',
        inventory_item_id: 'inv-abc',
        quantity: 3,
        original_quantity: 10,
      });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      const info = result.current.getInventoryInfo('gii-1');
      expect(info).not.toBeNull();
      expect(info!.inventory_item_id).toBe('inv-abc');
      expect(info!.quantity).toBe(3);
      expect(info!.original_quantity).toBe(10);
    });

    it('returns null when the cost has no inventory_item_id', () => {
      const cost = makeWorkOrderCost({ id: 'gii-2', inventory_item_id: null });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      expect(result.current.getInventoryInfo('gii-2')).toBeNull();
    });

    it('returns null when the id is not found in costs', () => {
      const { result } = renderHook(() => useWorkOrderCostsState([]));

      expect(result.current.getInventoryInfo('unknown')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // costs visibility (deleted filter)
  // -------------------------------------------------------------------------

  describe('costs visibility', () => {
    it('the costs getter hides deleted costs but getDeletedCosts still sees them', () => {
      const cost = makeWorkOrderCost({ id: 'vis-1' });
      const { result } = renderHook(() => useWorkOrderCostsState([cost]));

      act(() => { result.current.removeCost('vis-1'); });

      expect(result.current.costs).toHaveLength(0);
      expect(result.current.getDeletedCosts()).toHaveLength(1);
    });

    it('shows costs that are NOT deleted', () => {
      const c1 = makeWorkOrderCost({ id: 'vis-2' });
      const c2 = makeWorkOrderCost({ id: 'vis-3' });
      const { result } = renderHook(() => useWorkOrderCostsState([c1, c2]));

      act(() => { result.current.removeCost('vis-2'); });

      expect(result.current.costs).toHaveLength(1);
      expect(result.current.costs[0].id).toBe('vis-3');
    });
  });
});
