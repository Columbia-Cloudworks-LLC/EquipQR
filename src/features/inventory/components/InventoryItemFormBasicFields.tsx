import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { InventoryStorageLocationFields } from '@/features/inventory/components/InventoryStorageLocationFields';
import type { InventoryItemFormData } from '@/features/inventory/schemas/inventorySchema';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import type { InventoryStructuredLocationFields } from '@/features/inventory/utils/inventoryLocationUtils';

type InventoryItemFormBasicFieldsProps = {
  form: UseFormReturn<InventoryItemFormData>;
  editingItem?: InventoryItem | null;
};

export function InventoryItemFormBasicFields({
  form,
  editingItem,
}: InventoryItemFormBasicFieldsProps) {
  const structuredLocation = form.watch([
    'location_address',
    'location_city',
    'location_state',
    'location_country',
    'location_lat',
    'location_lng',
  ]);

  const structuredLocationValue: InventoryStructuredLocationFields = {
    location_address: structuredLocation[0] ?? null,
    location_city: structuredLocation[1] ?? null,
    location_state: structuredLocation[2] ?? null,
    location_country: structuredLocation[3] ?? null,
    location_lat: structuredLocation[4] ?? null,
    location_lng: structuredLocation[5] ?? null,
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="Item name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <FormControl>
                <Input placeholder="Internal SKU" {...field} value={field.value || ''} />
              </FormControl>
              <FormDescription>Internal identifier (unique per organization)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Item description"
                {...field}
                value={field.value || ''}
                rows={3}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="external_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>External ID (UPC/EAN/Barcode)</FormLabel>
              <FormControl>
                <Input placeholder="Manufacturer barcode" {...field} value={field.value || ''} />
              </FormControl>
              <FormDescription>For scanning manufacturer barcodes</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Yard Cage, Truck 3, Shelf A"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Use a storage nickname like Yard Cage, Truck 3, Shelf A, or Main Shop Bin 5.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <InventoryStorageLocationFields
        structuredLocation={structuredLocationValue}
        onStructuredLocationChange={(location) => {
          form.setValue('location_address', location.location_address, { shouldDirty: true });
          form.setValue('location_city', location.location_city, { shouldDirty: true });
          form.setValue('location_state', location.location_state, { shouldDirty: true });
          form.setValue('location_country', location.location_country, { shouldDirty: true });
          form.setValue('location_lat', location.location_lat, { shouldDirty: true });
          form.setValue('location_lng', location.location_lng, { shouldDirty: true });
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="quantity_on_hand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity on Hand *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      field.onChange(0);
                    } else {
                      const numValue = parseInt(value, 10);
                      field.onChange(isNaN(numValue) ? 0 : numValue);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="low_stock_threshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Low Stock Threshold</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="default_unit_cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Unit Cost ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                  }
                />
              </FormControl>
              <FormDescription>For form auto-fill only</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {!editingItem && (
        <div className="rounded-lg border border-dashed p-3 text-center">
          <p className="text-sm text-muted-foreground">
            You can upload up to 5 images after creating this item.
          </p>
        </div>
      )}
    </>
  );
}
