import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { tickets } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';

/**
 * Subscribes to realtime ticket updates for the current user.
 * When a ticket status changes or a new comment is synced from GitHub,
 * the broadcast trigger fires and this hook invalidates the tickets query.
 *
 * Follows the pattern from useNotificationSettings.ts.
 */
export function useTicketRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channelName = `tickets:user:${user.id}`;

    const channel = supabase
      .channel(channelName, {
        config: { private: true },
      })
      .on('broadcast', { event: 'ticket_update' }, () => {
        // Invalidate the tickets query to refetch with latest data
        queryClient.invalidateQueries({ queryKey: tickets.mine() });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Channel ready
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
