import { RealOrganizationMember } from '@/hooks/useOrganizationMembers';
import { SlotAvailability } from '@/hooks/useOrganizationSlots';
import { isBillingDisabled } from '@/lib/flags';

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
 * Calculate billing - returns free/unlimited values since billing is disabled
 */
export function calculateBilling(state: BillingState): BillingCalculation {
  const { members, storageGB, fleetMapEnabled } = state;
  
  const activeMembers = members.filter(member => member.status === 'active');
  const pendingMembers = members.filter(member => member.status === 'pending');
  
  // Free/unlimited model - no costs
  const totalUsers = activeMembers.length;
  const billableUsers = totalUsers; // All users are free
  const costPerUser = 0;
  const totalCost = 0;
  
  const userSlots = {
    model: 'free' as const,
    totalUsers,
    billableUsers,
    costPerUser,
    totalCost
  };
  
  // Calculate current usage (informational only)
  const activeUsers = activeMembers.length;
  const pendingInvitations = pendingMembers.length;
  const totalSlotsNeeded = activeUsers + pendingInvitations;
  
  const currentUsage = {
    activeUsers,
    pendingInvitations,
    totalSlotsNeeded
  };
  
  // Storage is free/unlimited
  const storage = {
    usedGB: storageGB,
    freeGB: Infinity, // Unlimited
    overageGB: 0,
    cost: 0
  };
  
  // Fleet map is free
  const features = {
    fleetMap: {
      enabled: fleetMapEnabled,
      cost: 0
    }
  };
  
  // All totals are zero
  const totals = {
    userLicenses: 0,
    storage: 0,
    features: 0,
    monthlyTotal: 0
  };
  
  return {
    userSlots,
    currentUsage,
    storage,
    features,
    totals
  };
}

/**
 * Check if organization is free (always true when billing is disabled)
 */
export function isFreeOrganization(members: RealOrganizationMember[]): boolean {
  // Billing is disabled - all organizations are free
  return true;
}

/**
 * Check if organization has licenses (always true when billing is disabled)
 * @param slotAvailability - Unused, kept for backward compatibility with existing API
 */
export function hasLicenses(slotAvailability?: SlotAvailability): boolean {
  // Billing is disabled - always report as having unlimited licenses
  return true;
}

/**
 * Get slot status - always returns unlimited
 *
 * @param slotAvailability Unused. Kept for backward compatibility with the existing API.
 * @param totalNeeded Unused. Kept for backward compatibility with the existing API.
 * @param slotAvailability - Unused, kept for backward compatibility with existing API
 * @param totalNeeded - Unused, kept for backward compatibility with existing API
 */
export function getSlotStatus(slotAvailability: SlotAvailability, totalNeeded: number): SlotStatus {
  // Billing is disabled - always unlimited
  return {
    status: 'unlimited',
    message: 'Unlimited slots available',
    variant: 'default'
  };
}

/**
 * Check if invitation should be blocked (always false when billing is disabled)
 * @param slotAvailability Unused. Kept for backward compatibility with the existing API.
 * @param slotAvailability - Unused, kept for backward compatibility with existing API
 */
export function shouldBlockInvitation(slotAvailability?: SlotAvailability): boolean {
  // Billing is disabled - never block invitations
  return false;
}

/**
 * Check if can upgrade from free (always false when billing is disabled)
 * @param members - Unused, kept for backward compatibility with existing API
 */
export function canUpgradeFromFree(members: RealOrganizationMember[]): boolean {
  // Billing is disabled - no upgrades needed
  return false;
}

/**
 * Check if can upgrade slots (always false when billing is disabled)
 * @param members - Unused, kept for backward compatibility with existing API
 */
export function canUpgradeSlots(members: RealOrganizationMember[]): boolean {
  // Billing is disabled - no upgrades needed
  return false;
}

/**
 * Get upgrade message (returns free message)
 * @param slotAvailability - Unused, kept for backward compatibility with existing API
 * @returns Message indicating all features are free
 */
export function getUpgradeMessage(slotAvailability?: SlotAvailability): string {
  return 'All features are free and unlimited.';
}

/**
 * Get license status (always returns unlimited)
 * @param slotAvailability - Unused, kept for backward compatibility with existing API
 * @param slotAvailability - Unused, kept for backward compatibility with existing API
 */
export function getLicenseStatus(slotAvailability: SlotAvailability) {
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

export function calculateLicenseBilling(
  members: RealOrganizationMember[],
  slotAvailability: SlotAvailability,
  storageGB: number = 0,
  fleetMapEnabled: boolean = false
) {
  const billing = calculateBilling({ members, slotAvailability, storageGB, fleetMapEnabled });
  return {
    userLicenses: {
      totalPurchased: 0, // Unlimited
      slotsUsed: billing.currentUsage.activeUsers,
      availableSlots: Infinity, // Unlimited
      exemptedSlots: 0,
      costPerLicense: 0,
      monthlyLicenseCost: 0,
      nextBillingDate: undefined
    },
    storage: billing.storage,
    fleetMap: billing.features.fleetMap,
    monthlyTotal: billing.totals.monthlyTotal
  };
}

export function calculateEnhancedBilling(
  members: RealOrganizationMember[],
  slotAvailability: SlotAvailability,
  storageGB: number,
  fleetMapEnabled: boolean
) {
  const billing = calculateBilling({ members, slotAvailability, storageGB, fleetMapEnabled });
  
  return {
    userSlots: {
      totalPurchased: 0, // Unlimited
      slotsUsed: billing.currentUsage.activeUsers,
      availableSlots: Infinity, // Unlimited
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
