import type { OperatorCheckinSubmission } from '@/features/operator-check-ins/services/operatorCheckinSubmissionsService';

export function getSubmissionTemplateName(submission: OperatorCheckinSubmission): string | null {
  const snapshot = submission.template_snapshot;
  if (typeof snapshot !== 'object' || snapshot === null) return null;
  const name = (snapshot as { name?: unknown }).name;
  return typeof name === 'string' && name.trim().length > 0 ? name : null;
}
