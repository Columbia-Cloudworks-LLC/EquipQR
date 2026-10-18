import { useMemo } from 'react';
import { ClipboardSignature, CopyPlus, MessageSquarePlus, Plus, QrCode } from 'lucide-react';
import {
  QuickAccessDrawer,
  type QuickAccessSection,
} from '@/components/common/QuickAccessDrawer';
import { useEquipmentOperatorCheckinAssignments } from '@/features/operator-check-ins/hooks/useOperatorCheckinSettings';
import type { EquipmentQRVariant } from '@/features/equipment/components/QRCodeDisplay';

interface EquipmentQuickAccessDrawerProps {
  equipmentId: string;
  equipmentName: string;
  organizationId: string;
  onShowQrCode: (variant?: EquipmentQRVariant) => void;
  onCreateWorkOrder: () => void;
  onAddNote: () => void;
  /** Omitted when the user cannot create equipment (issue #1643). */
  onAddAnotherLikeThis?: () => void;
}

/**
 * Contextual quick access button for equipment details (issue #1151).
 * QR actions lead: the equipment scan QR plus a shortcut per enabled daily
 * check-in assignment, followed by work order creation and note capture.
 */
export function EquipmentQuickAccessDrawer({
  equipmentId,
  equipmentName,
  organizationId,
  onShowQrCode,
  onCreateWorkOrder,
  onAddNote,
  onAddAnotherLikeThis,
}: EquipmentQuickAccessDrawerProps) {
  const { data: checkinAssignments = [] } = useEquipmentOperatorCheckinAssignments(
    equipmentId,
    organizationId,
  );

  const sections = useMemo<QuickAccessSection[]>(() => {
    const enabledAssignments = checkinAssignments.filter((assignment) => assignment.enabled);

    return [
      {
        id: 'qr-codes',
        title: 'QR codes',
        actions: [
          {
            id: 'equipment-qr',
            label: 'Equipment QR code',
            sublabel: 'Scan to open this equipment record',
            icon: QrCode,
            onSelect: () => onShowQrCode('equipment'),
          },
          ...enabledAssignments.map((assignment) => ({
            id: `checkin-qr-${assignment.id}`,
            label: `Daily check-in: ${assignment.template?.name ?? 'Checklist'}`,
            sublabel: 'Operator check-in QR code',
            icon: ClipboardSignature,
            onSelect: () => onShowQrCode(`assignment:${assignment.id}`),
          })),
        ],
      },
      {
        id: 'work-orders',
        title: 'Work orders',
        actions: [
          {
            id: 'new-work-order',
            label: 'New work order',
            icon: Plus,
            onSelect: onCreateWorkOrder,
          },
        ],
      },
      {
        id: 'notes',
        title: 'Notes',
        actions: [
          {
            id: 'add-note',
            label: 'Add note',
            icon: MessageSquarePlus,
            onSelect: onAddNote,
          },
        ],
      },
      ...(onAddAnotherLikeThis
        ? [
            {
              id: 'equipment',
              title: 'Equipment',
              actions: [
                {
                  id: 'add-another-like-this',
                  label: 'Add another like this',
                  sublabel: 'New unit with the same make, model, and team',
                  icon: CopyPlus,
                  onSelect: onAddAnotherLikeThis,
                },
              ],
            },
          ]
        : []),
    ];
  }, [checkinAssignments, onShowQrCode, onCreateWorkOrder, onAddNote, onAddAnotherLikeThis]);

  return (
    <QuickAccessDrawer
      fabIcon={QrCode}
      fabAriaLabel={`Quick actions for ${equipmentName}`}
      title={equipmentName}
      description="Quick actions for this equipment"
      sections={sections}
    />
  );
}
