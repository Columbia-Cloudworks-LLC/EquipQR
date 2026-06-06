import { useCallback } from 'react';
import { nanoid } from 'nanoid';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import {
  moveChecklistItemToSectionEdge,
  reorderChecklistItems,
} from '@/features/organization/components/checklistTemplateEditorUtils';

type UseChecklistItemMutationsArgs = {
  setChecklistItems: React.Dispatch<React.SetStateAction<PMChecklistItem[]>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  newItemIdRef: React.MutableRefObject<string | null>;
};

export function useChecklistItemMutations({
  setChecklistItems,
  setHasUnsavedChanges,
  newItemIdRef,
}: UseChecklistItemMutationsArgs) {
  const addItem = useCallback(
    (section: string) => {
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
    },
    [newItemIdRef, setChecklistItems, setHasUnsavedChanges]
  );

  const addItemBelow = useCallback(
    (itemId: string) => {
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
    },
    [newItemIdRef, setChecklistItems, setHasUnsavedChanges]
  );

  const updateItem = useCallback(
    (itemId: string, updates: Partial<PMChecklistItem>) => {
      setChecklistItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
      );
      setHasUnsavedChanges(true);
    },
    [setChecklistItems, setHasUnsavedChanges]
  );

  const deleteItem = useCallback(
    (itemId: string) => {
      setChecklistItems((prev) => prev.filter((item) => item.id !== itemId));
      setHasUnsavedChanges(true);
    },
    [setChecklistItems, setHasUnsavedChanges]
  );

  const moveItemToSectionEdge = useCallback(
    (itemId: string, edge: 'top' | 'bottom') => {
      setChecklistItems((prev) => moveChecklistItemToSectionEdge(prev, itemId, edge));
      setHasUnsavedChanges(true);
    },
    [setChecklistItems, setHasUnsavedChanges]
  );

  const reorderItems = useCallback(
    (activeId: string, overId: string) => {
      setChecklistItems((prev) => reorderChecklistItems(prev, activeId, overId));
      setHasUnsavedChanges(true);
    },
    [setChecklistItems, setHasUnsavedChanges]
  );

  const duplicateItem = useCallback(
    (itemId: string) => {
      setChecklistItems((prev) => {
        const index = prev.findIndex((i) => i.id === itemId);
        if (index === -1) return prev;
        const copy: PMChecklistItem = { ...prev[index], id: nanoid() };
        return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
      });
      setHasUnsavedChanges(true);
    },
    [setChecklistItems, setHasUnsavedChanges]
  );

  const moveItemToSection = useCallback(
    (itemId: string, targetSection: string) => {
      setChecklistItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, section: targetSection } : i))
      );
      setHasUnsavedChanges(true);
    },
    [setChecklistItems, setHasUnsavedChanges]
  );

  return {
    addItem,
    addItemBelow,
    updateItem,
    deleteItem,
    moveItemToSectionEdge,
    reorderItems,
    duplicateItem,
    moveItemToSection,
  };
}
