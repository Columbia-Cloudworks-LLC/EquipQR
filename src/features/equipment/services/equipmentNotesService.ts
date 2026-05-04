import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { validateStorageQuota } from '@/utils/storageQuota';
import { requireAuthUserIdFromClaims } from '@/lib/authClaims';
import {
  uploadImageToStorage,
  resolveImageDisplayUrl,
  normalizeStoredObjectPath,
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

  return Promise.all(
    (data || []).map(async note => ({
      ...note,
      hours_worked: Number(note.hours_worked) || 0,
      machine_hours: note.machine_hours != null ? Number(note.machine_hours) : null,
      author_name: (note.profiles as { name?: string } | null | undefined)?.name || 'Unknown',
      images: await Promise.all(
        (note.equipment_note_images || []).map(
          async (img: EquipmentNoteImage & { profiles?: { name?: string } }) => ({
            ...img,
            uploaded_by_name: img.profiles?.name || 'Unknown',
            file_url:
              (await resolveImageDisplayUrl('equipment-note-images', img.file_url)) ?? img.file_url,
          })
        )
      ),
    }))
  );
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
      ...(machineHours !== undefined ? { machine_hours: machineHours } : {}),
    })
    .select()
    .single();

  if (noteError) throw noteError;

  // Upload images if provided
  const uploadedImages: EquipmentNoteImage[] = [];
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
        continue;
      }

      uploadedImages.push({
        ...imageRecord,
        file_url:
          (await resolveImageDisplayUrl('equipment-note-images', imageRecord.file_url)) ??
          imageRecord.file_url,
      });
    } catch (error) {
      logger.error('Error processing image:', error);
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

  if (imageError) throw imageError;
  return {
    ...imageRecord,
    file_url:
      (await resolveImageDisplayUrl('equipment-note-images', imageRecord.file_url)) ??
      imageRecord.file_url,
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

  return Promise.all(
    (data || []).map(async image => ({
      ...image,
      file_url:
        (await resolveImageDisplayUrl('equipment-note-images', image.file_url)) ?? image.file_url,
      uploaded_by_name: (image.profiles as { name?: string } | null | undefined)?.name || 'Unknown',
      note_content: (image.equipment_notes as { content?: string } | null | undefined)?.content,
      note_author_name:
        (image.equipment_notes as { profiles?: { name?: string } } | null | undefined)?.profiles
          ?.name || 'Unknown',
      is_private_note: (image.equipment_notes as { is_private?: boolean } | null | undefined)
        ?.is_private,
    }))
  );
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
export const updateEquipmentDisplayImage = async (equipmentId: string, imageUrl: string): Promise<void> => {
  const canonical =
    normalizeStoredObjectPath(imageUrl, 'work-order-images') ??
    normalizeStoredObjectPath(imageUrl, 'equipment-note-images') ??
    imageUrl;

  const { error } = await supabase
    .from('equipment')
    .update({ image_url: canonical || null })
    .eq('id', equipmentId);

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
