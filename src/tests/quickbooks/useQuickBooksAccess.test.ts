/**
 * useQuickBooksAccess Hook Tests
 * 
 * Tests for QuickBooks access permission hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the organization context
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: {
      id: 'org-123',
      name: 'Test Organization',
    },
    isLoading: false,
  })),
}));

// Mock the feature flags
vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: vi.fn(() => true),
}));

// Mock Supabase client
const mockRpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useQuickBooksAccess, useUpdateQuickBooksPermission } from '@/hooks/useQuickBooksAccess';
import { isQuickBooksEnabled } from '@/lib/flags';
import { useOrganization } from '@/contexts/OrganizationContext';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useQuickBooksAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isQuickBooksEnabled).mockReturnValue(true);
    vi.mocked(useOrganization).mockReturnValue({
      currentOrganization: { id: 'org-123', name: 'Test Org' },
      isLoading: false,
    } as ReturnType<typeof useOrganization>);
  });

  it('should return true when user has QuickBooks permission', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    const { result } = renderHook(() => useQuickBooksAccess(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBe(true);
    });

    expect(mockRpc).toHaveBeenCalledWith('get_user_quickbooks_permission', {
      p_organization_id: 'org-123',
    });
  });

  it('should return false when user lacks QuickBooks permission', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    const { result } = renderHook(() => useQuickBooksAccess(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBe(false);
    });
  });

  it('should return false when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Permission denied' } });

    const { result } = renderHook(() => useQuickBooksAccess(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBe(false);
    });
  });

  it('should not fetch when feature is disabled', async () => {
    vi.mocked(isQuickBooksEnabled).mockReturnValue(false);

    renderHook(() => useQuickBooksAccess(), {
      wrapper: createWrapper(),
    });

    // Wait a tick to ensure no query was triggered
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('should not fetch when no organization is available', async () => {
    vi.mocked(useOrganization).mockReturnValue({
      currentOrganization: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useOrganization>);

    renderHook(() => useQuickBooksAccess(), {
      wrapper: createWrapper(),
    });

    // Wait a tick to ensure no query was triggered
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('should use provided organizationId instead of context', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    const { result } = renderHook(() => useQuickBooksAccess('custom-org-456'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBe(true);
    });

    expect(mockRpc).toHaveBeenCalledWith('get_user_quickbooks_permission', {
      p_organization_id: 'custom-org-456',
    });
  });
});

describe('useUpdateQuickBooksPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call the RPC with correct parameters', async () => {
    mockRpc.mockResolvedValue({
      data: [{ success: true, message: 'Permission updated' }],
      error: null,
    });

    const { result } = renderHook(() => useUpdateQuickBooksPermission('org-123'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      targetUserId: 'user-456',
      canManageQuickBooks: true,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockRpc).toHaveBeenCalledWith('update_member_quickbooks_permission', {
      p_organization_id: 'org-123',
      p_target_user_id: 'user-456',
      p_can_manage_quickbooks: true,
    });
  });

  it('should handle RPC errors', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    const { result } = renderHook(() => useUpdateQuickBooksPermission('org-123'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      targetUserId: 'user-456',
      canManageQuickBooks: true,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Database error');
  });

  it('should handle unsuccessful response', async () => {
    mockRpc.mockResolvedValue({
      data: [{ success: false, message: 'User not found' }],
      error: null,
    });

    const { result } = renderHook(() => useUpdateQuickBooksPermission('org-123'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      targetUserId: 'user-456',
      canManageQuickBooks: true,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('User not found');
  });

  it('should handle empty response', async () => {
    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useUpdateQuickBooksPermission('org-123'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      targetUserId: 'user-456',
      canManageQuickBooks: false,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Failed to update permission');
  });
});
