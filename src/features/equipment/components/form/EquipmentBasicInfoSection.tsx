import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { UseFormReturn } from 'react-hook-form';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentManufacturersAndModels } from '@/features/equipment/hooks/useEquipment';
import { type EquipmentFormData, generateEquipmentName } from '@/features/equipment/types/equipment';
import { useManufacturerModelSuggestions } from '@/features/equipment/utils/manufacturerModelLookup';
import {
  inferEquipmentFromPartialInput,
  mergeManufacturerModelSuggestions,
  type EquipmentSpecSuggestion,
} from '@/features/equipment/utils/equipmentTaxonomyInference';
import {
  useOrganizationEquipmentSpecCache,
  useRecordAcceptedEquipmentSpec,
} from '@/features/equipment/hooks/useEquipmentSpecInference';
import { EquipmentSpecSuggestionBanner } from '@/features/equipment/components/form/EquipmentSpecSuggestionBanner';
import type { DuplicateEquipmentMatch } from '@/features/equipment/services/EquipmentService';
import { DuplicateSerialWarning } from '@/features/equipment/components/DuplicateSerialWarning';

interface EquipmentBasicInfoSectionProps {
  form: UseFormReturn<EquipmentFormData>;
  /** Existing record sharing the entered serial number, if any (non-blocking warning). */
  duplicateMatch?: DuplicateEquipmentMatch | null;
  /** Called when the operator follows the link to the existing record. */
  onDuplicateNavigate?: () => void;
}

const EquipmentBasicInfoSection: React.FC<EquipmentBasicInfoSectionProps> = ({
  form,
  duplicateMatch,
  onDuplicateNavigate,
}) => {
  const { currentOrganization } = useOrganization();
  
  // Get manufacturer/model suggestions from existing equipment
  const { data: manufacturersData = [] } = useEquipmentManufacturersAndModels(
    currentOrganization?.id
  );
  const { data: fleetSpecCache = [] } = useOrganizationEquipmentSpecCache(
    currentOrganization?.id,
  );
  const recordAcceptedSpecMutation = useRecordAcceptedEquipmentSpec();

  const mergedManufacturersData = useMemo(
    () => mergeManufacturerModelSuggestions(manufacturersData, fleetSpecCache),
    [manufacturersData, fleetSpecCache],
  );

  // Track if name has been manually edited (only for new equipment)
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [ignoredSuggestionKeys, setIgnoredSuggestionKeys] = useState<string[]>([]);
  const [externalSuggestion, setExternalSuggestion] =
    useState<EquipmentSpecSuggestion | null>(null);

  // Watch manufacturer and model for auto-generating name
  const manufacturer = form.watch('manufacturer');
  const model = form.watch('model');
  const name = form.watch('name');
  const serialNumber = form.watch('serial_number');

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

  const { manufacturers, modelsForManufacturer } = useManufacturerModelSuggestions(
    mergedManufacturersData,
    manufacturer,
  );

  const partialSuggestion = useMemo(
    () =>
      inferEquipmentFromPartialInput({
        manufacturerInput: manufacturer || '',
        modelInput: model || '',
        fleetCache: fleetSpecCache,
      }),
    [manufacturer, model, fleetSpecCache],
  );

  const activeSuggestion = useMemo(() => {
    const candidate = externalSuggestion ?? partialSuggestion;
    if (!candidate) return null;
    if (ignoredSuggestionKeys.includes(candidate.key)) return null;
    return candidate;
  }, [externalSuggestion, partialSuggestion, ignoredSuggestionKeys]);

  const handleAcceptSuggestion = useCallback(
    (suggestion: EquipmentSpecSuggestion) => {
      const nextManufacturer = suggestion.manufacturer || manufacturer || '';
      const nextModel = suggestion.model || model || '';

      if (suggestion.manufacturer) {
        form.setValue('manufacturer', suggestion.manufacturer, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      if (suggestion.model) {
        form.setValue('model', suggestion.model, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      const currentAttrs = form.getValues('custom_attributes') ?? {};
      const nextAttrs: Record<string, string> = { ...currentAttrs };
      if (suggestion.category && !nextAttrs.category) {
        nextAttrs.category = suggestion.category;
      }
      if (suggestion.subtype && !nextAttrs.subtype) {
        nextAttrs.subtype = suggestion.subtype;
      }
      for (const [specKey, specVal] of Object.entries(suggestion.specs)) {
        if (specVal && !nextAttrs[specKey]) {
          nextAttrs[specKey] = specVal;
        }
      }
      nextAttrs.spec_provenance = `${suggestion.source}:${Math.round(
        suggestion.confidence * 100,
      )}%:${new Date().toISOString()}`;
      form.setValue('custom_attributes', nextAttrs, { shouldDirty: true });

      if (currentOrganization?.id && nextManufacturer && nextModel) {
        recordAcceptedSpecMutation.mutate({
          organizationId: currentOrganization.id,
          manufacturer: nextManufacturer,
          model: nextModel,
          category: suggestion.category,
          subtype: suggestion.subtype,
          specs: suggestion.specs,
          source: suggestion.source,
          confidence: suggestion.confidence,
        });
      }

      setIgnoredSuggestionKeys((prev) => [...prev, suggestion.key]);
      setExternalSuggestion(null);
    },
    [currentOrganization?.id, form, manufacturer, model, recordAcceptedSpecMutation],
  );

  const handleIgnoreSuggestion = useCallback((suggestionKey: string) => {
    setIgnoredSuggestionKeys((prev) => [...prev, suggestionKey]);
    setExternalSuggestion(null);
  }, []);

  // Handle name field focus - mark as manually edited if user types
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
    setNameManuallyEdited(true);
    fieldOnChange(e.target.value);
  }, []);

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Basic Information
        </h3>
        
        {/* Manufacturer - AutocompleteInput with suggestions */}
        <FormField
          control={form.control}
          name="manufacturer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Manufacturer *</FormLabel>
              <FormControl>
                <AutocompleteInput
                  placeholder="e.g., Toyota"
                  suggestions={manufacturers}
                  value={field.value || ''}
                  onChange={(value) => {
                    field.onChange(value);
                    if (!value) {
                      setNameManuallyEdited(false);
                    }
                  }}
                  emptyMessage="No matching manufacturers"
                />
              </FormControl>
              {manufacturers.length > 0 && !manufacturer && (
                <FormDescription>
                  {manufacturers.length} existing manufacturer{manufacturers.length !== 1 ? 's' : ''} available as suggestions
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Model - AutocompleteInput with suggestions */}
        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model *</FormLabel>
              <FormControl>
                <AutocompleteInput
                  placeholder="e.g., 8FBU25"
                  suggestions={modelsForManufacturer}
                  value={field.value || ''}
                  onChange={(value) => {
                    field.onChange(value);
                    if (!value) {
                      setNameManuallyEdited(false);
                    }
                  }}
                  emptyMessage="No matching models"
                />
              </FormControl>
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
              {duplicateMatch && (
                <DuplicateSerialWarning
                  match={duplicateMatch}
                  inline
                  onNavigate={onDuplicateNavigate}
                />
              )}
            </FormItem>
          )}
        />

        <EquipmentSpecSuggestionBanner
          suggestion={activeSuggestion}
          serialNumber={serialNumber || ''}
          onAcceptSuggestion={handleAcceptSuggestion}
          onIgnoreSuggestion={handleIgnoreSuggestion}
          onExternalSuggestionResolved={(resolved) => setExternalSuggestion(resolved)}
        />
      </CardContent>
    </Card>
  );
};

export default EquipmentBasicInfoSection;
