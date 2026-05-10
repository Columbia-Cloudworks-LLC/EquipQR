import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockBatchResolve = vi.fn();

vi.mock('@/services/imageUploadService', () => ({
  batchResolveEquipmentDisplayImageUrls: (refs: (string | null | undefined)[]) => mockBatchResolve(refs),
}));

vi.mock('@/lib/authClaims', () => ({
  requireAuthUserIdFromClaims: vi.fn().mockResolvedValue('user-test-1'),
  getAuthClaims: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { fetchEquipmentQRPayload } from '@/features/equipment/services/equipmentQRPermissions';

const canonicalPath =
  'da1368a1-9ed1-46ef-a7dc-56bf15ebeee4/eq-id/note/1769226798314.jpg';
const signedUrl = `https://supabase.example/storage/v1/object/sign/work-order-images/${canonicalPath}?token=x`;

function baseEquipmentRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'eq-id',
    organization_id: 'org-1',
    name: 'Test Excavator',
    manufacturer: 'Cat',
    model: '320',
    serial_number: 'SN1',
    status: 'active',
    location: 'Yard',
    working_hours: 100,
    image_url: canonicalPath,
    default_pm_template_id: null,
    team: { id: 'team-1', name: 'Team A' },
    organizations: {
      id: 'org-1',
      name: 'Org One',
      scan_location_collection_enabled: false,
    },
    ...overrides,
  };
}

describe('fetchEquipmentQRPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchResolve.mockImplementation(async refs =>
      refs.map(ref => (ref === canonicalPath ? signedUrl : null)),
    );
  });

  it('resolves canonical image_url to a signed URL when org is scoped (?org= path)', async () => {
    const membershipBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
    };

    const equipmentBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: baseEquipmentRow(),
        error: null,
      }),
    };

    let call = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      call += 1;
      if (call === 1) return membershipBuilder as never;
      return equipmentBuilder as never;
    });

    const payload = await fetchEquipmentQRPayload('eq-id', 'org-1');

    expect(mockBatchResolve).toHaveBeenCalledWith([canonicalPath]);
    expect(payload.equipment.imageUrl).toBe(signedUrl);
  });

  it('returns null imageUrl when equipment has no display image', async () => {
    const membershipBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
    };

    const equipmentBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: baseEquipmentRow({ image_url: null }),
        error: null,
      }),
    };

    let call = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      call += 1;
      if (call === 1) return membershipBuilder as never;
      return equipmentBuilder as never;
    });

    const payload = await fetchEquipmentQRPayload('eq-id', 'org-1');

    expect(mockBatchResolve).not.toHaveBeenCalled();
    expect(payload.equipment.imageUrl).toBeNull();
  });

  it('resolves image_url on legacy QR links without org query param', async () => {
    const listBuilder: Record<string, unknown> = {
      select: vi.fn(function (this: typeof listBuilder) {
        return this;
      }),
      eq: vi.fn(function (this: typeof listBuilder) {
        return this;
      }),
    };
    listBuilder.then = (onFulfilled: (value: unknown) => unknown) =>
      Promise.resolve({
        data: [{ organization_id: 'org-1', role: 'member' }],
        error: null,
      }).then(onFulfilled);

    const equipmentBuilder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: baseEquipmentRow(),
        error: null,
      }),
    };

    let call = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      call += 1;
      if (table === 'organization_members' && call === 1) return listBuilder as never;
      return equipmentBuilder as never;
    });

    const payload = await fetchEquipmentQRPayload('eq-id');

    expect(mockBatchResolve).toHaveBeenCalledWith([canonicalPath]);
    expect(payload.equipment.imageUrl).toBe(signedUrl);
  });
});
