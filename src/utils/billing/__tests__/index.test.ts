import { describe, it, expect } from 'vitest';
import { 
  calculateBilling, 
  isFreeOrganization, 
  hasLicenses, 
  getSlotStatus,
  shouldBlockInvitation,
  BillingState 
} from '../index';
import { RealOrganizationMember } from '@/hooks/useOrganizationMembers';
import { SlotAvailability } from '@/hooks/useOrganizationSlots';

// Mock data helpers
const createMember = (status: 'active' | 'pending' = 'active', role: 'owner' | 'admin' | 'member' = 'member'): RealOrganizationMember => ({
  id: Math.random().toString(),
  name: `User ${Math.random()}`,
  email: `user${Math.random()}@example.com`,
  role,
  status: status as 'active' | 'pending' | 'inactive',
  joinedDate: new Date().toISOString()
});

const createSlotAvailability = (
  total_purchased: number,
  used_slots: number,
  exempted_slots: number = 0
): SlotAvailability => ({
  total_purchased,
  used_slots,
  available_slots: total_purchased + exempted_slots - used_slots,
  exempted_slots,
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
});

describe('calculateBilling', () => {
  describe('Free/Unlimited model (billing disabled)', () => {
    it('should calculate free organization correctly', () => {
      const members = [createMember('active', 'owner')];
      const state: BillingState = {
        members,
        storageGB: 3,
        fleetMapEnabled: false
      };

      const result = calculateBilling(state);

      expect(result.userSlots.model).toBe('free');
      expect(result.userSlots.totalUsers).toBe(1);
      expect(result.userSlots.billableUsers).toBe(1); // All users are free
      expect(result.userSlots.costPerUser).toBe(0);
      expect(result.userSlots.totalCost).toBe(0);
      expect(result.totals.monthlyTotal).toBe(0);
    });

    it('should calculate free/unlimited with multiple users', () => {
      const members = [
        createMember('active', 'owner'),
        createMember('active', 'member'),
        createMember('active', 'member')
      ];
      const state: BillingState = {
        members,
        storageGB: 0,
        fleetMapEnabled: false
      };

      const result = calculateBilling(state);

      expect(result.userSlots.model).toBe('free');
      expect(result.userSlots.totalUsers).toBe(3);
      expect(result.userSlots.billableUsers).toBe(3); // All users are free
      expect(result.userSlots.costPerUser).toBe(0);
      expect(result.userSlots.totalCost).toBe(0); // Free
      expect(result.totals.monthlyTotal).toBe(0);
    });

    it('should handle organization with slot availability (still free)', () => {
      const members = [
        createMember('active', 'owner'),
        createMember('active', 'member'),
        createMember('active', 'member')
      ];
      const slotAvailability = createSlotAvailability(5, 2); // 5 purchased, 2 used
      const state: BillingState = {
        members,
        slotAvailability,
        storageGB: 0,
        fleetMapEnabled: false
      };

      const result = calculateBilling(state);

      expect(result.userSlots.model).toBe('free');
      expect(result.userSlots.totalUsers).toBe(3);
      expect(result.userSlots.billableUsers).toBe(3); // All users are free
      expect(result.userSlots.costPerUser).toBe(0);
      expect(result.userSlots.totalCost).toBe(0); // Free
      expect(result.currentUsage.activeUsers).toBe(3); // All active users
      expect(result.currentUsage.totalSlotsNeeded).toBe(3);
      expect(result.totals.monthlyTotal).toBe(0);
    });

    it('should handle organization using exactly purchased slots (still free)', () => {
      const members = [
        createMember('active', 'owner'),
        createMember('active', 'member'),
        createMember('active', 'member'),
        createMember('active', 'member')
      ];
      const slotAvailability = createSlotAvailability(3, 3); // 3 purchased, 3 used
      const state: BillingState = {
        members,
        slotAvailability,
        storageGB: 0,
        fleetMapEnabled: false
      };

      const result = calculateBilling(state);

      expect(result.userSlots.model).toBe('free');
      expect(result.userSlots.totalUsers).toBe(4);
      expect(result.userSlots.billableUsers).toBe(4); // All users are free
      expect(result.userSlots.costPerUser).toBe(0);
      expect(result.userSlots.totalCost).toBe(0); // Free
      expect(result.currentUsage.activeUsers).toBe(4);
      expect(result.currentUsage.totalSlotsNeeded).toBe(4);
      expect(result.totals.monthlyTotal).toBe(0);
    });

    it('should handle organization needing more slots than purchased (still free)', () => {
      const members = [
        createMember('active', 'owner'),
        createMember('active', 'member'),
        createMember('active', 'member'),
        createMember('pending', 'member')
      ];
      const slotAvailability = createSlotAvailability(2, 2); // 2 purchased, 2 used
      const state: BillingState = {
        members,
        slotAvailability,
        storageGB: 0,
        fleetMapEnabled: false
      };

      const result = calculateBilling(state);

      expect(result.userSlots.model).toBe('free');
      expect(result.userSlots.totalUsers).toBe(3); // Only active
      expect(result.userSlots.billableUsers).toBe(3); // All users are free
      expect(result.userSlots.costPerUser).toBe(0);
      expect(result.userSlots.totalCost).toBe(0); // Free
      expect(result.currentUsage.activeUsers).toBe(3);
      expect(result.currentUsage.pendingInvitations).toBe(1);
      expect(result.currentUsage.totalSlotsNeeded).toBe(4);
      expect(result.totals.monthlyTotal).toBe(0);
    });

    it('should handle exempted slots correctly (still free)', () => {
      const members = [
        createMember('active', 'owner'),
        createMember('active', 'member')
      ];
      const slotAvailability = createSlotAvailability(2, 1, 1); // 2 purchased, 1 used, 1 exempted
      const state: BillingState = {
        members,
        slotAvailability,
        storageGB: 0,
        fleetMapEnabled: false
      };

      const result = calculateBilling(state);

      expect(result.userSlots.model).toBe('free');
      expect(result.userSlots.totalCost).toBe(0); // Free regardless of exemptions
      expect(result.totals.monthlyTotal).toBe(0);
    });
  });

  describe('Storage calculations (free/unlimited)', () => {
    it('should calculate storage as free regardless of usage', () => {
      const members = [createMember()];
      const state: BillingState = {
        members,
        storageGB: 8, // Would be 3GB overage in old model
        fleetMapEnabled: false
      };

      const result = calculateBilling(state);

      expect(result.storage.usedGB).toBe(8);
      expect(result.storage.freeGB).toBe(Infinity); // Unlimited
      expect(result.storage.overageGB).toBe(0); // No overage since unlimited
      expect(result.storage.cost).toBe(0); // Free
    });

    it('should handle no storage overage (free)', () => {
      const members = [createMember()];
      const state: BillingState = {
        members,
        storageGB: 3,
        fleetMapEnabled: false
      };

      const result = calculateBilling(state);

      expect(result.storage.overageGB).toBe(0);
      expect(result.storage.cost).toBe(0);
      expect(result.storage.freeGB).toBe(Infinity); // Unlimited
    });
  });

  describe('Fleet map calculations (free)', () => {
    it('should calculate fleet map cost as free when enabled', () => {
      const members = [createMember()];
      const state: BillingState = {
        members,
        storageGB: 0,
        fleetMapEnabled: true
      };

      const result = calculateBilling(state);

      expect(result.features.fleetMap.enabled).toBe(true);
      expect(result.features.fleetMap.cost).toBe(0); // Free
    });

    it('should calculate fleet map cost as free when disabled', () => {
      const members = [createMember()];
      const state: BillingState = {
        members,
        storageGB: 0,
        fleetMapEnabled: false
      };

      const result = calculateBilling(state);

      expect(result.features.fleetMap.enabled).toBe(false);
      expect(result.features.fleetMap.cost).toBe(0);
    });
  });

  describe('Total calculations (all free)', () => {
    it('should calculate totals correctly with all features (all free)', () => {
      const members = [
        createMember('active', 'owner'),
        createMember('active', 'member'),
        createMember('active', 'member')
      ];
      const state: BillingState = {
        members,
        storageGB: 8, // Would be $0.30 overage in old model
        fleetMapEnabled: true // Would be $10 in old model
      };

      const result = calculateBilling(state);

      expect(result.totals.userLicenses).toBe(0); // Free
      expect(result.totals.storage).toBe(0); // Free
      expect(result.totals.features).toBe(0); // Free
      expect(result.totals.monthlyTotal).toBe(0); // All free
    });
  });
});

describe('Helper functions', () => {
  describe('isFreeOrganization', () => {
    it('should return true when billing is disabled (all organizations are free)', () => {
      const members = [createMember('active', 'owner')];
      // Billing is disabled, so all organizations are free
      expect(isFreeOrganization(members)).toBe(true);
    });

    it('should return true for multiple active users (all free)', () => {
      const members = [
        createMember('active', 'owner'),
        createMember('active', 'member')
      ];
      expect(isFreeOrganization(members)).toBe(true);
    });

    it('should return true when billing is disabled (ignores pending users)', () => {
      const members = [
        createMember('active', 'owner'),
        createMember('pending', 'member')
      ];
      // Billing is disabled, so all organizations are free
      expect(isFreeOrganization(members)).toBe(true);
    });
  });

  describe('hasLicenses', () => {
    it('should return true when licenses are purchased (billing disabled)', () => {
      const slotAvailability = createSlotAvailability(5, 2);
      // Billing is disabled, so always returns true (unlimited)
      expect(hasLicenses(slotAvailability)).toBe(true);
    });

    it('should return true when no licenses are purchased (billing disabled)', () => {
      const slotAvailability = createSlotAvailability(0, 0);
      // Billing is disabled, so this returns true (unlimited licenses)
      expect(hasLicenses(slotAvailability)).toBe(true);
    });

    it('should return true when slot availability is undefined (billing disabled)', () => {
      // Billing is disabled, so this returns true (unlimited licenses)
      expect(hasLicenses(undefined)).toBe(true);
    });
  });

  describe('getSlotStatus', () => {
    it('should return unlimited status when billing is disabled', () => {
      const slotAvailability = createSlotAvailability(0, 0);
      const status = getSlotStatus(slotAvailability, 1);
      
      // Billing is disabled, so always returns unlimited
      expect(status.status).toBe('unlimited');
      expect(status.variant).toBe('default');
      expect(status.message).toBe('Unlimited slots available');
    });

    it('should return unlimited status regardless of slot availability', () => {
      const slotAvailability = createSlotAvailability(5, 2);
      const status = getSlotStatus(slotAvailability, 2);
      
      // Billing is disabled, so always returns unlimited
      expect(status.status).toBe('unlimited');
      expect(status.variant).toBe('default');
      expect(status.message).toBe('Unlimited slots available');
    });

    it('should return unlimited status even when slots are exhausted', () => {
      const slotAvailability = createSlotAvailability(3, 3);
      const status = getSlotStatus(slotAvailability, 1);
      
      // Billing is disabled, so always returns unlimited
      expect(status.status).toBe('unlimited');
      expect(status.variant).toBe('default');
      expect(status.message).toBe('Unlimited slots available');
    });
  });

  describe('shouldBlockInvitation', () => {
    it('should not block invitation when billing is disabled', () => {
      const slotAvailability = createSlotAvailability(3, 3);
      // Billing is disabled, so this never blocks invitations
      expect(shouldBlockInvitation(slotAvailability)).toBe(false);
    });

    it('should allow invitation when slots available', () => {
      const slotAvailability = createSlotAvailability(5, 3);
      expect(shouldBlockInvitation(slotAvailability)).toBe(false);
    });

    it('should not block when slot availability is undefined', () => {
      expect(shouldBlockInvitation(undefined)).toBe(false);
    });
  });
});
