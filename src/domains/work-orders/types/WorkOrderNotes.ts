/**
 * Work Order Notes domain types
 * Extends BaseNote pattern for work order specific functionality
 */

import { BaseNote, BaseImage } from '@/shared/types/common';

/**
 * Work Order Note entity
 */
export interface WorkOrderNote extends BaseNote {
  work_order_id: string;
  images?: WorkOrderNoteImage[];
}

/**
 * Work Order Note Image entity
 */
export interface WorkOrderNoteImage extends BaseImage {
  work_order_id: string;
  note_id?: string;
}

/**
 * Work Order Note creation data
 */
export interface CreateWorkOrderNoteData {
  work_order_id: string;
  content: string;
  is_private: boolean;
  hours_worked: number;
  author_id: string;
}

/**
 * Work Order Note update data
 */
export interface UpdateWorkOrderNoteData {
  content?: string;
  is_private?: boolean;
  hours_worked?: number;
}

/**
 * Work Order Note Image creation data
 */
export interface CreateWorkOrderNoteImageData {
  work_order_id: string;
  note_id?: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  uploaded_by: string;
}

/**
 * Work Order Note filters
 */
export interface WorkOrderNoteFilters {
  work_order_id?: string;
  author_id?: string;
  is_private?: boolean;
  date_range?: {
    start: string;
    end: string;
  };
  search?: string;
  has_images?: boolean;
}

/**
 * Work Order Note statistics
 */
export interface WorkOrderNoteStats {
  total_notes: number;
  total_hours: number;
  private_notes: number;
  public_notes: number;
  notes_with_images: number;
  by_author: Array<{
    author_id: string;
    author_name: string;
    note_count: number;
    total_hours: number;
  }>;
}

/**
 * Work Order Note search result
 */
export interface WorkOrderNoteSearchResult extends WorkOrderNote {
  work_order_title?: string;
  equipment_name?: string;
  relevance_score?: number;
}

/**
 * PM Checklist Item (for work orders with PM templates)
 */
export interface PMChecklistItem {
  id: string;
  work_order_id: string;
  pm_template_id: string;
  item_name: string;
  description?: string;
  is_required: boolean;
  is_completed: boolean;
  completed_by?: string;
  completed_at?: string;
  notes?: string;
  order_index: number;
}

/**
 * PM Checklist completion data
 */
export interface PMChecklistCompletionData {
  work_order_id: string;
  checklist_items: Array<{
    item_id: string;
    is_completed: boolean;
    notes?: string;
    completed_by: string;
  }>;
}
