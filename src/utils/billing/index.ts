import { RealOrganizationMember } from '@/hooks/useOrganizationMembers';
import { SlotAvailability } from '@/hooks/useOrganizationSlots';
import { isBillingDisabled } from '@/lib/flags';

// Utility function to handle floating-point precision for monetary calculations
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

// Input state interface (discriminated union)
export interface BillingState {
  members: RealOrganizationMember[];
  slotAvailability?: SlotAvailability;
  storageGB: number;
  fleetMapEnabled: boolean;
}

// Output interface 
export interface BillingCalculation {
  userSlots: {
    model: 'pay-as-you-go' | 'license-based';
    totalUsers: number;
    billableUsers: number;
    costPerUser: number;
    totalCost: number;
    // License-specific fields (when model === 'license-based')
    totalPurchased?: number;
    slotsUsed?: number;
    availableSlots?: number;
    exemptedSlots?: number;
    nextBillingDate?: string;
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

// Slot status for license-based billing
export interface SlotStatus {
  status: 'no-slots' | 'sufficient' | 'low' | 'exhausted';
  message: string;
  variant: 'default' | 'secondary' | 'destructive';
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

// Main function with discriminated union logic
export function calculateBilling(state: BillingState): BillingCalculation {
  const { members, slotAvailability, storageGB, fleetMapEnabled } = state;
  
  const activeMembers = members.filter(member => member.status === 'active');
  const pendingMembers = members.filter(member => member.status === 'pending');
  
  // Determine billing model
  const hasLicenses = slotAvailability && slotAvailability.total_purchased > 0;
  const model: 'pay-as-you-go' | 'license-based' = hasLicenses ? 'license-based' : 'pay-as-you-go';
  
  // Calculate user costs based on model
  const totalUsers = activeMembers.length;
  const costPerUser = 10;
  
  let billableUsers: number;
  let totalCost: number;
  let userSlots: BillingCalculation['userSlots'];
  
  if (model === 'license-based' && slotAvailability) {
    // License-based: pay for purchased slots regardless of usage
    billableUsers = Math.max(0, totalUsers - 1); // Exclude owner from counting
    totalCost = slotAvailability.total_purchased * costPerUser;
    
    userSlots = {
      model,
      totalUsers,
      billableUsers,
      costPerUser,
      totalCost,
      totalPurchased: slotAvailability.total_purchased,
      slotsUsed: slotAvailability.used_slots,
      availableSlots: slotAvailability.available_slots,
      exemptedSlots: slotAvailability.exempted_slots,
      nextBillingDate: slotAvailability.current_period_end
    };
  } else {
    // Pay-as-you-go: pay for active users (first user free)
    billableUsers = Math.max(0, totalUsers - 1);
    totalCost = billableUsers * costPerUser;
    
    userSlots = {
      model,
      totalUsers,
      billableUsers,
      costPerUser,
      totalCost
    };
  }
  
  // Calculate current usage
  const activeUsers = Math.max(0, activeMembers.length - 1); // Exclude owner
  const pendingInvitations = pendingMembers.length;
  const totalSlotsNeeded = activeUsers + pendingInvitations;
  
  const currentUsage = {
    activeUsers,
    pendingInvitations,
    totalSlotsNeeded
  };
  
  // Calculate storage costs (consistent across all models)
  const freeGB = 5;
  const overageGB = Math.max(0, storageGB - freeGB);
  const storageCost = roundToTwoDecimals(overageGB * 0.10);
  
  const storage = {
    usedGB: storageGB,
    freeGB,
    overageGB,
    cost: storageCost
  };
  
  // Calculate fleet map cost (consistent across all models)
  const fleetMapCost = fleetMapEnabled ? 10 : 0;
  
  const features = {
    fleetMap: {
      enabled: fleetMapEnabled,
      cost: fleetMapCost
    }
  };
  
  // Calculate totals
  const totals = {
    userLicenses: totalCost,
    storage: storageCost,
    features: fleetMapCost,
    monthlyTotal: roundToTwoDecimals(totalCost + storageCost + fleetMapCost)
  };
  
  return {
    userSlots,
    currentUsage,
    storage,
    features,
    totals
  };
}

// Helper functions for common operations
export function isFreeOrganization(members: RealOrganizationMember[]): boolean {
  // Billing is disabled - no organization is considered "free"
  if (isBillingDisabled()) {
    return false;
  }
  const activeMembers = members.filter(member => member.status === 'active');
  return activeMembers.length === 1;
}

export function hasLicenses(slotAvailability?: SlotAvailability): boolean {
  // Billing is disabled - always report as having licenses
  if (isBillingDisabled()) {
    return true;
  }
  return !!(slotAvailability && slotAvailability.total_purchased > 0);
}

export function getSlotStatus(slotAvailability: SlotAvailability, totalNeeded: number): SlotStatus {
  const { available_slots, total_purchased, exempted_slots } = slotAvailability;
  
  if (total_purchased === 0 && exempted_slots === 0) {
    return {
      status: 'no-slots',
      message: 'No slots purchased yet',
      variant: 'secondary'
    };
  }
  
  if (available_slots >= totalNeeded) {
    const message = exempted_slots > 0 
      ? `${available_slots} slots available (${exempted_slots} exempted)`
      : `${available_slots} slots available`;
    return {
      status: 'sufficient',
      message,
      variant: 'default'
    };
  }
  
  if (available_slots > 0) {
    return {
      status: 'low',
      message: `Only ${available_slots} slots remaining`,
      variant: 'destructive'
    };
  }
  
  return {
    status: 'exhausted',
    message: 'All slots used',
    variant: 'destructive'
  };
}

export function shouldBlockInvitation(slotAvailability?: SlotAvailability): boolean {
  // Billing is disabled - never block invitations
  if (isBillingDisabled()) {
    return false;
  }
  if (!slotAvailability) return false;
  return slotAvailability.available_slots <= 0;
}

export function canUpgradeFromFree(members: RealOrganizationMember[]): boolean {
  return isFreeOrganization(members);
}

export function canUpgradeSlots(members: RealOrganizationMember[]): boolean {
  return members.length > 1 || members.some(m => m.status === 'pending');
}

export function getUpgradeMessage(slotAvailability?: SlotAvailability): string {
  if (!slotAvailability || slotAvailability.total_purchased === 0) {
    return 'Purchase user licenses to enable team collaboration at $10/month per license.';
  }
  return 'Purchase additional licenses to expand your team capacity.';
}

export function getLicenseStatus(slotAvailability: SlotAvailability) {
  const { total_purchased, available_slots, exempted_slots } = slotAvailability;
  
  if (total_purchased === 0 && exempted_slots === 0) {
    return {
      status: 'no-licenses' as const,
      message: 'No licenses purchased',
      variant: 'secondary' as const
    };
  }
  
  if (available_slots > 0) {
    const message = exempted_slots > 0 
      ? `${available_slots} licenses available (${exempted_slots} exempted)`
      : `${available_slots} licenses available`;
    return {
      status: 'available' as const,
      message,
      variant: 'default' as const
    };
  }
  
  return {
    status: 'full' as const,
    message: 'All licenses in use',
    variant: 'destructive' as const
  };
}

// Legacy compatibility functions
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
      totalPurchased: billing.userSlots.totalPurchased || 0,
      slotsUsed: billing.userSlots.slotsUsed || 0,
      availableSlots: billing.userSlots.availableSlots || 0,
      exemptedSlots: billing.userSlots.exemptedSlots || 0,
      costPerLicense: billing.userSlots.costPerUser,
      monthlyLicenseCost: billing.userSlots.totalCost,
      nextBillingDate: billing.userSlots.nextBillingDate
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
      totalPurchased: billing.userSlots.totalPurchased || 0,
      slotsUsed: billing.userSlots.slotsUsed || 0,
      availableSlots: billing.userSlots.availableSlots || 0,
      costPerSlot: billing.userSlots.costPerUser,
      totalSlotValue: billing.userSlots.totalCost
    },
    currentUsage: billing.currentUsage,
    storage: billing.storage,
    fleetMap: billing.features.fleetMap,
    monthlyRecurring: billing.storage.cost + billing.features.fleetMap.cost,
    prepaidSlotValue: billing.userSlots.totalCost,
    estimatedNextBilling: billing.totals.monthlyTotal
  };
}