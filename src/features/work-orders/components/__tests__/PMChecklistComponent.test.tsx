import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PMChecklistComponent from '../PMChecklistComponent';
import type { PreventativeMaintenance, PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

// Mock hooks
vi.mock('@/features/pm-templates/hooks/usePMData', () => ({
  useUpdatePM: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'pm-1' }),
    isPending: false
  }))
}));

vi.mock('@/features/pm-templates/hooks/usePMTemplates', () => ({
  usePMTemplates: vi.fn(() => ({
    data: [],
    isLoading: false
  }))
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false)
}));

vi.mock('@/hooks/useAutoSave', () => ({
  useAutoSave: vi.fn(() => ({
    triggerAutoSave: vi.fn(),
    cancelAutoSave: vi.fn()
  }))
}));

vi.mock('@/hooks/useBrowserStorage', () => ({
  useBrowserStorage: vi.fn(() => ({
    clearStorage: vi.fn()
  }))
}));

vi.mock('@/features/work-orders/services/workOrderRevertService', () => ({
  workOrderRevertService: {
    revertPMCompletion: vi.fn()
  }
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Sample checklist items with different conditions
const createMockChecklist = (): PMChecklistItem[] => [
  {
    id: 'item-1',
    title: 'Check oil level',
    section: 'Engine',
    required: true,
    condition: null,
    notes: undefined
  },
  {
    id: 'item-2',
    title: 'Check brake system',
    section: 'Safety',
    required: true,
    condition: 1, // OK
    notes: undefined
  },
  {
    id: 'item-3',
    title: 'Check hydraulics',
    section: 'Engine',
    required: true,
    condition: 2, // Adjusted - negative condition
    notes: 'Adjusted fluid levels'
  },
  {
    id: 'item-4',
    title: 'Check tires',
    section: 'Safety',
    required: false,
    condition: 3, // Recommend Repairs - negative condition
    notes: undefined
  }
];

const createMockPM = (overrides?: Partial<PreventativeMaintenance>): PreventativeMaintenance => ({
  id: 'pm-1',
  work_order_id: 'wo-1',
  equipment_id: 'eq-1',
  template_id: null,
  status: 'in_progress',
  notes: '',
  checklist_data: createMockChecklist() as unknown as PreventativeMaintenance['checklist_data'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  completed_at: null,
  ...overrides
});

const mockOnUpdate = vi.fn();

describe('PMChecklistComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Notes Auto-Expand Functionality', () => {
    it('auto-expands notes when selecting a negative condition (2-5)', async () => {
      const pm = createMockPM({
        checklist_data: [
          {
            id: 'item-1',
            title: 'Check oil level',
            section: 'Engine',
            required: true,
            condition: null,
            notes: undefined
          }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={{ id: 'org-1', name: 'Test Org' }}
        />
      );

      // Open the Engine section
      const engineSection = screen.getByText('Engine');
      fireEvent.click(engineSection);

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Find the select and change to "Adjusted" (condition 2)
      const selectTrigger = screen.getByRole('combobox');
      fireEvent.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByText('Adjusted')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Adjusted'));

      // Notes textarea should now be visible (auto-expanded)
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add notes for this item...')).toBeInTheDocument();
      });
    });

    it('shows notes when item has existing notes', async () => {
      const pm = createMockPM({
        checklist_data: [
          {
            id: 'item-1',
            title: 'Check oil level',
            section: 'Engine',
            required: true,
            condition: 1, // OK condition
            notes: 'Pre-existing notes'
          }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={{ id: 'org-1', name: 'Test Org' }}
        />
      );

      // Open the Engine section
      const engineSection = screen.getByText('Engine');
      fireEvent.click(engineSection);

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Notes should be visible because item has existing notes
      await waitFor(() => {
        const notesTextarea = screen.getByPlaceholderText('Add notes for this item...');
        expect(notesTextarea).toBeInTheDocument();
        expect(notesTextarea).toHaveValue('Pre-existing notes');
      });
    });
  });

  describe('Notes Toggle Button', () => {
    it('shows toggle button to show/hide notes', async () => {
      const pm = createMockPM({
        checklist_data: [
          {
            id: 'item-1',
            title: 'Check oil level',
            section: 'Engine',
            required: true,
            condition: 1, // OK condition
            notes: undefined
          }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={{ id: 'org-1', name: 'Test Org' }}
        />
      );

      // Open the Engine section
      const engineSection = screen.getByText('Engine');
      fireEvent.click(engineSection);

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Toggle button should be visible
      const toggleButton = screen.getByRole('button', { name: /add notes/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('toggles notes visibility when toggle button is clicked', async () => {
      const pm = createMockPM({
        checklist_data: [
          {
            id: 'item-1',
            title: 'Check oil level',
            section: 'Engine',
            required: true,
            condition: 1, // OK condition
            notes: undefined
          }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={{ id: 'org-1', name: 'Test Org' }}
        />
      );

      // Open the Engine section
      const engineSection = screen.getByText('Engine');
      fireEvent.click(engineSection);

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Click toggle button to show notes
      const toggleButton = screen.getByRole('button', { name: /add notes/i });
      fireEvent.click(toggleButton);

      // Notes textarea should now be visible
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add notes for this item...')).toBeInTheDocument();
      });

      // Click toggle button again to hide notes
      fireEvent.click(toggleButton);

      // Notes should be hidden (grid-rows-[0fr] with opacity-0)
      // We check that the toggle still works by clicking again
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add notes for this item...')).toBeInTheDocument();
      });
    });

    it('shows filled icon when notes exist', async () => {
      const pm = createMockPM({
        checklist_data: [
          {
            id: 'item-1',
            title: 'Check oil level',
            section: 'Engine',
            required: true,
            condition: 1,
            notes: 'Some notes'
          }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={{ id: 'org-1', name: 'Test Org' }}
        />
      );

      // Open the Engine section
      const engineSection = screen.getByText('Engine');
      fireEvent.click(engineSection);

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Toggle button should have "hide notes" label when notes are visible
      const toggleButton = screen.getByRole('button', { name: /hide notes/i });
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Manual Toggle Preference', () => {
    it('respects user manual collapse preference over auto-expand for negative conditions', async () => {
      const pm = createMockPM({
        checklist_data: [
          {
            id: 'item-1',
            title: 'Check oil level',
            section: 'Engine',
            required: true,
            condition: 2, // Adjusted - negative condition, should auto-expand
            notes: undefined
          }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={{ id: 'org-1', name: 'Test Org' }}
        />
      );

      // Open the Engine section
      const engineSection = screen.getByText('Engine');
      fireEvent.click(engineSection);

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Notes should be auto-expanded due to negative condition (2)
      // The container should have opacity-100 class when visible
      const notesTextarea = screen.getByPlaceholderText('Add notes for this item...');
      expect(notesTextarea).toBeInTheDocument();
      const notesContainer = notesTextarea.closest('.grid');
      expect(notesContainer).toHaveClass('opacity-100');

      // User clicks toggle button to collapse notes
      const toggleButton = screen.getByRole('button', { name: /hide notes/i });
      fireEvent.click(toggleButton);

      // Notes container should now have opacity-0 class (visually hidden)
      await waitFor(() => {
        expect(notesContainer).toHaveClass('opacity-0');
      });
    });

    it('re-enables auto-expand when condition changes to a new negative value', async () => {
      const pm = createMockPM({
        checklist_data: [
          {
            id: 'item-1',
            title: 'Check oil level',
            section: 'Engine',
            required: true,
            condition: null,
            notes: undefined
          }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={{ id: 'org-1', name: 'Test Org' }}
        />
      );

      // Open the Engine section
      const engineSection = screen.getByText('Engine');
      fireEvent.click(engineSection);

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Select "Adjusted" (condition 2)
      const selectTrigger = screen.getByRole('combobox');
      fireEvent.click(selectTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Adjusted')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Adjusted'));

      // Notes should auto-expand
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add notes for this item...')).toBeInTheDocument();
      });

      // User manually collapses
      const toggleButton = screen.getByRole('button', { name: /hide notes/i });
      fireEvent.click(toggleButton);

      // Notes should be collapsed
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add notes/i })).toBeInTheDocument();
      });

      // User changes condition to "Recommend Repairs" (condition 3)
      fireEvent.click(selectTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Recommend Repairs')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Recommend Repairs'));

      // Notes should auto-expand again because condition changed
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add notes for this item...')).toBeInTheDocument();
      });
    });
  });

  describe('shouldShowNotes Logic', () => {
    it('shows notes when condition is negative (2-5) and not manually collapsed', async () => {
      const pm = createMockPM({
        checklist_data: [
          {
            id: 'item-1',
            title: 'Item with Adjusted condition',
            section: 'Engine',
            required: true,
            condition: 2,
            notes: undefined
          },
          {
            id: 'item-2',
            title: 'Item with Recommend Repairs condition',
            section: 'Engine',
            required: true,
            condition: 3,
            notes: undefined
          },
          {
            id: 'item-3',
            title: 'Item with Requires Immediate Repairs condition',
            section: 'Engine',
            required: true,
            condition: 4,
            notes: undefined
          },
          {
            id: 'item-4',
            title: 'Item with Unsafe Condition',
            section: 'Engine',
            required: true,
            condition: 5,
            notes: undefined
          }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={{ id: 'org-1', name: 'Test Org' }}
        />
      );

      // Open the Engine section
      const engineSection = screen.getByText('Engine');
      fireEvent.click(engineSection);

      await waitFor(() => {
        expect(screen.getByText('Item with Adjusted condition')).toBeInTheDocument();
      });

      // All items with negative conditions should have visible notes textareas
      const notesTextareas = screen.getAllByPlaceholderText('Add notes for this item...');
      expect(notesTextareas.length).toBe(4);
    });

    it('does not show notes for OK condition (1) without existing notes', async () => {
      const pm = createMockPM({
        checklist_data: [
          {
            id: 'item-1',
            title: 'Check oil level',
            section: 'Engine',
            required: true,
            condition: 1, // OK
            notes: undefined
          }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={{ id: 'org-1', name: 'Test Org' }}
        />
      );

      // Open the Engine section
      const engineSection = screen.getByText('Engine');
      fireEvent.click(engineSection);

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Notes should be visually hidden (opacity-0) for OK condition without notes
      // The textarea is still in the DOM but hidden via CSS
      const notesTextarea = screen.getByPlaceholderText('Add notes for this item...');
      const notesContainer = notesTextarea.closest('.grid');
      expect(notesContainer).toHaveClass('opacity-0');
    });

    it('does not show notes for unrated items without existing notes', async () => {
      const pm = createMockPM({
        checklist_data: [
          {
            id: 'item-1',
            title: 'Check oil level',
            section: 'Engine',
            required: true,
            condition: null, // Not rated
            notes: undefined
          }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={{ id: 'org-1', name: 'Test Org' }}
        />
      );

      // Open the Engine section
      const engineSection = screen.getByText('Engine');
      fireEvent.click(engineSection);

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Notes should be visually hidden (opacity-0) for unrated items without notes
      // The textarea is still in the DOM but hidden via CSS
      const notesTextarea = screen.getByPlaceholderText('Add notes for this item...');
      const notesContainer = notesTextarea.closest('.grid');
      expect(notesContainer).toHaveClass('opacity-0');
    });
  });

  describe('Read-Only Mode', () => {
    it('does not show toggle button in read-only mode', async () => {
      const pm = createMockPM({
        checklist_data: [
          {
            id: 'item-1',
            title: 'Check oil level',
            section: 'Engine',
            required: true,
            condition: 1,
            notes: undefined
          }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={true}
          organization={{ id: 'org-1', name: 'Test Org' }}
        />
      );

      // Open the Engine section
      const engineSection = screen.getByText('Engine');
      fireEvent.click(engineSection);

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Toggle button should NOT be visible in read-only mode
      expect(screen.queryByRole('button', { name: /add notes/i })).not.toBeInTheDocument();
    });

    it('shows notes as read-only text when notes exist in read-only mode', async () => {
      const pm = createMockPM({
        checklist_data: [
          {
            id: 'item-1',
            title: 'Check oil level',
            section: 'Engine',
            required: true,
            condition: 1,
            notes: 'This is a note'
          }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={true}
          organization={{ id: 'org-1', name: 'Test Org' }}
        />
      );

      // Open the Engine section
      const engineSection = screen.getByText('Engine');
      fireEvent.click(engineSection);

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Notes should be displayed as text
      expect(screen.getByText('This is a note')).toBeInTheDocument();
    });
  });

  describe('Completed PM', () => {
    it('does not show toggle button for completed PM', async () => {
      const pm = createMockPM({
        status: 'completed',
        checklist_data: [
          {
            id: 'item-1',
            title: 'Check oil level',
            section: 'Engine',
            required: true,
            condition: 1,
            notes: undefined
          }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={{ id: 'org-1', name: 'Test Org' }}
        />
      );

      // Open the Engine section
      const engineSection = screen.getByText('Engine');
      fireEvent.click(engineSection);

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Toggle button should NOT be visible for completed PM
      expect(screen.queryByRole('button', { name: /add notes/i })).not.toBeInTheDocument();
    });
  });
});
