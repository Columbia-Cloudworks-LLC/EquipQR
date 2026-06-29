// Work Order keys
export const workOrders = {
  root: ['work-orders'] as const,
  list: (orgId: string, filters?: Record<string, unknown>) =>
    filters ? ['work-orders', orgId, 'filtered', filters] as const
            : ['work-orders', orgId] as const,
  enhanced: (orgId: string) => ['work-orders', orgId, 'enhanced'] as const,
  enhancedById: (orgId: string, workOrderId: string) => ['workOrder', 'enhanced', orgId, workOrderId] as const,
  optimized: (orgId: string) => ['work-orders', orgId, 'optimized'] as const,
  byId: (orgId: string, workOrderId: string) => ['work-orders', orgId, workOrderId] as const,
  legacyById: (orgId: string, workOrderId: string) => ['workOrder', orgId, workOrderId] as const,
  legacyList: (orgId: string) => ['workOrders', orgId] as const,
  enhancedList: (orgId: string) => ['enhanced-work-orders', orgId] as const,
  teamBasedList: (orgId: string) => ['team-based-work-orders', orgId] as const,
  notes: (workOrderId: string) => ['work-order-notes', workOrderId] as const,
  notesWithImages: (workOrderId: string) => ['work-order-notes-with-images', workOrderId] as const,
  images: (workOrderId: string) => ['work-order-images', workOrderId] as const,
  teamBased: (orgId: string, userTeamIds: string[], isManager: boolean, filters?: Record<string, unknown>) =>
    ['work-orders', orgId, 'team-based', userTeamIds, isManager, filters] as const,
  myWorkOrders: (orgId: string, userId: string) => ['work-orders', orgId, 'my', userId] as const,
  equipmentWorkOrders: (orgId: string, equipmentId: string, status?: string) =>
    status ? ['work-orders', orgId, 'equipment', equipmentId, status] as const
           : ['work-orders', orgId, 'equipment', equipmentId] as const,
  timeline: (workOrderId: string) => ['work-order-timeline', workOrderId] as const,
};

// Work-order equipment keys
export const workOrderEquipment = {
  byWorkOrder: (workOrderId: string) => ['work-order-equipment', workOrderId] as const,
  primary: (workOrderId: string) => ['work-order-equipment', workOrderId, 'primary'] as const,
  teamEquipment: (teamId: string, workOrderId: string, excludeIds: string[] = []) =>
    ['team-equipment-for-work-order', teamId, workOrderId, excludeIds] as const,
  count: (workOrderId: string) => ['work-order-equipment-count', workOrderId] as const,
};

// Work-order metrics keys
export const workOrderMetrics = {
  imageCount: (workOrderId: string) => ['workOrderImageCount', workOrderId] as const,
  costsSubtotal: (workOrderId: string) => ['work-order-costs-subtotal', workOrderId] as const,
};

export const workOrderExports = {
  excelCount: (orgId: string, filters: unknown) =>
    ['work-order-excel-count', orgId, filters] as const,
};

export const exportArtifacts = {
  root: ['export-artifacts'] as const,
  byRecord: (orgId: string, recordType: string, recordId: string) =>
    ['export-artifacts', orgId, recordType, recordId] as const,
  latest: (orgId: string, recordType: string, recordId: string, exportChannel: string, artifactKind: string) =>
    ['export-artifacts', orgId, recordType, recordId, exportChannel, artifactKind, 'latest'] as const,
};
