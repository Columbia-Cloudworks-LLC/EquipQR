import { useEffect, useMemo, useRef } from 'react';
import { usePMTemplatesForOrganization } from '@/features/pm-templates/hooks/usePMTemplates';
import { useMatchingPMTemplatesForOrganization } from '@/features/pm-templates/hooks/usePMTemplateCompatibility';
import { useSimpleOrganizationSafe } from '@/hooks/useSimpleOrganization';
import { getSimplifiedOrganizationRestrictions } from '@/utils/simplifiedOrganizationRestrictions';
import type { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';

export const PM_TEMPLATE_NONE_VALUE = '__none__';

export type WorkOrderPMChecklistValues = Pick<WorkOrderFormData, 'hasPM' | 'pmTemplateId'>;
export type WorkOrderPMChecklistSetValue = (
  field: keyof WorkOrderPMChecklistValues,
  value: WorkOrderPMChecklistValues[keyof WorkOrderPMChecklistValues],
) => void;
export type WorkOrderPMChecklistEquipment = {
  id: string;
  name: string;
  default_pm_template_id?: string | null;
};

interface UseWorkOrderPMChecklistProps {
  values: WorkOrderPMChecklistValues;
  setValue: WorkOrderPMChecklistSetValue;
  selectedEquipment?: WorkOrderPMChecklistEquipment | null;
  /** When true (manage PM on active WO), user can pick any compatible template. */
  allowTemplateOverride?: boolean;
  /** When true, selecting equipment applies its default PM template or None. */
  autoDefaultFromEquipment?: boolean;
  /**
   * Explicit org scope. Required outside SimpleOrganizationProvider (public QR scan page);
   * defaults to the current dashboard organization.
   */
  organizationId?: string;
}

export const useWorkOrderPMChecklist = ({
  values,
  setValue,
  selectedEquipment,
  allowTemplateOverride = false,
  autoDefaultFromEquipment = false,
  organizationId,
}: UseWorkOrderPMChecklistProps) => {
  const orgContext = useSimpleOrganizationSafe();
  const resolvedOrganizationId = organizationId ?? orgContext?.currentOrganization?.id;
  const templatesQuery = usePMTemplatesForOrganization(resolvedOrganizationId);
  const { data: allTemplates = [], isLoading: isLoadingTemplates } = templatesQuery;
  const restrictions = getSimplifiedOrganizationRestrictions();
  const lastEquipmentIdRef = useRef<string | null>(null);
  const userSelectedTemplateRef = useRef(false);

  const matchingQuery = useMatchingPMTemplatesForOrganization(
    resolvedOrganizationId,
    selectedEquipment?.id,
    { enabled: !!selectedEquipment?.id },
  );

  const { data: matchingTemplates = [], isLoading: isLoadingMatching } = matchingQuery;
  const isLoading = isLoadingTemplates || isLoadingMatching;
  const isError = templatesQuery.isError || matchingQuery.isError;
  const refreshTemplates = () => Promise.all([
    templatesQuery.refetch(),
    ...(selectedEquipment?.id ? [matchingQuery.refetch()] : []),
  ]);

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
    userSelectedTemplateRef.current = true;
    if (templateId === PM_TEMPLATE_NONE_VALUE) {
      setValue('pmTemplateId', null);
      setValue('hasPM', false);
      return;
    }
    setValue('pmTemplateId', templateId);
    setValue('hasPM', true);
  };

  const handleClearTemplate = () => {
    userSelectedTemplateRef.current = true;
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

    if (userSelectedTemplateRef.current) {
      return;
    }

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
    isError,
    refreshTemplates,
    restrictions,
    handleTemplateChange,
    handleClearTemplate,
    selectValue,
    allowTemplateOverride,
  };
};
