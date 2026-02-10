import React, { Suspense, useMemo } from 'react';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import { GripVertical, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getWidget } from '@/features/dashboard/registry/widgetRegistry';
import { DASHBOARD_GRID_CONFIG } from '@/features/dashboard/types/dashboard';
import type { Layout } from 'react-grid-layout';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface DashboardGridProps {
  /** Active widget IDs to render */
  activeWidgets: string[];
  /** Per-breakpoint layouts */
  layouts: Record<string, Layout[]>;
  /** Whether the grid is in edit/customize mode */
  isEditMode: boolean;
  /** Called when the layout changes (drag/resize) */
  onLayoutChange: (layout: Layout[], allLayouts: Record<string, Layout[]>) => void;
  /** Called when a widget is removed */
  onRemoveWidget?: (widgetId: string) => void;
}

/** Loading fallback for lazy-loaded widgets */
const WidgetSkeleton: React.FC = () => (
  <div className="p-4 space-y-3">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-4 w-2/3" />
  </div>
);

/**
 * Dashboard grid component powered by react-grid-layout v2.
 * Uses useContainerWidth hook for responsive width measurement.
 * Renders registered widgets in a responsive, drag-and-drop grid.
 * When `isEditMode` is false, dragging and resizing are disabled.
 */
export const DashboardGrid: React.FC<DashboardGridProps> = ({
  activeWidgets,
  layouts,
  isEditMode,
  onLayoutChange,
  onRemoveWidget,
}) => {
  const { width, containerRef, mounted } = useContainerWidth();

  const children = useMemo(
    () =>
      activeWidgets.map((widgetId) => {
        const widget = getWidget(widgetId);
        if (!widget) return null;

        const WidgetComponent = widget.component;

        return (
          <div key={widgetId} className="h-full">
            <Card
              className={cn(
                'h-full flex flex-col overflow-hidden transition-shadow',
                isEditMode && 'ring-1 ring-border/50 shadow-sm'
              )}
            >
              {/* Drag handle + widget header (only in edit mode) */}
              {isEditMode && (
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/30 cursor-grab active:cursor-grabbing drag-handle">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <GripVertical className="h-3.5 w-3.5" />
                    <span className="font-medium">{widget.title}</span>
                  </div>
                  {onRemoveWidget && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveWidget(widgetId);
                      }}
                      aria-label={`Remove ${widget.title} widget`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              <CardContent className="flex-1 overflow-auto p-0">
                <Suspense fallback={<WidgetSkeleton />}>
                  <WidgetComponent />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        );
      }).filter(Boolean),
    [activeWidgets, isEditMode, onRemoveWidget]
  );

  if (activeWidgets.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">No widgets on your dashboard</p>
          <p className="text-sm">Click &quot;Customize&quot; to add widgets</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      {mounted && (
        <Responsive
          className="dashboard-grid"
          layouts={layouts}
          width={width}
          breakpoints={DASHBOARD_GRID_CONFIG.breakpoints}
          cols={DASHBOARD_GRID_CONFIG.cols}
          rowHeight={DASHBOARD_GRID_CONFIG.rowHeight}
          margin={DASHBOARD_GRID_CONFIG.margin}
          containerPadding={DASHBOARD_GRID_CONFIG.containerPadding}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          draggableHandle=".drag-handle"
          compactType="vertical"
          onLayoutChange={onLayoutChange}
          useCSSTransforms
        >
          {children}
        </Responsive>
      )}
    </div>
  );
};
