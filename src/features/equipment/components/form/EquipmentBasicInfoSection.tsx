import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from 'react-hook-form';
import { type EquipmentFormData } from '@/features/equipment/types/equipment';

interface EquipmentBasicInfoSectionProps {
  form: UseFormReturn<EquipmentFormData>;
}

const EquipmentBasicInfoSection: React.FC<EquipmentBasicInfoSectionProps> = ({ form }) => {
  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Basic Information
        </h3>
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Equipment Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Forklift FL-001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="manufacturer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Manufacturer *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Toyota" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 8FBU25" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="serial_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Serial Number *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 12345678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default EquipmentBasicInfoSection;