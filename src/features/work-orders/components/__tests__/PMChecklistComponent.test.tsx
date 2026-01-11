import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PMChecklistComponent from '../PMChecklistComponent';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';

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

const createMockPM = (overrides?: Partial<PreventativeMaintenance>): PreventativeMaintenance => ({
  id: 'pm-1',
  work_order_id: 'wo-1',
  equipment_id: 'eq-1',
  template_id: null,
  status: 'in_progress',
  notes: '',
  checklist_data: [
    { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: null, notes: undefined }
  ] as unknown as PreventativeMaintenance['checklist_data'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  completed_at: null,
  ...overrides
});

const mockOnUpdate = vi.fn();
const defaultOrg = { id: 'org-1', name: 'Test Org' };

describe('PMChecklistComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notes auto-expand behavior', () => {
    it('auto-expands notes when selecting a negative condition (2-5) and shows existing notes', async () => {
      const pm = createMockPM();

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={defaultOrg}
        />
      );

      // Open the Engine section
      fireEvent.click(screen.getByText('Engine'));

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Select "Adjusted" (condition 2 - negative)
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

    it('shows notes when item has existing notes regardless of condition', async () => {
      const pm = createMockPM({
        checklist_data: [
          { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: 1, notes: 'Pre-existing notes' }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={defaultOrg}
        />
      );

      fireEvent.click(screen.getByText('Engine'));

      await waitFor(() => {
        const notesTextarea = screen.getByPlaceholderText('Add notes for this item...');
        expect(notesTextarea).toHaveValue('Pre-existing notes');
      });
    });
  });

  describe('notes toggle button', () => {
    it('allows manual toggle of notes visibility and respects user preference', async () => {
      const pm = createMockPM({
        checklist_data: [
          { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: 1, notes: undefined }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={defaultOrg}
        />
      );

      fireEvent.click(screen.getByText('Engine'));

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Toggle button should be visible
      const toggleButton = screen.getByRole('button', { name: /add notes/i });
      expect(toggleButton).toBeInTheDocument();

      // Click to show notes
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add notes for this item...')).toBeInTheDocument();
      });

      // Click again to hide
      fireEvent.click(screen.getByRole('button', { name: /hide notes/i }));

      // Toggle again to verify it still works
      fireEvent.click(screen.getByRole('button', { name: /add notes/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add notes for this item...')).toBeInTheDocument();
      });
    });

    it('respects user manual collapse preference over auto-expand for negative conditions', async () => {
      const pm = createMockPM({
        checklist_data: [
          { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: 2, notes: undefined }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={defaultOrg}
        />
      );

      fireEvent.click(screen.getByText('Engine'));

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // Notes should be auto-expanded due to negative condition
      const notesTextarea = screen.getByPlaceholderText('Add notes for this item...');
      const notesContainer = notesTextarea.closest('.grid');
      expect(notesContainer).toHaveClass('opacity-100');

      // User manually collapses
      fireEvent.click(screen.getByRole('button', { name: /hide notes/i }));

      // Notes container should now be hidden
      await waitFor(() => {
        expect(notesContainer).toHaveClass('opacity-0');
      });
    });
  });

  describe('shouldShowNotes logic', () => {
    it('shows notes for all negative conditions (2-5) and hides for OK/unrated without notes', async () => {
      const pm = createMockPM({
        checklist_data: [
          { id: 'item-1', title: 'Adjusted item', section: 'Engine', required: true, condition: 2, notes: undefined },
          { id: 'item-2', title: 'Recommend Repairs item', section: 'Engine', required: true, condition: 3, notes: undefined },
          { id: 'item-3', title: 'Immediate Repairs item', section: 'Engine', required: true, condition: 4, notes: undefined },
          { id: 'item-4', title: 'Unsafe item', section: 'Engine', required: true, condition: 5, notes: undefined },
          { id: 'item-5', title: 'OK item', section: 'Safety', required: true, condition: 1, notes: undefined },
          { id: 'item-6', title: 'Unrated item', section: 'Safety', required: true, condition: null, notes: undefined }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={defaultOrg}
        />
      );

      // Check Engine section (negative conditions)
      fireEvent.click(screen.getByText('Engine'));

      await waitFor(() => {
        expect(screen.getByText('Adjusted item')).toBeInTheDocument();
      });

      // All 4 negative condition items should have visible notes
      const engineNotes = screen.getAllByPlaceholderText('Add notes for this item...');
      const visibleEngineNotes = engineNotes.filter(textarea => 
        textarea.closest('.grid')?.classList.contains('opacity-100')
      );
      expect(visibleEngineNotes.length).toBe(4);

      // Check Safety section (OK and unrated)
      fireEvent.click(screen.getByText('Safety'));

      await waitFor(() => {
        expect(screen.getByText('OK item')).toBeInTheDocument();
      });

      // OK and unrated items should have hidden notes containers
      const allNotes = screen.getAllByPlaceholderText('Add notes for this item...');
      const hiddenNotes = allNotes.filter(textarea => 
        textarea.closest('.grid')?.classList.contains('opacity-0')
      );
      expect(hiddenNotes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('read-only and completed modes', () => {
    it('does not show toggle button in read-only mode but displays existing notes as text', async () => {
      const pm = createMockPM({
        checklist_data: [
          { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: 1, notes: 'This is a note' }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={true}
          organization={defaultOrg}
        />
      );

      fireEvent.click(screen.getByText('Engine'));

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      // No toggle button in read-only mode
      expect(screen.queryByRole('button', { name: /add notes/i })).not.toBeInTheDocument();
      
      // Notes should be displayed as text
      expect(screen.getByText('This is a note')).toBeInTheDocument();
    });

    it('does not show toggle button for completed PM', async () => {
      const pm = createMockPM({
        status: 'completed',
        checklist_data: [
          { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: 1, notes: undefined }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      render(
        <PMChecklistComponent
          pm={pm}
          onUpdate={mockOnUpdate}
          readOnly={false}
          organization={defaultOrg}
        />
      );

      fireEvent.click(screen.getByText('Engine'));

      await waitFor(() => {
        expect(screen.getByText('Check oil level')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /add notes/i })).not.toBeInTheDocument();
    });
  });
});
