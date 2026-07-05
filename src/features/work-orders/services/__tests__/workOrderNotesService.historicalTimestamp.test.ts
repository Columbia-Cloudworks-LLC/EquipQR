import { describe, expect, it, vi, beforeEach } from 'vitest';
import { updateHistoricalWorkOrderNoteTimestamp } from '@/features/work-orders/services/workOrderNotesService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('updateHistoricalWorkOrderNoteTimestamp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the historical note timestamp RPC with scoped params', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        success: true,
        work_order_id: 'wo-1',
        note_id: 'note-1',
        created_at: '2024-01-03T12:00:00.000Z',
      },
      error: null,
    });

    const result = await updateHistoricalWorkOrderNoteTimestamp(
      'org-1',
      'wo-1',
      'note-1',
      '2024-01-03T12:00:00.000Z',
    );

    expect(supabase.rpc).toHaveBeenCalledWith('update_historical_work_order_note_timestamp', {
      p_organization_id: 'org-1',
      p_work_order_id: 'wo-1',
      p_note_id: 'note-1',
      p_created_at: '2024-01-03T12:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});
