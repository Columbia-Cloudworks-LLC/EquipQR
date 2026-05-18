import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkOrderFilters } from '../useWorkOrderFilters';
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
      act(() => { result.current.updateFilter('teamFilter', 'unassigned'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-no-team');
    });

    it('returns only matching orders when teamFilter is a specific team id', () => {
      const { result } = renderHook(() => useWorkOrderFilters(workOrders, 'user-1'));
      act(() => { result.current.updateFilter('teamFilter', 'team-b'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-team-b');
    });

    it('does NOT count teamFilter in the page-local active-filter count', () => {
      // Team scope is owned by the global TopBar `useSelectedTeam`, so a
      // non-default `teamFilter` value must not bump the page-local "active
      // filters" badge — that badge counts only filters the user can change
      // from the page.
      const { result } = renderHook(() => useWorkOrderFilters(workOrders, 'user-1'));
      act(() => { result.current.updateFilter('teamFilter', 'team-a'); });
      expect(result.current.getActiveFilterCount()).toBe(0);
      act(() => { result.current.updateFilter('statusFilter', 'in_progress'); });
      expect(result.current.getActiveFilterCount()).toBe(1);
    });
  });

  describe('initial state', () => {
    it('returns all work orders unfiltered by default', () => {
      const wos = [baseWorkOrder({ id: 'wo-1' }), baseWorkOrder({ id: 'wo-2' })];
      const { result } = renderHook(() => useWorkOrderFilters(wos));
      expect(result.current.filteredWorkOrders).toHaveLength(2);
    });

    it('totalCount equals the full input array length regardless of active filters', () => {
      const wos = [baseWorkOrder({ id: 'wo-1' }), baseWorkOrder({ id: 'wo-2' })];
      const { result } = renderHook(() => useWorkOrderFilters(wos));
      act(() => { result.current.updateFilter('statusFilter', 'completed'); });
      expect(result.current.totalCount).toBe(2);
      expect(result.current.filteredWorkOrders).toHaveLength(0);
    });
  });

  describe('searchQuery filtering', () => {
    const wos: WorkOrderData[] = [
      baseWorkOrder({ id: 'wo-1', title: 'Hydraulic Pump Repair', assigneeName: 'Alice Smith', equipmentName: 'Excavator A' }),
      baseWorkOrder({ id: 'wo-2', title: 'Engine Overhaul', assigneeName: 'Bob Jones', teamName: 'Team Beta', equipmentName: 'Bulldozer B' }),
    ];

    it('filters by title (case-insensitive)', () => {
      const { result } = renderHook(() => useWorkOrderFilters(wos));
      act(() => { result.current.updateFilter('searchQuery', 'hydraulic'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-1');
    });

    it('filters by assigneeName', () => {
      const { result } = renderHook(() => useWorkOrderFilters(wos));
      act(() => { result.current.updateFilter('searchQuery', 'bob jones'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-2');
    });

    it('filters by equipmentName', () => {
      const { result } = renderHook(() => useWorkOrderFilters(wos));
      act(() => { result.current.updateFilter('searchQuery', 'Excavator'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-1');
    });

    it('returns empty when no work order matches the search query', () => {
      const { result } = renderHook(() => useWorkOrderFilters(wos));
      act(() => { result.current.updateFilter('searchQuery', 'zzz-no-match'); });
      expect(result.current.filteredWorkOrders).toHaveLength(0);
    });
  });

  describe('statusFilter', () => {
    const wos: WorkOrderData[] = [
      baseWorkOrder({ id: 'wo-submitted', status: 'submitted' }),
      baseWorkOrder({ id: 'wo-completed', status: 'completed' }),
      baseWorkOrder({ id: 'wo-in-progress', status: 'in_progress' }),
    ];

    it('returns only work orders matching the selected status', () => {
      const { result } = renderHook(() => useWorkOrderFilters(wos));
      act(() => { result.current.updateFilter('statusFilter', 'completed'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-completed');
    });
  });

  describe('assigneeFilter', () => {
    const USER_ID = 'user-current';
    const wos: WorkOrderData[] = [
      baseWorkOrder({ id: 'wo-mine', assigneeId: USER_ID }),
      baseWorkOrder({ id: 'wo-other', assigneeId: 'user-other' }),
      baseWorkOrder({ id: 'wo-unassigned', assigneeId: undefined, teamId: undefined }),
      baseWorkOrder({ id: 'wo-team-only', assigneeId: undefined, teamId: 'team-1' }),
    ];

    it('mine: returns only work orders assigned to the current user', () => {
      const { result } = renderHook(() => useWorkOrderFilters(wos, USER_ID));
      act(() => { result.current.updateFilter('assigneeFilter', 'mine'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-mine');
    });

    it('unassigned: returns only work orders with no assignee and no team', () => {
      const { result } = renderHook(() => useWorkOrderFilters(wos, USER_ID));
      act(() => { result.current.updateFilter('assigneeFilter', 'unassigned'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-unassigned');
    });

    it('specific id: returns only work orders assigned to that user id', () => {
      const { result } = renderHook(() => useWorkOrderFilters(wos, USER_ID));
      act(() => { result.current.updateFilter('assigneeFilter', 'user-other'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-other');
    });
  });

  describe('priorityFilter', () => {
    it('returns only work orders with the selected priority', () => {
      const wos = [baseWorkOrder({ id: 'wo-high', priority: 'high' }), baseWorkOrder({ id: 'wo-low', priority: 'low' })];
      const { result } = renderHook(() => useWorkOrderFilters(wos));
      act(() => { result.current.updateFilter('priorityFilter', 'high'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-high');
    });
  });

  describe('dueDateFilter', () => {
    it('overdue: returns past-due non-terminal orders; excludes completed/cancelled', () => {
      const wos: WorkOrderData[] = [
        baseWorkOrder({ id: 'wo-overdue', dueDate: '2020-01-01T00:00:00Z', status: 'submitted' }),
        baseWorkOrder({ id: 'wo-future', dueDate: '2099-01-01T00:00:00Z', status: 'submitted' }),
        baseWorkOrder({ id: 'wo-completed-past', dueDate: '2020-01-01T00:00:00Z', status: 'completed' }),
        baseWorkOrder({ id: 'wo-no-due', dueDate: undefined, status: 'submitted' }),
      ];
      const { result } = renderHook(() => useWorkOrderFilters(wos));
      act(() => { result.current.updateFilter('dueDateFilter', 'overdue'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-overdue');
    });

    it('today: returns only work orders due today', () => {
      const todayISO = new Date().toISOString();
      const wos: WorkOrderData[] = [
        baseWorkOrder({ id: 'wo-today', dueDate: todayISO, status: 'submitted' }),
        baseWorkOrder({ id: 'wo-past', dueDate: '2020-06-01T12:00:00Z', status: 'submitted' }),
      ];
      const { result } = renderHook(() => useWorkOrderFilters(wos));
      act(() => { result.current.updateFilter('dueDateFilter', 'today'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-today');
    });
  });

  describe('sorting', () => {
    it('sorts by priority desc: high → medium → low', () => {
      const wos = [
        baseWorkOrder({ id: 'wo-low', priority: 'low', createdDate: '2026-01-01T00:00:00Z', created_date: '2026-01-01T00:00:00Z' }),
        baseWorkOrder({ id: 'wo-high', priority: 'high', createdDate: '2026-01-02T00:00:00Z', created_date: '2026-01-02T00:00:00Z' }),
        baseWorkOrder({ id: 'wo-medium', priority: 'medium', createdDate: '2026-01-03T00:00:00Z', created_date: '2026-01-03T00:00:00Z' }),
      ];
      const { result } = renderHook(() => useWorkOrderFilters(wos));
      act(() => { result.current.updateSort('priority', 'desc'); });
      expect(result.current.filteredWorkOrders.map(o => o.id)).toEqual(['wo-high', 'wo-medium', 'wo-low']);
    });

    it('sorts by due_date asc and places missing due dates last', () => {
      const wos = [
        baseWorkOrder({ id: 'wo-later', dueDate: '2026-03-01T00:00:00Z' }),
        baseWorkOrder({ id: 'wo-null', dueDate: undefined }),
        baseWorkOrder({ id: 'wo-earlier', dueDate: '2026-01-01T00:00:00Z' }),
      ];
      const { result } = renderHook(() => useWorkOrderFilters(wos));
      act(() => { result.current.updateSort('due_date', 'asc'); });
      expect(result.current.filteredWorkOrders.map(o => o.id)).toEqual(['wo-earlier', 'wo-later', 'wo-null']);
    });

    it('sorts by status in STATUS_ORDER ascending', () => {
      const wos = [
        baseWorkOrder({ id: 'wo-completed', status: 'completed' }),
        baseWorkOrder({ id: 'wo-submitted', status: 'submitted' }),
        baseWorkOrder({ id: 'wo-in-progress', status: 'in_progress' }),
      ];
      const { result } = renderHook(() => useWorkOrderFilters(wos));
      act(() => { result.current.updateSort('status', 'asc'); });
      expect(result.current.filteredWorkOrders.map(o => o.id)).toEqual(['wo-submitted', 'wo-in-progress', 'wo-completed']);
    });

    it('toggles direction when the same sort field is selected again', () => {
      const wos = [
        baseWorkOrder({ id: 'wo-jan', createdDate: '2026-01-01T00:00:00Z', created_date: '2026-01-01T00:00:00Z' }),
        baseWorkOrder({ id: 'wo-feb', createdDate: '2026-02-01T00:00:00Z', created_date: '2026-02-01T00:00:00Z' }),
      ];
      const { result } = renderHook(() => useWorkOrderFilters(wos));
      // Default: created desc → feb first
      expect(result.current.filteredWorkOrders.map(o => o.id)).toEqual(['wo-feb', 'wo-jan']);
      // Toggle same field → asc → jan first
      act(() => { result.current.updateSort('created'); });
      expect(result.current.filteredWorkOrders.map(o => o.id)).toEqual(['wo-jan', 'wo-feb']);
    });
  });

  describe('clearAllFilters', () => {
    it('resets every filter field to default and clears active presets', () => {
      const { result } = renderHook(() => useWorkOrderFilters([baseWorkOrder()], 'user-1'));
      act(() => {
        result.current.updateFilter('statusFilter', 'completed');
        result.current.toggleQuickFilter('urgent');
      });
      act(() => { result.current.clearAllFilters(); });
      expect(result.current.filters.statusFilter).toBe('all');
      expect(result.current.filters.priorityFilter).toBe('all');
      expect(result.current.filters.assigneeFilter).toBe('all');
      expect(result.current.filters.dueDateFilter).toBe('all');
      expect(result.current.filters.searchQuery).toBe('');
      expect(result.current.activePresets.size).toBe(0);
    });
  });

  describe('toggleQuickFilter', () => {
    it('activates a preset and applies the corresponding filter value', () => {
      const { result } = renderHook(() => useWorkOrderFilters([baseWorkOrder()]));
      act(() => { result.current.toggleQuickFilter('urgent'); });
      expect(result.current.activePresets.has('urgent')).toBe(true);
      expect(result.current.filters.priorityFilter).toBe('high');
    });

    it('deactivates a preset and resets its filter when toggled again', () => {
      const { result } = renderHook(() => useWorkOrderFilters([baseWorkOrder()]));
      act(() => { result.current.toggleQuickFilter('urgent'); });
      act(() => { result.current.toggleQuickFilter('urgent'); });
      expect(result.current.activePresets.has('urgent')).toBe(false);
      expect(result.current.filters.priorityFilter).toBe('all');
    });

    it('only one preset is active at a time — activating a second clears the first', () => {
      const { result } = renderHook(() => useWorkOrderFilters([baseWorkOrder()], 'user-1'));
      act(() => { result.current.toggleQuickFilter('urgent'); });
      act(() => { result.current.toggleQuickFilter('my-work'); });
      expect(result.current.activePresets.has('urgent')).toBe(false);
      expect(result.current.activePresets.has('my-work')).toBe(true);
      expect(result.current.filters.priorityFilter).toBe('all');
      expect(result.current.filters.assigneeFilter).toBe('mine');
    });
  });

  describe('updateFilter deactivates matching preset', () => {
    it('removes active preset when its filter key is changed to a non-preset value', () => {
      const { result } = renderHook(() => useWorkOrderFilters([baseWorkOrder()]));
      act(() => { result.current.toggleQuickFilter('urgent'); });
      expect(result.current.activePresets.has('urgent')).toBe(true);
      act(() => { result.current.updateFilter('priorityFilter', 'low'); });
      expect(result.current.activePresets.has('urgent')).toBe(false);
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
