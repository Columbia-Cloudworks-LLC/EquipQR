import type { EquipmentNote } from '@/features/equipment/types/equipmentNotes';

type EquipmentNoteProfileRow = {
  id: string;
  content: string;
  equipment_id: string;
  author_id: string;
  is_private: boolean;
  hours_worked: number | null;
  created_at: string;
  updated_at: string;
  last_modified_at: string | null;
  last_modified_by: string | null;
  profiles?: { name?: string | null } | null;
};

export function mapEquipmentNoteRows(
  rows: EquipmentNoteProfileRow[] | null | undefined,
): EquipmentNote[] {
  return (rows ?? []).map((note) => ({
    id: note.id,
    content: note.content,
    equipment_id: note.equipment_id,
    author_id: note.author_id,
    author_name: note.profiles?.name ?? undefined,
    authorName: note.profiles?.name ?? undefined,
    is_private: note.is_private,
    hours_worked: note.hours_worked || 0,
    created_at: note.created_at,
    updated_at: note.updated_at,
    last_modified_at: note.last_modified_at ?? undefined,
    last_modified_by: note.last_modified_by ?? undefined,
  }));
}
