import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';

type StructuredLocationEditorDialogFooterProps = {
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  canSave: boolean;
  isSaving: boolean;
  saveLabel: string;
};

export function StructuredLocationEditorDialogFooter({
  onCancel,
  onSave,
  canSave,
  isSaving,
  saveLabel,
}: StructuredLocationEditorDialogFooterProps) {
  return (
    <DialogFooter className="gap-2 sm:gap-0">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
        Cancel
      </Button>
      <Button
        type="button"
        onClick={() => void onSave()}
        disabled={!canSave || isSaving}
        className="gap-1.5"
      >
        <Check className="h-3.5 w-3.5" />
        {isSaving ? 'Saving...' : saveLabel}
      </Button>
    </DialogFooter>
  );
}
