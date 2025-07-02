
import { supabase } from '@/integrations/supabase/client';

export interface WorkOrderNote {
  id: string;
  work_order_id: string;
  author_id: string;
  content: string;
  hours_worked: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
  images?: WorkOrderNoteImage[];
}

export interface WorkOrderNoteImage {
  id: string;
  work_order_id: string;
  note_id?: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  uploaded_by: string;
  created_at: string;
  uploaded_by_name?: string;
}

// Create a note with images
export const createWorkOrderNoteWithImages = async (
  workOrderId: string,
  content: string,
  hoursWorked: number = 0,
  isPrivate: boolean = false,
  images: File[] = []
): Promise<WorkOrderNote> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  // Create the note first
  const { data: note, error: noteError } = await supabase
    .from('work_order_notes')
    .insert({
      work_order_id: workOrderId,
      author_id: userData.user.id,
      content,
      hours_worked: hoursWorked,
      is_private: isPrivate
    })
    .select()
    .single();

  if (noteError) throw noteError;

  // Upload images if provided
  const uploadedImages: WorkOrderNoteImage[] = [];
  for (const file of images) {
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.user.id}/${workOrderId}/${note.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('work-order-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Failed to upload image:', uploadError);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('work-order-images')
        .getPublicUrl(uploadData.path);

      // Save image record to database with proper note_id association
      const { data: imageRecord, error: imageError } = await supabase
        .from('work_order_images')
        .insert({
          work_order_id: workOrderId,
          note_id: note.id,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: userData.user.id,
          description: `Attached to note: ${note.id}`
        })
        .select()
        .single();

      if (imageError) {
        console.error('Failed to save image record:', imageError);
        continue;
      }

      uploadedImages.push({
        ...imageRecord,
        note_id: note.id
      });
    } catch (error) {
      console.error('Error processing image:', error);
    }
  }

  return {
    ...note,
    images: uploadedImages
  };
};

// Get notes with images for work order
export const getWorkOrderNotesWithImages = async (workOrderId: string) => {
  try {
    // First get notes
    const { data: notes, error: notesError } = await supabase
      .from('work_order_notes')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false });

    if (notesError) throw notesError;
    if (!notes) return [];

    // Get author names separately
    const authorIds = [...new Set(notes.map(note => note.author_id))];
    let profiles: any[] = [];
    
    if (authorIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', authorIds);
      profiles = profileData || [];
    }

    // Get all images for this work order
    const { data: allImages } = await supabase
      .from('work_order_images')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false });

    // Get uploader names for images
    const uploaderIds = [...new Set((allImages || []).map(img => img.uploaded_by))];
    let uploaderProfiles: any[] = [];
    
    if (uploaderIds.length > 0) {
      const { data: uploaderData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', uploaderIds);
      uploaderProfiles = uploaderData || [];
    }

    // Combine the data
    return notes.map(note => {
      const author = profiles.find(p => p.id === note.author_id);
      
      // Find images that belong to this note using the note_id foreign key
      const noteImages = (allImages || [])
        .filter(img => img.note_id === note.id)
        .map(img => {
          const uploader = uploaderProfiles.find(p => p.id === img.uploaded_by);
          return {
            ...img,
            uploaded_by_name: uploader?.name || 'Unknown'
          };
        });

      return {
        ...note,
        author_name: author?.name || 'Unknown',
        images: noteImages
      };
    });
  } catch (error) {
    console.error('Error fetching work order notes:', error);
    return [];
  }
};

// Get all images for work order (for gallery view)
export const getWorkOrderImages = async (workOrderId: string) => {
  try {
    // Get images
    const { data: images, error: imagesError } = await supabase
      .from('work_order_images')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false });

    if (imagesError) throw imagesError;
    if (!images) return [];

    // Get uploader names
    const uploaderIds = [...new Set(images.map(img => img.uploaded_by))];
    let uploaderProfiles: any[] = [];
    
    if (uploaderIds.length > 0) {
      const { data: uploaderData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', uploaderIds);
      uploaderProfiles = uploaderData || [];
    }

    return images.map(image => {
      const uploader = uploaderProfiles.find(p => p.id === image.uploaded_by);
      return {
        ...image,
        uploaded_by_name: uploader?.name || 'Unknown',
        note_content: image.description || '',
        note_author_name: uploader?.name || 'Unknown',
        is_private_note: false
      };
    });
  } catch (error) {
    console.error('Error fetching work order images:', error);
    return [];
  }
};

// Delete an image
export const deleteWorkOrderImage = async (imageId: string): Promise<void> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  // Get image details first
  const { data: image, error: fetchError } = await supabase
    .from('work_order_images')
    .select('file_url, uploaded_by')
    .eq('id', imageId)
    .single();

  if (fetchError) throw fetchError;
  if (!image) throw new Error('Image not found');

  // Check if user can delete (must be uploader)
  if (image.uploaded_by !== userData.user.id) {
    throw new Error('Not authorized to delete this image');
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('work_order_images')
    .delete()
    .eq('id', imageId);

  if (deleteError) throw deleteError;

  // Delete from storage
  const filePath = image.file_url.split('/').slice(-4).join('/'); // Extract path from URL
  await supabase.storage
    .from('work-order-images')
    .remove([filePath]);
};
