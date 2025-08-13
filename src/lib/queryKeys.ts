// Query key factories for consistent query management
// This ensures all queries use the same key patterns

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
});

export const teams = (orgId: string) => ({
  root: ['teams', orgId] as const,
  optimized: () => ['teams', orgId, 'optimized'] as const,
  availableUsers: (teamId: string) => ['teams', orgId, 'available-users', teamId] as const,
});

// Equipment keys
export const equipment = {
  root: ['equipment'] as const,
  list: (orgId: string, filters?: Record<string, unknown>) => 
    filters ? ['equipment', orgId, 'filtered', filters] as const 
            : ['equipment', orgId] as const,
  listOptimized: (orgId: string) => ['equipment', orgId, 'optimized'] as const,
  byId: (orgId: string, equipmentId: string) => ['equipment', orgId, equipmentId] as const,
  notes: (equipmentId: string, orgId?: string) => 
    orgId ? ['equipment', equipmentId, 'notes', orgId] as const
          : ['equipment', equipmentId, 'notes'] as const,
  notesOptimized: (equipmentId: string) => ['equipment', equipmentId, 'notes-optimized'] as const,
  workingHours: (equipmentId: string, page?: number, pageSize?: number) =>
    page !== undefined ? ['equipment', equipmentId, 'working-hours', page, pageSize] as const
                       : ['equipment', equipmentId, 'working-hours'] as const,
  teamBased: (orgId: string, userTeamIds: string[], isManager: boolean) =>
    ['equipment', orgId, 'team-based', userTeamIds, isManager] as const,
};

// Work Order keys  
export const workOrders = {
  root: ['work-orders'] as const,
  list: (orgId: string, filters?: Record<string, unknown>) =>
    filters ? ['work-orders', orgId, 'filtered', filters] as const
            : ['work-orders', orgId] as const,
  enhanced: (orgId: string) => ['work-orders', orgId, 'enhanced'] as const,
  optimized: (orgId: string) => ['work-orders', orgId, 'optimized'] as const,
  byId: (orgId: string, workOrderId: string) => ['work-orders', orgId, workOrderId] as const,
  teamBased: (orgId: string, userTeamIds: string[], isManager: boolean, filters?: Record<string, unknown>) =>
    ['work-orders', orgId, 'team-based', userTeamIds, isManager, filters] as const,
  myWorkOrders: (orgId: string, userId: string) => ['work-orders', orgId, 'my', userId] as const,
  equipmentWorkOrders: (orgId: string, equipmentId: string, status?: string) =>
    status ? ['work-orders', orgId, 'equipment', equipmentId, status] as const
           : ['work-orders', orgId, 'equipment', equipmentId] as const,
};

// PM Templates keys
export const pmTemplates = {
  root: ['pm-templates'] as const,
  list: (orgId: string) => ['pm-templates', orgId] as const,
  byId: (templateId: string) => ['pm-templates', templateId] as const,
};

// Legacy query keys for backward compatibility - these should eventually be migrated
export const queryKeys = {
  organization,
  team,
  teams,
  equipment,
  workOrders,
  pmTemplates
};