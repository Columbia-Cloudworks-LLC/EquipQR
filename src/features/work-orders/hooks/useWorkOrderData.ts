import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  WorkOrderService, 
  WorkOrderNote, 
  WorkOrderImage 
} from '@/features/work-orders/services/workOrderService';
import { workOrderKeys } from '@/features/work-orders/hooks/useWorkOrders';

// Re-export types from WorkOrderService for backward compatibility
export type { WorkOrderNote, WorkOrderImage };

export type NotificationData = {
  work_order_id?: string;
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

// Work Order Notes hooks - using WorkOrderService
export const useWorkOrderNotes = (workOrderId: string, organizationId?: string) => {
  return useQuery({
    queryKey: ['work-order-notes', workOrderId],
    queryFn: async () => {
      if (!organizationId) {
        // Fallback: fetch organization_id from work order if not provided
        const { data: workOrder } = await supabase
          .from('work_orders')
          .select('organization_id')
          .eq('id', workOrderId)
          .single();
        if (!workOrder) throw new Error('Work order not found');
        organizationId = workOrder.organization_id;
      }

      const service = new WorkOrderService(organizationId);
      const response = await service.getNotes(workOrderId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch notes');
      }
      
      return response.data || [];
    },
    enabled: !!workOrderId
  });
};

export const useCreateWorkOrderNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workOrderId,
      content,
      hoursWorked = 0,
      isPrivate = false,
      organizationId
    }: {
      workOrderId: string;
      content: string;
      hoursWorked?: number;
      isPrivate?: boolean;
      organizationId?: string;
    }) => {
      let orgId = organizationId;
      if (!orgId) {
        const { data: workOrder } = await supabase
          .from('work_orders')
          .select('organization_id')
          .eq('id', workOrderId)
          .single();
        if (!workOrder) throw new Error('Work order not found');
        orgId = workOrder.organization_id;
      }

      const service = new WorkOrderService(orgId);
      const response = await service.createNote(workOrderId, {
        content,
        hours_worked: hoursWorked,
        is_private: isPrivate
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create note');
      }

      return response.data;
    },
    onSuccess: (_, { workOrderId }) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-notes', workOrderId] });
      toast.success('Note added successfully');
    },
    onError: (error) => {
      console.error('Error creating work order note:', error);
      toast.error('Failed to add note');
    }
  });
};

// Work Order Images hooks - using WorkOrderService
export const useWorkOrderImages = (workOrderId: string, organizationId?: string) => {
  return useQuery({
    queryKey: ['work-order-images', workOrderId],
    queryFn: async () => {
      if (!organizationId) {
        const { data: workOrder } = await supabase
          .from('work_orders')
          .select('organization_id')
          .eq('id', workOrderId)
          .single();
        if (!workOrder) throw new Error('Work order not found');
        organizationId = workOrder.organization_id;
      }

      const service = new WorkOrderService(organizationId);
      const response = await service.getImages(workOrderId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch images');
      }

      return response.data || [];
    },
    enabled: !!workOrderId
  });
};

export const useUploadWorkOrderImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workOrderId,
      file,
      description,
      organizationId
    }: {
      workOrderId: string;
      file: File;
      description?: string;
      organizationId?: string;
    }) => {
      let orgId = organizationId;
      if (!orgId) {
        const { data: workOrder } = await supabase
          .from('work_orders')
          .select('organization_id')
          .eq('id', workOrderId)
          .single();
        if (!workOrder) throw new Error('Work order not found');
        orgId = workOrder.organization_id;
      }

      const service = new WorkOrderService(orgId);
      const response = await service.uploadImage(workOrderId, file, description);

      if (!response.success) {
        throw new Error(response.error || 'Failed to upload image');
      }

      return response.data;
    },
    onSuccess: (_, { workOrderId }) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-images', workOrderId] });
      toast.success('Image uploaded successfully');
    },
    onError: (error) => {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    }
  });
};

// Notifications hooks
// Includes both org-specific notifications AND global notifications (like ownership transfers)
export const useNotifications = (organizationId: string) => {
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
        .limit(50);

      if (orgError) throw orgError;

      // Fetch global notifications (visible across all orgs)
      const { data: globalNotifications, error: globalError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('is_global', true)
        .order('created_at', { ascending: false })
        .limit(25);

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

      return allNotifications as Notification[];
    },
    enabled: !!organizationId
  });
};

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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

// Enhanced work order status update - using WorkOrderService
export const useUpdateWorkOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workOrderId,
      status,
      organizationId
    }: {
      workOrderId: string;
      status: string;
      organizationId: string;
    }) => {
      const service = new WorkOrderService(organizationId);
      const response = await service.updateStatus(
        workOrderId, 
        status as 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update status');
      }

      // Notifications are now handled by the database trigger
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate the specific work order detail query (used by details page)
      queryClient.invalidateQueries({ 
        queryKey: workOrderKeys.detail(variables.organizationId, variables.workOrderId) 
      });
      
      // Invalidate all work order list queries for this organization
      queryClient.invalidateQueries({ 
        queryKey: workOrderKeys.lists() 
      });
      
      // Invalidate all work order queries for this organization (catch-all)
      queryClient.invalidateQueries({ 
        queryKey: workOrderKeys.all 
      });
      
      // Also invalidate legacy query keys for backward compatibility
      queryClient.invalidateQueries({ queryKey: ['enhanced-work-orders', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['workOrders', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-filtered-optimized', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['workOrder', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['work-orders', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['work-orders', variables.organizationId, variables.workOrderId] });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', variables.organizationId] });
      
      toast.success('Work order status updated successfully');
    },
    onError: (error) => {
      console.error('Error updating work order status:', error);
      toast.error('Failed to update work order status');
    }
  });
};
