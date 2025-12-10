import { z } from 'zod';

export const inventoryItemFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .nullable(),
  sku: z.string()
    .max(100, 'SKU must be less than 100 characters')
    .optional()
    .nullable(),
  external_id: z.string()
    .max(100, 'External ID must be less than 100 characters')
    .optional()
    .nullable(),
  quantity_on_hand: z.number()
    .int('Quantity must be an integer')
    .default(0),
  low_stock_threshold: z.number()
    .int('Low stock threshold must be an integer')
    .min(0, 'Low stock threshold cannot be negative')
    .default(5),
  image_url: z.string()
    .url('Must be a valid URL')
    .optional()
    .nullable(),
  location: z.string()
    .max(255, 'Location must be less than 255 characters')
    .optional()
    .nullable(),
  default_unit_cost: z.number()
    .min(0, 'Unit cost cannot be negative')
    .max(999999.99, 'Unit cost seems too high')
    .optional()
    .nullable(),
  compatibleEquipmentIds: z.array(z.string().uuid()).default([]),
  managerIds: z.array(z.string().uuid()).default([])
});

export type InventoryItemFormData = z.infer<typeof inventoryItemFormSchema>;

