// fallow-ignore-file code-duplication
// Duplication rationale: Display utils mirror page-level notification rendering
import type { NavigateFunction } from 'react-router-dom';
import type { Notification } from '@/features/work-orders/hooks/useWorkOrderData';

/** Emoji icon for notification types (bell dropdown and notifications page). */
export function getNotificationEmoji(type: string): string {
  switch (type) {
    case 'work_order_submitted':
      return '📝';
    case 'work_order_accepted':
      return '✅';
    case 'work_order_assigned':
      return '👤';
    case 'work_order_in_progress':
      return '⚡';
    case 'work_order_on_hold':
      return '⏸️';
    case 'work_order_completed':
      return '🎉';
    case 'work_order_cancelled':
      return '❌';
    case 'ownership_transfer_request':
      return '🔄';
    case 'ownership_transfer_accepted':
      return '👑';
    case 'ownership_transfer_rejected':
    case 'workspace_merge_rejected':
      return '🚫';
    case 'ownership_transfer_cancelled':
      return '↩️';
    case 'workspace_merge_request':
      return '🧩';
    case 'workspace_merge_accepted':
      return '✅';
    case 'member_removed':
      return '👋';
    case 'member_added':
      return '➕';
    case 'member_role_changed':
      return '🛡️';
    case 'team_member_added':
      return '👥';
    case 'team_member_role_changed':
      return '🔐';
    case 'audit_export':
      return '📤';
    default:
      return '📢';
  }
}

/** Human-readable label for notification filter badges on the notifications page. */
export function getNotificationTypeLabel(type: string): string {
  switch (type) {
    case 'work_order_submitted':
      return 'Submitted';
    case 'work_order_accepted':
      return 'Accepted';
    case 'work_order_assigned':
      return 'Assigned';
    case 'work_order_in_progress':
      return 'In Progress';
    case 'work_order_on_hold':
      return 'On Hold';
    case 'work_order_completed':
      return 'Completed';
    case 'work_order_cancelled':
      return 'Cancelled';
    case 'ownership_transfer_request':
      return 'Transfer Request';
    case 'ownership_transfer_accepted':
      return 'Transfer Accepted';
    case 'ownership_transfer_rejected':
      return 'Transfer Declined';
    case 'ownership_transfer_cancelled':
      return 'Transfer Cancelled';
    case 'workspace_merge_request':
      return 'Merge Request';
    case 'workspace_merge_accepted':
      return 'Merge Accepted';
    case 'workspace_merge_rejected':
      return 'Merge Declined';
    case 'member_removed':
      return 'Member Removed';
    case 'member_added':
      return 'Member Added';
    case 'member_role_changed':
      return 'Org Role Changed';
    case 'team_member_added':
      return 'Team Member Added';
    case 'team_member_role_changed':
      return 'Team Role Changed';
    case 'audit_export':
      return 'Audit Export';
    default:
      return 'General';
  }
}

export function notificationHasNavigableAction(notification: Notification): boolean {
  return Boolean(
    notification.data?.work_order_id ||
      notification.type.startsWith('ownership_transfer') ||
      notification.type.startsWith('workspace_merge') ||
      notification.type === 'member_added' ||
      notification.type === 'member_removed' ||
      notification.type === 'member_role_changed' ||
      notification.type === 'team_member_added' ||
      notification.type === 'team_member_role_changed' ||
      notification.type === 'audit_export',
  );
}

type NavigateNotificationOptions = {
  notification: Notification;
  organizationId: string | undefined;
  navigate: NavigateFunction;
  switchOrganization: (orgId: string) => Promise<void>;
};

/**
 * Navigate after a notification click. Caller is responsible for mark-as-read.
 * Returns true when navigation was handled.
 */
export async function navigateForNotification({
  notification,
  organizationId,
  navigate,
  switchOrganization,
}: NavigateNotificationOptions): Promise<boolean> {
  if (
    notification.type === 'ownership_transfer_request' ||
    notification.type === 'workspace_merge_request' ||
    notification.type.startsWith('ownership_transfer') ||
    notification.type.startsWith('workspace_merge')
  ) {
    const targetOrgId =
      notification.data?.organization_id || notification.data?.workspace_org_id;
    if (targetOrgId && targetOrgId !== organizationId) {
      await switchOrganization(targetOrgId);
    }
    navigate('/dashboard/organization');
    return true;
  }

  if (
    notification.type === 'member_added' ||
    notification.type === 'member_role_changed' ||
    notification.type === 'team_member_added' ||
    notification.type === 'team_member_role_changed' ||
    notification.type === 'audit_export'
  ) {
    const targetOrgId =
      notification.data?.organization_id || notification.data?.workspace_org_id;
    if (targetOrgId && targetOrgId !== organizationId) {
      await switchOrganization(targetOrgId);
    }
    navigate('/dashboard/organization');
    return true;
  }

  if (notification.data?.work_order_id) {
    navigate(`/dashboard/work-orders/${notification.data.work_order_id}`);
    return true;
  }

  if (notification.type === 'member_removed') {
    navigate('/dashboard');
    return true;
  }

  return false;
}
