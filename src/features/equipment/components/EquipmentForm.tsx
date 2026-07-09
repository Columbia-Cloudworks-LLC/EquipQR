import React, { useCallback, useRef, useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { DuplicateEquipmentMatch } from '@/features/equipment/services/EquipmentService';
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
import {
  EquipmentFormMediaSection,
  type EquipmentFormPendingMedia,
} from './form/EquipmentFormMediaSection';
import { DuplicateSerialWarning } from './DuplicateSerialWarning';
import { usePermissions } from '@/hooks/usePermissions';
import { useDuplicateSerialCheck, resolveDuplicateSerialAtSubmit } from '@/features/equipment/hooks/useDuplicateSerialCheck';

interface EquipmentFormProps {
  open: boolean;
  onClose: () => void;
  equipment?: EquipmentRecord;
}

const EquipmentForm: React.FC<EquipmentFormProps> = ({ open, onClose, equipment }) => {
  const { attributes } = useCustomAttributes();
  const pendingMediaRef = useRef<EquipmentFormPendingMedia>({ files: [], displayIndex: 0 });
  const { form, onSubmit, isEdit, isPending } = useEquipmentForm(equipment, onClose, pendingMediaRef);
  const { hasRole } = usePermissions();
  const isAdmin = hasRole(['owner', 'admin']);

  const { currentOrganization } = useOrganization();
  const serialNumber = form.watch('serial_number');
  const duplicateCheck = useDuplicateSerialCheck(serialNumber, {
    excludeEquipmentId: equipment?.id,
    enabled: open && !isEdit,
  });
  const { match: duplicateMatch } = duplicateCheck;

  const [showUnassignedConfirm, setShowUnassignedConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<EquipmentFormData | null>(null);
  const [pendingUnassignedSelect, setPendingUnassignedSelect] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [pendingDuplicateData, setPendingDuplicateData] = useState<EquipmentFormData | null>(null);
  const [confirmDuplicateMatch, setConfirmDuplicateMatch] = useState<DuplicateEquipmentMatch | null>(null);

  const handlePendingMediaChange = useCallback((media: EquipmentFormPendingMedia) => {
    pendingMediaRef.current = media;
  }, []);

  const handleCustomAttributeChange = (nextAttributes: CustomAttribute[]) => {
    const attributesObject = nextAttributes.reduce((acc, attr) => {
      acc[attr.key] = attr.value;
      return acc;
    }, {} as Record<string, string>);

    form.setValue('custom_attributes', attributesObject);
  };

  const isUnassignedTeam = (teamId?: string) => !teamId || teamId === 'unassigned';

  const finalizeSubmit = (data: EquipmentFormData) => {
    if (!isEdit && isAdmin && isUnassignedTeam(data.team_id)) {
      setPendingUnassignedSelect(false);
      setPendingSubmitData(data);
      setShowUnassignedConfirm(true);
      return;
    }
    onSubmit(data);
  };

  const handleValidatedSubmit = async (data: EquipmentFormData) => {
    if (!isEdit) {
      const matchForSubmit = await resolveDuplicateSerialAtSubmit(
        currentOrganization?.id,
        data.serial_number,
        equipment?.id,
        duplicateCheck,
      );
      if (matchForSubmit) {
        setConfirmDuplicateMatch(matchForSubmit);
        setPendingDuplicateData(data);
        setShowDuplicateConfirm(true);
        return;
      }
    }
    finalizeSubmit(data);
  };

  const handleConfirmDuplicate = () => {
    const data = pendingDuplicateData;
    setShowDuplicateConfirm(false);
    setPendingDuplicateData(null);
    setConfirmDuplicateMatch(null);
    if (data) finalizeSubmit(data);
  };

  const handleDuplicateConfirmOpenChange = (next: boolean) => {
    setShowDuplicateConfirm(next);
    if (!next) {
      setPendingDuplicateData(null);
      setConfirmDuplicateMatch(null);
    }
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

  const handleUnassignedConfirmOpenChange = (nextOpen: boolean) => {
    setShowUnassignedConfirm(nextOpen);
    if (!nextOpen) {
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

              {!isEdit && (
                <EquipmentFormMediaSection
                  form={form}
                  onPendingMediaChange={handlePendingMediaChange}
                  disabled={isPending}
                />
              )}

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
          {confirmDuplicateMatch && (
            <DuplicateSerialWarning match={confirmDuplicateMatch} onNavigate={onClose} />
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
