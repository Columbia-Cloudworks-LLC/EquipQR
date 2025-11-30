/**
 * @deprecated This file is deprecated. Import from canonical services instead:
 * - Types: import from '@/types/equipmentNotes'
 * - Functions: import from '@/services/equipmentNotesService'
 * 
 * This file re-exports from the canonical locations for backward compatibility.
 */

// Re-export types from canonical location
export type { EquipmentNote as OptimizedEquipmentNote } from '@/types/equipmentNotes';

// Re-export functions from canonical service
export {
  getEquipmentNotesOptimized,
  getUserEquipmentNotes,
  getRecentOrganizationNotes
} from './equipmentNotesService';