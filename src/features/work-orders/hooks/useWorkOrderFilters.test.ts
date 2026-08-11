import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkOrderFilters } from './useWorkOrderFilters';
import type { WorkOrderData } from '@/features/work-orders/types/workOrder';

const baseWorkOrder = (overrides: Partial<WorkOrderData> = {}): WorkOrderData =>
  ({
    id: 'wo-base',
    title: 'Base Work Order',
    description: '',
    equipmentId: 'eq-1',
    organizationId: 'org-1',
    status: 'submitted',
    priority: 'medium',
    createdDate: '2026-01-01T00:00:00Z',
    created_date: '2026-01-01T00:00:00Z',
    ...overrides,
  } as WorkOrderData);

describe('useWorkOrderFilters', () => {
  describe('teamFilter sentinels', () => {
    const workOrders: WorkOrderData[] = [
      baseWorkOrder({ id: 'wo-team-a', title: 'Team A WO', teamId: 'team-a' }),
      baseWorkOrder({ id: 'wo-team-b', title: 'Team B WO', teamId: 'team-b' }),
      baseWorkOrder({ id: 'wo-no-team', title: 'No Team WO', teamId: undefined }),
    ];

    it('returns every order when teamFilter is "all"', () => {
      const { result } = renderHook(() => useWorkOrderFilters(workOrders, 'user-1'));

      expect(result.current.filteredWorkOrders.map((o) => o.id).sort()).toEqual(
        ['wo-no-team', 'wo-team-a', 'wo-team-b'].sort(),
      );
    });

    it('returns only orders without a team when teamFilter is "unassigned"', () => {
      const { result } = renderHook(() => useWorkOrderFilters(workOrders, 'user-1'));

      act(() => {
        result.current.updateFilter('teamFilter', 'unassigned');
      });

      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-no-team');
    });

    it('returns only matching orders when teamFilter is a specific team id', () => {
      const { result } = renderHook(() => useWorkOrderFilters(workOrders, 'user-1'));

      act(() => {
        result.current.updateFilter('teamFilter', 'team-b');
      });

      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-team-b');
    });

    it('does NOT count teamFilter in the page-local active-filter count', () => {
      // Team scope is owned by the global TopBar `useSelectedTeam`, so a
      // non-default `teamFilter` value must not bump the page-local "active
      // filters" badge — that badge counts only filters the user can change
      // from the page.
      const { result } = renderHook(() => useWorkOrderFilters(workOrders, 'user-1'));

      act(() => {
        result.current.updateFilter('teamFilter', 'team-a');
      });

      expect(result.current.getActiveFilterCount()).toBe(0);

      act(() => {
        result.current.updateFilter('statusFilter', 'in_progress');
      });

      expect(result.current.getActiveFilterCount()).toBe(1);
    });
  });

  describe('invoiceFilter', () => {
    const workOrders: WorkOrderData[] = [
      baseWorkOrder({
        id: 'wo-paid',
        title: 'Paid WO',
        quickbooksInvoiceId: 'inv-paid',
        invoiceStatus: 'paid',
      }),
      baseWorkOrder({
        id: 'wo-overdue',
        title: 'Overdue invoice WO',
        quickbooksInvoiceId: 'inv-overdue',
        invoiceStatus: 'overdue',
      }),
      baseWorkOrder({
        id: 'wo-draft',
        title: 'Draft invoice WO',
        quickbooksInvoiceId: 'inv-draft',
        invoiceStatus: 'draft',
      }),
      baseWorkOrder({
        id: 'wo-voided',
        title: 'Voided invoice WO',
        quickbooksInvoiceId: 'inv-voided',
        invoiceStatus: 'voided',
      }),
      baseWorkOrder({
        id: 'wo-unexported',
        title: 'Not exported WO',
        quickbooksInvoiceId: null,
        invoiceStatus: null,
      }),
      baseWorkOrder({
        id: 'wo-exported-null-status',
        title: 'Exported but not yet synced WO',
        quickbooksInvoiceId: 'inv-pending-sync',
        invoiceStatus: null,
      }),
    ];

    it('filters paid, unpaid, overdue, and not exported invoice states', () => {
      const { result } = renderHook(() => useWorkOrderFilters(workOrders, 'user-1'));

      act(() => result.current.updateFilter('invoiceFilter', 'paid'));
      expect(result.current.filteredWorkOrders.map((o) => o.id)).toEqual(['wo-paid']);

      act(() => result.current.updateFilter('invoiceFilter', 'overdue'));
      expect(result.current.filteredWorkOrders.map((o) => o.id)).toEqual(['wo-overdue']);

      act(() => result.current.updateFilter('invoiceFilter', 'unpaid'));
      expect(result.current.filteredWorkOrders.map((o) => o.id).sort()).toEqual([
        'wo-draft',
        'wo-exported-null-status',
        'wo-overdue',
      ]);

      act(() => result.current.updateFilter('invoiceFilter', 'not_exported'));
      expect(result.current.filteredWorkOrders.map((o) => o.id)).toEqual(['wo-unexported']);
    });

    it('includes exported-but-not-yet-synced invoices (null status) in the unpaid filter', () => {
      const { result } = renderHook(() => useWorkOrderFilters(workOrders, 'user-1'));

      act(() => result.current.updateFilter('invoiceFilter', 'unpaid'));
      const ids = result.current.filteredWorkOrders.map((o) => o.id);
      expect(ids).toContain('wo-exported-null-status');
      expect(ids).not.toContain('wo-unexported');
    });

    it('counts invoiceFilter as a page-local active filter', () => {
      const { result } = renderHook(() => useWorkOrderFilters(workOrders, 'user-1'));

      act(() => result.current.updateFilter('invoiceFilter', 'unpaid'));

      expect(result.current.getActiveFilterCount()).toBe(1);
    });
  });
});
