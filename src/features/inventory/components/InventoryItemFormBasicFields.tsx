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
import type { InventoryItemFormData } from '@/features/inventory/schemas/inventorySchema';
import type { InventoryItem } from '@/features/inventory/types/inventory';

type InventoryItemFormBasicFieldsProps = {
  form: UseFormReturn<InventoryItemFormData>;
  editingItem?: InventoryItem | null;
};

export function InventoryItemFormBasicFields({
  form,
  editingItem,
}: InventoryItemFormBasicFieldsProps) {
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
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Shelf A, Bin 5" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

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
