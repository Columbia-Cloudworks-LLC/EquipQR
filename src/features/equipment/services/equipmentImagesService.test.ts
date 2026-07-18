import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAllEquipmentImages } from './equipmentImagesService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('./equipmentNotesService', () => ({
  getEquipmentImages: vi.fn(),
}));

vi.mock('@/features/work-orders/services/workOrderNotesService', () => ({
  getWorkOrderImages: vi.fn(),
}));

const { supabase } = await import('@/integrations/supabase/client');
const { logger } = await import('@/utils/logger');
const { getEquipmentImages } = await import('./equipmentNotesService');
const { getWorkOrderImages } = await import(
  '@/features/work-orders/services/workOrderNotesService'
);

function createThenableWorkOrdersQuery(rows: Array<{ id: string }>): Record<string, unknown> & {
  then: typeof Promise.prototype.then;
} {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  const thenable = builder as Record<string, unknown> & {
    then: typeof Promise.prototype.then;
  };
  thenable.then = (onfulfilled: (value: unknown) => unknown) =>
    Promise.resolve({ data: rows, error: null }).then(onfulfilled);
  return thenable;
}

describe('equipmentImagesService getAllEquipmentImages', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('continues aggregating when one work order image fetch fails', async () => {
    vi.mocked(getEquipmentImages).mockResolvedValue([
      {
        id: 'eq-img-1',
        file_name: 'eq.jpg',
        file_url: 'https://example.com/eq.jpg',
        created_at: '2024-06-01T12:00:00.000Z',
        uploaded_by: 'user-1',
        equipment_note_id: 'note-1',
        is_private_note: false,
      },
    ] as never);

    vi.mocked(supabase.from).mockReturnValue(
      createThenableWorkOrdersQuery([{ id: 'wo-fail' }, { id: 'wo-ok' }]) as never,
    );

    vi.mocked(getWorkOrderImages).mockImplementation(async (workOrderId: string) => {
      if (workOrderId === 'wo-fail') throw new Error('transient fetch');
      return [
        {
          id: 'wo-img-ok',
          work_order_id: workOrderId,
          note_id: null,
          file_name: 'w.jpg',
          file_url: 'https://example.com/w.jpg',
          file_size: 1,
          mime_type: 'image/jpeg',
          description: null,
          uploaded_by: 'user-1',
          created_at: '2024-05-01T12:00:00.000Z',
          uploaded_by_name: 'Tech',
          note_content: '',
          note_author_name: 'Tech',
          note_created_at: '2024-05-01T12:00:00.000Z',
          is_private_note: false,
        },
      ];
    });

    const result = await getAllEquipmentImages('eq-1', 'org-1', 'admin');

    expect(result.map((r) => r.id).sort()).toEqual(['eq-img-1', 'wo-img-ok'].sort());
    expect(logger.warn).toHaveBeenCalledWith(
      'Skipping work-order images due to fetch error',
      expect.objectContaining({
        equipmentId: 'eq-1',
        organizationId: 'org-1',
        workOrderId: 'wo-fail',
        error: expect.any(Error),
      }),
    );
  });

  it('aggregates images from multiple work orders when all succeed', async () => {
    vi.mocked(getEquipmentImages).mockResolvedValue([] as never);

    vi.mocked(supabase.from).mockReturnValue(
      createThenableWorkOrdersQuery([{ id: 'wo-a' }, { id: 'wo-b' }]) as never,
    );

    vi.mocked(getWorkOrderImages).mockImplementation(async (workOrderId: string) => {
      if (workOrderId === 'wo-a') {
        return [
          {
            id: 'img-wo-a',
            work_order_id: workOrderId,
            note_id: null,
            file_name: 'a.jpg',
            file_url: 'https://example.com/a.jpg',
            file_size: 1,
            mime_type: 'image/jpeg',
            description: null,
            uploaded_by: 'user-1',
            created_at: '2024-03-01T12:00:00.000Z',
            uploaded_by_name: 'Tech',
            note_content: '',
            note_author_name: 'Tech',
            note_created_at: '2024-03-01T12:00:00.000Z',
            is_private_note: false,
          },
        ];
      }
      return [
        {
          id: 'img-wo-b',
          work_order_id: workOrderId,
          note_id: null,
          file_name: 'b.jpg',
          file_url: 'https://example.com/b.jpg',
          file_size: 1,
          mime_type: 'image/jpeg',
          description: null,
          uploaded_by: 'user-1',
          created_at: '2024-03-02T12:00:00.000Z',
          uploaded_by_name: 'Tech',
          note_content: '',
          note_author_name: 'Tech',
          note_created_at: '2024-03-02T12:00:00.000Z',
          is_private_note: false,
        },
      ];
    });

    const result = await getAllEquipmentImages('eq-x', 'org-x', 'admin');

    expect(result.length).toBe(2);
    expect(new Set(result.map((r) => r.id))).toEqual(new Set(['img-wo-a', 'img-wo-b']));
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
