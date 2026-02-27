import React, { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getWidget } from '@/features/dashboard/registry/widgetRegistry';

interface DashboardGridProps {
  /** Active widget IDs to render, in display order */
  activeWidgets: string[];
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
 * Static CSS-grid dashboard. Widgets are rendered in `activeWidgets` order,
 * each spanning their `defaultSize.w` columns (out of 12) on large screens
 * and collapsing to full-width on smaller breakpoints.
 *
 * Customization (reorder, add, remove) is done exclusively via the
 * WidgetManager sheet — this component has no interactive layout behaviour.
 */
export const DashboardGrid: React.FC<DashboardGridProps> = ({ activeWidgets }) => {
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
    <div
      data-testid="dashboard-grid"
      className="grid grid-cols-12 gap-4"
    >
      {activeWidgets.map((widgetId) => {
        const widget = getWidget(widgetId);
        if (!widget) return null;

        const WidgetComponent = widget.component;
        // defaultSize.w is defined in 12-col terms; cap to 12 for safety
        const colSpan = Math.min(widget.defaultSize.w, 12);

        return (
          <div
            key={widgetId}
            style={{ gridColumn: `span ${colSpan}` }}
            className="col-span-12 lg:col-auto"
          >
            <Card className="h-full flex flex-col overflow-hidden">
              <CardContent className="flex-1 overflow-auto p-0">
                <Suspense fallback={<WidgetSkeleton />}>
                  <WidgetComponent />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};
