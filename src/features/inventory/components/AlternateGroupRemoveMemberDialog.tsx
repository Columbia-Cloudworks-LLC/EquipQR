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
import type { AlternateGroupMember } from '@/features/inventory/services/partAlternatesService';

type AlternateGroupRemoveMemberDialogProps = {
  member: AlternateGroupMember | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function AlternateGroupRemoveMemberDialog({
  member,
  onOpenChange,
  onConfirm,
}: AlternateGroupRemoveMemberDialogProps) {
  return (
    <AlertDialog open={!!member} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove from Group?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove "
            {member?.inventory_name || member?.identifier_value || 'this item'}
            " from the alternate group?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
