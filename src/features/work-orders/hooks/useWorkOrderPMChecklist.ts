import React, { useEffect, useMemo } from 'react';
import { usePMTemplates } from '@/features/pm-templates/hooks/usePMTemplates';
import { useSimplifiedOrganizationRestrictions } from '@/features/organization/hooks/useSimplifiedOrganizationRestrictions';
import type { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { logger } from '@/utils/logger';

interface UseWorkOrderPMChecklistProps {
  values: Pick<WorkOrderFormData, 'hasPM' | 'pmTemplateId'>;
  setValue: <K extends keyof WorkOrderFormData>(field: K, value: WorkOrderFormData[K]) => void;
  selectedEquipment?: { 
    id: string; 
    name: string; 
    default_pm_template_id?: string | null;
  } | null;
}

export const useWorkOrderPMChecklist = ({
  values,
  setValue,
  selectedEquipment
}: UseWorkOrderPMChecklistProps) => {
  const { data: allTemplates = [], isLoading, error: templatesError } = usePMTemplates();
  const { restrictions } = useSimplifiedOrganizationRestrictions();
  
  // Debug: Log template loading state
  React.useEffect(() => {
    if (values.hasPM) {
      logger.debug('[useWorkOrderPMChecklist] Template query state:', {
        isLoading,
        allTemplatesCount: allTemplates.length,
        error: templatesError,
        orgId: selectedEquipment?.id ? 'equipment selected' : 'no equipment'
      });
    }
  }, [values.hasPM, isLoading, allTemplates.length, templatesError, selectedEquipment]);
  
  // Check if equipment has an assigned template
  const hasAssignedTemplate = selectedEquipment?.default_pm_template_id;
  const assignedTemplate = hasAssignedTemplate 
    ? allTemplates.find(t => t.id === selectedEquipment.default_pm_template_id)
    : null;
  
  // Filter templates based on user restrictions (only if no assigned template)
  // BUT: Always include the template from values.pmTemplateId if it exists (for edit mode)
  const templates = useMemo(() => {
    if (hasAssignedTemplate) {
      return [];
    }
    
    let filtered = restrictions.canCreateCustomPMTemplates 
      ? allTemplates 
      : allTemplates.filter(t => !t.organization_id); // Only global templates for free users
    
    // If we're in edit mode and have a pmTemplateId, ensure that template is in the list
    if (values.pmTemplateId) {
      const currentTemplate = allTemplates.find(t => t.id === values.pmTemplateId);
      if (currentTemplate && !filtered.find(t => t.id === currentTemplate.id)) {
        // Add the current template to the list even if it would normally be filtered out
        filtered = [...filtered, currentTemplate];
      }
    }
    
    return filtered;
  }, [hasAssignedTemplate, allTemplates, restrictions.canCreateCustomPMTemplates, values.pmTemplateId]);
  
  // Find the selected template - prioritize the one from form values
  const selectedTemplate = useMemo(() => {
    return assignedTemplate || 
           (values.pmTemplateId && templates.find(t => t.id === values.pmTemplateId)) ||
           templates.find(t => t.name === 'Forklift PM') || 
           templates[0];
  }, [assignedTemplate, values.pmTemplateId, templates]);
  
  // Auto-set assigned template when equipment is selected
  useEffect(() => {
    if (hasAssignedTemplate && assignedTemplate && values.hasPM) {
      setValue('pmTemplateId', assignedTemplate.id);
    } else if (!hasAssignedTemplate && values.hasPM && !values.pmTemplateId && templates.length > 0) {
      // Auto-select first available template when PM is enabled and no template is selected
      const templateToSelect = selectedTemplate || templates[0];
      if (templateToSelect) {
        setValue('pmTemplateId', templateToSelect.id);
      }
    }
  }, [hasAssignedTemplate, assignedTemplate, values.hasPM, values.pmTemplateId, templates, selectedTemplate, setValue]);

  const handleTemplateChange = (templateId: string) => {
    setValue('pmTemplateId', templateId);
  };

  return {
    templates,
    selectedTemplate,
    assignedTemplate,
    hasAssignedTemplate,
    isLoading,
    restrictions,
    handleTemplateChange
  };
};

