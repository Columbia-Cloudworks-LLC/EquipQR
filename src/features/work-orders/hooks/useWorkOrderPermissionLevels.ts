
import { useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { isOrgAdminRole } from '@/features/teams/utils/teamAccessScope';
import { Tables } from '@/integrations/supabase/types';
import { resolveWorkOrderExportAudience } from '@/features/work-orders/utils/workOrderExportAccess';

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
  exportAudience: 'admin' | 'customer-safe' | 'none';
  getFormMode: (workOrder: Tables<'work_orders'>, createdByCurrentUser: boolean) => 'manager' | 'requestor' | 'view_only';
}

export const useWorkOrderPermissionLevels = (): WorkOrderPermissionLevels => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { teamMemberships } = useTeamMembership();
  const isOrgAdmin = isOrgAdminRole(currentOrganization?.userRole);

  // Memoize permission calculations to prevent unnecessary re-renders
  const permissions = useMemo(() => {
    const isManager = isOrgAdmin;
    const exportAudience = resolveWorkOrderExportAudience(isManager, teamMemberships);
    
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
      exportAudience,
      getFormMode
    };
  }, [user?.id, isOrgAdmin, teamMemberships]);

  return permissions;
};


