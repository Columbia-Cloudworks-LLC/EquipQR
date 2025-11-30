/**
 * Organization Members Hook
 * 
 * This hook is now a re-export of the canonical useOrganizationMembersQuery.
 * Kept for backward compatibility - prefer importing from useOptimizedOrganizationMembers.
 */

import { useOrganizationMembersQuery, type RealOrganizationMember } from './useOptimizedOrganizationMembers';

// Re-export the type for backward compatibility
export type { RealOrganizationMember };

/**
 * @deprecated Use useOrganizationMembersQuery from useOptimizedOrganizationMembers instead
 */
export const useOrganizationMembers = useOrganizationMembersQuery;

// Re-export mutations from canonical hook
export { useUpdateMemberRole, useRemoveMember } from './useOptimizedOrganizationMembers';
