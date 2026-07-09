import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { validateStorageQuota } from '@/utils/storageQuota';
import { requireAuthUserIdFromClaims } from '@/lib/authClaims';
import {
  displayUrlForStoredPrivateImage,
  deleteImageFromStorage,
  batchResolveEquipmentNoteImageDisplayUrls,
  extractEquipmentDisplayImagePath,
} from '@/services/imageUploadService';
import type { EquipmentNote, EquipmentNoteImage } from '@/features/equipment/types/equipmentNotes';
import { noteMachineHoursInsertFields } from '@/services/noteMachineHoursInsert';
import {
  deleteEquipmentNoteImageAuditedRpc,
  deleteEquipmentNoteRpc,
  updateEquipmentNoteRpc,
} from '@/services/noteMutationRpc';
import { uploadFilesToNoteImageBucket } from '@/services/noteImageUploadShared';

async function validateEquipmentNoteImageQuota(
  equipmentId: string,
  organizationId: string,
  images: File[],
): Promise<void> {
  const { data: equipmentRow, error: equipmentLookupError } = await supabase
    .from('equipment')
    .select('organization_id')
    .eq('id', equipmentId)
    .single();

  if (equipmentLookupError) throw equipmentLookupError;

  if (equipmentRow.organization_id !== organizationId) {
    throw new Error('Organization mismatch for equipment note');
  }

  const totalFileSize = images.reduce((sum, file) => sum + file.size, 0);
  await validateStorageQuota(equipmentRow.organization_id, totalFileSize);
}

async function uploadEquipmentNoteImages(
  equipmentId: string,
  noteId: string,
  images: File[],
  userId: string,
): Promise<EquipmentNoteImage[]> {
  return uploadFilesToNoteImageBucket<EquipmentNoteImage>({
    bucket: 'equipment-note-images',
    imagesTable: 'equipment_note_images',
    images,
    buildObjectKey: (file) => {
      const fileExt = file.name.split('.').pop();
      return `${userId}/${equipmentId}/${noteId}/${Date.now()}.${fileExt}`;
    },
    insertImageRecord: async (file, storedPath) => {
      const { data, error } = await supabase
        .from('equipment_note_images')
        .insert({
          equipment_note_id: noteId,
          file_name: file.name,
          file_url: storedPath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: userId,
        })
        .select()
        .single();
      if (error) {
        logger.error('Failed to save image record:', error);
        try {
          await deleteImageFromStorage('equipment-note-images', storedPath);
        } catch (cleanupError) {
          logger.error('Failed to delete orphaned equipment note image after DB insert failure:', cleanupError);
        }
        return null;
      }
      return data as unknown as EquipmentNoteImage;
    },
    signDisplayUrls: (paths) => batchResolveEquipmentNoteImageDisplayUrls(paths),
  });
}

// Get notes with images for equipment
export const getEquipmentNotesWithImages = async (equipmentId: string): Promise<EquipmentNote[]> => {
  const { data, error } = await supabase
    .from('equipment_notes')
    .select(`
      *,
      profiles:author_id (
        name
      ),
      equipment_note_images (
        *,
        profiles:uploaded_by (
          name
        )
      )
    `)
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const notesData = data || [];
  type NoteImg = EquipmentNoteImage & { profiles?: { name?: string } };
  const flat: Array<{ noteIdx: number; img: NoteImg }> = [];
  notesData.forEach((note, noteIdx) => {
    for (const img of note.equipment_note_images || []) {
      flat.push({ noteIdx, img: img as NoteImg });
    }
  });

  const signedBatch = await batchResolveEquipmentNoteImageDisplayUrls(flat.map(f => f.img.file_url));
  const imagesByNoteIdx = new Map<number, Array<NoteImg & { uploaded_by_name: string; file_url: string }>>();

  flat.forEach((entry, i) => {
    const url = displayUrlForStoredPrivateImage(signedBatch[i], entry.img.file_url);
    if (url == null) return;
    const row = {
      ...entry.img,
      uploaded_by_name: entry.img.profiles?.name || 'Unknown',
      file_url: url,
    };
    const list = imagesByNoteIdx.get(entry.noteIdx) ?? [];
    list.push(row);
    imagesByNoteIdx.set(entry.noteIdx, list);
  });

  return notesData.map((note, noteIdx) => ({
    ...note,
    hours_worked: Number(note.hours_worked) || 0,
    machine_hours: note.machine_hours != null ? Number(note.machine_hours) : null,
    author_name: (note.profiles as { name?: string } | null | undefined)?.name || 'Unknown',
    images: imagesByNoteIdx.get(noteIdx) ?? [],
  }));
};

// Create a note with images
export const createEquipmentNoteWithImages = async (
  equipmentId: string,
  content: string,
  hoursWorked: number = 0,
  isPrivate: boolean = false,
  images: File[] = [],
  organizationId: string,
  machineHours?: number | null,
): Promise<EquipmentNote> => {
  const userId = await requireAuthUserIdFromClaims();

  if (!organizationId) {
    throw new Error('organizationId is required to create an equipment note');
  }

  await validateEquipmentNoteImageQuota(equipmentId, organizationId, images);

  // Create the note first
  const { data: note, error: noteError } = await supabase
    .from('equipment_notes')
    .insert({
      equipment_id: equipmentId,
      author_id: userId,
      content,
      hours_worked: Number(hoursWorked) || 0,
      is_private: isPrivate || false,
      ...noteMachineHoursInsertFields(machineHours),
    })
    .select()
    .single();

  if (noteError) throw noteError;

  const uploadedImages = await uploadEquipmentNoteImages(equipmentId, note.id, images, userId);

  return {
    ...note,
    images: uploadedImages,
  };
};

// Get all images for equipment (for gallery view)
export const getEquipmentImages = async (equipmentId: string) => {
  const { data, error } = await supabase
    .from('equipment_note_images')
    .select(`
      *,
      equipment_notes!inner (
        equipment_id,
        content,
        author_id,
        is_private,
        profiles:author_id (
          name
        )
      ),
      profiles:uploaded_by (
        name
      )
    `)
    .eq('equipment_notes.equipment_id', equipmentId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = data || [];
  const signedBatch = await batchResolveEquipmentNoteImageDisplayUrls(rows.map(image => image.file_url));

  return rows
    .map((image, i) => {
      const url = displayUrlForStoredPrivateImage(signedBatch[i], image.file_url);
      if (url == null) return null;
      return {
        ...image,
        file_url: url,
        uploaded_by_name: (image.profiles as { name?: string } | null | undefined)?.name || 'Unknown',
        note_content: (image.equipment_notes as { content?: string } | null | undefined)?.content,
        note_author_name:
          (image.equipment_notes as { profiles?: { name?: string } } | null | undefined)?.profiles?.name ||
          'Unknown',
        is_private_note: (image.equipment_notes as { is_private?: boolean } | null | undefined)?.is_private,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
};

// Delete an image (audited RPC)
export const deleteEquipmentNoteImage = async (
  imageId: string,
  organizationId: string,
  equipmentId: string,
): Promise<void> => {
  await deleteEquipmentNoteImageAuditedRpc({ organizationId, equipmentId, imageId });
};

export const updateEquipmentNote = async (
  organizationId: string,
  equipmentId: string,
  noteId: string,
  updates: { content?: string; isPrivate?: boolean },
): Promise<void> => {
  await updateEquipmentNoteRpc({
    organizationId,
    equipmentId,
    noteId,
    content: updates.content,
    isPrivate: updates.isPrivate,
  });
};

export const deleteEquipmentNote = async (
  organizationId: string,
  equipmentId: string,
  noteId: string,
): Promise<void> => {
  await deleteEquipmentNoteRpc({ organizationId, equipmentId, noteId });
};

export const addImagesToEquipmentNote = async (
  equipmentId: string,
  noteId: string,
  images: File[],
  organizationId: string,
): Promise<EquipmentNoteImage[]> => {
  const userId = await requireAuthUserIdFromClaims();
  if (!organizationId) {
    throw new Error('organizationId is required');
  }

  await validateEquipmentNoteImageQuota(equipmentId, organizationId, images);

  return uploadEquipmentNoteImages(equipmentId, noteId, images, userId);
};

// Update equipment display image
export const updateEquipmentDisplayImage = async (
  organizationId: string,
  equipmentId: string,
  imageUrl: string
): Promise<void> => {
  if (!imageUrl.trim()) {
    const { error } = await supabase
      .from('equipment')
      .update({ image_url: null })
      .eq('id', equipmentId)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return;
  }

  const canonical = extractEquipmentDisplayImagePath(imageUrl);
  if (!canonical) {
    throw new Error(
      'Could not resolve that image to a durable storage path. Choose an image from work orders or equipment notes again.',
    );
  }

  const { error } = await supabase
    .from('equipment')
    .update({ image_url: canonical })
    .eq('id', equipmentId)
    .eq('organization_id', organizationId);

  if (error) throw error;
};
