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
  /** Equipment meter hours recorded with this note, when provided */
  machine_hours?: number | null;
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
