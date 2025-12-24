import React from 'react';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface WorkOrderFormHeaderProps {
  isEditMode: boolean;
  preSelectedEquipment?: {
    id?: string;
    name?: string;
  } | null;
}

export const WorkOrderFormHeader: React.FC<WorkOrderFormHeaderProps> = ({
  isEditMode,
  preSelectedEquipment
}) => {
  return (
    <DialogHeader>
      <DialogTitle>{isEditMode ? 'Edit Work Order' : 'Create Work Order'}</DialogTitle>
      <DialogDescription>
        {isEditMode ? 
          `Update the work order details` :
          (preSelectedEquipment ? 
            `Create a new work order for ${preSelectedEquipment.name}` :
            'Create a new work order for your equipment'
          )
        }
      </DialogDescription>
    </DialogHeader>
  );
};

