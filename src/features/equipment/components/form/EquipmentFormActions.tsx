import React from 'react';
import { Button } from "@/components/ui/button";

interface EquipmentFormActionsProps {
  isEdit: boolean;
  isPending: boolean;
  onClose: () => void;
}

const EquipmentFormActions: React.FC<EquipmentFormActionsProps> = ({
  isEdit,
  isPending,
  onClose
}) => {
  return (
    <div className="flex gap-2 justify-end">
      <Button type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : (isEdit ? 'Update Equipment' : 'Create Equipment')}
      </Button>
    </div>
  );
};

export default EquipmentFormActions;