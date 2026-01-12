import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from 'react-hook-form';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentManufacturersAndModels } from '@/features/equipment/hooks/useEquipment';
import { type EquipmentFormData, generateEquipmentName } from '@/features/equipment/types/equipment';

interface EquipmentBasicInfoSectionProps {
  form: UseFormReturn<EquipmentFormData>;
}

const EquipmentBasicInfoSection: React.FC<EquipmentBasicInfoSectionProps> = ({ form }) => {
  const { currentOrganization } = useOrganization();
  
  // Get manufacturer/model suggestions from existing equipment
  const { data: manufacturersData = [] } = useEquipmentManufacturersAndModels(
    currentOrganization?.id
  );

  // Track if name has been manually edited (only for new equipment)
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);

  // Watch manufacturer and model for auto-generating name
  const manufacturer = form.watch('manufacturer');
  const model = form.watch('model');
  const name = form.watch('name');

  // Check if this is an edit (has existing name) on mount
  const isEdit = useMemo(() => {
    // If name was already set when component mounted, treat as edit mode
    return !!form.formState.defaultValues?.name;
  }, [form.formState.defaultValues?.name]);

  // Auto-generate name when manufacturer/model changes (if not manually edited and not in edit mode)
  useEffect(() => {
    if (!nameManuallyEdited && !isEdit) {
      const generatedName = generateEquipmentName(manufacturer || '', model || '');
      if (generatedName && generatedName !== name) {
        form.setValue('name', generatedName);
      }
    }
  }, [manufacturer, model, nameManuallyEdited, isEdit, form, name]);

  // Get manufacturers list for autocomplete suggestions
  const manufacturers = useMemo(() => {
    return manufacturersData.map(m => m.manufacturer);
  }, [manufacturersData]);

  // Get models for selected manufacturer (for autocomplete suggestions)
  const modelsForManufacturer = useMemo(() => {
    if (!manufacturer) return [];
    const mfrData = manufacturersData.find(
      m => m.manufacturer.toLowerCase() === manufacturer.toLowerCase()
    );
    return mfrData?.models || [];
  }, [manufacturer, manufacturersData]);

  // Handle name field focus - mark as manually edited if user types
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
    setNameManuallyEdited(true);
    fieldOnChange(e.target.value);
  }, []);

  // Handle manufacturer change - reset manual edit flag if cleared
  const handleManufacturerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
    const value = e.target.value;
    fieldOnChange(value);
    if (!value) {
      setNameManuallyEdited(false);
    }
  }, []);

  // Handle model change - reset manual edit flag if cleared
  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
    const value = e.target.value;
    fieldOnChange(value);
    if (!value) {
      setNameManuallyEdited(false);
    }
  }, []);

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Basic Information
        </h3>
        
        {/* Manufacturer - Input with datalist for autocomplete */}
        <FormField
          control={form.control}
          name="manufacturer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Manufacturer *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., Toyota" 
                  list="equipment-manufacturer-suggestions"
                  autoComplete="off"
                  {...field}
                  onChange={(e) => handleManufacturerChange(e, field.onChange)}
                />
              </FormControl>
              <datalist id="equipment-manufacturer-suggestions">
                {manufacturers.map((mfr) => (
                  <option key={mfr} value={mfr} />
                ))}
              </datalist>
              {manufacturers.length > 0 && !manufacturer && (
                <FormDescription>
                  {manufacturers.length} existing manufacturer{manufacturers.length !== 1 ? 's' : ''} available as suggestions
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Model - Input with datalist for autocomplete */}
        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., 8FBU25" 
                  list="equipment-model-suggestions"
                  autoComplete="off"
                  {...field}
                  onChange={(e) => handleModelChange(e, field.onChange)}
                />
              </FormControl>
              <datalist id="equipment-model-suggestions">
                {modelsForManufacturer.map((mdl) => (
                  <option key={mdl} value={mdl} />
                ))}
              </datalist>
              {modelsForManufacturer.length > 0 && !model && (
                <FormDescription>
                  {modelsForManufacturer.length} existing model{modelsForManufacturer.length !== 1 ? 's' : ''} for {manufacturer}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Equipment Name - Auto-generated from manufacturer + model, but editable */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Equipment Name *
                {!isEdit && !nameManuallyEdited && name && (
                  <span className="text-muted-foreground ml-1 font-normal">(auto-generated)</span>
                )}
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="Auto-generated from manufacturer + model" 
                  {...field}
                  onChange={(e) => handleNameChange(e, field.onChange)}
                />
              </FormControl>
              {!isEdit && (
                <FormDescription>
                  Name is auto-generated from manufacturer and model. You can customize it if needed.
                </FormDescription>
              )}
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
