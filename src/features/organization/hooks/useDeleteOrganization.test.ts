/**
 * Tests for useDeleteOrganization hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

import { supabase } from '@/integrations/supabase/client';
import {
  useOrganizationDeletionStats,
  useDeleteOrganization,
} from './useDeleteOrganization';

// Create a wrapper component for the hooks
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useDeleteOrganization hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useOrganizationDeletionStats', () => {
    it('should fetch deletion stats', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: true,
          member_count: 2,
          equipment_count: 10,
          work_order_count: 5,
          team_count: 1,
          inventory_count: 20,
          can_delete: false,
        },
        error: null,
      } as never);

      const { result } = renderHook(
        () => useOrganizationDeletionStats('org-1', true),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        success: true,
        member_count: 2,
        equipment_count: 10,
        work_order_count: 5,
        team_count: 1,
        inventory_count: 20,
        can_delete: false,
      });

      expect(supabase.rpc).toHaveBeenCalledWith('get_organization_deletion_stats', {
        p_organization_id: 'org-1',
      });
    });

    it('should not fetch when disabled', () => {
      renderHook(
        () => useOrganizationDeletionStats('org-1', false),
        { wrapper: createWrapper() }
      );

      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('useDeleteOrganization', () => {
    it('should delete organization successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Organization "Test Org" has been deleted',
          deleted_stats: {
            equipment: 10,
            work_orders: 5,
            members_removed: 0,
          },
        },
        error: null,
      } as never);

      const { result } = renderHook(() => useDeleteOrganization(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        organizationId: 'org-1',
        confirmationName: 'Test Org',
        force: false,
      });

      expect(supabase.rpc).toHaveBeenCalledWith('delete_organization', {
        p_organization_id: 'org-1',
        p_confirmation_name: 'Test Org',
        p_force: false,
      });

      // Should navigate to dashboard
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should handle deletion failure when org has members', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Cannot delete organization with active members. Remove all members first or use force option.',
          member_count: 3,
        },
        error: null,
      } as never);

      const { result } = renderHook(() => useDeleteOrganization(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          organizationId: 'org-1',
          confirmationName: 'Test Org',
        })
      ).rejects.toThrow('Cannot delete organization with active members');
    });

    it('should handle name mismatch error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Organization name does not match',
        },
        error: null,
      } as never);

      const { result } = renderHook(() => useDeleteOrganization(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          organizationId: 'org-1',
          confirmationName: 'Wrong Name',
        })
      ).rejects.toThrow('Organization name does not match');
    });

    it('should force delete when specified', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Organization deleted',
        },
        error: null,
      } as never);

      const { result } = renderHook(() => useDeleteOrganization(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        organizationId: 'org-1',
        confirmationName: 'Test Org',
        force: true,
      });

      expect(supabase.rpc).toHaveBeenCalledWith('delete_organization', {
        p_organization_id: 'org-1',
        p_confirmation_name: 'Test Org',
        p_force: true,
      });
    });
  });
});
