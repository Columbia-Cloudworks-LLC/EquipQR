import { Loader2 } from 'lucide-react';
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

interface GoogleWorkspaceDisconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export function GoogleWorkspaceDisconnectDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: GoogleWorkspaceDisconnectDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect Google Workspace?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes EquipQR&apos;s Google OAuth access, clears the cached Workspace directory,
            and releases your domain claim. Organization members and EquipQR data are kept. You can
            start Google Workspace onboarding again after disconnecting.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              'Disconnect Google Workspace'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
