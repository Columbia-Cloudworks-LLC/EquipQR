import React, { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Camera, Clock, Loader2, Plus, Wrench } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type {
  QRActionEquipment,
  QRActionPermissionContext,
  QRActionType,
} from '@/features/equipment/services/equipmentQRPermissions';
import type { Role } from '@/types/permissions';
import {
  canRunQRAction,
  fetchQRActionTeamMemberships,
} from '@/features/equipment/services/equipmentQRPermissions';
import { getAuthClaims } from '@/lib/authClaims';
import { logger } from '@/utils/logger';

const QRWorkOrderDialog = lazy(() => import('@/features/equipment/components/qr/QRWorkOrderDialog'));
const QRUpdateHoursDialog = lazy(() => import('@/features/equipment/components/qr/QRWorkingHoursDialog'));
const QRNoteImageDialog = lazy(() => import('@/features/equipment/components/qr/QRNoteImageDialog'));

interface EquipmentQRQuickActionsProps {
  equipment: QRActionEquipment;
  userRole: Role;
  userDisplayName: string;
  onWorkingHoursUpdated?: (newHours: number) => void;
}

type DialogState =
  | { type: 'work-order'; attachPM: boolean }
  | { type: 'hours' }
  | { type: 'note' }
  | null;

type SuccessMessage =
  | { message: string; workOrderId?: string }
  | null;

const ACTION_DENIED_COPY: Record<QRActionType, string> = {
  'pm-work-order': 'You need work order access for this equipment team to create a PM work order from the scan page.',
  'generic-work-order': 'You need work order access for this equipment team to create a work order from the scan page.',
  'update-hours': 'Only organization admins, owners, or managers of this equipment team can update hours from the scan page.',
  'note-image': 'You need equipment note access for this equipment team to add a note or image from the scan page.',
};

export default function EquipmentQRQuickActions({
  equipment,
  userRole,
  userDisplayName,
  onWorkingHoursUpdated,
}: EquipmentQRQuickActionsProps) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [activePermissionContext, setActivePermissionContext] = useState<QRActionPermissionContext | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<SuccessMessage>(null);
  const [checkingAction, setCheckingAction] = useState<QRActionType | null>(null);

  const openAction = async (action: QRActionType, nextDialog: DialogState) => {
    setCheckingAction(action);
    setPermissionMessage(null);
    setSuccessMessage(null);

    try {
      const claims = await getAuthClaims();
      if (!claims?.sub) {
        setPermissionMessage('User not authenticated.');
        return;
      }
      const permissionContext: QRActionPermissionContext = {
        userId: claims.sub,
        organizationId: equipment.organizationId,
        userRole,
        teamMemberships: [],
      };
      const teamMemberships = await fetchQRActionTeamMemberships(
        equipment.organizationId,
        userRole,
        equipment.teamId
      );
      const nextPermissionContext = { ...permissionContext, teamMemberships };

      if (!canRunQRAction(action, nextPermissionContext, equipment.teamId)) {
        setPermissionMessage(ACTION_DENIED_COPY[action]);
        return;
      }

      if (action === 'pm-work-order' && !equipment.defaultPmTemplateId) {
        setPermissionMessage(
          'This equipment does not have a default PM template assigned. Use the generic work order action instead.'
        );
        return;
      }

      setActivePermissionContext(nextPermissionContext);
      setDialog(nextDialog);
    } catch (error) {
      logger.error('QR quick action permission check failed', error);
      const message = error instanceof Error ? error.message : 'Unable to check permissions for this action.';
      setPermissionMessage(message);
    } finally {
      setCheckingAction(null);
    }
  };

  const renderSpinner = (action: QRActionType) =>
    checkingAction === action ? <Loader2 className="h-4 w-4 animate-spin" /> : null;

  return (
    <section className="space-y-3" aria-labelledby="qr-quick-actions-heading">
      <div>
        <h2 id="qr-quick-actions-heading" className="text-base font-semibold">
          Quick Actions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These actions load only after selection and keep you on the scanned equipment record.
        </p>
      </div>

      {permissionMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{permissionMessage}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{successMessage.message}</span>
            {successMessage.workOrderId && (
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link to={`/dashboard/work-orders/${successMessage.workOrderId}`}>Open work order</Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          className="min-h-[44px] justify-start gap-2"
          onClick={() => openAction('pm-work-order', { type: 'work-order', attachPM: true })}
          disabled={checkingAction !== null}
        >
          {renderSpinner('pm-work-order') ?? <Wrench className="h-4 w-4" />}
          New PM Work Order
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] justify-start gap-2"
          onClick={() => openAction('generic-work-order', { type: 'work-order', attachPM: false })}
          disabled={checkingAction !== null}
        >
          {renderSpinner('generic-work-order') ?? <Plus className="h-4 w-4" />}
          Create Generic Work Order
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] justify-start gap-2"
          onClick={() => openAction('update-hours', { type: 'hours' })}
          disabled={checkingAction !== null}
        >
          {renderSpinner('update-hours') ?? <Clock className="h-4 w-4" />}
          Update Hours
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] justify-start gap-2"
          onClick={() => openAction('note-image', { type: 'note' })}
          disabled={checkingAction !== null}
        >
          {renderSpinner('note-image') ?? <Camera className="h-4 w-4" />}
          Add Note / Upload Image
        </Button>
      </div>

      {dialog && (
        <Suspense fallback={null}>
          {dialog.type === 'work-order' && (
            <QRWorkOrderDialog
              key={dialog.attachPM ? 'pm' : 'generic'}
              open
              equipment={equipment}
              permissionContext={activePermissionContext}
              mode={dialog.attachPM ? 'pm' : 'generic'}
              onOpenChange={(open) => {
                if (!open) {
                  setDialog(null);
                  setActivePermissionContext(null);
                }
              }}
              onCreated={(workOrder) => {
                setDialog(null);
                setActivePermissionContext(null);
                setSuccessMessage({
                  message: `Work order "${workOrder.title}" was created.`,
                  workOrderId: workOrder.id,
                });
              }}
            />
          )}
          {dialog.type === 'hours' && (
            <QRUpdateHoursDialog
              open
              equipment={equipment}
              permissionContext={activePermissionContext}
              onOpenChange={(open) => {
                if (!open) {
                  setDialog(null);
                  setActivePermissionContext(null);
                }
              }}
              onSuccess={(newHours) => {
                setDialog(null);
                setActivePermissionContext(null);
                setSuccessMessage({
                  message: `Working hours updated to ${newHours} hours.`,
                });
                onWorkingHoursUpdated?.(newHours);
              }}
            />
          )}
          {dialog.type === 'note' && (
            <QRNoteImageDialog
              open
              onClose={() => {
                setDialog(null);
                setActivePermissionContext(null);
              }}
              equipmentId={equipment.id}
              equipmentName={equipment.name}
              organizationId={equipment.organizationId}
              equipmentTeamId={equipment.teamId}
              permissionContext={activePermissionContext}
              userDisplayName={userDisplayName}
              onSuccess={(message) => {
                setDialog(null);
                setActivePermissionContext(null);
                setSuccessMessage({ message });
              }}
            />
          )}
        </Suspense>
      )}
    </section>
  );
}
