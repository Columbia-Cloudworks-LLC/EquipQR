import React from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from 'react-hook-form';
import { type EquipmentFormData } from '@/features/equipment/types/equipment';

interface EquipmentNotesSectionProps {
  form: UseFormReturn<EquipmentFormData>;
}

const EquipmentNotesSection: React.FC<EquipmentNotesSectionProps> = ({ form }) => {
  return (
    <FormField
      control={form.control}
      name="notes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Description/Notes</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Additional information about the equipment..."
              className="min-h-[100px]"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default EquipmentNotesSection;