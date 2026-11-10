import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import WorkOrderForm from './WorkOrderForm';
import type { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { serviceDateInputValue, todayServiceDate } from '@/features/work-orders/utils/serviceDate';

const mocks = vi.hoisted(() => ({
  submitForm: vi.fn(),
  submissionProps: { current: null as null | Record<string, unknown> },
  canManageOrganization: vi.fn(() => true),
  quickBooksEnabled: vi.fn(() => true),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { id: 'org-1', userRole: 'owner' } }),
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ getUserTeamIds: () => [] }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ canManageOrganization: mocks.canManageOrganization }),
}));

vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: () => ({ equipment: { canCreateForTeam: () => false } }),
}));

vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: () => mocks.quickBooksEnabled(),
}));

vi.mock('@/features/equipment/components/hooks/useEquipmentSelection', () => ({
  useEquipmentSelection: () => ({
    allEquipment: [
      { id: 'eq-1', name: 'Forklift 1', default_pm_template_id: null, working_hours: 1500 },
      { id: 'eq-2', name: 'Forklift 2', default_pm_template_id: null, working_hours: 200 },
    ],
    preSelectedEquipment: undefined,
    isEquipmentPreSelected: false,
  }),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderSubmission', () => ({
  useWorkOrderSubmission: (props: Record<string, unknown>) => {
    mocks.submissionProps.current = props;
    return { submitForm: mocks.submitForm, isLoading: false, isEditMode: false };
  },
}));

vi.mock('@/features/work-orders/hooks/useLogCompletedChecklist', () => ({
  useLogCompletedChecklist: () => ({
    items: [],
    isLoading: false,
    exceptionCount: 0,
    setCondition: vi.fn(),
    setNotes: vi.fn(),
    reset: vi.fn(),
    getItems: () => [],
  }),
}));

vi.mock('@/features/offline-queue/components/OfflineFormBanner', () => ({
  OfflineFormBanner: () => null,
}));

// Lightweight stand-ins for the data-heavy side-panel controls.
vi.mock('./WorkOrderEquipmentSelector', () => ({
  WorkOrderEquipmentSelector: ({
    values,
    setValue,
    labelAction,
  }: {
    values: Partial<WorkOrderFormData>;
    setValue: (field: 'equipmentId', value: string) => void;
    labelAction?: React.ReactNode;
  }) => (
    <div>
      <span data-testid="equipment-value">{values.equipmentId || 'none'}</span>
      {labelAction}
      <button type="button" onClick={() => setValue('equipmentId', 'eq-1')}>
        Pick Forklift 1
      </button>
    </div>
  ),
}));

vi.mock('./WorkOrderAssignment', () => ({
  WorkOrderAssignment: ({ label, labelAction }: { label?: string; labelAction?: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      {labelAction}
    </div>
  ),
}));

vi.mock('./WorkOrderPMToggle', () => ({
  WorkOrderPMToggle: ({ turnOnSignal }: { turnOnSignal?: number }) => (
    <div data-testid="pm-toggle" data-turn-on-signal={turnOnSignal ?? 0} />
  ),
}));

function renderForm(props: Partial<React.ComponentProps<typeof WorkOrderForm>> = {}) {
  const onClose = vi.fn();
  render(<WorkOrderForm open onClose={onClose} {...props} />);
  return { onClose };
}

function titleInput(): HTMLInputElement {
  return screen.getByLabelText('Title *') as HTMLInputElement;
}

async function fillRequiredFields(title = 'Hydraulic hose swap') {
  fireEvent.change(titleInput(), { target: { value: title } });
  fireEvent.click(screen.getByRole('button', { name: 'Pick Forklift 1' }));
  await waitFor(() => expect(screen.getByTestId('submit-button')).toBeEnabled());
}

function lastSubmitted(): WorkOrderFormData {
  return mocks.submitForm.mock.calls[mocks.submitForm.mock.calls.length - 1][0] as WorkOrderFormData;
}

/** Simulates the save finishing: the submission hook calls back into the form. */
function finishSave() {
  act(() => {
    (mocks.submissionProps.current?.onSuccess as () => void)();
  });
}

describe('WorkOrderForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.canManageOrganization.mockReturnValue(true);
    mocks.quickBooksEnabled.mockReturnValue(true);
    mocks.submitForm.mockResolvedValue(undefined);
  });

  describe('New Work Order mode', () => {
    it('focuses the title on open and only needs a title and equipment to submit', async () => {
      renderForm();

      await waitFor(() => expect(titleInput()).toHaveFocus());
      expect(screen.getByTestId('submit-button')).toBeDisabled();

      await fillRequiredFields();
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => expect(mocks.submitForm).toHaveBeenCalledTimes(1));
      expect(lastSubmitted()).toMatchObject({
        title: 'Hydraulic hose swap',
        equipmentId: 'eq-1',
        priority: 'medium',
        isHistorical: false,
        description: '',
      });
    });

    it('fills and then appends the title from symptom chips', () => {
      renderForm();

      fireEvent.click(screen.getByRole('button', { name: 'Hydraulic Leak' }));
      expect(titleInput().value).toBe('Hydraulic Leak');

      fireEvent.click(screen.getByRole('button', { name: 'Electrical' }));
      expect(titleInput().value).toBe('Hydraulic Leak, Electrical');

      // A second tap on the same chip does not repeat it.
      fireEvent.click(screen.getByRole('button', { name: 'Electrical' }));
      expect(titleInput().value).toBe('Hydraulic Leak, Electrical');
    });

    it('sets priority with one tap on a pill instead of a dropdown', async () => {
      renderForm();

      expect(screen.getByRole('radio', { name: 'Medium' })).toBeChecked();
      fireEvent.click(screen.getByRole('radio', { name: 'High' }));

      await fillRequiredFields();
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => expect(mocks.submitForm).toHaveBeenCalled());
      expect(lastSubmitted().priority).toBe('high');
    });

    it('sets the due date from a quick preset', async () => {
      renderForm();

      fireEvent.click(screen.getByRole('button', { name: 'Due tomorrow' }));

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expected = serviceDateInputValue(tomorrow);
      await waitFor(() => {
        expect((screen.getByLabelText('Complete by') as HTMLInputElement).value).toBe(expected);
      });
    });

    it('submits with Ctrl+Enter', async () => {
      renderForm();
      await fillRequiredFields();

      fireEvent.keyDown(titleInput(), { key: 'Enter', ctrlKey: true });

      await waitFor(() => expect(mocks.submitForm).toHaveBeenCalledTimes(1));
    });

    it('submits with Ctrl+Enter even when focus has dropped to the page body', async () => {
      renderForm();
      await fillRequiredFields();
      (document.activeElement as HTMLElement | null)?.blur();

      fireEvent.keyDown(document.body, { key: 'Enter', metaKey: true });

      await waitFor(() => expect(mocks.submitForm).toHaveBeenCalledTimes(1));
    });

    it('does not submit on Ctrl+Enter typed inside another open dialog', async () => {
      renderForm();
      await fillRequiredFields();

      const otherDialog = document.createElement('div');
      otherDialog.setAttribute('role', 'dialog');
      const input = document.createElement('input');
      otherDialog.appendChild(input);
      document.body.appendChild(otherDialog);

      try {
        fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
        await Promise.resolve();
        expect(mocks.submitForm).not.toHaveBeenCalled();
      } finally {
        otherDialog.remove();
      }
    });

    it('asks the PM control to turn on when the Preventative Maintenance chip is tapped', () => {
      renderForm();
      expect(screen.getByTestId('pm-toggle')).toHaveAttribute('data-turn-on-signal', '0');

      fireEvent.click(screen.getByRole('button', { name: 'Preventative Maintenance' }));

      expect(titleInput().value).toBe('Preventative Maintenance');
      expect(screen.getByTestId('pm-toggle')).toHaveAttribute('data-turn-on-signal', '1');
    });

    it('hides the Log Completed mode from users who cannot record historical work', () => {
      mocks.canManageOrganization.mockReturnValue(false);
      renderForm();

      expect(screen.queryByRole('radio', { name: 'Log Completed' })).not.toBeInTheDocument();
    });
  });

  describe('Log Completed mode', () => {
    it('logs a completed work order dated today and kept out of QuickBooks by default', async () => {
      renderForm();

      fireEvent.click(screen.getByRole('radio', { name: 'Log Completed' }));

      const serviceDate = screen.getByLabelText('Completed / Service Date *') as HTMLInputElement;
      expect(serviceDate.value).toBe(serviceDateInputValue(todayServiceDate()));
      expect(screen.queryByLabelText('Complete by')).not.toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Ready to sync / bill in QuickBooks' })).not.toBeChecked();
      expect(screen.getByText(/Historical Only \/ Do Not Sync/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Attach Paper Sheet \/ Photo/ })).toBeInTheDocument();

      await fillRequiredFields('Annual PM');
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => expect(mocks.submitForm).toHaveBeenCalledTimes(1));
      const submitted = lastSubmitted();
      expect(submitted).toMatchObject({
        isHistorical: true,
        status: 'completed',
        quickBooksSyncReady: false,
      });
      expect(serviceDateInputValue(submitted.completedDate)).toBe(serviceDateInputValue(todayServiceDate()));
      expect(submitted.historicalStartDate?.getTime()).toBe(submitted.completedDate?.getTime());
    });

    it('uses the exact past service date and the meter reading from the sheet', async () => {
      renderForm();
      fireEvent.click(screen.getByRole('radio', { name: 'Log Completed' }));

      fireEvent.change(screen.getByLabelText('Completed / Service Date *'), {
        target: { value: '2024-03-05' },
      });
      await fillRequiredFields('Paper PM');
      fireEvent.change(screen.getByLabelText('Machine Hours at Service'), { target: { value: '320.5' } });

      // The reading is below the machine's current 1,500 hrs, so the meter will not move.
      expect(screen.getByText(/Current: 1,500 hrs\./)).toBeInTheDocument();
      expect(screen.getByText(/logged to history only/)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => expect(mocks.submitForm).toHaveBeenCalledTimes(1));
      const submitted = lastSubmitted();
      expect(serviceDateInputValue(submitted.completedDate)).toBe('2024-03-05');
      expect(submitted.equipmentWorkingHours).toBe(320.5);
    });

    it('requires the service date', async () => {
      renderForm();
      fireEvent.click(screen.getByRole('radio', { name: 'Log Completed' }));
      await fillRequiredFields('Paper PM');

      fireEvent.change(screen.getByLabelText('Completed / Service Date *'), { target: { value: '' } });

      await waitFor(() => expect(screen.getByTestId('submit-button')).toBeDisabled());
    });

    it('opts a recent unbilled job into QuickBooks only when the switch is turned on', async () => {
      renderForm();
      fireEvent.click(screen.getByRole('radio', { name: 'Log Completed' }));
      await fillRequiredFields('Unbilled repair');

      fireEvent.click(screen.getByRole('switch', { name: 'Ready to sync / bill in QuickBooks' }));
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => expect(mocks.submitForm).toHaveBeenCalledTimes(1));
      expect(lastSubmitted().quickBooksSyncReady).toBe(true);
    });

    it('hides the QuickBooks control when the integration is off', () => {
      mocks.quickBooksEnabled.mockReturnValue(false);
      renderForm();
      fireEvent.click(screen.getByRole('radio', { name: 'Log Completed' }));

      expect(screen.queryByRole('switch', { name: 'Ready to sync / bill in QuickBooks' })).not.toBeInTheDocument();
    });
  });

  describe('rapid entry', () => {
    it('closes the dialog after saving when Create another is off', async () => {
      const { onClose } = renderForm();
      await fillRequiredFields();

      fireEvent.click(screen.getByTestId('submit-button'));
      await waitFor(() => expect(mocks.submitForm).toHaveBeenCalled());
      finishSave();

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mocks.submissionProps.current).toMatchObject({ keepOpen: false, rapidEntry: false });
    });

    it('only offers pins while Create another is on', () => {
      renderForm();

      expect(screen.queryByRole('button', { name: /Pin Equipment/ })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('switch', { name: 'Create another' }));

      expect(screen.getByRole('button', { name: /Pin Equipment/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pin Assignee/ })).toBeInTheDocument();
      expect(mocks.submissionProps.current).toMatchObject({ keepOpen: true, rapidEntry: true });
    });

    it('stays open, clears the record fields, keeps the mode and pinned fields, and refocuses the title', async () => {
      const { onClose } = renderForm();

      fireEvent.click(screen.getByRole('switch', { name: 'Create another' }));
      fireEvent.click(screen.getByRole('radio', { name: 'Log Completed' }));
      fireEvent.change(screen.getByLabelText('Completed / Service Date *'), {
        target: { value: '2024-03-05' },
      });
      await fillRequiredFields('First sheet');
      fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Changed filters' } });
      fireEvent.change(screen.getByLabelText('Machine Hours at Service'), { target: { value: '410' } });

      fireEvent.click(screen.getByRole('button', { name: /Pin Equipment/ }));
      fireEvent.click(screen.getByRole('button', { name: /Pin Completed Date/ }));

      fireEvent.click(screen.getByTestId('submit-button'));
      await waitFor(() => expect(mocks.submitForm).toHaveBeenCalledTimes(1));
      finishSave();

      expect(onClose).not.toHaveBeenCalled();
      await waitFor(() => expect(titleInput().value).toBe(''));
      expect((screen.getByLabelText('Description') as HTMLTextAreaElement).value).toBe('');
      expect((screen.getByLabelText('Machine Hours at Service') as HTMLInputElement).value).toBe('');
      // Mode and pinned fields carry over to the next record.
      expect(screen.getByRole('radio', { name: 'Log Completed' })).toBeChecked();
      expect(screen.getByTestId('equipment-value')).toHaveTextContent('eq-1');
      expect((screen.getByLabelText('Completed / Service Date *') as HTMLInputElement).value).toBe('2024-03-05');
      await waitFor(() => expect(titleInput()).toHaveFocus());
    });

    it('clears unpinned equipment and resets the service date to today for the next record', async () => {
      renderForm();

      fireEvent.click(screen.getByRole('switch', { name: 'Create another' }));
      fireEvent.click(screen.getByRole('radio', { name: 'Log Completed' }));
      fireEvent.change(screen.getByLabelText('Completed / Service Date *'), {
        target: { value: '2024-03-05' },
      });
      await fillRequiredFields('First sheet');

      fireEvent.click(screen.getByTestId('submit-button'));
      await waitFor(() => expect(mocks.submitForm).toHaveBeenCalledTimes(1));
      finishSave();

      await waitFor(() => expect(screen.getByTestId('equipment-value')).toHaveTextContent('none'));
      expect((screen.getByLabelText('Completed / Service Date *') as HTMLInputElement).value).toBe(
        serviceDateInputValue(todayServiceDate()),
      );
    });

    it('remembers the Create another choice for the next time the dialog opens', () => {
      const first = render(<WorkOrderForm open onClose={vi.fn()} />);
      fireEvent.click(screen.getByRole('switch', { name: 'Create another' }));
      first.unmount();

      render(<WorkOrderForm open onClose={vi.fn()} />);

      expect(screen.getByRole('switch', { name: 'Create another' })).toBeChecked();
    });
  });
});
