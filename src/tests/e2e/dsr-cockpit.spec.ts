import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDsrCase, fetchDsrQueue, mutateDsrRequest } from '@/features/dsr/api/dsrApi';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

describe('dsr cockpit api flow', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('loads queue and returns requests', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { requests: [{ id: 'r1', status: 'received' }] },
      error: null,
    });

    const queue = await fetchDsrQueue('org-1');
    expect(queue).toHaveLength(1);
    expect(queue[0]?.id).toBe('r1');
  });

  it('loads case payload', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        request: { id: 'r1', status: 'processing' },
        events: [{ id: 'e1', event_type: 'intake_received' }],
      },
      error: null,
    });

    const result = await fetchDsrCase('org-1', 'r1');
    expect(result.request.id).toBe('r1');
    expect(result.events).toHaveLength(1);
  });

  it('submits mutation with optimistic concurrency', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { request: { id: 'r1', status: 'completed' } },
      error: null,
    });

    const updated = await mutateDsrRequest('org-1', 'r1', 'complete', '2026-01-01T00:00:00.000Z');
    expect(updated.status).toBe('completed');
    expect(invokeMock).toHaveBeenCalledWith(
      'manage-dsr-request',
      expect.objectContaining({
        body: expect.objectContaining({
          organizationId: 'org-1',
          dsrRequestId: 'r1',
          action: 'complete',
          expected_updated_at: '2026-01-01T00:00:00.000Z',
        }),
      }),
    );
  });
});
