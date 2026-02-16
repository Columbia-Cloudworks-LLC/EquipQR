import React from 'react';
import { useSmartAutoSave } from '@/hooks/useSmartAutoSave';
import { AutoSaveIndicator } from '@/components/common/AutoSaveIndicator';

interface WorkOrderData {
  notes: string;
  costs: unknown[];
  images: unknown[];
}

interface WorkOrderAutoSaveProps {
  workOrderId: string;
  data: WorkOrderData;
  onSave: (data: WorkOrderData) => Promise<void>;
  enabled?: boolean;
  className?: string;
}

export const WorkOrderAutoSave: React.FC<WorkOrderAutoSaveProps> = ({
  workOrderId,
  data,
  onSave,
  enabled = true,
  className
}) => {
  const {
    status,
    lastSaved,
    hasChanges
  } = useSmartAutoSave({
    data,
    onSave,
    storageKey: `work-order-${workOrderId}`,
    enabled
  });

  return (
    <AutoSaveIndicator
      status={status}
      lastSaved={lastSaved}
      hasChanges={hasChanges}
      className={className}
    />
  );
};

