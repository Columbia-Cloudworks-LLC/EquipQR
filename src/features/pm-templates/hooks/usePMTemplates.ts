import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { pmChecklistTemplatesService, PMTemplate, PMTemplateSummary, templateToSummary } from '@/features/pm-templates/services/pmChecklistTemplatesService';
import { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

// Re-export types for convenience
export type { PMTemplateSummary };

// Query hook for fetching PM templates
export const usePMTemplates = () => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: queryKeys.pmTemplates.list(currentOrganization?.id || ''),
    queryFn: () => pmChecklistTemplatesService.listTemplates(currentOrganization?.id || ''),
    enabled: !!currentOrganization?.id,
    select: (data: PMTemplate[]): PMTemplateSummary[] => {
      return data.map(templateToSummary);
    }
  });
};

// Query hook for fetching a specific template
export const usePMTemplate = (templateId: string) => {
  return useQuery({
    queryKey: queryKeys.pmTemplates.byId(templateId),
    queryFn: () => pmChecklistTemplatesService.getTemplate(templateId),
    enabled: !!templateId
  });
};

// Mutation hook for creating a new template
export const useCreatePMTemplate = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (templateData: {
      name: string;
      description?: string;
      template_data: PMChecklistItem[];
    }) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('Organization or user not found');
      }

      // Note: Authorization check is handled by RLS policies in the database
      return pmChecklistTemplatesService.createTemplate({
        organizationId: currentOrganization.id,
        name: templateData.name,
        description: templateData.description,
        template_data: templateData.template_data,
        created_by: user.id
      });
    },
    onSuccess: () => {
      if (currentOrganization?.id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.pmTemplates.list(currentOrganization.id) 
        });
      }
      toast.success('Template created successfully');
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      if (error.message?.includes('insufficient privileges') || error.message?.includes('permission')) {
        toast.error('Custom PM templates require user licenses. Please upgrade your plan.');
      } else {
        toast.error('Failed to create template');
      }
    }
  });
};

// Mutation hook for updating a template
export const useUpdatePMTemplate = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      templateId, 
      updates 
    }: { 
      templateId: string; 
      updates: {
        name?: string;
        description?: string;
        template_data?: PMChecklistItem[];
      };
    }) => {
      if (!user?.id) {
        throw new Error('User not found');
      }

      return pmChecklistTemplatesService.updateTemplate(templateId, {
        ...updates,
        updated_by: user.id
      });
    },
    onSuccess: (updatedTemplate) => {
      if (currentOrganization?.id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.pmTemplates.list(currentOrganization.id) 
        });
      }
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.pmTemplates.byId(updatedTemplate.id) 
      });
      toast.success('Template updated successfully');
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      if (error.message?.includes('insufficient privileges') || error.message?.includes('permission')) {
        toast.error('Custom PM templates require user licenses. Please upgrade your plan.');
      } else {
        toast.error('Failed to update template');
      }
    }
  });
};

// Mutation hook for deleting a template
export const useDeletePMTemplate = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: pmChecklistTemplatesService.deleteTemplate,
    onSuccess: () => {
      if (currentOrganization?.id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.pmTemplates.list(currentOrganization.id) 
        });
      }
      toast.success('Template deleted successfully');
    },
    onError: (error: unknown) => {
      console.error('Error deleting template:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('protected')) {
        toast.error('Cannot delete protected template');
      } else {
        toast.error('Failed to delete template');
      }
    }
  });
};

// Mutation hook for cloning a template
export const useClonePMTemplate = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async ({ 
      sourceId, 
      newName 
    }: { 
      sourceId: string; 
      newName?: string; 
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('Organization not found');
      }

      return pmChecklistTemplatesService.cloneTemplate(
        sourceId, 
        currentOrganization.id, 
        newName
      );
    },
    onSuccess: () => {
      if (currentOrganization?.id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.pmTemplates.list(currentOrganization.id) 
        });
      }
      toast.success('Template cloned successfully');
    },
    onError: (error) => {
      console.error('Error cloning template:', error);
      if (error.message?.includes('insufficient privileges') || error.message?.includes('permission')) {
        toast.error('Custom PM templates require user licenses. Please upgrade your plan.');
      } else {
        toast.error('Failed to clone template');
      }
    }
  });
};

