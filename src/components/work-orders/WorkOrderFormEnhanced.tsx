import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Info, Clock } from "lucide-react";
import { useOrganization } from '@/contexts/OrganizationContext';
import { useWorkOrderAssignment } from '@/hooks/useWorkOrderAssignment';
import { EnhancedWorkOrder } from '@/services/workOrderDataService';
import { useWorkOrderForm, WorkOrderFormData } from '@/hooks/useWorkOrderForm';
import { useEquipmentSelection } from '@/hooks/useEquipmentSelection';
import { useWorkOrderSubmission } from '@/hooks/useWorkOrderSubmission';
import { WorkOrderFormHeader } from './form/WorkOrderFormHeader';
import { WorkOrderBasicFields } from './form/WorkOrderBasicFields';
import { WorkOrderEquipmentSelector } from './form/WorkOrderEquipmentSelector';
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
  const [showWorkingHoursWarning, setShowWorkingHoursWarning] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<WorkOrderFormData | null>(null);
  
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

          {/* Multi-equipment selection removed: work orders now support a single equipment only */}

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

      {/* Working Hours Warning Dialog */}
      <AlertDialog open={showWorkingHoursWarning} onOpenChange={setShowWorkingHoursWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Equipment Working Hours Not Updated
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You're about to create a work order without updating the equipment's working hours.
              </p>
              <p className="font-medium text-amber-800">
                Are you sure you want to start work on this machine without documenting the current hours?
              </p>
              <p className="text-sm text-muted-foreground">
                This information is important for maintenance scheduling and equipment lifecycle tracking.
              </p>
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

export default WorkOrderFormEnhanced;
