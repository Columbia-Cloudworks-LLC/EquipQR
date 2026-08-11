import { describe, it, expect } from 'vitest';
import { attachWorkOrderCreationImages } from './workOrderNotesService';

describe('attachWorkOrderCreationImages', () => {
  it('returns null primary when images array is empty', async () => {
    await expect(
      attachWorkOrderCreationImages({
        workOrderId: 'wo-1',
        organizationId: 'org-1',
        images: [],
      }),
    ).resolves.toEqual({ primaryImageId: null });
  });
});
