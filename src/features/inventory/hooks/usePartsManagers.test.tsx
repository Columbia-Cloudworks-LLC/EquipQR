/**
 * usePartsManagers Hook Tests
 *
 * Tests for the React Query hooks that manage organization-level parts managers.
 * These tests validate permission checks, data fetching, and mutation behaviors.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRouterQueryClientWrapper } from '@vitest-harness/utils/query-client-wrapper';
import {
  setupAuthAndToastMocks,
  waitForHookSuccess,
  expectHookData,
} from '@vitest-harness/utils/hook-test-helpers';

// Mock dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: vi.fn(),
}));

vi.mock('@/features/inventory/services/partsManagersService', () => ({
  getPartsManagers: vi.fn(),
  isUserPartsManager: vi.fn(),
  addPartsManager: vi.fn(),
  removePartsManager: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';
import { useAppToast } from '@/hooks/useAppToast';
import {
  getPartsManagers,
  isUserPartsManager,
  addPartsManager,
  removePartsManager,
} from '@/features/inventory/services/partsManagersService';
import {
  usePartsManagers,
  useIsPartsManager,
  useAddPartsManager,
  useRemovePartsManager,
} from './usePartsManagers';
import { personas } from '@vitest-harness/fixtures/personas';
import { organizations } from '@vitest-harness/fixtures/entities';

const createWrapper = () => createRouterQueryClientWrapper();

// Mock toast implementation
const mockToast = vi.fn();

describe('usePartsManagers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthAndToastMocks(useAuth, useAppToast, mockToast);
  });

  describe('usePartsManagers hook', () => {
    it('fetches parts managers for an organization', async () => {
      const mockManagers = [
        {
          organization_id: organizations.acme.id,
          user_id: personas.teamManager.id,
          assigned_by: personas.admin.id,
          assigned_at: '2024-01-15T10:00:00Z',
          userName: personas.teamManager.name,
          userEmail: personas.teamManager.email,
        },
      ];

      vi.mocked(getPartsManagers).mockResolvedValue(mockManagers);

      const { result } = renderHook(
        () => usePartsManagers(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitForHookSuccess(result);
      expectHookData(result, mockManagers);
      expect(getPartsManagers).toHaveBeenCalledWith(organizations.acme.id);
    });

    it('returns empty array when organization id is undefined', async () => {
      const { result } = renderHook(
        () => usePartsManagers(undefined),
        { wrapper: createWrapper() }
      );

      // Hook should not be enabled
      expect(result.current.isLoading).toBe(false);
      expect(getPartsManagers).not.toHaveBeenCalled();
    });

    it('handles fetch errors gracefully', async () => {
      vi.mocked(getPartsManagers).mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(
        () => usePartsManagers(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useIsPartsManager hook', () => {
    it('returns true when user is a parts manager', async () => {
      vi.mocked(isUserPartsManager).mockResolvedValue(true);

      const { result } = renderHook(
        () => useIsPartsManager(organizations.acme.id, personas.teamManager.id),
        { wrapper: createWrapper() }
      );

      await waitForHookSuccess(result);

      expect(result.current.data).toBe(true);
      expect(isUserPartsManager).toHaveBeenCalledWith(
        organizations.acme.id,
        personas.teamManager.id
      );
    });

    it('returns false when user is not a parts manager', async () => {
      vi.mocked(isUserPartsManager).mockResolvedValue(false);

      const { result } = renderHook(
        () => useIsPartsManager(organizations.acme.id, personas.technician.id),
        { wrapper: createWrapper() }
      );

      await waitForHookSuccess(result);

      expect(result.current.data).toBe(false);
    });

    it('uses current user id when no userId is provided', async () => {
      vi.mocked(isUserPartsManager).mockResolvedValue(true);

      const { result } = renderHook(
        () => useIsPartsManager(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitForHookSuccess(result);

      // Should use the auth user's id (personas.admin.id)
      expect(isUserPartsManager).toHaveBeenCalledWith(
        organizations.acme.id,
        personas.admin.id
      );
    });

    it('does not fetch when organization is undefined', async () => {
      const { result } = renderHook(
        () => useIsPartsManager(undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(isUserPartsManager).not.toHaveBeenCalled();
    });
  });

  describe('useAddPartsManager mutation', () => {
    it('adds a parts manager successfully', async () => {
      const newManager = {
        organization_id: organizations.acme.id,
        user_id: personas.technician.id,
        assigned_by: personas.admin.id,
        assigned_at: '2024-01-15T10:00:00Z',
      };

      vi.mocked(addPartsManager).mockResolvedValue(newManager);

      const { result } = renderHook(
        () => useAddPartsManager(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({
        organizationId: organizations.acme.id,
        userId: personas.technician.id,
      });

      expect(addPartsManager).toHaveBeenCalledWith(
        organizations.acme.id,
        personas.technician.id,
        personas.admin.id
      );

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Parts manager added',
        description: 'The user can now manage all inventory items.',
      });
    });

    it('shows error toast on failure', async () => {
      vi.mocked(addPartsManager).mockRejectedValue(
        new Error('User already a parts manager')
      );

      const { result } = renderHook(
        () => useAddPartsManager(),
        { wrapper: createWrapper() }
      );

      await expect(
        result.current.mutateAsync({
          organizationId: organizations.acme.id,
          userId: personas.technician.id,
        })
      ).rejects.toThrow();

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error adding parts manager',
        description: 'User already a parts manager',
        variant: 'error',
      });
    });

    it('throws error when user is not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        isLoading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      } as unknown as ReturnType<typeof useAuth>);

      const { result } = renderHook(
        () => useAddPartsManager(),
        { wrapper: createWrapper() }
      );

      await expect(
        result.current.mutateAsync({
          organizationId: organizations.acme.id,
          userId: personas.technician.id,
        })
      ).rejects.toThrow('User not authenticated');
    });
  });

  describe('useRemovePartsManager mutation', () => {
    it('removes a parts manager successfully', async () => {
      vi.mocked(removePartsManager).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useRemovePartsManager(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({
        organizationId: organizations.acme.id,
        userId: personas.technician.id,
      });

      expect(removePartsManager).toHaveBeenCalledWith(
        organizations.acme.id,
        personas.technician.id
      );

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Parts manager removed',
        description: 'The user can no longer manage inventory items.',
      });
    });

    it('shows error toast on failure', async () => {
      vi.mocked(removePartsManager).mockRejectedValue(
        new Error('Cannot remove last manager')
      );

      const { result } = renderHook(
        () => useRemovePartsManager(),
        { wrapper: createWrapper() }
      );

      await expect(
        result.current.mutateAsync({
          organizationId: organizations.acme.id,
          userId: personas.technician.id,
        })
      ).rejects.toThrow();

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error removing parts manager',
        description: 'Cannot remove last manager',
        variant: 'error',
      });
    });
  });
});
