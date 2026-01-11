/**
 * User Persona Fixtures for Testing
 * 
 * These fixtures represent different user roles and their permissions
 * in the EquipQR system. Use these to test role-based access control
 * and user-specific workflows.
 */

import type { Role, TeamRole } from '@/types/permissions';

export interface TeamMembership {
  teamId: string;
  role: TeamRole;
}

export interface UserPersona {
  id: string;
  email: string;
  name: string;
  organizationRole: Role;
  teamMemberships: TeamMembership[];
}

/**
 * Pre-defined user personas for testing different permission levels
 */
export const personas = {
  /**
   * Organization Owner - Full access to everything
   * Can manage billing, invite members, create teams, and access all data
   */
  owner: {
    id: 'owner-user-id',
    email: 'owner@acme-equipment.com',
    name: 'Alice Owner',
    organizationRole: 'owner' as Role,
    teamMemberships: [
      { teamId: 'team-maintenance', role: 'manager' as TeamRole }
    ]
  },

  /**
   * Organization Admin - Near-full access except billing
   * Can manage members, create teams, and access all equipment/work orders
   */
  admin: {
    id: 'admin-user-id',
    email: 'admin@acme-equipment.com',
    name: 'Bob Admin',
    organizationRole: 'admin' as Role,
    teamMemberships: [
      { teamId: 'team-maintenance', role: 'manager' as TeamRole },
      { teamId: 'team-field', role: 'manager' as TeamRole }
    ]
  },

  /**
   * Team Manager - Can manage their team's resources
   * Can assign work orders, manage team members, and edit team equipment
   */
  teamManager: {
    id: 'manager-user-id',
    email: 'manager@acme-equipment.com',
    name: 'Carol Manager',
    organizationRole: 'member' as Role,
    teamMemberships: [
      { teamId: 'team-maintenance', role: 'manager' as TeamRole }
    ]
  },

  /**
   * Field Technician - Can work on assigned tasks
   * Can view/update assigned work orders, add notes, complete PM checklists
   */
  technician: {
    id: 'tech-user-id',
    email: 'tech@acme-equipment.com',
    name: 'Dave Technician',
    organizationRole: 'member' as Role,
    teamMemberships: [
      { teamId: 'team-maintenance', role: 'technician' as TeamRole }
    ]
  },

  /**
   * Multi-Team Technician - Belongs to multiple teams
   * Can see work orders from multiple teams
   */
  multiTeamTechnician: {
    id: 'multi-tech-user-id',
    email: 'multitech@acme-equipment.com',
    name: 'Eve MultiTeam',
    organizationRole: 'member' as Role,
    teamMemberships: [
      { teamId: 'team-maintenance', role: 'technician' as TeamRole },
      { teamId: 'team-field', role: 'technician' as TeamRole }
    ]
  },

  /**
   * Read-Only Member - Can view but not modify
   * Has organization membership but no team assignments
   */
  readOnlyMember: {
    id: 'readonly-user-id',
    email: 'readonly@acme-equipment.com',
    name: 'Frank Viewer',
    organizationRole: 'member' as Role,
    teamMemberships: []
  },

  /**
   * Viewer Role - Explicitly limited to viewing
   * Cannot create or edit anything
   */
  viewer: {
    id: 'viewer-user-id',
    email: 'viewer@acme-equipment.com',
    name: 'Grace Viewer',
    organizationRole: 'viewer' as Role,
    teamMemberships: []
  }
} as const satisfies Record<string, UserPersona>;

export type PersonaKey = keyof typeof personas;

/**
 * Helper to get a persona by key with type safety
 */
export const getPersona = (key: PersonaKey): UserPersona => personas[key];

/**
 * Create a custom persona for edge case testing
 */
export const createCustomPersona = (
  overrides: Partial<UserPersona> & { id: string }
): UserPersona => ({
  email: `${overrides.id}@test.com`,
  name: 'Custom User',
  organizationRole: 'member',
  teamMemberships: [],
  ...overrides
});
