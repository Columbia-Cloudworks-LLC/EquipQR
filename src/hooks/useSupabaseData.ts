
import { useQuery,useMutation, useQueryClient } from '@tanstack/react-query';
import * as supabaseService from '@/services/supabaseDataService';
import { toast } from '@/hooks/use-toast';

// Equipment hooks
// @deprecated Use useEquipment from '@/components/equipment/hooks/useEquipment' instead. Will be removed in Phase 2.
export const useEquipmentByOrganization = (organizationId?: string) => {
  return useQuery({
    queryKey: ['equipment', organizationId],
    queryFn: () => organizationId ? supabaseService.getEquipmentByOrganization(organizationId) : Promise.resolve([]),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// @deprecated Use useEquipmentById from '@/components/equipment/hooks/useEquipment' instead. Will be removed in Phase 2.
export const useEquipmentById = (organizationId: string, equipmentId?: string) => {
  return useQuery({
    queryKey: ['equipment', organizationId, equipmentId],
    queryFn: () => organizationId && equipmentId ? 
      supabaseService.getEquipmentById(organizationId, equipmentId) : 
      Promise.resolve(undefined),
    enabled: !!organizationId && !!equipmentId,
    staleTime: 5 * 60 * 1000,
  });
};

// Teams hooks
export const useTeamsByOrganization = (organizationId?: string) => {
  return useQuery({
    queryKey: ['teams', organizationId],
    queryFn: () => organizationId ? supabaseService.getTeamsByOrganization(organizationId) : Promise.resolve([]),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
};

// Dashboard stats hook
export const useDashboardStats = (organizationId?: string) => {
  return useQuery({
    queryKey: ['dashboard-stats', organizationId],
    queryFn: () => organizationId ? supabaseService.getDashboardStatsByOrganization(organizationId) : Promise.resolve({
      totalEquipment: 0,
      activeEquipment: 0,
      maintenanceEquipment: 0,
      totalWorkOrders: 0
    }),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes for stats
  });
};

// Work orders hooks
export const useWorkOrdersByEquipment = (organizationId: string, equipmentId?: string) => {
  return useQuery({
    queryKey: ['work-orders', 'equipment', organizationId, equipmentId],
    queryFn: () => organizationId && equipmentId ? 
      supabaseService.getWorkOrdersByEquipmentId(organizationId, equipmentId) : 
      Promise.resolve([]),
    enabled: !!organizationId && !!equipmentId,
    staleTime: 3 * 60 * 1000,
  });
};

export const useAllWorkOrders = (organizationId?: string) => {
  return useQuery({
    queryKey: ['work-orders', organizationId],
    queryFn: () => organizationId ? supabaseService.getAllWorkOrdersByOrganization(organizationId) : Promise.resolve([]),
    enabled: !!organizationId,
    staleTime: 3 * 60 * 1000,
  });
};

export const useWorkOrderById = (organizationId: string, workOrderId?: string) => {
  return useQuery({
    queryKey: ['work-orders', organizationId, workOrderId],
    queryFn: () => organizationId && workOrderId ? 
      supabaseService.getWorkOrderById(organizationId, workOrderId) : 
      Promise.resolve(undefined),
    enabled: !!organizationId && !!workOrderId,
    staleTime: 3 * 60 * 1000,
  });
};

// Notes hooks
export const useNotesByEquipment = (organizationId: string, equipmentId?: string) => {
  return useQuery({
    queryKey: ['notes', 'equipment', organizationId, equipmentId],
    queryFn: () => organizationId && equipmentId ? 
      supabaseService.getNotesByEquipmentId(organizationId, equipmentId) : 
      Promise.resolve([]),
    enabled: !!organizationId && !!equipmentId,
    staleTime: 5 * 60 * 1000,
  });
};

// Scans hooks
export const useScansByEquipment = (organizationId: string, equipmentId?: string) => {
  return useQuery({
    queryKey: ['scans', 'equipment', organizationId, equipmentId],
    queryFn: () => organizationId && equipmentId ? 
      supabaseService.getScansByEquipmentId(organizationId, equipmentId) : 
      Promise.resolve([]),
    enabled: !!organizationId && !!equipmentId,
    staleTime: 10 * 60 * 1000, // 10 minutes for scans
  });
};

// Create scan mutation
export const useCreateScan = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ equipmentId, location, notes }: { 
      equipmentId: string; 
      location?: string; 
      notes?: string 
    }) => {
      if (!organizationId) throw new Error('No organization ID provided');
      return supabaseService.createScan(organizationId, equipmentId, location, notes);
    },
    onSuccess: (result, variables) => {
      if (result) {
        // Invalidate scans queries for this equipment
        queryClient.invalidateQueries({ 
          queryKey: ['scans', 'equipment', organizationId, variables.equipmentId] 
        });
        
        // Scan logged successfully
      } else {
        console.error('Failed to log scan');
      }
    },
    onError: (error) => {
      console.error('Error creating scan:', error);
    },
  });
};

// Mutation hooks
export const useUpdateWorkOrderStatus = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workOrderId, newStatus }: { 
      workOrderId: string; 
      newStatus: supabaseService.WorkOrder['status'] 
    }) => {
      if (!organizationId) throw new Error('No organization ID provided');
      return supabaseService.updateWorkOrderStatus(organizationId, workOrderId, newStatus);
    },
    onSuccess: (success, variables) => {
      if (success) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['work-orders'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        
        toast({
          title: 'Work Order Updated',
          description: `Work order status changed to ${variables.newStatus}`,
        });
      } else {
        toast({
          title: 'Update Failed',
          description: 'Failed to update work order status',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Error updating work order:', error);
      toast({
        title: 'Update Failed',
        description: 'An error occurred while updating the work order',
        variant: 'destructive',
      });
    },
  });
};

// @deprecated Use useCreateEquipment from '@/components/equipment/hooks/useEquipment' instead. Will be removed in Phase 2.
export const useCreateEquipment = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (equipmentData: Omit<supabaseService.Equipment, 'id' | 'created_at' | 'updated_at' | 'organization_id'>) => {
      if (!organizationId) throw new Error('No organization ID provided');
      return supabaseService.createEquipment(organizationId, equipmentData);
    },
    onSuccess: (result) => {
      if (result) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['equipment'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        
        toast({
          title: 'Equipment Created',
          description: `${result.name} has been added successfully`,
        });
      } else {
        toast({
          title: 'Creation Failed',
          description: 'Failed to create equipment',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Error creating equipment:', error);
      toast({
        title: 'Creation Failed',
        description: 'An error occurred while creating equipment',
        variant: 'destructive',
      });
    },
  });
};

export const useCreateWorkOrder = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workOrderData: Omit<supabaseService.WorkOrder, 'id' | 'created_date' | 'updated_at' | 'organization_id' | 'assigneeName' | 'teamName' | 'completed_date'>) => {
      if (!organizationId) throw new Error('No organization ID provided');
      return supabaseService.createWorkOrder(organizationId, workOrderData);
    },
    onSuccess: (result) => {
      if (result) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['work-orders'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        
        toast({
          title: 'Work Order Created',
          description: `${result.title} has been created successfully`,
        });
      } else {
        toast({
          title: 'Creation Failed',
          description: 'Failed to create work order',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Error creating work order:', error);
      toast({
        title: 'Creation Failed',
        description: 'An error occurred while creating the work order',
        variant: 'destructive',
      });
    },
  });
};

export const useCreateNote = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ equipmentId, content, isPrivate = false }: { 
      equipmentId: string; 
      content: string; 
      isPrivate?: boolean 
    }) => {
      if (!organizationId) throw new Error('No organization ID provided');
      return supabaseService.createNote(organizationId, equipmentId, content, isPrivate);
    },
    onSuccess: (result, variables) => {
      if (result) {
        // Invalidate notes queries for this equipment
        queryClient.invalidateQueries({ 
          queryKey: ['notes', 'equipment', organizationId, variables.equipmentId] 
        });
        
        toast({
          title: 'Note Added',
          description: 'Your note has been saved successfully',
        });
      } else {
        toast({
          title: 'Save Failed',
          description: 'Failed to save note',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Error creating note:', error);
      toast({
        title: 'Save Failed',
        description: 'An error occurred while saving the note',
        variant: 'destructive',
      });
    },
  });
};

// @deprecated Use useUpdateEquipment from '@/components/equipment/hooks/useEquipment' instead. Will be removed in Phase 2.
export const useUpdateEquipment = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ equipmentId, equipmentData }: { 
      equipmentId: string; 
      equipmentData: Partial<Omit<supabaseService.Equipment, 'id' | 'created_at' | 'updated_at' | 'organization_id'>> 
    }) => {
      if (!organizationId) throw new Error('No organization ID provided');
      return supabaseService.updateEquipment(organizationId, equipmentId, equipmentData);
    },
    onSuccess: (result, variables) => {
      if (result) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['equipment'] });
        queryClient.invalidateQueries({ queryKey: ['equipment', organizationId, variables.equipmentId] });
        
        toast({
          title: 'Equipment Updated',
          description: `${result.name} has been updated successfully`,
        });
      } else {
        toast({
          title: 'Update Failed',
          description: 'Failed to update equipment',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Error updating equipment:', error);
      toast({
        title: 'Update Failed',
        description: 'An error occurred while updating equipment',
        variant: 'destructive',
      });
    },
  });
};
