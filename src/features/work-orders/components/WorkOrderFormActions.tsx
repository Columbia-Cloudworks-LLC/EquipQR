import React from 'react';
import { Button } from "@/components/ui/button";

interface WorkOrderFormActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  isValid: boolean;
  isEditMode: boolean;
  /** Pending state for submit mutations; controls disabled state and button label */
  isSubmitting?: boolean;
}

export const WorkOrderFormActions: React.FC<WorkOrderFormActionsProps> = ({
  onCancel,
  onSubmit,
  isSubmitting = false,
  isValid,
  isEditMode
}) => {
  return (
    <div className="flex gap-2 justify-end">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button 
        onClick={onSubmit}
        data-testid="submit-button"
        disabled={isSubmitting || !isValid}
      >
        {isSubmitting ? 
          (isEditMode ? 'Updating...' : 'Creating...') : 
          (isEditMode ? 'Update Work Order' : 'Create Work Order')
        }
      </Button>
    </div>
  );
};

