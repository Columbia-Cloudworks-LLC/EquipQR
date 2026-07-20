import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWhenPreferenceStorageAllowed } from '@/contexts/CookieConsentContext';
import {
  DEFAULT_COLUMN_ORDER,
  DEFAULT_COLUMN_SIZING,
  DEFAULT_COLUMN_VISIBILITY,
  INVENTORY_TABLE_COLUMN_META,
  type InventoryTableColumnKey,
} from '@/features/inventory/components/inventoryTableColumns';
import { isBuiltInViewId } from '@/features/inventory/constants/inventoryListBuiltInViews';
import type {
  InventorySavedView,
  InventoryTableDensity,
  InventoryTablePreferences,
} from '@/features/inventory/types/inventory';
import { getPreferenceLocalStorage, setPreferenceLocalStorage } from '@/lib/cookieConsent';

const STORAGE_PREFIX = 'equipqr:inventory-table-preferences:';
const PREFERENCES_VERSION = 1;

const buildStorageKey = (organizationId: string): string =>
  `${STORAGE_PREFIX}${organizationId}`;

export const DEFAULT_TABLE_PREFERENCES: InventoryTablePreferences = {
  version: PREFERENCES_VERSION,
  columnVisibility: { ...DEFAULT_COLUMN_VISIBILITY },
  columnOrder: [...DEFAULT_COLUMN_ORDER],
  columnSizing: { ...DEFAULT_COLUMN_SIZING },
  density: 'compact',
  savedViews: [],
  activeViewId: undefined,
};

function sanitizeVisibility(
  raw: Record<string, unknown> | undefined,
): Record<string, boolean> {
  const out: Record<string, boolean> = { ...DEFAULT_COLUMN_VISIBILITY };
  if (!raw) return out;
  for (const meta of INVENTORY_TABLE_COLUMN_META) {
    const value = raw[meta.key];
    if (typeof value === 'boolean') {
      out[meta.key] = value;
    }
  }
  for (const meta of INVENTORY_TABLE_COLUMN_META) {
    if (!meta.canHide) out[meta.key] = true;
  }
  return out;
}

function sanitizeOrder(raw: unknown): InventoryTableColumnKey[] {
  if (!Array.isArray(raw)) return [...DEFAULT_COLUMN_ORDER];
  const known = new Set(INVENTORY_TABLE_COLUMN_META.map((c) => c.key));
  const ordered: InventoryTableColumnKey[] = [];
  for (const key of raw) {
    if (typeof key === 'string' && known.has(key as InventoryTableColumnKey)) {
      ordered.push(key as InventoryTableColumnKey);
    }
  }
  for (const meta of INVENTORY_TABLE_COLUMN_META) {
    if (!ordered.includes(meta.key)) ordered.push(meta.key);
  }
  return ordered;
}

function sanitizeSizing(raw: Record<string, unknown> | undefined): Record<string, number> {
  const out: Record<string, number> = { ...DEFAULT_COLUMN_SIZING };
  if (!raw) return out;
  for (const meta of INVENTORY_TABLE_COLUMN_META) {
    const value = raw[meta.key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[meta.key] = Math.min(
        meta.maxWidth ?? value,
        Math.max(meta.minWidth, value),
      );
    }
  }
  return out;
}

function sanitizeSavedViews(raw: unknown): InventorySavedView[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is InventorySavedView => {
      if (!v || typeof v !== 'object') return false;
      const view = v as InventorySavedView;
      return typeof view.id === 'string' && typeof view.name === 'string';
    })
    .map((view) => ({
      ...view,
      columnVisibility: sanitizeVisibility(view.columnVisibility),
      columnOrder: sanitizeOrder(view.columnOrder),
      columnSizing: sanitizeSizing(view.columnSizing),
      density: view.density === 'comfortable' ? 'comfortable' : 'compact',
      quickFilters: Array.isArray(view.quickFilters) ? view.quickFilters : [],
      filters: view.filters ?? {},
    }));
}

const readSavedPreferences = (organizationId: string): InventoryTablePreferences | null => {
  try {
    const raw = getPreferenceLocalStorage(buildStorageKey(organizationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InventoryTablePreferences>;
    return {
      version: PREFERENCES_VERSION,
      columnVisibility: sanitizeVisibility(parsed.columnVisibility),
      columnOrder: sanitizeOrder(parsed.columnOrder),
      columnSizing: sanitizeSizing(parsed.columnSizing),
      density: parsed.density === 'comfortable' ? 'comfortable' : 'compact',
      savedViews: sanitizeSavedViews(parsed.savedViews),
      activeViewId:
        typeof parsed.activeViewId === 'string' ? parsed.activeViewId : undefined,
    };
  } catch {
    return null;
  }
};

const writeSavedPreferences = (
  organizationId: string,
  preferences: InventoryTablePreferences,
): void => {
  try {
    setPreferenceLocalStorage(buildStorageKey(organizationId), JSON.stringify(preferences));
  } catch {
    // Ignore quota / availability errors.
  }
};

const clearSavedPreferences = (organizationId: string): void => {
  try {
    localStorage.removeItem(buildStorageKey(organizationId));
  } catch {
    // Ignore.
  }
};

function isSameVisibility(
  a: Record<string, boolean>,
  b: Record<string, boolean>,
): boolean {
  for (const meta of INVENTORY_TABLE_COLUMN_META) {
    if (Boolean(a[meta.key]) !== Boolean(b[meta.key])) return false;
  }
  return true;
}

function preferencesEqual(
  a: InventoryTablePreferences,
  b: InventoryTablePreferences,
): boolean {
  return (
    isSameVisibility(a.columnVisibility, b.columnVisibility) &&
    JSON.stringify(a.columnOrder) === JSON.stringify(b.columnOrder) &&
    JSON.stringify(a.columnSizing) === JSON.stringify(b.columnSizing) &&
    a.density === b.density
  );
}

export interface UseInventoryTablePreferencesResult {
  preferences: InventoryTablePreferences;
  columnVisibility: Record<string, boolean>;
  columnOrder: InventoryTableColumnKey[];
  columnSizing: Record<string, number>;
  density: InventoryTableDensity;
  savedViews: InventorySavedView[];
  activeViewId?: string;
  setColumnVisibility: (visibility: Record<string, boolean>) => void;
  setColumnOrder: (order: InventoryTableColumnKey[]) => void;
  setColumnSizing: (sizing: Record<string, number>) => void;
  setDensity: (density: InventoryTableDensity) => void;
  toggleColumn: (key: InventoryTableColumnKey) => void;
  resetColumnVisibility: () => void;
  resetColumnWidths: () => void;
  resetTablePreferences: () => void;
  saveView: (view: Omit<InventorySavedView, 'id'> & { id?: string }) => string;
  applyView: (view: InventorySavedView) => InventorySavedView;
  deleteView: (viewId: string) => void;
  renameView: (viewId: string, name: string) => void;
  setActiveViewId: (viewId: string | undefined) => void;
  hasTableOverrides: boolean;
}

export const useInventoryTablePreferences = (
  organizationId: string | undefined,
): UseInventoryTablePreferencesResult => {
  const [preferences, setPreferences] = useState<InventoryTablePreferences>(
    () => ({ ...DEFAULT_TABLE_PREFERENCES }),
  );

  useEffect(() => {
    if (!organizationId) {
      setPreferences({ ...DEFAULT_TABLE_PREFERENCES });
      return;
    }
    const saved = readSavedPreferences(organizationId);
    setPreferences(saved ?? { ...DEFAULT_TABLE_PREFERENCES });
  }, [organizationId]);

  const rehydratePreferences = useCallback(() => {
    if (!organizationId) return;
    const saved = readSavedPreferences(organizationId);
    if (saved) setPreferences(saved);
  }, [organizationId]);
  useWhenPreferenceStorageAllowed(rehydratePreferences);

  const persist = useCallback(
    (next: InventoryTablePreferences) => {
      const enforced: InventoryTablePreferences = {
        ...next,
        columnVisibility: sanitizeVisibility(next.columnVisibility),
        columnOrder: sanitizeOrder(next.columnOrder),
        columnSizing: sanitizeSizing(next.columnSizing),
      };
      setPreferences(enforced);
      if (organizationId) {
        writeSavedPreferences(organizationId, enforced);
      }
    },
    [organizationId],
  );

  const setColumnVisibility = useCallback(
    (visibility: Record<string, boolean>) => {
      persist({ ...preferences, columnVisibility: visibility });
    },
    [preferences, persist],
  );

  const setColumnOrder = useCallback(
    (order: InventoryTableColumnKey[]) => {
      persist({ ...preferences, columnOrder: order });
    },
    [preferences, persist],
  );

  const setColumnSizing = useCallback(
    (sizing: Record<string, number>) => {
      persist({ ...preferences, columnSizing: sizing });
    },
    [preferences, persist],
  );

  const setDensity = useCallback(
    (density: InventoryTableDensity) => {
      persist({ ...preferences, density });
    },
    [preferences, persist],
  );

  const toggleColumn = useCallback(
    (key: InventoryTableColumnKey) => {
      const meta = INVENTORY_TABLE_COLUMN_META.find((m) => m.key === key);
      if (!meta || !meta.canHide) return;
      setColumnVisibility({
        ...preferences.columnVisibility,
        [key]: !preferences.columnVisibility[key],
      });
    },
    [preferences.columnVisibility, setColumnVisibility],
  );

  const resetColumnVisibility = useCallback(() => {
    persist({
      ...preferences,
      columnVisibility: { ...DEFAULT_COLUMN_VISIBILITY },
      columnOrder: [...DEFAULT_COLUMN_ORDER],
    });
  }, [preferences, persist]);

  const resetColumnWidths = useCallback(() => {
    persist({ ...preferences, columnSizing: { ...DEFAULT_COLUMN_SIZING } });
  }, [preferences, persist]);

  const resetTablePreferences = useCallback(() => {
    setPreferences({ ...DEFAULT_TABLE_PREFERENCES });
    if (organizationId) {
      clearSavedPreferences(organizationId);
    }
  }, [organizationId]);

  const saveView = useCallback(
    (view: Omit<InventorySavedView, 'id'> & { id?: string }): string => {
      const id = view.id ?? crypto.randomUUID();
      const nextView: InventorySavedView = { ...view, id };
      const existing = preferences.savedViews.filter((v) => v.id !== id);
      persist({
        ...preferences,
        savedViews: [...existing, nextView],
        activeViewId: id,
      });
      return id;
    },
    [preferences, persist],
  );

  const applyView = useCallback(
    (view: InventorySavedView): InventorySavedView => {
      persist({
        ...preferences,
        columnVisibility: sanitizeVisibility(view.columnVisibility),
        columnOrder: sanitizeOrder(view.columnOrder),
        columnSizing: sanitizeSizing(view.columnSizing),
        density: view.density,
        activeViewId: view.id,
      });
      return view;
    },
    [preferences, persist],
  );

  const deleteView = useCallback(
    (viewId: string) => {
      if (isBuiltInViewId(viewId)) {
        return;
      }
      persist({
        ...preferences,
        savedViews: preferences.savedViews.filter((v) => v.id !== viewId),
        activeViewId:
          preferences.activeViewId === viewId ? undefined : preferences.activeViewId,
      });
    },
    [preferences, persist],
  );

  const renameView = useCallback(
    (viewId: string, name: string) => {
      persist({
        ...preferences,
        savedViews: preferences.savedViews.map((v) =>
          v.id === viewId ? { ...v, name } : v,
        ),
      });
    },
    [preferences, persist],
  );

  const setActiveViewId = useCallback(
    (viewId: string | undefined) => {
      persist({ ...preferences, activeViewId: viewId });
    },
    [preferences, persist],
  );

  const hasTableOverrides = useMemo(
    () => !preferencesEqual(preferences, DEFAULT_TABLE_PREFERENCES),
    [preferences],
  );

  return {
    preferences,
    columnVisibility: preferences.columnVisibility,
    columnOrder: preferences.columnOrder as InventoryTableColumnKey[],
    columnSizing: preferences.columnSizing,
    density: preferences.density,
    savedViews: preferences.savedViews,
    activeViewId: preferences.activeViewId,
    setColumnVisibility,
    setColumnOrder,
    setColumnSizing,
    setDensity,
    toggleColumn,
    resetColumnVisibility,
    resetColumnWidths,
    resetTablePreferences,
    saveView,
    applyView,
    deleteView,
    renameView,
    setActiveViewId,
    hasTableOverrides,
  };
};
