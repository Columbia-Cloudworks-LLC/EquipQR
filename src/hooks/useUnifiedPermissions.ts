import { useMemo, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';
import { permissionEngine } from '@/services/permissions/PermissionEngine';
import { 
  UserContext, 
  EntityPermissions, 
  WorkOrderDetailedPermissions,
  OrganizationPermissions,
  EquipmentNotesPermissions,
  Role
} from '@/types/permissions';
import { WorkOrderData } from '@/features/work-orders/types/workOrder';

export const useUnifiedPermissions = () => {
  const { getCurrentOrganization, hasTeamAccess, canManageTeam, sessionData } = useSession();
  const { user } = useAuth();

  const currentOrganization = getCurrentOrganization();

  // Create user context
  const userContext: UserContext | null = useMemo(() => {
    if (!currentOrganization || !user) return null;

    return {
      userId: user.id,
      organizationId: currentOrganization.id,
      userRole: currentOrganization.userRole as Role,
      teamMemberships: (sessionData?.teamMemberships ?? []).map(tm => ({
        teamId: tm.teamId,
        role: tm.role
      }))
    };
  }, [currentOrganization, user, sessionData]);

  // Helper functions
  const hasPermission = useCallback((permission: string, entityContext?: { teamId?: string; assigneeId?: string; status?: string; createdBy?: string }): boolean => {
    if (!userContext) return false;
    return permissionEngine.hasPermission(permission, userContext, entityContext);
  }, [userContext]);

  const hasRole = useCallback((roles: string | string[]): boolean => {
    if (!userContext) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(userContext.userRole);
  }, [userContext]);

  const isTeamMember = (teamId: string): boolean => {
    return hasTeamAccess(teamId);
  };

  const isTeamManager = (teamId: string): boolean => {
    return canManageTeam(teamId);
  };

  // Organization permissions
  const organization: OrganizationPermissions = useMemo(() => ({
    canManage: hasPermission('organization.manage'),
    canInviteMembers: hasPermission('organization.invite'),
    canCreateTeams: hasPermission('organization.manage'),
    canViewBilling: hasRole(['owner', 'admin']),
    canManageMembers: hasRole(['owner', 'admin'])
  }), [hasPermission, hasRole]);

  // Equipment permissions
  const equipment = {
    getPermissions: (equipmentTeamId?: string): EntityPermissions => {
      const entityContext = equipmentTeamId ? { teamId: equipmentTeamId } : undefined;

      return {
        canView: hasPermission('equipment.view', entityContext),
        canCreate: hasPermission('equipment.create', entityContext),
        canEdit: hasPermission('equipment.edit', entityContext),
        canDelete: hasRole(['owner', 'admin']),
        canAddNotes: hasPermission('equipment.view', entityContext),
        canAddImages: hasPermission('equipment.view', entityContext)
      };
    },
    canViewAll: hasRole(['owner', 'admin', 'member']),
    /**
     * Org-wide create gate. True for owners/admins only; team-scoped users
     * must use `canCreateForTeam(teamId)` or `canCreateForAnyTeam` instead.
     */
    canCreateAny: hasRole(['owner', 'admin']),
    /**
     * Check if user can create equipment for a specific team.
     * Owners/admins pass org-wide; team managers and technicians pass for
     * teams where they hold that role. Other team roles (requestor, viewer)
     * and members without team roles are denied. Mirrors the
     * `team_members_create_equipment` RLS policy.
     */
    canCreateForTeam: (teamId: string): boolean => {
      return hasPermission('equipment.create', { teamId });
    },
    /**
     * True when the user can create equipment for at least one team in the
     * current organization. Owners/admins pass without team context; team
     * managers and technicians pass when they hold either role on any team.
     * Used to gate page-level "Add Equipment" affordances when no specific
     * team is in scope.
     */
    canCreateForAnyTeam: hasRole(['owner', 'admin'])
      || (userContext?.teamMemberships ?? []).some(tm => tm.role === 'manager' || tm.role === 'technician')
  };

  // Work order permissions
  const workOrders = {
    getPermissions: (workOrder?: WorkOrderData): EntityPermissions => {
      const entityContext = workOrder ? {
        teamId: workOrder.teamId,
        assigneeId: workOrder.assigneeId,
        status: workOrder.status,
        createdBy: workOrder.createdByName
      } : undefined;

      return {
        canView: hasPermission('workorder.view', entityContext),
        canCreate: hasRole(['owner', 'admin', 'member']),
        canEdit: hasPermission('workorder.edit', entityContext),
        canDelete: hasRole(['owner', 'admin']),
        canAssign: hasPermission('workorder.assign', entityContext),
        canChangeStatus: hasPermission('workorder.changestatus', entityContext),
        canAddNotes: hasPermission('workorder.view', entityContext),
        canAddImages: hasPermission('workorder.view', entityContext)
      };
    },
    getDetailedPermissions: (workOrder?: WorkOrderData): WorkOrderDetailedPermissions => {
      const entityContext = workOrder ? {
        teamId: workOrder.teamId,
        assigneeId: workOrder.assigneeId,
        status: workOrder.status,
        createdBy: workOrder.createdByName
      } : undefined;

      const canEdit = hasPermission('workorder.edit', entityContext);
      const canView = hasPermission('workorder.view', entityContext);
      const isLocked = workOrder?.status === 'completed' || workOrder?.status === 'cancelled';

      return {
        canEdit: canEdit && !isLocked,
        canEditPriority: canEdit && !isLocked,
        canEditAssignment: hasPermission('workorder.assign', entityContext) && !isLocked,
        canEditDueDate: canView && !isLocked,
        canEditDescription: canView && !isLocked,
        canChangeStatus: hasPermission('workorder.changestatus', entityContext),
        canAddNotes: canView && !isLocked,
        canAddImages: canView && !isLocked,
        canAddCosts: (hasRole(['owner', 'admin']) || isTeamManager(workOrder?.teamId)) && !isLocked,
        canEditCosts: (hasRole(['owner', 'admin']) || isTeamManager(workOrder?.teamId)) && !isLocked,
        canViewPM: hasRole(['owner', 'admin']) || isTeamMember(workOrder?.teamId),
        canEditPM: (hasRole(['owner', 'admin']) || isTeamMember(workOrder?.teamId)) && !isLocked
      };
    },
    canViewAll: hasRole(['owner', 'admin']),
    canCreateAny: hasRole(['owner', 'admin', 'member']),
    canAssignAny: hasRole(['owner', 'admin'])
  };

  // Team permissions
  const teams = {
    getPermissions: (teamId?: string): EntityPermissions => {
      const entityContext = teamId ? { teamId } : undefined;
      
      return {
        canView: hasPermission('team.view', entityContext),
        canCreate: hasRole(['owner', 'admin']),
        canEdit: hasPermission('team.manage', entityContext),
        canDelete: hasRole(['owner', 'admin']),
        canAddNotes: false,
        canAddImages: false
      };
    },
    canViewAll: hasRole(['owner', 'admin']),
    canCreateAny: hasRole(['owner', 'admin']),
    canManageAny: hasRole(['owner', 'admin'])
  };

  // Inventory permissions
  // Note: isPartsManager must be passed from the calling component using useIsPartsManager hook
  const inventory = {
    getPermissions: (isPartsManager: boolean = false): EntityPermissions => ({
      canView: hasRole(['owner', 'admin', 'member']) || isPartsManager,
      canCreate: hasRole(['owner', 'admin']) || isPartsManager,
      canEdit: hasRole(['owner', 'admin']) || isPartsManager,
      canDelete: hasRole(['owner', 'admin']),
      canAddNotes: hasRole(['owner', 'admin', 'member']) || isPartsManager,
      canAddImages: hasRole(['owner', 'admin', 'member']) || isPartsManager
    }),
    canManageAny: (isPartsManager: boolean = false) => hasRole(['owner', 'admin']) || isPartsManager,
    canManagePartsManagers: hasRole(['owner', 'admin'])
  };

  // Equipment notes permissions
  const getEquipmentNotesPermissions = (equipmentTeamId?: string): EquipmentNotesPermissions => {
    const hasTeamAccess = equipmentTeamId ? isTeamMember(equipmentTeamId) : true;
    const isTeamManager = equipmentTeamId ? canManageTeam(equipmentTeamId) : false;
    const isOrgAdmin = hasRole(['owner', 'admin']);
    
    // Check if organization is single-user (simplified check)
    const isSingleUserOrg = currentOrganization?.memberCount === 1;

    return {
      canViewNotes: hasTeamAccess || isOrgAdmin,
      canAddPublicNote: hasTeamAccess || isOrgAdmin,
      canAddPrivateNote: (hasTeamAccess && hasRole(['member', 'admin', 'owner'])) || isOrgAdmin,
      canEditOwnNote: (note) => note.author_id === userContext?.userId,
      canEditAnyNote: isOrgAdmin || isTeamManager,
      canDeleteOwnNote: (note) => note.author_id === userContext?.userId,
      canDeleteAnyNote: isOrgAdmin || isTeamManager,
      canUploadImages: !isSingleUserOrg && (hasTeamAccess || isOrgAdmin),
      canDeleteImages: isOrgAdmin || isTeamManager,
      canSetDisplayImage: isOrgAdmin || isTeamManager
    };
  };

  return {
    // Context
    context: userContext,
    
    // Permissions by entity
    organization,
    equipment,
    workOrders,
    teams,
    inventory,
    
    // Utility functions
    hasRole,
    isTeamMember,
    isTeamManager,
    hasPermission,
    getEquipmentNotesPermissions,
    
    // Cache management
    clearPermissionCache: () => permissionEngine.clearCache()
  };
};

export type UnifiedPermissions = ReturnType<typeof useUnifiedPermissions>;
