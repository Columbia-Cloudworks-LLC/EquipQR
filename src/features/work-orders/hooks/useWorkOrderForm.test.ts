import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import { useWorkOrderForm } from './useWorkOrderForm';

function workOrder(overrides: Partial<WorkOrder>): WorkOrder {
  return {
    id: 'wo-1',
    title: 'Inspect pump',
    description: '',
    status: 'submitted',
    priority: 'medium',
    equipment_id: 'eq-1',
    organization_id: 'org-1',
    created_by: 'user-1',
    created_date: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    due_date: null,
    due_date_has_time: false,
    has_pm: false,
    is_historical: false,
    pm_required: false,
    acceptance_date: null,
    assignee_id: null,
    completed_date: null,
    estimated_hours: null,
    ...overrides,
  } as WorkOrder;
}

describe('useWorkOrderForm hydrate', () => {
  it('hydrates a timed due as ISO plus the flag, not a UTC date strip', () => {
    const iso = '2026-07-15T18:30:00.000Z';
    const { result } = renderHook(() =>
      useWorkOrderForm({
        workOrder: workOrder({ due_date: iso, due_date_has_time: true }),
        isOpen: true,
      }),
    );

    expect(result.current.form.values.dueDate).toBe(iso);
    expect(result.current.form.values.dueDateHasTime).toBe(true);
    expect(result.current.form.values.dueDate).not.toBe(iso.split('T')[0]);
  });

  it('hydrates an all-day due to the local civil day', () => {
    const utcMidnight = '2026-07-15T00:00:00.000Z';
    const { result } = renderHook(() =>
      useWorkOrderForm({
        workOrder: workOrder({ due_date: utcMidnight, due_date_has_time: false }),
        isOpen: true,
      }),
    );

    const local = new Date(utcMidnight);
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const localIso = `${local.getFullYear()}-${pad2(local.getMonth() + 1)}-${pad2(local.getDate())}`;

    expect(result.current.form.values.dueDate).toBe(localIso);
    expect(result.current.form.values.dueDateHasTime).toBe(false);

    const utcSplit = new Date(utcMidnight).toISOString().split('T')[0];
    if (localIso !== utcSplit) {
      expect(result.current.form.values.dueDate).not.toBe(utcSplit);
    }
  });
});
