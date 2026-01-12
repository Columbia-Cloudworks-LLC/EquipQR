/**
 * Parts Managers Service Tests
 *
 * Tests for the organization-level parts managers service.
 * Parts managers can create, edit, and manage all inventory items.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
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
  getPartsManagers,
  isUserPartsManager,
  addPartsManager,
  removePartsManager,
} from '../partsManagersService';
import { personas } from '@/test/fixtures/personas';
import { organizations } from '@/test/fixtures/entities';

// Helper to create a chainable mock
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

describe('partsManagersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPartsManagers', () => {
    it('returns empty array when no managers exist', async () => {
      const mockFrom = createChainableMock([], null);
      vi.mocked(supabase.from).mockReturnValue(mockFrom as never);

      const result = await getPartsManagers(organizations.acme.id);

      expect(result).toEqual([]);
      expect(supabase.from).toHaveBeenCalledWith('parts_managers');
    });

    it('returns managers with user details', async () => {
      const mockManagers = [
        {
          organization_id: organizations.acme.id,
          user_id: personas.teamManager.id,
          assigned_by: personas.admin.id,
          assigned_at: '2024-01-15T10:00:00Z',
        },
      ];

      const mockProfiles = [
        { id: personas.teamManager.id, name: personas.teamManager.name, email: personas.teamManager.email },
        { id: personas.admin.id, name: personas.admin.name, email: personas.admin.email },
      ];

      // First call to parts_managers
      const managersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockManagers, error: null }),
      };

      // Second call to profiles
      const profilesChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(managersChain as never)
        .mockReturnValueOnce(profilesChain as never);

      const result = await getPartsManagers(organizations.acme.id);

      expect(result.length).toBe(1);
      expect(result[0].userName).toBe(personas.teamManager.name);
      expect(result[0].assignedByName).toBe(personas.admin.name);
    });

    it('throws error on database failure', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      await expect(getPartsManagers(organizations.acme.id)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('isUserPartsManager', () => {
    it('returns true when user is a parts manager', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { user_id: personas.teamManager.id },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await isUserPartsManager(
        organizations.acme.id,
        personas.teamManager.id
      );

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('parts_managers');
    });

    it('returns false when user is not a parts manager', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await isUserPartsManager(
        organizations.acme.id,
        personas.technician.id
      );

      expect(result).toBe(false);
    });

    it('returns false on database error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Query failed' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await isUserPartsManager(
        organizations.acme.id,
        personas.technician.id
      );

      expect(result).toBe(false);
    });
  });

  describe('addPartsManager', () => {
    it('successfully adds a parts manager', async () => {
      const newManager = {
        organization_id: organizations.acme.id,
        user_id: personas.technician.id,
        assigned_by: personas.admin.id,
        assigned_at: '2024-01-15T10:00:00Z',
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: newManager,
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await addPartsManager(
        organizations.acme.id,
        personas.technician.id,
        personas.admin.id
      );

      expect(result).toEqual(newManager);
      expect(supabase.from).toHaveBeenCalledWith('parts_managers');
      expect(mockChain.insert).toHaveBeenCalledWith({
        organization_id: organizations.acme.id,
        user_id: personas.technician.id,
        assigned_by: personas.admin.id,
      });
    });

    it('throws error on duplicate assignment', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'duplicate key value violates unique constraint' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      await expect(
        addPartsManager(
          organizations.acme.id,
          personas.technician.id,
          personas.admin.id
        )
      ).rejects.toThrow('duplicate key value violates unique constraint');
    });
  });

  describe('removePartsManager', () => {
    it('successfully removes a parts manager', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (cb: (val: { error: null }) => void) => Promise.resolve({ error: null }).then(cb),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      await expect(
        removePartsManager(organizations.acme.id, personas.technician.id)
      ).resolves.not.toThrow();

      expect(supabase.from).toHaveBeenCalledWith('parts_managers');
    });

    it('throws error on database failure', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (cb: (val: { error: { message: string } }) => void) =>
          Promise.resolve({ error: { message: 'Delete failed' } }).then(cb),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      await expect(
        removePartsManager(organizations.acme.id, personas.technician.id)
      ).rejects.toThrow('Delete failed');
    });
  });
});

describe('Parts Manager Permission Logic', () => {
  /**
   * User Story: As an Admin, I want to assign parts managers so that
   * specific team members can manage inventory without full admin access.
   */
  describe('User Story: Admin assigns parts managers', () => {
    it('admin can assign any organization member as a parts manager', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            organization_id: organizations.acme.id,
            user_id: personas.technician.id,
            assigned_by: personas.admin.id,
            assigned_at: new Date().toISOString(),
          },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await addPartsManager(
        organizations.acme.id,
        personas.technician.id,
        personas.admin.id
      );

      expect(result.user_id).toBe(personas.technician.id);
      expect(result.assigned_by).toBe(personas.admin.id);
    });
  });

  /**
   * User Story: As a Parts Manager, I want to see that I have been granted
   * inventory management permissions.
   */
  describe('User Story: Parts manager verifies their status', () => {
    it('parts manager can confirm their elevated permissions', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { user_id: personas.teamManager.id },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const isManager = await isUserPartsManager(
        organizations.acme.id,
        personas.teamManager.id
      );

      expect(isManager).toBe(true);
    });

    it('regular member is not a parts manager', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const isManager = await isUserPartsManager(
        organizations.acme.id,
        personas.viewer.id
      );

      expect(isManager).toBe(false);
    });
  });

  /**
   * User Story: As an Admin, I want to remove a parts manager when they
   * no longer need inventory management access.
   */
  describe('User Story: Admin removes parts manager', () => {
    it('admin can revoke parts manager status', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (cb: (val: { error: null }) => void) => Promise.resolve({ error: null }).then(cb),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      await removePartsManager(organizations.acme.id, personas.technician.id);

      expect(mockChain.delete).toHaveBeenCalled();
    });
  });
});
