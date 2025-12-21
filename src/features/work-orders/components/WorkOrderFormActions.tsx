import React from 'react';
import { Button } from "@/components/ui/button";

interface WorkOrderFormActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  isValid: boolean;
  isEditMode: boolean;
}

export const WorkOrderFormActions: React.FC<WorkOrderFormActionsProps> = ({
  onCancel,
  onSubmit,
  isLoading,
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
        disabled={isLoading || !isValid}
      >
        {isLoading ? 
          (isEditMode ? 'Updating...' : 'Creating...') : 
          (isEditMode ? 'Update Work Order' : 'Create Work Order')
        }
      </Button>
    </div>
  );
};

