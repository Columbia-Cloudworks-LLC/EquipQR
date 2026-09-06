import { describe, expect, it } from 'vitest';
import { getDefaultWorkOrderFormValues, workOrderFormSchema } from './workOrderSchema';

describe('workOrderFormSchema', () => {
  it('defaults dueDateHasTime to false', () => {
    const parsed = workOrderFormSchema.parse({
      title: 'Inspect pump',
      equipmentId: 'eq-1',
      priority: 'medium',
    });

    expect(parsed.dueDateHasTime).toBe(false);
    expect(getDefaultWorkOrderFormValues().dueDateHasTime).toBe(false);
  });
});
