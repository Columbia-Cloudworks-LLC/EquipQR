import React, { useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from 'react-hook-form';
import { type EquipmentFormData } from '@/features/equipment/types/equipment';
import GooglePlacesAutocomplete, { type PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { Label } from '@/components/ui/label';

interface EquipmentStatusLocationSectionProps {
  form: UseFormReturn<EquipmentFormData>;
}

/**
 * Build a display string from the existing assigned_location fields
 * so the autocomplete input shows something meaningful on edit.
 */
function buildAddressDisplay(values: EquipmentFormData): string {
  const parts = [
    values.assigned_location_street,
    values.assigned_location_city,
    values.assigned_location_state,
    values.assigned_location_country,
  ].filter(Boolean);
  return parts.join(', ');
}

const EquipmentStatusLocationSection: React.FC<EquipmentStatusLocationSectionProps> = ({ form }) => {
  const { isLoaded } = useGoogleMapsLoader();
  const values = form.getValues();
  const addressDisplay = buildAddressDisplay(values);

  const handlePlaceSelect = useCallback(
    (data: PlaceLocationData) => {
      form.setValue('assigned_location_street', data.street, { shouldDirty: true });
      form.setValue('assigned_location_city', data.city, { shouldDirty: true });
      form.setValue('assigned_location_state', data.state, { shouldDirty: true });
      form.setValue('assigned_location_country', data.country, { shouldDirty: true });
      form.setValue('assigned_location_lat', data.lat ?? undefined, { shouldDirty: true });
      form.setValue('assigned_location_lng', data.lng ?? undefined, { shouldDirty: true });
    },
    [form],
  );

  const handleClear = useCallback(() => {
    form.setValue('assigned_location_street', undefined, { shouldDirty: true });
    form.setValue('assigned_location_city', undefined, { shouldDirty: true });
    form.setValue('assigned_location_state', undefined, { shouldDirty: true });
    form.setValue('assigned_location_country', undefined, { shouldDirty: true });
    form.setValue('assigned_location_lat', undefined, { shouldDirty: true });
    form.setValue('assigned_location_lng', undefined, { shouldDirty: true });
  }, [form]);

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Status & Location
        </h3>
        
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Under Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Description *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Bay 3, Warehouse A" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label>Assigned Address</Label>
          <GooglePlacesAutocomplete
            value={addressDisplay}
            onPlaceSelect={handlePlaceSelect}
            onClear={handleClear}
            placeholder="Search for an address..."
            isLoaded={isLoaded}
          />
          <p className="text-xs text-muted-foreground">
            Start typing to search. Coordinates are resolved automatically.
          </p>
        </div>

        <FormField
          control={form.control}
          name="installation_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Installation Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="warranty_expiration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Warranty Expiration</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="last_maintenance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Maintenance</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default EquipmentStatusLocationSection;
