import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getAuthClaims } from '@/lib/authClaims';

export interface NotificationChannelsPreference {
  in_app: boolean;
  email: boolean;
  web_push: boolean;
}

export interface NotificationQuietHoursPreference {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

export type NotificationDigestMode = 'realtime' | 'daily';

export interface NotificationDigestPreference {
  mode: NotificationDigestMode;
}

export interface TeamStatusPreference {
  enabled: boolean;
  statuses: string[];
}

export interface UserOrgNotificationPreferencesDocument {
  channels: NotificationChannelsPreference;
  quiet_hours: NotificationQuietHoursPreference;
  digest: NotificationDigestPreference;
  high_priority_only: boolean;
  teams: Record<string, TeamStatusPreference>;
}

export interface UserTeamForNotifications {
  organization_id: string;
  organization_name: string;
  team_id: string;
  team_name: string;
  user_role: string;
  has_access: boolean;
}

export function getBrowserDefaultTimezone(): string {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return resolved && resolved.trim().length > 0 ? resolved : 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getDefaultNotificationPreferences(
  defaultTimezone: string = getBrowserDefaultTimezone(),
): UserOrgNotificationPreferencesDocument {
  return {
    channels: {
      in_app: true,
      email: true,
      web_push: true,
    },
    quiet_hours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
      timezone: defaultTimezone,
    },
    digest: {
      mode: 'realtime',
    },
    high_priority_only: false,
    teams: {},
  };
}

function isJsonRecord(value: Json | undefined): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeNotificationPreferences(
  raw: Json | undefined,
  defaultTimezone: string = getBrowserDefaultTimezone(),
): UserOrgNotificationPreferencesDocument {
  const defaults = getDefaultNotificationPreferences(defaultTimezone);
  if (!isJsonRecord(raw)) {
    return defaults;
  }

  const rawChannels = isJsonRecord(raw.channels) ? raw.channels : {};
  const channels: NotificationChannelsPreference = {
    in_app: typeof rawChannels.in_app === 'boolean' ? rawChannels.in_app : defaults.channels.in_app,
    email: typeof rawChannels.email === 'boolean' ? rawChannels.email : defaults.channels.email,
    web_push:
      typeof rawChannels.web_push === 'boolean' ? rawChannels.web_push : defaults.channels.web_push,
  };

  const rawQuiet = isJsonRecord(raw.quiet_hours) ? raw.quiet_hours : {};
  const quietEnabled =
    typeof rawQuiet.enabled === 'boolean' ? rawQuiet.enabled : defaults.quiet_hours.enabled;
  const rawTimezone =
    typeof rawQuiet.timezone === 'string' && rawQuiet.timezone.trim().length > 0
      ? rawQuiet.timezone.trim()
      : '';
  // When quiet hours have not been enabled and the stored timezone is missing or 'UTC' from
  // the initial migration, default to the user's browser timezone on UI load.
  const resolvedTimezone =
    rawTimezone.length > 0 && (quietEnabled || rawTimezone !== 'UTC')
      ? rawTimezone
      : defaultTimezone;

  const quiet_hours: NotificationQuietHoursPreference = {
    enabled: quietEnabled,
    start:
      typeof rawQuiet.start === 'string' && rawQuiet.start.trim().length > 0
        ? rawQuiet.start.trim()
        : defaults.quiet_hours.start,
    end:
      typeof rawQuiet.end === 'string' && rawQuiet.end.trim().length > 0
        ? rawQuiet.end.trim()
        : defaults.quiet_hours.end,
    timezone: resolvedTimezone,
  };

  const rawDigest = isJsonRecord(raw.digest) ? raw.digest : {};
  const digestMode: NotificationDigestMode =
    rawDigest.mode === 'daily' ? 'daily' : 'realtime';

  const high_priority_only =
    typeof raw.high_priority_only === 'boolean'
      ? raw.high_priority_only
      : defaults.high_priority_only;

  const teams: Record<string, TeamStatusPreference> = {};
  if (isJsonRecord(raw.teams)) {
    for (const [teamId, teamVal] of Object.entries(raw.teams)) {
      if (isJsonRecord(teamVal)) {
        const enabled = typeof teamVal.enabled === 'boolean' ? teamVal.enabled : false;
        const statuses = Array.isArray(teamVal.statuses)
          ? teamVal.statuses.filter((item): item is string => typeof item === 'string')
          : [];
        teams[teamId] = { enabled, statuses };
      }
    }
  }

  return {
    channels,
    quiet_hours,
    digest: { mode: digestMode },
    high_priority_only,
    teams,
  };
}

export function serializeNotificationPreferences(
  doc: UserOrgNotificationPreferencesDocument,
): Json {
  const teamsJson: { [key: string]: Json } = {};
  for (const [teamId, teamPref] of Object.entries(doc.teams)) {
    teamsJson[teamId] = {
      enabled: teamPref.enabled,
      statuses: teamPref.statuses,
    };
  }

  return {
    channels: {
      in_app: doc.channels.in_app,
      email: doc.channels.email,
      web_push: doc.channels.web_push,
    },
    quiet_hours: {
      enabled: doc.quiet_hours.enabled,
      start: doc.quiet_hours.start,
      end: doc.quiet_hours.end,
      timezone: doc.quiet_hours.timezone,
    },
    digest: {
      mode: doc.digest.mode,
    },
    high_priority_only: doc.high_priority_only,
    teams: teamsJson,
  };
}

// Hook to get user's teams across all organizations for notification settings
export const useUserTeamsForNotifications = () => {
  return useQuery({
    queryKey: ['user-teams-notifications'],
    queryFn: async () => {
      const claims = await getAuthClaims();
      if (!claims) return [];

      const { data, error } = await supabase.rpc('get_user_teams_for_notifications', {
        user_uuid: claims.sub,
      });

      if (error) throw error;
      return (data ?? []) as UserTeamForNotifications[];
    },
  });
};

// Hook to get per-organization notification preference documents (#1438)
export const useOrgNotificationPreferences = () => {
  return useQuery({
    queryKey: ['org-notification-preferences'],
    queryFn: async (): Promise<Record<string, UserOrgNotificationPreferencesDocument>> => {
      const claims = await getAuthClaims();
      if (!claims) return {};

      const { data, error } = await supabase
        .from('user_org_notification_preferences')
        .select('organization_id, preferences')
        .eq('user_id', claims.sub);

      if (error) throw error;

      const byOrg: Record<string, UserOrgNotificationPreferencesDocument> = {};
      for (const row of data ?? []) {
        byOrg[row.organization_id] = normalizeNotificationPreferences(row.preferences);
      }
      return byOrg;
    },
  });
};

// Hook to upsert an organization's notification preference document (#1438)
export const useUpsertOrgNotificationPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      preferences,
    }: {
      organizationId: string;
      preferences: UserOrgNotificationPreferencesDocument;
    }) => {
      const claims = await getAuthClaims();
      if (!claims) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_org_notification_preferences')
        .upsert(
          {
            user_id: claims.sub,
            organization_id: organizationId,
            preferences: serializeNotificationPreferences(preferences),
          },
          {
            onConflict: 'user_id,organization_id',
          },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-notification-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Notification preferences updated');
    },
    onError: (error) => {
      logger.error('Error updating notification preferences:', error);
      toast.error('Failed to update notification preferences');
    },
  });
};

// Hook to get real-time notifications with Supabase subscriptions
// Includes both org-specific notifications AND global notifications (like ownership transfers)
export const useRealTimeNotifications = (organizationId: string) => {
  return useQuery({
    queryKey: ['notifications', organizationId],
    queryFn: async () => {
      const claims = await getAuthClaims();
      if (!claims) return [];

      // Fetch org-specific notifications
      const { data: orgNotifications, error: orgError } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', claims.sub)
        .eq('is_global', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (orgError) throw orgError;

      // Fetch global notifications (visible across all orgs)
      const { data: globalNotifications, error: globalError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claims.sub)
        .eq('is_global', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (globalError) throw globalError;

      const allNotifications = [...(orgNotifications || []), ...(globalNotifications || [])];
      const createdAtTimestamps = new Map<string, number>();
      for (const notification of allNotifications) {
        createdAtTimestamps.set(
          notification.id,
          new Date(notification.created_at).getTime(),
        );
      }

      allNotifications.sort((a, b) => {
        const aTs = createdAtTimestamps.get(a.id) ?? 0;
        const bTs = createdAtTimestamps.get(b.id) ?? 0;
        return bTs - aTs;
      });

      return allNotifications;
    },
    enabled: !!organizationId,
    refetchInterval: false,
  });
};

/**
 * Hook to set up real-time subscription for notifications using Supabase Broadcast.
 */
export const useNotificationSubscription = (organizationId: string) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setupSubscription = async () => {
      try {
        const claims = await getAuthClaims();
        if (!claims || !isMounted) return;

        const userId = claims.sub;
        userIdRef.current = userId;

        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        await supabase.realtime.setAuth();

        if (!isMounted) return;

        const channel = supabase
          .channel(`notifications:user:${userId}`, {
            config: { private: true },
          })
          .on('broadcast', { event: 'new_notification' }, (payload) => {
            if (!isMounted) return;

            logger.debug('Received notification broadcast', payload);

            queryClient.invalidateQueries({ queryKey: ['notifications', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          })
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              logger.debug('Subscribed to notification broadcast channel', { userId });
            } else if (status === 'CHANNEL_ERROR') {
              logger.error('Notification broadcast channel error', err);
            } else if (status === 'TIMED_OUT') {
              logger.warn('Notification broadcast subscription timed out');
            }
          });

        if (!isMounted) {
          await supabase.removeChannel(channel);
          return;
        }

        channelRef.current = channel;
      } catch (error) {
        logger.error('Error setting up notification subscription', error);
      }
    };

    if (organizationId) {
      setupSubscription();
    }

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, queryClient]);

  return {
    isSubscribed: !!channelRef.current,
    userId: userIdRef.current,
  };
};

// Hook to mark all notifications as read
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const claims = await getAuthClaims();
      if (!claims) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', claims.sub)
        .eq('organization_id', organizationId)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: (_, organizationId) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: (error) => {
      logger.error('Error marking notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    },
  });
};
