import React from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useOrganization } from '@/contexts/OrganizationContext';
import { useWorkOrderAssignment } from '@/hooks/useWorkOrderAssignment';
import { EnhancedWorkOrder } from '@/services/workOrderDataService';
import { useWorkOrderForm, WorkOrderFormData } from '@/hooks/useWorkOrderForm';
import { useEquipmentSelection } from '@/hooks/useEquipmentSelection';
import { useWorkOrderSubmission } from '@/hooks/useWorkOrderSubmission';
import { WorkOrderFormHeader } from './form/WorkOrderFormHeader';
import { WorkOrderBasicFields } from './form/WorkOrderBasicFields';
import { WorkOrderEquipmentSelector } from './form/WorkOrderEquipmentSelector';
import { WorkOrderMultiEquipmentSelector } from './form/WorkOrderMultiEquipmentSelector';
import { WorkOrderPMSection } from './form/WorkOrderPMSection';
import { WorkOrderDescriptionField } from './form/WorkOrderDescriptionField';
import { WorkOrderFormActions } from './form/WorkOrderFormActions';
import { WorkOrderHistoricalToggle } from './form/WorkOrderHistoricalToggle';
import { WorkOrderHistoricalFields } from './form/WorkOrderHistoricalFields';


interface WorkOrderFormEnhancedProps {
  open: boolean;
  onClose: () => void;
  equipmentId?: string;
  workOrder?: EnhancedWorkOrder; // Add workOrder prop for edit mode
  onSubmit?: (data: WorkOrderFormData) => void;
  initialIsHistorical?: boolean;
}

const WorkOrderFormEnhanced: React.FC<WorkOrderFormEnhancedProps> = ({ 
  open, 
  onClose, 
  equipmentId,
  workOrder,
  onSubmit,
  initialIsHistorical = false
}) => {
  const { currentOrganization } = useOrganization();
  
  const { form, isEditMode, checkForUnsavedChanges } = useWorkOrderForm({
    workOrder,
    equipmentId,
    isOpen: open,
    initialIsHistorical
  });

  const { allEquipment, preSelectedEquipment, isEquipmentPreSelected } = useEquipmentSelection({
    equipmentId,
    workOrder
  });

  const { submitForm, isLoading } = useWorkOrderSubmission({
    workOrder,
    onSubmit,
    onSuccess: () => {
      form.reset();
      // Always close modal for edit mode or custom onSubmit
      // For create mode, the hook handles navigation and modal will close when component unmounts
      if (isEditMode || onSubmit) {
        onClose();
      }
    }
  });

  // Get assignment data for auto-assignment suggestions
  const assignmentData = useWorkOrderAssignment(
    currentOrganization?.id || '', 
    form.values.equipmentId as string || equipmentId || workOrder?.equipment_id
  );

  const handleSubmit = async () => {
    await form.handleSubmit(submitForm);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

          <WorkOrderBasicFields
            values={form.values}
            errors={form.errors}
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
          />

          {/* Multi-Equipment Selector - Show only when primary equipment is selected */}
          {form.values.equipmentId && (() => {
            // Get team_id from selected equipment
            const selectedEquipment = allEquipment.find(eq => eq.id === form.values.equipmentId);
            const teamId = selectedEquipment?.team_id || preSelectedEquipment?.team_id;
            
            return teamId ? (
              <WorkOrderMultiEquipmentSelector
                primaryEquipmentId={form.values.equipmentId}
                primaryEquipmentTeamId={teamId}
                workOrderId={workOrder?.id}
                selectedEquipmentIds={form.values.equipmentIds || []}
                onSelectionChange={(equipmentIds) => {
                  form.setValue('equipmentIds', equipmentIds);
                  // Update primary equipment ID if not set
                  if (!form.values.primaryEquipmentId) {
                    form.setValue('primaryEquipmentId', form.values.equipmentId);
                  }
                }}
              />
            ) : null;
          })()}

          {form.values.isHistorical && (
            <WorkOrderHistoricalFields
              values={form.values}
              errors={form.errors}
              setValue={form.setValue}
            />
          )}

          <WorkOrderPMSection
            values={form.values}
            setValue={form.setValue}
          />

          <WorkOrderDescriptionField
            values={form.values}
            errors={form.errors}
            setValue={form.setValue}
            preSelectedEquipment={preSelectedEquipment}
          />

          {!isEditMode && assignmentData.hasEquipmentTeam && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This work order will be automatically assigned to an appropriate admin based on the selected equipment.
              </AlertDescription>
            </Alert>
          )}

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
            isLoading={isLoading}
            isValid={form.isValid}
            isEditMode={isEditMode}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkOrderFormEnhanced;
