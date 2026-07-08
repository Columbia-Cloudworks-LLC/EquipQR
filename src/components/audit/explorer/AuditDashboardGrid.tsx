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
import { ChevronDown, GripVertical, RotateCcw } from 'lucide-react';
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
    const knownIds = new Set(widgets.map((w) => w.id));
    const storedItems = parsed.layout.filter(
      (item): item is LayoutItem =>
        !!item && typeof item === 'object' && knownIds.has((item as LayoutItem).i),
    );
    const storedIds = new Set(storedItems.map((item) => item.i));
    // Append any widget the stored layout does not know about yet.
    const missing = defaultLayoutFor(widgets).filter((item) => !storedIds.has(item.i));
    return {
      layout: [...storedItems, ...missing],
      collapsed: parsed.collapsed && typeof parsed.collapsed === 'object' ? parsed.collapsed : {},
      expandedH: parsed.expandedH && typeof parsed.expandedH === 'object' ? parsed.expandedH : {},
    };
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

export interface AuditDashboardGridProps {
  widgets: AuditDashboardWidgetDef[];
}

export function AuditDashboardGrid({ widgets }: AuditDashboardGridProps) {
  const { width, containerRef } = useContainerWidth();
  const [state, setState] = useState<PersistedGridState>(() => readPersistedState(widgets));

  // Persist on every state change (drag, resize, collapse, reset).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
    persistState(state);
  }, [state]);

  const handleLayoutChange = useCallback((layout: Layout) => {
    setState((prev) => ({ ...prev, layout: [...layout] }));
  }, []);

  const toggleCollapsed = useCallback((widgetId: string) => {
    setState((prev) => {
      const isCollapsed = !!prev.collapsed[widgetId];
      const layout = prev.layout.map((item) => {
        if (item.i !== widgetId) return item;
        if (isCollapsed) {
          const restoredH = prev.expandedH[widgetId] ?? item.h;
          return { ...item, h: Math.max(restoredH, COLLAPSED_H), isResizable: undefined };
        }
        return { ...item, h: COLLAPSED_H, isResizable: false };
      });
      const current = prev.layout.find((item) => item.i === widgetId);
      return {
        layout,
        collapsed: { ...prev.collapsed, [widgetId]: !isCollapsed },
        expandedH: isCollapsed
          ? prev.expandedH
          : { ...prev.expandedH, [widgetId]: current?.h ?? COLLAPSED_H },
      };
    });
  }, []);

  const resetLayout = useCallback(() => {
    setState({ layout: defaultLayoutFor(widgets), collapsed: {}, expandedH: {} });
  }, [widgets]);

  const layoutById = useMemo(() => {
    const map = new Map<string, LayoutItem>();
    for (const item of state.layout) map.set(item.i, item);
    return map;
  }, [state.layout]);

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
            return (
              <div key={widget.id} data-testid={`audit-widget-${widget.id}`}>
                <div className="h-full flex flex-col rounded-md border bg-card overflow-hidden">
                  <div
                    className="flex items-center gap-1.5 px-2 shrink-0 border-b bg-muted/30"
                    style={{ height: WIDGET_HEADER_PX }}
                  >
                    <span
                      className="audit-widget-drag-handle flex items-center justify-center h-6 w-6 rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Drag to rearrange"
                      aria-label={`Drag to move the ${widget.title} section`}
                      data-testid={`audit-widget-drag-${widget.id}`}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-semibold">{widget.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto h-6 w-6 text-muted-foreground hover:text-foreground"
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
