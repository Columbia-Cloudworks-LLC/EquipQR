/**
 * Non-component helpers for shared data tables.
 * Kept out of `dataTableShared.tsx` so that file stays
 * `react-refresh/only-export-components` clean.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ColumnSizingState } from '@tanstack/react-table';
import {
  DataTableSortableHeaderButton,
  DataTableStaticHeaderLabel,
} from '@/components/common/dataTableShared';
import { useWhenPreferenceStorageAllowed } from '@/contexts/CookieConsentContext';
import { measureColumnAutoFitWidth } from '@/features/inventory/utils/tableColumnAutoFit';
import { getPreferenceLocalStorage, setPreferenceLocalStorage } from '@/lib/cookieConsent';

export type ResizableColumnMeta = {
  title: string;
  align?: 'left' | 'right' | 'center';
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  resizable: boolean;
  sortable: boolean;
  sortField: string;
  mono?: boolean;
};

export function getResizableColumnSizing<TKey extends string>(
  columnKey: TKey,
  columnSizing: ColumnSizingState,
  meta: ResizableColumnMeta,
) {
  return {
    id: columnKey,
    size: columnSizing[columnKey] ?? meta.defaultWidth,
    minSize: meta.minWidth,
    maxSize: meta.maxWidth,
    enableResizing: meta.resizable,
  };
}

export function applyAutoFitColumnWidth<TKey extends string>(
  setColumnSizing: React.Dispatch<React.SetStateAction<ColumnSizingState>>,
  columnKey: TKey,
  samples: string[],
  meta: Pick<ResizableColumnMeta, 'title' | 'minWidth' | 'maxWidth' | 'mono' | 'resizable'>,
) {
  if (!meta.resizable) return;

  const fitSamples = [...samples];
  fitSamples.unshift(meta.title);

  const nextWidth = measureColumnAutoFitWidth(fitSamples, {
    minWidth: meta.minWidth,
    maxWidth: meta.maxWidth,
    mono: meta.mono,
  });

  setColumnSizing((current) => ({
    ...current,
    [columnKey]: nextWidth,
  }));
}

export function createResizableSortableColumnBase<TKey extends string>(
  columnKey: TKey,
  columnSizing: ColumnSizingState,
  meta: ResizableColumnMeta,
  sortState: {
    active: boolean;
    sortOrder?: 'asc' | 'desc';
    onSort: () => void;
    hideVisibleTitle?: boolean;
  },
) {
  return {
    ...getResizableColumnSizing(columnKey, columnSizing, meta),
    header: () =>
      meta.sortable ? (
        <DataTableSortableHeaderButton
          title={meta.title}
          align={meta.align}
          active={sortState.active}
          sortOrder={sortState.sortOrder}
          onClick={sortState.onSort}
          hideVisibleTitle={sortState.hideVisibleTitle}
        />
      ) : (
        <DataTableStaticHeaderLabel title={meta.title} />
      ),
  };
}

export function getDataTableAlignClass(align?: 'left' | 'right' | 'center'): string {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return '';
}

export function loadPersistedColumnSizing(
  storageKey: string,
  defaults: ColumnSizingState,
): ColumnSizingState {
  if (typeof window === 'undefined') {
    return defaults;
  }

  try {
    const raw = getPreferenceLocalStorage(storageKey);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as Record<string, number>;
    return {
      ...defaults,
      ...parsed,
    };
  } catch {
    return defaults;
  }
}

export function usePersistedColumnSizing(storageKey: string, defaults: ColumnSizingState) {
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() =>
    loadPersistedColumnSizing(storageKey, defaults),
  );
  const columnSizingRef = useRef(columnSizing);
  columnSizingRef.current = columnSizing;

  const rehydrateOrFlush = useCallback(() => {
    const raw = getPreferenceLocalStorage(storageKey);
    if (raw) {
      setColumnSizing(loadPersistedColumnSizing(storageKey, defaults));
      return;
    }
    // Flush in-memory sizing chosen before Accept (prior writes were no-ops).
    setPreferenceLocalStorage(storageKey, JSON.stringify(columnSizingRef.current));
  }, [defaults, storageKey]);
  useWhenPreferenceStorageAllowed(rehydrateOrFlush);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPreferenceLocalStorage(storageKey, JSON.stringify(columnSizing));
  }, [columnSizing, storageKey]);

  return [columnSizing, setColumnSizing] as const;
}

export function getResizableTableWidth(totalSize: number, minWidth = 960): number {
  return Math.max(totalSize, minWidth);
}
