export const operatorCheckinKeys = {
  all: ['operator-check-ins'] as const,
  templates: (orgId: string) => [...operatorCheckinKeys.all, 'templates', orgId] as const,
  template: (templateId: string) => [...operatorCheckinKeys.all, 'template', templateId] as const,
  settings: (orgId: string) => [...operatorCheckinKeys.all, 'settings', orgId] as const,
  equipmentAssignments: (equipmentId: string, orgId: string) =>
    [...operatorCheckinKeys.all, 'equipment-assignments', orgId, equipmentId] as const,
  organizationAssignments: (orgId: string) =>
    [...operatorCheckinKeys.all, 'organization-assignments', orgId] as const,
  token: (assignmentId: string) => [...operatorCheckinKeys.all, 'token', assignmentId] as const,
  submissions: (orgId: string, filtersKey: string) =>
    [...operatorCheckinKeys.all, 'submissions', orgId, filtersKey] as const,
  templateIdsWithSubmissions: (orgId: string) =>
    [...operatorCheckinKeys.all, 'template-ids-with-submissions', orgId] as const,
};
