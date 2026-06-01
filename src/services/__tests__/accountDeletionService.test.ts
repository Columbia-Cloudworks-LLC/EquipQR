import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  previewAccountDeletion,
  executeAccountDeletion,
} from '@/services/accountDeletionService';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

describe('accountDeletionService', () => {
  it('exports the confirmation phrase used in Settings', () => {
    expect(DELETE_ACCOUNT_CONFIRMATION_PHRASE).toBe('DELETE MY ACCOUNT');
  });

  it('previewAccountDeletion calls delete-account with dryRunOnly', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        dryRunOnly: true,
        preview: { eligible_for_self_service: true, blockers: [] },
      }),
    });

    const preview = await previewAccountDeletion();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/delete-account'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ dryRunOnly: true }),
      }),
    );
    expect(preview.eligible_for_self_service).toBe(true);
  });

  it('executeAccountDeletion surfaces API errors', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Confirmation text must exactly match "DELETE MY ACCOUNT"' }),
    });

    await expect(
      executeAccountDeletion({
        confirmationText: 'nope',
        expectedUserEmail: 'user@example.com',
      }),
    ).rejects.toThrow('Confirmation text must exactly match "DELETE MY ACCOUNT"');
  });

  it('executeAccountDeletion returns blocked payload on 409 without throwing', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        blocked: true,
        message: 'Manual review is required before deletion.',
        preview: { eligible_for_self_service: false, blockers: [] },
      }),
    });

    const result = await executeAccountDeletion({
      confirmationText: 'DELETE MY ACCOUNT',
      expectedUserEmail: 'user@example.com',
    });

    expect(result.blocked).toBe(true);
    expect(result.message).toMatch(/manual review/i);
  });
});
