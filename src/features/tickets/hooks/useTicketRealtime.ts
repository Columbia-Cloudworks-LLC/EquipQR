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

    let isMounted = true;
    let channelRef: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      try {
        // Set auth for private channels (required for Realtime Authorization)
        await supabase.realtime.setAuth();

        if (!isMounted) return;

        const channelName = `tickets:user:${user.id}`;

        const channel = supabase
          .channel(channelName, {
            config: { private: true },
          })
          .on('broadcast', { event: 'ticket_update' }, () => {
            if (!isMounted) return;
            // Invalidate the tickets query to refetch with latest data
            queryClient.invalidateQueries({ queryKey: tickets.mine() });
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              // Channel ready
            }
          });

        if (!isMounted) {
          await supabase.removeChannel(channel);
          return;
        }

        channelRef = channel;
      } catch (error) {
        // Log but don't crash -- realtime is a nice-to-have enhancement.
        // Users can still refresh to see updates without the subscription.
        console.error('[useTicketRealtime] Failed to set up subscription:', error);
      }
    };

    setupSubscription().catch((error) => {
      console.error('[useTicketRealtime] Unhandled subscription error:', error);
    });

    return () => {
      isMounted = false;
      if (channelRef) {
        supabase.removeChannel(channelRef);
      }
    };
  }, [user?.id, queryClient]);
}
