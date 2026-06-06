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

type ChecklistTemplateSectionDialogsProps = {
  renameDialogOpen: boolean;
  onRenameDialogOpenChange: (open: boolean) => void;
  renameOriginal: string | null;
  renameInput: string;
  onRenameInputChange: (value: string) => void;
  onConfirmRename: () => void;
  deleteDialogOpen: boolean;
  onDeleteDialogOpenChange: (open: boolean) => void;
  deleteTarget: string | null;
  deleteTargetItemCount: number;
  onConfirmDelete: () => void;
};

export function ChecklistTemplateSectionDialogs({
  renameDialogOpen,
  onRenameDialogOpenChange,
  renameOriginal,
  renameInput,
  onRenameInputChange,
  onConfirmRename,
  deleteDialogOpen,
  onDeleteDialogOpenChange,
  deleteTarget,
  deleteTargetItemCount,
  onConfirmDelete,
}: ChecklistTemplateSectionDialogsProps) {
  return (
    <>
      <Dialog open={renameDialogOpen} onOpenChange={onRenameDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Section</DialogTitle>
            <DialogDescription>{`Rename section "${renameOriginal}".`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="section-name">Section Name</Label>
            <Input
              id="section-name"
              value={renameInput}
              onChange={(e) => onRenameInputChange(e.target.value)}
              placeholder="Enter section name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onRenameDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={onConfirmRename}
              disabled={!renameInput.trim() || renameInput.trim() === renameOriginal}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={onDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Delete section "${deleteTarget}" and all ${deleteTargetItemCount} items? This cannot be undone.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
