import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditService } from '@/services/auditService';
import { supabase } from '@/integrations/supabase/client';
import type { AuditLogTimelineRow } from '@/types/audit';

const rpcMock = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

describe('auditService.getAuditTimeline', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('forwards bucket / range / filter params to the get_audit_log_timeline RPC', async () => {
    const rows: AuditLogTimelineRow[] = [
      { bucket: '2026-04-20T10:00:00.000Z', action: 'INSERT', count: 4 },
    ];
    rpcMock.mockResolvedValue({ data: rows, error: null });

    const result = await auditService.getAuditTimeline('org-1', {
      bucket: 'hour',
      dateFrom: '2026-04-20T00:00:00.000Z',
      dateTo: '2026-04-21T00:00:00.000Z',
      filters: {
        entityType: 'equipment',
        action: 'INSERT',
        actorId: 'actor-9',
        search: 'forklift',
      },
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(rows);
    expect(rpcMock).toHaveBeenCalledWith('get_audit_log_timeline', {
      p_organization_id: 'org-1',
      p_bucket: 'hour',
      p_date_from: '2026-04-20T00:00:00.000Z',
      p_date_to: '2026-04-21T00:00:00.000Z',
      p_entity_type: 'equipment',
      p_action: 'INSERT',
      p_actor_id: 'actor-9',
      p_search: 'forklift',
    });
  });

  it('omits filter params that are unset or set to "all"', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await auditService.getAuditTimeline('org-1', {
      bucket: 'day',
      dateFrom: '2026-04-13T00:00:00.000Z',
      dateTo: '2026-04-20T00:00:00.000Z',
      filters: { entityType: 'all', action: 'all' },
    });

    expect(rpcMock).toHaveBeenCalledWith('get_audit_log_timeline', {
      p_organization_id: 'org-1',
      p_bucket: 'day',
      p_date_from: '2026-04-13T00:00:00.000Z',
      p_date_to: '2026-04-20T00:00:00.000Z',
      p_entity_type: undefined,
      p_action: undefined,
      p_actor_id: undefined,
      p_search: undefined,
    });
  });

  it('returns success with an empty array when the RPC yields no rows', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    const result = await auditService.getAuditTimeline('org-1', {
      bucket: 'minute',
      dateFrom: '2026-04-20T10:00:00.000Z',
      dateTo: '2026-04-20T11:00:00.000Z',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('passes the RPC error through as a service-level failure', async () => {
    // The shared handleError helper only extracts `.message` from Error
    // instances; supabase-js returns plain PostgrestError objects which the
    // service throws as-is. Match that contract here.
    rpcMock.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('access denied'), { code: '42501' }),
    });

    const result = await auditService.getAuditTimeline('org-1', {
      bucket: 'hour',
      dateFrom: '2026-04-20T00:00:00.000Z',
      dateTo: '2026-04-21T00:00:00.000Z',
    });

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('access denied');
  });
});
