/** Current assignment is authoritative; legacy display names never create an assignment. */
export function resolveWorkOrderAssignment(source: {
  assignee_id?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assignedTo?: { id: string; name: string; avatarUrl?: string | null } | null;
  assignee?: { id?: string; name?: string | null; avatar_url?: string | null } | null;
}) {
  const id = source.assignee_id !== undefined ? source.assignee_id : source.assigneeId;
  if (!id) return { id: null, name: 'Unassigned', avatarUrl: null };
  const profile = source.assignee?.id === id ? source.assignee : null;
  const assignedTo = source.assignedTo?.id === id ? source.assignedTo : null;
  return {
    id,
    name: profile?.name || assignedTo?.name || source.assigneeName || 'Assigned user',
    avatarUrl: profile?.avatar_url ?? assignedTo?.avatarUrl ?? null,
  };
}
