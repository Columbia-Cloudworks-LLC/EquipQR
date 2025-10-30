import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useWorkOrderDetailsActions = (workOrderId: string, organizationId: string) => {
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const queryClient = useQueryClient();

  const handleEditWorkOrder = () => {
    setIsEditFormOpen(true);
  };

  const handleCloseEditForm = () => {
    setIsEditFormOpen(false);
  };

  const handleUpdateWorkOrder = () => {
    // Refresh the work order data after update
    queryClient.invalidateQueries({ 
      queryKey: ['workOrder', 'enhanced', organizationId, workOrderId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['workOrder', organizationId, workOrderId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['workOrders', organizationId] 
    });
    setIsEditFormOpen(false);
  };

  const handleStatusUpdate = () => {
    // Invalidate all relevant queries to refresh the data
    queryClient.invalidateQueries({ 
      queryKey: ['workOrder', 'enhanced', organizationId, workOrderId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['workOrder', organizationId, workOrderId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['workOrders', organizationId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['dashboardStats', organizationId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['preventativeMaintenance', workOrderId] 
    });
  };

  const handlePMUpdate = () => {
    // Don't invalidate PM queries - the mutation hook already handles cache updates
    // Invalidating here causes refetches that can fail (406 errors) and trigger re-initialization
    // Only invalidate work order queries to refresh status/completion state
    queryClient.invalidateQueries({ 
      queryKey: ['workOrder', organizationId, workOrderId],
      refetchType: 'active' // Only refetch active queries
    });
  };

  return {
    isEditFormOpen,
    showMobileSidebar,
    setShowMobileSidebar,
    handleEditWorkOrder,
    handleCloseEditForm,
    handleUpdateWorkOrder,
    handleStatusUpdate,
    handlePMUpdate
  };
};