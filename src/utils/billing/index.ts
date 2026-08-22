/**
 * @deprecated Billing system has been removed. All functions return free/unlimited values.
 */

import { RealOrganizationMember } from '@/features/organization/hooks/useOrganizationMembers';
import { SlotAvailability } from '@/features/organization/hooks/useOrganizationSlots';

// Output interface - simplified for free/unlimited model
export interface BillingCalculation {
  userSlots: {
    model: 'free' | 'unlimited';
    totalUsers: number;
    billableUsers: number;
    costPerUser: number;
    totalCost: number;
  };
  currentUsage: {
    activeUsers: number;
    pendingInvitations: number;
    totalSlotsNeeded: number;
  };
  storage: {
    usedGB: number;
    freeGB: number;
    overageGB: number;
    cost: number;
  };
  features: {
    fleetMap: {
      enabled: boolean;
      cost: number;
    };
  };
  totals: {
    userLicenses: number;
    storage: number;
    features: number;
    monthlyTotal: number;
  };
}

// Slot status for free/unlimited model
export interface SlotStatus {
  status: 'unlimited' | 'free';
  message: string;
  variant: 'default' | 'secondary';
}

// Input state interface (exported for backward compatibility with tests)
export interface BillingState {
  members: RealOrganizationMember[];
  slotAvailability?: SlotAvailability;
  storageGB: number;
  fleetMapEnabled: boolean;
}

/**
 * @deprecated Billing is disabled. Returns free/unlimited values.
 */
export function calculateBilling(state: BillingState): BillingCalculation {
  const { members, storageGB, fleetMapEnabled } = state;
  
  const activeMembers = members.filter(member => member.status === 'active');
  const pendingMembers = members.filter(member => member.status === 'pending');
  
  // Always return free/unlimited values
  return {
    userSlots: {
      model: 'free' as const,
      totalUsers: activeMembers.length,
      billableUsers: activeMembers.length,
      costPerUser: 0,
      totalCost: 0
    },
    currentUsage: {
      activeUsers: activeMembers.length,
      pendingInvitations: pendingMembers.length,
      totalSlotsNeeded: activeMembers.length + pendingMembers.length
    },
    storage: {
      usedGB: storageGB,
      freeGB: Infinity,
      overageGB: 0,
      cost: 0
    },
    features: {
      fleetMap: {
        enabled: fleetMapEnabled,
        cost: 0
      }
    },
    totals: {
      userLicenses: 0,
      storage: 0,
      features: 0,
      monthlyTotal: 0
    }
  };
}

/**
 * Check if organization is free (always true - billing is permanently disabled)
 */
export function isFreeOrganization(_members: RealOrganizationMember[]): boolean {
  void _members;
  return true;
}

/**
 * Check if organization has licenses (always true - billing is permanently disabled)
 * @param _slotAvailability - Unused, kept for backward compatibility with existing API
 */
export function hasLicenses(_slotAvailability?: SlotAvailability): boolean {
  void _slotAvailability;
  return true;
}

/**
 * Get slot status - always returns unlimited
 *
 * @param _slotAvailability Unused. Kept for backward compatibility with the existing API.
 * @param _totalNeeded Unused. Kept for backward compatibility with the existing API.
 */
export function getSlotStatus(_slotAvailability?: SlotAvailability, _totalNeeded?: number): SlotStatus {
  void _slotAvailability;
  void _totalNeeded;
  // Billing is disabled - always unlimited
  return {
    status: 'unlimited',
    message: 'Unlimited slots available',
    variant: 'default'
  };
}

/**
 * Check if invitation should be blocked (always false when billing is disabled)
 * @param _slotAvailability - Unused, kept for backward compatibility with existing API
 */
export function shouldBlockInvitation(_slotAvailability?: SlotAvailability): boolean {
  void _slotAvailability;
  // Billing is disabled - never block invitations
  return false;
}
