/**
 * useAlternateGroups Hook Tests
 *
 * Tests for React Query hooks that manage alternate part groups.
 * Alternate groups define interchangeable parts that can substitute for each other.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import {
  setupAuthAndToastMocks,
  waitForHookSuccess,
  expectHookData,
} from '@vitest-harness/utils/hook-test-helpers';
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

vi.mock('@/features/inventory/services/partAlternatesService', () => ({
  getAlternateGroups: vi.fn(),
  getAlternateGroupById: vi.fn(),
  createAlternateGroup: vi.fn(),
  updateAlternateGroup: vi.fn(),
  deleteAlternateGroup: vi.fn(),
  addInventoryItemToGroup: vi.fn(),
  removeGroupMember: vi.fn(),
  createPartIdentifier: vi.fn(),
  addIdentifierToGroup: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';
import { useAppToast } from '@/hooks/useAppToast';
import {
  getAlternateGroups,
  getAlternateGroupById,
  createAlternateGroup,
  updateAlternateGroup,
  deleteAlternateGroup,
  addInventoryItemToGroup,
  removeGroupMember,
  createPartIdentifier,
  addIdentifierToGroup,
} from '@/features/inventory/services/partAlternatesService';
import type { AlternateGroupWithMembers } from '@/features/inventory/services/partAlternatesService';
import {
  useAlternateGroups,
  useAlternateGroup,
  useCreateAlternateGroup,
  useUpdateAlternateGroup,
  useDeleteAlternateGroup,
  useAddInventoryItemToGroup,
  useAddPartIdentifierToGroup,
  useRemoveGroupMember,
} from './useAlternateGroups';
import { personas } from '@vitest-harness/fixtures/personas';
import { organizations, partAlternateGroups, inventoryItems } from '@vitest-harness/fixtures/entities';

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

describe('useAlternateGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthAndToastMocks(useAuth, useAppToast, mockToast);
  });

  describe('useAlternateGroups hook', () => {
    it('fetches all alternate groups for an organization', async () => {
      const mockGroups = Object.values(partAlternateGroups);
      vi.mocked(getAlternateGroups).mockResolvedValue(mockGroups);

      const { result } = renderHook(
        () => useAlternateGroups(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitForHookSuccess(result);
      expectHookData(result, mockGroups);
      expect(getAlternateGroups).toHaveBeenCalledWith(organizations.acme.id);
    });

    it('returns empty array when organization is undefined', async () => {
      const { result } = renderHook(
        () => useAlternateGroups(undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(getAlternateGroups).not.toHaveBeenCalled();
    });

    it('handles fetch errors', async () => {
      vi.mocked(getAlternateGroups).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () => useAlternateGroups(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useAlternateGroup hook', () => {
    it('fetches a single group with members', async () => {
      const mockGroup: AlternateGroupWithMembers = {
        ...partAlternateGroups.oilFilterGroup,
        members: [
          {
            id: 'member-1',
            group_id: partAlternateGroups.oilFilterGroup.id,
            part_identifier_id: null,
            inventory_item_id: inventoryItems.oilFilter.id,
            is_primary: false,
            notes: null,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      };
      vi.mocked(getAlternateGroupById).mockResolvedValue(mockGroup);

      const { result } = renderHook(
        () => useAlternateGroup(organizations.acme.id, partAlternateGroups.oilFilterGroup.id),
        { wrapper: createWrapper() }
      );

      await waitForHookSuccess(result);
      expectHookData(result, mockGroup);
      expect(getAlternateGroupById).toHaveBeenCalledWith(
        organizations.acme.id,
        partAlternateGroups.oilFilterGroup.id
      );
    });

    it('does not fetch when groupId is undefined', async () => {
      const { result } = renderHook(
        () => useAlternateGroup(organizations.acme.id, undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(getAlternateGroupById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateAlternateGroup mutation', () => {
    it('creates a new alternate group', async () => {
      const newGroup = {
        id: 'new-group-id',
        organization_id: organizations.acme.id,
        name: 'New Filter Group',
        description: 'Test group',
        status: 'unverified' as const,
        notes: null,
        evidence_url: null,
        created_by: personas.admin.id,
        verified_by: null,
        verified_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(createAlternateGroup).mockResolvedValue(newGroup);

      const { result } = renderHook(
        () => useCreateAlternateGroup(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({
        organizationId: organizations.acme.id,
        data: { name: 'New Filter Group', description: 'Test group' },
      });

      expect(createAlternateGroup).toHaveBeenCalledWith(organizations.acme.id, {
        name: 'New Filter Group',
        description: 'Test group',
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Alternate group created',
        description: '"New Filter Group" has been created.',
      });
    });

    it('shows error toast on failure', async () => {
      vi.mocked(createAlternateGroup).mockRejectedValue(
        new Error('Group name already exists')
      );

      const { result } = renderHook(
        () => useCreateAlternateGroup(),
        { wrapper: createWrapper() }
      );

      await expect(
        result.current.mutateAsync({
          organizationId: organizations.acme.id,
          data: { name: 'Duplicate Name' },
        })
      ).rejects.toThrow();

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error creating alternate group',
        description: 'Group name already exists',
        variant: 'error',
      });
    });
  });

  describe('useUpdateAlternateGroup mutation', () => {
    it('updates an existing group', async () => {
      const updatedGroup = {
        ...partAlternateGroups.oilFilterGroup,
        name: 'Updated Name',
        status: 'verified' as const,
      };

      vi.mocked(updateAlternateGroup).mockResolvedValue(updatedGroup);

      const { result } = renderHook(
        () => useUpdateAlternateGroup(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({
        organizationId: organizations.acme.id,
        groupId: partAlternateGroups.oilFilterGroup.id,
        data: { name: 'Updated Name', status: 'verified' },
      });

      expect(updateAlternateGroup).toHaveBeenCalledWith(
        organizations.acme.id,
        partAlternateGroups.oilFilterGroup.id,
        { name: 'Updated Name', status: 'verified' }
      );

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Alternate group updated',
        description: '"Updated Name" has been updated.',
      });
    });
  });

  describe('useDeleteAlternateGroup mutation', () => {
    it('deletes a group', async () => {
      vi.mocked(deleteAlternateGroup).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useDeleteAlternateGroup(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({
        organizationId: organizations.acme.id,
        groupId: partAlternateGroups.oilFilterGroup.id,
      });

      expect(deleteAlternateGroup).toHaveBeenCalledWith(
        organizations.acme.id,
        partAlternateGroups.oilFilterGroup.id
      );

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Alternate group deleted',
        description: 'The alternate group has been removed.',
      });
    });

    it('shows error toast on delete failure', async () => {
      vi.mocked(deleteAlternateGroup).mockRejectedValue(
        new Error('Group has linked items')
      );

      const { result } = renderHook(
        () => useDeleteAlternateGroup(),
        { wrapper: createWrapper() }
      );

      await expect(
        result.current.mutateAsync({
          organizationId: organizations.acme.id,
          groupId: partAlternateGroups.oilFilterGroup.id,
        })
      ).rejects.toThrow();

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error deleting alternate group',
        description: 'Group has linked items',
        variant: 'error',
      });
    });
  });

  describe('useAddInventoryItemToGroup mutation', () => {
    it('adds an inventory item to a group', async () => {
      vi.mocked(addInventoryItemToGroup).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useAddInventoryItemToGroup(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({
        organizationId: organizations.acme.id,
        groupId: partAlternateGroups.oilFilterGroup.id,
        inventoryItemId: inventoryItems.oilFilter.id,
      });

      expect(addInventoryItemToGroup).toHaveBeenCalledWith(
        partAlternateGroups.oilFilterGroup.id,
        inventoryItems.oilFilter.id,
        false
      );

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Item added to group',
        description: 'The inventory item has been added to the alternate group.',
      });
    });

    it('can mark item as primary', async () => {
      vi.mocked(addInventoryItemToGroup).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useAddInventoryItemToGroup(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({
        organizationId: organizations.acme.id,
        groupId: partAlternateGroups.oilFilterGroup.id,
        inventoryItemId: inventoryItems.oilFilter.id,
        isPrimary: true,
      });

      expect(addInventoryItemToGroup).toHaveBeenCalledWith(
        partAlternateGroups.oilFilterGroup.id,
        inventoryItems.oilFilter.id,
        true
      );
    });
  });

  describe('useAddPartIdentifierToGroup mutation', () => {
    it('creates an identifier and adds it to a group', async () => {
      const newIdentifier = {
        id: 'ident-new',
        organization_id: organizations.acme.id,
        identifier_type: 'oem' as const,
        raw_value: 'CAT-123',
        norm_value: 'cat-123',
        inventory_item_id: null,
        manufacturer: 'Caterpillar',
        notes: null,
        created_by: personas.admin.id,
        created_at: new Date().toISOString(),
      };

      vi.mocked(createPartIdentifier).mockResolvedValue(newIdentifier);
      vi.mocked(addIdentifierToGroup).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useAddPartIdentifierToGroup(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({
        organizationId: organizations.acme.id,
        groupId: partAlternateGroups.oilFilterGroup.id,
        identifierType: 'oem',
        rawValue: 'CAT-123',
        manufacturer: 'Caterpillar',
      });

      expect(createPartIdentifier).toHaveBeenCalledWith(organizations.acme.id, {
        identifier_type: 'oem',
        raw_value: 'CAT-123',
        manufacturer: 'Caterpillar',
        inventory_item_id: undefined,
      });

      expect(addIdentifierToGroup).toHaveBeenCalledWith(
        partAlternateGroups.oilFilterGroup.id,
        'ident-new'
      );

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Part number added',
        description: 'The part number has been added to the alternate group.',
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
        () => useAddPartIdentifierToGroup(),
        { wrapper: createWrapper() }
      );

      await expect(
        result.current.mutateAsync({
          organizationId: organizations.acme.id,
          groupId: partAlternateGroups.oilFilterGroup.id,
          identifierType: 'oem',
          rawValue: 'CAT-123',
        })
      ).rejects.toThrow('User not authenticated');
    });
  });

  describe('useRemoveGroupMember mutation', () => {
    it('removes a member from a group', async () => {
      vi.mocked(removeGroupMember).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useRemoveGroupMember(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({
        organizationId: organizations.acme.id,
        groupId: partAlternateGroups.oilFilterGroup.id,
        memberId: 'member-1',
      });

      expect(removeGroupMember).toHaveBeenCalledWith('member-1');

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Member removed',
        description: 'The item has been removed from the alternate group.',
      });
    });
  });
});
