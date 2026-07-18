/**
 * Parts Consumers Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import {
  getPartsConsumers,
  isUserPartsConsumer,
  addPartsConsumer,
  removePartsConsumer,
} from './partsConsumersService';
import { personas } from '@vitest-harness/fixtures/personas';
import { organizations } from '@vitest-harness/fixtures/entities';

const createChainableMock = (data: unknown, error: unknown = null) => {
  const mockResult = { data, error };
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(mockResult),
    maybeSingle: vi.fn().mockResolvedValue(mockResult),
    then: (cb: (val: { data: unknown; error: unknown }) => void) => Promise.resolve(mockResult).then(cb),
  };
};

describe('partsConsumersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no consumers exist', async () => {
    const mockFrom = createChainableMock([], null);
    vi.mocked(supabase.from).mockReturnValue(mockFrom as never);

    const result = await getPartsConsumers(organizations.acme.id);

    expect(result).toEqual([]);
    expect(supabase.from).toHaveBeenCalledWith('parts_consumers');
  });

  it('returns true when user is a parts consumer', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { user_id: personas.technician.id },
        error: null,
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockChain as never);

    const result = await isUserPartsConsumer(
      organizations.acme.id,
      personas.technician.id,
    );

    expect(result).toBe(true);
  });

  it('returns false when user is not a parts consumer', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockChain as never);

    const result = await isUserPartsConsumer(
      organizations.acme.id,
      personas.viewer.id,
    );

    expect(result).toBe(false);
  });

  it('adds a parts consumer', async () => {
    const newConsumer = {
      organization_id: organizations.acme.id,
      user_id: personas.technician.id,
      assigned_by: personas.admin.id,
      assigned_at: '2024-01-15T10:00:00Z',
    };

    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newConsumer, error: null }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockChain as never);

    const result = await addPartsConsumer(
      organizations.acme.id,
      personas.technician.id,
      personas.admin.id,
    );

    expect(result).toEqual(newConsumer);
  });

  it('removes a parts consumer', async () => {
    const mockChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (cb: (val: { error: null }) => void) => Promise.resolve({ error: null }).then(cb),
    };

    vi.mocked(supabase.from).mockReturnValue(mockChain as never);

    await expect(
      removePartsConsumer(organizations.acme.id, personas.technician.id),
    ).resolves.not.toThrow();
  });
});
