// fallow-ignore-file code-duplication
// Duplication rationale: Large PM template editor mirrors read-only PMTemplateView layout by design
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  Globe,
  Shield,
  Lock,
  Loader2,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Copy,
  GripVertical,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SaveStatus } from '@/components/ui/SaveStatus';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useBrowserStorage } from '@/hooks/useBrowserStorage';
import { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { groupChecklistItemsBySection } from '@/utils/pmChecklistHelpers';
import { useCreatePMTemplate, useUpdatePMTemplate } from '@/features/pm-templates/hooks/usePMTemplates';
import { PMTemplateCompatibilityRulesEditor } from '@/features/pm-templates/components/PMTemplateCompatibilityRulesEditor';
import { PMTemplateSectionToc } from '@/features/pm-templates/components/PMTemplateSectionToc';
import {
  usePMTemplateCompatibilityRules,
  useBulkSetPMTemplateRules,
} from '@/features/pm-templates/hooks/usePMTemplateCompatibility';
import type { PMTemplateCompatibilityRuleFormData } from '@/features/pm-templates/types/pmTemplateCompatibility';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import {
  LARGE_TEMPLATE_THRESHOLD,
  SECTION_VIRTUALIZATION_THRESHOLD,
} from './checklistTemplateEditorUtils';
import { SectionItemsList } from '@/features/organization/components/SectionItemsList';
import { useChecklistItemMutations } from '@/features/organization/hooks/useChecklistItemMutations';
import { useChecklistSectionNavigation } from '@/features/organization/hooks/useChecklistSectionNavigation';
export type ChecklistTemplateEditorLayoutMode = 'standalone' | 'page';

export interface ChecklistTemplateEditorHandle {
  save: () => Promise<string | undefined>;
  requestCancel: () => void;
  hasUnsavedChanges: () => boolean;
}

interface ChecklistTemplateEditorProps {
  template?: {
    id: string;
    name: string;
    description?: string | null;
    template_data: PMChecklistItem[];
    interval_value?: number | null;
    interval_type?: 'days' | 'hours' | null;
    organization_id?: string | null;
    is_protected?: boolean;
    created_at?: string;
    updated_at?: string;
  } | null;
  onSave: (templateId?: string) => void;
  onCancel: () => void;
  layoutMode?: ChecklistTemplateEditorLayoutMode;
}

export const ChecklistTemplateEditor = forwardRef<ChecklistTemplateEditorHandle, ChecklistTemplateEditorProps>(
  function ChecklistTemplateEditor({ template, onSave, onCancel, layoutMode = 'standalone' }, ref) {
    const isPageLayout = layoutMode === 'page';

    const [templateName, setTemplateName] = useState(template?.name || '');
    const [templateDescription, setTemplateDescription] = useState(template?.description || '');
    const [checklistItems, setChecklistItems] = useState<PMChecklistItem[]>(template?.template_data || []);
    const [intervalValue, setIntervalValue] = useState<number | null>(template?.interval_value ?? null);
    const [intervalType, setIntervalType] = useState<'days' | 'hours'>(template?.interval_type ?? 'days');
    const [intervalEnabled, setIntervalEnabled] = useState(template?.interval_value != null);
    const [previewMode, setPreviewMode] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(!template?.id);

    const newItemIdRef = useRef<string | null>(null);
    const [addingSectionInline, setAddingSectionInline] = useState(false);
    const [inlineSectionName, setInlineSectionName] = useState('');
    const inlineSectionRef = useRef<HTMLInputElement>(null);
    const [intervalError, setIntervalError] = useState<string | null>(null);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [renameOriginal, setRenameOriginal] = useState<string | null>(null);
    const [renameInput, setRenameInput] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const createMutation = useCreatePMTemplate();
    const updateMutation = useUpdatePMTemplate();

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

    const handleRulesChange = (newRules: PMTemplateCompatibilityRuleFormData[]) => {
      setEditedRules(newRules);
      setHasRulesChanges(true);
    };

    const handleSaveRules = async () => {
      if (!template?.id) return;
      await bulkSetRules.mutateAsync({ templateId: template.id, rules: editedRules });
      setHasRulesChanges(false);
    };

    const groupedItems = useMemo(
      () =>
        groupChecklistItemsBySection(checklistItems),
      [checklistItems]
    );

    const sections = useMemo(() => Object.keys(groupedItems), [groupedItems]);
    const totalItemCount = checklistItems.length;
    const isLargeTemplate = totalItemCount >= LARGE_TEMPLATE_THRESHOLD;

    const {
      expanded,
      focusSectionMode,
      focusedSection,
      visibleSections,
      applyTemplateSectionState,
      expandAll,
      collapseAll,
      enableFocusSectionMode,
      handleTocSectionClick,
      handleAccordionChange,
      expandSection,
      renameSectionInNavigation,
      removeSectionFromNavigation,
    } = useChecklistSectionNavigation(sections);

    useEffect(() => {
      if (!template) return;
      setTemplateName(template.name);
      setTemplateDescription(template.description || '');
      setChecklistItems(template.template_data);
      applyTemplateSectionState(template.template_data);
      setSettingsOpen(template.template_data.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync keyed on template id only
    }, [template?.id]);

    const openAddSection = () => {
      setInlineSectionName('');
      setAddingSectionInline(true);
      requestAnimationFrame(() => inlineSectionRef.current?.focus());
    };

    const confirmInlineAddSection = () => {
      const newName = inlineSectionName.trim();
      if (!newName || sections.includes(newName)) return;

      const newId = nanoid();
      newItemIdRef.current = newId;
      const newItem: PMChecklistItem = {
        id: newId,
        title: 'New item',
        description: '',
        section: newName,
        condition: null,
        required: true,
        notes: '',
      };
      setChecklistItems((prev) => [...prev, newItem]);
      expandSection(newName);
      setHasUnsavedChanges(true);
      setAddingSectionInline(false);
      setInlineSectionName('');
    };

    const cancelInlineAddSection = () => {
      setAddingSectionInline(false);
      setInlineSectionName('');
    };

    const openRenameSection = (section: string) => {
      setRenameOriginal(section);
      setRenameInput(section);
      setRenameDialogOpen(true);
    };

    const confirmRenameSection = () => {
      const newName = renameInput.trim();
      if (!newName) return;

      if (renameOriginal && newName !== renameOriginal && !sections.includes(newName)) {
        const updatedItems = checklistItems.map((item) =>
          item.section === renameOriginal ? { ...item, section: newName } : item
        );
        setChecklistItems(updatedItems);
        renameSectionInNavigation(renameOriginal, newName);
        setHasUnsavedChanges(true);
      }
      setRenameDialogOpen(false);
    };

    const openDeleteSection = (section: string) => {
      setDeleteTarget(section);
      setDeleteDialogOpen(true);
    };

    const confirmDeleteSection = () => {
      if (!deleteTarget) return;
      const updatedItems = checklistItems.filter((item) => item.section !== deleteTarget);
      setChecklistItems(updatedItems);
      removeSectionFromNavigation(deleteTarget);
      setHasUnsavedChanges(true);
      setDeleteDialogOpen(false);
    };

    const {
      addItem,
      addItemBelow,
      updateItem,
      deleteItem,
      moveItemToSectionEdge,
      reorderItems,
      duplicateItem,
      moveItemToSection,
    } = useChecklistItemMutations({
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

      const intervalPayload =
        intervalEnabled && intervalValue && intervalValue > 0
          ? { interval_value: intervalValue, interval_type: intervalType }
          : { interval_value: null as number | null, interval_type: null as 'days' | 'hours' | null };

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
      const ivPayload =
        intervalEnabled && intervalValue && intervalValue > 0
          ? { interval_value: intervalValue, interval_type: intervalType }
          : { interval_value: null as number | null, interval_type: null as 'days' | 'hours' | null };
      await updateMutation.mutateAsync({
        templateId: template!.id,
        updates: {
          name: templateName,
          description: templateDescription,
          template_data: checklistItems,
          ...ivPayload,
        },
      });
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

    useImperativeHandle(
      ref,
      () => ({
        save: handleSave,
        requestCancel: handleCancel,
        hasUnsavedChanges: () => hasUnsavedChanges,
      }),
      [handleSave, handleCancel, hasUnsavedChanges]
    );

    const onNameChange = (value: string) => {
      setTemplateName(value);
      setHasUnsavedChanges(true);
      triggerAutoSave('text', JSON.stringify({ templateName: value, templateDescription, checklistItems }));
    };

    const onDescriptionChange = (value: string) => {
      setTemplateDescription(value);
      setHasUnsavedChanges(true);
      triggerAutoSave('text', JSON.stringify({ templateName, templateDescription: value, checklistItems }));
    };

    const tocSections = useMemo(
      () => sections.map((name) => ({ name, count: groupedItems[name].length })),
      [sections, groupedItems]
    );

    const settingsFields = (
      <div className="space-y-3">
        <div>
          <Label htmlFor="templateName">Template Name</Label>
          <Input
            id="templateName"
            value={templateName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter template name"
          />
        </div>
        <div>
          <Label htmlFor="templateDescription">Description (Optional)</Label>
          <Textarea
            id="templateDescription"
            value={templateDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Enter template description"
            rows={2}
          />
        </div>
        <div className="space-y-3 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="intervalToggle" className="text-sm font-medium">
                Maintenance Interval
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Flag equipment as needing attention when this interval is exceeded since the last completed PM.
              </p>
            </div>
            <Switch
              id="intervalToggle"
              checked={intervalEnabled}
              onCheckedChange={(checked) => {
                setIntervalEnabled(checked);
                if (!checked) setIntervalValue(null);
                setHasUnsavedChanges(true);
                triggerAutoSave('selection');
              }}
            />
          </div>
          {intervalEnabled && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 max-w-[200px]">
                  <Label htmlFor="intervalValue" className="text-xs">
                    Every
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="intervalValue"
                      type="number"
                      min={1}
                      value={intervalValue ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : null;
                        setIntervalValue(val);
                        setIntervalError(null);
                        setHasUnsavedChanges(true);
                        triggerAutoSave('text');
                      }}
                      placeholder="e.g. 90"
                      className={intervalError ? 'border-destructive' : ''}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {intervalType === 'hours' ? 'Working Hours' : 'Calendar Days'}
                    </span>
                  </div>
                  {intervalError && <p className="text-xs text-destructive mt-1">{intervalError}</p>}
                </div>
                <RadioGroup
                  value={intervalType}
                  onValueChange={(val) => {
                    setIntervalType(val as 'days' | 'hours');
                    setHasUnsavedChanges(true);
                    triggerAutoSave('selection');
                  }}
                  className="flex gap-4 pb-1"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="days" id="interval-days" />
                    <Label htmlFor="interval-days" className="text-sm font-normal cursor-pointer">
                      Calendar Days
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="hours" id="interval-hours" />
                    <Label htmlFor="interval-hours" className="text-sm font-normal cursor-pointer">
                      Working Hours
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
        </div>
        {template && (
          <div className="flex items-center gap-2">
            {!template.organization_id && (
              <Badge variant="secondary">
                <Globe className="w-3 h-3 mr-1" />
                Global
              </Badge>
            )}
            {template.organization_id && <Badge variant="secondary">Organization</Badge>}
            {template.is_protected && (
              <Badge variant="outline">
                <Shield className="w-3 h-3 mr-1" />
                Protected
              </Badge>
            )}
            {!template.is_protected && !template.organization_id && (
              <Badge variant="outline">
                <Lock className="w-3 h-3 mr-1" />
                Read-only
              </Badge>
            )}
            <SaveStatus status={autoSaveStatus} lastSaved={lastSaved} />
          </div>
        )}
      </div>
    );

    const stickyToolbar = (
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/95 backdrop-blur p-3 mb-4',
          isPageLayout && 'sticky top-0 z-10'
        )}
      >
        <div className="text-sm text-muted-foreground">
          {sections.length} section{sections.length !== 1 ? 's' : ''} · {totalItemCount} item
          {totalItemCount !== 1 ? 's' : ''}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Preview</span>
            <Switch checked={previewMode} onCheckedChange={setPreviewMode} />
          </div>
          {isLargeTemplate && (
            <Button
              size="sm"
              variant="outline"
              onClick={focusSectionMode ? expandAll : enableFocusSectionMode}
            >
              {focusSectionMode ? 'Show all sections' : 'Focus section'}
            </Button>
          )}
          {!focusSectionMode && (
            <>
              <Button size="sm" variant="ghost" onClick={expandAll} className="hidden md:inline-flex">
                Expand all
              </Button>
              <Button size="sm" variant="ghost" onClick={collapseAll} className="hidden md:inline-flex">
                Collapse all
              </Button>
            </>
          )}
          <Button onClick={openAddSection} size="sm">
            <Plus className="mr-1 h-3 w-3" />
            Add Section
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" aria-label="Keyboard shortcuts">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 text-sm" align="end">
              <p className="font-medium mb-2">Keyboard shortcuts</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <kbd className="px-1 rounded bg-muted">Enter</kbd> — add item below
                </li>
                <li>
                  <kbd className="px-1 rounded bg-muted">Esc</kbd> — collapse row
                </li>
              </ul>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );

    const checklistEditorContent = (
      <>
        {!isPageLayout && stickyToolbar}

        {addingSectionInline && (
          <div className="flex items-center gap-2 mb-4 p-3 border rounded-lg bg-muted/50">
            <Input
              ref={inlineSectionRef}
              value={inlineSectionName}
              onChange={(e) => setInlineSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmInlineAddSection();
                if (e.key === 'Escape') cancelInlineAddSection();
              }}
              placeholder="New section name"
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={confirmInlineAddSection}
              disabled={!inlineSectionName.trim() || sections.includes(inlineSectionName.trim())}
            >
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelInlineAddSection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {sections.length > 0 && (
          <div className="lg:hidden mb-4">
            <Select
              onValueChange={(v) => {
                handleTocSectionClick(v);
                const el = document.getElementById(`section-${encodeURIComponent(v)}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Jump to section..." />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s} ({groupedItems[s].length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="hidden lg:block lg:col-span-3">
            <PMTemplateSectionToc
              sections={tocSections}
              onSectionClick={handleTocSectionClick}
              showExpandCollapse={!focusSectionMode}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              expandedCount={expanded.length}
            />
          </div>

          <div className="lg:col-span-9 space-y-4">
            {sections.length === 0 ? (
              <Card className="p-6 text-center">
                <div className="text-muted-foreground">No sections yet. Add a section to get started.</div>
              </Card>
            ) : (
              <Accordion type="multiple" value={expanded} onValueChange={(v) => handleAccordionChange(v as string[])}>
                {visibleSections.map((section) => {
                  const sectionItems = groupedItems[section];
                  return (
                    <AccordionItem
                      key={section}
                      value={section}
                      id={`section-${encodeURIComponent(section)}`}
                    >
                      <div className="flex items-center gap-1">
                        <AccordionTrigger className="flex-1">
                          <div className="flex items-center justify-between w-full min-w-0 gap-2 pr-2">
                            <div className="font-medium truncate min-w-0">{section}</div>
                            <div className="text-sm text-muted-foreground flex-shrink-0 whitespace-nowrap">
                              {sectionItems.length} items
                            </div>
                          </div>
                        </AccordionTrigger>
                        {!previewMode && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem(section);
                            }}
                            aria-label={`Add item to ${section}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <AccordionContent>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-muted-foreground">Section actions</div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRenameSection(section)}
                              aria-label={`Rename section ${section}`}
                            >
                              Rename
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                              onClick={() => openDeleteSection(section)}
                              aria-label={`Delete section ${section}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <SectionItemsList
                          sectionItems={sectionItems}
                          sections={sections}
                          previewMode={previewMode}
                          newItemIdRef={newItemIdRef}
                          onCommit={updateItem}
                          onDuplicate={duplicateItem}
                          onMoveToSection={moveItemToSection}
                          onMoveToTop={(id) => moveItemToSectionEdge(id, 'top')}
                          onMoveToBottom={(id) => moveItemToSectionEdge(id, 'bottom')}
                          onReorderItems={reorderItems}
                          onDelete={deleteItem}
                          onAddBelow={addItemBelow}
                          triggerAutoSave={triggerAutoSave}
                        />

                        {!previewMode && sectionItems.length <= SECTION_VIRTUALIZATION_THRESHOLD && (
                          <Button variant="outline" onClick={() => addItem(section)} className="w-full mt-2">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item to {section}
                          </Button>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>
        </div>
      </>
    );

    const compatibilityRulesContent = (
      <div className="space-y-4">
        {isLoadingRules ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <PMTemplateCompatibilityRulesEditor
              rules={editedRules}
              onChange={handleRulesChange}
              disabled={bulkSetRules.isPending}
            />
            {hasRulesChanges && (
              <div className="flex justify-end">
                <Button onClick={handleSaveRules} disabled={bulkSetRules.isPending}>
                  {bulkSetRules.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Compatibility Rules
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    );

    return (
      <div className="space-y-6">
        {isPageLayout ? (
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>Template settings</span>
                {settingsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">{settingsFields}</CollapsibleContent>
          </Collapsible>
        ) : (
          settingsFields
        )}

        {isPageLayout && stickyToolbar}

        {template?.id ? (
          <Tabs defaultValue="checklist" className="space-y-4">
            <TabsList>
              <TabsTrigger value="checklist">Checklist Items</TabsTrigger>
              <TabsTrigger value="compatibility">Compatibility Rules</TabsTrigger>
            </TabsList>
            <TabsContent value="checklist" className="space-y-4">
              {checklistEditorContent}
            </TabsContent>
            <TabsContent value="compatibility">{compatibilityRulesContent}</TabsContent>
          </Tabs>
        ) : (
          checklistEditorContent
        )}

        {!isPageLayout && (
          <div className="flex justify-end gap-2 pt-4 border-t pb-20 md:pb-0">
            <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {template ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        )}

        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Section</DialogTitle>
              <DialogDescription>{`Rename section "${renameOriginal}".`}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="section-name">Section Name</Label>
              <Input
                id="section-name"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                placeholder="Enter section name"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={confirmRenameSection}
                disabled={!renameInput.trim() || renameInput.trim() === renameOriginal}
              >
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Section</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget
                  ? `Delete section "${deleteTarget}" and all ${groupedItems[deleteTarget]?.length || 0} items? This cannot be undone.`
                  : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteSection}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }
);

ChecklistTemplateEditor.displayName = 'ChecklistTemplateEditor';
