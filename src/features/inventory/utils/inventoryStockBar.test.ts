import { describe, expect, it } from 'vitest';
import { computeInventoryStockBarState } from './inventoryStockBar';

describe('computeInventoryStockBarState', () => {
  it('returns empty fill at zero quantity with notch at threshold edge', () => {
    expect(computeInventoryStockBarState(0, 5)).toEqual({
      fillPercent: 0,
      notchPercent: 100,
      ariaLabel: '0 on hand, low stock threshold 5',
      ariaValueMin: 0,
      ariaValueMax: 5,
      ariaValueNow: 0,
    });
  });

  it('returns empty fill for negative quantity', () => {
    expect(computeInventoryStockBarState(-3, 5)).toEqual({
      fillPercent: 0,
      notchPercent: 100,
      ariaLabel: '-3 on hand, low stock threshold 5',
      ariaValueMin: 0,
      ariaValueMax: 5,
      ariaValueNow: 0,
    });
  });

  it('grows fill linearly below threshold with notch pinned right', () => {
    expect(computeInventoryStockBarState(2, 8)).toEqual({
      fillPercent: 25,
      notchPercent: 100,
      ariaLabel: '2 on hand, low stock threshold 8, 25% of threshold',
      ariaValueMin: 0,
      ariaValueMax: 8,
      ariaValueNow: 2,
    });
  });

  it('fills to 100% at threshold with notch at right edge', () => {
    expect(computeInventoryStockBarState(5, 5)).toEqual({
      fillPercent: 100,
      notchPercent: 100,
      ariaLabel: '5 on hand, low stock threshold 5, 100% of threshold',
      ariaValueMin: 0,
      ariaValueMax: 5,
      ariaValueNow: 5,
    });
  });

  it('keeps fill full and shifts notch left logarithmically above threshold', () => {
    const at2x = computeInventoryStockBarState(10, 5);
    expect(at2x.fillPercent).toBe(100);
    expect(at2x.notchPercent).toBe(82);
    expect(at2x.ariaLabel).toBe('10 on hand, low stock threshold 5, 2x over threshold');
    expect(at2x.ariaValueNow).toBe(5);

    const at4x = computeInventoryStockBarState(20, 5);
    expect(at4x.fillPercent).toBe(100);
    expect(at4x.notchPercent).toBe(64);
    expect(at4x.ariaValueNow).toBe(5);

    const at8x = computeInventoryStockBarState(40, 5);
    expect(at8x.fillPercent).toBe(100);
    expect(at8x.notchPercent).toBe(46);
    expect(at8x.ariaValueNow).toBe(5);
  });

  it('guards zero threshold with minimum divisor of 1', () => {
    expect(computeInventoryStockBarState(3, 0)).toEqual({
      fillPercent: 100,
      notchPercent: 71,
      ariaLabel: '3 on hand, low stock threshold 1, 3x over threshold',
      ariaValueMin: 0,
      ariaValueMax: 1,
      ariaValueNow: 1,
    });
  });
});
