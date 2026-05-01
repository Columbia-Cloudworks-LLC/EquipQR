
// Compatibility layer for usePermissions hook
import { useUnifiedPermissions } from './useUnifiedPermissions';
import type { WorkOrderData } from '@/features/work-orders/types/workOrder';

export const usePermissions = () => {
  const permissions = useUnifiedPermissions();
  
  // Legacy compatibility - map new structure to old expected interface
  return {
    canManageTeam: (teamId: string) => permissions.teams.getPermissions(teamId).canEdit,
    canViewTeam: (teamId: string) => permissions.teams.getPermissions(teamId).canView,
    canCreateTeam: () => permissions.teams.canCreateAny,
    canManageEquipment: (equipmentTeamId?: string) => permissions.equipment.getPermissions(equipmentTeamId).canEdit,
    canViewEquipment: (equipmentTeamId?: string) => permissions.equipment.getPermissions(equipmentTeamId).canView,
    /**
     * Org-wide equipment-create gate. True only for owners/admins; preserved
     * as the no-argument compatibility surface so inventory pages and other
     * call sites that intentionally gate on org-wide create rights are not
     * silently broadened. Team managers and technicians should call
     * `canCreateEquipmentForTeam(teamId)` or `canCreateEquipmentForAnyTeam()`.
     */
    canCreateEquipment: () => permissions.equipment.canCreateAny,
    /**
     * Team-aware equipment-create gate. True for org owners/admins on every
     * team and for team managers/technicians on teams where they hold that
     * role. Mirrors the `team_members_create_equipment` RLS policy.
     */
    canCreateEquipmentForTeam: (teamId: string) => permissions.equipment.canCreateForTeam(teamId),
    /**
     * True when the user can create equipment for at least one team. Used to
     * gate page-level "Add Equipment" affordances on `/dashboard/equipment`
     * where no specific team is in scope yet.
     */
    canCreateEquipmentForAnyTeam: () => permissions.equipment.canCreateForAnyTeam,
    canUpdateEquipmentStatus: (equipmentTeamId?: string) => permissions.equipment.getPermissions(equipmentTeamId).canEdit,
    canManageWorkOrder: (workOrder?: WorkOrderData) => permissions.workOrders.getPermissions(workOrder).canEdit,
    canViewWorkOrder: (workOrder?: WorkOrderData) => permissions.workOrders.getPermissions(workOrder).canView,
    canCreateWorkOrder: () => permissions.workOrders.canCreateAny,
    canAssignWorkOrder: (workOrder?: WorkOrderData) => permissions.workOrders.getPermissions(workOrder).canAssign,
    canChangeWorkOrderStatus: (workOrder?: WorkOrderData) => permissions.workOrders.getPermissions(workOrder).canChangeStatus,
    // Organization permissions
    canManageOrganization: () => permissions.organization.canManage,
    canInviteMembers: () => permissions.organization.canInviteMembers,
    isOrganizationAdmin: () => permissions.organization.canManage, // Add missing method
    // Inventory permissions
    // Note: isPartsManager must be determined by the calling component using useIsPartsManager hook
    canManageInventory: (isPartsManager: boolean = false) => permissions.inventory.canManageAny(isPartsManager),
    canManagePartsManagers: () => permissions.inventory.canManagePartsManagers,
    // Utility functions
    hasRole: permissions.hasRole,
    isTeamMember: permissions.isTeamMember,
    isTeamManager: permissions.isTeamManager
  };
};

// Add the specific hook that's being imported
export const useWorkOrderPermissions = (workOrder?: WorkOrderData) => {
  const permissions = useUnifiedPermissions();
  return permissions.workOrders.getPermissions(workOrder);
};
