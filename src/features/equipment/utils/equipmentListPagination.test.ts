import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EQUIPMENT_CARD_PAGE_SIZE,
  DEFAULT_EQUIPMENT_TABLE_PAGE_SIZE,
  EQUIPMENT_CARD_PAGE_SIZE_OPTIONS,
  EQUIPMENT_TABLE_PAGE_SIZE_OPTIONS,
} from '@/features/equipment/utils/equipmentListPagination';

describe('equipmentListPagination', () => {
  it('uses smaller card defaults and larger table defaults', () => {
    expect(DEFAULT_EQUIPMENT_CARD_PAGE_SIZE).toBe(12);
    expect(DEFAULT_EQUIPMENT_TABLE_PAGE_SIZE).toBe(25);
  });

  it('exposes separate page-size option sets for card and table views', () => {
    expect(EQUIPMENT_CARD_PAGE_SIZE_OPTIONS).toEqual([12, 24, 36, 48]);
    expect(EQUIPMENT_TABLE_PAGE_SIZE_OPTIONS).toEqual([25, 50, 100, 200]);
  });
});
