import { useMemo, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';
import { permissionEngine } from '@/services/permissions/PermissionEngine';
import { 
  UserContext, 
  Role
} from '@/types/permissions';
import {
  buildEquipmentNotesPermissions,
  buildEquipmentPermissions,
  buildInventoryPermissions,
  buildOrganizationPermissions,
  buildTeamPermissions,
  buildWorkOrderPermissions,
} from './unifiedPermissionBuilders';

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

  const organization = useMemo(
    () => buildOrganizationPermissions(hasPermission, hasRole),
    [hasPermission, hasRole],
  );
  const equipment = buildEquipmentPermissions(hasPermission, hasRole, userContext);
  const workOrders = buildWorkOrderPermissions(hasPermission, hasRole, isTeamMember, isTeamManager);
  const teams = buildTeamPermissions(hasPermission, hasRole);
  const inventory = buildInventoryPermissions(hasRole);
  const getEquipmentNotesPermissions = buildEquipmentNotesPermissions(
    currentOrganization,
    userContext,
    hasRole,
    isTeamMember,
    canManageTeam,
  );

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
