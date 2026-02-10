import React, { useState, useCallback } from 'react';
import { ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
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

interface MobileWidgetReorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeWidgetIds: string[];
  onSave: (newOrder: string[]) => void;
}

/**
 * Mobile-friendly reorder UI for dashboard widgets.
 * Uses simple up/down buttons instead of drag-and-drop for
 * better touch accessibility.
 */
export const MobileWidgetReorder: React.FC<MobileWidgetReorderProps> = ({
  open,
  onOpenChange,
  activeWidgetIds,
  onSave,
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

  const handleSave = () => {
    onSave(order);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setOrder(activeWidgetIds);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto pb-safe">
        <SheetHeader className="text-left">
          <SheetTitle>Reorder Widgets</SheetTitle>
          <SheetDescription>
            Move widgets up or down to change their order on your dashboard
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {order.map((widgetId, index) => {
            const widget = getWidget(widgetId);
            if (!widget) return null;

            const Icon = widget.icon;

            return (
              <div
                key={widgetId}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {widget.title}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
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
                </div>
              </div>
            );
          })}
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save order</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
