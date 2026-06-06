import type { NoteSubmitPayload } from './noteSubmitTypes';

export type ImageOnlyNoteContentStyle = 'count' | 'filenames';

/**
 * When the user submits images without text, generate a default note body.
 */
export function buildImageOnlyNoteContent(
  userName: string,
  images: File[],
  style: ImageOnlyNoteContentStyle = 'count',
): string {
  if (images.length === 0) return '';

  if (images.length === 1) {
    if (style === 'filenames') {
      return `${userName} uploaded: ${images[0].name}`;
    }
    return `${userName} uploaded 1 image.`;
  }

  if (style === 'filenames') {
    const fileNames = images.map((f) => f.name).join(', ');
    return `${userName} uploaded ${images.length} images: ${fileNames}`;
  }

  return `${userName} uploaded ${images.length} images.`;
}

/** Trim content and fill from images when the note body is empty. */
export function resolveNoteContentFromSubmit(
  data: NoteSubmitPayload,
  userName: string,
  style: ImageOnlyNoteContentStyle = 'count',
): string {
  const trimmed = data.content.trim();
  if (trimmed) return trimmed;
  if (data.images.length === 0) return '';
  return buildImageOnlyNoteContent(userName, data.images, style);
}
