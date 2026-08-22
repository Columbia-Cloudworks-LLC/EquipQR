import { describe, expect, it } from 'vitest';
import {
  mapCostRowsToWorkOrderCosts,
  resolveWorkOrderCostTotalCents,
} from './workOrderCostListHelpers';

describe('resolveWorkOrderCostTotalCents', () => {
  it('keeps an explicit total', () => {
    expect(resolveWorkOrderCostTotalCents({
      total_price_cents: 2500,
      quantity: 2,
      unit_price_cents: 1000,
    })).toBe(2500);
  });

  it('computes quantity times unit price when total is null', () => {
    expect(resolveWorkOrderCostTotalCents({
      total_price_cents: null,
      quantity: 3,
      unit_price_cents: 1500,
    })).toBe(4500);
  });

  it('keeps a zero total instead of recomputing', () => {
    expect(resolveWorkOrderCostTotalCents({
      total_price_cents: 0,
      quantity: 2,
      unit_price_cents: 1000,
    })).toBe(0);
  });
});

describe('mapCostRowsToWorkOrderCosts', () => {
  it('maps a null work order title to undefined', () => {
    const [cost] = mapCostRowsToWorkOrderCosts(
      [{
        id: 'cost-1',
        work_order_id: 'wo-1',
        description: 'Parts',
        quantity: 1,
        unit_price_cents: 1000,
        total_price_cents: null,
        created_by: 'user-1',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        work_orders: { title: null },
      }],
      { 'user-1': 'Jane' },
    );

    expect(cost.total_price_cents).toBe(1000);
    expect(cost.workOrderTitle).toBeUndefined();
    expect(cost.createdByName).toBe('Jane');
  });
});
