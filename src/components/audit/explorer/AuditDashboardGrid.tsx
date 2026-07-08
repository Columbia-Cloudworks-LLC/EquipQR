/**
 * AuditDashboardGrid — customizable dashboard shell for the audit log page
 * (#1166). Each section (key metrics, timeline, events) is a widget on a
 * react-grid-layout v2 grid: draggable by its header grip, resizable from
 * its edges, and collapsible. Layout + collapsed state persist per browser
 * in localStorage, with a one-click reset back to the default arrangement.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GridLayout, {
  useContainerWidth,
  type Layout,
  type LayoutItem,
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { ChevronDown, ChevronUp, GripVertical, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
): LayoutItem | null {
  if (!stored || typeof stored !== 'object') return null;
  const item = stored as Partial<LayoutItem>;
  if (item.i !== defaultItem.i) return null;
  const maxRows = 200;
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
    h: item.h as number,
    ...(collapsed ? { minH: COLLAPSED_H, isResizable: false } : {}),
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
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
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
      collapsed[widgetId] = rawCollapsed[widgetId] === true;
      const storedExpanded = rawExpandedH[widgetId];
      if (isBoundedInteger(storedExpanded, 1, 200)) {
        expandedH[widgetId] = storedExpanded;
      }
      const stored = parsed.layout.find(
        (item) => !!item && typeof item === 'object' && (item as LayoutItem).i === widgetId,
      );
      layout.push(sanitizeLayoutItem(stored, defaultItem, collapsed[widgetId]) ?? defaultItem);
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
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage quota / privacy mode — layout customization just won't persist.
  }
}

function widgetPixelHeight(item: LayoutItem | undefined): number {
  if (!item) return 0;
  return item.h * ROW_HEIGHT + (item.h - 1) * GRID_MARGIN[1];
}

/** Reorder widgets vertically for keyboard users (swap with adjacent row). */
function moveWidgetInLayout(
  layout: Layout,
  widgetId: string,
  direction: 'up' | 'down',
): Layout {
  const order = [...layout]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((item) => item.i);
  const index = order.indexOf(widgetId);
  if (index < 0) return layout;
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= order.length) return layout;

  [order[index], order[swapIndex]] = [order[swapIndex], order[index]];

  const itemById = new Map(layout.map((item) => [item.i, item]));
  let y = 0;
  return order.map((id) => {
    const item = itemById.get(id);
    if (!item) return { i: id, x: 0, y, w: GRID_COLS, h: 3 };
    const next = { ...item, y };
    y += item.h;
    return next;
  });
}

export interface AuditDashboardGridProps {
  widgets: AuditDashboardWidgetDef[];
}

export function AuditDashboardGrid({ widgets }: AuditDashboardGridProps) {
  const { width, containerRef } = useContainerWidth();
  const [state, setState] = useState<PersistedGridState>(() => readPersistedState(widgets));

  // Persist state changes debounced: drag/resize emit many layout updates and
  // localStorage writes are synchronous, so coalesce them. Flush on unmount.
  const stateRef = useRef(state);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    setState((prev) => ({ ...prev, layout: [...layout] }));
  }, []);

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

  const widgetOrder = useMemo(
    () =>
      [...state.layout]
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((item) => item.i),
    [state.layout]
  );

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
      <div ref={containerRef} className="w-full">
        <GridLayout
          width={width || 1024}
          layout={state.layout}
          gridConfig={{ cols: GRID_COLS, rowHeight: ROW_HEIGHT, margin: GRID_MARGIN, containerPadding: [0, 0] }}
          dragConfig={{ enabled: true, handle: '.audit-widget-drag-handle' }}
          resizeConfig={{ enabled: true, handles: ['s', 'e', 'se'] }}
          onLayoutChange={handleLayoutChange}
        >
          {widgets.map((widget) => {
            const item = layoutById.get(widget.id);
            const collapsed = !!state.collapsed[widget.id];
            const contentHeight = Math.max(0, widgetPixelHeight(item) - WIDGET_HEADER_PX);
            const orderIndex = widgetOrder.indexOf(widget.id);
            const canMoveUp = orderIndex > 0;
            const canMoveDown = orderIndex >= 0 && orderIndex < widgetOrder.length - 1;
            return (
              <div key={widget.id} data-testid={`audit-widget-${widget.id}`}>
                <div className="h-full flex flex-col rounded-md border bg-card overflow-hidden">
                  <div
                    className="flex items-center gap-1.5 px-2 shrink-0 border-b bg-muted/30"
                    style={{ height: WIDGET_HEADER_PX }}
                  >
                    <button
                      type="button"
                      className="audit-widget-drag-handle flex items-center justify-center h-6 w-6 rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="Drag to rearrange"
                      aria-label={`Drag to move the ${widget.title} section`}
                      data-testid={`audit-widget-drag-${widget.id}`}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </button>
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
                        <ChevronUp className="h-3.5 w-3.5" />
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
                        <ChevronDown className="h-3.5 w-3.5" />
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
                        <ChevronDown
                          className={cn('h-3.5 w-3.5 transition-transform', collapsed && '-rotate-90')}
                        />
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
      </div>
    </div>
  );
}
