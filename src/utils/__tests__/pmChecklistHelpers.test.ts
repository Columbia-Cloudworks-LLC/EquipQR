import { describe, it, expect } from 'vitest';
import { getItemStatus, getStatusText, createSegmentsForSection } from '../pmChecklistHelpers';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

describe('pmChecklistHelpers', () => {
  describe('getItemStatus', () => {
    it('returns not_rated when condition is null', () => {
      const item = { id: '1', condition: null } as PMChecklistItem;
      expect(getItemStatus(item)).toBe('not_rated');
    });

    it('returns not_rated when condition is undefined', () => {
      const item = { id: '1' } as PMChecklistItem;
      expect(getItemStatus(item)).toBe('not_rated');
    });

    it('returns ok for condition 1', () => {
      const item = { id: '1', condition: 1 } as PMChecklistItem;
      expect(getItemStatus(item)).toBe('ok');
    });

    it('returns adjusted for condition 2', () => {
      const item = { id: '1', condition: 2 } as PMChecklistItem;
      expect(getItemStatus(item)).toBe('adjusted');
    });

    it('returns recommend_repairs for condition 3', () => {
      const item = { id: '1', condition: 3 } as PMChecklistItem;
      expect(getItemStatus(item)).toBe('recommend_repairs');
    });

    it('returns requires_immediate_repairs for condition 4', () => {
      const item = { id: '1', condition: 4 } as PMChecklistItem;
      expect(getItemStatus(item)).toBe('requires_immediate_repairs');
    });

    it('returns unsafe_condition for condition 5', () => {
      const item = { id: '1', condition: 5 } as PMChecklistItem;
      expect(getItemStatus(item)).toBe('unsafe_condition');
    });

    it('returns not_rated for unknown condition values', () => {
      const item = { id: '1', condition: 99 } as PMChecklistItem;
      expect(getItemStatus(item)).toBe('not_rated');
    });
  });

  describe('getStatusText', () => {
    it('returns OK for ok status', () => {
      expect(getStatusText('ok')).toBe('OK');
    });

    it('returns Adjusted for adjusted status', () => {
      expect(getStatusText('adjusted')).toBe('Adjusted');
    });

    it('returns Recommend Repairs for recommend_repairs status', () => {
      expect(getStatusText('recommend_repairs')).toBe('Recommend Repairs');
    });

    it('returns Requires Immediate Repairs for requires_immediate_repairs status', () => {
      expect(getStatusText('requires_immediate_repairs')).toBe('Requires Immediate Repairs');
    });

    it('returns Unsafe Condition for unsafe_condition status', () => {
      expect(getStatusText('unsafe_condition')).toBe('Unsafe Condition');
    });

    it('returns Not Rated for not_rated status', () => {
      expect(getStatusText('not_rated')).toBe('Not Rated');
    });
  });

  describe('createSegmentsForSection', () => {
    it('returns empty array for empty items', () => {
      const result = createSegmentsForSection([]);
      expect(result).toEqual([]);
    });

    it('creates segments with correct id and status', () => {
      const items: PMChecklistItem[] = [
        { id: '1', condition: 1 } as PMChecklistItem,
        { id: '2', condition: 3 } as PMChecklistItem,
        { id: '3', condition: null } as PMChecklistItem,
      ];

      const result = createSegmentsForSection(items);

      expect(result).toEqual([
        { id: '1', status: 'ok' },
        { id: '2', status: 'recommend_repairs' },
        { id: '3', status: 'not_rated' },
      ]);
    });
  });
});

