import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWorkOrderSubmission } from './useWorkOrderSubmission';
import { workOrderFormSchema, type WorkOrderFormData } from '@/features/work-orders/schemas/workOrderSchema';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  createMutateAsync: vi.fn(),
  historicalMutateAsync: vi.fn(),
  createOptions: { current: undefined as undefined | Record<string, unknown> },
  historicalOptions: { current: undefined as undefined | Record<string, unknown> },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'entering-admin' } }),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderCreation', () => ({
  useCreateWorkOrder: (options?: Record<string, unknown>) => {
    mocks.createOptions.current = options;
    return { mutateAsync: mocks.createMutateAsync, isPending: false };
  },
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderUpdate', () => ({
  useUpdateWorkOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/features/work-orders/hooks/useHistoricalWorkOrders', () => ({
  useCreateHistoricalWorkOrder: (options?: Record<string, unknown>) => {
    mocks.historicalOptions.current = options;
    return { mutateAsync: mocks.historicalMutateAsync, isPending: false };
  },
}));

const SERVICE_DATE = new Date(2024, 2, 5, 12, 0, 0);

function loggedForm(overrides: Partial<WorkOrderFormData> = {}): WorkOrderFormData {
  return workOrderFormSchema.parse({
    title: 'Paper PM sheet',
    equipmentId: 'eq-1',
    priority: 'medium',
    isHistorical: true,
    status: 'completed',
    completedDate: SERVICE_DATE,
    historicalStartDate: SERVICE_DATE,
    ...overrides,
  });
}

describe('useWorkOrderSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMutateAsync.mockResolvedValue({ workOrder: { id: 'wo-new' }, queuedOffline: false });
    mocks.historicalMutateAsync.mockResolvedValue({ success: true, work_order_id: 'wo-hist' });
  });

  describe('Log Completed', () => {
    it('creates the record completed on the exact service date, not now', async () => {
      const { result } = renderHook(() => useWorkOrderSubmission({ onSuccess: vi.fn() }));

      await act(async () => {
        await result.current.submitForm(loggedForm());
      });

      const payload = mocks.historicalMutateAsync.mock.calls[0][0];
      expect(payload).toMatchObject({
        status: 'completed',
        completedDate: SERVICE_DATE.toISOString(),
        historicalStartDate: SERVICE_DATE.toISOString(),
      });
      // The synthesized timeline ends in "completed" at the service date.
      const lastEvent = payload.timelineEvents[payload.timelineEvents.length - 1];
      expect(lastEvent).toMatchObject({ newStatus: 'completed', changedAt: SERVICE_DATE.toISOString() });
      expect(mocks.createMutateAsync).not.toHaveBeenCalled();
    });

    it('logs the PM as completed on the service date with the checklist from the sheet', async () => {
      const checklist: PMChecklistItem[] = [
        { id: 'a', title: 'Oil', section: 'Engine', required: true, condition: 1 },
        { id: 'b', title: 'Belts', section: 'Engine', required: true, condition: 3, notes: 'Cracked' },
      ];
      const { result } = renderHook(() =>
        useWorkOrderSubmission({ onSuccess: vi.fn(), getHistoricalChecklist: () => checklist }),
      );

      await act(async () => {
        await result.current.submitForm(loggedForm({ hasPM: true, pmTemplateId: 'tmpl-1' }));
      });

      expect(mocks.historicalMutateAsync.mock.calls[0][0]).toMatchObject({
        hasPM: true,
        pmStatus: 'completed',
        pmCompletionDate: SERVICE_DATE.toISOString(),
        pmChecklistData: checklist,
        pmTemplateId: 'tmpl-1',
      });
    });

    it('sends the meter reading for guarded logging and keeps QuickBooks off unless opted in', async () => {
      const { result } = renderHook(() => useWorkOrderSubmission({ onSuccess: vi.fn() }));

      await act(async () => {
        await result.current.submitForm(loggedForm({ equipmentWorkingHours: 320.5 }));
      });
      expect(mocks.historicalMutateAsync.mock.calls[0][0]).toMatchObject({
        serviceHours: 320.5,
        quickBooksSyncReady: false,
      });

      await act(async () => {
        await result.current.submitForm(loggedForm({ quickBooksSyncReady: true }));
      });
      expect(mocks.historicalMutateAsync.mock.calls[1][0]).toMatchObject({
        serviceHours: undefined,
        quickBooksSyncReady: true,
      });
    });

    it('files an unassigned sheet under the person entering it, and keeps a chosen performer', async () => {
      const { result } = renderHook(() => useWorkOrderSubmission({ onSuccess: vi.fn() }));

      await act(async () => {
        await result.current.submitForm(loggedForm());
      });
      const unassigned = mocks.historicalMutateAsync.mock.calls[0][0];
      expect(unassigned.assigneeId).toBe('entering-admin');
      expect(
        unassigned.timelineEvents.find((event: { newStatus: string }) => event.newStatus === 'assigned'),
      ).toMatchObject({ assigneeId: 'entering-admin' });

      await act(async () => {
        await result.current.submitForm(loggedForm({ assigneeId: 'tech-7' }));
      });
      expect(mocks.historicalMutateAsync.mock.calls[1][0].assigneeId).toBe('tech-7');
    });

    it('attaches the paper sheet photos to the logged record', async () => {
      const sheet = new File(['x'], 'sheet.jpg', { type: 'image/jpeg' });
      const { result } = renderHook(() =>
        useWorkOrderSubmission({ onSuccess: vi.fn(), creationImages: [sheet] }),
      );

      await act(async () => {
        await result.current.submitForm(loggedForm());
      });

      expect(mocks.historicalMutateAsync.mock.calls[0][0].images).toEqual([sheet]);
    });

    it('opens the new record after saving, unless the dialog is staying open', () => {
      const onSuccess = vi.fn();
      const onCreated = vi.fn();
      const { rerender } = renderHook(
        ({ keepOpen }: { keepOpen: boolean }) =>
          useWorkOrderSubmission({ onSuccess, onCreated, keepOpen, rapidEntry: keepOpen }),
        { initialProps: { keepOpen: false } },
      );

      (mocks.historicalOptions.current?.onSuccess as (wo: { id: string }) => void)({ id: 'wo-hist' });
      expect(mocks.navigate).toHaveBeenCalledWith('/dashboard/work-orders/wo-hist');
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(mocks.historicalOptions.current?.successMessage).toBeUndefined();

      mocks.navigate.mockClear();
      rerender({ keepOpen: true });

      (mocks.historicalOptions.current?.onSuccess as (wo: { id: string }) => void)({ id: 'wo-hist-2' });
      expect(mocks.navigate).not.toHaveBeenCalled();
      expect(onCreated).toHaveBeenCalledWith('wo-hist-2');
      expect(mocks.historicalOptions.current?.successMessage).toBe('Work Order saved');
    });
  });

  describe('New Work Order', () => {
    const newForm = () =>
      workOrderFormSchema.parse({ title: 'No start', equipmentId: 'eq-1', priority: 'high' });

    it('creates a regular work order and hands control back to the dialog', async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useWorkOrderSubmission({ onSuccess }));

      await act(async () => {
        await result.current.submitForm(newForm());
      });

      expect(mocks.createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'No start', equipmentId: 'eq-1', priority: 'high' }),
      );
      expect(mocks.historicalMutateAsync).not.toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledTimes(1);
      // Default flow lets the create hook navigate to the new work order.
      expect(mocks.createOptions.current).toBeUndefined();
    });

    it('uses the quiet toast and skips navigation in rapid entry', () => {
      renderHook(() =>
        useWorkOrderSubmission({ onSuccess: vi.fn(), keepOpen: true, rapidEntry: true }),
      );

      expect(mocks.createOptions.current).toMatchObject({ successMessage: 'Work Order saved' });
      expect(typeof mocks.createOptions.current?.onSuccess).toBe('function');
    });
  });
});
