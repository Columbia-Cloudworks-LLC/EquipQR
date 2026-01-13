/**
 * Tests for useOwnershipTransfer hooks
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

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
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
  usePendingTransferRequests,
  useInitiateTransfer,
  useAcceptTransfer,
  useRejectTransfer,
  useCancelTransfer,
} from './useOwnershipTransfer';

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

describe('useOwnershipTransfer hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('usePendingTransferRequests', () => {
    it('should fetch pending transfer requests', async () => {
      const mockTransfers = [
        {
          id: 'transfer-1',
          organization_id: 'org-1',
          organization_name: 'Test Org',
          from_user_id: 'user-1',
          from_user_name: 'John Doe',
          to_user_id: 'test-user-id',
          to_user_name: 'Jane Doe',
          transfer_reason: 'Leaving company',
          created_at: '2024-01-01T00:00:00Z',
          expires_at: '2024-01-08T00:00:00Z',
          is_incoming: true,
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockTransfers,
        error: null,
      } as never);

      const { result } = renderHook(() => usePendingTransferRequests(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockTransfers);
      expect(supabase.rpc).toHaveBeenCalledWith('get_pending_transfer_requests');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      } as never);

      const { result } = renderHook(() => usePendingTransferRequests(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useInitiateTransfer', () => {
    it('should initiate a transfer request successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: true,
          transfer_id: 'new-transfer-id',
          message: 'Transfer request sent to Jane Doe',
        },
        error: null,
      } as never);

      const { result } = renderHook(() => useInitiateTransfer(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        organizationId: 'org-1',
        toUserId: 'user-2',
        transferReason: 'Leaving company',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('initiate_ownership_transfer', {
        p_organization_id: 'org-1',
        p_to_user_id: 'user-2',
        p_transfer_reason: 'Leaving company',
      });
    });

    it('should handle initiation failure', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Only the current owner can transfer ownership',
        },
        error: null,
      } as never);

      const { result } = renderHook(() => useInitiateTransfer(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          organizationId: 'org-1',
          toUserId: 'user-2',
        })
      ).rejects.toThrow('Only the current owner can transfer ownership');
    });
  });

  describe('useAcceptTransfer', () => {
    it('should accept a transfer request successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: true,
          message: 'You are now the owner of Test Org',
          new_personal_org_id: 'new-org-id',
        },
        error: null,
      } as never);

      const { result } = renderHook(() => useAcceptTransfer(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        transferId: 'transfer-1',
        departingOwnerRole: 'admin',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('respond_to_ownership_transfer', {
        p_transfer_id: 'transfer-1',
        p_accept: true,
        p_departing_owner_role: 'admin',
        p_response_reason: null,
      });

      // Should navigate to refresh
      expect(mockNavigate).toHaveBeenCalledWith(0);
    });
  });

  describe('useRejectTransfer', () => {
    it('should reject a transfer request successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Transfer request declined',
        },
        error: null,
      } as never);

      const { result } = renderHook(() => useRejectTransfer(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        transferId: 'transfer-1',
        responseReason: 'Not interested',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('respond_to_ownership_transfer', {
        p_transfer_id: 'transfer-1',
        p_accept: false,
        p_departing_owner_role: 'admin',
        p_response_reason: 'Not interested',
      });
    });
  });

  describe('useCancelTransfer', () => {
    it('should cancel a transfer request successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Transfer request cancelled',
        },
        error: null,
      } as never);

      const { result } = renderHook(() => useCancelTransfer(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        transferId: 'transfer-1',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('cancel_ownership_transfer', {
        p_transfer_id: 'transfer-1',
      });
    });
  });
});
