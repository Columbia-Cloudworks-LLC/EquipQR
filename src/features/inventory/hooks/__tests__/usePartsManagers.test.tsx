/**
 * usePartsManagers Hook Tests
 *
 * Tests for the React Query hooks that manage organization-level parts managers.
 * These tests validate permission checks, data fetching, and mutation behaviors.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

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
} from '../usePartsManagers';
import { personas } from '@/test/fixtures/personas';
import { organizations } from '@/test/fixtures/entities';

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

// Mock toast implementation
const mockToast = vi.fn();

describe('usePartsManagers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: personas.admin.id, email: personas.admin.email },
      session: { user: { id: personas.admin.id } },
      isLoading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    vi.mocked(useAppToast).mockReturnValue({
      toast: mockToast,
    } as unknown as ReturnType<typeof useAppToast>);
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

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockManagers);
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

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

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

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(false);
    });

    it('uses current user id when no userId is provided', async () => {
      vi.mocked(isUserPartsManager).mockResolvedValue(true);

      const { result } = renderHook(
        () => useIsPartsManager(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

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

/**
 * User Journey Tests: Parts Manager Workflow
 */
describe('Parts Manager User Journeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAppToast).mockReturnValue({
      toast: mockToast,
    } as unknown as ReturnType<typeof useAppToast>);
  });

  /**
   * User Story: As an Organization Admin, I want to grant a team member
   * parts management permissions so they can maintain inventory.
   */
  describe('Admin grants parts manager permissions', () => {
    it('admin promotes a technician to parts manager', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: personas.admin.id, email: personas.admin.email },
        session: { user: { id: personas.admin.id } },
        isLoading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      } as unknown as ReturnType<typeof useAuth>);

      vi.mocked(addPartsManager).mockResolvedValue({
        organization_id: organizations.acme.id,
        user_id: personas.technician.id,
        assigned_by: personas.admin.id,
        assigned_at: new Date().toISOString(),
      });

      const { result } = renderHook(
        () => useAddPartsManager(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({
        organizationId: organizations.acme.id,
        userId: personas.technician.id,
      });

      expect(addPartsManager).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Parts manager added' })
      );
    });
  });

  /**
   * User Story: As a Technician, I want to check if I have parts manager
   * permissions so I know what actions I can take.
   */
  describe('Technician checks their parts manager status', () => {
    it('technician without parts manager role sees false', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: personas.technician.id, email: personas.technician.email },
        session: { user: { id: personas.technician.id } },
        isLoading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      } as unknown as ReturnType<typeof useAuth>);

      vi.mocked(isUserPartsManager).mockResolvedValue(false);

      const { result } = renderHook(
        () => useIsPartsManager(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBe(false);
      });
    });

    it('technician with parts manager role sees true', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: personas.technician.id, email: personas.technician.email },
        session: { user: { id: personas.technician.id } },
        isLoading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      } as unknown as ReturnType<typeof useAuth>);

      vi.mocked(isUserPartsManager).mockResolvedValue(true);

      const { result } = renderHook(
        () => useIsPartsManager(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBe(true);
      });
    });
  });

  /**
   * User Story: As an Organization Admin, I want to view all parts managers
   * so I can audit who has inventory management access.
   */
  describe('Admin views all parts managers', () => {
    it('admin sees list of all parts managers with details', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: personas.admin.id, email: personas.admin.email },
        session: { user: { id: personas.admin.id } },
        isLoading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      } as unknown as ReturnType<typeof useAuth>);

      const mockManagers = [
        {
          organization_id: organizations.acme.id,
          user_id: personas.teamManager.id,
          assigned_by: personas.admin.id,
          assigned_at: '2024-01-15T10:00:00Z',
          userName: personas.teamManager.name,
          userEmail: personas.teamManager.email,
          assignedByName: personas.admin.name,
        },
        {
          organization_id: organizations.acme.id,
          user_id: personas.technician.id,
          assigned_by: personas.admin.id,
          assigned_at: '2024-01-16T10:00:00Z',
          userName: personas.technician.name,
          userEmail: personas.technician.email,
          assignedByName: personas.admin.name,
        },
      ];

      vi.mocked(getPartsManagers).mockResolvedValue(mockManagers);

      const { result } = renderHook(
        () => usePartsManagers(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.length).toBe(2);
      expect(result.current.data?.[0].userName).toBe(personas.teamManager.name);
      expect(result.current.data?.[1].userName).toBe(personas.technician.name);
    });
  });

  /**
   * User Story: As an Organization Admin, I want to revoke a user's parts
   * manager status when they change roles or leave.
   */
  describe('Admin revokes parts manager permissions', () => {
    it('admin removes a technician from parts managers', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: personas.admin.id, email: personas.admin.email },
        session: { user: { id: personas.admin.id } },
        isLoading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      } as unknown as ReturnType<typeof useAuth>);

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
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Parts manager removed' })
      );
    });
  });
});
