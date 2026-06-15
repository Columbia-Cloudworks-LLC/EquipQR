import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatStatus } from '@/features/work-orders/utils/workOrderHelpers';
import type { WorkOrderStatusAction } from '@/features/work-orders/utils/buildWorkOrderStatusActions';

export interface MobileWorkOrderStatusSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: string;
  actions: WorkOrderStatusAction[];
  isPending?: boolean;
}

export function MobileWorkOrderStatusSheet({
  open,
  onOpenChange,
  currentStatus,
  actions,
  isPending = false,
}: MobileWorkOrderStatusSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="pb-safe-bottom">
        <SheetHeader>
          <SheetTitle>Change status</SheetTitle>
          <SheetDescription>
            Current status: {formatStatus(currentStatus)}. Choose how to update this work order.
          </SheetDescription>
        </SheetHeader>

        {actions.length > 0 ? (
          <div className="mt-4 space-y-2">
            {actions.map((action) => {
              const Icon = action.icon;
              const isCancelAction = action.label === 'Cancel';

              return (
                <div key={action.label}>
                  <Button
                    type="button"
                    variant={action.variant}
                    className={`min-h-[44px] w-full justify-start touch-manipulation ${
                      isCancelAction
                        ? 'text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive'
                        : ''
                    }`}
                    disabled={isPending || action.disabled}
                    onClick={() => {
                      action.action();
                      onOpenChange(false);
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                    {action.label}
                  </Button>
                  <p className="ml-6 mt-1 text-xs text-muted-foreground">{action.description}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No status changes are available for this work order.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
