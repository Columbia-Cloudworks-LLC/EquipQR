
import { useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { Tables } from '@/integrations/supabase/types';

export interface WorkOrderPermissionLevels {
  isManager: boolean;
  isRequestor: boolean;
  isTechnician: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canChangeStatus: boolean;
  canAddNotes: boolean;
  canAddImages: boolean;
  getFormMode: (workOrder: Tables<'work_orders'>, createdByCurrentUser: boolean) => 'manager' | 'requestor' | 'view_only';
}

export const useWorkOrderPermissionLevels = (): WorkOrderPermissionLevels => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { data: members = [] } = useOrganizationMembers(currentOrganization?.id || '');
  const { teamMemberships } = useTeamMembership();

  // Memoize permission calculations to prevent unnecessary re-renders
  const permissions = useMemo(() => {
    // Determine user role in organization
    const currentMember = members.find(m => m.id === user?.id);
    const isManager = currentMember?.role === 'owner' || currentMember?.role === 'admin';
    
    // Check if user is a technician in any team
    const isTechnician = teamMemberships.some(tm => tm.role === 'technician' || tm.role === 'manager');
    
    // All users can be requestors
    const isRequestor = true;

    // Users can edit if they are managers or technicians
    const canEdit = isManager || isTechnician;

    const getFormMode = (workOrder: Tables<'work_orders'>, createdByCurrentUser: boolean): 'manager' | 'requestor' | 'view_only' => {
      if (isManager) {
        return 'manager';
      }
      
      if (createdByCurrentUser && workOrder?.status === 'submitted') {
        return 'requestor';
      }
      
      if (isTechnician && workOrder?.assignee_id === user?.id) {
        return 'manager'; // Technicians can act as managers for their assigned work orders
      }
      
      return 'view_only';
    };

    return {
      isManager,
      isRequestor,
      isTechnician,
      canEdit,
      canDelete: isManager,
      canAssign: isManager,
      canChangeStatus: isManager || isTechnician,
      canAddNotes: true,
      canAddImages: true,
      getFormMode
    };
  }, [user?.id, members, teamMemberships]);

  return permissions;
};


