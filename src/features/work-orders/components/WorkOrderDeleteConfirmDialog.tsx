import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type WorkOrderDeleteImageSummary = {
  count: number;
};

type WorkOrderDeleteConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageData?: WorkOrderDeleteImageSummary | null;
  isDeleting: boolean;
  onConfirm: () => void;
  requireTypedConfirm?: boolean;
  confirmText?: string;
  onConfirmTextChange?: (text: string) => void;
  confirmInputId?: string;
};

export function WorkOrderDeleteConfirmDialog({
  open,
  onOpenChange,
  imageData,
  isDeleting,
  onConfirm,
  requireTypedConfirm = false,
  confirmText = '',
  onConfirmTextChange,
  confirmInputId = 'work-order-delete-confirm',
}: WorkOrderDeleteConfirmDialogProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) onConfirmTextChange?.('');
  };

  const confirmDisabled =
    isDeleting || (requireTypedConfirm && confirmText.trim() !== 'DELETE');

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this work order? This action is irreversible and will permanently remove:
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Work order details and description</li>
              <li>• All notes and comments</li>
              <li>• Cost records and estimates</li>
              <li>• Status history</li>
              <li>• Preventative maintenance records</li>
              {imageData && imageData.count > 0 && (
                <li className="flex items-center gap-2">
                  • All uploaded images
                  <Badge variant="destructive" className="text-xs">
                    {imageData.count} image{imageData.count !== 1 ? 's' : ''}
                  </Badge>
                </li>
              )}
            </ul>
            {requireTypedConfirm && onConfirmTextChange ? (
              <div className="mt-4 space-y-2">
                <Label htmlFor={confirmInputId}>Type DELETE to confirm</Label>
                <Input
                  id={confirmInputId}
                  autoComplete="off"
                  value={confirmText}
                  onChange={(e) => onConfirmTextChange(e.target.value)}
                  placeholder="DELETE"
                  className="font-mono"
                />
              </div>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
