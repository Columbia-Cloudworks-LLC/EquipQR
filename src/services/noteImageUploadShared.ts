import { logger } from '@/utils/logger';
import {
  uploadImageToStorage,
  displayUrlForStoredPrivateImage,
} from '@/services/imageUploadService';
import { rollbackNoteImageAfterSigningFailure } from '@/services/noteImageSigningRollback';

export interface UploadedNoteImageRecord<TImage extends { id: string; file_url: string }> {
  record: TImage;
  storedPath: string;
}

export async function uploadFilesToNoteImageBucket<TImage extends { id: string; file_url: string }>(params: {
  bucket: string;
  imagesTable: string;
  images: File[];
  buildObjectKey: (file: File) => string;
  insertImageRecord: (file: File, storedPath: string) => Promise<TImage | null>;
  signDisplayUrls: (paths: string[]) => Promise<Array<string | null>>;
}): Promise<TImage[]> {
  const insertedRecords: UploadedNoteImageRecord<TImage>[] = [];

  for (const file of params.images) {
    try {
      const storedPath = await uploadImageToStorage(params.bucket, params.buildObjectKey(file), file);
      const imageRecord = await params.insertImageRecord(file, storedPath);
      if (!imageRecord) continue;
      insertedRecords.push({ record: imageRecord, storedPath });
    } catch (error) {
      logger.error('Error processing note image upload:', error);
    }
  }

  const signedBatch =
    insertedRecords.length > 0
      ? await params.signDisplayUrls(insertedRecords.map((entry) => entry.record.file_url))
      : [];

  const uploadedImages: TImage[] = [];
  for (let i = 0; i < insertedRecords.length; i++) {
    const { record, storedPath } = insertedRecords[i];
    const displayUrl = displayUrlForStoredPrivateImage(signedBatch[i] ?? null, record.file_url);
    if (displayUrl != null) {
      uploadedImages.push({ ...record, file_url: displayUrl });
    } else {
      await rollbackNoteImageAfterSigningFailure({
        bucket: params.bucket,
        imagesTable: params.imagesTable,
        imageId: record.id,
        storedPath,
      });
    }
  }

  return uploadedImages;
}
