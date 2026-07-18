import { describe, it, expect } from 'vitest';
import type { EquipmentImageData } from '@/features/equipment/services/equipmentImagesService';
import {
  DEFAULT_EQUIPMENT_MEDIA_FILTERS,
  countActiveEquipmentMediaFilters,
  filterAndSortEquipmentMedia,
  isEquipmentDisplayImage,
  orderEquipmentMediaForDisplayCarousel,
  resolveEquipmentMediaArtifactKind,
} from './equipmentMediaFilters';

function img(
  overrides: Partial<EquipmentImageData> & Pick<EquipmentImageData, 'id' | 'file_url' | 'created_at'>,
): EquipmentImageData {
  return {
    file_name: `${overrides.id}.jpg`,
    uploaded_by: 'user-1',
    source_type: 'equipment_note',
    uploaded_by_name: 'Alex',
    note_content: 'Inspection photo',
    ...overrides,
  };
}

describe('equipmentMediaFilters', () => {
  const sample: EquipmentImageData[] = [
    img({
      id: 'a',
      file_url: 'https://example.com/a.jpg',
      created_at: '2026-07-01T10:00:00.000Z',
      source_type: 'equipment_note',
      uploaded_by_name: 'Alex',
    }),
    img({
      id: 'b',
      file_url: 'https://example.com/b.jpg',
      created_at: '2026-07-03T10:00:00.000Z',
      source_type: 'work_order_note',
      uploaded_by_name: 'Blake',
      note_content: 'Hydraulic leak',
    }),
    img({
      id: 'c',
      file_url: 'org/eq/c.jpg',
      created_at: '2026-07-02T10:00:00.000Z',
      source_type: 'equipment_note',
      uploaded_by_name: 'Casey',
      file_name: 'manual.pdf',
    }),
  ];

  it('filters by source, search, uploader, and date range', () => {
    const filtered = filterAndSortEquipmentMedia(sample, {
      ...DEFAULT_EQUIPMENT_MEDIA_FILTERS,
      source: 'work_order_note',
      search: 'hydraulic',
      uploader: 'blake',
      dateFrom: '2026-07-02',
      dateTo: '2026-07-04',
    });
    expect(filtered.map((i) => i.id)).toEqual(['b']);
  });

  it('sorts by created_at ascending', () => {
    const filtered = filterAndSortEquipmentMedia(sample, {
      ...DEFAULT_EQUIPMENT_MEDIA_FILTERS,
      sortField: 'created_at',
      sortOrder: 'asc',
    });
    expect(filtered.map((i) => i.id)).toEqual(['a', 'c', 'b']);
  });

  it('orders display image first then newest remaining', () => {
    const ordered = orderEquipmentMediaForDisplayCarousel(sample, 'org/eq/c.jpg');
    expect(ordered.map((i) => i.id)).toEqual(['c', 'b', 'a']);
  });

  it('detects display image path matches', () => {
    expect(isEquipmentDisplayImage(sample[2], 'org/eq/c.jpg')).toBe(true);
    expect(isEquipmentDisplayImage(sample[0], 'org/eq/c.jpg')).toBe(false);
  });

  it('resolves artifact kinds from mime and extension', () => {
    expect(resolveEquipmentMediaArtifactKind('image/jpeg', 'x.jpg')).toBe('image');
    expect(resolveEquipmentMediaArtifactKind('application/pdf', 'x.pdf')).toBe('document');
    expect(resolveEquipmentMediaArtifactKind(null, 'manual.pdf')).toBe('document');
    expect(resolveEquipmentMediaArtifactKind(null, 'photo.webp')).toBe('image');
  });

  it('counts active filters', () => {
    expect(countActiveEquipmentMediaFilters(DEFAULT_EQUIPMENT_MEDIA_FILTERS)).toBe(0);
    expect(
      countActiveEquipmentMediaFilters({
        ...DEFAULT_EQUIPMENT_MEDIA_FILTERS,
        search: 'x',
        source: 'equipment_note',
        dateFrom: '2026-01-01',
      }),
    ).toBe(3);
  });
});
