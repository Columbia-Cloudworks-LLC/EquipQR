import { useState } from 'react';

type AdjustMutation = {
  mutateAsync: (args: {
    organizationId: string;
    adjustment: { itemId: string; delta: number; reason: string };
  }) => Promise<unknown>;
  isPending: boolean;
};

type UseInventoryItemAdjustQuantityParams = {
  organizationId?: string;
  itemId?: string;
  adjustMutation: AdjustMutation;
};

export function useInventoryItemAdjustQuantity({
  organizationId,
  itemId,
  adjustMutation,
}: UseInventoryItemAdjustQuantityParams) {
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [showSubtractInput, setShowSubtractInput] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState(1);
  const [adjustReason, setAdjustReason] = useState('');

  const resetAdjustDialog = () => {
    setShowAddInput(false);
    setShowSubtractInput(false);
    setAdjustmentAmount(1);
    setAdjustReason('');
  };

  const handleAdjustOpenChange = (open: boolean) => {
    setShowAdjustDialog(open);
    if (!open) {
      resetAdjustDialog();
    }
  };

  const handleAdjustQuantity = async (delta: number) => {
    if (!organizationId || !itemId || delta === 0) return;
    try {
      await adjustMutation.mutateAsync({
        organizationId,
        adjustment: {
          itemId,
          delta,
          reason: adjustReason || 'Manual adjustment',
        },
      });
      setShowAdjustDialog(false);
      resetAdjustDialog();
    } catch {
      // Error handled in mutation
    }
  };

  const handleQuickAdd = () => handleAdjustQuantity(1);
  const handleQuickTake = () => handleAdjustQuantity(-1);

  const handleShowAddMore = () => {
    setShowAddInput(true);
    setShowSubtractInput(false);
    setAdjustmentAmount(1);
  };

  const handleShowTakeMore = () => {
    setShowSubtractInput(true);
    setShowAddInput(false);
    setAdjustmentAmount(1);
  };

  const handleCancelInput = () => {
    setShowAddInput(false);
    setShowSubtractInput(false);
    setAdjustmentAmount(1);
  };

  const handleSubmitMore = () => {
    if (adjustmentAmount <= 0) return;
    const delta = showAddInput ? adjustmentAmount : -adjustmentAmount;
    handleAdjustQuantity(delta);
  };

  return {
    showAdjustDialog,
    setShowAdjustDialog,
    showAddInput,
    showSubtractInput,
    adjustmentAmount,
    setAdjustmentAmount,
    adjustReason,
    setAdjustReason,
    handleAdjustOpenChange,
    handleQuickAdd,
    handleQuickTake,
    handleShowAddMore,
    handleShowTakeMore,
    handleCancelInput,
    handleSubmitMore,
    adjustMutationPending: adjustMutation.isPending,
  };
}
