import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type LaborCostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  laborHours: string;
  laborRate: string;
  laborNote: string;
  onLaborHoursChange: (value: string) => void;
  onLaborRateChange: (value: string) => void;
  onLaborNoteChange: (value: string) => void;
  onConfirm: () => void | Promise<void>;
  isPending: boolean;
};

export function LaborCostDialog({
  open,
  onOpenChange,
  laborHours,
  laborRate,
  laborNote,
  onLaborHoursChange,
  onLaborRateChange,
  onLaborNoteChange,
  onConfirm,
  isPending,
}: LaborCostDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add labor</DialogTitle>
          <DialogDescription>
            Billable hours × hourly rate. Saved as a normal cost line (no inventory change).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="labor-hours">Hours</Label>
            <Input
              id="labor-hours"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.25"
              value={laborHours}
              onChange={(e) => onLaborHoursChange(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="labor-rate">Hourly rate (USD)</Label>
            <Input
              id="labor-rate"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={laborRate}
              onChange={(e) => onLaborRateChange(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="labor-note">Note (optional)</Label>
            <Input
              id="labor-note"
              value={laborNote}
              onChange={(e) => onLaborNoteChange(e.target.value)}
              placeholder="e.g. Emergency call-out"
              disabled={isPending}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void onConfirm()} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save labor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
