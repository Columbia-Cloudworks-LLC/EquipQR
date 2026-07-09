import { logger } from '@/utils/logger';

import { supabase } from '@/integrations/supabase/client';
import { resolveWorkOrderOrganizationId } from '@/features/work-orders/services/workOrderOrganizationService';
import { validateStorageQuota } from '@/utils/storageQuota';
import { requireAuthUserIdFromClaims } from '@/lib/authClaims';
import {
  batchResolveWorkOrderImageDisplayUrls,
  displayUrlForStoredPrivateImage,
  deleteImageFromStorage,
} from '@/services/imageUploadService';
import {
  fetchWorkOrderImagesWithUploaderProfiles,
  mapResolvedImagesForNote,
} from '@/features/work-orders/utils/workOrderNoteImageEnrichment';
import { verifyWorkOrderOrganizationScope } from '@/features/work-orders/services/workOrderOrganizationGate';
import { noteMachineHoursInsertFields } from '@/services/noteMachineHoursInsert';
import {
  deleteWorkOrderNoteImageAuditedRpc,
  deleteWorkOrderNoteRpc,
  updateWorkOrderNoteRpc,
} from '@/services/noteMutationRpc';
import { uploadFilesToNoteImageBucket } from '@/services/noteImageUploadShared';

async function prepareWorkOrderNoteImageUpload(
  workOrderId: string,
  organizationId: string | undefined,
  images: File[],
): Promise<{ userId: string; orgId: string }> {
  const userId = await requireAuthUserIdFromClaims();
  const orgId = await resolveWorkOrderOrganizationId(workOrderId, organizationId);
  const totalFileSize = images.reduce((sum, file) => sum + file.size, 0);
  await validateStorageQuota(orgId, totalFileSize);
  return { userId, orgId };
}

async function uploadWorkOrderNoteImages(
  workOrderId: string,
  noteId: string,
  images: File[],
  userId: string,
): Promise<WorkOrderNoteImage[]> {
  return uploadFilesToNoteImageBucket<WorkOrderNoteImage>({
    bucket: 'work-order-images',
    imagesTable: 'work_order_images',
    images,
    buildObjectKey: (file) => {
      const fileExt = file.name.split('.').pop();
      return `${userId}/${workOrderId}/${noteId}/${Date.now()}.${fileExt}`;
    },
    insertImageRecord: async (file, storedPath) => {
      const { data, error } = await supabase
        .from('work_order_images')
        .insert({
          work_order_id: workOrderId,
          note_id: noteId,
          file_name: file.name,
          file_url: storedPath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: userId,
          description: `Attached to note: ${noteId}`,
        })
        .select()
        .single();
      if (error) {
        logger.error('Failed to save work order image record:', error);
        try {
          await deleteImageFromStorage('work-order-images', storedPath);
        } catch (cleanupError) {
          logger.error('Failed to delete orphaned work-order image after DB insert failure:', cleanupError);
        }
        return null;
      }
      return { ...data, note_id: noteId } as WorkOrderNoteImage;
    },
    signDisplayUrls: (paths) => batchResolveWorkOrderImageDisplayUrls(paths),
  });
}

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
  const { userId } = await prepareWorkOrderNoteImageUpload(workOrderId, organizationId, images);

  // Create the note first
  const { data: note, error: noteError } = await supabase
    .from('work_order_notes')
    .insert({
      work_order_id: workOrderId,
      author_id: userId,
      content,
      hours_worked: hoursWorked,
      is_private: isPrivate,
      ...noteMachineHoursInsertFields(machineHours),
    })
    .select()
    .single();

  if (noteError) throw noteError;

  const uploadedImages = await uploadWorkOrderNoteImages(workOrderId, note.id, images, userId);

  return {
    ...note,
    images: uploadedImages,
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
  organizationId: string,
) => {
  if (!organizationId.trim()) {
    throw new Error('Organization ID is required to fetch work order notes with images');
  }

  try {
    // Verify the work order belongs to the organization (explicit multi-tenancy failsafe)
    if (!(await verifyWorkOrderOrganizationScope(workOrderId, organizationId))) {
      return [];
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

    const { imagesList, uploaderProfiles, displayByImageId } =
      await fetchWorkOrderImagesWithUploaderProfiles(workOrderId, organizationId);

    return notes.map(note => {
      const author = profiles.find(p => p.id === note.author_id);

      const noteImages = mapResolvedImagesForNote(
        note.id,
        imagesList,
        displayByImageId,
        uploaderProfiles,
      );

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
      .maybeSingle();

    if (workOrderError) {
      logger.error('Error verifying work order organization while fetching images', {
        workOrderId,
        organizationId,
        error: workOrderError,
      });
      throw workOrderError;
    }

    if (!workOrder) {
      logger.warn('Work order not found or organization mismatch while fetching images', {
        workOrderId,
        organizationId,
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
    throw error;
  }
};

// Delete an image (audited RPC)
export const deleteWorkOrderImage = async (
  imageId: string,
  organizationId: string,
  workOrderId: string,
): Promise<void> => {
  await deleteWorkOrderNoteImageAuditedRpc({ organizationId, workOrderId, imageId });
};

export const updateWorkOrderNote = async (
  organizationId: string,
  workOrderId: string,
  noteId: string,
  updates: { content?: string; isPrivate?: boolean },
): Promise<void> => {
  await updateWorkOrderNoteRpc({
    organizationId,
    workOrderId,
    noteId,
    content: updates.content,
    isPrivate: updates.isPrivate,
  });
};

export const deleteWorkOrderNote = async (
  organizationId: string,
  workOrderId: string,
  noteId: string,
): Promise<void> => {
  await deleteWorkOrderNoteRpc({ organizationId, workOrderId, noteId });
};

export const addImagesToWorkOrderNote = async (
  workOrderId: string,
  noteId: string,
  images: File[],
  organizationId?: string,
): Promise<WorkOrderNoteImage[]> => {
  const { userId } = await prepareWorkOrderNoteImageUpload(workOrderId, organizationId, images);

  return uploadWorkOrderNoteImages(workOrderId, noteId, images, userId);
};

export type UpdateHistoricalWorkOrderNoteTimestampResult = {
  success: boolean;
  error?: string;
  work_order_id?: string;
  note_id?: string;
  created_at?: string;
};

export async function updateHistoricalWorkOrderNoteTimestamp(
  organizationId: string,
  workOrderId: string,
  noteId: string,
  createdAt: string,
): Promise<UpdateHistoricalWorkOrderNoteTimestampResult> {
  try {
    const { data, error } = await supabase.rpc('update_historical_work_order_note_timestamp', {
      p_organization_id: organizationId,
      p_work_order_id: workOrderId,
      p_note_id: noteId,
      p_created_at: createdAt,
    });

    if (error) throw error;

    const result = data as UpdateHistoricalWorkOrderNoteTimestampResult | null;
    if (!result?.success) {
      return {
        success: false,
        error: result?.error ?? 'Failed to update note timestamp',
      };
    }

    return result;
  } catch (error) {
    logger.error('Error updating historical work order note timestamp:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update note timestamp',
    };
  }
}

