import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  WorkOrderService, 
  WorkOrderNote, 
  WorkOrderImage 
} from '@/services/WorkOrderService';

// Re-export types from WorkOrderService for backward compatibility
export type { WorkOrderNote, WorkOrderImage };

export type NotificationData = {
  work_order_id?: string;
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
export const useNotifications = (organizationId: string) => {
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
        .limit(50);

      if (error) throw error;
      return data as Notification[];
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
      // Invalidate all relevant queries for immediate updates with standardized keys
      queryClient.invalidateQueries({ queryKey: ['enhanced-work-orders', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['workOrders', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-filtered-optimized', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['workOrder', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', variables.organizationId] });
      
      // Specifically invalidate the work order details queries
      queryClient.invalidateQueries({ 
        queryKey: ['workOrder', variables.organizationId, variables.workOrderId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['workOrder', 'enhanced', variables.organizationId, variables.workOrderId] 
      });
      
      toast.success('Work order status updated successfully');
    },
    onError: (error) => {
      console.error('Error updating work order status:', error);
      toast.error('Failed to update work order status');
    }
  });
};
