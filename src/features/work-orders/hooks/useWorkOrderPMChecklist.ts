import React, { useEffect, useMemo } from 'react';
import { usePMTemplates } from '@/features/pm-templates/hooks/usePMTemplates';
import { useMatchingPMTemplates } from '@/features/pm-templates/hooks/usePMTemplateCompatibility';
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
  const { data: allTemplates = [], isLoading: isLoadingTemplates, error: templatesError } = usePMTemplates();
  const { restrictions } = useSimplifiedOrganizationRestrictions();
  
  // Fetch matching templates based on equipment manufacturer/model compatibility rules
  const { data: matchingTemplates = [], isLoading: isLoadingMatching } = useMatchingPMTemplates(
    selectedEquipment?.id,
    { enabled: !!selectedEquipment?.id && !selectedEquipment?.default_pm_template_id }
  );
  
  const isLoading = isLoadingTemplates || isLoadingMatching;
  
  // Debug: Log template loading state
  React.useEffect(() => {
    if (values.hasPM) {
      logger.debug('[useWorkOrderPMChecklist] Template query state:', {
        isLoading,
        allTemplatesCount: allTemplates.length,
        matchingTemplatesCount: matchingTemplates.length,
        error: templatesError,
        orgId: selectedEquipment?.id ? 'equipment selected' : 'no equipment'
      });
    }
  }, [values.hasPM, isLoading, allTemplates.length, matchingTemplates.length, templatesError, selectedEquipment]);
  
  // Check if equipment has an assigned template
  const hasAssignedTemplate = selectedEquipment?.default_pm_template_id;
  const assignedTemplate = hasAssignedTemplate 
    ? allTemplates.find(t => t.id === selectedEquipment.default_pm_template_id)
    : null;
  
  // Filter templates based on compatibility rules, with fallback to all templates
  // when no rules are configured for the equipment (e.g., newly created equipment)
  const templates = useMemo(() => {
    if (hasAssignedTemplate) {
      return [];
    }
    
    // Get IDs of templates that match the equipment's manufacturer/model via compatibility rules
    const compatibleTemplateIds = new Set(matchingTemplates.map(m => m.template_id));
    
    // If compatibility rules exist for this equipment, filter to only matching templates.
    // Otherwise, fallback to showing all templates (allows PM selection for new/unconfigured equipment)
    let filtered = compatibleTemplateIds.size > 0
      ? allTemplates.filter(t => compatibleTemplateIds.has(t.id))
      : allTemplates;
    
    // Apply user restrictions (free users can only see global templates)
    if (!restrictions.canCreateCustomPMTemplates) {
      filtered = filtered.filter(t => !t.organization_id);
    }
    
    // If we're in edit mode and have a pmTemplateId, ensure that template is in the list
    // (even if it wouldn't normally match - for backwards compatibility with existing work orders)
    if (values.pmTemplateId) {
      const currentTemplate = allTemplates.find(t => t.id === values.pmTemplateId);
      if (currentTemplate && !filtered.find(t => t.id === currentTemplate.id)) {
        filtered = [...filtered, currentTemplate];
      }
    }

    return filtered;
  }, [hasAssignedTemplate, allTemplates, matchingTemplates, restrictions.canCreateCustomPMTemplates, values.pmTemplateId]);
  
  // Find the selected template - prioritize assigned, then form value, then first matched
  const selectedTemplate = useMemo(() => {
    if (assignedTemplate) return assignedTemplate;
    if (values.pmTemplateId) {
      const found = templates.find(t => t.id === values.pmTemplateId);
      if (found) return found;
    }
    // Auto-select first matching template if available
    return templates[0] || null;
  }, [assignedTemplate, values.pmTemplateId, templates]);
  
  // Auto-set template when equipment is selected or PM is enabled
  useEffect(() => {
    if (!values.hasPM) return;
    
    if (hasAssignedTemplate && assignedTemplate) {
      // Direct assignment - use assigned template
      setValue('pmTemplateId', assignedTemplate.id);
    } else if (templates.length > 0 && !values.pmTemplateId) {
      // Auto-select first matching template if no template selected yet
      setValue('pmTemplateId', templates[0].id);
    } else if (templates.length > 0 && values.pmTemplateId) {
      // Verify current selection is still valid (in case equipment changed)
      const isValid = templates.some(t => t.id === values.pmTemplateId);
      if (!isValid) {
        // Current template not compatible with new equipment, reset to first matching
        setValue('pmTemplateId', templates[0].id);
      }
    } else if (templates.length === 0 && values.pmTemplateId && !hasAssignedTemplate) {
      // No matching templates for this equipment, clear selection
      // (unless we're in edit mode, which is handled by the filter logic above)
      const isEditMode = allTemplates.some(t => t.id === values.pmTemplateId);
      if (!isEditMode) {
        setValue('pmTemplateId', undefined as unknown as string);
      }
    }
  }, [hasAssignedTemplate, assignedTemplate, values.hasPM, values.pmTemplateId, templates, allTemplates, setValue]);

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

