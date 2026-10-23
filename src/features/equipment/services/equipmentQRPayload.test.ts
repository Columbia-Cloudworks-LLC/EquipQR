import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockBatchResolve = vi.fn();

vi.mock('@/services/imageUploadService', async () => {
  const actual = await vi.importActual<typeof import('@/services/imageUploadService')>('@/services/imageUploadService');
  return {
    ...actual,
    batchResolveEquipmentDisplayImageUrls: (refs: (string | null | undefined)[]) => mockBatchResolve(refs),
  };
});

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/authClaims', () => ({
  requireAuthUserIdFromClaims: vi.fn().mockResolvedValue('user-test-1'),
  getAuthClaims: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import {
  fetchEquipmentQRPayload,
  resolveEquipmentQRDisplayImageUrl,
} from '@/features/equipment/services/equipmentQRPermissions';
import {
  UnassignedQRTagDetectedError,
  generateShortTagCode,
  createQRTagBatch,
  listUnassignedQRTags,
  claimQRTagForEquipment,
} from '@/features/equipment/services/equipmentQRTagService';

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

  it('returns raw imageReference for display image without calling the image resolver', async () => {
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

    expect(mockBatchResolve).not.toHaveBeenCalled();
    expect(payload.equipment.imageReference).toBe(canonicalPath);
  });

  it('returns null imageReference when equipment has no display image', async () => {
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
    expect(payload.equipment.imageReference).toBeNull();
  });

  it('returns imageReference on legacy QR links without org query param', async () => {
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

    expect(mockBatchResolve).not.toHaveBeenCalled();
    expect(payload.equipment.imageReference).toBe(canonicalPath);
  });

  it('throws UnassignedQRTagDetectedError when equipment is missing and an unassigned QR tag exists', async () => {
    const membershipBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    };

    const equipmentBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const tagBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'tag-uuid-1',
          organization_id: 'org-1',
          short_code: 'EQ-A9X4-7K2M',
          status: 'unassigned',
          claimed_equipment_id: null,
          label_batch_name: 'Yard Roll 1',
          created_at: '2026-10-23T12:00:00Z',
          organizations: {
            id: 'org-1',
            name: 'Org One',
            scan_location_collection_enabled: false,
          },
        },
        error: null,
      }),
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'organization_members') return membershipBuilder as never;
      if (table === 'equipment') return equipmentBuilder as never;
      if (table === 'equipment_qr_tags') return tagBuilder as never;
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(fetchEquipmentQRPayload('tag-uuid-1', 'org-1')).rejects.toBeInstanceOf(
      UnassignedQRTagDetectedError,
    );
  });

  it('resolves claimed equipment when a pre-printed QR tag has been claimed', async () => {
    const membershipBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
    };

    let equipmentQueryCount = 0;
    const equipmentBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(async () => {
        equipmentQueryCount += 1;
        if (equipmentQueryCount === 1) {
          return { data: null, error: null };
        }
        return {
          data: baseEquipmentRow({ id: 'claimed-eq-99', name: 'Claimed Forklift' }),
          error: null,
        };
      }),
    };

    const tagBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'tag-uuid-99',
          organization_id: 'org-1',
          short_code: 'EQ-C9M1-2B4N',
          status: 'claimed',
          claimed_equipment_id: 'claimed-eq-99',
          label_batch_name: 'Yard Roll 1',
          created_at: '2026-10-23T12:00:00Z',
          organizations: {
            id: 'org-1',
            name: 'Org One',
            scan_location_collection_enabled: false,
          },
        },
        error: null,
      }),
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'organization_members') return membershipBuilder as never;
      if (table === 'equipment') return equipmentBuilder as never;
      if (table === 'equipment_qr_tags') return tagBuilder as never;
      throw new Error(`Unexpected table ${table}`);
    });

    const payload = await fetchEquipmentQRPayload('tag-uuid-99', 'org-1');
    expect(payload.equipment.id).toBe('claimed-eq-99');
    expect(payload.equipment.name).toBe('Claimed Forklift');
  });
});

describe('equipmentQRTagService (#1644)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates unambiguous short tag codes in TAG-XXXXXX format', () => {
    const code = generateShortTagCode();
    expect(code).toMatch(/^TAG-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  });

  it('mints a batch of unassigned QR tags and lists unassigned tags', async () => {
    const mockRows = [
      {
        id: 'tag-1',
        organization_id: 'org-1',
        short_code: 'EQ-2345-6789',
        status: 'unassigned',
        claimed_equipment_id: null,
        claimed_at: null,
        claimed_by: null,
        created_by: 'user-test-1',
        label_batch_name: 'Shop Intake',
        created_at: '2026-10-23T12:00:00Z',
        updated_at: '2026-10-23T12:00:00Z',
      },
    ];

    const tagTableBuilder = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
    };
    tagTableBuilder.select.mockImplementation(() => ({
      ...tagTableBuilder,
      then: (resolve: (val: unknown) => unknown) =>
        Promise.resolve({ data: mockRows, error: null }).then(resolve),
    }));

    vi.mocked(supabase.from).mockReturnValue(tagTableBuilder as never);

    const created = await createQRTagBatch({
      organizationId: 'org-1',
      count: 1,
      labelBatchName: 'Shop Intake',
    });
    expect(created).toHaveLength(1);
    expect(created[0].short_code).toBe('EQ-2345-6789');

    const listed = await listUnassignedQRTags('org-1', 12);
    expect(listed).toHaveLength(1);
  });

  it('claims an unassigned QR tag via claim_equipment_qr_tag RPC', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        id: 'tag-1',
        organization_id: 'org-1',
        short_code: 'EQ-2345-6789',
        status: 'claimed',
        claimed_equipment_id: 'eq-99',
      },
      error: null,
    } as never);

    const claimed = await claimQRTagForEquipment('tag-1', 'eq-99');
    expect(supabase.rpc).toHaveBeenCalledWith('claim_equipment_qr_tag', {
      p_tag_id: 'tag-1',
      p_equipment_id: 'eq-99',
    });
    expect(claimed.status).toBe('claimed');
    expect(claimed.claimed_equipment_id).toBe('eq-99');
  });
});

describe('resolveEquipmentQRDisplayImageUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchResolve.mockImplementation(async refs =>
      refs.map(ref => (ref === canonicalPath ? signedUrl : null)),
    );
  });

  it('returns a signed URL when batch resolution succeeds', async () => {
    const url = await resolveEquipmentQRDisplayImageUrl({
      equipmentId: 'eq-id',
      organizationId: 'org-1',
      stored: canonicalPath,
    });

    expect(mockBatchResolve).toHaveBeenCalledWith([canonicalPath]);
    expect(url).toBe(signedUrl);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns null and skips batch when stored is empty', async () => {
    const url = await resolveEquipmentQRDisplayImageUrl({
      equipmentId: 'eq-id',
      organizationId: 'org-1',
      stored: null,
    });

    expect(url).toBeNull();
    expect(mockBatchResolve).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs when a canonical path fails to resolve', async () => {
    mockBatchResolve.mockResolvedValue([null]);

    const url = await resolveEquipmentQRDisplayImageUrl({
      equipmentId: 'eq-id',
      organizationId: 'org-1',
      stored: canonicalPath,
    });

    expect(url).toBeNull();
    expect(logger.error).toHaveBeenCalledWith('QR equipment image resolution failed', {
      equipmentId: 'eq-id',
      organizationId: 'org-1',
      imagePath: canonicalPath,
    });
  });

  it('does not log when resolution fails for a plain https URL with no extractable path', async () => {
    mockBatchResolve.mockResolvedValue([null]);

    const url = await resolveEquipmentQRDisplayImageUrl({
      equipmentId: 'eq-id',
      organizationId: 'org-1',
      stored: 'https://example.com/photo.jpg',
    });

    expect(url).toBeNull();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns null and logs when batch resolution rejects for a canonical stored path', async () => {
    mockBatchResolve.mockRejectedValue(new Error('signing_failed'));

    const url = await resolveEquipmentQRDisplayImageUrl({
      equipmentId: 'eq-id',
      organizationId: 'org-1',
      stored: canonicalPath,
    });

    expect(url).toBeNull();
    expect(logger.error).toHaveBeenCalledWith('QR equipment image resolution failed', {
      equipmentId: 'eq-id',
      organizationId: 'org-1',
      imagePath: canonicalPath,
      errorName: 'Error',
      errorMessage: 'signing_failed',
    });
  });

  it.each([
    {
      thrown: Object.assign(Object.create(null), { message: 'null_proto_failure' }),
      expectedMessage: 'null_proto_failure',
    },
    {
      thrown: { message: 'missing_constructor_failure', constructor: null },
      expectedMessage: 'missing_constructor_failure',
    },
  ])('returns null when thrown error summary has no safe constructor', async ({ thrown, expectedMessage }) => {
    mockBatchResolve.mockRejectedValue(thrown);

    const url = await resolveEquipmentQRDisplayImageUrl({
      equipmentId: 'eq-id',
      organizationId: 'org-1',
      stored: canonicalPath,
    });

    expect(url).toBeNull();
    expect(logger.error).toHaveBeenCalledWith('QR equipment image resolution failed', {
      equipmentId: 'eq-id',
      organizationId: 'org-1',
      imagePath: canonicalPath,
      errorName: 'object',
      errorMessage: expectedMessage,
    });
  });
});
