import type { NavigateFunction } from 'react-router-dom';
import type { Notification, NotificationData } from '@/features/work-orders/hooks/useWorkOrderData';
import {
  ORGANIZATION_AUDIT_LOG_PATH,
  ORGANIZATION_MEMBERS_PATH,
  ORGANIZATION_SETTINGS_PATH,
} from '@/features/organization/constants/routes';

export type NotificationDestinationCta = {
  compact: string;
  detail: string;
};

export type NotificationDestination =
  | { navigable: false }
  | {
      navigable: true;
      path: string;
      switchToOrganizationId: string | null;
      cta: NotificationDestinationCta;
    };

const NOT_NAVIGABLE: NotificationDestination = { navigable: false };

type DestinationRule = {
  match: (notification: Pick<Notification, 'type' | 'data'>) => boolean;
  build: (notification: Pick<Notification, 'type' | 'data'>) => NotificationDestination | null;
};

function dataOrgSwitchId(data: NotificationData): string | null {
  return data.organization_id || data.workspace_org_id || null;
}

function go(
  path: string,
  switchToOrganizationId: string | null,
  cta: NotificationDestinationCta,
): NotificationDestination {
  return { navigable: true, path, switchToOrganizationId, cta };
}

const VIEW = (detail: string): NotificationDestinationCta => ({
  compact: 'View →',
  detail,
});

const DESTINATION_RULES: DestinationRule[] = [
  {
    match: (notification) => notification.type.startsWith('ownership_transfer'),
    build: (notification) =>
      go(
        ORGANIZATION_SETTINGS_PATH,
        dataOrgSwitchId(notification.data),
        notification.type === 'ownership_transfer_request'
          ? { compact: 'Respond →', detail: 'Click to respond to transfer request' }
          : VIEW('Click to view organization settings'),
      ),
  },
  {
    match: (notification) => notification.type.startsWith('workspace_merge'),
    build: (notification) =>
      go(
        ORGANIZATION_SETTINGS_PATH,
        dataOrgSwitchId(notification.data),
        notification.type === 'workspace_merge_request'
          ? { compact: 'Respond →', detail: 'Click to respond to merge request' }
          : VIEW('Click to view organization settings'),
      ),
  },
  {
    match: (notification) => notification.type === 'workspace_migration',
    build: (notification) => {
      const workspaceOrgId = notification.data.workspace_org_id;
      if (!workspaceOrgId) return null;
      return go('/dashboard', workspaceOrgId, VIEW('Click to open workspace'));
    },
  },
  {
    match: (notification) => notification.type === 'export_ready',
    build: () => go('/dashboard/reports', null, VIEW('Click to view reports')),
  },
  {
    match: (notification) => notification.type === 'audit_export',
    build: (notification) =>
      go(
        ORGANIZATION_AUDIT_LOG_PATH,
        dataOrgSwitchId(notification.data),
        VIEW('Click to view audit log'),
      ),
  },
  {
    match: (notification) =>
      notification.type === 'team_member_added' ||
      notification.type === 'team_member_role_changed',
    build: (notification) => {
      const teamId = notification.data.team_id;
      if (!teamId) return null;
      return go(`/dashboard/teams/${teamId}`, dataOrgSwitchId(notification.data), VIEW('Click to view team'));
    },
  },
  {
    match: (notification) =>
      notification.type === 'member_added' || notification.type === 'member_role_changed',
    build: (notification) =>
      go(
        ORGANIZATION_MEMBERS_PATH,
        dataOrgSwitchId(notification.data),
        VIEW('Click to view members'),
      ),
  },
  {
    match: (notification) => notification.type === 'member_removed',
    build: () => go('/dashboard', null, VIEW('Click to go to dashboard')),
  },
  {
    match: (notification) => Boolean(notification.data.work_order_id),
    build: (notification) => {
      const workOrderId = notification.data.work_order_id;
      if (!workOrderId) return null;
      return go(
        `/dashboard/work-orders/${workOrderId}`,
        null,
        VIEW('Click to view work order'),
      );
    },
  },
];

export function resolveNotificationDestination(
  notification: Pick<Notification, 'type' | 'data'>,
): NotificationDestination {
  for (const rule of DESTINATION_RULES) {
    if (!rule.match(notification)) continue;
    return rule.build(notification) ?? NOT_NAVIGABLE;
  }
  return NOT_NAVIGABLE;
}

export function notificationHasNavigableAction(
  notification: Pick<Notification, 'type' | 'data'>,
): boolean {
  return resolveNotificationDestination(notification).navigable;
}

type NavigateNotificationOptions = {
  notification: Notification;
  organizationId: string | undefined;
  navigate: NavigateFunction;
  switchOrganization: (orgId: string) => void | Promise<void | boolean>;
};

export async function navigateForNotification({
  notification,
  organizationId,
  navigate,
  switchOrganization,
}: NavigateNotificationOptions): Promise<boolean> {
  const dest = resolveNotificationDestination(notification);
  if (!dest.navigable) return false;

  if (dest.switchToOrganizationId && dest.switchToOrganizationId !== organizationId) {
    const switched = await switchOrganization(dest.switchToOrganizationId);
    if (switched === false) return false;
  }

  navigate(dest.path);
  return true;
}
