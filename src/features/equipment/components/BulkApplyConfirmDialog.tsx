import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface BulkApplyConfirmDialogProps {
  /** Controls dialog visibility. */
  open: boolean;
  /** Field label that the user just edited (e.g. "Location"). Used in the prompt. */
  fieldLabel: string;
  /** Number of rows that are currently selected (and would receive the change). */
  selectedCount: number;
  /** Apply the in-flight change to every selected row. */
  onApplyAll: () => void;
  /** Apply the in-flight change only to the row the user clicked into. */
  onApplyOne: () => void;
  /** Discard the in-flight change entirely. */
  onCancel: () => void;
}

/**
 * Prompt rendered when a user edits a cell on a row that is part of a multi-
 * row selection in the bulk-edit grid (#627, AC#4). Resolves the Service
 * Request clarification that auto-apply across selected rows would be too
 * surprising — the user must explicitly opt into the broadcast.
 */
export const BulkApplyConfirmDialog: React.FC<BulkApplyConfirmDialogProps> = ({
  open,
  fieldLabel,
  selectedCount,
  onApplyAll,
  onApplyOne,
  onCancel,
}) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply change to selected rows?</DialogTitle>
          <DialogDescription>
            You edited <span className="font-medium">{fieldLabel}</span> on a row that is
            part of a selection of {selectedCount} rows. Apply the new value to every
            selected row, or only this one?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={onApplyOne}>
            Apply to This Row Only
          </Button>
          <Button type="button" onClick={onApplyAll}>
            Apply to All Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
