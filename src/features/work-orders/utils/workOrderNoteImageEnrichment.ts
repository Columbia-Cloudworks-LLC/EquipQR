import { supabase } from '@/integrations/supabase/client';
import {
  batchResolveWorkOrderImageDisplayUrls,
  displayUrlForStoredPrivateImage,
} from '@/services/imageUploadService';

type ProfileRef = { id: string; name?: string | null };

export type WorkOrderNoteImageRow = {
  id: string;
  note_id: string | null;
  file_url: string;
  uploaded_by: string;
  [key: string]: unknown;
};

export async function buildWorkOrderImageDisplayMap(
  imagesList: WorkOrderNoteImageRow[],
): Promise<Map<string, string>> {
  const signedBatch = await batchResolveWorkOrderImageDisplayUrls(
    imagesList.map((img) => img.file_url),
  );
  const displayByImageId = new Map<string, string>();
  imagesList.forEach((img, i) => {
    const url = displayUrlForStoredPrivateImage(signedBatch[i], img.file_url);
    if (url != null) displayByImageId.set(img.id, url);
  });
  return displayByImageId;
}

export async function fetchWorkOrderImagesWithUploaderProfiles(workOrderId: string): Promise<{
  imagesList: WorkOrderNoteImageRow[];
  uploaderProfiles: ProfileRef[];
  displayByImageId: Map<string, string>;
}> {
  const { data: allImages } = await supabase
    .from('work_order_images')
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false });

  const imagesList = (allImages ?? []) as WorkOrderNoteImageRow[];
  const uploaderIds = [...new Set(imagesList.map((img) => img.uploaded_by))];
  let uploaderProfiles: ProfileRef[] = [];

  if (uploaderIds.length > 0) {
    const { data: uploaderData } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', uploaderIds);
    uploaderProfiles = uploaderData ?? [];
  }

  const displayByImageId = await buildWorkOrderImageDisplayMap(imagesList);
  return { imagesList, uploaderProfiles, displayByImageId };
}

export function mapResolvedImagesForNote(
  noteId: string,
  imagesList: WorkOrderNoteImageRow[],
  displayByImageId: Map<string, string>,
  uploaderProfiles: ProfileRef[],
) {
  return imagesList
    .filter((img) => img.note_id === noteId)
    .filter((img) => displayByImageId.has(img.id))
    .map((img) => {
      const uploader = uploaderProfiles.find((p) => p.id === img.uploaded_by);
      return {
        ...img,
        file_url: displayByImageId.get(img.id)!,
        uploaded_by_name: uploader?.name || 'Unknown',
      };
    });
}
