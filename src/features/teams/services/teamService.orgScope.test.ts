import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/services/imageUploadService', () => ({
  batchResolveTeamImageDisplayUrls: vi.fn(async (urls: Array<string | null>) => urls),
  displayUrlForStoredPrivateImage: vi.fn((signed: string | null) => signed),
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { supabase } = await import('@/integrations/supabase/client');
const { getTeamByIdOptimized, updateTeam, deleteTeam } = await import('./teamService');

function createMaybeSingleChain(resolved: { data: unknown; error: { code?: string } | null }) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(resolved),
    single: vi.fn().mockResolvedValue(resolved),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  return chain;
}

describe('team org scope (RT-13)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getTeamByIdOptimized queries by team id and current organization', async () => {
    const chain = createMaybeSingleChain({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await getTeamByIdOptimized('metro-team', 'apex-org');

    expect(supabase.from).toHaveBeenCalledWith('teams');
    expect(chain.eq).toHaveBeenCalledWith('id', 'metro-team');
    expect(chain.eq).toHaveBeenCalledWith('organization_id', 'apex-org');
    expect(result).toBeNull();
  });

  it('updateTeam scopes the mutation to the current organization', async () => {
    const chain = createMaybeSingleChain({
      data: null,
      error: { code: 'PGRST116' },
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    await expect(
      updateTeam('metro-team', { name: 'Hijacked' }, 'apex-org'),
    ).rejects.toThrow(/could not be updated|not found|permission/i);

    expect(chain.eq).toHaveBeenCalledWith('id', 'metro-team');
    expect(chain.eq).toHaveBeenCalledWith('organization_id', 'apex-org');
  });

  it('deleteTeam scopes the delete to the current organization', async () => {
    const chain = createMaybeSingleChain({ data: null, error: null });
    Object.assign(chain, {
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null, count: 0 }),
        }),
      }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    await expect(deleteTeam('metro-team', 'apex-org')).rejects.toThrow(/could not be deleted/i);
  });
});
