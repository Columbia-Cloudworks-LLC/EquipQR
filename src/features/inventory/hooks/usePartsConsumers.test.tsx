import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRouterQueryClientWrapper } from '@vitest-harness/utils/query-client-wrapper';
import {
  setupAuthAndToastMocks,
  waitForHookSuccess,
} from '@vitest-harness/utils/hook-test-helpers';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: vi.fn(),
}));

vi.mock('@/features/inventory/services/partsConsumersService', () => ({
  getPartsConsumers: vi.fn(),
  isUserPartsConsumer: vi.fn(),
  addPartsConsumer: vi.fn(),
  removePartsConsumer: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';
import { useAppToast } from '@/hooks/useAppToast';
import {
  getPartsConsumers,
  isUserPartsConsumer,
  addPartsConsumer,
  removePartsConsumer,
} from '@/features/inventory/services/partsConsumersService';
import {
  usePartsConsumers,
  useIsPartsConsumer,
  useAddPartsConsumer,
  useRemovePartsConsumer,
} from './usePartsConsumers';
import { personas } from '@vitest-harness/fixtures/personas';
import { organizations } from '@vitest-harness/fixtures/entities';

const createWrapper = () => createRouterQueryClientWrapper();
const mockToast = vi.fn();

describe('usePartsConsumers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthAndToastMocks(useAuth, useAppToast, mockToast);
  });

  it('fetches parts consumers for an organization', async () => {
    vi.mocked(getPartsConsumers).mockResolvedValue([
      {
        organization_id: organizations.acme.id,
        user_id: personas.technician.id,
        assigned_by: personas.admin.id,
        assigned_at: '2024-01-15T10:00:00Z',
      },
    ]);

    const { result } = renderHook(
      () => usePartsConsumers(organizations.acme.id),
      { wrapper: createWrapper() },
    );

    await waitForHookSuccess(result);
    expect(result.current.data?.[0].user_id).toBe(personas.technician.id);
  });

  it('checks whether the current user is a parts consumer', async () => {
    vi.mocked(isUserPartsConsumer).mockResolvedValue(true);

    const { result } = renderHook(
      () => useIsPartsConsumer(organizations.acme.id),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toBe(true);
    });
  });

  it('adds a parts consumer', async () => {
    vi.mocked(addPartsConsumer).mockResolvedValue({
      organization_id: organizations.acme.id,
      user_id: personas.technician.id,
      assigned_by: personas.admin.id,
      assigned_at: '2024-01-15T10:00:00Z',
    });

    const { result } = renderHook(() => useAddPartsConsumer(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      organizationId: organizations.acme.id,
      userId: personas.technician.id,
    });

    expect(addPartsConsumer).toHaveBeenCalledWith(
      organizations.acme.id,
      personas.technician.id,
      personas.admin.id,
    );
  });

  it('removes a parts consumer', async () => {
    vi.mocked(removePartsConsumer).mockResolvedValue(undefined);

    const { result } = renderHook(() => useRemovePartsConsumer(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      organizationId: organizations.acme.id,
      userId: personas.technician.id,
    });

    expect(removePartsConsumer).toHaveBeenCalledWith(
      organizations.acme.id,
      personas.technician.id,
    );
  });
});
