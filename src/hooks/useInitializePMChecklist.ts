
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPM, defaultForkliftChecklist, PMChecklistItem } from '@/services/preventativeMaintenanceService';
import { toast } from 'sonner';

export const useInitializePMChecklist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workOrderId,
      equipmentId,
      organizationId,
      templateId
    }: {
      workOrderId: string;
      equipmentId: string;
      organizationId: string;
      templateId?: string;
    }) => {
      // Initializing PM checklist for work order
      
      let checklistData = defaultForkliftChecklist;
      let notes = 'PM checklist initialized with default forklift maintenance items.';
      
      // If templateId provided, try to fetch template data
      if (templateId) {
        try {
          const { pmChecklistTemplatesService } = await import('@/services/pmChecklistTemplatesService');
          const template = await pmChecklistTemplatesService.getTemplate(templateId);
          
          if (template && Array.isArray(template.template_data)) {
            // Safely convert JSON to PMChecklistItem[] and sanitize
            const templateItems = template.template_data as unknown as PMChecklistItem[];
            checklistData = templateItems.map(item => ({
              ...item,
              condition: null,
              notes: ''
            }));
            notes = `PM checklist initialized from template: ${template.name}`;
          }
        } catch (error) {
          console.warn('Failed to fetch PM template, using default:', error);
          // Fall back to default checklist
        }
      }
      
      const pmRecord = await createPM({
        workOrderId,
        equipmentId,
        organizationId,
        checklistData,
        notes,
        templateId
      });

      if (!pmRecord) {
        throw new Error('Failed to create PM record');
      }

      // PM checklist initialized successfully
      return pmRecord;
    },
    onSuccess: (pmRecord, variables) => {
      // Immediately set the query data with the created PM record
      const queryKey = ['preventativeMaintenance', variables.workOrderId, variables.equipmentId, variables.organizationId];
      queryClient.setQueryData(queryKey, pmRecord);
      
      // Invalidate all relevant PM queries with proper keys (marks as stale but keeps data)
      queryClient.invalidateQueries({ 
        queryKey: ['preventativeMaintenance', variables.workOrderId, variables.equipmentId, variables.organizationId],
        exact: true,
        refetchType: 'none' // Don't trigger immediate refetch - keep cached data
      });
      // Also invalidate legacy queries and all PM queries for this work order
      queryClient.invalidateQueries({ 
        queryKey: ['preventativeMaintenance', variables.workOrderId],
        exact: false,
        refetchType: 'none'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['preventativeMaintenance', 'all', variables.workOrderId, variables.organizationId],
        exact: true,
        refetchType: 'none'
      });
      // Invalidate work order queries
      queryClient.invalidateQueries({ 
        queryKey: ['workOrder', variables.organizationId, variables.workOrderId],
        exact: true,
        refetchType: 'active' // OK to refetch work order
      });
      queryClient.invalidateQueries({ 
        queryKey: ['workOrder'],
        exact: false,
        refetchType: 'active'
      });
      
      toast.success('PM checklist initialized successfully');
    },
    onError: (error) => {
      console.error('❌ Error initializing PM checklist:', error);
      toast.error('Failed to initialize PM checklist');
    }
  });
};
