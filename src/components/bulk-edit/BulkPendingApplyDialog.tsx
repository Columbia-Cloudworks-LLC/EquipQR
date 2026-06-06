import React from 'react';
import { BulkApplyConfirmDialog } from '@/features/equipment/components/BulkApplyConfirmDialog';

type PendingApply = { fieldLabel: string } | null;

type BulkPendingApplyDialogProps = {
  pendingApply: PendingApply;
  selectedCount: number;
  onApplyAll: () => void;
  onApplyOne: () => void;
  onCancel: () => void;
};

export const BulkPendingApplyDialog: React.FC<BulkPendingApplyDialogProps> = ({
  pendingApply,
  selectedCount,
  onApplyAll,
  onApplyOne,
  onCancel,
}) => (
  <BulkApplyConfirmDialog
    open={pendingApply !== null}
    fieldLabel={pendingApply?.fieldLabel ?? ''}
    selectedCount={selectedCount}
    onApplyAll={onApplyAll}
    onApplyOne={onApplyOne}
    onCancel={onCancel}
  />
);
