import { screen, fireEvent, waitFor } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';
import type { WorkOrderData } from '@/features/work-orders/types/workOrderDetails';
import { workOrderRevertService } from '@/features/work-orders/services/workOrderRevertService';
import { toast } from 'sonner';
import {
  openPmSection,
  openPmSectionAndWaitForItem,
  renderPMChecklist,
} from './pm-checklist-test-helpers';

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

const mockToggleListening = vi.fn();

vi.mock('@/hooks/useVoiceTextAppender', () => ({
  useVoiceTextAppender: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => ({
    isSupported: true,
    isListening: false,
    error: null,
    interimTranscript: '',
    toggleListening: () => {
      mockToggleListening();
      if (!disabled) {
        onChange(`${value}${value.trim() ? ' ' : ''}dictated pm note`);
      }
    },
    canUseVoice: !disabled,
  }),
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

describe('PMChecklistComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notes auto-expand behavior', () => {
    it('auto-expands notes when selecting a negative condition (2-5) and shows existing notes', async () => {
      const pm = createMockPM();
      renderPMChecklist(pm, { onUpdate: mockOnUpdate });

      await openPmSectionAndWaitForItem('Engine', 'Check oil level');

      const selectTrigger = screen.getByRole('combobox');
      fireEvent.click(selectTrigger);

      const adjusted = await screen.findByRole('option', { name: /adjusted/i });
      fireEvent.click(adjusted);

      expect(await screen.findByPlaceholderText('Add notes for this item...')).toBeInTheDocument();
    });

    it('shows notes when item has existing notes regardless of condition', async () => {
      const pm = createMockPM({
        checklist_data: [
          { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: 1, notes: 'Pre-existing notes' }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      renderPMChecklist(pm, { onUpdate: mockOnUpdate });
      openPmSection('Engine');

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

      renderPMChecklist(pm, { onUpdate: mockOnUpdate });
      await openPmSectionAndWaitForItem('Engine', 'Check oil level');

      const toggleButton = screen.getByRole('button', { name: /add notes/i });
      expect(toggleButton).toBeInTheDocument();

      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add notes for this item...')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /hide notes/i }));
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

      renderPMChecklist(pm, { onUpdate: mockOnUpdate });
      await openPmSectionAndWaitForItem('Engine', 'Check oil level');

      const notesTextarea = screen.getByPlaceholderText('Add notes for this item...');
      const notesContainer = notesTextarea.closest('.grid');
      expect(notesContainer).toHaveClass('opacity-100');

      fireEvent.click(screen.getByRole('button', { name: /hide notes/i }));

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
          { id: 'item-6', title: 'N/A item', section: 'Safety', required: true, condition: 6, notes: undefined },
          { id: 'item-7', title: 'Unrated item', section: 'Safety', required: true, condition: null, notes: undefined }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      renderPMChecklist(pm, { onUpdate: mockOnUpdate });

      await openPmSectionAndWaitForItem('Engine', 'Adjusted item');

      const engineNotes = screen.getAllByPlaceholderText('Add notes for this item...');
      const visibleEngineNotes = engineNotes.filter(textarea =>
        textarea.closest('.grid')?.classList.contains('opacity-100')
      );
      expect(visibleEngineNotes.length).toBe(4);

      await openPmSectionAndWaitForItem('Safety', 'OK item');

      const allNotes = screen.getAllByPlaceholderText('Add notes for this item...');
      const hiddenNotes = allNotes.filter(textarea =>
        textarea.closest('.grid')?.classList.contains('opacity-0')
      );
      expect(hiddenNotes.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('read-only and completed modes', () => {
    it('does not show toggle button in read-only mode but displays existing notes as text', async () => {
      const pm = createMockPM({
        checklist_data: [
          { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: 1, notes: 'This is a note' }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      renderPMChecklist(pm, { onUpdate: mockOnUpdate, readOnly: true });
      await openPmSectionAndWaitForItem('Engine', 'Check oil level');

      expect(screen.queryByRole('button', { name: /add notes/i })).not.toBeInTheDocument();
      expect(screen.getByText('This is a note')).toBeInTheDocument();
    });

    it('does not show toggle button for completed PM', async () => {
      const pm = createMockPM({
        status: 'completed',
        checklist_data: [
          { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: 1, notes: undefined }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      renderPMChecklist(pm, { onUpdate: mockOnUpdate });
      await openPmSectionAndWaitForItem('Engine', 'Check oil level');

      expect(screen.queryByRole('button', { name: /add notes/i })).not.toBeInTheDocument();
    });
  });

  describe('general notes voice dictation', () => {
    it('shows voice control on general notes and appends dictated text', async () => {
      const pm = createMockPM();
      renderPMChecklist(pm, { onUpdate: mockOnUpdate });

      expect(screen.getByText('General Notes')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start voice input' })).toBeInTheDocument();

      const generalNotes = screen.getByPlaceholderText('Add general notes about this PM...');
      fireEvent.change(generalNotes, { target: { value: 'Initial' } });
      fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }));

      expect(mockToggleListening).toHaveBeenCalledTimes(1);
      expect(generalNotes).toHaveValue('Initial dictated pm note');
    });

    it('hides voice control when PM is completed', async () => {
      const pm = createMockPM({ status: 'completed' });
      renderPMChecklist(pm, { onUpdate: mockOnUpdate });

      expect(screen.getByPlaceholderText('Add general notes about this PM...')).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Start voice input' })).not.toBeInTheDocument();
    });
  });

  describe('revert PM completion', () => {
    const completedWorkOrder = {
      id: 'wo-1',
      title: 'Completed WO',
      description: '',
      status: 'completed',
      priority: 'medium',
      created_date: '2024-01-01T00:00:00Z',
      equipment_id: 'eq-1',
      organization_id: 'org-1',
    } satisfies WorkOrderData;

    it('passes terminal work order context and explains reopen in confirm dialog', async () => {
      vi.mocked(workOrderRevertService.revertPMCompletion).mockResolvedValue({
        success: true,
        old_status: 'completed',
        new_status: 'pending',
        work_order_reopened: true,
        work_order_old_status: 'completed',
        work_order_new_status: 'accepted',
      });

      const pm = createMockPM({ status: 'completed' });
      renderPMChecklist(pm, {
        onUpdate: mockOnUpdate,
        isAdmin: true,
        workOrder: completedWorkOrder,
      });

      fireEvent.click(screen.getByRole('button', { name: /revert pm completion/i }));

      expect(
        screen.getByText(/reopen this work order to accepted/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/back to pending/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /yes, revert completion/i }));

      await waitFor(() => {
        expect(workOrderRevertService.revertPMCompletion).toHaveBeenCalledWith('pm-1', {
          reason: 'PM completion reverted by admin',
          workOrderId: 'wo-1',
          workOrderStatus: 'completed',
        });
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringMatching(/work order reopened to accepted/i),
        );
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });
  });
});
