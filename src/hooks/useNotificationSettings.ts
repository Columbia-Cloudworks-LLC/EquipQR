import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
export const useRealTimeNotifications = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['notifications', organizationId],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
    refetchInterval: false, // We'll use real-time subscriptions instead
  });
};

// Hook to set up real-time subscription for notifications
export const useNotificationSubscription = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['notification-subscription', organizationId],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      // Set up real-time subscription
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userData.user.id}`
          },
          () => {
            // Invalidate notifications query when changes occur
            queryClient.invalidateQueries({ queryKey: ['notifications', organizationId] });
          }
        )
        .subscribe();

      return channel;
    },
    enabled: !!organizationId,
    staleTime: Infinity, // This subscription should stay active
  });
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
