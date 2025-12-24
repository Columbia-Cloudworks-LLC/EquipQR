
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import CustomAttributesSection from './CustomAttributesSection';
import { useCustomAttributes, type CustomAttribute } from '@/hooks/useCustomAttributes';
import { useEquipmentForm } from './hooks/useEquipmentForm';
import { type EquipmentRecord } from '@/features/equipment/types/equipment';
import EquipmentBasicInfoSection from './form/EquipmentBasicInfoSection';
import EquipmentStatusLocationSection from './form/EquipmentStatusLocationSection';
import EquipmentNotesSection from './form/EquipmentNotesSection';
import EquipmentFormActions from './form/EquipmentFormActions';
import TeamSelectionSection from './form/TeamSelectionSection';

interface EquipmentFormProps {
  open: boolean;
  onClose: () => void;
  equipment?: EquipmentRecord;
}

const EquipmentForm: React.FC<EquipmentFormProps> = ({ open, onClose, equipment }) => {
  const { attributes } = useCustomAttributes();
  const { form, onSubmit, isEdit, isPending } = useEquipmentForm(equipment, onClose);

  const handleCustomAttributeChange = (attributes: CustomAttribute[]) => {
    const attributesObject = attributes.reduce((acc, attr) => {
      acc[attr.key] = attr.value;
      return acc;
    }, {} as Record<string, string>);
    
    form.setValue('custom_attributes', attributesObject);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Equipment' : 'Create New Equipment'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update equipment information' : 'Enter the details for the new equipment'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EquipmentBasicInfoSection form={form} />
              <EquipmentStatusLocationSection form={form} />
            </div>

            <TeamSelectionSection form={form} />

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
  );
};

export default EquipmentForm;
