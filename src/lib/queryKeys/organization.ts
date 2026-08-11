// Organization keys
export const organization = (orgId: string) => ({
  root: ['organization', orgId] as const,
  members: () => ['organization', orgId, 'members'] as const,
  membersOptimized: () => ['organization', orgId, 'members-optimized'] as const,
  slots: () => ['organization', orgId, 'slots'] as const,
  slotAvailability: () => ['organization', orgId, 'slot-availability'] as const,
  slotPurchases: () => ['organization', orgId, 'slot-purchases'] as const,
  invitations: () => ['organization', orgId, 'invitations'] as const,
  dashboardStats: () => ['organization', orgId, 'dashboard-stats'] as const,
});

// Team keys
export const team = (teamId: string) => ({
  root: ['team', teamId] as const,
  members: () => ['team', teamId, 'members'] as const,
  managerCheck: (userId: string) => ['team', teamId, 'manager', userId] as const,
  /** Signed display URL for the private team-images bucket (TopBar workspace avatar). */
  displayImage: () => ['team', teamId, 'display-image'] as const,
});

// Team stats keys
export const teamStats = {
  all: (orgId: string, teamId: string) => ['team-stats', orgId, teamId] as const,
  equipment: (orgId: string, teamId: string) => ['team-stats', orgId, teamId, 'equipment'] as const,
  workOrders: (orgId: string, teamId: string) => ['team-stats', orgId, teamId, 'work-orders'] as const,
  recentEquipment: (orgId: string, teamId: string) => ['team-stats', orgId, teamId, 'recent-equipment'] as const,
  recentWorkOrders: (orgId: string, teamId: string) => ['team-stats', orgId, teamId, 'recent-work-orders'] as const,
};

export const teams = (orgId: string) => ({
  root: ['teams', orgId] as const,
  optimized: () => ['teams', orgId, 'optimized'] as const,
  listStats: () => ['teams', orgId, 'list-stats'] as const,
  availableUsers: (teamId: string) => ['teams', orgId, 'available-users', teamId] as const,
});

// Workspace personal org merge keys
export const workspacePersonalOrgMerge = (userId: string) => ({
  root: ['workspace-personal-org-merge', userId] as const,
  pending: () => ['workspace-personal-org-merge', userId, 'pending'] as const,
  preview: (workspaceOrgId: string) =>
    ['workspace-personal-org-merge', userId, 'preview', workspaceOrgId] as const,
});

// Dashboard preference keys
export const dashboardPreferences = {
  root: ['dashboard-preferences'] as const,
  byUserOrg: (userId: string, orgId: string) =>
    ['dashboard-preferences', userId, orgId] as const,
};

export const productOnboarding = (orgId: string, userId: string) =>
  ['product-onboarding', orgId, userId] as const;
