import { useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultForkliftChecklist, PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';

export const useInitializePMChecklist = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const offlineCtx = useOfflineQueueOptional();

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
          const { pmChecklistTemplatesService } = await import('@/features/pm-templates/services/pmChecklistTemplatesService');
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
          logger.warn('Failed to fetch PM template, using default', error);
          // Fall back to default checklist
        }
      }

      // Route through the offline-aware service so a flaky cellular link
      // (or `!navigator.onLine`) queues the init for replay rather than
      // throwing. Tests / contexts without an authenticated user fall back
      // to the direct service call.
      if (user?.id) {
        const svc = new OfflineAwareWorkOrderService(organizationId, user.id);
        const result = await svc.initPM({
          workOrderId,
          equipmentId,
          templateId,
          checklistData,
          notes,
        });
        if (result.queuedOffline) {
          offlineCtx?.refresh();
          return null;
        }
        if (!result.data) {
          throw new Error('Failed to create PM record');
        }
        return result.data;
      }

      const { createPM } = await import('@/features/pm-templates/services/preventativeMaintenanceService');
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
      // Queued offline — banner surfaces the pending state; bail before
      // touching the cache because there is no record to seed yet.
      if (pmRecord === null) {
        return;
      }
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
      logger.error('Error initializing PM checklist', error);
      toast.error('Failed to initialize PM checklist');
    }
  });
};

