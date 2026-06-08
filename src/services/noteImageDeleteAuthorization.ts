import { supabase } from '@/integrations/supabase/client';

export async function fetchNoteImageForDeletion(
  imagesTable: 'equipment_note_images' | 'work_order_images',
  imageId: string,
): Promise<{ file_url: string; uploaded_by: string }> {
  const { data: image, error: fetchError } = await supabase
    .from(imagesTable)
    .select('file_url, uploaded_by')
    .eq('id', imageId)
    .single();

  if (fetchError) throw fetchError;
  if (!image) throw new Error('Image not found');

  return image;
}

export function assertNoteImageUploader(
  uploadedBy: string,
  userId: string,
  message = 'Not authorized to delete this image',
): void {
  if (uploadedBy !== userId) {
    throw new Error(message);
  }
}
