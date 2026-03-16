import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Clock, MessageSquarePlus, Wrench } from 'lucide-react';
import { useEquipmentPMStatus, getPMComplianceLevel } from '@/features/equipment/hooks/useEquipmentPMStatus';

interface MobileEquipmentActionBarProps {
  equipmentId: string;
  onCreateWorkOrder: () => void;
  onLogHours: () => void;
  onAddNote: () => void;
}

const MobileEquipmentActionBar: React.FC<MobileEquipmentActionBarProps> = ({
  equipmentId,
  onCreateWorkOrder,
  onLogHours,
  onAddNote,
}) => {
  const { data: pmStatus } = useEquipmentPMStatus(equipmentId);
  const compliance = getPMComplianceLevel(pmStatus);
  const showPMAction = compliance === 'overdue' || compliance === 'due_soon';

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b py-2 -mx-3 px-3">
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onCreateWorkOrder}
          className="flex-1 min-h-[44px] gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Work Order
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onLogHours}
          className="flex-1 min-h-[44px] gap-1.5"
        >
          <Clock className="h-4 w-4" />
          Log Hours
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddNote}
          className="flex-1 min-h-[44px] gap-1.5"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Note
        </Button>
        {showPMAction && (
          <Button
            variant={compliance === 'overdue' ? 'destructive' : 'outline'}
            size="sm"
            onClick={onCreateWorkOrder}
            className="min-h-[44px] gap-1.5 px-3"
          >
            <Wrench className="h-4 w-4" />
            PM
          </Button>
        )}
      </div>
    </div>
  );
};

export default MobileEquipmentActionBar;
