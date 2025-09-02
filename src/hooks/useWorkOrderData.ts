
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type WorkOrderStatus = 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

export interface WorkOrderNote {
  work_order_id: string;
  author_id: string;
  content: string;
  hours_worked: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export interface WorkOrderImage {
  id: string;
  work_order_id: string;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  created_at: string;
  uploaded_by_name?: string;
}

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

// Work Order Notes hooks
export const useWorkOrderNotes = (workOrderId: string) => {
  return useQuery({
    queryKey: ['work-order-notes', workOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_order_notes')
        .select(`
          *,
          profiles:author_id (
            name
          )
        `)
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(note => ({
        ...note,
        author_name: (note.profiles as { name?: string } | null | undefined)?.name || 'Unknown'
      })) as WorkOrderNote[];
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
      isPrivate = false
    }: {
      workOrderId: string;
      content: string;
      hoursWorked?: number;
      isPrivate?: boolean;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('work_order_notes')
        .insert({
          work_order_id: workOrderId,
          author_id: userData.user.id,
          content,
          hours_worked: hoursWorked,
          is_private: isPrivate
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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

// Work Order Images hooks
export const useWorkOrderImages = (workOrderId: string) => {
  return useQuery({
    queryKey: ['work-order-images', workOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_order_images')
        .select(`
          *,
          profiles:uploaded_by (
            name
          )
        `)
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(image => ({
        ...image,
        uploaded_by_name: (image.profiles as { name?: string } | null | undefined)?.name || 'Unknown'
      })) as WorkOrderImage[];
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
      description
    }: {
      workOrderId: string;
      file: File;
      description?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.user.id}/${workOrderId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('work-order-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('work-order-images')
        .getPublicUrl(uploadData.path);

      // Save image record to database
      const { data, error } = await supabase
        .from('work_order_images')
        .insert({
          work_order_id: workOrderId,
          uploaded_by: userData.user.id,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          description: description || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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

// Enhanced work order status update with improved query invalidation
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
      const nextStatus = status as WorkOrderStatus;
      const updateData: Partial<{ status: WorkOrderStatus; acceptance_date?: string; completed_date?: string }> = { status: nextStatus };
      
      // Set acceptance date when accepting
      if (status === 'accepted') {
        updateData.acceptance_date = new Date().toISOString();
      }
      
      // Set completion date when completing
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      // Notifications are now handled by the database trigger
      return data;
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
