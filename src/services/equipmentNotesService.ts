
import { supabase } from '@/integrations/supabase/client';

export interface EquipmentNote {
  id: string;
  equipment_id: string;
  author_id: string;
  content: string;
  hours_worked: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
  images?: EquipmentNoteImage[];
}

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
  uploaded_by_name?: string;
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

  return (data || []).map(note => ({
    ...note,
    author_name: (note.profiles as { name?: string } | null | undefined)?.name || 'Unknown',
    images: (note.equipment_note_images || []).map((img: EquipmentNoteImage & { profiles?: { name?: string } }) => ({
      ...img,
      uploaded_by_name: img.profiles?.name || 'Unknown'
    }))
  }));
};

// Legacy function for backward compatibility
export const getEquipmentNotes = async (equipmentId: string, organizationId: string) => {
  return getEquipmentNotesWithImages(equipmentId);
};

// Create a note with images
export const createEquipmentNoteWithImages = async (
  equipmentId: string,
  content: string,
  hoursWorked: number = 0,
  isPrivate: boolean = false,
  images: File[] = []
): Promise<EquipmentNote> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  // Create the note first
  const { data: note, error: noteError } = await supabase
    .from('equipment_notes')
    .insert({
      equipment_id: equipmentId,
      author_id: userData.user.id,
      content,
      hours_worked: hoursWorked,
      is_private: isPrivate
    })
    .select()
    .single();

  if (noteError) throw noteError;

  // Upload images if provided
  const uploadedImages: EquipmentNoteImage[] = [];
  for (const file of images) {
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.user.id}/${equipmentId}/${note.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('equipment-note-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Failed to upload image:', uploadError);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('equipment-note-images')
        .getPublicUrl(uploadData.path);

      // Save image record to database
      const { data: imageRecord, error: imageError } = await supabase
        .from('equipment_note_images')
        .insert({
          equipment_note_id: note.id,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: userData.user.id
        })
        .select()
        .single();

      if (imageError) {
        console.error('Failed to save image record:', imageError);
        continue;
      }

      uploadedImages.push(imageRecord);
    } catch (error) {
      console.error('Error processing image:', error);
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
  content: string;
  hoursWorked?: number;
  isPrivate?: boolean;
}) => {
  return createEquipmentNoteWithImages(
    data.equipmentId,
    data.content,
    data.hoursWorked || 0,
    data.isPrivate || false,
    []
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
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  // Get note details for file path
  const { data: note } = await supabase
    .from('equipment_notes')
    .select('equipment_id')
    .eq('id', noteId)
    .single();

  if (!note) throw new Error('Note not found');

  // Upload file to storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${userData.user.id}/${note.equipment_id}/${noteId}/${Date.now()}.${fileExt}`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('equipment-note-images')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('equipment-note-images')
    .getPublicUrl(uploadData.path);

  // Save image record to database
  const { data: imageRecord, error: imageError } = await supabase
    .from('equipment_note_images')
    .insert({
      equipment_note_id: noteId,
      file_name: file.name,
      file_url: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      description,
      uploaded_by: userData.user.id
    })
    .select()
    .single();

  if (imageError) throw imageError;
  return imageRecord;
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

  return (data || []).map(image => ({
    ...image,
    uploaded_by_name: (image.profiles as { name?: string } | null | undefined)?.name || 'Unknown',
    note_content: (image.equipment_notes as { content?: string } | null | undefined)?.content,
    note_author_name: (image.equipment_notes as { profiles?: { name?: string } } | null | undefined)?.profiles?.name || 'Unknown',
    is_private_note: (image.equipment_notes as { is_private?: boolean } | null | undefined)?.is_private
  }));
};

// Delete an image
export const deleteEquipmentNoteImage = async (imageId: string): Promise<void> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  // Get image details first
  const { data: image, error: fetchError } = await supabase
    .from('equipment_note_images')
    .select('file_url, uploaded_by')
    .eq('id', imageId)
    .single();

  if (fetchError) throw fetchError;
  if (!image) throw new Error('Image not found');

  // Check if user can delete (must be uploader or admin)
  if (image.uploaded_by !== userData.user.id) {
    throw new Error('Not authorized to delete this image');
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('equipment_note_images')
    .delete()
    .eq('id', imageId);

  if (deleteError) throw deleteError;

  // Delete from storage
  const filePath = image.file_url.split('/').slice(-4).join('/'); // Extract path from URL
  await supabase.storage
    .from('equipment-note-images')
    .remove([filePath]);
};

// Update equipment display image
export const updateEquipmentDisplayImage = async (equipmentId: string, imageUrl: string): Promise<void> => {
  const { error } = await supabase
    .from('equipment')
    .update({ image_url: imageUrl || null })
    .eq('id', equipmentId);

  if (error) throw error;
};

// Legacy function name
export const setEquipmentDisplayImage = updateEquipmentDisplayImage;
