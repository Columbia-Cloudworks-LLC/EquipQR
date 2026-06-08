// Equipment keys
export const equipment = {
  root: ['equipment'] as const,
  list: (orgId: string, filters?: Record<string, unknown>) =>
    filters ? ['equipment', orgId, 'filtered', filters] as const
            : ['equipment', orgId] as const,
  listOptimized: (orgId: string) => ['equipment', orgId, 'optimized'] as const,
  byId: (orgId: string, equipmentId: string) => ['equipment', orgId, equipmentId] as const,
  scans: (orgId: string, equipmentId: string) =>
    ['equipment', orgId, equipmentId, 'scans'] as const,
  scanFollowUps: (orgId: string, equipmentId: string) =>
    ['equipment', orgId, equipmentId, 'scan-follow-ups'] as const,
  scanHistory: (orgId: string, equipmentId: string) =>
    ['equipment', orgId, equipmentId, 'scan-history'] as const,
  notes: (equipmentId: string, orgId?: string) =>
    orgId ? ['equipment', equipmentId, 'notes', orgId] as const
          : ['equipment', equipmentId, 'notes'] as const,
  notesWithImages: (equipmentId: string) => ['equipment-notes-with-images', equipmentId] as const,
  images: (equipmentId: string) => ['equipment-images', equipmentId] as const,
  notesOptimized: (equipmentId: string) => ['equipment', equipmentId, 'notes-optimized'] as const,
  workingHours: (equipmentId: string, page?: number, pageSize?: number) =>
    page !== undefined ? ['equipment', equipmentId, 'working-hours', page, pageSize] as const
                       : ['equipment', equipmentId, 'working-hours'] as const,
  teamBased: (orgId: string, userTeamIds: string[], isManager: boolean) =>
    ['equipment', orgId, 'team-based', userTeamIds, isManager] as const,
  pmStatus: (equipmentId: string) => ['equipment', equipmentId, 'pm-status'] as const,
};

// Equipment working-hours keys
export const equipmentWorkingHours = {
  historyRoot: (equipmentId: string) =>
    ['equipment-working-hours-history', equipmentId] as const,
  history: (equipmentId: string, page: number = 1, pageSize: number = 10) =>
    ['equipment-working-hours-history', equipmentId, page, pageSize] as const,
  current: (equipmentId: string) => ['equipment-current-working-hours', equipmentId] as const,
};
