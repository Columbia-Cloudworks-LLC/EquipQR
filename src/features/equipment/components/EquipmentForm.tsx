
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form } from "@/components/ui/form";
import { OfflineFormBanner } from '@/features/offline-queue/components/OfflineFormBanner';
import CustomAttributesSection from './CustomAttributesSection';
import { useCustomAttributes, type CustomAttribute } from '@/hooks/useCustomAttributes';
import { useEquipmentForm } from '@/features/equipment/hooks/useEquipmentForm';
import { type EquipmentRecord, type EquipmentFormData } from '@/features/equipment/types/equipment';
import EquipmentBasicInfoSection from './form/EquipmentBasicInfoSection';
import EquipmentStatusLocationSection from './form/EquipmentStatusLocationSection';
import EquipmentNotesSection from './form/EquipmentNotesSection';
import EquipmentFormActions from './form/EquipmentFormActions';
import TeamSelectionSection from './form/TeamSelectionSection';
import { DuplicateSerialWarning } from './DuplicateSerialWarning';
import { usePermissions } from '@/hooks/usePermissions';
import { useDuplicateSerialCheck } from '@/features/equipment/hooks/useDuplicateSerialCheck';

interface EquipmentFormProps {
  open: boolean;
  onClose: () => void;
  equipment?: EquipmentRecord;
}

const EquipmentForm: React.FC<EquipmentFormProps> = ({ open, onClose, equipment }) => {
  const { attributes } = useCustomAttributes();
  const { form, onSubmit, isEdit, isPending } = useEquipmentForm(equipment, onClose);
  const { hasRole } = usePermissions();
  const isAdmin = hasRole(['owner', 'admin']);

  const serialNumber = form.watch('serial_number');
  const { match: duplicateMatch } = useDuplicateSerialCheck(serialNumber, {
    excludeEquipmentId: equipment?.id,
  });

  const [showUnassignedConfirm, setShowUnassignedConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<EquipmentFormData | null>(null);
  const [pendingUnassignedSelect, setPendingUnassignedSelect] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [pendingDuplicateData, setPendingDuplicateData] = useState<EquipmentFormData | null>(null);

  const handleCustomAttributeChange = (attributes: CustomAttribute[]) => {
    const attributesObject = attributes.reduce((acc, attr) => {
      acc[attr.key] = attr.value;
      return acc;
    }, {} as Record<string, string>);
    
    form.setValue('custom_attributes', attributesObject);
  };

  const isUnassignedTeam = (teamId?: string) => !teamId || teamId === 'unassigned';

  // Run the unassigned-team confirmation gate, then submit. Called either
  // directly or after the operator acknowledges a possible-duplicate serial.
  const finalizeSubmit = (data: EquipmentFormData) => {
    if (!isEdit && isAdmin && isUnassignedTeam(data.team_id)) {
      setPendingUnassignedSelect(false);
      setPendingSubmitData(data);
      setShowUnassignedConfirm(true);
      return;
    }
    onSubmit(data);
  };

  const handleValidatedSubmit = (data: EquipmentFormData) => {
    // Duplicate serials are a warning, never a block. On create, if an existing
    // record shares the serial, ask the operator to confirm before continuing.
    if (!isEdit && duplicateMatch) {
      setPendingDuplicateData(data);
      setShowDuplicateConfirm(true);
      return;
    }
    finalizeSubmit(data);
  };

  const handleConfirmDuplicate = () => {
    const data = pendingDuplicateData;
    setShowDuplicateConfirm(false);
    setPendingDuplicateData(null);
    if (data) finalizeSubmit(data);
  };

  const handleDuplicateConfirmOpenChange = (next: boolean) => {
    setShowDuplicateConfirm(next);
    if (!next) setPendingDuplicateData(null);
  };

  const handleConfirmUnassigned = () => {
    if (pendingSubmitData) {
      onSubmit(pendingSubmitData);
    } else if (pendingUnassignedSelect) {
      form.setValue('team_id', '');
    }
    setPendingSubmitData(null);
    setPendingUnassignedSelect(false);
    setShowUnassignedConfirm(false);
  };

  const handleRequestUnassignedConfirm = () => {
    setPendingSubmitData(null);
    setPendingUnassignedSelect(true);
    setShowUnassignedConfirm(true);
  };

  const handleUnassignedConfirmOpenChange = (open: boolean) => {
    setShowUnassignedConfirm(open);
    if (!open) {
      setPendingSubmitData(null);
      setPendingUnassignedSelect(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Equipment' : 'Create New Equipment'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Update equipment information' : 'Enter the details for the new equipment'}
            </DialogDescription>
            <OfflineFormBanner />
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleValidatedSubmit)} className="space-y-6">
              <TeamSelectionSection
                form={form}
                onRequestUnassignedConfirm={isAdmin ? handleRequestUnassignedConfirm : undefined}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EquipmentBasicInfoSection
                  form={form}
                  duplicateMatch={isEdit ? null : duplicateMatch}
                  onDuplicateNavigate={onClose}
                />
                <EquipmentStatusLocationSection form={form} />
              </div>

              <EquipmentNotesSection form={form} />

              <CustomAttributesSection
                initialAttributes={attributes}
                onChange={handleCustomAttributeChange}
              />

              <EquipmentFormActions
                isEdit={isEdit}
                isPending={isPending}
                onClose={onClose}
              />
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnassignedConfirm} onOpenChange={handleUnassignedConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Continue without a team?</AlertDialogTitle>
            <AlertDialogDescription>
              Equipment without a team cannot be invoiced to a customer when work orders are
              completed. You can assign a team later from the equipment details page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnassigned}>
              Continue without a team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDuplicateConfirm} onOpenChange={handleDuplicateConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This serial number already exists</AlertDialogTitle>
            <AlertDialogDescription>
              Another equipment record in this organization already uses this serial number.
              Review it below to make sure you are not creating a duplicate. You can continue if
              this is a separate piece of equipment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {duplicateMatch && (
            <DuplicateSerialWarning match={duplicateMatch} onNavigate={onClose} />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDuplicate}>
              Create anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EquipmentForm;
