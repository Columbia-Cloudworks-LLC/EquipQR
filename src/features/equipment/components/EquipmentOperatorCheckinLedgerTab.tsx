import { EquipmentOperatorCheckinConfig } from '@/features/operator-check-ins/components/EquipmentOperatorCheckinConfig';
import { OperatorCheckinLedgerPanel } from '@/features/operator-check-ins/components/OperatorCheckinLedgerPanel';

interface EquipmentOperatorCheckinLedgerTabProps {
  organizationId: string;
  equipmentId: string;
  equipmentName: string;
  isAdmin?: boolean;
  onOpenQrCodeForAssignment?: (assignmentId: string) => void;
}

function EquipmentOperatorCheckinLedgerTab({
  organizationId,
  equipmentId,
  equipmentName,
  isAdmin = false,
  onOpenQrCodeForAssignment,
}: EquipmentOperatorCheckinLedgerTabProps) {
  return (
    <div className="space-y-6">
      {isAdmin && onOpenQrCodeForAssignment ? (
        <EquipmentOperatorCheckinConfig
          organizationId={organizationId}
          equipmentId={equipmentId}
          equipmentName={equipmentName}
          onOpenQrCodeForAssignment={onOpenQrCodeForAssignment}
        />
      ) : null}

      <OperatorCheckinLedgerPanel
        organizationId={organizationId}
        equipmentId={equipmentId}
        equipmentName={equipmentName}
        allowDeletedVisibilityToggle={isAdmin}
      />
    </div>
  );
}

export default EquipmentOperatorCheckinLedgerTab;
