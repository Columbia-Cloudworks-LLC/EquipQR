/**
 * Organization Hooks - Central export for organization-related hooks
 * 
 * This file re-exports organization hooks for convenience.
 * The "Enhanced" naming is kept for backward compatibility but
 * these hooks are now wrappers around the canonical implementations.
 */

// Organization member hooks (canonical and enhanced)
export {
  useOrganizationMembersQuery,
  useOrganizationMemberStats,
  useUpdateMemberRole,
  useRemoveMember,
  type RealOrganizationMember
} from './useOptimizedOrganizationMembers';

// Enhanced variants with background sync
export {
  useEnhancedOrganizationMembers,
  useEnhancedOrganizationMemberStats,
  useEnhancedUpdateMemberRole,
  useEnhancedRemoveMember
} from './useEnhancedOrganizationMembers';

// Organization admin hooks
export {
  useEnhancedOrganizationAdmins,
  type OrganizationAdmin
} from './useEnhancedOrganizationAdmins';

// Organization slot hooks
export {
  useEnhancedOrganizationSlots,
  useEnhancedSlotAvailability,
  useEnhancedSlotPurchases,
  useEnhancedReserveSlot,
  useEnhancedReleaseSlot,
  type OrganizationSlot,
  type SlotAvailability,
  type SlotPurchase
} from './useEnhancedOrganizationSlots';

// Organization invitation hooks
export {
  useEnhancedOrganizationInvitations
} from './useEnhancedOrganizationInvitations';

// Combined hook for all organization data with background sync
export {
  useEnhancedOrganizationData
} from './useEnhancedOptimizedQueries';

// Re-export types from canonical locations
export type { OrganizationMember } from '@/types/organization';