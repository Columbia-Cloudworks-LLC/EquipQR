export type WorkOrderAcceptanceAssigneeGate = {
  showScopedAssigneeList: boolean;
  canSubmit: boolean;
};

/**
 * Full team/org-admin assignee lists wait for a successful equipment fetch.
 * Acceptance stays available after a settled error, using the safe subset
 * (Leave Unassigned / Me).
 */
export function resolveWorkOrderAcceptanceAssigneeGate(options: {
  teamsReady: boolean;
  equipmentId: string | undefined;
  isSuccess: boolean;
  isPending: boolean;
  isError: boolean;
}): WorkOrderAcceptanceAssigneeGate {
  if (!options.teamsReady) {
    return { showScopedAssigneeList: false, canSubmit: false };
  }
  if (!options.equipmentId) {
    return { showScopedAssigneeList: true, canSubmit: true };
  }
  if (options.isPending) {
    return { showScopedAssigneeList: false, canSubmit: false };
  }
  return {
    showScopedAssigneeList: options.isSuccess,
    canSubmit: options.isSuccess || options.isError,
  };
}
