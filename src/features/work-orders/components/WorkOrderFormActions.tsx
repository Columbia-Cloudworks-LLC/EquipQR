import React from 'react';
import { Button } from "@/components/ui/button";

interface WorkOrderFormActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  isValid: boolean;
  isEditMode: boolean;
  /** Optional disabled state override (e.g., invalid form) */
  isDisabled?: boolean;
  /** Pending state for submit mutations; controls label only */
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
  const submitDisabled = (isDisabled ?? false) || isLoading || !isValid;
  const showLoadingState = isSubmitting ?? isLoading;

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

