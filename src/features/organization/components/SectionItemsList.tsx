import React, { useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { List, type RowComponentProps } from 'react-window';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import type { ChecklistItemRowCallbacks } from '@/features/organization/components/checklistItemRowCallbacks';
import { ChecklistItemRow } from '@/features/organization/components/ChecklistItemRow';
import {
  COMPACT_ROW_HEIGHT,
  SECTION_VIRTUALIZATION_THRESHOLD,
} from './checklistTemplateEditorUtils';

type SaveTrigger = 'text' | 'selection' | 'manual';

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

export interface SectionItemsListProps {
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

export function SectionItemsList({
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
