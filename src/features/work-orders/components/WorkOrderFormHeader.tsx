import React from 'react';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { OfflineFormBanner } from '@/features/offline-queue/components/OfflineFormBanner';

interface WorkOrderFormHeaderProps {
  isEditMode: boolean;
  /** Log Completed: entering finished work from a paper sheet. */
  isLogMode?: boolean;
  preSelectedEquipment?: {
    id?: string;
    name?: string;
  } | null;
}

export const WorkOrderFormHeader: React.FC<WorkOrderFormHeaderProps> = ({
  isEditMode,
  isLogMode = false,
  preSelectedEquipment
}) => {
  return (
    <DialogHeader>
      <DialogTitle>
        {isEditMode ? 'Edit Work Order' : isLogMode ? 'Log Completed Work Order' : 'Create Work Order'}
      </DialogTitle>
      <DialogDescription>
        {isEditMode ?
          `Update the work order details` :
          isLogMode ?
            'Record work that is already done, dated when it happened' :
          (preSelectedEquipment ?
            `Create a new work order for ${preSelectedEquipment.name}` :
            'Create a new work order for your equipment'
          )
        }
      </DialogDescription>
      <OfflineFormBanner />
    </DialogHeader>
  );
};

