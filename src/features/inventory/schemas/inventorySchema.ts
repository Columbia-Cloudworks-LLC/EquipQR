import { z } from 'zod';

/**
 * Schema for a single compatibility rule (manufacturer/model pattern).
 * 
 * - manufacturer: Required, non-empty string
 * - model: Optional; null or empty string means "Any Model"
 */
export const compatibilityRuleSchema = z.object({
  manufacturer: z.string()
    .min(1, 'Manufacturer is required')
    .max(255, 'Manufacturer must be less than 255 characters'),
  model: z.string()
    .max(255, 'Model must be less than 255 characters')
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val)  // Treat empty string as "Any Model"
});

export type CompatibilityRuleFormData = z.infer<typeof compatibilityRuleSchema>;

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
    .min(-10000, 'Quantity cannot be less than -10,000 (prevents data entry errors while allowing reasonable backorders)'),
  low_stock_threshold: z.number()
    .int('Low stock threshold must be an integer')
    .min(1, 'Low stock threshold must be at least 1')
    .default(5),
  image_url: z.preprocess(
    (val) => val === '' || val === undefined ? null : val,
    z.string().url('Must be a valid URL').nullable().optional()
  ),
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
  // Compatibility rules (manufacturer/model patterns)
  compatibilityRules: z.array(compatibilityRuleSchema).default([]),
  // Alternate parts group assignment (optional)
  alternateGroupMode: z.enum(['none', 'existing', 'new']).default('none'),
  alternateGroupId: z.string().uuid().optional().nullable(),
  newAlternateGroupName: z.string()
    .max(200, 'Group name must be less than 200 characters')
    .optional()
    .nullable()
}).refine(
  (data) => {
    // If mode is 'existing', require a group ID
    if (data.alternateGroupMode === 'existing') {
      return !!data.alternateGroupId;
    }
    // If mode is 'new', require a group name
    if (data.alternateGroupMode === 'new') {
      return !!data.newAlternateGroupName && data.newAlternateGroupName.trim().length > 0;
    }
    return true;
  },
  {
    message: 'Please select an existing group or provide a name for the new group',
    path: ['alternateGroupId']
  }
);

export type InventoryItemFormData = z.infer<typeof inventoryItemFormSchema>;

