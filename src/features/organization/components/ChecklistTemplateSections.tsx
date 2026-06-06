import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, X } from 'lucide-react';
import { PMTemplateSectionToc } from '@/features/pm-templates/components/PMTemplateSectionToc';
import { SectionItemsList } from '@/features/organization/components/SectionItemsList';
import { SECTION_VIRTUALIZATION_THRESHOLD } from '@/features/organization/components/checklistTemplateEditorUtils';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import type { useAutoSave } from '@/hooks/useAutoSave';

type TriggerAutoSave = ReturnType<typeof useAutoSave>['triggerAutoSave'];

type ChecklistTemplateSectionsProps = {
  isPageLayout: boolean;
  sections: string[];
  groupedItems: Record<string, PMChecklistItem[]>;
  tocSections: Array<{ name: string; count: number }>;
  previewMode: boolean;
  expanded: string[];
  focusSectionMode: boolean;
  visibleSections: string[];
  newItemIdRef: React.MutableRefObject<string | null>;
  addingSectionInline: boolean;
  inlineSectionName: string;
  inlineSectionRef: React.RefObject<HTMLInputElement | null>;
  onInlineSectionNameChange: (value: string) => void;
  onConfirmInlineAddSection: () => void;
  onCancelInlineAddSection: () => void;
  onTocSectionClick: (sectionName: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onAccordionChange: (value: string[]) => void;
  onOpenRenameSection: (section: string) => void;
  onOpenDeleteSection: (section: string) => void;
  onAddItem: (section: string) => void;
  onAddItemBelow: (itemId: string) => void;
  onUpdateItem: (itemId: string, updates: Partial<PMChecklistItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onMoveItemToSectionEdge: (itemId: string, edge: 'top' | 'bottom') => void;
  onReorderItems: (activeId: string, overId: string) => void;
  onDuplicateItem: (itemId: string) => void;
  onMoveItemToSection: (itemId: string, targetSection: string) => void;
  triggerAutoSave: TriggerAutoSave;
  toolbar: React.ReactNode;
};

export function ChecklistTemplateSections({
  isPageLayout,
  sections,
  groupedItems,
  tocSections,
  previewMode,
  expanded,
  focusSectionMode,
  visibleSections,
  newItemIdRef,
  addingSectionInline,
  inlineSectionName,
  inlineSectionRef,
  onInlineSectionNameChange,
  onConfirmInlineAddSection,
  onCancelInlineAddSection,
  onTocSectionClick,
  onExpandAll,
  onCollapseAll,
  onAccordionChange,
  onOpenRenameSection,
  onOpenDeleteSection,
  onAddItem,
  onAddItemBelow,
  onUpdateItem,
  onDeleteItem,
  onMoveItemToSectionEdge,
  onReorderItems,
  onDuplicateItem,
  onMoveItemToSection,
  triggerAutoSave,
  toolbar,
}: ChecklistTemplateSectionsProps) {
  return (
    <>
      {!isPageLayout && toolbar}

      {addingSectionInline && (
        <div className="flex items-center gap-2 mb-4 p-3 border rounded-lg bg-muted/50">
          <Input
            ref={inlineSectionRef}
            value={inlineSectionName}
            onChange={(e) => onInlineSectionNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirmInlineAddSection();
              if (e.key === 'Escape') onCancelInlineAddSection();
            }}
            placeholder="New section name"
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={onConfirmInlineAddSection}
            disabled={!inlineSectionName.trim() || sections.includes(inlineSectionName.trim())}
          >
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancelInlineAddSection}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {sections.length > 0 && (
        <div className="lg:hidden mb-4">
          <Select
            onValueChange={(v) => {
              onTocSectionClick(v);
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
            onSectionClick={onTocSectionClick}
            showExpandCollapse={!focusSectionMode}
            onExpandAll={onExpandAll}
            onCollapseAll={onCollapseAll}
            expandedCount={expanded.length}
          />
        </div>

        <div className="lg:col-span-9 space-y-4">
          {sections.length === 0 ? (
            <Card className="p-6 text-center">
              <div className="text-muted-foreground">No sections yet. Add a section to get started.</div>
            </Card>
          ) : (
            <Accordion type="multiple" value={expanded} onValueChange={(v) => onAccordionChange(v as string[])}>
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
                            onAddItem(section);
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
                            onClick={() => onOpenRenameSection(section)}
                            aria-label={`Rename section ${section}`}
                          >
                            Rename
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                            onClick={() => onOpenDeleteSection(section)}
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
                        onCommit={onUpdateItem}
                        onDuplicate={onDuplicateItem}
                        onMoveToSection={onMoveItemToSection}
                        onMoveToTop={(id) => onMoveItemToSectionEdge(id, 'top')}
                        onMoveToBottom={(id) => onMoveItemToSectionEdge(id, 'bottom')}
                        onReorderItems={onReorderItems}
                        onDelete={onDeleteItem}
                        onAddBelow={onAddItemBelow}
                        triggerAutoSave={triggerAutoSave}
                      />

                      {!previewMode && sectionItems.length <= SECTION_VIRTUALIZATION_THRESHOLD && (
                        <Button variant="outline" onClick={() => onAddItem(section)} className="w-full mt-2">
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
}
