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
