import { describe, expect, it, vi, beforeEach } from 'vitest';
import { historicalTimelineService } from '@/features/work-orders/services/historicalTimelineService';
import { synthesizeDefaultTimeline } from '@/features/work-orders/utils/historicalTimeline';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

describe('historicalTimelineService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls replace_historical_work_order_timeline with organization scope', async () => {
    const events = synthesizeDefaultTimeline({
      startDate: new Date('2024-01-01T08:00:00Z'),
      finalStatus: 'completed',
      completedDate: new Date('2024-01-05T16:00:00Z'),
    });

    rpcMock.mockResolvedValue({
      data: { success: true, work_order_id: 'wo-1', event_count: events.length, status: 'completed' },
      error: null,
    });

    const result = await historicalTimelineService.replaceHistoricalTimeline('org-1', 'wo-1', events);

    expect(rpcMock).toHaveBeenCalledWith('replace_historical_work_order_timeline', {
      p_work_order_id: 'wo-1',
      p_organization_id: 'org-1',
      p_events: expect.any(Array),
      p_skip_audit: false,
    });
    expect(result.success).toBe(true);
  });

  it('calls convert_work_order_to_historical with timeline payload', async () => {
    const events = synthesizeDefaultTimeline({
      startDate: new Date('2024-01-01T08:00:00Z'),
      finalStatus: 'completed',
      completedDate: new Date('2024-01-05T16:00:00Z'),
    });

    rpcMock.mockResolvedValue({
      data: {
        success: true,
        work_order_id: 'wo-1',
        event_count: events.length,
        status: 'completed',
      },
      error: null,
    });

    const result = await historicalTimelineService.convertWorkOrderToHistorical('org-1', 'wo-1', events);

    expect(rpcMock).toHaveBeenCalledWith('convert_work_order_to_historical', {
      p_work_order_id: 'wo-1',
      p_organization_id: 'org-1',
      p_events: expect.arrayContaining([
        expect.objectContaining({ new_status: 'submitted', old_status: null }),
      ]),
      p_skip_audit: false,
    });
    expect(result.success).toBe(true);
    expect(result.work_order_id).toBe('wo-1');
  });

  it('returns RPC error message when conversion fails', async () => {
    rpcMock.mockResolvedValue({
      data: { success: false, error: 'Permission denied' },
      error: null,
    });

    const result = await historicalTimelineService.convertWorkOrderToHistorical('org-1', 'wo-1', []);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Permission denied');
  });
});
