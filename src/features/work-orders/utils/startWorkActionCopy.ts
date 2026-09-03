export const START_WORK_ASSIGNEE_REQUIRED_COPY =
  'Select an assignee to enable starting work';

export function getStartWorkActionDescription(hasAssignee: boolean): string {
  return hasAssignee
    ? 'Begin working on this order'
    : START_WORK_ASSIGNEE_REQUIRED_COPY;
}
