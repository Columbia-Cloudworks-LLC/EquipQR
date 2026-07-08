export function requireOrganizationId(organizationId: string | undefined): string {
  if (!organizationId) {
    throw new Error('organizationId is required');
  }
  return organizationId;
}
