/**
 * Equipment Notes Types - Consolidated type definitions
 * 
 * This file serves as the single source of truth for equipment note types.
 * Import from here instead of defining types locally in components/hooks.
 */

// ============================================
// Core Note Types
// ============================================

/**
 * Equipment note with all fields
 * Primary type for equipment notes
 */
export interface EquipmentNote {
  id: string;
  equipment_id: string;
  content: string;
  author_id: string;
  is_private: boolean;
  hours_worked: number;
  created_at: string;
  updated_at: string;
  last_modified_by?: string;
  last_modified_at?: string;
  // Computed fields from joins
  author_name?: string;
  authorName?: string;
  lastModifiedByName?: string;
  images?: EquipmentNoteImage[];
}

/**
 * @deprecated Use EquipmentNote instead
 * Alias for backward compatibility
 */
export type OptimizedEquipmentNote = EquipmentNote;

// ============================================
// Image Types
// ============================================

export interface EquipmentNoteImage {
  id: string;
  equipment_note_id: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  uploaded_by: string;
  created_at: string;
  // Computed fields from joins
  uploaded_by_name?: string;
  uploadedByName?: string;
}

// ============================================
// Create/Update Data Types
// ============================================

export interface CreateEquipmentNoteData {
  equipmentId: string;
  content: string;
  isPrivate: boolean;
  hoursWorked?: number;
}

export interface UpdateEquipmentNoteData {
  content?: string;
  isPrivate?: boolean;
  hoursWorked?: number;
}
