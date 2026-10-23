import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateInventoryPurchaseRequest } from '@/features/inventory/hooks/usePurchaseRequests';
import type { InventoryItem } from '@/features/inventory/types/inventory';

export function computeSuggestedRestockQuantity(
  item: Pick<InventoryItem, 'quantity_on_hand' | 'low_stock_threshold'> | null | undefined,
): number {
  if (!item) return 1;
  if (item.low_stock_threshold > 0) {
    const target = item.low_stock_threshold * 2 - item.quantity_on_hand;
    return Math.max(1, target);
  }
  return 1;
}

interface RequestRestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  item?: InventoryItem | null;
  availableItems?: InventoryItem[];
}

export const RequestRestockDialog: React.FC<RequestRestockDialogProps> = ({
  open,
  onOpenChange,
  organizationId,
  item = null,
  availableItems = [],
}) => {
  const createMutation = useCreateInventoryPurchaseRequest();

  const [selectedItemId, setSelectedItemId] = useState<string>(item?.id ?? '');
  const [requestedQuantity, setRequestedQuantity] = useState<string>('1');
  const [vendorName, setVendorName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const activeItem = useMemo(() => {
    if (item) return item;
    return availableItems.find((candidate) => candidate.id === selectedItemId) ?? null;
  }, [item, availableItems, selectedItemId]);

  useEffect(() => {
    if (open) {
      const initialItem = item ?? availableItems[0] ?? null;
      setSelectedItemId(initialItem?.id ?? '');
      setRequestedQuantity(String(computeSuggestedRestockQuantity(initialItem)));
      setVendorName('');
      setNotes('');
      setValidationError(null);
    }
  }, [open, item, availableItems]);

  const handleSelectedItemChange = (nextItemId: string) => {
    setSelectedItemId(nextItemId);
    const nextItem = availableItems.find((candidate) => candidate.id === nextItemId) ?? null;
    setRequestedQuantity(String(computeSuggestedRestockQuantity(nextItem)));
    setValidationError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const targetItemId = item?.id ?? selectedItemId;
    if (!targetItemId) {
      setValidationError('Select an inventory item to restock.');
      return;
    }

    const parsedQuantity = Number.parseInt(requestedQuantity, 10);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setValidationError('Requested quantity must be at least 1.');
      return;
    }

    setValidationError(null);
    await createMutation.mutateAsync({
      organizationId,
      input: {
        inventoryItemId: targetItemId,
        requestedQuantity: parsedQuantity,
        vendorName: vendorName.trim() || null,
        notes: notes.trim() || null,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Request Restock
          </DialogTitle>
          <DialogDescription>
            {item
              ? `Create a restock purchase request for ${item.name}.`
              : 'Create a lightweight purchase request for a single inventory item.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!item && (
            <div className="space-y-1.5">
              <Label htmlFor="restock-item-select">Inventory Item</Label>
              <Select value={selectedItemId} onValueChange={handleSelectedItemChange}>
                <SelectTrigger id="restock-item-select" aria-label="Inventory Item">
                  <SelectValue placeholder="Select an inventory item" />
                </SelectTrigger>
                <SelectContent>
                  {availableItems.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name}
                      {candidate.sku ? ` (${candidate.sku})` : ''} — {candidate.quantity_on_hand} on hand
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeItem && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{activeItem.name}</span>
                {activeItem.sku && <span>SKU: {activeItem.sku}</span>}
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span>On hand: {activeItem.quantity_on_hand}</span>
                <span>Low-stock threshold: {activeItem.low_stock_threshold}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="restock-requested-qty">Requested Quantity</Label>
            <Input
              id="restock-requested-qty"
              type="number"
              min={1}
              step={1}
              value={requestedQuantity}
              onChange={(e) => setRequestedQuantity(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="restock-vendor-name">Vendor / Supplier (optional)</Label>
            <Input
              id="restock-vendor-name"
              placeholder="e.g. NAPA Auto Parts, Grainger"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="restock-notes">Notes (optional)</Label>
            <Textarea
              id="restock-notes"
              placeholder="Part link, PO reference, or urgency notes..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {validationError && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {validationError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
