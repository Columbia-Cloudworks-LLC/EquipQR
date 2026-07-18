import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWorkOrderImagesWithUploaderProfiles } from './workOrderNoteImageEnrichment';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('@/services/imageUploadService', () => ({
  batchResolveWorkOrderImageDisplayUrls: vi.fn().mockResolvedValue([]),
  displayUrlForStoredPrivateImage: vi.fn().mockReturnValue(null),
}));

const { supabase } = await import('@/integrations/supabase/client');
const fromMock = vi.mocked(supabase.from);

function makeImageQuery(data: unknown[]) {
  const q = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error: null }),
  };
  return q;
}

function makeProfileQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
}

beforeEach(() => {
  fromMock.mockReset();
});

describe('fetchWorkOrderImagesWithUploaderProfiles', () => {
  it('queries work_order_images with inner join on work_orders and org scope', async () => {
    const imageQuery = makeImageQuery([]);
    fromMock.mockImplementation((table: string) => {
      if (table === 'work_order_images') return imageQuery as ReturnType<typeof makeImageQuery>;
      return makeProfileQuery() as ReturnType<typeof makeProfileQuery>;
    });

    await fetchWorkOrderImagesWithUploaderProfiles('wo-123', 'org-456');

    expect(imageQuery.select).toHaveBeenCalledWith(
      expect.stringContaining('work_orders!inner'),
    );
    expect(imageQuery.eq).toHaveBeenCalledWith('work_order_id', 'wo-123');
    expect(imageQuery.eq).toHaveBeenCalledWith('work_orders.organization_id', 'org-456');
  });

  it('returns empty imagesList when no images match', async () => {
    const imageQuery = makeImageQuery([]);
    fromMock.mockImplementation(() => imageQuery as ReturnType<typeof makeImageQuery>);

    const result = await fetchWorkOrderImagesWithUploaderProfiles('wo-abc', 'org-xyz');

    expect(result.imagesList).toHaveLength(0);
    expect(result.uploaderProfiles).toHaveLength(0);
  });

  it('throws when organizationId is empty or whitespace', async () => {
    await expect(
      fetchWorkOrderImagesWithUploaderProfiles('wo-123', ''),
    ).rejects.toThrow('Organization ID is required to fetch work order images');

    await expect(
      fetchWorkOrderImagesWithUploaderProfiles('wo-123', '   '),
    ).rejects.toThrow('Organization ID is required to fetch work order images');

    expect(fromMock).not.toHaveBeenCalled();
  });
});
