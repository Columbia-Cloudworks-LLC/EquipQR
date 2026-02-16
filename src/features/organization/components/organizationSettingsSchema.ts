import { z } from 'zod';

export const organizationFormSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name must be less than 100 characters'),
  backgroundColor: z.string().optional(),
  scan_location_collection_enabled: z.boolean().optional(),
});

export type OrganizationFormData = z.infer<typeof organizationFormSchema>;

