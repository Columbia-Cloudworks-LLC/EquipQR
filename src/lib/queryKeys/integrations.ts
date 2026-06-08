// QuickBooks keys
export const quickBooks = {
  root: ['quickbooks'] as const,
  connection: (orgId: string) => ['quickbooks', 'connection', orgId] as const,
  teamMapping: (orgId: string, teamId: string) =>
    ['quickbooks', 'team-mapping', orgId, teamId] as const,
};

// Google Workspace keys
export const googleWorkspace = {
  root: ['google-workspace'] as const,
  connection: (orgId: string) => ['google-workspace', 'connection', orgId] as const,
  destination: (orgId: string, documentType: string) =>
    ['google-workspace', 'destination', orgId, documentType] as const,
};
