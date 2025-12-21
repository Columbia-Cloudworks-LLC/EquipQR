// Validation utility functions for equipment and form validation

import { type EquipmentValidationContext } from '@/features/equipment/types/equipment';

/**
 * Creates a validation context from session data
 */
export const createValidationContext = (
  userRole: 'owner' | 'admin' | 'manager' | 'member',
  isOrgAdmin: boolean,
  teamMemberships: Array<{ team_id: string; role: string }>
): EquipmentValidationContext => {
  return {
    userRole,
    isOrgAdmin,
    teamMemberships: teamMemberships.map(tm => ({
      teamId: tm.team_id,
      role: tm.role
    }))
  };
};

/**
 * Checks if a user can manage a specific team based on their memberships
 */
export const canUserManageTeam = (
  teamId: string,
  context: EquipmentValidationContext
): boolean => {
  if (context.isOrgAdmin || context.userRole === 'owner') {
    return true;
  }

  return context.teamMemberships.some(
    membership => membership.teamId === teamId && 
    (membership.role === 'manager' || membership.role === 'admin')
  );
};

/**
 * Validates team assignment for equipment based on user permissions
 */
export const validateTeamAssignment = (
  teamId: string | undefined,
  context: EquipmentValidationContext
): { valid: boolean; message?: string } => {
  // Org admins and owners can assign to any team or leave unassigned
  if (context.isOrgAdmin || context.userRole === 'owner') {
    return { valid: true };
  }

  // Non-admin users must assign to a team
  if (!teamId) {
    return { 
      valid: false, 
      message: "You must assign equipment to a team you manage" 
    };
  }

  // Check if user can manage the assigned team
  const canManage = canUserManageTeam(teamId, context);
  if (!canManage) {
    return { 
      valid: false, 
      message: "You can only assign equipment to teams you manage" 
    };
  }

  return { valid: true };
};