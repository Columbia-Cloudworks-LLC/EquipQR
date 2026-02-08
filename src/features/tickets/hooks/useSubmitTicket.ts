import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TicketMetadata {
  userAgent: string;
  currentUrl: string;
  timestamp: string;
}

interface SubmitTicketPayload {
  title: string;
  description: string;
  metadata: TicketMetadata;
}

interface SubmitTicketResponse {
  success: boolean;
  ticketId: string;
}

/**
 * Mutation hook for submitting in-app bug reports.
 * Invokes the create-ticket edge function which creates a GitHub issue
 * and inserts a record in the tickets table.
 */
export function useSubmitTicket() {
  return useMutation({
    mutationFn: async (payload: SubmitTicketPayload): Promise<SubmitTicketResponse> => {
      const { data, error } = await supabase.functions.invoke('create-ticket', {
        body: payload,
      });

      if (error) {
        throw new Error(error.message || 'Failed to submit ticket');
      }

      // supabase.functions.invoke returns data as parsed JSON
      const result = data as SubmitTicketResponse;

      if (!result?.success) {
        throw new Error('Failed to submit ticket');
      }

      return result;
    },
  });
}
