export const operatorCheckinKeys = {
  all: ['operator-check-ins'] as const,
  templates: (orgId: string) => [...operatorCheckinKeys.all, 'templates', orgId] as const,
  template: (templateId: string) => [...operatorCheckinKeys.all, 'template', templateId] as const,
  settings: (orgId: string) => [...operatorCheckinKeys.all, 'settings', orgId] as const,
  equipmentAssignments: (equipmentId: string) =>
    [...operatorCheckinKeys.all, 'equipment-assignments', equipmentId] as const,
  organizationAssignments: (orgId: string) =>
    [...operatorCheckinKeys.all, 'organization-assignments', orgId] as const,
  submissions: (orgId: string, filtersKey: string) =>
    [...operatorCheckinKeys.all, 'submissions', orgId, filtersKey] as const,
};
