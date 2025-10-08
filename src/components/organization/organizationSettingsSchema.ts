import { z } from 'zod';

export const organizationFormSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name must be less than 100 characters'),
  logo: z.string().optional(),
  backgroundColor: z.string().optional(),
});

export type OrganizationFormData = z.infer<typeof organizationFormSchema>;
