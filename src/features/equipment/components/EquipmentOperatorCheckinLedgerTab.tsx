import { OperatorCheckinLedgerPanel } from '@/features/operator-check-ins/components/OperatorCheckinLedgerPanel';

interface EquipmentOperatorCheckinLedgerTabProps {
  organizationId: string;
  equipmentId: string;
  equipmentName: string;
}

function EquipmentOperatorCheckinLedgerTab({
  organizationId,
  equipmentId,
  equipmentName,
}: EquipmentOperatorCheckinLedgerTabProps) {
  return (
    <OperatorCheckinLedgerPanel
      organizationId={organizationId}
      equipmentId={equipmentId}
      equipmentName={equipmentName}
    />
  );
}

export default EquipmentOperatorCheckinLedgerTab;
