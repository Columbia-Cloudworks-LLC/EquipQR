import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown,
  Save,
  X,
  Globe,
  Shield,
  Lock
} from 'lucide-react';
import { SaveStatus } from '@/components/ui/SaveStatus';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useBrowserStorage } from '@/hooks/useBrowserStorage';
import { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { useCreatePMTemplate, useUpdatePMTemplate } from '@/features/pm-templates/hooks/usePMTemplates';
import { nanoid } from 'nanoid';

type SaveTrigger = 'text' | 'selection' | 'manual';

interface ChecklistItemRowProps {
  item: PMChecklistItem;
  index: number;
  totalInSection: number;
  sections: string[];
  onCommit: (itemId: string, updates: Partial<PMChecklistItem>) => void;
  onDuplicate: (itemId: string) => void;
  onMoveToSection: (itemId: string, targetSection: string) => void;
  onMoveUp: (itemId: string) => void;
  onMoveDown: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  triggerAutoSave: (trigger?: SaveTrigger) => void;
}

const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
  index,
  totalInSection,
  sections,
  onCommit,
  onDuplicate,
  onMoveToSection,
  onMoveUp,
  onMoveDown,
  onDelete,
  triggerAutoSave
}: ChecklistItemRowProps) {
  const [titleInput, setTitleInput] = useState(item.title);
  const [descInput, setDescInput] = useState(item.description || '');

  useEffect(() => {
    setTitleInput(item.title);
    setDescInput(item.description || '');
  }, [item.id, item.title, item.description]);

  const handleTitleBlur = () => {
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

  const handleRequiredChange = (checked: boolean | string) => {
    const value = checked as boolean;
    if (value !== item.required) {
      onCommit(item.id, { required: value });
      triggerAutoSave('selection');
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Item title"
            />
          </div>
          <div>
            <Label>Description (Optional)</Label>
            <Textarea
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              onBlur={handleDescBlur}
              placeholder="Item description"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`required-${item.id}`}
              checked={item.required}
              onCheckedChange={handleRequiredChange}
            />
            <Label htmlFor={`required-${item.id}`}>Required</Label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onDuplicate(item.id)}>Duplicate</Button>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Move to</Label>
              <Select onValueChange={(v) => onMoveToSection(item.id, v)} value={item.section}>
                <SelectTrigger className="h-8 w-[200px]">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 ml-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onMoveUp(item.id)} 
            disabled={index === 0}
            aria-label="Move item up"
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onMoveDown(item.id)} 
            disabled={index === totalInSection - 1}
            aria-label="Move item down"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDelete(item.id)}
            aria-label="Delete item"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
});

interface ChecklistTemplateEditorProps {
  template?: {
    id: string;
    name: string;
    description?: string | null;
    template_data: PMChecklistItem[];
    organization_id?: string | null;
    is_protected?: boolean;
    created_at?: string;
    updated_at?: string;
  } | null;
  onSave: () => void;
  onCancel: () => void;
}

export const ChecklistTemplateEditor: React.FC<ChecklistTemplateEditorProps> = ({
  template,
  onSave,
  onCancel
}) => {
  const [templateName, setTemplateName] = useState(template?.name || '');
  const [templateDescription, setTemplateDescription] = useState(template?.description || '');
  const [checklistItems, setChecklistItems] = useState<PMChecklistItem[]>(template?.template_data || []);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Section dialogs state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameOriginal, setRenameOriginal] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [isNewSectionFlow, setIsNewSectionFlow] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const createMutation = useCreatePMTemplate();
  const updateMutation = useUpdatePMTemplate();

  useEffect(() => {
    if (template) {
      setTemplateName(template.name);
      setTemplateDescription(template.description || '');
      setChecklistItems(template.template_data);

      const unique = Array.from(new Set(template.template_data.map(item => item.section)));
      setExpanded(unique);
    }
  }, [template]);

  // Group items by section
  const groupedItems = useMemo(() => (
    checklistItems.reduce((acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    }, {} as Record<string, PMChecklistItem[]>)
  ), [checklistItems]);

  const sections = useMemo(() => Object.keys(groupedItems), [groupedItems]);

  // Expand / Collapse all
  const expandAll = useCallback(() => setExpanded(sections), [sections]);
  const collapseAll = useCallback(() => setExpanded([]), []);

  // Section dialogs
  const openAddSection = () => {
    setIsNewSectionFlow(true);
    setRenameOriginal(null);
    setRenameInput('');
    setRenameDialogOpen(true);
  };

  const openRenameSection = (section: string) => {
    setIsNewSectionFlow(false);
    setRenameOriginal(section);
    setRenameInput(section);
    setRenameDialogOpen(true);
  };

  const confirmRenameSection = () => {
    const newName = renameInput.trim();
    if (!newName) return;

    if (isNewSectionFlow) {
      if (sections.includes(newName)) {
        setRenameDialogOpen(false);
        return;
      }
      const newItem: PMChecklistItem = {
        id: nanoid(),
        title: 'New item',
        description: '',
        section: newName,
        condition: null,
        required: false,
        notes: ''
      };
      setChecklistItems(prev => [...prev, newItem]);
      setExpanded(prev => Array.from(new Set([...prev, newName])));
      setHasUnsavedChanges(true);
      setRenameDialogOpen(false);
      return;
    }

    if (renameOriginal && newName !== renameOriginal && !sections.includes(newName)) {
      const updatedItems = checklistItems.map(item => item.section === renameOriginal ? { ...item, section: newName } : item);
      setChecklistItems(updatedItems);
      setExpanded(prev => prev.includes(renameOriginal) ? [...prev.filter(s => s !== renameOriginal), newName] : prev);
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
    const updatedItems = checklistItems.filter(item => item.section !== deleteTarget);
    setChecklistItems(updatedItems);
    setExpanded(prev => prev.filter(s => s !== deleteTarget));
    setHasUnsavedChanges(true);
    setDeleteDialogOpen(false);
  };

  const addItem = (section: string) => {
    const newItem: PMChecklistItem = {
      id: nanoid(),
      title: 'New item',
      description: '',
      section,
      condition: null,
      required: false,
      notes: ''
    };
    setChecklistItems([...checklistItems, newItem]);
    setHasUnsavedChanges(true);
  };

  const updateItem = (itemId: string, updates: Partial<PMChecklistItem>) => {
    const updatedItems = checklistItems.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    setChecklistItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  const deleteItem = (itemId: string) => {
    const updatedItems = checklistItems.filter(item => item.id !== itemId);
    setChecklistItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  const moveItem = (itemId: string, direction: 'up' | 'down') => {
    const item = checklistItems.find(i => i.id === itemId);
    if (!item) return;

    const sectionItems = groupedItems[item.section];
    const itemIndex = sectionItems.findIndex(i => i.id === itemId);
    
    if (direction === 'up' && itemIndex > 0) {
      const targetItem = sectionItems[itemIndex - 1];
      // Swap positions in the main array
      const newItems = [...checklistItems];
      const itemIndexInMain = newItems.findIndex(i => i.id === itemId);
      const targetIndexInMain = newItems.findIndex(i => i.id === targetItem.id);
      [newItems[itemIndexInMain], newItems[targetIndexInMain]] = [newItems[targetIndexInMain], newItems[itemIndexInMain]];
      setChecklistItems(newItems);
      setHasUnsavedChanges(true);
    } else if (direction === 'down' && itemIndex < sectionItems.length - 1) {
      const targetItem = sectionItems[itemIndex + 1];
      // Swap positions in the main array
      const newItems = [...checklistItems];
      const itemIndexInMain = newItems.findIndex(i => i.id === itemId);
      const targetIndexInMain = newItems.findIndex(i => i.id === targetItem.id);
      [newItems[itemIndexInMain], newItems[targetIndexInMain]] = [newItems[targetIndexInMain], newItems[itemIndexInMain]];
      setChecklistItems(newItems);
      setHasUnsavedChanges(true);
    }
  };

  const duplicateItem = (itemId: string) => {
    const index = checklistItems.findIndex(i => i.id === itemId);
    if (index === -1) return;
    const base = checklistItems[index];
    const copy: PMChecklistItem = { ...base, id: nanoid() };
    const newItems = [
      ...checklistItems.slice(0, index + 1),
      copy,
      ...checklistItems.slice(index + 1)
    ];
    setChecklistItems(newItems);
    setHasUnsavedChanges(true);
  };

  const moveItemToSection = (itemId: string, targetSection: string) => {
    const updated = checklistItems.map(i => i.id === itemId ? { ...i, section: targetSection } : i);
    setChecklistItems(updated);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      alert('Template name is required');
      return;
    }

    if (checklistItems.length === 0) {
      alert('Template must have at least one item');
      return;
    }

    if (sections.length === 0) {
      alert('Template must have at least one section');
      return;
    }

    try {
      if (template) {
        // Update existing template
        await updateMutation.mutateAsync({
          templateId: template.id,
          updates: {
            name: templateName,
            description: templateDescription,
            template_data: checklistItems
          }
        });
      } else {
        // Create new template
        await createMutation.mutateAsync({
          name: templateName,
          description: templateDescription,
          template_data: checklistItems
        });
      }
      setHasUnsavedChanges(false);
      onSave();
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Drafts for new template only
  const storageKey = `pm-template-editor-${template?.id || 'new'}`;
  const { loadFromStorage, clearStorage } = useBrowserStorage({
    key: storageKey,
    data: { templateName, templateDescription, checklistItems },
    enabled: true
  });

  const hasLoadedDraftRef = useRef(false);

  useEffect(() => {
    if (template?.id || hasLoadedDraftRef.current) {
      return;
    }

    const draft = loadFromStorage() as unknown as {
      templateName?: string;
      templateDescription?: string;
      checklistItems?: PMChecklistItem[];
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

    hasLoadedDraftRef.current = true;
  }, [template?.id, loadFromStorage]);

  // Autosave for existing templates
  const isExisting = !!template?.id;
  const handleAutoSave = useCallback(async () => {
    if (!isExisting) return;
    await updateMutation.mutateAsync({
      templateId: template!.id,
      updates: {
        name: templateName,
        description: templateDescription,
        template_data: checklistItems
      }
    });
    setHasUnsavedChanges(false);
    clearStorage();
  }, [isExisting, template, templateName, templateDescription, checklistItems, updateMutation, clearStorage]);

  const { triggerAutoSave, status: autoSaveInternalStatus, lastSaved } = useAutoSave({
    onSave: handleAutoSave,
    textDelay: 1500,
    selectionDelay: 500,
    enabled: isExisting
  });

  const autoSaveStatus: 'saving' | 'saved' | 'error' | 'offline' =
    autoSaveInternalStatus === 'saving' ? 'saving' : (autoSaveInternalStatus === 'error' ? 'error' : 'saved');

  // Before unload protection
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
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
          {template && (
            <div className="flex items-center gap-2">
              {!template.organization_id && (
                <Badge variant="secondary"><Globe className="w-3 h-3 mr-1" />Global</Badge>
              )}
              {template.organization_id && (
                <Badge variant="secondary">Organization</Badge>
              )}
              {template.is_protected && (
                <Badge variant="outline"><Shield className="w-3 h-3 mr-1" />Protected</Badge>
              )}
              {!template.is_protected && !template.organization_id && (
                <Badge variant="outline"><Lock className="w-3 h-3 mr-1" />Read-only</Badge>
              )}
              <SaveStatus status={autoSaveStatus} lastSaved={lastSaved} />
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Preview</span>
              <Switch checked={previewMode} onCheckedChange={setPreviewMode} />
            </div>
            <Button size="sm" variant="ghost" onClick={expandAll}>Expand all</Button>
            <Button size="sm" variant="ghost" onClick={collapseAll}>Collapse all</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openAddSection} size="sm">
              <Plus className="mr-1 h-3 w-3" />
              Add Section
            </Button>
          </div>
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* TOC */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">Table of Contents</div>
                {expanded.length < sections.length ? (
                  <Button size="sm" variant="ghost" onClick={expandAll}>Expand all</Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={collapseAll}>Collapse all</Button>
                )}
              </div>
              <ScrollArea className="h-[50vh] pr-2">
                <nav aria-label="Template sections table of contents">
                  <ul className="space-y-1 text-sm">
                    {sections.map((s) => (
                      <li key={s}>
                        <a href={`#section-${encodeURIComponent(s)}`} className="hover:underline">
                          {s} ({groupedItems[s].length})
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Editor */}
        <div className="lg:col-span-9 space-y-4 order-1 lg:order-2">
          {sections.length === 0 ? (
            <Card className="p-6 text-center">
              <div className="text-muted-foreground">
                No sections yet. Add a section to get started.
              </div>
            </Card>
          ) : (
            <Accordion type="multiple" value={expanded} onValueChange={(v) => setExpanded(v as string[])}>
              {sections.map((section) => {
                const sectionItems = groupedItems[section];
                return (
                  <AccordionItem key={section} value={section} id={`section-${encodeURIComponent(section)}`}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full">
                        <div className="font-medium">{section}</div>
                        <div className="text-sm text-muted-foreground">{sectionItems.length} items</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-muted-foreground">Section actions</div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openRenameSection(section)} aria-label={`Rename section ${section}`}>Rename</Button>
                          <Button variant="ghost" size="sm" onClick={() => openDeleteSection(section)} aria-label={`Delete section ${section}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {previewMode ? (
                        <div className="space-y-3">
                          {sectionItems.map((item, idx) => (
                            <div key={item.id} className="rounded border p-3">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{idx + 1}. {item.title}</div>
                                <Badge variant={item.required ? 'default' : 'outline'}>
                                  {item.required ? 'Required' : 'Optional'}
                                </Badge>
                              </div>
                              {item.description && (
                                <div className="text-sm text-muted-foreground mt-2">{item.description}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {sectionItems.map((item, index) => (
                            <ChecklistItemRow
                              key={item.id}
                              item={item}
                              index={index}
                              totalInSection={sectionItems.length}
                              sections={sections}
                              onCommit={updateItem}
                              onDuplicate={duplicateItem}
                              onMoveToSection={moveItemToSection}
                              onMoveUp={(id) => moveItem(id, 'up')}
                              onMoveDown={(id) => moveItem(id, 'down')}
                              onDelete={deleteItem}
                              triggerAutoSave={triggerAutoSave}
                            />
                          ))}

                          <Button variant="outline" onClick={() => addItem(section)} className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item to {section}
                          </Button>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {template ? 'Update Template' : 'Create Template'}
        </Button>
      </div>

      {/* Rename/Add Section Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNewSectionFlow ? 'Add Section' : 'Rename Section'}</DialogTitle>
            <DialogDescription>
              {isNewSectionFlow ? 'Create a new section to group checklist items.' : `Rename section "${renameOriginal}".`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="section-name">Section Name</Label>
            <Input id="section-name" value={renameInput} onChange={(e) => setRenameInput(e.target.value)} placeholder="Enter section name" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmRenameSection} disabled={!renameInput.trim() || (!isNewSectionFlow && renameInput.trim() === renameOriginal)}>
              {isNewSectionFlow ? 'Add Section' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section Confirm */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `Delete section "${deleteTarget}" and all ${groupedItems[deleteTarget]?.length || 0} items? This cannot be undone.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
