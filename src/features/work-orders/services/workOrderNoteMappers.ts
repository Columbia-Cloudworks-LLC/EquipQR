import type { Tables } from '@/integrations/supabase/types';
import type {
  WorkOrderNote,
  WorkOrderNoteImage,
  WorkOrderNoteListItem,
} from '@/features/work-orders/services/workOrderNotesService';

type WorkOrderNoteRow = Tables<'work_order_notes'>;

type MapWorkOrderNoteExtras = {
  authorIdFallback?: string;
  author_name?: string;
  images?: WorkOrderNoteImage[];
};

export function mapWorkOrderNoteRow(
  note: WorkOrderNoteRow,
  extras: MapWorkOrderNoteExtras & { author_name: string },
): WorkOrderNoteListItem;
export function mapWorkOrderNoteRow(
  note: WorkOrderNoteRow,
  extras?: MapWorkOrderNoteExtras,
): WorkOrderNote;
export function mapWorkOrderNoteRow(
  note: WorkOrderNoteRow,
  extras: MapWorkOrderNoteExtras = {},
): WorkOrderNote {
  return {
    id: note.id,
    work_order_id: note.work_order_id,
    author_id: note.author_id ?? extras.authorIdFallback ?? '',
    content: note.content,
    hours_worked: Number(note.hours_worked) || 0,
    machine_hours: note.machine_hours != null ? Number(note.machine_hours) : null,
    is_private: note.is_private,
    created_at: note.created_at,
    updated_at: note.updated_at,
    author_name: extras.author_name ?? note.author_name ?? undefined,
    images: extras.images,
  };
}
