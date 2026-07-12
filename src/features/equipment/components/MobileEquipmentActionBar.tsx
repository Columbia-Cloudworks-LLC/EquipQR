import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';
import { useEquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';
import { EquipmentCardWorkOrderMenu } from '@/features/equipment/components/EquipmentCardWorkOrderMenu';

interface MobileEquipmentActionBarProps {
  equipmentId: string;
  onCreateWorkOrder: () => void;
  onAddNote: () => void;
}

const MobileEquipmentActionBar: React.FC<MobileEquipmentActionBarProps> = ({
  equipmentId,
  onCreateWorkOrder,
  onAddNote,
}) => {
  const { data: pmStatus } = useEquipmentPMStatus(equipmentId);

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b py-2 -mx-3 px-3">
      <div className="flex gap-1.5 xs:gap-2">
        <EquipmentCardWorkOrderMenu
          equipmentId={equipmentId}
          pmStatus={pmStatus}
          variant="mobile-bar"
          onCreateWorkOrder={onCreateWorkOrder}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onAddNote}
          className="shrink-0 min-h-[44px] gap-1.5 px-3"
        >
          <MessageSquarePlus className="h-4 w-4 shrink-0" aria-hidden="true" />
          Note
        </Button>
      </div>
    </div>
  );
};

export default MobileEquipmentActionBar;
