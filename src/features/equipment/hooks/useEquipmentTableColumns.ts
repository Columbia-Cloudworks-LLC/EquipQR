import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_VISIBLE_COLUMNS,
  EQUIPMENT_TABLE_COLUMN_META,
} from '@/features/equipment/components/EquipmentTable';

const STORAGE_PREFIX = 'equipqr:equipment-table-columns:';

const buildStorageKey = (organizationId: string): string =>
  `${STORAGE_PREFIX}${organizationId}`;

/**
 * Reads a previously-saved visibility map from localStorage. Silently returns
 * `null` on any read / parse error so the caller falls back to defaults
 * (mirrors the pattern in `src/features/reports/utils/column-preferences.ts`).
 */
const readSavedVisibility = (organizationId: string): Record<string, boolean> | null => {
  try {
    const raw = localStorage.getItem(buildStorageKey(organizationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, boolean> = {};
      for (const meta of EQUIPMENT_TABLE_COLUMN_META) {
        const value = (parsed as Record<string, unknown>)[meta.key];
        if (typeof value === 'boolean') {
          out[meta.key] = value;
        }
      }
      // Anything not present in the saved map should default visible (so newly
      // introduced columns appear automatically for users with old preferences).
      return { ...DEFAULT_VISIBLE_COLUMNS, ...out };
    }
  } catch {
    // Ignore localStorage / JSON errors — fall back to defaults.
  }
  return null;
};

const writeSavedVisibility = (
  organizationId: string,
  visibility: Record<string, boolean>,
): void => {
  try {
    localStorage.setItem(buildStorageKey(organizationId), JSON.stringify(visibility));
  } catch {
    // Ignore quota / availability errors.
  }
};

const clearSavedVisibility = (organizationId: string): void => {
  try {
    localStorage.removeItem(buildStorageKey(organizationId));
  } catch {
    // Ignore.
  }
};

const isSameVisibility = (
  a: Record<string, boolean>,
  b: Record<string, boolean>,
): boolean => {
  for (const meta of EQUIPMENT_TABLE_COLUMN_META) {
    if (Boolean(a[meta.key]) !== Boolean(b[meta.key])) return false;
  }
  return true;
};

export interface UseEquipmentTableColumnsResult {
  visibleColumns: Record<string, boolean>;
  toggleColumn: (key: string) => void;
  setAllVisible: (visible: boolean) => void;
  resetToDefaults: () => void;
  /** True when the current visibility map differs from `DEFAULT_VISIBLE_COLUMNS`. */
  hasOverrides: boolean;
}

/**
 * Per-user-per-org column visibility for the dense `EquipmentTable` view.
 *
 * Persists to `localStorage` under `equipqr:equipment-table-columns:{orgId}`,
 * mirroring the `equipqr:equipment-view-mode` precedent in `Equipment.tsx`.
 * When `organizationId` is undefined (e.g. before the user has selected an org)
 * the hook returns the defaults and refuses to write — this prevents leaking
 * pre-org-selection state into a key that would never be read again.
 *
 * The Name column is structural (`canHide: false` in
 * `EQUIPMENT_TABLE_COLUMN_META`) and is enforced visible regardless of the
 * persisted value or any external mutation.
 */
export const useEquipmentTableColumns = (
  organizationId: string | undefined,
): UseEquipmentTableColumnsResult => {
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    () => ({ ...DEFAULT_VISIBLE_COLUMNS }),
  );

  // Hydrate from storage whenever the active org changes.
  useEffect(() => {
    if (!organizationId) {
      setVisibleColumns({ ...DEFAULT_VISIBLE_COLUMNS });
      return;
    }
    const saved = readSavedVisibility(organizationId);
    setVisibleColumns(saved ?? { ...DEFAULT_VISIBLE_COLUMNS });
  }, [organizationId]);

  const persist = useCallback(
    (next: Record<string, boolean>) => {
      // Always keep the structural columns visible regardless of input.
      const enforced = { ...next };
      for (const meta of EQUIPMENT_TABLE_COLUMN_META) {
        if (!meta.canHide) enforced[meta.key] = true;
      }
      setVisibleColumns(enforced);
      if (organizationId) {
        writeSavedVisibility(organizationId, enforced);
      }
    },
    [organizationId],
  );

  const toggleColumn = useCallback(
    (key: string) => {
      const meta = EQUIPMENT_TABLE_COLUMN_META.find((m) => m.key === key);
      if (!meta || !meta.canHide) return;
      persist({ ...visibleColumns, [key]: !visibleColumns[key] });
    },
    [visibleColumns, persist],
  );

  const setAllVisible = useCallback(
    (visible: boolean) => {
      const next: Record<string, boolean> = {};
      for (const meta of EQUIPMENT_TABLE_COLUMN_META) {
        next[meta.key] = !meta.canHide ? true : visible;
      }
      persist(next);
    },
    [persist],
  );

  const resetToDefaults = useCallback(() => {
    setVisibleColumns({ ...DEFAULT_VISIBLE_COLUMNS });
    if (organizationId) {
      clearSavedVisibility(organizationId);
    }
  }, [organizationId]);

  const hasOverrides = useMemo(
    () => !isSameVisibility(visibleColumns, DEFAULT_VISIBLE_COLUMNS),
    [visibleColumns],
  );

  return { visibleColumns, toggleColumn, setAllVisible, resetToDefaults, hasOverrides };
};
