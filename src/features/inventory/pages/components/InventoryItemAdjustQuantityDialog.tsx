import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type InventoryItemAdjustQuantityDialogProps = {
  isMobile: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentQuantity: number;
  showAddInput: boolean;
  showSubtractInput: boolean;
  adjustmentAmount: number;
  adjustReason: string;
  isPending: boolean;
  outlineSecondaryClass: string;
  onAdjustmentAmountChange: (value: number) => void;
  onAdjustReasonChange: (value: string) => void;
  onQuickAdd: () => void;
  onQuickTake: () => void;
  onShowAddMore: () => void;
  onShowTakeMore: () => void;
  onCancelInput: () => void;
  onSubmitMore: () => void;
};

export function InventoryItemAdjustQuantityDialog({
  isMobile,
  open,
  onOpenChange,
  currentQuantity,
  showAddInput,
  showSubtractInput,
  adjustmentAmount,
  adjustReason,
  isPending,
  outlineSecondaryClass,
  onAdjustmentAmountChange,
  onAdjustReasonChange,
  onQuickAdd,
  onQuickTake,
  onShowAddMore,
  onShowTakeMore,
  onCancelInput,
  onSubmitMore,
}: InventoryItemAdjustQuantityDialogProps) {
  const content = (
    <div
      className={cn(
        'space-y-6',
        isMobile
          ? 'max-h-[min(85dvh,calc(100dvh-8rem))] overflow-y-auto overscroll-contain px-4 pb-2 [-webkit-overflow-scrolling:touch]'
          : 'max-h-[calc(100dvh-11rem)] overflow-y-auto overscroll-contain pr-1 pb-safe-bottom',
      )}
    >
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Current quantity</p>
        <p className="text-4xl font-bold">{currentQuantity}</p>
      </div>

      {!showSubtractInput && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Add to inventory</Label>
          {showAddInput ? (
            <div className="space-y-3">
              <Input
                type="number"
                min="1"
                value={adjustmentAmount}
                onChange={(e) => onAdjustmentAmountChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                placeholder="Enter amount to add"
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={onCancelInput} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={onSubmitMore} disabled={adjustmentAmount <= 0 || isPending} className="flex-1">
                  {isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={onQuickAdd} disabled={isPending} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Add 1
              </Button>
              <Button variant="outline" onClick={onShowAddMore} className={cn('flex-1', outlineSecondaryClass)}>
                <Plus className="h-4 w-4 mr-2" />
                Add More
              </Button>
            </div>
          )}
        </div>
      )}

      {!showAddInput && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Take from inventory</Label>
          {showSubtractInput ? (
            <div className="space-y-3">
              <Input
                type="number"
                min="1"
                value={adjustmentAmount}
                onChange={(e) => onAdjustmentAmountChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                placeholder="Enter amount to take"
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={onCancelInput} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={onSubmitMore} disabled={adjustmentAmount <= 0 || isPending} className="flex-1">
                  {isPending ? 'Taking...' : 'Take'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={onQuickTake} disabled={isPending} variant="destructive" className="flex-1">
                <Minus className="h-4 w-4 mr-2" />
                Take 1
              </Button>
              <Button variant="outline" onClick={onShowTakeMore} className={cn('flex-1', outlineSecondaryClass)}>
                <Minus className="h-4 w-4 mr-2" />
                Take More
              </Button>
            </div>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="adjust-reason" className="text-sm font-medium">
          Reason <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="adjust-reason"
          value={adjustReason}
          onChange={(e) => onAdjustReasonChange(e.target.value)}
          placeholder="Reason for adjustment..."
          rows={3}
          className="mt-1"
        />
      </div>

      {!showAddInput && !showSubtractInput &&
        (isMobile ? (
          <Button
            variant="outline"
            className="w-full min-h-11 border-border/80 bg-transparent"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        ) : (
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        ))}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92dvh] pb-safe-bottom">
          <DrawerHeader className="text-left">
            <DrawerTitle>Adjust Quantity</DrawerTitle>
            <DrawerDescription className="sr-only">
              Add or remove inventory quantity. You can optionally record a reason.
            </DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust Quantity</DialogTitle>
          <DialogDescription className="sr-only">
            Add or remove inventory quantity. You can optionally record a reason.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
