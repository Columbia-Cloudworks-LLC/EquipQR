/**
 * Tests for useLeaveOrganization hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
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
import { useLeaveOrganization } from './useLeaveOrganization';

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

describe('useLeaveOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should leave organization successfully', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: {
        success: true,
        message: 'You have left Test Org',
        departure_queue_id: 'queue-1',
      },
      error: null,
    } as never);

    const { result } = renderHook(() => useLeaveOrganization(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      organizationId: 'org-1',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('leave_organization', {
      p_organization_id: 'org-1',
    });

    // Should navigate to dashboard
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('should handle leave failure when user is owner', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: {
        success: false,
        error: 'Owners cannot leave the organization. Transfer ownership first.',
      },
      error: null,
    } as never);

    const { result } = renderHook(() => useLeaveOrganization(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        organizationId: 'org-1',
      })
    ).rejects.toThrow('Owners cannot leave the organization. Transfer ownership first.');
  });

  it('should handle database errors', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    } as never);

    const { result } = renderHook(() => useLeaveOrganization(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        organizationId: 'org-1',
      })
    ).rejects.toBeDefined();
  });
});
