import { describe, expect, it } from 'vitest';
import {
  moveChecklistItemToSectionEdge,
  reorderChecklistItems,
} from './checklistTemplateEditorUtils';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

const engineItems: PMChecklistItem[] = [
  {
    id: 'item-1',
    title: 'Check oil',
    description: 'Check oil level',
    section: 'Engine',
    condition: null,
    required: true,
    notes: '',
  },
  {
    id: 'item-2',
    title: 'Check coolant',
    description: 'Check coolant level',
    section: 'Engine',
    condition: null,
    required: false,
    notes: '',
  },
];

describe('reorderChecklistItems', () => {
  it('moves an item within the same section', () => {
    const reordered = reorderChecklistItems(engineItems, 'item-2', 'item-1');
    expect(reordered.map((item) => item.id)).toEqual(['item-2', 'item-1']);
  });

  it('moves an item to the top of its section', () => {
    const moved = moveChecklistItemToSectionEdge(engineItems, 'item-2', 'top');
    expect(moved.map((item) => item.id)).toEqual(['item-2', 'item-1']);
  });

  it('moves an item to the bottom of its section', () => {
    const moved = moveChecklistItemToSectionEdge(engineItems, 'item-1', 'bottom');
    expect(moved.map((item) => item.id)).toEqual(['item-2', 'item-1']);
  });

  it('does not reorder across sections', () => {
    const items: PMChecklistItem[] = [
      ...engineItems,
      {
        id: 'item-3',
        title: 'Brake pads',
        description: '',
        section: 'Brakes',
        condition: null,
        required: false,
        notes: '',
      },
    ];
    const unchanged = reorderChecklistItems(items, 'item-1', 'item-3');
    expect(unchanged).toBe(items);
  });
});
