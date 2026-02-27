import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSession } from '@/hooks/useSession';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import { useWorkOrderForm, WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { useEquipmentSelection } from '@/features/equipment/components/hooks/useEquipmentSelection';
import { useWorkOrderSubmission } from '@/features/work-orders/hooks/useWorkOrderSubmission';
import { WorkOrderFormHeader } from './WorkOrderFormHeader';
import { WorkOrderGeneralInfo } from './WorkOrderGeneralInfo';
import { WorkOrderScheduling } from './WorkOrderScheduling';
import { WorkOrderAssignment } from './WorkOrderAssignment';
import { WorkOrderEquipmentSelector } from './WorkOrderEquipmentSelector';
import { WorkOrderPMChecklist } from './WorkOrderPMChecklist';
import { WorkOrderFormActions } from './WorkOrderFormActions';
import { WorkOrderHistoricalToggle } from './WorkOrderHistoricalToggle';
import { WorkOrderHistoricalFields } from './WorkOrderHistoricalFields';


interface WorkOrderFormProps {
  open: boolean;
  onClose: () => void;
  equipmentId?: string;
  workOrder?: WorkOrder;
  onSubmit?: (data: WorkOrderFormData) => void;
  initialIsHistorical?: boolean;
  /** External loading state (e.g., from parent component's mutation) */
  isUpdating?: boolean;
  /** PM data for edit mode to default template selection */
  pmData?: { template_id?: string | null } | null;
}

const WorkOrderForm: React.FC<WorkOrderFormProps> = ({ 
  open, 
  onClose, 
  equipmentId,
  workOrder,
  onSubmit,
  initialIsHistorical = false,
  isUpdating = false,
  pmData
}) => {
  const { currentOrganization } = useOrganization();
  const { getUserTeamIds } = useSession();
  const { equipment: equipmentPerms } = useUnifiedPermissions();
  
  const [showWorkingHoursWarning, setShowWorkingHoursWarning] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<WorkOrderFormData | null>(null);
  
  // Get user's teams and filter to those they can create equipment for
  const userTeamIds = getUserTeamIds();
  const canCreateEquipment = useMemo(() => {
    return userTeamIds.some(teamId => equipmentPerms.canCreateForTeam(teamId));
  }, [userTeamIds, equipmentPerms]);
  
  const { form, isEditMode, checkForUnsavedChanges } = useWorkOrderForm({
    workOrder,
    equipmentId,
    isOpen: open,
    initialIsHistorical,
    pmData
  });

  const { allEquipment, preSelectedEquipment, isEquipmentPreSelected } = useEquipmentSelection({
    equipmentId,
    workOrder
  });

  // Get the currently selected equipment from form values to pass to PM checklist
  const selectedEquipmentForPM = React.useMemo(() => {
    const equipmentIdFromForm = form.values.equipmentId;
    if (!equipmentIdFromForm) return undefined;
    
    // Try to find in allEquipment first
    const equipmentFromList = allEquipment.find(eq => eq.id === equipmentIdFromForm);
    if (equipmentFromList) {
      return {
        id: equipmentFromList.id,
        name: equipmentFromList.name || '',
        default_pm_template_id: equipmentFromList.default_pm_template_id || null
      };
    }
    
    // Fall back to preSelectedEquipment if it matches
    if (preSelectedEquipment && preSelectedEquipment.id === equipmentIdFromForm) {
      return {
        id: preSelectedEquipment.id || '',
        name: preSelectedEquipment.name || '',
        default_pm_template_id: preSelectedEquipment.default_pm_template_id || null
      };
    }
    
    return undefined;
  }, [form.values.equipmentId, allEquipment, preSelectedEquipment]);

  const { submitForm, isLoading } = useWorkOrderSubmission({
    workOrder,
    onSubmit,
    onSuccess: () => {
      form.reset();
      onClose();
    }
  });

  const isSubmitting = isLoading || isUpdating;

  const handleSubmit = async () => {
    const formData = form.values;
    
    // Check if no working hours were updated during work order creation
    if (!isEditMode && !formData.equipmentWorkingHours) {
      setPendingSubmission(formData);
      setShowWorkingHoursWarning(true);
      return;
    }
    
    await form.handleSubmit(submitForm);
  };

  const handleConfirmSubmit = async () => {
    setShowWorkingHoursWarning(false);
    if (pendingSubmission) {
      await submitForm(pendingSubmission);
      setPendingSubmission(null);
    }
  };

  const handleCancelSubmit = () => {
    setShowWorkingHoursWarning(false);
    setPendingSubmission(null);
  };

  const handleClose = () => {
    if (checkForUnsavedChanges()) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    form.reset();
    onClose();
  };


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <WorkOrderFormHeader 
          isEditMode={isEditMode}
          preSelectedEquipment={preSelectedEquipment}
        />

        <div className="space-y-6">
          {!isEditMode && (
            <WorkOrderHistoricalToggle
              isHistorical={form.values.isHistorical || false}
              onToggle={(value) => {
                form.setValue('isHistorical', value);
                // Reset historical fields when toggling off
                if (!value) {
                  form.setValue('status', undefined);
                  form.setValue('historicalStartDate', undefined);
                  form.setValue('historicalNotes', '');
                  form.setValue('completedDate', undefined);
                } else {
                  // Set default status for historical work orders
                  form.setValue('status', 'accepted');
                }
              }}
            />
          )}

          <WorkOrderGeneralInfo
            values={{
              title: form.values.title || '',
              priority: form.values.priority || 'medium',
              description: form.values.description || ''
            }}
            errors={{
              title: form.errors.title,
              priority: form.errors.priority,
              description: form.errors.description
            }}
            setValue={form.setValue}
            preSelectedEquipment={preSelectedEquipment}
          />

          <WorkOrderEquipmentSelector
            values={form.values}
            errors={form.errors}
            setValue={form.setValue}
            preSelectedEquipment={preSelectedEquipment}
            allEquipment={allEquipment}
            isEditMode={isEditMode}
            isEquipmentPreSelected={isEquipmentPreSelected}
            canCreateEquipment={canCreateEquipment}
            canCreateEquipmentForTeam={equipmentPerms.canCreateForTeam}
            onEquipmentCreated={(newEquipmentId) => {
              // When equipment is created, the equipmentId is already set by the selector
              // This callback can be used for additional side effects if needed
              form.setValue('equipmentId', newEquipmentId);
            }}
          />

          {/* Multi-equipment selection removed: work orders now support a single equipment only */}

          {form.values.isHistorical && (
            <WorkOrderHistoricalFields
              values={form.values}
              errors={form.errors}
              setValue={form.setValue}
            />
          )}

          <WorkOrderScheduling
            values={{
              dueDate: form.values.dueDate,
              estimatedHours: form.values.estimatedHours
            }}
            errors={{
              dueDate: form.errors.dueDate,
              estimatedHours: form.errors.estimatedHours
            }}
            setValue={form.setValue}
          />

          <WorkOrderAssignment
            values={{
              assigneeId: form.values.assigneeId
            }}
            errors={{
              assigneeId: form.errors.assigneeId
            }}
            setValue={form.setValue}
            organizationId={currentOrganization?.id || ''}
            equipmentId={form.values.equipmentId || undefined}
          />

          <WorkOrderPMChecklist
            values={{
              hasPM: form.values.hasPM || false,
              pmTemplateId: form.values.pmTemplateId
            }}
            setValue={form.setValue}
            selectedEquipment={selectedEquipmentForPM}
          />

          {form.errors.general && (
            <Alert variant="destructive">
              <AlertDescription>
                {form.errors.general}
              </AlertDescription>
            </Alert>
          )}

          <WorkOrderFormActions
            onCancel={handleClose}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isValid={form.isValid}
            isEditMode={isEditMode}
          />
        </div>
      </DialogContent>

      {/* Working Hours Warning Dialog */}
      <AlertDialog open={showWorkingHoursWarning} onOpenChange={setShowWorkingHoursWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Equipment Working Hours Not Updated
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  You're about to create a work order without updating the equipment's working hours.
                </p>
                <p className="font-medium text-amber-800">
                  Are you sure you want to start work on this machine without documenting the current hours?
                </p>
                <p>
                  This information is important for maintenance scheduling and equipment lifecycle tracking.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSubmit}>
              Go Back & Update Hours
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} className="bg-amber-600 hover:bg-amber-700">
              Yes, Create Without Hours
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default WorkOrderForm;
