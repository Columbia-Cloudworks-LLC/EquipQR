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
import { List, type RowComponentProps } from 'react-window';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import {
  COMPACT_ROW_HEIGHT,
  LARGE_TEMPLATE_THRESHOLD,
  moveChecklistItemToSectionEdge,
  reorderChecklistItems,
  SECTION_VIRTUALIZATION_THRESHOLD,
} from './checklistTemplateEditorUtils';
import type { ChecklistItemRowCallbacks } from '@/features/organization/components/checklistItemRowCallbacks';

type SaveTrigger = 'text' | 'selection' | 'manual';
export type ChecklistTemplateEditorLayoutMode = 'standalone' | 'page';

export interface ChecklistTemplateEditorHandle {
  save: () => Promise<string | undefined>;
  requestCancel: () => void;
  hasUnsavedChanges: () => boolean;
}

interface ChecklistItemRowProps extends ChecklistItemRowCallbacks {
  item: PMChecklistItem;
  autoFocus?: boolean;
  index: number;
  totalInSection: number;
  sections: string[];
  compactOnly?: boolean;
  enableDragReorder?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragHandleStart?: (itemId: string) => (event: React.DragEvent<HTMLButtonElement>) => void;
  onItemDragOver?: (itemId: string) => (event: React.DragEvent<HTMLDivElement>) => void;
  onItemDrop?: (itemId: string) => (event: React.DragEvent<HTMLDivElement>) => void;
  onItemDragEnd?: () => void;
}

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
  autoFocus,
  index,
  totalInSection,
  sections,
  onCommit,
  onDuplicate,
  onMoveToSection,
  onMoveToTop,
  onMoveToBottom,
  onDelete,
  onAddBelow,
  triggerAutoSave,
  compactOnly = false,
  enableDragReorder = false,
  isDragging = false,
  isDragOver = false,
  onDragHandleStart,
  onItemDragOver,
  onItemDrop,
  onItemDragEnd,
}: ChecklistItemRowProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [titleInput, setTitleInput] = useState(item.title);
  const [descInput, setDescInput] = useState(item.description || '');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setTitleInput(item.title);
    setDescInput(item.description || '');
  }, [item.id, item.title, item.description]);

  useEffect(() => {
    if (autoFocus && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [autoFocus]);

  const commitTitle = () => {
    if (titleInput !== item.title) {
      onCommit(item.id, { title: titleInput });
      triggerAutoSave('text');
    }
  };

  const handleDescBlur = () => {
    if ((item.description || '') !== descInput) {
      onCommit(item.id, { description: descInput });
      triggerAutoSave('text');
    }
  };

  const handleRequiredChange = (checked: boolean | 'indeterminate') => {
    const value = checked === true;
    if (value !== item.required) {
      onCommit(item.id, { required: value });
      triggerAutoSave('selection');
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTitle();
      onAddBelow(item.id);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setTitleInput(item.title);
      setExpanded(false);
      titleRef.current?.blur();
    }
  };

  const showExpanded = !compactOnly && expanded;
  const hasDescription = Boolean(descInput.trim());
  const showDescriptionPreview = !compactOnly && !showExpanded && hasDescription;
  const checkLabel = titleInput.trim() || item.title.trim() || 'check';

  const requiredControl = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`required-${item.id}`}
          checked={item.required}
          onCheckedChange={handleRequiredChange}
          aria-describedby={`required-help-${item.id}`}
        />
        <Label htmlFor={`required-${item.id}`} className="text-xs font-medium cursor-pointer">
          Required
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              aria-label={`Required check help for ${checkLabel}`}
            >
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p id={`required-help-${item.id}`}>
              When enabled, technicians must complete this check on the work order. It cannot be skipped.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  const actionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Actions for ${checkLabel}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!compactOnly && (
          <DropdownMenuItem onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Collapse details' : 'Expand details'}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onDuplicate(item.id)}>
          <Copy className="mr-2 h-3 w-3" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMoveToTop(item.id)} disabled={index === 0}>
          <ArrowUp className="mr-2 h-3 w-3" />
          Move to top
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMoveToBottom(item.id)} disabled={index === totalInSection - 1}>
          <ArrowDown className="mr-2 h-3 w-3" />
          Move to bottom
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-3 w-3" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div
      className={cn(
        'border rounded-md transition-colors',
        'p-3',
        isDragging && 'opacity-50',
        isDragOver && 'border-primary ring-1 ring-primary/40'
      )}
      data-item-id={item.id}
      onDragOver={onItemDragOver?.(item.id)}
      onDrop={onItemDrop?.(item.id)}
      onDragEnd={onItemDragEnd}
    >
      <div className="flex gap-2">
        <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
          {enableDragReorder && onDragHandleStart ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-grab text-muted-foreground active:cursor-grabbing"
              draggable
              onDragStart={onDragHandleStart(item.id)}
              aria-label={`Drag to reorder ${checkLabel}`}
            >
              <GripVertical className="h-4 w-4" aria-hidden />
            </Button>
          ) : null}
          {!compactOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={showExpanded}
              aria-label={
                showExpanded ? `Collapse description for ${checkLabel}` : `Expand description for ${checkLabel}`
              }
            >
              {showExpanded ? (
                <ChevronDown className="h-4 w-4" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden />
              )}
            </Button>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start gap-2">
            <Input
              ref={titleRef}
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={handleTitleKeyDown}
              placeholder="Check name"
              className={cn('min-w-0 flex-1', compactOnly ? 'h-8' : 'h-9')}
              aria-label="Check name"
            />
            {actionsMenu}
          </div>

          {requiredControl}

          {showDescriptionPreview && (
            <button
              type="button"
              className="line-clamp-2 w-full text-left text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(true)}
            >
              {descInput}
            </button>
          )}

          {showExpanded && (
            <div className="space-y-3 border-t border-border/60 pt-3">
              <div>
                <Label className="text-xs">Description (Optional)</Label>
                <Textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  onBlur={handleDescBlur}
                  placeholder="Instructions for technicians"
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-xs">Move to section</Label>
                <Select onValueChange={(v) => onMoveToSection(item.id, v)} value={item.section}>
                  <SelectTrigger className="h-8 w-full max-w-md">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

type VirtualRowProps = ChecklistItemRowCallbacks & {
  items: PMChecklistItem[];
  sections: string[];
  newItemIdRef: React.MutableRefObject<string | null>;
};

function VirtualItemRow({
  index,
  style,
  items,
  sections,
  newItemIdRef,
  onCommit,
  onDuplicate,
  onMoveToSection,
  onMoveToTop,
  onMoveToBottom,
  onDelete,
  onAddBelow,
  triggerAutoSave,
}: RowComponentProps<VirtualRowProps>) {
  const item = items[index];
  if (!item) return null;
  const isNewlyAdded = item.id === newItemIdRef.current;
  if (isNewlyAdded) newItemIdRef.current = null;

  return (
    <div style={style} className="px-0.5 pb-1">
      <ChecklistItemRow
        item={item}
        autoFocus={isNewlyAdded}
        index={index}
        totalInSection={items.length}
        sections={sections}
        onCommit={onCommit}
        onDuplicate={onDuplicate}
        onMoveToSection={onMoveToSection}
        onMoveToTop={onMoveToTop}
        onMoveToBottom={onMoveToBottom}
        onDelete={onDelete}
        onAddBelow={onAddBelow}
        triggerAutoSave={triggerAutoSave}
        compactOnly
      />
    </div>
  );
}

interface SectionItemsListProps {
  sectionItems: PMChecklistItem[];
  sections: string[];
  previewMode: boolean;
  newItemIdRef: React.MutableRefObject<string | null>;
  onCommit: (itemId: string, updates: Partial<PMChecklistItem>) => void;
  onDuplicate: (itemId: string) => void;
  onMoveToSection: (itemId: string, targetSection: string) => void;
  onMoveToTop: (itemId: string) => void;
  onMoveToBottom: (itemId: string) => void;
  onReorderItems: (activeId: string, overId: string) => void;
  onDelete: (itemId: string) => void;
  onAddBelow: (itemId: string) => void;
  triggerAutoSave: (trigger?: SaveTrigger) => void;
}

function SectionItemsList({
  sectionItems,
  sections,
  previewMode,
  newItemIdRef,
  onCommit,
  onDuplicate,
  onMoveToSection,
  onMoveToTop,
  onMoveToBottom,
  onReorderItems,
  onDelete,
  onAddBelow,
  triggerAutoSave,
}: SectionItemsListProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const enableDragReorder =
    !previewMode && sectionItems.length <= SECTION_VIRTUALIZATION_THRESHOLD;

  const handleDragHandleStart = useCallback(
    (itemId: string) => (event: React.DragEvent<HTMLButtonElement>) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', itemId);
      setDraggingId(itemId);
    },
    []
  );

  const handleItemDragOver = useCallback(
    (itemId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (draggingId && draggingId !== itemId) {
        setDragOverId(itemId);
      }
    },
    [draggingId]
  );

  const handleItemDrop = useCallback(
    (itemId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const activeId = event.dataTransfer.getData('text/plain') || draggingId;
      if (activeId && activeId !== itemId) {
        onReorderItems(activeId, itemId);
        triggerAutoSave('manual');
      }
      setDraggingId(null);
      setDragOverId(null);
    },
    [draggingId, onReorderItems, triggerAutoSave]
  );

  const handleItemDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverId(null);
  }, []);
  const rowProps: VirtualRowProps = useMemo(
    () => ({
      items: sectionItems,
      sections,
      newItemIdRef,
      onCommit,
      onDuplicate,
      onMoveToSection,
      onMoveToTop,
      onMoveToBottom,
      onDelete,
      onAddBelow,
      triggerAutoSave,
    }),
    [
      sectionItems,
      sections,
      newItemIdRef,
      onCommit,
      onDuplicate,
      onMoveToSection,
      onMoveToTop,
      onMoveToBottom,
      onDelete,
      onAddBelow,
      triggerAutoSave,
    ]
  );

  const Row = useCallback(
    (props: RowComponentProps<VirtualRowProps>) => <VirtualItemRow {...props} />,
    []
  );

  if (previewMode) {
    return (
      <div className="space-y-2">
        {sectionItems.map((item) => (
          <div key={item.id} className="rounded border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium min-w-0 break-words">{item.title}</div>
              <Badge variant={item.required ? 'default' : 'outline'} className="flex-shrink-0">
                {item.required ? 'Required' : 'Optional'}
              </Badge>
            </div>
            {item.description && (
              <div className="text-sm text-muted-foreground mt-2">{item.description}</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (sectionItems.length > SECTION_VIRTUALIZATION_THRESHOLD) {
    const listHeight = Math.min(sectionItems.length * COMPACT_ROW_HEIGHT, 480);
    return (
      <List
        rowComponent={Row}
        rowCount={sectionItems.length}
        rowHeight={COMPACT_ROW_HEIGHT}
        rowProps={rowProps}
        style={{ height: listHeight }}
        className="w-full"
      />
    );
  }

  return (
    <div className="space-y-2">
      {sectionItems.map((item, index) => {
        const isNewlyAdded = item.id === newItemIdRef.current;
        if (isNewlyAdded) newItemIdRef.current = null;
        return (
          <ChecklistItemRow
            key={item.id}
            item={item}
            autoFocus={isNewlyAdded}
            index={index}
            totalInSection={sectionItems.length}
            sections={sections}
            onCommit={onCommit}
            onDuplicate={onDuplicate}
            onMoveToSection={onMoveToSection}
            onMoveToTop={onMoveToTop}
            onMoveToBottom={onMoveToBottom}
            onDelete={onDelete}
            onAddBelow={onAddBelow}
            triggerAutoSave={triggerAutoSave}
            enableDragReorder={enableDragReorder}
            isDragging={draggingId === item.id}
            isDragOver={dragOverId === item.id}
            onDragHandleStart={enableDragReorder ? handleDragHandleStart : undefined}
            onItemDragOver={enableDragReorder ? handleItemDragOver : undefined}
            onItemDrop={enableDragReorder ? handleItemDrop : undefined}
            onItemDragEnd={enableDragReorder ? handleItemDragEnd : undefined}
          />
        );
      })}
    </div>
  );
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
    const [expanded, setExpanded] = useState<string[]>([]);
    const [previewMode, setPreviewMode] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [focusSectionMode, setFocusSectionMode] = useState(false);
    const [focusedSection, setFocusedSection] = useState<string | null>(null);
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

    useEffect(() => {
      if (!template) return;
      setTemplateName(template.name);
      setTemplateDescription(template.description || '');
      setChecklistItems(template.template_data);
      const unique = Array.from(new Set(template.template_data.map((item) => item.section)));
      if (template.template_data.length >= LARGE_TEMPLATE_THRESHOLD && unique.length > 0) {
        setFocusSectionMode(true);
        setFocusedSection(unique[0]);
        setExpanded([unique[0]]);
      } else {
        setFocusSectionMode(false);
        setFocusedSection(null);
        setExpanded(unique);
      }
      setSettingsOpen(template.template_data.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync keyed on template id only
    }, [template?.id]);

    const groupedItems = useMemo(
      () =>
        groupChecklistItemsBySection(checklistItems),
      [checklistItems]
    );

    const sections = useMemo(() => Object.keys(groupedItems), [groupedItems]);
    const totalItemCount = checklistItems.length;
    const isLargeTemplate = totalItemCount >= LARGE_TEMPLATE_THRESHOLD;

    const visibleSections = useMemo(() => {
      if (focusSectionMode && focusedSection && sections.includes(focusedSection)) {
        return [focusedSection];
      }
      return sections;
    }, [sections, focusSectionMode, focusedSection]);

    const expandAll = useCallback(() => {
      setFocusSectionMode(false);
      setExpanded(sections);
    }, [sections]);

    const collapseAll = useCallback(() => {
      setExpanded([]);
    }, []);

    const enableFocusSectionMode = useCallback(() => {
      setFocusSectionMode(true);
      const target = focusedSection && sections.includes(focusedSection) ? focusedSection : sections[0];
      if (target) {
        setFocusedSection(target);
        setExpanded([target]);
      }
    }, [focusedSection, sections]);

    const handleTocSectionClick = useCallback(
      (sectionName: string) => {
        setFocusedSection(sectionName);
        if (focusSectionMode) {
          setExpanded([sectionName]);
        } else {
          setExpanded((prev) => Array.from(new Set([...prev, sectionName])));
        }
      },
      [focusSectionMode]
    );

    const handleAccordionChange = useCallback(
      (value: string[]) => {
        if (focusSectionMode && value.length > 1) {
          const newest = value.find((v) => !expanded.includes(v)) ?? value[value.length - 1];
          setExpanded(newest ? [newest] : []);
          setFocusedSection(newest ?? null);
        } else {
          setExpanded(value);
          if (value.length === 1) setFocusedSection(value[0]);
        }
      },
      [focusSectionMode, expanded]
    );

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
      setExpanded((prev) => (focusSectionMode ? [newName] : Array.from(new Set([...prev, newName]))));
      setFocusedSection(newName);
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
        setExpanded((prev) =>
          prev.includes(renameOriginal) ? [...prev.filter((s) => s !== renameOriginal), newName] : prev
        );
        if (focusedSection === renameOriginal) setFocusedSection(newName);
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
      setExpanded((prev) => prev.filter((s) => s !== deleteTarget));
      if (focusedSection === deleteTarget) setFocusedSection(null);
      setHasUnsavedChanges(true);
      setDeleteDialogOpen(false);
    };

    const addItem = (section: string) => {
      const newId = nanoid();
      newItemIdRef.current = newId;
      const newItem: PMChecklistItem = {
        id: newId,
        title: 'New item',
        description: '',
        section,
        condition: null,
        required: true,
        notes: '',
      };
      setChecklistItems((prev) => [...prev, newItem]);
      setHasUnsavedChanges(true);
    };

    const addItemBelow = (itemId: string) => {
      setChecklistItems((prev) => {
        const index = prev.findIndex((i) => i.id === itemId);
        if (index === -1) return prev;
        const section = prev[index].section;
        const newId = nanoid();
        newItemIdRef.current = newId;
        const newItem: PMChecklistItem = {
          id: newId,
          title: '',
          description: '',
          section,
          condition: null,
          required: true,
          notes: '',
        };
        return [...prev.slice(0, index + 1), newItem, ...prev.slice(index + 1)];
      });
      setHasUnsavedChanges(true);
    };

    const updateItem = useCallback((itemId: string, updates: Partial<PMChecklistItem>) => {
      setChecklistItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
      setHasUnsavedChanges(true);
    }, []);

    const deleteItem = useCallback((itemId: string) => {
      setChecklistItems((prev) => prev.filter((item) => item.id !== itemId));
      setHasUnsavedChanges(true);
    }, []);

    const moveItemToSectionEdge = useCallback((itemId: string, edge: 'top' | 'bottom') => {
      setChecklistItems((prev) => moveChecklistItemToSectionEdge(prev, itemId, edge));
      setHasUnsavedChanges(true);
    }, []);

    const reorderItems = useCallback((activeId: string, overId: string) => {
      setChecklistItems((prev) => reorderChecklistItems(prev, activeId, overId));
      setHasUnsavedChanges(true);
    }, []);

    const duplicateItem = useCallback((itemId: string) => {
      setChecklistItems((prev) => {
        const index = prev.findIndex((i) => i.id === itemId);
        if (index === -1) return prev;
        const copy: PMChecklistItem = { ...prev[index], id: nanoid() };
        return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
      });
      setHasUnsavedChanges(true);
    }, []);

    const moveItemToSection = useCallback((itemId: string, targetSection: string) => {
      setChecklistItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, section: targetSection } : i)));
      setHasUnsavedChanges(true);
    }, []);

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
