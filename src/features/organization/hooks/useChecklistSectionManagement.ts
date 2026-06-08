import { useCallback, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

type UseChecklistSectionManagementArgs = {
  sections: string[];
  checklistItems: PMChecklistItem[];
  setChecklistItems: React.Dispatch<React.SetStateAction<PMChecklistItem[]>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  newItemIdRef: React.MutableRefObject<string | null>;
  expandSection: (sectionName: string) => void;
  renameSectionInNavigation: (original: string, newName: string) => void;
  removeSectionFromNavigation: (sectionName: string) => void;
};

export function useChecklistSectionManagement({
  sections,
  checklistItems,
  setChecklistItems,
  setHasUnsavedChanges,
  newItemIdRef,
  expandSection,
  renameSectionInNavigation,
  removeSectionFromNavigation,
}: UseChecklistSectionManagementArgs) {
  const [addingSectionInline, setAddingSectionInline] = useState(false);
  const [inlineSectionName, setInlineSectionName] = useState('');
  const inlineSectionRef = useRef<HTMLInputElement>(null);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameOriginal, setRenameOriginal] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const openAddSection = useCallback(() => {
    setInlineSectionName('');
    setAddingSectionInline(true);
    requestAnimationFrame(() => inlineSectionRef.current?.focus());
  }, []);

  const confirmInlineAddSection = useCallback(() => {
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
  }, [
    inlineSectionName,
    sections,
    newItemIdRef,
    setChecklistItems,
    expandSection,
    setHasUnsavedChanges,
  ]);

  const cancelInlineAddSection = useCallback(() => {
    setAddingSectionInline(false);
    setInlineSectionName('');
  }, []);

  const openRenameSection = useCallback((section: string) => {
    setRenameOriginal(section);
    setRenameInput(section);
    setRenameDialogOpen(true);
  }, []);

  const confirmRenameSection = useCallback(() => {
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
  }, [
    renameInput,
    renameOriginal,
    sections,
    checklistItems,
    setChecklistItems,
    renameSectionInNavigation,
    setHasUnsavedChanges,
  ]);

  const openDeleteSection = useCallback((section: string) => {
    setDeleteTarget(section);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDeleteSection = useCallback(() => {
    if (!deleteTarget) return;
    const updatedItems = checklistItems.filter((item) => item.section !== deleteTarget);
    setChecklistItems(updatedItems);
    removeSectionFromNavigation(deleteTarget);
    setHasUnsavedChanges(true);
    setDeleteDialogOpen(false);
  }, [
    deleteTarget,
    checklistItems,
    setChecklistItems,
    removeSectionFromNavigation,
    setHasUnsavedChanges,
  ]);

  return {
    addingSectionInline,
    inlineSectionName,
    setInlineSectionName,
    inlineSectionRef,
    renameDialogOpen,
    setRenameDialogOpen,
    renameOriginal,
    renameInput,
    setRenameInput,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteTarget,
    openAddSection,
    confirmInlineAddSection,
    cancelInlineAddSection,
    openRenameSection,
    confirmRenameSection,
    openDeleteSection,
    confirmDeleteSection,
  };
}
