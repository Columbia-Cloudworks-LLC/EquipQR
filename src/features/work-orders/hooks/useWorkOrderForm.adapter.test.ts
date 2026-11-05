import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';

const toasts = vi.hoisted(() => [] as { error: unknown; context: string }[]);
vi.mock('@/utils/errorHandling', () => ({
  showErrorToast: (error: unknown, context: string) => {
    toasts.push({ error, context });
    return { message: String(error) };
  },
}));

const { useWorkOrderForm } = await import('./useWorkOrderForm');

function workOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: 'wo-1',
    title: 'Inspect pump',
    description: 'Check seals',
    status: 'submitted',
    priority: 'high',
    equipment_id: 'eq-1',
    organization_id: 'org-1',
    created_by: 'user-1',
    created_by_admin: null,
    created_by_name: null,
    created_date: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    due_date: null,
    due_date_has_time: false,
    has_pm: false,
    is_historical: false,
    pm_required: false,
    acceptance_date: null,
    assignee_id: 'tech-1',
    assignee_name: null,
    completed_date: null,
    estimated_hours: 4,
    equipment_working_hours_at_creation: null,
    historical_notes: null,
    historical_start_date: null,
    invoice_balance_cents: null,
    invoice_due_date: null,
    invoice_last_synced_at: null,
    invoice_paid_at: null,
    invoice_sent_at: null,
    invoice_status: null,
    invoice_sync_error: null,
    primary_image_id: null,
    quickbooks_invoice_environment: null,
    quickbooks_invoice_id: null,
    quickbooks_invoice_number: null,
    quickbooks_realm_id: null,
    ...overrides,
  };
}

type Props = Parameters<typeof useWorkOrderForm>[0];

function render(props: Props) {
  return renderHook((p: Props) => useWorkOrderForm(p), { initialProps: props });
}

describe('useWorkOrderForm', () => {
  beforeEach(() => {
    toasts.length = 0;
  });

  describe('initial values', () => {
    it('starts a new work order from defaults and the chosen equipment', () => {
      const { result } = render({ isOpen: true, equipmentId: 'eq-9' });

      expect(result.current.isEditMode).toBe(false);
      expect(result.current.initialValues).toMatchObject({
        title: '',
        description: '',
        equipmentId: 'eq-9',
        priority: 'medium',
        dueDate: undefined,
        dueDateHasTime: false,
        hasPM: false,
        pmTemplateId: null,
        assigneeId: null,
        isHistorical: false,
      });
    });

    it('prefills a due date for new work orders', () => {
      const { result } = render({ isOpen: true, prefillDueDate: '2026-08-01', prefillHasTime: false });

      expect(result.current.form.values.dueDate).toBe('2026-08-01');
      expect(result.current.form.values.dueDateHasTime).toBe(false);
    });

    it('loads an existing work order for editing', () => {
      const { result } = render({ isOpen: true, workOrder: workOrder({ has_pm: true }), pmData: { template_id: 'tpl-1' } });

      expect(result.current.isEditMode).toBe(true);
      expect(result.current.form.values).toMatchObject({
        title: 'Inspect pump',
        description: 'Check seals',
        equipmentId: 'eq-1',
        priority: 'high',
        estimatedHours: 4,
        hasPM: true,
        pmTemplateId: 'tpl-1',
        assigneeId: 'tech-1',
      });
    });

    it('turns PM on for new work orders when a PM template is supplied', () => {
      expect(render({ isOpen: true, pmData: { template_id: 'tpl-1' } }).result.current.initialValues.hasPM).toBe(true);
      expect(render({ isOpen: true, pmData: { template_id: null } }).result.current.initialValues.hasPM).toBe(false);
    });

    it('falls back to defaults for empty fields on an existing work order', () => {
      // Rows loaded before due_date_has_time existed carry null for it.
      const legacy: WorkOrder = {
        ...workOrder({ title: '', description: '', equipment_id: '', estimated_hours: null, assignee_id: null }),
        ...JSON.parse('{"due_date_has_time": null}'),
      };
      const { result } = render({ isOpen: true, workOrder: legacy, equipmentId: 'eq-from-prop' });

      expect(result.current.initialValues).toMatchObject({
        title: '',
        description: '',
        equipmentId: 'eq-from-prop',
        dueDateHasTime: false,
        assigneeId: null,
      });
      expect(result.current.initialValues.estimatedHours).toBeUndefined();
    });

    it('starts historical entries as accepted', () => {
      const { result } = render({ isOpen: true, initialIsHistorical: true, equipmentId: 'eq-1' });

      expect(result.current.form.values).toMatchObject({ isHistorical: true, status: 'accepted', historicalNotes: '' });
    });
  });

  describe('editing and validation', () => {
    it('setValue validates the changed field and exposes flat error messages', async () => {
      const { result } = render({ isOpen: true, equipmentId: 'eq-1' });

      await act(async () => result.current.form.setValue('title', 'x'.repeat(101)));

      await waitFor(() => expect(result.current.form.errors).toEqual({ title: 'Title must be less than 100 characters' }));
      expect(result.current.form.isValid).toBe(false);
    });

    it('setValues applies several fields and validates once', async () => {
      const { result } = render({ isOpen: true, equipmentId: 'eq-1' });

      await act(async () => result.current.form.setValues({ title: 'Grease bearings', estimatedHours: -2 }));

      await waitFor(() => expect(result.current.form.errors).toEqual({ estimatedHours: 'Estimated hours cannot be negative' }));
      expect(result.current.form.values.title).toBe('Grease bearings');
    });

    it('omits nested errors (like timeline rows) from the flat error map', async () => {
      const { result } = render({ isOpen: true, equipmentId: 'eq-1' });

      await act(async () =>
        result.current.form.setValues({
          title: 'Ok',
          historicalTimelineEvents: [{ newStatus: 'submitted', changedAt: '' }],
        }),
      );

      await waitFor(() => expect(result.current.form.isValid).toBe(false));
      expect(result.current.form.errors).toEqual({});
    });

    it('validate reports every failing field', async () => {
      const { result } = render({ isOpen: true });

      let outcome: Awaited<ReturnType<typeof result.current.form.validate>> | undefined;
      await act(async () => {
        outcome = await result.current.form.validate();
      });

      expect(outcome).toEqual({
        isValid: false,
        errors: { title: 'Title is required', equipmentId: 'Equipment is required' },
      });
    });

    it('validate passes a complete form', async () => {
      const { result } = render({ isOpen: true, workOrder: workOrder() });

      let outcome: Awaited<ReturnType<typeof result.current.form.validate>> | undefined;
      await act(async () => {
        outcome = await result.current.form.validate();
      });

      expect(outcome).toEqual({ isValid: true, errors: {} });
    });

    it('validateField checks a single field', async () => {
      const { result } = render({ isOpen: true, equipmentId: 'eq-1' });

      let titleOk: boolean | undefined;
      let equipmentOk: boolean | undefined;
      await act(async () => {
        titleOk = await result.current.form.validateField('title');
        equipmentOk = await result.current.form.validateField('equipmentId');
      });

      expect(titleOk).toBe(false);
      expect(equipmentOk).toBe(true);
    });

    it('reset restores the initial values', async () => {
      const { result } = render({ isOpen: true, workOrder: workOrder() });
      await act(async () => result.current.form.setValue('title', 'Changed'));

      await act(async () => result.current.form.reset());

      expect(result.current.form.values.title).toBe('Inspect pump');
    });
  });

  describe('handleSubmit', () => {
    it('submits parsed values (empty assignee becomes null)', async () => {
      const { result } = render({ isOpen: true, workOrder: workOrder() });
      await act(async () => result.current.form.setValue('assigneeId', ''));
      const submitted: unknown[] = [];

      await act(() => result.current.form.handleSubmit((values) => void submitted.push(values)));

      expect(submitted).toHaveLength(1);
      expect(submitted[0]).toMatchObject({ title: 'Inspect pump', assigneeId: null, description: 'Check seals' });
      expect(toasts).toEqual([]);
    });

    it('does not submit an invalid form', async () => {
      const { result } = render({ isOpen: true });
      const submitted: unknown[] = [];

      await act(() => result.current.form.handleSubmit((values) => void submitted.push(values)));

      expect(submitted).toEqual([]);
    });

    it('shows an error toast when saving fails', async () => {
      const { result } = render({ isOpen: true, workOrder: workOrder() });
      const failure = new Error('save failed');
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      await act(() =>
        result.current.form.handleSubmit(async () => {
          throw failure;
        }),
      );

      expect(toasts).toEqual([{ error: failure, context: 'Form Submission' }]);
      expect(result.current.form.isSubmitting).toBe(false);
    });
  });

  describe('dialog lifecycle', () => {
    it('keeps edits while open and starts fresh when reopened', async () => {
      const { result, rerender } = render({ isOpen: true, workOrder: workOrder() });
      await act(async () => result.current.form.setValue('title', 'Edited'));

      rerender({ isOpen: true, workOrder: workOrder() });
      expect(result.current.form.values.title).toBe('Edited');

      rerender({ isOpen: false, workOrder: workOrder() });
      rerender({ isOpen: true, workOrder: workOrder() });
      expect(result.current.form.values.title).toBe('Inspect pump');
    });

    it('reloads when a different work order is opened', () => {
      const { result, rerender } = render({ isOpen: true, workOrder: workOrder() });

      rerender({ isOpen: true, workOrder: workOrder({ id: 'wo-2', title: 'Second job' }) });

      expect(result.current.form.values.title).toBe('Second job');
    });

    it('reloads when the equipment changes for a new work order', () => {
      const { result, rerender } = render({ isOpen: true, equipmentId: 'eq-1' });

      rerender({ isOpen: true, equipmentId: 'eq-2' });

      expect(result.current.form.values.equipmentId).toBe('eq-2');
    });

    it('resets historical fields when a historical dialog opens', () => {
      const { result } = render({ isOpen: true, initialIsHistorical: true });

      expect(result.current.form.values).toMatchObject({ isHistorical: true, status: 'accepted', historicalNotes: '' });
    });

    it('does not reset while closed', () => {
      const { result } = render({ isOpen: false, workOrder: workOrder() });

      expect(result.current.form.values.title).toBe('Inspect pump');
    });
  });

  describe('checkForUnsavedChanges', () => {
    it('ignores empty-value differences (undefined, null, "")', async () => {
      const { result } = render({ isOpen: true });
      await act(async () => result.current.form.setValues({ historicalNotes: '', dueDate: null }));

      expect(result.current.checkForUnsavedChanges()).toBe(false);
    });

    it('detects a value filled in or cleared, and a changed value', async () => {
      const { result } = render({ isOpen: true, workOrder: workOrder() });
      expect(result.current.checkForUnsavedChanges()).toBe(false);

      await act(async () => result.current.form.setValue('title', ''));
      expect(result.current.checkForUnsavedChanges()).toBe(true);

      await act(async () => result.current.form.setValue('title', 'Inspect pump'));
      await act(async () => result.current.form.setValue('priority', 'low'));
      expect(result.current.checkForUnsavedChanges()).toBe(true);

      await act(async () => result.current.form.setValue('priority', 'high'));
      await act(async () => result.current.form.setValue('dueDate', '2026-09-01'));
      expect(result.current.checkForUnsavedChanges()).toBe(true);
    });
  });
});
