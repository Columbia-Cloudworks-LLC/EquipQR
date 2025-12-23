import React from 'react';
import { Button } from "@/components/ui/button";

interface WorkOrderFormActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  isValid: boolean;
  isEditMode: boolean;
  /** Optional disabled state override (e.g., invalid form) */
  isDisabled?: boolean;
  /** Loading state from form submission hook (legacy, prefer isSubmitting) */
  isLoading?: boolean;
  /** Pending state for submit mutations; used for both disabled state and button label */
  isSubmitting?: boolean;
}

export const WorkOrderFormActions: React.FC<WorkOrderFormActionsProps> = ({
  onCancel,
  onSubmit,
  isLoading,
  isDisabled,
  isSubmitting,
  isValid,
  isEditMode
}) => {
  const isPending = isSubmitting ?? isLoading;
  const submitDisabled = (isDisabled ?? false) || isPending || !isValid;
  const showLoadingState = isPending;

  return (
    <div className="flex gap-2 justify-end">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button 
        onClick={onSubmit}
        data-testid="submit-button"
        disabled={submitDisabled}
      >
        {showLoadingState ? 
          (isEditMode ? 'Updating...' : 'Creating...') : 
          (isEditMode ? 'Update Work Order' : 'Create Work Order')
        }
      </Button>
    </div>
  );
};

