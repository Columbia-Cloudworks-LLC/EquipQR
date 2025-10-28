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
  describe('Pay-as-you-go model (no slots purchased)', () => {
    it('should calculate free organization correctly', () => {
      const members = [createMember('active', 'owner')];
      const state: BillingState = {
        members,
        storageGB: 3,
        fleetMapEnabled: false
      };

      const result = calculateBilling(state);

      expect(result.userSlots.model).toBe('pay-as-you-go');
      expect(result.userSlots.totalUsers).toBe(1);
      expect(result.userSlots.billableUsers).toBe(0);
      expect(result.userSlots.totalCost).toBe(0);
      expect(result.totals.monthlyTotal).toBe(0);
    });

    it('should calculate pay-as-you-go with multiple users', () => {
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

      expect(result.userSlots.model).toBe('pay-as-you-go');
      expect(result.userSlots.totalUsers).toBe(3);
      expect(result.userSlots.billableUsers).toBe(2);
      expect(result.userSlots.totalCost).toBe(20); // 2 * $10
      expect(result.totals.monthlyTotal).toBe(20);
    });
  });

  describe('License-based model (slots purchased)', () => {
    describe('Under slot count scenario', () => {
      it('should handle organization with more slots than needed', () => {
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

        expect(result.userSlots.model).toBe('license-based');
        expect(result.userSlots.totalPurchased).toBe(5);
        expect(result.userSlots.slotsUsed).toBe(2);
        expect(result.userSlots.availableSlots).toBe(3);
        expect(result.userSlots.totalCost).toBe(50); // 5 * $10
        expect(result.currentUsage.activeUsers).toBe(2); // Excluding owner
        expect(result.currentUsage.totalSlotsNeeded).toBe(2);
        expect(result.totals.monthlyTotal).toBe(50);
      });
    });

    describe('Exactly at slot count scenario', () => {
      it('should handle organization using exactly purchased slots', () => {
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

        expect(result.userSlots.model).toBe('license-based');
        expect(result.userSlots.totalPurchased).toBe(3);
        expect(result.userSlots.slotsUsed).toBe(3);
        expect(result.userSlots.availableSlots).toBe(0);
        expect(result.userSlots.totalCost).toBe(30); // 3 * $10
        expect(result.currentUsage.activeUsers).toBe(3); // Excluding owner
        expect(result.currentUsage.totalSlotsNeeded).toBe(3);
        expect(result.totals.monthlyTotal).toBe(30);
      });
    });

    describe('Over slot count scenario', () => {
      it('should handle organization needing more slots than purchased', () => {
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

        expect(result.userSlots.model).toBe('license-based');
        expect(result.userSlots.totalPurchased).toBe(2);
        expect(result.userSlots.slotsUsed).toBe(2);
        expect(result.userSlots.availableSlots).toBe(0);
        expect(result.userSlots.totalCost).toBe(20); // 2 * $10
        expect(result.currentUsage.activeUsers).toBe(2); // Excluding owner
        expect(result.currentUsage.pendingInvitations).toBe(1);
        expect(result.currentUsage.totalSlotsNeeded).toBe(3);
        expect(result.totals.monthlyTotal).toBe(20);
      });
    });

    it('should handle exempted slots correctly', () => {
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

      expect(result.userSlots.exemptedSlots).toBe(1);
      expect(result.userSlots.availableSlots).toBe(2); // total_purchased + exempted - used
    });

    it('should not affect billing cost despite exemptions', () => {
      const members = [
        createMember('active', 'owner'),
        createMember('active', 'member'),
        createMember('active', 'member')
      ];
      
      // With exemptions
      const slotAvailabilityWithExemptions = createSlotAvailability(3, 2, 5); // 3 purchased, 2 used, 5 exempted
      const stateWithExemptions: BillingState = {
        members,
        slotAvailability: slotAvailabilityWithExemptions,
        storageGB: 0,
        fleetMapEnabled: false
      };

      // Without exemptions
      const slotAvailabilityWithoutExemptions = createSlotAvailability(3, 2, 0); // 3 purchased, 2 used, 0 exempted
      const stateWithoutExemptions: BillingState = {
        members,
        slotAvailability: slotAvailabilityWithoutExemptions,
        storageGB: 0,
        fleetMapEnabled: false
      };

      const resultWithExemptions = calculateBilling(stateWithExemptions);
      const resultWithoutExemptions = calculateBilling(stateWithoutExemptions);

      // Costs should be identical - exemptions only affect capacity, not billing
      expect(resultWithExemptions.userSlots.totalCost).toBe(resultWithoutExemptions.userSlots.totalCost);
      expect(resultWithExemptions.totals.monthlyTotal).toBe(resultWithoutExemptions.totals.monthlyTotal);
      
      // But available slots should be different
      expect(resultWithExemptions.userSlots.availableSlots).toBe(6); // 3 + 5 - 2
      expect(resultWithoutExemptions.userSlots.availableSlots).toBe(1); // 3 + 0 - 2
    });
  });

  describe('Storage calculations', () => {
    it('should calculate storage costs correctly', () => {
      const members = [createMember()];
      const state: BillingState = {
        members,
        storageGB: 8, // 3GB overage
        fleetMapEnabled: false
      };

      const result = calculateBilling(state);

      expect(result.storage.usedGB).toBe(8);
      expect(result.storage.freeGB).toBe(5);
      expect(result.storage.overageGB).toBe(3);
      expect(result.storage.cost).toBe(0.30); // 3 * $0.10
    });

    it('should handle no storage overage', () => {
      const members = [createMember()];
      const state: BillingState = {
        members,
        storageGB: 3,
        fleetMapEnabled: false
      };

      const result = calculateBilling(state);

      expect(result.storage.overageGB).toBe(0);
      expect(result.storage.cost).toBe(0);
    });
  });

  describe('Fleet map calculations', () => {
    it('should calculate fleet map cost when enabled', () => {
      const members = [createMember()];
      const state: BillingState = {
        members,
        storageGB: 0,
        fleetMapEnabled: true
      };

      const result = calculateBilling(state);

      expect(result.features.fleetMap.enabled).toBe(true);
      expect(result.features.fleetMap.cost).toBe(10);
    });

    it('should calculate fleet map cost when disabled', () => {
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

  describe('Total calculations', () => {
    it('should calculate totals correctly with all features', () => {
      const members = [
        createMember('active', 'owner'),
        createMember('active', 'member'),
        createMember('active', 'member')
      ];
      const state: BillingState = {
        members,
        storageGB: 8, // $0.30 overage
        fleetMapEnabled: true // $10
      };

      const result = calculateBilling(state);

      expect(result.totals.userLicenses).toBe(20); // 2 * $10
      expect(result.totals.storage).toBe(0.30);
      expect(result.totals.features).toBe(10);
      expect(result.totals.monthlyTotal).toBe(30.30);
    });
  });
});

describe('Helper functions', () => {
  describe('isFreeOrganization', () => {
    it('should return false when billing is disabled (always returns false)', () => {
      const members = [createMember('active', 'owner')];
      // Billing is disabled by default, so this returns false
      expect(isFreeOrganization(members)).toBe(false);
    });

    it('should return false for multiple active users', () => {
      const members = [
        createMember('active', 'owner'),
        createMember('active', 'member')
      ];
      expect(isFreeOrganization(members)).toBe(false);
    });

    it('should return false when billing is disabled (ignores pending users)', () => {
      const members = [
        createMember('active', 'owner'),
        createMember('pending', 'member')
      ];
      // Billing is disabled by default, so this returns false
      expect(isFreeOrganization(members)).toBe(false);
    });
  });

  describe('hasLicenses', () => {
    it('should return true when licenses are purchased', () => {
      const slotAvailability = createSlotAvailability(5, 2);
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
    it('should return no-slots status when no slots purchased', () => {
      const slotAvailability = createSlotAvailability(0, 0);
      const status = getSlotStatus(slotAvailability, 1);
      
      expect(status.status).toBe('no-slots');
      expect(status.variant).toBe('secondary');
    });

    it('should return sufficient status when enough slots available', () => {
      const slotAvailability = createSlotAvailability(5, 2);
      const status = getSlotStatus(slotAvailability, 2);
      
      expect(status.status).toBe('sufficient');
      expect(status.variant).toBe('default');
    });

    it('should return low status when few slots remaining', () => {
      const slotAvailability = createSlotAvailability(3, 2);
      const status = getSlotStatus(slotAvailability, 2);
      
      expect(status.status).toBe('low');
      expect(status.variant).toBe('destructive');
    });

    it('should return exhausted status when no slots available', () => {
      const slotAvailability = createSlotAvailability(3, 3);
      const status = getSlotStatus(slotAvailability, 1);
      
      expect(status.status).toBe('exhausted');
      expect(status.variant).toBe('destructive');
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