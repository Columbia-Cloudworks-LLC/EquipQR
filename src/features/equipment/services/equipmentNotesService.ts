import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { validateStorageQuota } from '@/utils/storageQuota';
import { requireAuthUserIdFromClaims } from '@/lib/authClaims';
import {
  uploadImageToStorage,
  resolveImageDisplayUrl,
  normalizeStoredObjectPath,
  displayUrlForStoredPrivateImage,
  deleteImageFromStorage,
  batchResolveEquipmentNoteImageDisplayUrls,
  extractEquipmentDisplayImagePath,
} from '@/services/imageUploadService';
import type { EquipmentNote, EquipmentNoteImage } from '@/features/equipment/types/equipmentNotes';

// Re-export types for backward compatibility
export type { EquipmentNote, EquipmentNoteImage };

/**
 * @deprecated Use EquipmentNote from @/types/equipmentNotes instead
 */
export type OptimizedEquipmentNote = EquipmentNote;

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

// Legacy function for backward compatibility
export const getEquipmentNotes = async (equipmentId: string) => {
  return getEquipmentNotesWithImages(equipmentId);
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

  const { data: equipmentRow, error: equipmentLookupError } = await supabase
    .from('equipment')
    .select('organization_id')
    .eq('id', equipmentId)
    .single();

  if (equipmentLookupError) throw equipmentLookupError;

  if (equipmentRow.organization_id !== organizationId) {
    throw new Error('Organization mismatch for equipment note creation');
  }

  const totalFileSize = images.reduce((sum, file) => sum + file.size, 0);
  await validateStorageQuota(equipmentRow.organization_id, totalFileSize);

  // Create the note first
  const { data: note, error: noteError } = await supabase
    .from('equipment_notes')
    .insert({
      equipment_id: equipmentId,
      author_id: userId,
      content,
      hours_worked: Number(hoursWorked) || 0,
      is_private: isPrivate || false,
      // Only include machine_hours when the user provided a meaningful value.
      // See workOrderNotesService for the rationale (issue #735).
      ...(Number.isFinite(Number(machineHours)) && Number(machineHours) > 0
        ? { machine_hours: Number(machineHours) }
        : {}),
    })
    .select()
    .single();

  if (noteError) throw noteError;

  // Upload images if provided — collect DB records first, then batch-sign
  type InsertedRecord = { record: EquipmentNoteImage; storedPath: string };
  const insertedRecords: InsertedRecord[] = [];
  for (const file of images) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${equipmentId}/${note.id}/${Date.now()}.${fileExt}`;
      const storedPath = await uploadImageToStorage('equipment-note-images', fileName, file);

      // Save image record to database
      const { data: imageRecord, error: imageError } = await supabase
        .from('equipment_note_images')
        .insert({
          equipment_note_id: note.id,
          file_name: file.name,
          file_url: storedPath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: userId
        })
        .select()
        .single();

      if (imageError) {
        logger.error('Failed to save image record:', imageError);
        try {
          await deleteImageFromStorage('equipment-note-images', storedPath);
        } catch (cleanupError) {
          logger.error('Failed to delete orphaned equipment note image after DB insert failure:', cleanupError);
        }
        continue;
      }

      insertedRecords.push({ record: imageRecord as unknown as EquipmentNoteImage, storedPath });
    } catch (error) {
      logger.error('Error processing image:', error);
    }
  }

  // Batch-sign all successfully inserted records in one round-trip
  const signedBatch = insertedRecords.length > 0
    ? await batchResolveEquipmentNoteImageDisplayUrls(insertedRecords.map(r => r.record.file_url))
    : [];

  const uploadedImages: EquipmentNoteImage[] = [];
  for (let i = 0; i < insertedRecords.length; i++) {
    const { record, storedPath } = insertedRecords[i];
    const displayUrl = displayUrlForStoredPrivateImage(signedBatch[i] ?? null, record.file_url);
    if (displayUrl != null) {
      uploadedImages.push({ ...record, file_url: displayUrl });
    } else {
      // Signing failed — clean up DB row and storage to avoid orphaned resources.
      // DB delete must succeed before storage delete; otherwise the DB row still
      // exists and would point at a missing storage object, creating broken state.
      logger.error('Signing failed for uploaded image, rolling back:', record.file_url);
      const { error: dbDeleteError } = await supabase
        .from('equipment_note_images')
        .delete()
        .eq('id', record.id);
      if (dbDeleteError) {
        logger.error(
          'Failed to delete DB row during signing-failure rollback; skipping storage cleanup to preserve consistency:',
          { imageId: record.id, error: dbDeleteError }
        );
      } else {
        try {
          await deleteImageFromStorage('equipment-note-images', storedPath);
        } catch (cleanupError) {
          logger.error('Failed to delete orphaned storage object during rollback:', cleanupError);
        }
      }
    }
  }

  return {
    ...note,
    images: uploadedImages
  };
};

// Legacy function for backward compatibility
export const createEquipmentNote = async (data: {
  equipmentId: string;
  organizationId: string;
  content: string;
  hoursWorked?: number;
  isPrivate?: boolean;
  machineHours?: number;
}) => {
  return createEquipmentNoteWithImages(
    data.equipmentId,
    data.content,
    data.hoursWorked || 0,
    data.isPrivate || false,
    [],
    data.organizationId,
    data.machineHours,
  );
};

// Update note
export const updateEquipmentNote = async (noteId: string, data: {
  content?: string;
  hoursWorked?: number;
  isPrivate?: boolean;
}) => {
  const { data: updatedNote, error } = await supabase
    .from('equipment_notes')
    .update(data)
    .eq('id', noteId)
    .select()
    .single();

  if (error) throw error;
  return updatedNote;
};

// Delete note
export const deleteEquipmentNote = async (noteId: string) => {
  const { error } = await supabase
    .from('equipment_notes')
    .delete()
    .eq('id', noteId);

  if (error) throw error;
};

// Upload image to existing note
export const uploadEquipmentNoteImage = async (
  noteId: string,
  file: File,
  description?: string
) => {
  const userId = await requireAuthUserIdFromClaims();

  // Get note details for file path
  const { data: note } = await supabase
    .from('equipment_notes')
    .select('equipment_id')
    .eq('id', noteId)
    .single();

  if (!note) throw new Error('Note not found');

  // Upload file to storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${note.equipment_id}/${noteId}/${Date.now()}.${fileExt}`;
  const storedPath = await uploadImageToStorage('equipment-note-images', fileName, file);

  // Save image record to database
  const { data: imageRecord, error: imageError } = await supabase
    .from('equipment_note_images')
    .insert({
      equipment_note_id: noteId,
      file_name: file.name,
      file_url: storedPath,
      file_size: file.size,
      mime_type: file.type,
      description,
      uploaded_by: userId
    })
    .select()
    .single();

  if (imageError) {
    logger.error('Failed to save equipment note image record:', imageError);
    try {
      await deleteImageFromStorage('equipment-note-images', storedPath);
    } catch (cleanupError) {
      logger.error(
        'Failed to delete orphaned equipment note image after DB insert failure:',
        cleanupError,
      );
    }
    throw imageError;
  }

  const displayUrl = displayUrlForStoredPrivateImage(
    await resolveImageDisplayUrl('equipment-note-images', imageRecord.file_url),
    imageRecord.file_url,
  );

  if (displayUrl == null) {
    const cleanupCtx = { imageId: imageRecord.id, storedPath };
    // Signing failed — clean up DB row and storage to avoid orphaned resources.
    // DB delete must succeed before storage delete; otherwise the DB row still
    // exists and would point at a missing storage object, creating broken state.
    logger.error('Signing failed for uploaded equipment note image, rolling back', cleanupCtx);
    const { error: dbDeleteError } = await supabase
      .from('equipment_note_images')
      .delete()
      .eq('id', imageRecord.id);
    if (dbDeleteError) {
      logger.error(
        'Failed to delete DB row during signing-failure rollback; skipping storage cleanup to preserve consistency',
        { ...cleanupCtx, error: dbDeleteError },
      );
    } else {
      try {
        await deleteImageFromStorage('equipment-note-images', storedPath);
      } catch (cleanupError) {
        logger.error(
          'Failed to delete orphaned equipment note storage object during rollback',
          { ...cleanupCtx, error: cleanupError },
        );
      }
    }
    throw new Error('Could not generate a secure link for the uploaded image. Try again.');
  }

  return {
    ...imageRecord,
    file_url: displayUrl,
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

// Delete an image
export const deleteEquipmentNoteImage = async (imageId: string): Promise<void> => {
  const userId = await requireAuthUserIdFromClaims();

  // Get image details first
  const { data: image, error: fetchError } = await supabase
    .from('equipment_note_images')
    .select('file_url, uploaded_by')
    .eq('id', imageId)
    .single();

  if (fetchError) throw fetchError;
  if (!image) throw new Error('Image not found');

  // Check if user can delete (must be uploader or admin)
  if (image.uploaded_by !== userId) {
    throw new Error('Not authorized to delete this image');
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('equipment_note_images')
    .delete()
    .eq('id', imageId);

  if (deleteError) throw deleteError;

  const filePath = normalizeStoredObjectPath(image.file_url, 'equipment-note-images');
  if (filePath) {
    await supabase.storage.from('equipment-note-images').remove([filePath]);
  }
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

// Legacy function name
export const setEquipmentDisplayImage = updateEquipmentDisplayImage;

// ============================================
// Optimized Query Functions (merged from optimizedEquipmentNotesService)
// ============================================

/**
 * Get equipment notes using idx_equipment_notes_equipment_created
 * Optimized version without images for faster loading
 */
export const getEquipmentNotesOptimized = async (equipmentId: string): Promise<EquipmentNote[]> => {
  try {
    const { data, error } = await supabase
      .from('equipment_notes')
      .select(`
        *,
        profiles!equipment_notes_author_id_fkey (
          name
        )
      `)
      .eq('equipment_id', equipmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(note => ({
      id: note.id,
      content: note.content,
      equipment_id: note.equipment_id,
      author_id: note.author_id,
      author_name: note.profiles?.name,
      authorName: note.profiles?.name,
      is_private: note.is_private,
      hours_worked: note.hours_worked || 0,
      created_at: note.created_at,
      updated_at: note.updated_at,
      last_modified_at: note.last_modified_at,
      last_modified_by: note.last_modified_by
    }));
  } catch (error) {
    logger.error('Error fetching equipment notes:', error);
    return [];
  }
};

/**
 * Get user's private notes using idx_equipment_notes_equipment_author
 */
export const getUserEquipmentNotes = async (equipmentId: string, userId: string): Promise<EquipmentNote[]> => {
  try {
    const { data, error } = await supabase
      .from('equipment_notes')
      .select(`
        *,
        profiles!equipment_notes_author_id_fkey (
          name
        )
      `)
      .eq('equipment_id', equipmentId)
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(note => ({
      id: note.id,
      content: note.content,
      equipment_id: note.equipment_id,
      author_id: note.author_id,
      author_name: note.profiles?.name,
      authorName: note.profiles?.name,
      is_private: note.is_private,
      hours_worked: note.hours_worked || 0,
      created_at: note.created_at,
      updated_at: note.updated_at,
      last_modified_at: note.last_modified_at,
      last_modified_by: note.last_modified_by
    }));
  } catch (error) {
    logger.error('Error fetching user equipment notes:', error);
    return [];
  }
};

/**
 * Get recent notes across organization using equipment organization index
 */
export const getRecentOrganizationNotes = async (organizationId: string, limit: number = 50): Promise<EquipmentNote[]> => {
  try {
    const { data, error } = await supabase
      .from('equipment_notes')
      .select(`
        *,
        profiles!equipment_notes_author_id_fkey (
          name
        ),
        equipment!inner (
          id,
          name,
          organization_id
        )
      `)
      .eq('equipment.organization_id', organizationId)
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(note => ({
      id: note.id,
      content: note.content,
      equipment_id: note.equipment_id,
      author_id: note.author_id,
      author_name: note.profiles?.name,
      authorName: note.profiles?.name,
      is_private: note.is_private,
      hours_worked: note.hours_worked || 0,
      created_at: note.created_at,
      updated_at: note.updated_at,
      last_modified_at: note.last_modified_at,
      last_modified_by: note.last_modified_by
    }));
  } catch (error) {
    logger.error('Error fetching recent organization notes:', error);
    return [];
  }
};
