import React, { useState, useCallback } from 'react';
import { ArrowUp, ArrowDown, X, Plus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { getWidget } from '@/features/dashboard/registry/widgetRegistry';

interface WidgetManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeWidgetIds: string[];
  onSave: (newOrder: string[]) => void;
  onOpenCatalog: () => void;
}

/**
 * Unified widget manager sheet for all screen sizes.
 * Users can reorder widgets with up/down buttons, remove them inline,
 * or open the widget catalog to add new ones.
 */
export const WidgetManager: React.FC<WidgetManagerProps> = ({
  open,
  onOpenChange,
  activeWidgetIds,
  onSave,
  onOpenCatalog,
}) => {
  const [order, setOrder] = useState<string[]>(activeWidgetIds);

  // Reset order when sheet opens
  React.useEffect(() => {
    if (open) {
      setOrder(activeWidgetIds);
    }
  }, [open, activeWidgetIds]);

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setOrder((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const removeFromOrder = useCallback((widgetId: string) => {
    setOrder((prev) => prev.filter((id) => id !== widgetId));
  }, []);

  const handleSave = () => {
    onSave(order);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setOrder(activeWidgetIds);
    onOpenChange(false);
  };

  const handleOpenCatalog = () => {
    onOpenChange(false);
    onOpenCatalog();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col pb-safe">
        <SheetHeader className="text-left shrink-0">
          <SheetTitle>Customize Dashboard</SheetTitle>
          <SheetDescription>
            Reorder or remove widgets. Use the button below to add new ones.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
          {order.map((widgetId, index) => {
            const widget = getWidget(widgetId);
            if (!widget) return null;

            const Icon = widget.icon;

            return (
              <div
                key={widgetId}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{widget.title}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === 0}
                    onClick={() => moveUp(index)}
                    aria-label={`Move ${widget.title} up`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === order.length - 1}
                    onClick={() => moveDown(index)}
                    aria-label={`Move ${widget.title} down`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeFromOrder(widgetId)}
                    aria-label={`Remove ${widget.title}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {order.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No widgets on your dashboard. Add some below.
            </p>
          )}
        </div>

        <SheetFooter className="mt-4 shrink-0 flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full sm:w-auto gap-1.5" onClick={handleOpenCatalog}>
            <Plus className="h-4 w-4" />
            Add Widgets
          </Button>
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleCancel}>
              Cancel
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={handleSave}>
              Save
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
