import { extractEquipmentDisplayImagePath } from '@/services/imageUploadService';
import type { EquipmentImageData } from '@/features/equipment/services/equipmentImagesService';

export type EquipmentMediaSourceFilter = 'all' | 'equipment_note' | 'work_order_note';

export type EquipmentMediaSortField = 'created_at' | 'source' | 'uploader' | 'file_name';

export type EquipmentMediaSortOrder = 'asc' | 'desc';

export type EquipmentMediaArtifactKind = 'image' | 'document' | 'other';

export interface EquipmentMediaFiltersState {
  search: string;
  source: EquipmentMediaSourceFilter;
  uploader: string;
  dateFrom: string;
  dateTo: string;
  sortField: EquipmentMediaSortField;
  sortOrder: EquipmentMediaSortOrder;
}

export const DEFAULT_EQUIPMENT_MEDIA_FILTERS: EquipmentMediaFiltersState = {
  search: '',
  source: 'all',
  uploader: '',
  dateFrom: '',
  dateTo: '',
  sortField: 'created_at',
  sortOrder: 'desc',
};

/** Infer artifact kind from mime type or file extension for future non-image support. */
export function resolveEquipmentMediaArtifactKind(
  mimeType?: string | null,
  fileName?: string | null,
): EquipmentMediaArtifactKind {
  const mime = (mimeType ?? '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf' || mime.includes('document') || mime.includes('text/')) {
    return 'document';
  }

  const name = (fileName ?? '').toLowerCase();
  if (/\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i.test(name)) return 'image';
  if (/\.(pdf|docx?|xlsx?|txt|csv)$/i.test(name)) return 'document';
  return 'other';
}

export function equipmentMediaPathsMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  if (a === b) return true;
  const pathA = extractEquipmentDisplayImagePath(a);
  const pathB = extractEquipmentDisplayImagePath(b);
  if (pathA && pathB && pathA === pathB) return true;
  // Signed URLs may share the same object path segment after the bucket marker.
  const strip = (url: string) =>
    url
      .split('?')[0]
      ?.replace(/^https?:\/\/[^/]+/i, '')
      .replace(/^\/storage\/v1\/object\/(?:sign|public)\//, '')
      .replace(/^(work-order-images|equipment-note-images)\//, '') ?? '';
  const strippedA = strip(a);
  const strippedB = strip(b);
  return Boolean(strippedA && strippedB && strippedA === strippedB);
}

export function isEquipmentDisplayImage(
  image: Pick<EquipmentImageData, 'file_url'>,
  currentDisplayImage?: string | null,
): boolean {
  return equipmentMediaPathsMatch(image.file_url, currentDisplayImage);
}

function matchesSearch(image: EquipmentImageData, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  const haystack = [
    image.file_name,
    image.description,
    image.note_content,
    image.uploaded_by_name,
    image.note_author_name,
    image.source_type,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function matchesUploader(image: EquipmentImageData, uploader: string): boolean {
  const query = uploader.trim().toLowerCase();
  if (!query) return true;
  return (
    (image.uploaded_by_name ?? '').toLowerCase().includes(query) ||
    (image.note_author_name ?? '').toLowerCase().includes(query) ||
    image.uploaded_by.toLowerCase().includes(query)
  );
}

function matchesDateRange(image: EquipmentImageData, dateFrom: string, dateTo: string): boolean {
  const created = new Date(image.created_at).getTime();
  if (Number.isNaN(created)) return false;
  if (dateFrom) {
    const from = new Date(`${dateFrom}T00:00:00`).getTime();
    if (!Number.isNaN(from) && created < from) return false;
  }
  if (dateTo) {
    const to = new Date(`${dateTo}T23:59:59.999`).getTime();
    if (!Number.isNaN(to) && created > to) return false;
  }
  return true;
}

function compareMedia(
  a: EquipmentImageData,
  b: EquipmentImageData,
  field: EquipmentMediaSortField,
  order: EquipmentMediaSortOrder,
): number {
  const direction = order === 'asc' ? 1 : -1;
  switch (field) {
    case 'created_at': {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return diff * direction;
    }
    case 'source': {
      const diff = a.source_type.localeCompare(b.source_type);
      return diff * direction;
    }
    case 'uploader': {
      const nameA = (a.uploaded_by_name || a.note_author_name || a.uploaded_by).toLowerCase();
      const nameB = (b.uploaded_by_name || b.note_author_name || b.uploaded_by).toLowerCase();
      return nameA.localeCompare(nameB) * direction;
    }
    case 'file_name': {
      return a.file_name.localeCompare(b.file_name) * direction;
    }
    default: {
      const _exhaustive: never = field;
      void _exhaustive;
      return 0;
    }
  }
}

export function filterAndSortEquipmentMedia(
  images: EquipmentImageData[],
  filters: EquipmentMediaFiltersState,
): EquipmentImageData[] {
  return images
    .filter((image) => {
      if (filters.source !== 'all' && image.source_type !== filters.source) return false;
      if (!matchesSearch(image, filters.search)) return false;
      if (!matchesUploader(image, filters.uploader)) return false;
      if (!matchesDateRange(image, filters.dateFrom, filters.dateTo)) return false;
      return true;
    })
    .sort((a, b) => compareMedia(a, b, filters.sortField, filters.sortOrder));
}

/**
 * Display image first (when present), then remaining images newest → oldest.
 * Used by equipment/work-order primary carousels so techs can scrub history.
 */
export function orderEquipmentMediaForDisplayCarousel(
  images: EquipmentImageData[],
  currentDisplayImage?: string | null,
): EquipmentImageData[] {
  if (images.length === 0) return [];

  const chronological = [...images].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  if (!currentDisplayImage?.trim()) return chronological;

  const displayIndex = chronological.findIndex((image) =>
    isEquipmentDisplayImage(image, currentDisplayImage),
  );
  if (displayIndex <= 0) return chronological;

  const [displayImage] = chronological.splice(displayIndex, 1);
  return [displayImage, ...chronological];
}

export function countActiveEquipmentMediaFilters(filters: EquipmentMediaFiltersState): number {
  let count = 0;
  if (filters.search.trim()) count += 1;
  if (filters.source !== 'all') count += 1;
  if (filters.uploader.trim()) count += 1;
  if (filters.dateFrom) count += 1;
  if (filters.dateTo) count += 1;
  return count;
}
