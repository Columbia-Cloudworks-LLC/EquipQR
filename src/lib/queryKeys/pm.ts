// Preventive Maintenance keys
export const preventiveMaintenance = {
  root: ['preventativeMaintenance'] as const,
  byWorkOrder: (workOrderId: string) => ['preventativeMaintenance', workOrderId] as const,
  byWorkOrderAndEquipment: (workOrderId: string, equipmentId: string, orgId: string) =>
    ['preventativeMaintenance', workOrderId, equipmentId, orgId] as const,
  all: (workOrderId: string, orgId: string) =>
    ['preventativeMaintenance', 'all', workOrderId, orgId] as const,
  byOrg: (workOrderId: string, orgId: string) =>
    ['preventativeMaintenance', workOrderId, orgId] as const,
  latestCompletedByEquipment: (orgId: string, equipmentId: string) =>
    ['preventativeMaintenance', 'latest-completed', orgId, equipmentId] as const,
};

// PM Templates keys
export const pmTemplates = {
  root: ['pm-templates'] as const,
  list: (orgId: string) => ['pm-templates', orgId] as const,
  byId: (templateId: string) => ['pm-templates', templateId] as const,
};

/** PM template compatibility matching for an equipment record (org-scoped). */
export const pmTemplateMatching = {
  forEquipment: (orgId: string, equipmentId: string) =>
    ['pm-template-matching', orgId, equipmentId] as const,
};

export const pmStatus = {
  root: ['pm-status'] as const,
  byEquipment: (equipmentId: string) => ['pm-status', equipmentId] as const,
  byOrg: (orgId: string) => ['pm-status', 'org', orgId] as const,
};
