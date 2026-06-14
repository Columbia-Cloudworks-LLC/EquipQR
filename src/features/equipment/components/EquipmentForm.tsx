
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
import { usePermissions } from '@/hooks/usePermissions';

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

  const [showUnassignedConfirm, setShowUnassignedConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<EquipmentFormData | null>(null);
  const [pendingUnassignedSelect, setPendingUnassignedSelect] = useState(false);

  const handleCustomAttributeChange = (attributes: CustomAttribute[]) => {
    const attributesObject = attributes.reduce((acc, attr) => {
      acc[attr.key] = attr.value;
      return acc;
    }, {} as Record<string, string>);
    
    form.setValue('custom_attributes', attributesObject);
  };

  const isUnassignedTeam = (teamId?: string) => !teamId || teamId === 'unassigned';

  const handleValidatedSubmit = (data: EquipmentFormData) => {
    if (!isEdit && isAdmin && isUnassignedTeam(data.team_id)) {
      setPendingSubmitData(data);
      setShowUnassignedConfirm(true);
      return;
    }
    onSubmit(data);
  };

  const handleConfirmUnassigned = () => {
    if (pendingSubmitData) {
      onSubmit(pendingSubmitData);
      setPendingSubmitData(null);
    }
    if (pendingUnassignedSelect) {
      form.setValue('team_id', '');
      setPendingUnassignedSelect(false);
    }
    setShowUnassignedConfirm(false);
  };

  const handleRequestUnassignedConfirm = () => {
    setPendingSubmitData(null);
    setPendingUnassignedSelect(true);
    setShowUnassignedConfirm(true);
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
                <EquipmentBasicInfoSection form={form} />
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

      <AlertDialog open={showUnassignedConfirm} onOpenChange={setShowUnassignedConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Continue without a team?</AlertDialogTitle>
            <AlertDialogDescription>
              Equipment without a team cannot be invoiced to a customer when work orders are
              completed. You can assign a team later from the equipment details page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingSubmitData(null);
                setPendingUnassignedSelect(false);
              }}
            >
              Go back
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnassigned}>
              Continue without a team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EquipmentForm;
