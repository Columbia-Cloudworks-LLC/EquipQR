/**
 * Consolidated Organization Hooks
 * Uses the new service architecture and hook factories
 * Follows SOLID principles with composition over inheritance
 */

import { useMemo } from 'react';
import { createQueryHook, createMutationHook, useCrudHooks } from '@/shared/base/BaseHook';
import { createOrganizationService, OrganizationService } from '../services/OrganizationService';
import { 
  Organization, 
  EnhancedOrganization, 
  CreateOrganizationData, 
  UpdateOrganizationData,
  OrganizationFilters,
  OrganizationStats,
  OrganizationMember,
  OrganizationInvitation,
  CreateInvitationData,
  UpdateMemberData,
  OrganizationBulkUpdateData,
  OrganizationSearchResult
} from '../types/Organization';
import { ApiResponse } from '@/shared/types/common';

/**
 * Hook factory for organization queries
 */
const createOrganizationQueryHook = (organizationId: string) => {
  const service = createOrganizationService(organizationId);
  
  return {
    useOrganizationById: createQueryHook(
      'organization-by-id',
      (orgId: string) => service.getOrganizationById(orgId)
    ),
    useOrganizationStats: createQueryHook(
      'organization-stats',
      (orgId: string) => service.getOrganizationStats(orgId)
    ),
    useOrganizationMembers: createQueryHook(
      'organization-members',
      (orgId: string) => service.getOrganizationMembers(orgId)
    ),
    useOrganizationInvitations: createQueryHook(
      'organization-invitations',
      (orgId: string) => service.getOrganizationInvitations(orgId)
    ),
    useSearchOrganizations: createQueryHook(
      'search-organizations',
      (searchTerm: string) => service.searchOrganizations(searchTerm)
    )
  };
};

/**
 * Hook factory for organization mutations
 */
const createOrganizationMutationHook = (organizationId: string) => {
  const service = createOrganizationService(organizationId);
  
  return {
    useUpdateOrganization: createMutationHook(
      ({ id, data }: { id: string; data: UpdateOrganizationData }) => 
        service.updateOrganization(id, data),
      {
        onSuccessMessage: 'Organization updated successfully',
        onErrorMessage: 'Failed to update organization'
      }
    ),
    useUpdateMemberRole: createMutationHook(
      ({ organizationId, memberId, role, updatedBy }: {
        organizationId: string;
        memberId: string;
        role: string;
        updatedBy: string;
      }) => service.updateMemberRole(organizationId, memberId, role, updatedBy),
      {
        onSuccessMessage: 'Member role updated successfully',
        onErrorMessage: 'Failed to update member role'
      }
    ),
    useRemoveMember: createMutationHook(
      ({ organizationId, memberId, removedBy }: {
        organizationId: string;
        memberId: string;
        removedBy: string;
      }) => service.removeMember(organizationId, memberId, removedBy),
      {
        onSuccessMessage: 'Member removed successfully',
        onErrorMessage: 'Failed to remove member'
      }
    ),
    useCreateInvitation: createMutationHook(
      ({ organizationId, data, invitedBy }: {
        organizationId: string;
        data: CreateInvitationData;
        invitedBy: string;
      }) => service.createInvitation(organizationId, data, invitedBy),
      {
        onSuccessMessage: 'Invitation sent successfully',
        onErrorMessage: 'Failed to send invitation'
      }
    ),
    useCancelInvitation: createMutationHook(
      ({ organizationId, invitationId }: {
        organizationId: string;
        invitationId: string;
      }) => service.cancelInvitation(organizationId, invitationId),
      {
        onSuccessMessage: 'Invitation cancelled successfully',
        onErrorMessage: 'Failed to cancel invitation'
      }
    )
  };
};

/**
 * Main hook for organization operations
 */
export function useOrganizations(organizationId: string) {
  const queryHooks = useMemo(() => createOrganizationQueryHook(organizationId), [organizationId]);
  const mutationHooks = useMemo(() => createOrganizationMutationHook(organizationId), [organizationId]);
  
  return {
    // Queries
    ...queryHooks,
    
    // Mutations
    ...mutationHooks
  };
}

/**
 * Hook for organization CRUD operations using the generic pattern
 */
export function useOrganizationCrud(organizationId: string) {
  const service = useMemo(() => createOrganizationService(organizationId), [organizationId]);
  
  return useCrudHooks('organization', {
    findById: (id: string) => service.getOrganizationById(id).then(res => 
      res.success ? res.data : null
    ),
    findMany: () => service.getOrganizationById(organizationId).then(res => 
      res.success && res.data ? [res.data] : []
    ),
    create: (data: CreateOrganizationData) => service.updateOrganization(organizationId, data),
    update: (id: string, data: UpdateOrganizationData) => service.updateOrganization(id, data),
    delete: (id: string) => service.updateOrganization(id, { status: 'cancelled' })
  });
}

/**
 * Hook for organization dashboard data
 */
export function useOrganizationDashboard(organizationId: string) {
  const organizations = useOrganizations(organizationId);
  
  return {
    // Organization details
    organization: organizations.useOrganizationById(organizationId),
    
    // Stats
    stats: organizations.useOrganizationStats(organizationId),
    
    // Members
    members: organizations.useOrganizationMembers(organizationId),
    
    // Invitations
    invitations: organizations.useOrganizationInvitations(organizationId)
  };
}

/**
 * Hook for organization management
 */
export function useOrganizationManagement(organizationId: string) {
  const organizations = useOrganizations(organizationId);
  
  return {
    // Organization updates
    updateOrganization: organizations.useUpdateOrganization,
    
    // Member management
    updateMemberRole: organizations.useUpdateMemberRole,
    removeMember: organizations.useRemoveMember,
    
    // Invitation management
    createInvitation: organizations.useCreateInvitation,
    cancelInvitation: organizations.useCancelInvitation,
    
    // Data queries
    members: organizations.useOrganizationMembers(organizationId),
    invitations: organizations.useOrganizationInvitations(organizationId)
  };
}

/**
 * Hook for organization search
 */
export function useOrganizationSearch() {
  const organizations = useOrganizations(''); // No specific org for search
  
  return {
    searchOrganizations: organizations.useSearchOrganizations,
    searchResults: null // This would be managed by the component
  };
}

/**
 * Hook for organization settings
 */
export function useOrganizationSettings(organizationId: string) {
  const organizations = useOrganizations(organizationId);
  
  return {
    organization: organizations.useOrganizationById(organizationId),
    updateOrganization: organizations.useUpdateOrganization
  };
}

/**
 * Hook for organization members management
 */
export function useOrganizationMembers(organizationId: string) {
  const organizations = useOrganizations(organizationId);
  
  return {
    members: organizations.useOrganizationMembers(organizationId),
    updateMemberRole: organizations.useUpdateMemberRole,
    removeMember: organizations.useRemoveMember
  };
}

/**
 * Hook for organization invitations management
 */
export function useOrganizationInvitations(organizationId: string) {
  const organizations = useOrganizations(organizationId);
  
  return {
    invitations: organizations.useOrganizationInvitations(organizationId),
    createInvitation: organizations.useCreateInvitation,
    cancelInvitation: organizations.useCancelInvitation
  };
}

/**
 * Hook for organization analytics and reporting
 */
export function useOrganizationAnalytics(organizationId: string) {
  const organizations = useOrganizations(organizationId);
  
  return {
    stats: organizations.useOrganizationStats(organizationId),
    organization: organizations.useOrganizationById(organizationId)
  };
}
