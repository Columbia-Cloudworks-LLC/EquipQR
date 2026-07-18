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
  const organizationId = currentOrganization?.id;
  const userRole = currentOrganization?.userRole;
  const organizationMemberCount = currentOrganization?.memberCount;
  const teamMemberships = sessionData?.teamMemberships;

  // Create user context — depend on stable session/auth fields, not the
  // getCurrentOrganization() object identity (it may allocate each call).
  const userContext: UserContext | null = useMemo(() => {
    if (!organizationId || !user || !userRole) return null;

    return {
      userId: user.id,
      organizationId,
      userRole: userRole as Role,
      teamMemberships: (teamMemberships ?? []).map(tm => ({
        teamId: tm.teamId,
        role: tm.role
      }))
    };
  }, [organizationId, userRole, user, teamMemberships]);

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

  const isTeamMember = useCallback((teamId: string): boolean => {
    return hasTeamAccess(teamId);
  }, [hasTeamAccess]);

  const isTeamManager = useCallback((teamId: string): boolean => {
    return canManageTeam(teamId);
  }, [canManageTeam]);

  const clearPermissionCache = useCallback(() => {
    permissionEngine.clearCache();
  }, []);

  const organization = useMemo(
    () => buildOrganizationPermissions(hasPermission, hasRole),
    [hasPermission, hasRole],
  );
  const equipment = useMemo(
    () => buildEquipmentPermissions(hasPermission, hasRole, userContext),
    [hasPermission, hasRole, userContext],
  );
  const workOrders = useMemo(
    () => buildWorkOrderPermissions(hasPermission, hasRole, isTeamMember, isTeamManager, userContext),
    [hasPermission, hasRole, isTeamMember, isTeamManager, userContext],
  );
  const teams = useMemo(
    () => buildTeamPermissions(hasPermission, hasRole),
    [hasPermission, hasRole],
  );
  const inventory = useMemo(
    () => buildInventoryPermissions(hasRole),
    [hasRole],
  );
  const getEquipmentNotesPermissions = useMemo(
    () => buildEquipmentNotesPermissions(
      organizationId != null ? { memberCount: organizationMemberCount } : null,
      userContext,
      hasRole,
      isTeamMember,
      canManageTeam,
    ),
    [organizationId, organizationMemberCount, userContext, hasRole, isTeamMember, canManageTeam],
  );

  return useMemo(() => ({
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
    clearPermissionCache,
  }), [
    userContext,
    organization,
    equipment,
    workOrders,
    teams,
    inventory,
    hasRole,
    isTeamMember,
    isTeamManager,
    hasPermission,
    getEquipmentNotesPermissions,
    clearPermissionCache,
  ]);
};
