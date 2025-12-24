import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import { QueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useOrganizationMembers, useUpdateMemberRole, useRemoveMember } from '@/features/organization/hooks/useOrganizationMembers';

// Mock dependencies
vi.mock('@/integrations/supabase/client', async () => {
  const { createMockSupabaseClient } = await import('@/test/utils/mock-supabase');
  return { supabase: createMockSupabaseClient() };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));


// Import mocked modules for assertions
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MembersProbe = ({ organizationId }: { organizationId: string }) => {
  const { data, isLoading, error } = useOrganizationMembers(organizationId);

  return (
    <div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="has-error">{(error ? 'true' : 'false')}</div>
      <div data-testid="member-count">{data?.length || 0}</div>
      {data?.map((member, index) => (
        <div key={member.id} data-testid={`member-${index}`}>
          {member.name} ({member.role})
        </div>
      ))}
    </div>
  );
};

type UpdateRoleVariables = { memberId: string; newRole: 'admin' | 'member' };
type UpdateRoleMutation = UseMutationResult<unknown, unknown, UpdateRoleVariables, unknown>;

const UpdateRoleProbe = ({ organizationId, onReady }: { organizationId: string; onReady?: (mutation: UpdateRoleMutation) => void }) => {
  const mutation = useUpdateMemberRole(organizationId) as UpdateRoleMutation;
  
  React.useEffect(() => {
    if (onReady) {
      onReady(mutation);
    }
  }, [mutation, onReady]);

  return (
    <div>
      <div data-testid="update-pending">{mutation.isPending.toString()}</div>
      <div data-testid="update-success">{mutation.isSuccess.toString()}</div>
      <div data-testid="update-error">{mutation.isError.toString()}</div>
    </div>
  );
};

type RemoveMemberMutation = UseMutationResult<unknown, unknown, string, unknown>;

const RemoveMemberProbe = ({ organizationId, onReady }: { organizationId: string; onReady?: (mutation: RemoveMemberMutation) => void }) => {
  const mutation = useRemoveMember(organizationId) as RemoveMemberMutation;
  
  React.useEffect(() => {
    if (onReady) {
      onReady(mutation);
    }
  }, [mutation, onReady]);

  return (
    <div>
      <div data-testid="remove-pending">{mutation.isPending.toString()}</div>
      <div data-testid="remove-success">{mutation.isSuccess.toString()}</div>
      <div data-testid="remove-error">{mutation.isError.toString()}</div>
    </div>
  );
};

describe('useOrganizationMembers', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let invalidateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockRestore();
    invalidateSpy.mockRestore();
  });

  describe('useOrganizationMembers', () => {
    it('should fetch and display organization members successfully', async () => {
      const mockMembersData = [
        {
          user_id: 'u1',
          role: 'admin',
          status: 'active',
          joined_date: '2024-01-01T00:00:00Z',
          profiles: { id: 'u1', name: 'Alice Smith' }
        }
      ];

      // Mock successful response
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockMembersData,
          error: null
        })
      } as unknown as ReturnType<typeof supabase.from>);

      render(<MembersProbe organizationId="org-1" />);

      // Initially loading
      expect(screen.getByTestId('is-loading')).toHaveTextContent('true');

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });

      // Verify data is displayed
      expect(screen.getByTestId('has-error')).toHaveTextContent('false');
      expect(screen.getByTestId('member-count')).toHaveTextContent('1');
      expect(screen.getByTestId('member-0')).toHaveTextContent('Alice Smith (admin)');

      // Verify Supabase was called correctly
      expect(supabase.from).toHaveBeenCalledWith('organization_members');
    });

    it('should handle fetch error', async () => {
      const mockError = { message: 'Database connection failed' };

      // Mock error response
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      } as unknown as ReturnType<typeof supabase.from>);

      render(<MembersProbe organizationId="org-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });

      // Verify error state
      expect(screen.getByTestId('has-error')).toHaveTextContent('true');
      expect(screen.getByTestId('member-count')).toHaveTextContent('0');

      // Verify console error was called (uses logger format with emoji prefix)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '🚨 Error fetching organization members',
        mockError
      );
    });

    it('should show loading state', async () => {
      let resolveQuery: ((value: { data: unknown; error: unknown }) => void) | undefined;
      const queryPromise = new Promise<{ data: unknown; error: unknown }>((resolve) => {
        resolveQuery = resolve;
      });

      // Mock deferred resolution
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(queryPromise)
      } as unknown as ReturnType<typeof supabase.from>);

      render(<MembersProbe organizationId="org-1" />);

      // Verify loading state
      expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
      expect(screen.getByTestId('member-count')).toHaveTextContent('0');

      // Resolve with data
      resolveQuery!({ data: [], error: null });

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
    });

    it('should handle component unmount during loading', async () => {
      let resolveQuery: ((value: { data: unknown; error: unknown }) => void) | undefined;
      const queryPromise = new Promise<{ data: unknown; error: unknown }>((resolve) => {
        resolveQuery = resolve;
      });

      // Mock deferred resolution
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(queryPromise)
      } as unknown as ReturnType<typeof supabase.from>);

      const { unmount } = render(<MembersProbe organizationId="org-1" />);

      // Verify initial loading state
      expect(screen.getByTestId('is-loading')).toHaveTextContent('true');

      // Unmount before resolution
      unmount();

      // Resolve after unmount - should not cause errors
      resolveQuery!({ data: [], error: null });

      // Wait to ensure no errors
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('useUpdateMemberRole', () => {
    it('should update member role successfully', async () => {
      const mockUpdatedMember = {
        user_id: 'u1',
        role: 'member',
        status: 'active'
      };

      // Mock successful update
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUpdatedMember,
          error: null
        })
      } as unknown as ReturnType<typeof supabase.from>);

      let capturedMutation: UpdateRoleMutation | undefined;
      
      render(
        <UpdateRoleProbe 
          organizationId="org-1" 
          onReady={(mutation) => { capturedMutation = mutation; }} 
        />
      );

      await waitFor(() => {
        expect(capturedMutation).toBeDefined();
      });

      // Trigger the mutation
      await capturedMutation!.mutateAsync({
        memberId: 'u1',
        newRole: 'member'
      });

      // Verify Supabase was called correctly
      expect(supabase.from).toHaveBeenCalledWith('organization_members');

      // Verify success toast
      expect(toast.success).toHaveBeenCalledWith('Member role updated successfully');

      // Verify success state
      await waitFor(() => {
        expect(screen.getByTestId('update-success')).toHaveTextContent('true');
      });
    });

    it('should handle update role error', async () => {
      const mockError = { message: 'Permission denied' };

      // Mock error response
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      } as unknown as ReturnType<typeof supabase.from>);

      let capturedMutation: UpdateRoleMutation | undefined;
      
      render(
        <UpdateRoleProbe 
          organizationId="org-1" 
          onReady={(mutation) => { capturedMutation = mutation; }} 
        />
      );

      await waitFor(() => {
        expect(capturedMutation).toBeDefined();
      });

      // Trigger the mutation and expect it to reject
      await expect(
        capturedMutation!.mutateAsync({ memberId: 'u1', newRole: 'member' })
      ).rejects.toThrow();

      // Verify error handling (uses logger format with emoji prefix)
      expect(toast.error).toHaveBeenCalledWith('Failed to update member role');
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 Error updating member role', mockError);

      // Verify error state
      await waitFor(() => {
        expect(screen.getByTestId('update-error')).toHaveTextContent('true');
      });
    });
  });

  describe('useRemoveMember', () => {
    it('should remove member successfully with team transfers', async () => {
      const mockUser = { 
        id: 'current-user', 
        email: 'user@test.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00.000Z'
      };
      const mockRpcResult = {
        success: true,
        removed_user_name: 'Bob Johnson',
        teams_transferred: 2
      };

      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock successful RPC call
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockRpcResult,
        error: null
      });

      let capturedMutation: RemoveMemberMutation | undefined;
      
      render(
        <RemoveMemberProbe 
          organizationId="org-1" 
          onReady={(mutation) => { capturedMutation = mutation; }} 
        />
      );

      await waitFor(() => {
        expect(capturedMutation).toBeDefined();
      });

      // Trigger the mutation
      await capturedMutation!.mutateAsync('u1');

      // Verify RPC was called correctly
      expect(supabase.rpc).toHaveBeenCalledWith('remove_organization_member_safely', {
        user_uuid: 'u1',
        org_id: 'org-1',
        removed_by: 'current-user'
      });

      // Verify success toast with team transfer details
      expect(toast.success).toHaveBeenCalledWith(
        'Bob Johnson was removed successfully. Team management for 2 team(s) was transferred to the organization owner.'
      );

      // Verify success state
      await waitFor(() => {
        expect(screen.getByTestId('remove-success')).toHaveTextContent('true');
      });
    });

    it('should handle RPC error response', async () => {
      const mockUser = { 
        id: 'current-user', 
        email: 'user@test.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00.000Z'
      };
      const mockRpcResult = {
        success: false,
        error: 'Cannot remove the last owner'
      };

      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock RPC error result
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockRpcResult,
        error: null
      });

      let capturedMutation: RemoveMemberMutation | undefined;
      
      render(
        <RemoveMemberProbe 
          organizationId="org-1" 
          onReady={(mutation) => { capturedMutation = mutation; }} 
        />
      );

      await waitFor(() => {
        expect(capturedMutation).toBeDefined();
      });

      // Trigger the mutation and expect it to reject
      await expect(
        capturedMutation!.mutateAsync('u1')
      ).rejects.toThrow();

      // Verify error toast
      expect(toast.error).toHaveBeenCalledWith('Cannot remove the last owner');

      // Verify error state
      await waitFor(() => {
        expect(screen.getByTestId('remove-error')).toHaveTextContent('true');
      });
    });

    it('should handle authentication error', async () => {
      // Mock no authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      });

      let capturedMutation: RemoveMemberMutation | undefined;
      
      render(
        <RemoveMemberProbe 
          organizationId="org-1" 
          onReady={(mutation) => { capturedMutation = mutation; }} 
        />
      );

      await waitFor(() => {
        expect(capturedMutation).toBeDefined();
      });

      // Trigger the mutation and expect it to reject
      await expect(
        capturedMutation!.mutateAsync('u1')
      ).rejects.toThrow('User not authenticated');

      // Verify error toast
      expect(toast.error).toHaveBeenCalledWith('User not authenticated');

      // Verify error state
      await waitFor(() => {
        expect(screen.getByTestId('remove-error')).toHaveTextContent('true');
      });
    });
  });
});