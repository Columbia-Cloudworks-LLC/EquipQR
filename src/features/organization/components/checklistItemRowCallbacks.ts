import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

type ChecklistSaveTrigger = 'text' | 'selection' | 'manual';

export type ChecklistItemRowCallbacks = {
  onCommit: (itemId: string, updates: Partial<PMChecklistItem>) => void;
  onDuplicate: (itemId: string) => void;
  onMoveToSection: (itemId: string, targetSection: string) => void;
  onMoveToTop: (itemId: string) => void;
  onMoveToBottom: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onAddBelow: (itemId: string) => void;
  triggerAutoSave: (trigger?: ChecklistSaveTrigger) => void;
};
