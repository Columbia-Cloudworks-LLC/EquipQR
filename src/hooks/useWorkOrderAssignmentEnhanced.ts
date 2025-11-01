
// This hook is deprecated - use useOptimizedWorkOrderAssignment instead
// This is a simplified version for backwards compatibility

import { useMemo } from 'react';
import { useSession } from '@/hooks/useSession';
import { useOrganizationAdmins } from './useOrganizationAdmins';

export interface EnhancedAssignmentOption {
  id: string;
  name: string;
  type: 'admin';
  canSelfAssign?: boolean;
  email?: string;
  role?: string;
}

export interface EnhancedWorkOrderAssignmentData {
  availableAssignees: EnhancedAssignmentOption[];
  canAssignToSelf: boolean;
  currentUserMemberships: string[];
  hasEquipmentTeam: boolean;
  organizationAdmins: EnhancedAssignmentOption[];
  assignmentStrategy: 'admin_based';
}

export const useWorkOrderAssignmentEnhanced = (organizationId: string) => {
  const { getCurrentOrganization, getUserTeamIds } = useSession();
  const currentOrg = getCurrentOrganization();
  
  // Get organization admins
  const { data: orgAdmins = [] } = useOrganizationAdmins(organizationId);

  const userTeamIds = getUserTeamIds();
  const currentUserId = 'current-user-id'; // This would come from auth context
  
  const assignmentData: EnhancedWorkOrderAssignmentData = useMemo(() => {
    const availableAssignees: EnhancedAssignmentOption[] = [];
    const organizationAdmins: EnhancedAssignmentOption[] = [];
    
    // Only show organization admins for assignment
    orgAdmins.forEach(admin => {
      const canSelfAssign = admin.id === currentUserId;
      const adminOption = {
        id: admin.id,
        name: canSelfAssign ? `${admin.name} (You)` : admin.name,
        type: 'admin' as const,
        canSelfAssign,
        email: admin.email,
        role: admin.role
      };
      
      availableAssignees.push(adminOption);
      organizationAdmins.push(adminOption);
    });
    
    // Check if current user can assign to themselves
    const canAssignToSelf = currentOrg ? ['owner', 'admin'].includes(currentOrg.userRole || '') : false;
    
    return {
      availableAssignees,
      canAssignToSelf,
      currentUserMemberships: userTeamIds,
      hasEquipmentTeam: false, // No longer using team-based assignments
      organizationAdmins,
      assignmentStrategy: 'admin_based' as const
    };
  }, [orgAdmins, userTeamIds, currentOrg, currentUserId]);

  return {
    ...assignmentData,
    isManager: currentOrg ? ['owner', 'admin'].includes(currentOrg.userRole || '') : false,
    canManageEquipmentTeam: false, // No longer relevant
    totalAssigneeCount: assignmentData.availableAssignees.length,
    teamMemberCount: 0, // No longer relevant
    adminCount: orgAdmins.length
  };
};
