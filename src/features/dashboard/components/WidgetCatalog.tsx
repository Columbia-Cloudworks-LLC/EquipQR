import React, { useMemo, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getAllWidgets } from '@/features/dashboard/registry/widgetRegistry';
import type { WidgetCategory, WidgetDefinition } from '@/features/dashboard/types/dashboard';

interface WidgetCatalogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeWidgetIds: string[];
  onAddWidget: (widgetId: string) => void;
  onRemoveWidget: (widgetId: string) => void;
}

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  overview: 'Overview',
  'work-orders': 'Work Orders',
  equipment: 'Equipment',
  team: 'Team',
  inventory: 'Inventory',
};

const CATEGORY_ORDER: WidgetCategory[] = ['overview', 'equipment', 'work-orders', 'team', 'inventory'];

/**
 * Widget catalog drawer for adding/removing widgets from the dashboard.
 * Shows all registered widgets grouped by category with search filtering.
 */
export const WidgetCatalog: React.FC<WidgetCatalogProps> = ({
  open,
  onOpenChange,
  activeWidgetIds,
  onAddWidget,
  onRemoveWidget,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const allWidgets = useMemo(() => getAllWidgets(), []);

  const filteredWidgets = useMemo(() => {
    if (!searchQuery.trim()) return allWidgets;
    const q = searchQuery.toLowerCase();
    return allWidgets.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q)
    );
  }, [allWidgets, searchQuery]);

  // Group filtered widgets by category
  const groupedWidgets = useMemo(() => {
    const groups = new Map<WidgetCategory, WidgetDefinition[]>();
    for (const widget of filteredWidgets) {
      const group = groups.get(widget.category);
      if (group) {
        group.push(widget);
      } else {
        groups.set(widget.category, [widget]);
      }
    }
    return groups;
  }, [filteredWidgets]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Widget Catalog</SheetTitle>
          <SheetDescription>
            Add or remove widgets from your dashboard
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Widget groups by category */}
          {CATEGORY_ORDER.map((category) => {
            const widgets = groupedWidgets.get(category);
            if (!widgets || widgets.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="space-y-2">
                  {widgets.map((widget) => {
                    const isActive = activeWidgetIds.includes(widget.id);
                    const Icon = widget.icon;

                    return (
                      <div
                        key={widget.id}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                          isActive
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {widget.title}
                            </p>
                            {isActive && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {widget.description}
                          </p>
                        </div>
                        <Button
                          variant={isActive ? 'outline' : 'default'}
                          size="sm"
                          className="shrink-0"
                          onClick={() =>
                            isActive
                              ? onRemoveWidget(widget.id)
                              : onAddWidget(widget.id)
                          }
                          aria-label={
                            isActive
                              ? `Remove ${widget.title}`
                              : `Add ${widget.title}`
                          }
                        >
                          {isActive ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredWidgets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No widgets match your search</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
