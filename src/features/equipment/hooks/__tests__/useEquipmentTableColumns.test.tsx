/**
 * useEquipmentTableColumns hook tests (Issue #633).
 *
 * Validates the per-org column-visibility persistence layer for the dense
 * EquipmentTable view: defaults, hydration from localStorage, persistence on
 * toggle, reset behavior, and the undefined-orgId short-circuit.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  DEFAULT_VISIBLE_COLUMNS,
  EQUIPMENT_TABLE_COLUMN_META,
} from '@/features/equipment/components/EquipmentTable';
import { useEquipmentTableColumns } from '../useEquipmentTableColumns';

const STORAGE_KEY = (orgId: string) => `equipqr:equipment-table-columns:${orgId}`;

describe('useEquipmentTableColumns', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns DEFAULT_VISIBLE_COLUMNS when no localStorage entry exists', () => {
    const { result } = renderHook(() => useEquipmentTableColumns('org-1'));
    expect(result.current.visibleColumns).toEqual(DEFAULT_VISIBLE_COLUMNS);
    expect(result.current.hasOverrides).toBe(false);
  });

  it('hydrates from localStorage when an entry exists for the org', () => {
    localStorage.setItem(
      STORAGE_KEY('org-1'),
      JSON.stringify({
        ...DEFAULT_VISIBLE_COLUMNS,
        last_maintenance: true,
        team_name: false,
      }),
    );

    const { result } = renderHook(() => useEquipmentTableColumns('org-1'));
    expect(result.current.visibleColumns.last_maintenance).toBe(true);
    expect(result.current.visibleColumns.team_name).toBe(false);
    expect(result.current.hasOverrides).toBe(true);
  });

  it('persists toggleColumn changes to localStorage', () => {
    const { result } = renderHook(() => useEquipmentTableColumns('org-1'));

    act(() => {
      result.current.toggleColumn('team_name');
    });

    expect(result.current.visibleColumns.team_name).toBe(false);
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY('org-1'))!);
    expect(persisted.team_name).toBe(false);
  });

  it('refuses to hide structural columns (canHide: false)', () => {
    const { result } = renderHook(() => useEquipmentTableColumns('org-1'));

    act(() => {
      result.current.toggleColumn('name');
    });

    expect(result.current.visibleColumns.name).toBe(true);
    expect(result.current.hasOverrides).toBe(false);
  });

  it('resetToDefaults clears the saved override and reverts visibility', () => {
    localStorage.setItem(
      STORAGE_KEY('org-1'),
      JSON.stringify({ ...DEFAULT_VISIBLE_COLUMNS, last_maintenance: true }),
    );

    const { result } = renderHook(() => useEquipmentTableColumns('org-1'));
    expect(result.current.hasOverrides).toBe(true);

    act(() => {
      result.current.resetToDefaults();
    });

    expect(result.current.visibleColumns).toEqual(DEFAULT_VISIBLE_COLUMNS);
    expect(result.current.hasOverrides).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY('org-1'))).toBeNull();
  });

  it('keeps preferences scoped per organization', () => {
    localStorage.setItem(
      STORAGE_KEY('org-1'),
      JSON.stringify({ ...DEFAULT_VISIBLE_COLUMNS, status: false }),
    );
    localStorage.setItem(
      STORAGE_KEY('org-2'),
      JSON.stringify({ ...DEFAULT_VISIBLE_COLUMNS, model: false }),
    );

    const orgOne = renderHook(() => useEquipmentTableColumns('org-1'));
    const orgTwo = renderHook(() => useEquipmentTableColumns('org-2'));

    expect(orgOne.result.current.visibleColumns.status).toBe(false);
    expect(orgOne.result.current.visibleColumns.model).toBe(true);

    expect(orgTwo.result.current.visibleColumns.model).toBe(false);
    expect(orgTwo.result.current.visibleColumns.status).toBe(true);
  });

  it('short-circuits to defaults and does not write when organizationId is undefined', () => {
    const { result } = renderHook(() => useEquipmentTableColumns(undefined));

    act(() => {
      result.current.toggleColumn('team_name');
    });

    // No localStorage write should have happened for any equipment-table key.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      expect(key?.startsWith('equipqr:equipment-table-columns:')).toBe(false);
    }
  });

  it('setAllVisible flips every togglable column without affecting structural ones', () => {
    const { result } = renderHook(() => useEquipmentTableColumns('org-1'));

    act(() => {
      result.current.setAllVisible(false);
    });

    for (const meta of EQUIPMENT_TABLE_COLUMN_META) {
      const expected = !meta.canHide ? true : false;
      expect(result.current.visibleColumns[meta.key]).toBe(expected);
    }
  });
});
