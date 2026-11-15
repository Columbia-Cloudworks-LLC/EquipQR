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
import { CheckCircle } from 'lucide-react';

interface WorkOrderCompleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
  /** Shown above the checklist when the work timer has run. */
  timer?: { elapsedSeconds: number; displayTime: string };
}

/** "Complete Work Order" confirmation used by the desktop status manager and the mobile footer. */
export function WorkOrderCompleteConfirmDialog({
  open,
  onOpenChange,
  isPending,
  onConfirm,
  timer,
}: WorkOrderCompleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Complete Work Order
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>Are you sure you want to mark this work order as completed?</p>
              {timer && timer.elapsedSeconds > 0 && (
                <p className="text-sm">
                  Timer: <span className="font-medium text-foreground">{timer.displayTime}</span> ({(timer.elapsedSeconds / 3600).toFixed(2)}h)
                </p>
              )}
              <p className="text-sm font-medium text-foreground">Before completing, please confirm:</p>
              <ul className="text-sm space-y-1 list-disc pl-4">
                <li>All hours have been logged</li>
                <li>All cost items have been recorded</li>
                <li>Notes and photos are up to date</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            Go Back
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Completing...' : 'Mark as Complete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
