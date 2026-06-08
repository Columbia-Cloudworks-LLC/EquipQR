import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useBrowserStorage } from '@/hooks/useBrowserStorage';
import { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { groupChecklistItemsBySection } from '@/utils/pmChecklistHelpers';
import { useCreatePMTemplate, useUpdatePMTemplate } from '@/features/pm-templates/hooks/usePMTemplates';
import {
  usePMTemplateCompatibilityRules,
  useBulkSetPMTemplateRules,
} from '@/features/pm-templates/hooks/usePMTemplateCompatibility';
import type { PMTemplateCompatibilityRuleFormData } from '@/features/pm-templates/types/pmTemplateCompatibility';
import {
  LARGE_TEMPLATE_THRESHOLD,
  buildIntervalPayload,
} from '@/features/organization/components/checklistTemplateEditorUtils';
import type { ChecklistTemplateEditorTemplate } from '@/features/organization/components/checklistTemplateEditorTypes';
import { useChecklistItemMutations } from '@/features/organization/hooks/useChecklistItemMutations';
import { useChecklistSectionNavigation } from '@/features/organization/hooks/useChecklistSectionNavigation';
import { useChecklistSectionManagement } from '@/features/organization/hooks/useChecklistSectionManagement';
import { useOrganization } from '@/contexts/OrganizationContext';
import { pmIntervalPolicyService, policyRowToFormState } from '@/features/pm-templates/services/pmIntervalPolicyService';

type UseChecklistTemplateEditorStateArgs = {
  template?: ChecklistTemplateEditorTemplate | null;
  onSave: (templateId?: string) => void;
  onCancel: () => void;
};

export function useChecklistTemplateEditorState({
  template,
  onSave,
  onCancel,
}: UseChecklistTemplateEditorStateArgs) {
  const [templateName, setTemplateName] = useState(template?.name || '');
  const [templateDescription, setTemplateDescription] = useState(template?.description || '');
  const [checklistItems, setChecklistItems] = useState<PMChecklistItem[]>(template?.template_data || []);
  const [intervalValue, setIntervalValue] = useState<number | null>(template?.interval_value ?? null);
  const [intervalType, setIntervalType] = useState<'days' | 'hours'>(template?.interval_type ?? 'days');
  const [intervalEnabled, setIntervalEnabled] = useState(template?.interval_value != null);
  const [previewMode, setPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(!template?.id);
  const [intervalError, setIntervalError] = useState<string | null>(null);

  const newItemIdRef = useRef<string | null>(null);

  const { currentOrganization } = useOrganization();
  const createMutation = useCreatePMTemplate();
  const updateMutation = useUpdatePMTemplate();

  const syncTemplateIntervalPolicy = useCallback(
    async (templateId: string, intervalPayload: IntervalPayload) => {
      if (!currentOrganization?.id) return;

      const form =
        intervalPayload.interval_value && intervalPayload.interval_type
          ? {
              mode: 'custom' as const,
              intervalValue: intervalPayload.interval_value,
              intervalType: intervalPayload.interval_type,
            }
          : policyRowToFormState(null);

      await pmIntervalPolicyService.upsertPolicy(
        currentOrganization.id,
        { scopeType: 'template', templateId },
        form
      );
    },
    [currentOrganization?.id]
  );

  const { data: savedRules = [], isLoading: isLoadingRules } = usePMTemplateCompatibilityRules(
    template?.id,
    { enabled: !!template?.id }
  );
  const bulkSetRules = useBulkSetPMTemplateRules();
  const [editedRules, setEditedRules] = useState<PMTemplateCompatibilityRuleFormData[]>([]);
  const [hasRulesChanges, setHasRulesChanges] = useState(false);

  const savedRulesSignature = useMemo(
    () =>
      JSON.stringify(
        savedRules.map((rule) => ({ manufacturer: rule.manufacturer, model: rule.model }))
      ),
    [savedRules]
  );

  useEffect(() => {
    if (isLoadingRules) return;

    if (savedRules.length > 0) {
      setEditedRules(
        savedRules.map((rule) => ({ manufacturer: rule.manufacturer, model: rule.model }))
      );
      setHasRulesChanges(false);
      return;
    }

    if (template?.id) {
      setEditedRules((prev) => (prev.length === 0 ? prev : []));
      setHasRulesChanges((prev) => (prev ? false : prev));
    }
  }, [savedRulesSignature, savedRules, isLoadingRules, template?.id]);

  const handleRulesChange = useCallback((newRules: PMTemplateCompatibilityRuleFormData[]) => {
    setEditedRules(newRules);
    setHasRulesChanges(true);
  }, []);

  const handleSaveRules = useCallback(async () => {
    if (!template?.id) return;
    await bulkSetRules.mutateAsync({ templateId: template.id, rules: editedRules });
    setHasRulesChanges(false);
  }, [template?.id, bulkSetRules, editedRules]);

  const groupedItems = useMemo(() => groupChecklistItemsBySection(checklistItems), [checklistItems]);
  const sections = useMemo(() => Object.keys(groupedItems), [groupedItems]);
  const totalItemCount = checklistItems.length;
  const isLargeTemplate = totalItemCount >= LARGE_TEMPLATE_THRESHOLD;

  const sectionNavigation = useChecklistSectionNavigation(sections);
  const {
    applyTemplateSectionState,
    expandSection,
    renameSectionInNavigation,
    removeSectionFromNavigation,
  } = sectionNavigation;

  useEffect(() => {
    if (!template) return;
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setChecklistItems(template.template_data);
    applyTemplateSectionState(template.template_data);
    setSettingsOpen(template.template_data.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync keyed on template id only
  }, [template?.id]);

  const sectionManagement = useChecklistSectionManagement({
    sections,
    checklistItems,
    setChecklistItems,
    setHasUnsavedChanges,
    newItemIdRef,
    expandSection,
    renameSectionInNavigation,
    removeSectionFromNavigation,
  });

  const itemMutations = useChecklistItemMutations({
    setChecklistItems,
    setHasUnsavedChanges,
    newItemIdRef,
  });

  const handleSave = useCallback(async (): Promise<string | undefined> => {
    if (!templateName.trim()) {
      alert('Template name is required');
      return undefined;
    }

    if (checklistItems.length === 0) {
      alert('Template must have at least one item');
      return undefined;
    }

    if (sections.length === 0) {
      alert('Template must have at least one section');
      return undefined;
    }

    if (intervalEnabled && (!intervalValue || intervalValue < 1)) {
      setIntervalError('Enter a value of 1 or greater');
      return undefined;
    }
    setIntervalError(null);

    const intervalPayload = buildIntervalPayload(intervalEnabled, intervalValue, intervalType);

    try {
      if (template) {
        await updateMutation.mutateAsync({
          templateId: template.id,
          updates: {
            name: templateName,
            description: templateDescription,
            template_data: checklistItems,
            ...intervalPayload,
          },
        });
        await syncTemplateIntervalPolicy(template.id, intervalPayload);
        setHasUnsavedChanges(false);
        onSave(template.id);
        return template.id;
      }

      const created = await createMutation.mutateAsync({
        name: templateName,
        description: templateDescription,
        template_data: checklistItems,
        ...intervalPayload,
      });
      await syncTemplateIntervalPolicy(created.id, intervalPayload);
      setHasUnsavedChanges(false);
      onSave(created.id);
      return created.id;
    } catch (error) {
      console.error('Failed to save template:', error);
      return undefined;
    }
  }, [
    templateName,
    templateDescription,
    checklistItems,
    sections.length,
    intervalEnabled,
    intervalValue,
    intervalType,
    template,
    updateMutation,
    createMutation,
    onSave,
    syncTemplateIntervalPolicy,
  ]);

  const storageKey = `pm-template-editor-${template?.id || 'new'}`;
  const { loadFromStorage, clearStorage } = useBrowserStorage({
    key: storageKey,
    data: { templateName, templateDescription, checklistItems, intervalValue, intervalType, intervalEnabled },
    enabled: true,
  });

  const hasLoadedDraftRef = useRef(false);

  useEffect(() => {
    if (template?.id || hasLoadedDraftRef.current) return;

    const draft = loadFromStorage() as unknown as {
      templateName?: string;
      templateDescription?: string;
      checklistItems?: PMChecklistItem[];
      intervalValue?: number | null;
      intervalType?: 'days' | 'hours';
      intervalEnabled?: boolean;
    } | null;

    if (!draft) {
      hasLoadedDraftRef.current = true;
      return;
    }

    if (draft.templateName !== undefined) setTemplateName(draft.templateName);
    if (draft.templateDescription !== undefined) setTemplateDescription(draft.templateDescription);
    if (draft.checklistItems && Array.isArray(draft.checklistItems)) {
      setChecklistItems(draft.checklistItems);
    }
    if (draft.intervalValue !== undefined) setIntervalValue(draft.intervalValue);
    if (draft.intervalType !== undefined) setIntervalType(draft.intervalType);
    if (draft.intervalEnabled !== undefined) setIntervalEnabled(draft.intervalEnabled);

    hasLoadedDraftRef.current = true;
  }, [template?.id, loadFromStorage]);

  const isExisting = !!template?.id;
  const handleAutoSave = useCallback(async () => {
    if (!isExisting) return;
    const intervalPayload = buildIntervalPayload(intervalEnabled, intervalValue, intervalType);
    await updateMutation.mutateAsync({
      templateId: template!.id,
      updates: {
        name: templateName,
        description: templateDescription,
        template_data: checklistItems,
        ...intervalPayload,
      },
    });
    await syncTemplateIntervalPolicy(template!.id, intervalPayload);
    setHasUnsavedChanges(false);
    clearStorage();
  }, [
    isExisting,
    template,
    templateName,
    templateDescription,
    checklistItems,
    intervalEnabled,
    intervalValue,
    intervalType,
    updateMutation,
    clearStorage,
    syncTemplateIntervalPolicy,
  ]);

  const { triggerAutoSave, status: autoSaveInternalStatus, lastSaved } = useAutoSave({
    onSave: handleAutoSave,
    textDelay: 1500,
    selectionDelay: 500,
    enabled: isExisting,
  });

  const autoSaveStatus: 'saving' | 'saved' | 'error' | 'offline' =
    autoSaveInternalStatus === 'saving' ? 'saving' : autoSaveInternalStatus === 'error' ? 'error' : 'saved';

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    if (!template?.id) {
      clearStorage();
    }
    onCancel();
  }, [hasUnsavedChanges, template?.id, clearStorage, onCancel]);

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const onNameChange = useCallback(
    (value: string) => {
      setTemplateName(value);
      setHasUnsavedChanges(true);
      triggerAutoSave('text', JSON.stringify({ templateName: value, templateDescription, checklistItems }));
    },
    [templateDescription, checklistItems, triggerAutoSave]
  );

  const onDescriptionChange = useCallback(
    (value: string) => {
      setTemplateDescription(value);
      setHasUnsavedChanges(true);
      triggerAutoSave('text', JSON.stringify({ templateName, templateDescription: value, checklistItems }));
    },
    [templateName, checklistItems, triggerAutoSave]
  );

  const onIntervalEnabledChange = useCallback(
    (checked: boolean) => {
      setIntervalEnabled(checked);
      if (!checked) setIntervalValue(null);
      setHasUnsavedChanges(true);
      triggerAutoSave('selection');
    },
    [triggerAutoSave]
  );

  const onIntervalValueChange = useCallback(
    (value: number | null) => {
      setIntervalValue(value);
      setIntervalError(null);
      setHasUnsavedChanges(true);
      triggerAutoSave('text');
    },
    [triggerAutoSave]
  );

  const onIntervalTypeChange = useCallback(
    (value: 'days' | 'hours') => {
      setIntervalType(value);
      setHasUnsavedChanges(true);
      triggerAutoSave('selection');
    },
    [triggerAutoSave]
  );

  const tocSections = useMemo(
    () => sections.map((name) => ({ name, count: groupedItems[name].length })),
    [sections, groupedItems]
  );

  return {
    template,
    templateName,
    templateDescription,
    checklistItems,
    intervalValue,
    intervalType,
    intervalEnabled,
    intervalError,
    previewMode,
    setPreviewMode,
    hasUnsavedChanges,
    settingsOpen,
    setSettingsOpen,
    groupedItems,
    sections,
    totalItemCount,
    isLargeTemplate,
    tocSections,
    newItemIdRef,
    isLoading,
    isLoadingRules,
    editedRules,
    hasRulesChanges,
    bulkSetRules,
    handleRulesChange,
    handleSaveRules,
    handleSave,
    handleCancel,
    onNameChange,
    onDescriptionChange,
    onIntervalEnabledChange,
    onIntervalValueChange,
    onIntervalTypeChange,
    autoSaveStatus,
    lastSaved,
    triggerAutoSave,
    sectionNavigation,
    sectionManagement,
    itemMutations,
  };
}
