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
 * Maps a 12-col span value to its Tailwind `lg:col-span-*` class.
 * All widgets default to `col-span-12` (full-width) on small screens and
 * honour their registry width only at the `lg` breakpoint and above.
 * Using a lookup table keeps all class names as static strings so Tailwind's
 * JIT scanner never purges them.
 */
const LG_COL_SPAN: Record<number, string> = {
  1:  'lg:col-span-1',
  2:  'lg:col-span-2',
  3:  'lg:col-span-3',
  4:  'lg:col-span-4',
  5:  'lg:col-span-5',
  6:  'lg:col-span-6',
  7:  'lg:col-span-7',
  8:  'lg:col-span-8',
  9:  'lg:col-span-9',
  10: 'lg:col-span-10',
  11: 'lg:col-span-11',
  12: 'lg:col-span-12',
};

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
        // defaultSize.w is in 12-col terms; clamp to [1, 12]
        const colSpan = Math.min(Math.max(widget.defaultSize.w, 1), 12);
        const lgClass = LG_COL_SPAN[colSpan] ?? 'lg:col-span-12';

        return (
          <div
            key={widgetId}
            className={`col-span-12 ${lgClass}`}
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
