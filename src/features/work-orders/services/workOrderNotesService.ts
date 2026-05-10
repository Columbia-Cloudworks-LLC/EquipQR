import { logger } from '@/utils/logger';

import { supabase } from '@/integrations/supabase/client';
import { validateStorageQuota } from '@/utils/storageQuota';
import { requireAuthUserIdFromClaims } from '@/lib/authClaims';
import {
  uploadImageToStorage,
  normalizeStoredObjectPath,
  batchResolveWorkOrderImageDisplayUrls,
  displayUrlForStoredPrivateImage,
  deleteImageFromStorage,
} from '@/services/imageUploadService';

export interface WorkOrderNote {
  id: string;
  work_order_id: string;
  author_id: string;
  content: string;
  hours_worked: number;
  /** Equipment meter hours recorded with this note, when provided */
  machine_hours?: number | null;
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

/** Image row plus joined note metadata for work order gallery / carousel */
export interface WorkOrderCarouselImage {
  id: string;
  work_order_id: string;
  note_id: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  uploaded_by: string;
  created_at: string;
  uploaded_by_name: string;
  note_content: string;
  note_author_name: string;
  note_created_at: string;
  is_private_note: boolean;
}

type NoteJoinRow = {
  id: string;
  content: string;
  author_id: string;
  author_name: string | null;
  is_private: boolean;
  created_at: string;
};

function unwrapJoinedNote(raw: unknown): NoteJoinRow | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return (raw[0] as NoteJoinRow | undefined) ?? null;
  return raw as NoteJoinRow;
}

// Create a note with images
export const createWorkOrderNoteWithImages = async (
  workOrderId: string,
  content: string,
  hoursWorked: number = 0,
  isPrivate: boolean = false,
  images: File[] = [],
  organizationId?: string,
  machineHours?: number | null,
): Promise<WorkOrderNote> => {
  const userId = await requireAuthUserIdFromClaims();

  // Get organization_id if not provided
  let orgId = organizationId;
  if (!orgId) {
    const { data: workOrder } = await supabase
      .from('work_orders')
      .select('organization_id')
      .eq('id', workOrderId)
      .single();
    if (!workOrder) throw new Error('Work order not found');
    orgId = workOrder.organization_id;
  }

  // Validate storage quota for all files before uploading
  const totalFileSize = images.reduce((sum, file) => sum + file.size, 0);
  await validateStorageQuota(orgId, totalFileSize);

  // Create the note first
  const { data: note, error: noteError } = await supabase
    .from('work_order_notes')
    .insert({
      work_order_id: workOrderId,
      author_id: userId,
      content,
      hours_worked: hoursWorked,
      is_private: isPrivate,
      // Only include machine_hours when the user provided a meaningful value.
      // The form initializes machineHours to 0; including {machine_hours: 0}
      // unconditionally caused issue #735 on production when the column was
      // missing, and conveys no information either way. Matches the display
      // convention in WorkOrderNotesSection (`Number.isFinite(n) && n > 0`).
      ...(Number.isFinite(Number(machineHours)) && Number(machineHours) > 0
        ? { machine_hours: Number(machineHours) }
        : {}),
    })
    .select()
    .single();

  if (noteError) throw noteError;

  // Upload images if provided
  const uploadedImages: WorkOrderNoteImage[] = [];
  for (const file of images) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${workOrderId}/${note.id}/${Date.now()}.${fileExt}`;

      const storedPath = await uploadImageToStorage('work-order-images', fileName, file);

      // Save image record to database with proper note_id association
      const { data: imageRecord, error: imageError } = await supabase
        .from('work_order_images')
        .insert({
          work_order_id: workOrderId,
          note_id: note.id,
          file_name: file.name,
          file_url: storedPath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: userId,
          description: `Attached to note: ${note.id}`
        })
        .select()
        .single();

      if (imageError) {
        logger.error('Failed to save image record:', imageError);
        try {
          await deleteImageFromStorage('work-order-images', storedPath);
        } catch (cleanupError) {
          logger.error('Failed to delete orphaned work-order image after DB insert failure:', cleanupError);
        }
        continue;
      }

      uploadedImages.push({
        ...imageRecord,
        note_id: note.id,
      });
    } catch (error) {
      logger.error('Error processing image:', error);
    }
  }

  const signedCreated = await batchResolveWorkOrderImageDisplayUrls(uploadedImages.map(i => i.file_url));
  const withDisplayUrls = uploadedImages
    .map((img, i) => {
      const url = displayUrlForStoredPrivateImage(signedCreated[i], img.file_url);
      return url == null ? null : { ...img, file_url: url };
    })
    .filter((row): row is WorkOrderNoteImage => row != null);

  return {
    ...note,
    images: withDisplayUrls,
  };
};

/** Attach creation-time photos via the standard note+storage path and set work_orders.primary_image_id to the first uploaded image. */
export async function attachWorkOrderCreationImages(params: {
  workOrderId: string;
  organizationId: string;
  images: File[];
  noteContent?: string;
}): Promise<{ primaryImageId: string | null }> {
  const { workOrderId, organizationId, images, noteContent } = params;
  if (!images?.length) {
    return { primaryImageId: null };
  }

  const note = await createWorkOrderNoteWithImages(
    workOrderId,
    noteContent ?? 'Photos attached when this work order was created.',
    0,
    false,
    images,
    organizationId,
    undefined,
  );

  const primaryImageId = note.images?.[0]?.id ?? null;
  if (!primaryImageId) {
    return { primaryImageId: null };
  }

  const { error } = await supabase
    .from('work_orders')
    .update({ primary_image_id: primaryImageId })
    .eq('id', workOrderId)
    .eq('organization_id', organizationId);

  if (error) throw error;

  return { primaryImageId };
}

// Get notes with images for work order
export const getWorkOrderNotesWithImages = async (
  workOrderId: string,
  organizationId?: string
) => {
  try {
    // If organization_id is provided, verify the work order belongs to that organization
    // This provides explicit multi-tenancy filtering as a failsafe (per coding guidelines)
    if (organizationId) {
      const { data: workOrder, error: workOrderError } = await supabase
        .from('work_orders')
        .select('id, organization_id')
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .single();

      if (workOrderError || !workOrder) {
        // Work order doesn't exist or doesn't belong to the specified organization
        logger.warn('Work order not found or organization mismatch', {
          workOrderId,
          organizationId,
          error: workOrderError,
        });
        return [];
      }
    }

    // Get notes (RLS policies also enforce multi-tenancy)
    const { data: notes, error: notesError } = await supabase
      .from('work_order_notes')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false });

    if (notesError) throw notesError;
    if (!notes) return [];

    // Get author names separately
    const authorIds = [...new Set(notes.map(note => note.author_id))];
    let profiles: Array<{ id: string; name?: string }> = [];
    
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
    let uploaderProfiles: Array<{ id: string; name?: string }> = [];
    
    if (uploaderIds.length > 0) {
      const { data: uploaderData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', uploaderIds);
      uploaderProfiles = uploaderData || [];
    }

    const imagesList = allImages || [];
    const signedBatch = await batchResolveWorkOrderImageDisplayUrls(imagesList.map(img => img.file_url));
    const displayByImageId = new Map<string, string>();
    imagesList.forEach((img, i) => {
      const url = displayUrlForStoredPrivateImage(signedBatch[i], img.file_url);
      if (url != null) displayByImageId.set(img.id, url);
    });

    return notes.map(note => {
      const author = profiles.find(p => p.id === note.author_id);

      const noteImages = imagesList
        .filter(img => img.note_id === note.id)
        .filter(img => displayByImageId.has(img.id))
        .map(img => {
          const uploader = uploaderProfiles.find(p => p.id === img.uploaded_by);
          return {
            ...img,
            file_url: displayByImageId.get(img.id)!,
            uploaded_by_name: uploader?.name || 'Unknown',
          };
        });

      return {
        ...note,
        hours_worked: Number(note.hours_worked) || 0,
        machine_hours: note.machine_hours != null ? Number(note.machine_hours) : null,
        author_name: author?.name || 'Unknown',
        images: noteImages,
      };
    });
  } catch (error) {
    logger.error('Error fetching work order notes:', error);
    return [];
  }
};

// Get all images for work order (for gallery / carousel view)
export const getWorkOrderImages = async (
  workOrderId: string,
  organizationId: string,
): Promise<WorkOrderCarouselImage[]> => {
  try {
    const { data: workOrder, error: workOrderError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('id', workOrderId)
      .eq('organization_id', organizationId)
      .single();

    if (workOrderError || !workOrder) {
      logger.warn('Work order not found or organization mismatch while fetching images', {
        workOrderId,
        organizationId,
        error: workOrderError,
      });
      return [];
    }

    const { data: rows, error: imagesError } = await supabase
      .from('work_order_images')
      .select(
        `
        id,
        work_order_id,
        note_id,
        file_name,
        file_url,
        file_size,
        mime_type,
        description,
        uploaded_by,
        created_at,
        work_order_notes (
          id,
          content,
          author_id,
          author_name,
          is_private,
          created_at
        )
      `,
      )
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false });

    if (imagesError) throw imagesError;
    if (!rows?.length) return [];

    type RawRow = (typeof rows)[number];
    const flatImages = rows.map((row: RawRow) => {
      const {
        id,
        work_order_id,
        note_id,
        file_name,
        file_url,
        file_size,
        mime_type,
        description,
        uploaded_by,
        created_at,
      } = row;
      return {
        id,
        work_order_id,
        note_id,
        file_name,
        file_url,
        file_size,
        mime_type,
        description,
        uploaded_by,
        created_at,
      };
    });

    const uploaderIds = [...new Set(flatImages.map(img => img.uploaded_by))];
    const authorIds = new Set<string>();
    for (const row of rows) {
      const note = unwrapJoinedNote(row.work_order_notes);
      if (note?.author_id) authorIds.add(note.author_id);
    }

    const profileIds = [...new Set([...uploaderIds, ...authorIds])];
    let profiles: Array<{ id: string; name?: string }> = [];
    if (profileIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', profileIds);
      profiles = profileData || [];
    }

    const signedBatch = await batchResolveWorkOrderImageDisplayUrls(flatImages.map(img => img.file_url));

    return rows
      .map((row: RawRow, i: number) => {
        const note = unwrapJoinedNote(row.work_order_notes);
        const img = flatImages[i];
        const uploader = profiles.find(p => p.id === img.uploaded_by);
        const displayUrl = displayUrlForStoredPrivateImage(signedBatch[i], img.file_url);
        if (displayUrl == null) return null;

        const uploadedByName = uploader?.name || 'Unknown';

        if (!note) {
          return {
            ...img,
            file_url: displayUrl,
            uploaded_by_name: uploadedByName,
            note_content: '',
            note_author_name: uploadedByName,
            note_created_at: img.created_at,
            is_private_note: false,
          } satisfies WorkOrderCarouselImage;
        }

        const noteAuthor =
          profiles.find(p => p.id === note.author_id)?.name ||
          note.author_name ||
          'Unknown';

        return {
          ...img,
          file_url: displayUrl,
          uploaded_by_name: uploadedByName,
          note_content: note.content ?? '',
          note_author_name: noteAuthor,
          note_created_at: note.created_at,
          is_private_note: Boolean(note.is_private),
        } satisfies WorkOrderCarouselImage;
      })
      .filter((row): row is WorkOrderCarouselImage => row != null);
  } catch (error) {
    logger.error('Error fetching work order images:', error);
    return [];
  }
};

// Delete an image
export const deleteWorkOrderImage = async (imageId: string): Promise<void> => {
  const userId = await requireAuthUserIdFromClaims();

  // Get image details first
  const { data: image, error: fetchError } = await supabase
    .from('work_order_images')
    .select('file_url, uploaded_by')
    .eq('id', imageId)
    .single();

  if (fetchError) throw fetchError;
  if (!image) throw new Error('Image not found');

  // Check if user can delete (must be uploader)
  if (image.uploaded_by !== userId) {
    throw new Error('Not authorized to delete this image');
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('work_order_images')
    .delete()
    .eq('id', imageId);

  if (deleteError) throw deleteError;

  const filePath = normalizeStoredObjectPath(image.file_url, 'work-order-images');
  if (filePath) {
    await supabase.storage.from('work-order-images').remove([filePath]);
  }
};


