import { screen, fireEvent, waitFor, within } from '@vitest-harness/utils/test-utils';
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

const createMockPM = (overrides: Partial<PreventativeMaintenance> = {}): PreventativeMaintenance => {
  const defaults: PreventativeMaintenance = {
    id: 'pm-1',
    work_order_id: 'wo-1',
    equipment_id: 'eq-1',
    organization_id: 'org-1',
    template_id: null,
    status: 'in_progress',
    notes: '',
    checklist_data: [
      { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: null, notes: undefined },
    ] as unknown as PreventativeMaintenance['checklist_data'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'user-1',
    created_by_name: null,
    completed_at: null,
    completed_by: null,
    completed_by_name: null,
    equipment_working_hours_at_completion: null,
    historical_completion_date: null,
    historical_notes: null,
    is_historical: false,
  };
  return { ...defaults, ...overrides };
};

const mockOnUpdate = vi.fn();

describe('PMChecklistComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('section headers', () => {
    it('renders each section as one readable trigger row with a decorative progress strip', () => {
      const pm = createMockPM({
        checklist_data: [
          { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: 1, notes: undefined },
          { id: 'item-2', title: 'Inspect belts', section: 'Engine', required: true, condition: 2, notes: undefined },
          { id: 'item-3', title: 'Look for leaks', section: 'Engine', required: true, condition: 5, notes: undefined },
          { id: 'item-4', title: 'Test horn', section: 'Safety', required: true, condition: null, notes: undefined },
        ] as unknown as PreventativeMaintenance['checklist_data'],
      });

      renderPMChecklist(pm, { onUpdate: mockOnUpdate });

      const engineTrigger = screen.getByRole('button', { name: /engine/i });

      expect(within(engineTrigger).getByText('Engine')).toBeInTheDocument();
      expect(within(engineTrigger).getByText('3/3 items completed (100%)')).toBeInTheDocument();
      const flaggedSummary = within(engineTrigger).getByText('2 flagged');
      expect(flaggedSummary).toBeInTheDocument();
      expect(flaggedSummary).toHaveClass('bg-warning/15', 'text-warning');
      expect(engineTrigger.closest('.rounded-lg')).toHaveClass('border-warning/40');

      const decorativeProgress = engineTrigger.querySelector('[aria-hidden="true"] .relative');
      expect(decorativeProgress).toBeInTheDocument();
      expect(decorativeProgress).toHaveClass('h-1.5');
      expect(decorativeProgress).not.toHaveClass('absolute');
      expect(engineTrigger.querySelector('.absolute.inset-0.h-full')).toBeNull();
    });
  });

  describe('notes auto-expand behavior', () => {
    it('auto-expands notes when selecting a negative condition (2-5) and shows existing notes', async () => {
      const pm = createMockPM();
      renderPMChecklist(pm, { onUpdate: mockOnUpdate });

      await openPmSectionAndWaitForItem('Engine', 'Check oil level');

      // Notes stay hidden until an item is flagged.
      expect(screen.queryByPlaceholderText('Add notes for this item...')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('radio', { name: 'Attention' }));

      expect(await screen.findByPlaceholderText('Add notes for this item...')).toBeInTheDocument();
      // Flagging reveals the severity scale, defaulting to "Recommend Repairs".
      expect(screen.getByRole('radio', { name: 'Recommend Repairs' })).toBeChecked();

      fireEvent.click(screen.getByRole('radio', { name: 'Adjusted' }));
      expect(screen.getByRole('radio', { name: 'Adjusted' })).toBeChecked();
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

    it('collapses existing notes to a one-line preview and expands them again', async () => {
      const pm = createMockPM({
        checklist_data: [
          { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: 1, notes: 'Topped up 1 qt' }
        ]
      });

      renderPMChecklist(pm, { onUpdate: mockOnUpdate });
      await openPmSectionAndWaitForItem('Engine', 'Check oil level');

      expect(screen.queryByText('Note:')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /hide notes/i }));
      expect(await screen.findByText('Note:')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /show notes/i }));
      await waitFor(() => expect(screen.queryByText('Note:')).not.toBeInTheDocument());
    });

    it('respects user manual collapse preference over auto-expand for negative conditions', async () => {
      const pm = createMockPM({
        checklist_data: [
          { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: 2, notes: undefined }
        ] as unknown as PreventativeMaintenance['checklist_data']
      });

      renderPMChecklist(pm, { onUpdate: mockOnUpdate });
      await openPmSectionAndWaitForItem('Engine', 'Check oil level');

      expect(screen.getByPlaceholderText('Add notes for this item...')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /hide notes/i }));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Add notes for this item...')).not.toBeInTheDocument();
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

      // One note input per flagged item.
      expect(screen.getAllByPlaceholderText('Add notes for this item...')).toHaveLength(4);

      await openPmSectionAndWaitForItem('Safety', 'OK item');

      // OK, N/A and unrated items do not add note inputs.
      expect(screen.getAllByPlaceholderText('Add notes for this item...')).toHaveLength(4);
    });
  });

  describe('one-tap assessment pills', () => {
    it('rates an item with a single tap and dims it once it is OK', async () => {
      const pm = createMockPM({
        checklist_data: [
          { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: null, notes: undefined },
        ] as unknown as PreventativeMaintenance['checklist_data'],
      });

      renderPMChecklist(pm, { onUpdate: mockOnUpdate });
      await openPmSectionAndWaitForItem('Engine', 'Check oil level');

      const title = screen.getByText('Check oil level');
      expect(title).not.toHaveClass('text-muted-foreground');

      fireEvent.click(screen.getByRole('radio', { name: 'OK' }));

      expect(screen.getByRole('radio', { name: 'OK' })).toBeChecked();
      expect(title).toHaveClass('text-muted-foreground');
      expect(screen.getByText('1/1 items completed (100%)')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('radio', { name: 'Not Applicable' }));
      expect(screen.getByRole('radio', { name: 'Not Applicable' })).toBeChecked();
    });

    it('marks only the unrated items in a section OK and keeps flagged findings', async () => {
      const pm = createMockPM({
        checklist_data: [
          { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: null, notes: undefined },
          { id: 'item-2', title: 'Inspect belts', section: 'Engine', required: true, condition: 4, notes: undefined },
          { id: 'item-3', title: 'Test horn', section: 'Safety', required: true, condition: null, notes: undefined },
        ] as unknown as PreventativeMaintenance['checklist_data'],
      });

      renderPMChecklist(pm, { onUpdate: mockOnUpdate });

      fireEvent.click(screen.getByRole('button', { name: 'Mark Engine section OK' }));

      expect(screen.getByText('2/2 items completed (100%)')).toBeInTheDocument();
      expect(screen.getByText('1 flagged')).toBeInTheDocument();
      // Nothing left to mark in Engine; Safety is untouched.
      expect(screen.queryByRole('button', { name: 'Mark Engine section OK' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mark Safety section OK' })).toBeInTheDocument();
      expect(screen.getByText('0/1 items completed (0%)')).toBeInTheDocument();
    });
  });

  describe('follow-up work order', () => {
    it('offers a pre-filled follow-up work order on flagged items of an existing work order', async () => {
      const requests: unknown[] = [];
      const listener = (event: Event) => requests.push((event as CustomEvent).detail);
      window.addEventListener('equipqr:new-work-order', listener);

      const pm = createMockPM({
        checklist_data: [
          { id: 'item-1', title: 'Check oil level', section: 'Engine', required: true, condition: 1, notes: undefined },
          { id: 'item-2', title: 'Inspect belts', section: 'Engine', required: true, condition: 4, notes: 'Frayed edge' },
        ] as unknown as PreventativeMaintenance['checklist_data'],
      });

      try {
        renderPMChecklist(pm, {
          onUpdate: mockOnUpdate,
          workOrder: {
            id: 'wo-1',
            title: 'Quarterly PM',
            description: 'desc',
            status: 'in_progress',
            priority: 'medium',
            created_date: '2024-01-01T00:00:00Z',
            equipment_id: 'eq-1',
            organization_id: 'org-1',
          },
        });
        await openPmSectionAndWaitForItem('Engine', 'Inspect belts');

        // Only the flagged item gets the action.
        const followUps = screen.getAllByRole('button', { name: /create follow-up work order/i });
        expect(followUps).toHaveLength(1);

        fireEvent.click(followUps[0]);

        expect(requests).toHaveLength(1);
        expect(requests[0]).toMatchObject({
          equipmentId: pm.equipment_id,
          title: 'Repair: Inspect belts',
          priority: 'high',
        });
        expect((requests[0] as { description: string }).description).toContain('Frayed edge');
        expect((requests[0] as { description: string }).description).toContain('/dashboard/work-orders/');
      } finally {
        window.removeEventListener('equipqr:new-work-order', listener);
      }
    });

    it('does not offer a follow-up when there is no work order to link back to', async () => {
      const pm = createMockPM({
        checklist_data: [
          { id: 'item-2', title: 'Inspect belts', section: 'Engine', required: true, condition: 4, notes: undefined },
        ] as unknown as PreventativeMaintenance['checklist_data'],
      });

      renderPMChecklist(pm, { onUpdate: mockOnUpdate });
      await openPmSectionAndWaitForItem('Engine', 'Inspect belts');

      expect(screen.queryByRole('button', { name: /create follow-up work order/i })).not.toBeInTheDocument();
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

  describe('general notes', () => {
    it('accepts typed general notes', async () => {
      const pm = createMockPM();
      renderPMChecklist(pm, { onUpdate: mockOnUpdate });

      expect(screen.getByText('General Notes')).toBeInTheDocument();

      const generalNotes = screen.getByPlaceholderText('Add general notes about this PM...');
      fireEvent.change(generalNotes, { target: { value: 'Initial' } });

      expect(generalNotes).toHaveValue('Initial');
    });

    it('shows read-only general notes when PM is completed', async () => {
      const pm = createMockPM({ status: 'completed' });
      renderPMChecklist(pm, { onUpdate: mockOnUpdate });

      expect(
        screen.getByText(/this pm checklist is completed\. general notes are read-only after completion\./i),
      ).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Add general notes about this PM...')).not.toBeInTheDocument();
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

    it('shows helper copy, the new label, and requires confirmation before reverting PM', async () => {
      const pm = createMockPM({ status: 'completed', notes: 'Completed PM summary' });
      renderPMChecklist(pm, {
        onUpdate: mockOnUpdate,
        isAdmin: true,
        workOrder: completedWorkOrder,
      });

      expect(screen.getByText('Completed PM summary')).toBeInTheDocument();
      expect(
        screen.getByText(/need to edit the completed checklist\?/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/set the checklist back to pending and reopen the work order to accepted\./i),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^revert pm$/i })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /revert pm completion/i }),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /^revert pm$/i }));

      const confirmDialog = screen.getByRole('alertdialog');
      expect(confirmDialog).toBeInTheDocument();
      expect(screen.getByText(/set the pm checklist back to pending/i)).toBeInTheDocument();
      expect(screen.getByText(/reopen this work order to accepted/i)).toBeInTheDocument();
      expect(workOrderRevertService.revertPMCompletion).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

      expect(workOrderRevertService.revertPMCompletion).not.toHaveBeenCalled();
    });

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

      fireEvent.click(screen.getByRole('button', { name: /^revert pm$/i }));

      expect(
        screen.getByText(/reopen this work order to accepted/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/set the pm checklist back to pending/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /yes, revert pm/i }));

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

    it('hides the revert PM control for non-admin users', () => {
      const pm = createMockPM({ status: 'completed' });
      renderPMChecklist(pm, {
        onUpdate: mockOnUpdate,
        isAdmin: false,
        workOrder: completedWorkOrder,
      });

      expect(screen.queryByRole('button', { name: /^revert pm$/i })).not.toBeInTheDocument();
      expect(
        screen.queryByText(/need to edit the completed checklist\?/i),
      ).not.toBeInTheDocument();
    });
  });
});
