// QuickBooks keys
export const quickBooks = {
  root: ['quickbooks'] as const,
  connection: (orgId: string) => ['quickbooks', 'connection', orgId] as const,
  /** Resolved QuickBooks customer ID (customer account, then legacy mapping). */
  resolvedMapping: (orgId: string, teamId: string) =>
    ['quickbooks', 'resolved-mapping', orgId, teamId] as const,
};

// Google Workspace keys
export const googleWorkspace = {
  root: ['google-workspace'] as const,
  onboardingRoot: ['google-workspace', 'onboarding'] as const,
  onboardingState: (userId: string) => ['google-workspace', 'onboarding', userId] as const,
  connection: (orgId: string) => ['google-workspace', 'connection', orgId] as const,
  directoryUsers: (orgId: string) => ['google-workspace', 'directory-users', orgId] as const,
  directoryUsersLight: (orgId: string) => ['google-workspace', 'directory-users-light', orgId] as const,
  memberClaims: (orgId: string) => ['google-workspace', 'member-claims', orgId] as const,
  destination: (orgId: string, documentType: string) =>
    ['google-workspace', 'destination', orgId, documentType] as const,
};
