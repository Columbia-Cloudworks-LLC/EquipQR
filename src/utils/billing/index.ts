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

// Legacy interface compatibility
export interface LegacyBillingCalculation {
  userLicenses: {
    totalUsers: number;
    billableUsers: number;
    cost: number;
  };
  storage: {
    usedGB: number;
    freeGB: number;
    overageGB: number;
    cost: number;
  };
  fleetMap: {
    enabled: boolean;
    cost: number;
  };
  total: number;
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

/**
 * Check if can upgrade from free (always false when billing is disabled)
 * @param _members - Unused, kept for backward compatibility with existing API
 */
export function canUpgradeFromFree(_members: RealOrganizationMember[]): boolean {
  void _members;
  // Billing is disabled - no upgrades needed
  return false;
}

/**
 * Check if can upgrade slots (always false when billing is disabled)
 * @param members - Unused, kept for backward compatibility with existing API
 */
export function canUpgradeSlots(_members: RealOrganizationMember[]): boolean {
  void _members;
  // Billing is disabled - no upgrades needed
  return false;
}

/**
 * Get upgrade message (returns free message)
 * @param _slotAvailability - Unused, kept for backward compatibility with existing API
 * @returns Message indicating all features are free
 */
export function getUpgradeMessage(_slotAvailability?: SlotAvailability): string {
  void _slotAvailability;
  return 'All features are free and unlimited.';
}

/**
 * @deprecated Billing is disabled. Always returns unlimited.
 */
export function getLicenseStatus(_slotAvailability?: SlotAvailability) {
  void _slotAvailability;
  return {
    status: 'unlimited' as const,
    message: 'Unlimited licenses available',
    variant: 'default' as const
  };
}

// Legacy compatibility functions - return free values
export function calculateUserLicenseCost(members: RealOrganizationMember[]): { totalUsers: number; billableUsers: number; cost: number } {
  const billing = calculateBilling({ members, storageGB: 0, fleetMapEnabled: false });
  return {
    totalUsers: billing.userSlots.totalUsers,
    billableUsers: billing.userSlots.billableUsers,
    cost: billing.userSlots.totalCost
  };
}

export function calculateStorageCost(usageGB: number): { usedGB: number; freeGB: number; overageGB: number; cost: number } {
  const billing = calculateBilling({ members: [], storageGB: usageGB, fleetMapEnabled: false });
  return billing.storage;
}

export function calculateFleetMapCost(enabled: boolean): { enabled: boolean; cost: number } {
  const billing = calculateBilling({ members: [], storageGB: 0, fleetMapEnabled: enabled });
  return billing.features.fleetMap;
}

export function calculateTotalBilling(
  members: RealOrganizationMember[],
  storageGB: number,
  fleetMapEnabled: boolean
): LegacyBillingCalculation {
  const billing = calculateBilling({ members, storageGB, fleetMapEnabled });
  return {
    userLicenses: {
      totalUsers: billing.userSlots.totalUsers,
      billableUsers: billing.userSlots.billableUsers,
      cost: billing.userSlots.totalCost
    },
    storage: billing.storage,
    fleetMap: billing.features.fleetMap,
    total: billing.totals.monthlyTotal
  };
}

export function calculateSimplifiedBilling(
  members: RealOrganizationMember[],
  storageGB: number = 0,
  fleetMapEnabled: boolean = false
) {
  const billing = calculateBilling({ members, storageGB, fleetMapEnabled });
  return {
    userLicenses: {
      totalUsers: billing.userSlots.totalUsers,
      billableUsers: billing.userSlots.billableUsers,
      costPerUser: billing.userSlots.costPerUser,
      totalCost: billing.userSlots.totalCost
    },
    storage: billing.storage,
    fleetMap: billing.features.fleetMap,
    monthlyTotal: billing.totals.monthlyTotal
  };
}

/**
 * @deprecated Billing is disabled. Returns free values.
 */
export function calculateLicenseBilling(
  members: RealOrganizationMember[],
  _slotAvailability?: SlotAvailability,
  storageGB: number = 0,
  fleetMapEnabled: boolean = false
) {
  const billing = calculateBilling({ members, storageGB, fleetMapEnabled });
  return {
    userLicenses: {
      totalPurchased: 0,
      slotsUsed: billing.currentUsage.activeUsers,
      availableSlots: Infinity,
      exemptedSlots: 0,
      costPerLicense: 0,
      monthlyLicenseCost: 0,
      nextBillingDate: undefined
    },
    storage: billing.storage,
    fleetMap: billing.features.fleetMap,
    monthlyTotal: 0
  };
}

/**
 * @deprecated Billing is disabled. Returns free values.
 */
export function calculateEnhancedBilling(
  members: RealOrganizationMember[],
  _slotAvailability?: SlotAvailability,
  storageGB: number = 0,
  fleetMapEnabled: boolean = false
) {
  const billing = calculateBilling({ members, storageGB, fleetMapEnabled });
  
  return {
    userSlots: {
      totalPurchased: 0,
      slotsUsed: billing.currentUsage.activeUsers,
      availableSlots: Infinity,
      costPerSlot: 0,
      totalSlotValue: 0
    },
    currentUsage: billing.currentUsage,
    storage: billing.storage,
    fleetMap: billing.features.fleetMap,
    monthlyRecurring: 0,
    prepaidSlotValue: 0,
    estimatedNextBilling: 0
  };
}
