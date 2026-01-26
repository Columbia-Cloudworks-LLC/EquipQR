import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface NotificationSetting {
  id: string;
  user_id: string;
  organization_id: string;
  team_id: string;
  enabled: boolean;
  statuses: string[];
  created_at: string;
  updated_at: string;
}

export interface UserTeamForNotifications {
  organization_id: string;
  organization_name: string;
  team_id: string;
  team_name: string;
  user_role: string;
  has_access: boolean;
}

// Hook to get user's teams across all organizations for notification settings
export const useUserTeamsForNotifications = () => {
  return useQuery({
    queryKey: ['user-teams-notifications'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data, error } = await supabase.rpc('get_user_teams_for_notifications', {
        user_uuid: userData.user.id
      });

      if (error) throw error;
      return data as UserTeamForNotifications[];
    }
  });
};

// Hook to get user's notification settings
export const useNotificationSettings = () => {
  return useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userData.user.id);

      if (error) throw error;
      return data as NotificationSetting[];
    }
  });
};

// Hook to update notification settings
export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      teamId,
      enabled,
      statuses
    }: {
      organizationId: string;
      teamId: string;
      enabled: boolean;
      statuses: string[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userData.user.id,
          organization_id: organizationId,
          team_id: teamId,
          enabled,
          statuses
        }, {
          onConflict: 'user_id,organization_id,team_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Notification settings updated');
    },
    onError: (error) => {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update notification settings');
    }
  });
};

// Hook to get real-time notifications with Supabase subscriptions
// Includes both org-specific notifications AND global notifications (like ownership transfers)
export const useRealTimeNotifications = (organizationId: string) => {
  return useQuery({
    queryKey: ['notifications', organizationId],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      // Fetch org-specific notifications
      const { data: orgNotifications, error: orgError } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', userData.user.id)
        .eq('is_global', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (orgError) throw orgError;

      // Fetch global notifications (visible across all orgs)
      const { data: globalNotifications, error: globalError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('is_global', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (globalError) throw globalError;

      // Combine and sort by created_at
      // Pre-compute timestamps to avoid creating Date objects inside the sort comparator
      const allNotifications = [...(orgNotifications || []), ...(globalNotifications || [])];
      const createdAtTimestamps = new Map<string, number>();
      for (const notification of allNotifications) {
        createdAtTimestamps.set(
          notification.id,
          new Date(notification.created_at).getTime()
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
    refetchInterval: false, // We'll use real-time subscriptions instead
  });
};

/**
 * Hook to set up real-time subscription for notifications using Supabase Broadcast.
 * 
 * This uses the scalable Broadcast pattern instead of postgres_changes:
 * - Private channel per user: `notifications:user:<user_id>`
 * - Lightweight broadcast payloads trigger query invalidation
 * - Requires Realtime Authorization (RLS on realtime.messages)
 * 
 * @param organizationId - Current organization ID (used for query invalidation)
 */
export const useNotificationSubscription = (organizationId: string) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setupSubscription = async () => {
      try {
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user || !isMounted) return;

        const userId = userData.user.id;
        userIdRef.current = userId;

        // Clean up any existing channel for this user
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // Set auth for private channels (required for Realtime Authorization)
        await supabase.realtime.setAuth();

        // Create private channel for this user's notifications
        const channel = supabase
          .channel(`notifications:user:${userId}`, {
            config: { private: true }
          })
          .on('broadcast', { event: 'new_notification' }, (payload) => {
            if (!isMounted) return;
            
            logger.debug('Received notification broadcast', payload);
            
            // Invalidate notifications queries to refetch fresh data
            // This keeps broadcast payloads small while ensuring UI updates
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

        channelRef.current = channel;
      } catch (error) {
        logger.error('Error setting up notification subscription', error);
      }
    };

    if (organizationId) {
      setupSubscription();
    }

    // Cleanup on unmount or when organizationId changes
    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, queryClient]);

  // Return channel info for debugging (optional)
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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userData.user.id)
        .eq('organization_id', organizationId)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: (_, organizationId) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', organizationId] });
      toast.success('All notifications marked as read');
    },
    onError: (error) => {
      console.error('Error marking notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  });
};
