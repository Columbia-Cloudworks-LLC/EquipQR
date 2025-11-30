/**
 * @deprecated This file is deprecated. Import from canonical services instead:
 * - Types: import from '@/types/organization'
 * - Functions: import from '@/services/organizationService'
 * 
 * This file re-exports from the canonical locations for backward compatibility.
 */

// Re-export types from canonical location
export type { 
  OrganizationMemberRecord as OptimizedOrganizationMember,
  OrganizationWithMembership as OptimizedOrganization,
  OrganizationUpdatePayload
} from '@/types/organization';

// Re-export functions from canonical service
export {
  getUserOrganizations as getUserOrganizationsOptimized,
  getOrganizationMembers as getOrganizationMembersOptimized,
  getOrganizationAdmins as getOrganizationAdminsOptimized,
  checkUserOrgAccess,
  updateOrganization,
  getOrganizationById
} from './organizationService';