import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { tickets } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';

export interface TicketComment {
  id: string;
  author: string;
  body: string;
  is_from_team: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  github_issue_number: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
  closed_at: string | null;
  ticket_comments: TicketComment[];
}

/**
 * Query hook for fetching the current user's submitted tickets
 * with their associated comments.
 */
export function useMyTickets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: tickets.mine(),
    queryFn: async (): Promise<Ticket[]> => {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id,
          title,
          description,
          status,
          github_issue_number,
          metadata,
          created_at,
          updated_at,
          closed_at,
          ticket_comments (
            id,
            author,
            body,
            is_from_team,
            created_at
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Sort comments within each ticket by created_at ascending
      return (data || []).map((ticket) => ({
        ...ticket,
        ticket_comments: (ticket.ticket_comments || []).sort(
          (a: TicketComment, b: TicketComment) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      })) as Ticket[];
    },
    enabled: !!user,
  });
}
