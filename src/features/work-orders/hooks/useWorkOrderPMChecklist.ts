import { useEffect, useMemo, useRef } from 'react';
import { usePMTemplates } from '@/features/pm-templates/hooks/usePMTemplates';
import { useMatchingPMTemplates } from '@/features/pm-templates/hooks/usePMTemplateCompatibility';
import { useSimplifiedOrganizationRestrictions } from '@/features/organization/hooks/useSimplifiedOrganizationRestrictions';
import type { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';

export const PM_TEMPLATE_NONE_VALUE = '__none__';

export type WorkOrderPMChecklistValues = Pick<WorkOrderFormData, 'hasPM' | 'pmTemplateId'>;
export type WorkOrderPMChecklistEquipment = {
  id: string;
  name: string;
  default_pm_template_id?: string | null;
};

interface UseWorkOrderPMChecklistProps {
  values: WorkOrderPMChecklistValues;
  setValue: <K extends keyof WorkOrderFormData>(field: K, value: WorkOrderFormData[K]) => void;
  selectedEquipment?: WorkOrderPMChecklistEquipment | null;
  /** When true (manage PM on active WO), user can pick any compatible template. */
  allowTemplateOverride?: boolean;
  /** When true, selecting equipment applies its default PM template or None. */
  autoDefaultFromEquipment?: boolean;
}

export const useWorkOrderPMChecklist = ({
  values,
  setValue,
  selectedEquipment,
  allowTemplateOverride = false,
  autoDefaultFromEquipment = false,
}: UseWorkOrderPMChecklistProps) => {
  const { data: allTemplates = [], isLoading: isLoadingTemplates } = usePMTemplates();
  const { restrictions } = useSimplifiedOrganizationRestrictions();
  const lastEquipmentIdRef = useRef<string | null>(null);

  const { data: matchingTemplates = [], isLoading: isLoadingMatching } = useMatchingPMTemplates(
    selectedEquipment?.id,
    { enabled: !!selectedEquipment?.id },
  );

  const isLoading = isLoadingTemplates || isLoadingMatching;

  const hasAssignedTemplate = Boolean(selectedEquipment?.default_pm_template_id);
  const assignedTemplate = hasAssignedTemplate
    ? allTemplates.find(t => t.id === selectedEquipment!.default_pm_template_id) ?? null
    : null;

  const templates = useMemo(() => {
    const compatibleTemplateIds = new Set(matchingTemplates.map(m => m.template_id));

    let filtered = compatibleTemplateIds.size > 0
      ? allTemplates.filter(t => compatibleTemplateIds.has(t.id))
      : allTemplates;

    if (!restrictions.canCreateCustomPMTemplates) {
      filtered = filtered.filter(t => !t.organization_id);
    }

    if (assignedTemplate && !filtered.find(t => t.id === assignedTemplate.id)) {
      filtered = [...filtered, assignedTemplate];
    }

    if (values.pmTemplateId) {
      const currentTemplate = allTemplates.find(t => t.id === values.pmTemplateId);
      if (currentTemplate && !filtered.find(t => t.id === currentTemplate.id)) {
        filtered = [...filtered, currentTemplate];
      }
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [
    allTemplates,
    matchingTemplates,
    restrictions.canCreateCustomPMTemplates,
    values.pmTemplateId,
    assignedTemplate,
  ]);

  const selectedTemplate = useMemo(() => {
    if (!values.pmTemplateId) {
      return null;
    }
    return templates.find(t => t.id === values.pmTemplateId)
      ?? allTemplates.find(t => t.id === values.pmTemplateId)
      ?? null;
  }, [values.pmTemplateId, templates, allTemplates]);

  const handleTemplateChange = (templateId: string) => {
    if (templateId === PM_TEMPLATE_NONE_VALUE) {
      setValue('pmTemplateId', null);
      setValue('hasPM', false);
      return;
    }
    setValue('pmTemplateId', templateId);
    setValue('hasPM', true);
  };

  const handleClearTemplate = () => {
    setValue('pmTemplateId', null);
    setValue('hasPM', false);
  };

  useEffect(() => {
    if (!autoDefaultFromEquipment) {
      return;
    }

    const equipmentId = selectedEquipment?.id ?? null;
    if (equipmentId === lastEquipmentIdRef.current) {
      return;
    }
    lastEquipmentIdRef.current = equipmentId;

    const defaultTemplateId = selectedEquipment?.default_pm_template_id ?? null;
    setValue('pmTemplateId', defaultTemplateId);
    setValue('hasPM', Boolean(defaultTemplateId));
  }, [
    autoDefaultFromEquipment,
    selectedEquipment?.id,
    selectedEquipment?.default_pm_template_id,
    setValue,
  ]);

  const selectValue = values.pmTemplateId ?? PM_TEMPLATE_NONE_VALUE;

  return {
    templates,
    selectedTemplate,
    assignedTemplate,
    hasAssignedTemplate,
    isLoading,
    restrictions,
    handleTemplateChange,
    handleClearTemplate,
    selectValue,
    allowTemplateOverride,
  };
};
