// fallow-ignore-file code-duplication
// Duplication rationale: Large PM template editor mirrors read-only PMTemplateView layout by design
import React, { forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Save, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useChecklistTemplateEditorState } from '@/features/organization/hooks/useChecklistTemplateEditorState';
import { ChecklistTemplateSettingsFields } from '@/features/organization/components/ChecklistTemplateSettingsFields';
import { ChecklistTemplateToolbar } from '@/features/organization/components/ChecklistTemplateToolbar';
import { ChecklistTemplateSections } from '@/features/organization/components/ChecklistTemplateSections';
import { ChecklistTemplateSectionDialogs } from '@/features/organization/components/ChecklistTemplateSectionDialogs';
import { ChecklistTemplateCompatibilityRulesPanel } from '@/features/organization/components/ChecklistTemplateCompatibilityRulesPanel';
import type {
  ChecklistTemplateEditorHandle,
  ChecklistTemplateEditorLayoutMode,
  ChecklistTemplateEditorTemplate,
} from '@/features/organization/components/checklistTemplateEditorTypes';

export type { ChecklistTemplateEditorHandle, ChecklistTemplateEditorLayoutMode };

interface ChecklistTemplateEditorProps {
  template?: ChecklistTemplateEditorTemplate | null;
  onSave: (templateId?: string) => void;
  onCancel: () => void;
  layoutMode?: ChecklistTemplateEditorLayoutMode;
}

export const ChecklistTemplateEditor = forwardRef<ChecklistTemplateEditorHandle, ChecklistTemplateEditorProps>(
  function ChecklistTemplateEditor({ template, onSave, onCancel, layoutMode = 'standalone' }, ref) {
    const isPageLayout = layoutMode === 'page';
    const editor = useChecklistTemplateEditorState({ template, onSave, onCancel });

    useImperativeHandle(
      ref,
      () => ({
        save: editor.handleSave,
        requestCancel: editor.handleCancel,
        hasUnsavedChanges: () => editor.hasUnsavedChanges,
      }),
      [editor.handleSave, editor.handleCancel, editor.hasUnsavedChanges]
    );

    const {
      sectionNavigation,
      sectionManagement,
      itemMutations,
    } = editor;

    const settingsFields = (
      <ChecklistTemplateSettingsFields
        template={editor.template}
        templateName={editor.templateName}
        templateDescription={editor.templateDescription}
        intervalEnabled={editor.intervalEnabled}
        intervalValue={editor.intervalValue}
        intervalType={editor.intervalType}
        intervalError={editor.intervalError}
        autoSaveStatus={editor.autoSaveStatus}
        lastSaved={editor.lastSaved}
        onNameChange={editor.onNameChange}
        onDescriptionChange={editor.onDescriptionChange}
        onIntervalEnabledChange={editor.onIntervalEnabledChange}
        onIntervalValueChange={editor.onIntervalValueChange}
        onIntervalTypeChange={editor.onIntervalTypeChange}
      />
    );

    const toolbar = (
      <ChecklistTemplateToolbar
        isPageLayout={isPageLayout}
        sectionCount={editor.sections.length}
        totalItemCount={editor.totalItemCount}
        previewMode={editor.previewMode}
        isLargeTemplate={editor.isLargeTemplate}
        focusSectionMode={sectionNavigation.focusSectionMode}
        onPreviewModeChange={editor.setPreviewMode}
        onExpandAll={sectionNavigation.expandAll}
        onCollapseAll={sectionNavigation.collapseAll}
        onEnableFocusSectionMode={sectionNavigation.enableFocusSectionMode}
        onOpenAddSection={sectionManagement.openAddSection}
      />
    );

    const checklistEditorContent = (
      <ChecklistTemplateSections
        isPageLayout={isPageLayout}
        sections={editor.sections}
        groupedItems={editor.groupedItems}
        tocSections={editor.tocSections}
        previewMode={editor.previewMode}
        expanded={sectionNavigation.expanded}
        focusSectionMode={sectionNavigation.focusSectionMode}
        visibleSections={sectionNavigation.visibleSections}
        newItemIdRef={editor.newItemIdRef}
        addingSectionInline={sectionManagement.addingSectionInline}
        inlineSectionName={sectionManagement.inlineSectionName}
        inlineSectionRef={sectionManagement.inlineSectionRef}
        onInlineSectionNameChange={sectionManagement.setInlineSectionName}
        onConfirmInlineAddSection={sectionManagement.confirmInlineAddSection}
        onCancelInlineAddSection={sectionManagement.cancelInlineAddSection}
        onTocSectionClick={sectionNavigation.handleTocSectionClick}
        onExpandAll={sectionNavigation.expandAll}
        onCollapseAll={sectionNavigation.collapseAll}
        onAccordionChange={sectionNavigation.handleAccordionChange}
        onOpenRenameSection={sectionManagement.openRenameSection}
        onOpenDeleteSection={sectionManagement.openDeleteSection}
        onAddItem={itemMutations.addItem}
        onAddItemBelow={itemMutations.addItemBelow}
        onUpdateItem={itemMutations.updateItem}
        onDeleteItem={itemMutations.deleteItem}
        onMoveItemToSectionEdge={itemMutations.moveItemToSectionEdge}
        onReorderItems={itemMutations.reorderItems}
        onDuplicateItem={itemMutations.duplicateItem}
        onMoveItemToSection={itemMutations.moveItemToSection}
        triggerAutoSave={editor.triggerAutoSave}
        toolbar={toolbar}
      />
    );

    const deleteTargetItemCount =
      sectionManagement.deleteTarget != null
        ? editor.groupedItems[sectionManagement.deleteTarget]?.length || 0
        : 0;

    return (
      <div className="space-y-6">
        {isPageLayout ? (
          <Collapsible open={editor.settingsOpen} onOpenChange={editor.setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>Template settings</span>
                {editor.settingsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">{settingsFields}</CollapsibleContent>
          </Collapsible>
        ) : (
          settingsFields
        )}

        {isPageLayout && toolbar}

        {template?.id ? (
          <Tabs defaultValue="checklist" className="space-y-4">
            <TabsList>
              <TabsTrigger value="checklist">Checklist Items</TabsTrigger>
              <TabsTrigger value="compatibility">Compatibility Rules</TabsTrigger>
            </TabsList>
            <TabsContent value="checklist" className="space-y-4">
              {checklistEditorContent}
            </TabsContent>
            <TabsContent value="compatibility">
              <ChecklistTemplateCompatibilityRulesPanel
                isLoadingRules={editor.isLoadingRules}
                editedRules={editor.editedRules}
                hasRulesChanges={editor.hasRulesChanges}
                isSavingRules={editor.bulkSetRules.isPending}
                onRulesChange={editor.handleRulesChange}
                onSaveRules={() => void editor.handleSaveRules()}
              />
            </TabsContent>
          </Tabs>
        ) : (
          checklistEditorContent
        )}

        {!isPageLayout && (
          <div className="flex justify-end gap-2 pt-4 border-t pb-20 md:pb-0">
            <Button variant="outline" onClick={editor.handleCancel} disabled={editor.isLoading}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={() => void editor.handleSave()} disabled={editor.isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {template ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        )}

        <ChecklistTemplateSectionDialogs
          renameDialogOpen={sectionManagement.renameDialogOpen}
          onRenameDialogOpenChange={sectionManagement.setRenameDialogOpen}
          renameOriginal={sectionManagement.renameOriginal}
          renameInput={sectionManagement.renameInput}
          onRenameInputChange={sectionManagement.setRenameInput}
          onConfirmRename={sectionManagement.confirmRenameSection}
          deleteDialogOpen={sectionManagement.deleteDialogOpen}
          onDeleteDialogOpenChange={sectionManagement.setDeleteDialogOpen}
          deleteTarget={sectionManagement.deleteTarget}
          deleteTargetItemCount={deleteTargetItemCount}
          onConfirmDelete={sectionManagement.confirmDeleteSection}
        />
      </div>
    );
  }
);

ChecklistTemplateEditor.displayName = 'ChecklistTemplateEditor';
