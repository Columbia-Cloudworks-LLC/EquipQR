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

type PMChecklistDialogsProps = {
  showSetAllOKDialog: boolean;
  onSetAllOKDialogOpenChange: (open: boolean) => void;
  isSettingAllOK: boolean;
  onConfirmSetAllOK: () => void;
  showRevertPMDialog: boolean;
  onRevertPMDialogOpenChange: (open: boolean) => void;
  isReverting: boolean;
  onConfirmRevert: () => void;
};

export function PMChecklistDialogs({
  showSetAllOKDialog,
  onSetAllOKDialogOpenChange,
  isSettingAllOK,
  onConfirmSetAllOK,
  showRevertPMDialog,
  onRevertPMDialogOpenChange,
  isReverting,
  onConfirmRevert,
}: PMChecklistDialogsProps) {
  return (
    <>
      <AlertDialog open={showSetAllOKDialog} onOpenChange={onSetAllOKDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set All Items to OK?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the condition of all checklist items to "OK". Any existing notes on the
              items will be preserved. This action is useful when the equipment is already in good
              working order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSettingAllOK}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmSetAllOK} disabled={isSettingAllOK}>
              {isSettingAllOK ? 'Setting & Saving...' : 'Set All to OK & Save'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRevertPMDialog} onOpenChange={onRevertPMDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert PM Completion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revert the PM checklist status from completed back to in-progress. All
              checklist item assessments and notes will be preserved. This action can only be
              performed by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReverting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRevertPMDialogOpenChange(false);
                onConfirmRevert();
              }}
              disabled={isReverting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isReverting ? 'Reverting...' : 'Yes, Revert Completion'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
