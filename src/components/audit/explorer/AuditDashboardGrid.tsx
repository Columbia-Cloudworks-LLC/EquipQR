/**
 * AuditDashboardGrid — customizable dashboard shell for the audit log page
 * (#1166). Each section (key metrics, timeline, events) is a widget on a
 * react-grid-layout v2 grid: draggable by its header grip, resizable from
 * its edges, and collapsible. Layout + collapsed state persist per browser
 * in localStorage, with a one-click reset back to the default arrangement.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import GridLayout, {
  useContainerWidth,
  verticalCompactor,
  calcGridItemPosition,
  type Layout,
  type LayoutItem,
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import './audit-dashboard-grid.css';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, GripVertical, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWhenPreferenceStorageAllowed } from '@/contexts/CookieConsentContext';
import { getPreferenceLocalStorage, setPreferenceLocalStorage } from '@/lib/cookieConsent';
import { logger } from '@/utils/logger';

const STORAGE_KEY = 'audit-dashboard-grid-v1';
const GRID_COLS = 12;
const ROW_HEIGHT = 30;
const GRID_MARGIN: readonly [number, number] = [12, 12];
/** Collapsed widgets shrink to just their header row. */
const COLLAPSED_H = 2;
const WIDGET_HEADER_PX = 40;

export interface AuditDashboardWidgetDef {
  id: string;
  title: string;
  /** Default grid height in rows. */
  defaultH: number;
  minH?: number;
  /** Renders the widget body. Receives the pixel height available for content. */
  render: (contentHeight: number) => React.ReactNode;
}

interface PersistedGridState {
  layout: Layout;
  collapsed: Record<string, boolean>;
  /** Expanded heights remembered while a widget is collapsed. */
  expandedH: Record<string, number>;
}

function defaultLayoutFor(widgets: AuditDashboardWidgetDef[]): Layout {
  let y = 0;
  return widgets.map((widget) => {
    const item: LayoutItem = {
      i: widget.id,
      x: 0,
      y,
      w: GRID_COLS,
      h: widget.defaultH,
      minW: 3,
      minH: widget.minH ?? 3,
    };
    y += widget.defaultH;
    return item;
  });
}

function isBoundedInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/**
 * Sanitize one stored layout item against the widget's defaults. Any invalid
 * or out-of-bounds geometry falls back to the default item so corrupted
 * localStorage can never produce a broken grid.
 */
function sanitizeLayoutItem(
  stored: unknown,
  defaultItem: LayoutItem,
  collapsed: boolean,
  configuredMinH: number,
): LayoutItem | null {
  if (!stored || typeof stored !== 'object') return null;
  const item = stored as Partial<LayoutItem>;
  if (item.i !== defaultItem.i) return null;
  const maxRows = 200;
  const minH = collapsed ? COLLAPSED_H : configuredMinH;
  const valid =
    isBoundedInteger(item.x, 0, GRID_COLS - 1) &&
    isBoundedInteger(item.y, 0, maxRows) &&
    isBoundedInteger(item.w, 1, GRID_COLS) &&
    isBoundedInteger(item.h, 1, maxRows) &&
    (item.x as number) + (item.w as number) <= GRID_COLS;
  if (!valid) return null;
  return {
    ...defaultItem,
    x: item.x as number,
    y: item.y as number,
    w: item.w as number,
    h: Math.max(item.h as number, minH),
    minH,
    ...(collapsed ? { isResizable: false } : {}),
  };
}

function readPersistedState(widgets: AuditDashboardWidgetDef[]): PersistedGridState {
  const fallback: PersistedGridState = {
    layout: defaultLayoutFor(widgets),
    collapsed: {},
    expandedH: {},
  };
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return fallback;
  }
  try {
    const raw = getPreferenceLocalStorage(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedGridState>;
    if (!Array.isArray(parsed.layout)) return fallback;

    const rawCollapsed =
      parsed.collapsed && typeof parsed.collapsed === 'object' ? parsed.collapsed : {};
    const rawExpandedH =
      parsed.expandedH && typeof parsed.expandedH === 'object' ? parsed.expandedH : {};

    const collapsed: Record<string, boolean> = {};
    const expandedH: Record<string, number> = {};
    const layout: Layout = [];

    for (const defaultItem of defaultLayoutFor(widgets)) {
      const widgetId = defaultItem.i;
      const widgetDef = widgets.find((w) => w.id === widgetId);
      const configuredMinH = widgetDef?.minH ?? defaultItem.minH ?? 3;
      collapsed[widgetId] = rawCollapsed[widgetId] === true;
      const storedExpanded = rawExpandedH[widgetId];
      if (isBoundedInteger(storedExpanded, 1, 200)) {
        expandedH[widgetId] = storedExpanded;
      }
      const stored = parsed.layout.find(
        (item) => !!item && typeof item === 'object' && (item as LayoutItem).i === widgetId,
      );
      layout.push(
        sanitizeLayoutItem(stored, defaultItem, collapsed[widgetId], configuredMinH) ??
          defaultItem,
      );
    }

    return { layout, collapsed, expandedH };
  } catch (error) {
    logger.error('Failed to read audit dashboard layout', error);
    return fallback;
  }
}

function persistState(state: PersistedGridState): void {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return;
  try {
    setPreferenceLocalStorage(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage quota / privacy mode — layout customization just won't persist.
  }
}

function widgetPixelHeight(item: LayoutItem | undefined): number {
  if (!item) return 0;
  return item.h * ROW_HEIGHT + (item.h - 1) * GRID_MARGIN[1];
}

/** Reorder widgets vertically for keyboard users (swap with adjacent row). */
function findVerticalSwapTarget(
  sorted: Layout,
  index: number,
  direction: 'up' | 'down',
): number {
  let swapIndex = direction === 'up' ? index - 1 : index + 1;
  while (
    swapIndex >= 0 &&
    swapIndex < sorted.length &&
    sorted[swapIndex].y === sorted[index].y
  ) {
    swapIndex = direction === 'up' ? swapIndex - 1 : swapIndex + 1;
  }
  return swapIndex;
}

/** Reassign y within each column so items stack without vertical overlap. */
function reflowLayoutRowsPreservingColumns(items: Layout): Layout {
  const byColumn = new Map<number, LayoutItem[]>();
  for (const item of items) {
    const list = byColumn.get(item.x) ?? [];
    list.push(item);
    byColumn.set(item.x, list);
  }

  const orderIndex = new Map(items.map((item, i) => [item.i, i]));
  const nextYById = new Map<string, number>();

  for (const columnItems of byColumn.values()) {
    const stacked = [...columnItems].sort(
      (a, b) => (orderIndex.get(a.i) ?? 0) - (orderIndex.get(b.i) ?? 0),
    );
    let y = Math.min(...stacked.map((item) => item.y));
    for (const item of stacked) {
      nextYById.set(item.i, y);
      y += item.h;
    }
  }

  return items.map((item) => ({
    ...item,
    y: nextYById.get(item.i) ?? item.y,
  }));
}

function moveWidgetInLayout(
  layout: Layout,
  widgetId: string,
  direction: 'up' | 'down',
): Layout {
  const sorted = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
  const index = sorted.findIndex((item) => item.i === widgetId);
  if (index < 0) return layout;
  const swapIndex = findVerticalSwapTarget(sorted, index, direction);
  if (swapIndex < 0 || swapIndex >= sorted.length) return layout;

  const reordered = [...sorted];
  [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];

  return reflowLayoutRowsPreservingColumns(reordered);
}

function layoutItemsEqual(a: LayoutItem, b: LayoutItem): boolean {
  return a.i === b.i && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

function layoutsEqual(a: Layout, b: Layout): boolean {
  if (a.length !== b.length) return false;
  const bById = new Map(b.map((item) => [item.i, item]));
  return a.every((item) => {
    const other = bById.get(item.i);
    return other != null && layoutItemsEqual(item, other);
  });
}

type GridPositionParams = {
  cols: number;
  rowHeight: number;
  margin: readonly [number, number];
  containerPadding: readonly [number, number];
  containerWidth: number;
  maxRows: number;
};

function gridItemPixelRect(
  item: LayoutItem,
  positionParams: GridPositionParams,
): { left: number; top: number; width: number; height: number } {
  const pos = calcGridItemPosition(
    positionParams,
    item.x,
    item.y,
    item.w,
    item.h
  );
  return { left: pos.left, top: pos.top, width: pos.width, height: pos.height };
}

function sortLayoutByPosition(layout: Layout): Layout {
  return [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
}

function measureHeaderCenterY(gridEl: HTMLElement, widgetId: string): number | null {
  const itemEl = gridEl.querySelector<HTMLElement>(
    `.react-grid-item[data-testid="audit-widget-${widgetId}"]`
  );
  if (!itemEl) return null;
  const rect = itemEl.getBoundingClientRect();
  return rect.top + WIDGET_HEADER_PX / 2;
}

/**
 * Compare the cursor against each other card's header center. Returns the index
 * in the frozen stack where the dragged widget would be inserted (0 = first).
 */
function computeInsertBeforeIndex(
  sorted: Layout,
  draggedWidgetId: string,
  clientY: number,
  gridEl: HTMLElement,
): number {
  const originalIndex = sorted.findIndex((item) => item.i === draggedWidgetId);
  if (originalIndex < 0) return 0;

  let insertBeforeIndex = originalIndex;

  for (let i = 0; i < sorted.length; i++) {
    const widgetId = sorted[i].i;
    if (widgetId === draggedWidgetId) continue;

    const headerCenterY = measureHeaderCenterY(gridEl, widgetId);
    if (headerCenterY == null) continue;

    if (clientY < headerCenterY) {
      insertBeforeIndex = i;
      break;
    }

    insertBeforeIndex = i + 1;
  }

  return insertBeforeIndex;
}

/** Staying put spans inserting before self or before the next card. */
function isSameDropPosition(originalIndex: number, insertBeforeIndex: number): boolean {
  return insertBeforeIndex === originalIndex || insertBeforeIndex === originalIndex + 1;
}

function reorderLayoutByInsertIndex(
  layout: Layout,
  draggedWidgetId: string,
  insertBeforeIndex: number,
): Layout {
  const sorted = sortLayoutByPosition(layout);
  const originalIndex = sorted.findIndex((item) => item.i === draggedWidgetId);
  if (originalIndex < 0 || isSameDropPosition(originalIndex, insertBeforeIndex)) {
    return layout;
  }

  const dragged = sorted[originalIndex];
  const reordered = sorted.filter((item) => item.i !== draggedWidgetId);
  const adjustedIndex =
    insertBeforeIndex > originalIndex ? insertBeforeIndex - 1 : insertBeforeIndex;
  reordered.splice(adjustedIndex, 0, dragged);
  return reflowLayoutRowsPreservingColumns(reordered);
}

interface InsertionDividerRect {
  left: number;
  top: number;
  width: number;
}

interface MeasuredItemRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Read rendered grid-item bounds so the divider sits in the real margin gap. */
function measureWidgetRect(
  slotsEl: HTMLElement,
  widgetId: string,
): MeasuredItemRect | null {
  const gridEl = slotsEl.parentElement?.querySelector<HTMLElement>(
    '.audit-dashboard-grid-layout'
  );
  const itemEl = gridEl?.querySelector<HTMLElement>(
    `.react-grid-item[data-testid="audit-widget-${widgetId}"]`
  );
  if (!itemEl) return null;

  const slotsRect = slotsEl.getBoundingClientRect();
  const itemRect = itemEl.getBoundingClientRect();
  return {
    left: itemRect.left - slotsRect.left,
    top: itemRect.top - slotsRect.top,
    width: itemRect.width,
    height: itemRect.height,
  };
}

function dividerRectForGapFromDom(
  sorted: Layout,
  gapIndex: number,
  slotsEl: HTMLElement,
): InsertionDividerRect | null {
  if (sorted.length === 0) return null;

  const clampedGap = Math.max(0, Math.min(sorted.length, gapIndex));

  if (clampedGap === 0) {
    const firstRect = measureWidgetRect(slotsEl, sorted[0].i);
    if (!firstRect) return null;
    return {
      left: firstRect.left,
      top: firstRect.top - GRID_MARGIN[1] / 2,
      width: firstRect.width,
    };
  }

  if (clampedGap >= sorted.length) {
    const lastRect = measureWidgetRect(slotsEl, sorted[sorted.length - 1].i);
    if (!lastRect) return null;
    return {
      left: lastRect.left,
      top: lastRect.top + lastRect.height + GRID_MARGIN[1] / 2,
      width: lastRect.width,
    };
  }

  const aboveRect = measureWidgetRect(slotsEl, sorted[clampedGap - 1].i);
  const belowRect = measureWidgetRect(slotsEl, sorted[clampedGap].i);
  if (!aboveRect || !belowRect) return null;

  const gapTop = aboveRect.top + aboveRect.height;
  const gapBottom = belowRect.top;
  return {
    left: aboveRect.left,
    top: (gapTop + gapBottom) / 2,
    width: aboveRect.width,
  };
}

/** Place the divider in the margin gap for the target insert index. */
function computeInsertionDividerRect(
  frozenLayout: Layout,
  draggedWidgetId: string,
  insertBeforeIndex: number,
  originalIndex: number,
  slotsEl: HTMLElement,
): InsertionDividerRect | null {
  if (isSameDropPosition(originalIndex, insertBeforeIndex)) return null;

  const sorted = sortLayoutByPosition(frozenLayout);
  const gapIndex = Math.max(0, Math.min(sorted.length, insertBeforeIndex));
  return dividerRectForGapFromDom(sorted, gapIndex, slotsEl);
}

interface AuditDropSlotOverlayProps {
  layout: Layout;
  positionParams: GridPositionParams;
  draggedWidgetId: string;
  insertBeforeIndex: number | null;
  originalIndex: number;
}

function AuditDropSlotOverlay({
  layout,
  positionParams,
  draggedWidgetId,
  insertBeforeIndex,
  originalIndex,
}: AuditDropSlotOverlayProps) {
  const slotsRef = useRef<HTMLDivElement>(null);
  const [dividerRect, setDividerRect] = useState<InsertionDividerRect | null>(null);

  useLayoutEffect(() => {
    if (insertBeforeIndex == null || !slotsRef.current) {
      setDividerRect(null);
      return;
    }
    setDividerRect(
      computeInsertionDividerRect(
        layout,
        draggedWidgetId,
        insertBeforeIndex,
        originalIndex,
        slotsRef.current
      )
    );
  }, [layout, draggedWidgetId, insertBeforeIndex, originalIndex]);

  return (
    <div
      ref={slotsRef}
      className="audit-drop-slots absolute inset-0 pointer-events-none z-2"
      aria-hidden
    >
      {layout.map((item) => {
        const rect = gridItemPixelRect(item, positionParams);
        const isSource = item.i === draggedWidgetId;
        return (
          <div
            key={item.i}
            className={`audit-slot-guide${isSource ? ' audit-slot-guide--source' : ''}`}
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          />
        );
      })}
      {dividerRect && (
        <div
          className="audit-drop-divider"
          style={{
            left: dividerRect.left,
            top: dividerRect.top,
            width: dividerRect.width,
          }}
        />
      )}
    </div>
  );
}

export interface AuditDashboardGridProps {
  widgets: AuditDashboardWidgetDef[];
}

interface WidgetDragSession {
  widgetId: string;
  pointerId: number;
  /** Pointer offset from the top-left of the widget card (pixels). */
  grabOffsetX: number;
  grabOffsetY: number;
  cardWidth: number;
  cardHeight: number;
  originalIndex: number;
}

export function AuditDashboardGrid({ widgets }: AuditDashboardGridProps) {
  const { width, containerRef, mounted } = useContainerWidth({
    initialWidth: 1024,
  });
  const [state, setState] = useState<PersistedGridState>(() => readPersistedState(widgets));
  const [isGridInteracting, setIsGridInteracting] = useState(false);
  const [dragSession, setDragSession] = useState<WidgetDragSession | null>(null);
  const [insertBeforeIndex, setInsertBeforeIndex] = useState<number | null>(null);
  const [dragLayoutSnapshot, setDragLayoutSnapshot] = useState<Layout | null>(null);
  const dragSessionRef = useRef<WidgetDragSession | null>(null);
  const layoutAtDragStartRef = useRef<Layout | null>(null);
  const floatingCloneRef = useRef<HTMLElement | null>(null);

  // Persist state changes debounced: drag/resize emit many layout updates and
  // localStorage writes are synchronous, so coalesce them. Flush on unmount.
  const stateRef = useRef(state);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rehydrateOrFlushGrid = useCallback(() => {
    const raw = getPreferenceLocalStorage(STORAGE_KEY);
    if (raw) {
      setState(readPersistedState(widgets));
      return;
    }
    persistState(stateRef.current);
  }, [widgets]);
  useWhenPreferenceStorageAllowed(rehydrateOrFlushGrid);
  useEffect(() => {
    stateRef.current = state;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => persistState(stateRef.current), 300);
  }, [state]);
  useEffect(
    () => () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistState(stateRef.current);
    },
    []
  );

  const handleLayoutChange = useCallback((layout: Layout) => {
    setState((prev) => {
      if (layoutsEqual(prev.layout, layout)) return prev;
      return { ...prev, layout: [...layout] };
    });
  }, []);

  const positionParams = useMemo(
    (): GridPositionParams => ({
      cols: GRID_COLS,
      rowHeight: ROW_HEIGHT,
      margin: GRID_MARGIN,
      containerPadding: [0, 0] as const,
      containerWidth: width,
      maxRows: Infinity,
    }),
    [width]
  );

  const removeFloatingClone = useCallback(() => {
    floatingCloneRef.current?.remove();
    floatingCloneRef.current = null;
  }, []);

  useEffect(() => () => removeFloatingClone(), [removeFloatingClone]);

  const updateInsertTargetAt = useCallback(
    (clientY: number, session: WidgetDragSession) => {
      const gridEl = containerRef.current?.querySelector<HTMLElement>(
        '.audit-dashboard-grid-layout'
      );
      const baseLayout = layoutAtDragStartRef.current;
      if (!gridEl || !baseLayout) return;
      const sorted = sortLayoutByPosition(baseLayout);
      setInsertBeforeIndex(
        computeInsertBeforeIndex(sorted, session.widgetId, clientY, gridEl)
      );
    },
    []
  );

  const moveFloatingClone = useCallback(
    (clientX: number, clientY: number, session: WidgetDragSession) => {
      const clone = floatingCloneRef.current;
      if (!clone) return;
      clone.style.left = `${clientX - session.grabOffsetX}px`;
      clone.style.top = `${clientY - session.grabOffsetY}px`;
    },
    []
  );

  const commitWidgetDrop = useCallback(
    (session: WidgetDragSession, clientY: number) => {
      const baseLayout = layoutAtDragStartRef.current;
      if (!baseLayout) return;
      const gridEl = containerRef.current?.querySelector<HTMLElement>(
        '.audit-dashboard-grid-layout'
      );
      if (!gridEl) return;
      const sorted = sortLayoutByPosition(baseLayout);
      const targetIndex = computeInsertBeforeIndex(
        sorted,
        session.widgetId,
        clientY,
        gridEl
      );
      const nextLayout = reorderLayoutByInsertIndex(
        baseLayout,
        session.widgetId,
        targetIndex
      );
      setState((prev) => {
        if (layoutsEqual(prev.layout, nextLayout)) return prev;
        return { ...prev, layout: nextLayout };
      });
    },
    []
  );

  const endWidgetDrag = useCallback(
    (session: WidgetDragSession, target: HTMLElement) => {
      if (target.hasPointerCapture(session.pointerId)) {
        target.releasePointerCapture(session.pointerId);
      }
      removeFloatingClone();
      dragSessionRef.current = null;
      layoutAtDragStartRef.current = null;
      setDragSession(null);
      setInsertBeforeIndex(null);
      setDragLayoutSnapshot(null);
      setIsGridInteracting(false);
    },
    [removeFloatingClone]
  );

  const handleGripPointerDown = useCallback(
    (widgetId: string) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const card = event.currentTarget.closest<HTMLElement>(
        `[data-testid="audit-widget-${widgetId}"]`
      );
      const cardSurface = card?.querySelector<HTMLElement>('.audit-widget-card');
      if (!card || !cardSurface) return;
      const cardRect = cardSurface.getBoundingClientRect();
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();

      removeFloatingClone();
      const clone = cardSurface.cloneNode(true) as HTMLElement;
      clone.classList.add('audit-widget-floating-clone');
      clone.style.width = `${cardRect.width}px`;
      clone.style.height = `${cardRect.height}px`;
      clone.style.left = `${cardRect.left}px`;
      clone.style.top = `${cardRect.top}px`;
      clone.setAttribute('aria-hidden', 'true');
      document.body.appendChild(clone);
      floatingCloneRef.current = clone;

      const frozenLayout = stateRef.current.layout.map((item) => ({ ...item }));
      layoutAtDragStartRef.current = frozenLayout;
      setDragLayoutSnapshot(frozenLayout);

      const sorted = sortLayoutByPosition(frozenLayout);
      const originalIndex = sorted.findIndex((item) => item.i === widgetId);

      const session: WidgetDragSession = {
        widgetId,
        pointerId: event.pointerId,
        grabOffsetX: event.clientX - cardRect.left,
        grabOffsetY: event.clientY - cardRect.top,
        cardWidth: cardRect.width,
        cardHeight: cardRect.height,
        originalIndex,
      };
      dragSessionRef.current = session;
      setDragSession(session);
      setInsertBeforeIndex(originalIndex + 1);
      setIsGridInteracting(true);
    },
    [removeFloatingClone]
  );

  const handleGripPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const session = dragSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;
      event.preventDefault();
      moveFloatingClone(event.clientX, event.clientY, session);
      updateInsertTargetAt(event.clientY, session);
    },
    [moveFloatingClone, updateInsertTargetAt]
  );

  const handleGripPointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const session = dragSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;
      commitWidgetDrop(session, event.clientY);
      endWidgetDrag(session, event.currentTarget);
    },
    [commitWidgetDrop, endWidgetDrag]
  );

  const toggleCollapsed = useCallback(
    (widgetId: string) => {
      const widgetDef = widgets.find((w) => w.id === widgetId);
      const configuredMinH = widgetDef?.minH ?? 3;
      setState((prev) => {
        const isCollapsed = !!prev.collapsed[widgetId];
        const layout = prev.layout.map((item) => {
          if (item.i !== widgetId) return item;
          if (isCollapsed) {
            const restoredH = Math.max(prev.expandedH[widgetId] ?? item.h, configuredMinH);
            return { ...item, h: restoredH, minH: configuredMinH, isResizable: undefined };
          }
          // Also relax minH so the grid can legally shrink to the header row.
          return { ...item, h: COLLAPSED_H, minH: COLLAPSED_H, isResizable: false };
        });
        const current = prev.layout.find((item) => item.i === widgetId);
        return {
          layout,
          collapsed: { ...prev.collapsed, [widgetId]: !isCollapsed },
          expandedH: isCollapsed
            ? prev.expandedH
            : { ...prev.expandedH, [widgetId]: current?.h ?? configuredMinH },
        };
      });
    },
    [widgets]
  );

  const resetLayout = useCallback(() => {
    setState({ layout: defaultLayoutFor(widgets), collapsed: {}, expandedH: {} });
  }, [widgets]);

  const moveWidget = useCallback((widgetId: string, direction: 'up' | 'down') => {
    setState((prev) => ({
      ...prev,
      layout: moveWidgetInLayout(prev.layout, widgetId, direction),
    }));
  }, []);

  const layoutById = useMemo(() => {
    const map = new Map<string, LayoutItem>();
    for (const item of state.layout) map.set(item.i, item);
    return map;
  }, [state.layout]);

  const sortedLayout = useMemo(
    () => [...state.layout].sort((a, b) => a.y - b.y || a.x - b.x),
    [state.layout]
  );

  const displayLayout = dragLayoutSnapshot ?? state.layout;

  return (
    <div className="flex flex-col gap-1" data-testid="audit-dashboard-grid">
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={resetLayout}
          data-testid="audit-dashboard-reset-layout"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset layout
        </Button>
      </div>
      <div ref={containerRef} className="relative w-full">
        {mounted && dragSession && dragLayoutSnapshot && (
          <AuditDropSlotOverlay
            layout={dragLayoutSnapshot}
            positionParams={positionParams}
            draggedWidgetId={dragSession.widgetId}
            insertBeforeIndex={insertBeforeIndex}
            originalIndex={dragSession.originalIndex}
          />
        )}
        {mounted && (
          <GridLayout
            width={width}
            layout={displayLayout}
            className={`audit-dashboard-grid-layout${isGridInteracting ? ' is-interacting' : ''}`}
            gridConfig={{ cols: GRID_COLS, rowHeight: ROW_HEIGHT, margin: GRID_MARGIN, containerPadding: [0, 0] }}
            dragConfig={{ enabled: false }}
            resizeConfig={{ enabled: true, handles: ['s', 'e', 'se'] }}
            compactor={verticalCompactor}
            onLayoutChange={handleLayoutChange}
            onResizeStart={() => setIsGridInteracting(true)}
            onResizeStop={() => setIsGridInteracting(false)}
          >
          {widgets.map((widget) => {
            const item = layoutById.get(widget.id);
            const collapsed = !!state.collapsed[widget.id];
            const isDragging = dragSession?.widgetId === widget.id;
            const contentHeight = Math.max(0, widgetPixelHeight(item) - WIDGET_HEADER_PX);
            const orderIndex = sortedLayout.findIndex((item) => item.i === widget.id);
            const canMoveUp =
              orderIndex > 0 && findVerticalSwapTarget(sortedLayout, orderIndex, 'up') >= 0;
            const canMoveDown =
              orderIndex >= 0 &&
              orderIndex < sortedLayout.length - 1 &&
              findVerticalSwapTarget(sortedLayout, orderIndex, 'down') < sortedLayout.length;
            return (
              <div
                key={widget.id}
                data-testid={`audit-widget-${widget.id}`}
                data-grid-dragging={isDragging ? 'true' : undefined}
              >
                <div className="audit-widget-card h-full flex flex-col rounded-md border bg-card overflow-hidden">
                  <div
                    className="flex items-center gap-1.5 px-2 shrink-0 border-b bg-muted/30"
                    style={{ height: WIDGET_HEADER_PX }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="audit-widget-drag-handle flex items-center justify-center h-6 w-6 rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="Drag to rearrange"
                      aria-label={`Drag to move the ${widget.title} section`}
                      data-testid={`audit-widget-drag-${widget.id}`}
                      onPointerDown={handleGripPointerDown(widget.id)}
                      onPointerMove={handleGripPointerMove}
                      onPointerUp={handleGripPointerEnd}
                      onPointerCancel={handleGripPointerEnd}
                    >
                      <GripVertical className="h-3.5 w-3.5 pointer-events-none" />
                    </div>
                    <span className="text-xs font-semibold">{widget.title}</span>
                    <div className="ml-auto flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => moveWidget(widget.id, 'up')}
                        disabled={!canMoveUp}
                        aria-label={`Move ${widget.title} section up`}
                        data-testid={`audit-widget-move-up-${widget.id}`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => moveWidget(widget.id, 'down')}
                        disabled={!canMoveDown}
                        aria-label={`Move ${widget.title} section down`}
                        data-testid={`audit-widget-move-down-${widget.id}`}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => toggleCollapsed(widget.id)}
                        aria-expanded={!collapsed}
                        aria-label={
                          collapsed
                            ? `Expand the ${widget.title} section`
                            : `Collapse the ${widget.title} section`
                        }
                        data-testid={`audit-widget-collapse-${widget.id}`}
                      >
                        {collapsed ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronUp className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-h-0 overflow-hidden">
                      {widget.render(contentHeight)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </GridLayout>
        )}
      </div>
    </div>
  );
}
