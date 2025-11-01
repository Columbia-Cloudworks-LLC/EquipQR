// This hook is now deprecated - use useOptimizedWorkOrderAssignment instead
// Keeping for potential backwards compatibility, but functionality is simplified

import { useMemo } from 'react';
import { useSession } from '@/hooks/useSession';
import { useOrganizationAdmins } from './useOrganizationAdmins';

export interface AssignmentOption {
  id: string;
  name: string;
  type: 'admin';
  canSelfAssign?: boolean;
}

export interface WorkOrderAssignmentData {
  availableAssignees: AssignmentOption[];
  canAssignToSelf: boolean;
  currentUserMemberships: string[];
  hasEquipmentTeam: boolean;
  organizationAdmins: AssignmentOption[];
}

export const useWorkOrderAssignment = (organizationId: string) => {
  const { getCurrentOrganization, getUserTeamIds } = useSession();
  const currentOrg = getCurrentOrganization();
  
  // Get organization admins
  const { data: orgAdmins = [] } = useOrganizationAdmins(organizationId);

  const userTeamIds = getUserTeamIds();
  
  const assignmentData: WorkOrderAssignmentData = useMemo(() => {
    const availableAssignees: AssignmentOption[] = [];
    const organizationAdmins: AssignmentOption[] = [];
    
    // Only show organization admins for assignment
    orgAdmins.forEach(admin => {
      const canSelfAssign = admin.id === 'current-user-id'; // This would be actual user ID
      const adminOption = {
        id: admin.id,
        name: canSelfAssign ? `${admin.name} (You)` : admin.name,
        type: 'admin' as const,
        canSelfAssign
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
      organizationAdmins
    };
  }, [orgAdmins, userTeamIds, currentOrg]);

  return {
    ...assignmentData,
    isManager: currentOrg ? ['owner', 'admin'].includes(currentOrg.userRole || '') : false,
    canManageEquipmentTeam: false // No longer relevant
  };
};
