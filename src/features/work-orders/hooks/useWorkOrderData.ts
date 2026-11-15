import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notifications as notificationQueryKeys } from '@/lib/queryKeys';
export type NotificationData = {
  work_order_id?: string;
  team_id?: string;
  // Ownership transfer fields
  transfer_id?: string;
  organization_id?: string;
  organization_name?: string;
  workspace_org_id?: string;
  workspace_org_name?: string;
  merge_request_id?: string;
  from_user_id?: string;
  from_user_name?: string;
  new_org_id?: string;
  reason?: string;
  [key: string]: unknown;
};

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: NotificationData;
  read: boolean;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.root });
    }
  });
};
