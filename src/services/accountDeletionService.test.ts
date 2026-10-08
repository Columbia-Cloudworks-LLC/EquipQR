import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  previewAccountDeletion,
  executeAccountDeletion,
} from '@/services/accountDeletionService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('accountDeletionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the confirmation phrase used in Settings', () => {
    expect(DELETE_ACCOUNT_CONFIRMATION_PHRASE).toBe('DELETE MY ACCOUNT');
  });

  it('previewAccountDeletion calls delete-account with dryRunOnly', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        success: true,
        dryRunOnly: true,
        preview: { eligible_for_self_service: true, blockers: [] },
      },
      error: null,
    });

    const preview = await previewAccountDeletion();

    expect(supabase.functions.invoke).toHaveBeenCalledWith('delete-account', {
      body: { dryRunOnly: true },
    });
    expect(preview.eligible_for_self_service).toBe(true);
  });

  it('executeAccountDeletion surfaces API errors', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(
        new Response(
          JSON.stringify({ error: 'Confirmation text must exactly match "DELETE MY ACCOUNT"' }),
          { status: 400 },
        ),
      ),
    });

    await expect(
      executeAccountDeletion({
        confirmationText: 'nope',
        expectedUserEmail: 'user@example.com',
      }),
    ).rejects.toThrow('Confirmation text must exactly match "DELETE MY ACCOUNT"');
  });

  it('executeAccountDeletion returns blocked payload on 409 without throwing', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(
        new Response(
          JSON.stringify({
            success: false,
            blocked: true,
            message: 'Manual review is required before deletion.',
            preview: { eligible_for_self_service: false, blockers: [] },
          }),
          { status: 409 },
        ),
      ),
    });

    const result = await executeAccountDeletion({
      confirmationText: 'DELETE MY ACCOUNT',
      expectedUserEmail: 'user@example.com',
    });

    expect(result.blocked).toBe(true);
    expect(result.message).toMatch(/manual review/i);
  });
});
