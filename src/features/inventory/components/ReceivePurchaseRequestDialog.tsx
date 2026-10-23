import React, { useEffect, useState } from 'react';
import { PackageCheck } from 'lucide-react';
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
import { useReceivePurchaseRequest } from '@/features/inventory/hooks/usePurchaseRequests';
import type { InventoryPurchaseRequest } from '@/features/inventory/types/inventory';

interface ReceivePurchaseRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  request: InventoryPurchaseRequest | null;
}

export const ReceivePurchaseRequestDialog: React.FC<ReceivePurchaseRequestDialogProps> = ({
  open,
  onOpenChange,
  organizationId,
  request,
}) => {
  const receiveMutation = useReceivePurchaseRequest();

  const [receivedQuantity, setReceivedQuantity] = useState<string>('1');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [receivedUnitCost, setReceivedUnitCost] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open && request) {
      setReceivedQuantity(String(request.requested_quantity));
      setInvoiceNumber(request.invoice_number ?? '');
      setReceivedUnitCost(
        request.received_unit_cost !== null && request.received_unit_cost !== undefined
          ? String(request.received_unit_cost)
          : '',
      );
      setNotes(request.notes ?? '');
      setValidationError(null);
    }
  }, [open, request]);

  if (!request) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedQty = Number.parseInt(receivedQuantity, 10);
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      setValidationError('Received quantity must be at least 1.');
      return;
    }

    let parsedUnitCost: number | null = null;
    if (receivedUnitCost.trim() !== '') {
      const numericCost = Number.parseFloat(receivedUnitCost);
      if (!Number.isFinite(numericCost) || numericCost < 0) {
        setValidationError('Received unit cost must be zero or a positive number.');
        return;
      }
      parsedUnitCost = Math.round(numericCost * 100) / 100;
    }

    setValidationError(null);
    await receiveMutation.mutateAsync({
      organizationId,
      input: {
        requestId: request.id,
        receivedQuantity: parsedQty,
        invoiceNumber: invoiceNumber.trim() || null,
        receivedUnitCost: parsedUnitCost,
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
            <PackageCheck className="h-5 w-5 text-primary" />
            Receive Restock Order
          </DialogTitle>
          <DialogDescription>
            Confirm the quantity received for{' '}
            <span className="font-medium text-foreground">
              {request.inventoryItemName ?? 'this item'}
            </span>
            . Receiving creates a restock transaction and increments quantity on hand.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <span>Requested quantity: {request.requested_quantity}</span>
              {request.vendor_name && <span>Vendor: {request.vendor_name}</span>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receive-quantity-input">Received Quantity</Label>
            <Input
              id="receive-quantity-input"
              type="number"
              min={1}
              step={1}
              value={receivedQuantity}
              onChange={(e) => setReceivedQuantity(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="receive-invoice-input">Invoice # (optional)</Label>
              <Input
                id="receive-invoice-input"
                placeholder="e.g. INV-10482"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receive-unit-cost-input">Unit Cost (optional)</Label>
              <Input
                id="receive-unit-cost-input"
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={receivedUnitCost}
                onChange={(e) => setReceivedUnitCost(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receive-notes-input">Notes (optional)</Label>
            <Textarea
              id="receive-notes-input"
              rows={2}
              placeholder="Receiving notes or packing slip details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {validationError ? (
            <p className="text-xs font-medium text-destructive" role="alert">
              {validationError}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={receiveMutation.isPending}
            >
              Close
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={receiveMutation.isPending}
            >
              <PackageCheck className="mr-1.5 h-4 w-4" />
              {receiveMutation.isPending ? 'Receiving...' : 'Confirm & Restock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
