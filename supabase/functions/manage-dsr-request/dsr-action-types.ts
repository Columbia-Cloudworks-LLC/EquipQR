/**
 * DSR action types, constants, and pure validation helpers.
 */

export type ReadAction = "list_queue" | "get_case";
export type MutatingAction =
  | "verify"
  | "deny"
  | "extend"
  | "record_fulfillment_step"
  | "fulfill_deletion"
  | "complete"
  | "add_note"
  | "request_export"
  | "retry_export"
  | "resend_notice";
export type Action = ReadAction | MutatingAction;

export type DsrRequestRow = {
  id: string;
  status: string;
  request_type: string;
  due_at: string;
  received_at: string;
  updated_at: string;
  organization_id: string | null;
  requester_email: string;
  verification_method: string | null;
  checklist_progress: Record<string, unknown> | null;
  required_checklist_steps: string[] | null;
  export_artifacts: Record<string, unknown> | null;
};

export const VALID_ACTIONS: Action[] = [
  "list_queue",
  "get_case",
  "verify",
  "deny",
  "extend",
  "record_fulfillment_step",
  "fulfill_deletion",
  "complete",
  "add_note",
  "request_export",
  "retry_export",
  "resend_notice",
];

export const VALID_VERIFICATION_METHODS = [
  "authenticated_match",
  "email_challenge",
  "manual_review",
  "authorized_agent",
] as const;

export const NOTICE_ACTIONS = ["deny", "extend", "complete"] as const;
export const CLOSED_STATUSES = ["completed", "denied"];

export function isMutatingAction(action: Action): action is MutatingAction {
  return action !== "list_queue" && action !== "get_case";
}

export function isValidAction(action: string): action is Action {
  return VALID_ACTIONS.includes(action as Action);
}

export function getChecklistProgress(request: DsrRequestRow): Record<string, Record<string, unknown>> {
  if (!request.checklist_progress || typeof request.checklist_progress !== "object") {
    return {};
  }
  return request.checklist_progress as Record<string, Record<string, unknown>>;
}

export function areRequiredChecklistStepsComplete(request: DsrRequestRow): boolean {
  const requiredSteps = request.required_checklist_steps ?? [];
  const progress = getChecklistProgress(request);

  return requiredSteps.every((step) => {
    const item = progress[step];
    return !!item && typeof item.completed_at === "string";
  });
}

export function buildSlaBucket(request: DsrRequestRow): "overdue" | "due_soon" | "on_track" {
  const dueDate = new Date(
    (request as unknown as { extended_due_at?: string | null }).extended_due_at ?? request.due_at,
  );
  const now = new Date();
  if (dueDate.getTime() < now.getTime()) return "overdue";

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (dueDate.getTime() - now.getTime() <= sevenDaysMs) return "due_soon";

  return "on_track";
}

