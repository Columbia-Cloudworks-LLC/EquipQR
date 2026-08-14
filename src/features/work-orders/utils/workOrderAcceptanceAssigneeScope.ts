/** True when assignee options may use equipment team vs org-admin fallback. */
export function isWorkOrderAcceptanceAssigneeScopeReady(options: {
  teamsReady: boolean;
  equipmentId: string | undefined;
  isSuccess: boolean;
  isPending: boolean;
}): boolean {
  if (!options.teamsReady) return false;
  if (!options.equipmentId) return true;
  return options.isSuccess && !options.isPending;
}
