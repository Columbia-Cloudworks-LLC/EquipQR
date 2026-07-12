import { lazy, Suspense } from 'react';
import type { EquipmentQRVariant } from '@/features/equipment/components/QRCodeDisplay';

const WorkOrderForm = lazy(() => import('@/features/work-orders/components/WorkOrderForm'));
const QRCodeDisplay = lazy(() => import('@/features/equipment/components/QRCodeDisplay'));
const DeleteEquipmentDialog = lazy(() =>
  import('@/features/equipment/components/DeleteEquipmentDialog').then(m => ({
    default: m.DeleteEquipmentDialog,
  })),
);
const WorkingHoursTimelineModal = lazy(() =>
  import('@/features/equipment/components/WorkingHoursTimelineModal').then(m => ({
    default: m.WorkingHoursTimelineModal,
  })),
);

type EquipmentDetailsModalsProps = {
  equipmentId: string | undefined;
  equipmentName: string;
  organizationId: string;
  isAdmin: boolean;
  isWorkOrderFormOpen: boolean;
  isQRCodeOpen: boolean;
  qrInitialVariant?: EquipmentQRVariant;
  isDeleteDialogOpen: boolean;
  isWorkingHoursModalOpen: boolean;
  onCloseWorkOrderForm: () => void;
  onCloseQRCode: () => void;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onDeleteSuccess: () => void;
  onCloseWorkingHours: () => void;
};

export function EquipmentDetailsModals({
  equipmentId,
  equipmentName,
  organizationId,
  isAdmin,
  isWorkOrderFormOpen,
  isQRCodeOpen,
  qrInitialVariant = 'equipment',
  isDeleteDialogOpen,
  isWorkingHoursModalOpen,
  onCloseWorkOrderForm,
  onCloseQRCode,
  onDeleteDialogOpenChange,
  onDeleteSuccess,
  onCloseWorkingHours,
}: EquipmentDetailsModalsProps) {
  return (
    <>
      {isWorkOrderFormOpen && (
        <Suspense fallback={null}>
          <WorkOrderForm
            open={isWorkOrderFormOpen}
            onClose={onCloseWorkOrderForm}
            equipmentId={equipmentId}
          />
        </Suspense>
      )}

      {isQRCodeOpen && equipmentId && (
        <Suspense fallback={null}>
          <QRCodeDisplay
            open={isQRCodeOpen}
            onClose={onCloseQRCode}
            equipmentId={equipmentId}
            equipmentName={equipmentName}
            organizationId={organizationId}
            initialVariant={qrInitialVariant}
          />
        </Suspense>
      )}

      {isAdmin && isDeleteDialogOpen && equipmentId && (
        <Suspense fallback={null}>
          <DeleteEquipmentDialog
            open={isDeleteDialogOpen}
            onOpenChange={onDeleteDialogOpenChange}
            equipmentId={equipmentId}
            equipmentName={equipmentName}
            orgId={organizationId}
            onSuccess={onDeleteSuccess}
          />
        </Suspense>
      )}

      {isWorkingHoursModalOpen && equipmentId && (
        <Suspense fallback={null}>
          <WorkingHoursTimelineModal
            open={isWorkingHoursModalOpen}
            onClose={onCloseWorkingHours}
            equipmentId={equipmentId}
            equipmentName={equipmentName}
          />
        </Suspense>
      )}
    </>
  );
}
