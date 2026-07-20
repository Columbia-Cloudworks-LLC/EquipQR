import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_COLUMN_ORDER,
  DEFAULT_COLUMN_VISIBILITY,
} from '@/features/inventory/components/inventoryTableColumns';
import {
  DEFAULT_TABLE_PREFERENCES,
  useInventoryTablePreferences,
} from './useInventoryTablePreferences';

const STORAGE_KEY = (orgId: string) => `equipqr:inventory-table-preferences:${orgId}`;

describe('useInventoryTablePreferences', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('equipqr:cookie-consent', 'accepted');
  });

  it('returns defaults when no localStorage entry exists', () => {
    const { result } = renderHook(() => useInventoryTablePreferences('org-1'));
    expect(result.current.columnVisibility).toEqual(DEFAULT_COLUMN_VISIBILITY);
    expect(result.current.columnOrder).toEqual(DEFAULT_COLUMN_ORDER);
    expect(result.current.hasTableOverrides).toBe(false);
  });

  it('hydrates from localStorage when an entry exists for the org', () => {
    localStorage.setItem(
      STORAGE_KEY('org-1'),
      JSON.stringify({
        ...DEFAULT_TABLE_PREFERENCES,
        columnVisibility: {
          ...DEFAULT_COLUMN_VISIBILITY,
          external_id: true,
          sku: false,
        },
      }),
    );

    const { result } = renderHook(() => useInventoryTablePreferences('org-1'));
    expect(result.current.columnVisibility.external_id).toBe(true);
    expect(result.current.columnVisibility.sku).toBe(false);
    expect(result.current.hasTableOverrides).toBe(true);
  });

  it('persists toggleColumn changes to localStorage', () => {
    const { result } = renderHook(() => useInventoryTablePreferences('org-1'));

    act(() => {
      result.current.toggleColumn('sku');
    });

    expect(result.current.columnVisibility.sku).toBe(false);
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY('org-1'))!);
    expect(persisted.columnVisibility.sku).toBe(false);
  });

  it('refuses to hide structural columns', () => {
    const { result } = renderHook(() => useInventoryTablePreferences('org-1'));

    act(() => {
      result.current.toggleColumn('name');
    });

    expect(result.current.columnVisibility.name).toBe(true);
    expect(result.current.hasTableOverrides).toBe(false);
  });

  it('resetTablePreferences clears saved override', () => {
    localStorage.setItem(
      STORAGE_KEY('org-1'),
      JSON.stringify({
        ...DEFAULT_TABLE_PREFERENCES,
        columnVisibility: {
          ...DEFAULT_COLUMN_VISIBILITY,
          sku: false,
        },
      }),
    );

    const { result } = renderHook(() => useInventoryTablePreferences('org-1'));
    expect(result.current.hasTableOverrides).toBe(true);

    act(() => {
      result.current.resetTablePreferences();
    });

    expect(result.current.columnVisibility).toEqual(DEFAULT_COLUMN_VISIBILITY);
    expect(result.current.hasTableOverrides).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY('org-1'))).toBeNull();
  });

  it('keeps preferences scoped per organization', () => {
    localStorage.setItem(
      STORAGE_KEY('org-1'),
      JSON.stringify({
        ...DEFAULT_TABLE_PREFERENCES,
        columnVisibility: { ...DEFAULT_COLUMN_VISIBILITY, status: false },
      }),
    );
    localStorage.setItem(
      STORAGE_KEY('org-2'),
      JSON.stringify({
        ...DEFAULT_TABLE_PREFERENCES,
        columnVisibility: { ...DEFAULT_COLUMN_VISIBILITY, location: false },
      }),
    );

    const orgOne = renderHook(() => useInventoryTablePreferences('org-1'));
    const orgTwo = renderHook(() => useInventoryTablePreferences('org-2'));

    expect(orgOne.result.current.columnVisibility.status).toBe(false);
    expect(orgOne.result.current.columnVisibility.location).toBe(true);
    expect(orgTwo.result.current.columnVisibility.location).toBe(false);
    expect(orgTwo.result.current.columnVisibility.status).toBe(true);
  });

  it('saves and applies custom views', () => {
    const { result } = renderHook(() => useInventoryTablePreferences('org-1'));

    act(() => {
      result.current.saveView({
        name: 'Purchasing',
        filters: { sortBy: 'sku', sortOrder: 'asc' },
        quickFilters: ['low-stock'],
        columnVisibility: { ...DEFAULT_COLUMN_VISIBILITY, sku: true },
        columnOrder: [...DEFAULT_COLUMN_ORDER],
        columnSizing: result.current.columnSizing,
        density: 'comfortable',
      });
    });

    expect(result.current.savedViews).toHaveLength(1);
    expect(result.current.activeViewId).toBeTruthy();
  });
});
